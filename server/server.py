""" Flask server for the Server API.
"""
import json
import sys
import os
from time import time
import functools
import requests
import httplib
import hashlib
from sql import SqlDatabase, NoResult
import mimetypes
from werkzeug.local import LocalProxy
from flask import Flask, redirect, request, Response, send_file, g
from flask_login import LoginManager, login_required, current_user, login_user, logout_user
from user_app import UserApplication, ADMIN_ROLE, BOOK_ROLE, VIEW_ROLE
from solr import SolrError, AssetIndex
from config import SOLR_COLLECTION

if __name__ == '__main__':
    # development environment (run locally with "python server.py debug" at URL http://localhost:3389/static/index.html)
    application = UserApplication(__name__, static_folder="../ui/dist", static_path="/dev") # pylint: disable=invalid-name
else:
    # production environment (run by Apache mod_wsgi at URL http://server/)
    application = UserApplication(__name__, static_folder=None) # pylint: disable=invalid-name
application.solr = AssetIndex(SOLR_COLLECTION)

CONDITION_FIELD = 'condition'

XJOIN_PREFIX = 'xjoin_'

USER_BOOKING_SUMMARY_SQL = """
  SELECT user.user_id, username, label, role, email, last_login,
         COUNT(CASE WHEN IFNULL(in_date, due_in_date) >= date('now') OR (out_date IS NOT NULL AND in_date IS NULL) THEN 1 ELSE NULL END) AS booked,
         COUNT(CASE WHEN out_date IS NOT NULL AND in_date IS NULL THEN 1 ELSE NULL END) AS out,
         COUNT(CASE WHEN out_date IS NOT NULL AND in_date IS NULL AND due_in_date < date('now') THEN 1 ELSE NULL END) AS overdue
    FROM enum, enum_entry, user LEFT JOIN booking ON booking.user_id=user.user_id
   WHERE field='user' AND enum.enum_id=enum_entry.enum_id AND enum_entry.value=user.user_id
GROUP BY user.user_id
ORDER BY `order`
"""

# use either EXTANT_CLAUSE or RANGE_CLAUSE for substitution {2}
BOOKINGS_SQL = """
  SELECT booking_id,
         asset_id,
         booking.user_id,
         project,
         due_out_date, due_in_date,
         out_date, in_date,
         notes
    FROM booking, user
   WHERE {0}.{1}=:{1}
         AND {2}
         AND booking.user_id=user.user_id
ORDER BY due_out_date
"""

EXTANT_CLAUSE = "(date('now') <= due_in_date OR (out_date IS NOT NULL AND in_date IS NULL))"
RANGE_CLAUSE = "(IFNULL(in_date, due_in_date) >= :from_date AND due_out_date <= :to_date)"

# the IFNULL ensures that in_date is used in preference to due_in_date, should it be non-null, so that a user can book
# an asset where it has been returned early, and can not book an asset that has been returned late (in both cases where
# the requested booking would have overlapped or not with the previous booking)
CHECK_BOOKING_SQL = """
  SELECT booking_id, booking.user_id AS user_id, enum_entry.label AS user_label
    FROM booking, user, enum, enum_entry
   WHERE asset_id=:asset_id AND booking.user_id=user.user_id
         AND :due_in_date > due_out_date AND :due_out_date < IFNULL(in_date, due_in_date)
         AND field='user' AND enum_entry.enum_id=enum.enum_id AND enum_entry.value=user.user_id
"""

# similar to above but check for clash when updating
CHECK_CLASH_SQL = """
  SELECT other.booking_id, other.user_id AS user_id, enum_entry.label AS user_label
    FROM booking, booking AS other, user, enum, enum_entry
   WHERE booking.booking_id=:booking_id AND other.booking_id!=booking.booking_id
         AND other.asset_id=booking.asset_id AND other.user_id=user.user_id
         AND IFNULL(other.in_date, other.due_in_date) > {0} AND other.due_out_date < {1}
         AND field='user' AND enum_entry.enum_id=enum.enum_id AND enum_entry.value=user.user_id
"""

CHECK_OUT_SQL = """
  UPDATE booking
     SET out_date=date('now'), out_user_id=:user_id
   WHERE asset_id=:asset_id
         AND (user_id=:user_id OR (SELECT COUNT(*) FROM user WHERE user_id=:user_id AND role={0})=1)
         AND date('now') >= due_out_date AND date('now') <= due_in_date
         AND out_date IS NULL AND in_date IS NULL
""".format(ADMIN_ROLE)

# also check that the condition value is valid
CHECK_IN_SQL = """
  UPDATE booking
     SET in_date=date('now'), in_user_id=:user_id
   WHERE asset_id=:asset_id
         AND (user_id=:user_id OR (SELECT COUNT(*) FROM user WHERE user_id=:user_id AND role={0})=1)
         AND date('now') >= due_out_date
         AND out_date IS NOT NULL AND in_date IS NULL
         AND (SELECT COUNT(*) FROM enum, enum_entry WHERE field='{1}' AND enum.enum_id=enum_entry.enum_id AND value=:condition)=1
""".format(ADMIN_ROLE, CONDITION_FIELD)

GET_ATTACHMENT_SQL = """
  SELECT name, data
    FROM attachment
   WHERE attachment_id=:attachment_id
"""

FOLDER_SQL = """
  SELECT folder_id, parent_id, name
    FROM attachment_folder
   WHERE {0}
"""

FOLDER_ATTACHMENTS_SQL = """
  SELECT name, a.attachment_id, COUNT(p.attachment_id) AS count
    FROM attachment AS a LEFT JOIN attachment_asset_pivot AS p ON a.attachment_id=p.attachment_id
   WHERE {0}
GROUP BY a.attachment_id
"""

COUNT_ASSETS_FOR_ATTACHMENT_SQL = """
  SELECT COUNT(asset_id)
    FROM attachment_asset_pivot
   WHERE attachment_id=:attachment_id
"""

DELETE_ATTACHMENT_SQL = """
  DELETE
    FROM attachment
   WHERE attachment_id=:attachment_id
"""

ASSET_ATTACHMENTS_SQL = """
  SELECT pivot.attachment_id, name
    FROM attachment_asset_pivot AS pivot, attachment
   WHERE pivot.asset_id=:asset_id AND pivot.attachment_id=attachment.attachment_id
"""

@application.route('/')
def main_endpoint():
    """ Output brief info.
    """
    return json.dumps({'name': 'BADASS Server API'})

@application.route('/login', methods=['POST'])
def login_endpoint():
    """ Log in endpoint.
    """
    username = request.args['username']
    password = request.get_json()['password']
    user = application.login(username, password)
    if user is None:
        return "Bad credentials", 401
    return json.dumps(user.to_dict(application.db))

@application.route('/logout')
def logout_endpoint():
    """ Logout endpoint.
    """
    application.logout()
    return json.dumps({})

@application.route('/user', methods=['GET', 'PUT'])
def user_endpoint():
    """ User details endpoint (for the logged in user only).
    """
    if request.method == 'GET':
        # if not logged in, return {}
        if hasattr(current_user, 'to_dict'):
            return json.dumps(current_user.to_dict(application.db))
    elif request.method == 'PUT':
        # update details for the logged in user (can only change label and json using this endpoint)
        if current_user.is_anonymous:
            return "Not logged in", 403
        user = request.get_json()
        if not current_user.check_password(user['password']):
            return "Bad credentials", 401
        application.update_user(user)
    return json.dumps({})

@application.route('/user/admin', methods=['GET', 'POST'])
@application.route('/user/admin/<user_id>', methods=['DELETE'])
@application.role_required([ADMIN_ROLE])
def user_admin_endpoint(user_id=None):
    """ Endpoint for an admin to get a list of all users, or add a new user.
    """
    if request.method == 'GET':
        with application.db.cursor() as sql:
            # returns number of assets 'booked' (i.e. the booking lasts until after today - except for early returns - or the asset is still out),
            # number of assets 'out' (i.e. have been taken out and not returned),
            # number of assets 'overdue' (i.e. should have been returned by today, but hasn't been) 
            return json.dumps(sql.selectAllDict(USER_BOOKING_SUMMARY_SQL))
    elif request.method == 'POST':
        new_user = request.get_json()
        if not current_user.check_password(new_user['password']):
            return "Bad credentials", 401
        try:
            if not application.add_user(new_user):
                return "User already exists", 409
        except KeyError:
            return "Bad user details", 400
        return json.dumps({})
    elif request.method == 'DELETE':
        if not application.delete_user(user_id):
            return "Bad request", 400
        with application.db.cursor() as sql:
            sql.delete("DELETE FROM booking WHERE user_id=:user_id", user_id=user_id)
        return json.dumps({})

@application.errorhandler(SolrError)
def handle_solr_error(error):
    """ Error handler for SolrError - just pass forward the status code.
    """
    return "SOLR Error", error.status_code

@application.route('/enum/<field>', methods=['PUT', 'POST'])
@application.role_required([ADMIN_ROLE])
def enums_endpoint(field=None):
    """ Endpoint for getting and updating enumerations.
    """
    with application.db.cursor() as sql:
        try:
            enum_id = sql.selectSingle("SELECT enum_id FROM enum WHERE field=:field", field=field)
        except NoResult:
            return "No such enum", 404
        if request.method == 'PUT':
            # update all values
            values = request.get_json()
            sql.delete("DELETE FROM enum_entry WHERE enum_id=:enum_id", enum_id=enum_id)
            for value in values:
                sql.insert("INSERT INTO enum_entry VALUES (NULL, :enum_id, :order, :value, :label)", value, enum_id=enum_id)
            return json.dumps({})
        else:
            # update enum depending on the action parameter
            action = request.args.get('action')
            if action == 'add_label':
                label = request.get_data()
                try:
                    entry = sql.selectOneDict("SELECT value, label, `order` FROM enum_entry WHERE enum_id=:enum_id AND label=:label", enum_id=enum_id, label=label)
                except NoResult:
                    next = max(sql.selectOne("SELECT MAX(value), MAX(`order`) FROM enum_entry WHERE enum_id=:enum_id", enum_id=enum_id))
                    next = next + 1 if next is not None else 0
                    entry = {'enum_id': enum_id, 'order': next, 'value': next, 'label': label}
                    sql.insert("INSERT INTO enum_entry VALUES (NULL, :enum_id, :order, :value, :label)", entry)
                return json.dumps(entry)
            elif action == 'prune':
                if field == 'project':
                    # treat project specially, as it's a booking field, not a SOLR field
                    counts = dict((str(d['project']), d['count']) for d in sql.selectAllDict("SELECT project, COUNT(*) AS count FROM booking GROUP BY project"))
                else:
                    r = application.solr.search([('q', '*'), ('rows', 0), ('facet', 'true'), ('facet.field', field)])
                    facets = r['facet_counts']['facet_fields'][field]
                    counts = dict(zip(facets[::2], facets[1::2]))
                for entry in sql.selectAllDict("SELECT entry_id, value FROM enum_entry WHERE enum_id=:enum_id", enum_id=enum_id):
                    if counts.get(str(entry['value']), 0) == 0:
                        sql.delete("DELETE FROM enum_entry WHERE entry_id=:entry_id", entry_id=entry['entry_id'])
                return json.dumps(sql.selectAllDict("SELECT value, label, `order` FROM enum_entry WHERE enum_id=:enum_id", enum_id=enum_id))
            elif action == 'sort':
                entries = sql.selectAllDict("SELECT entry_id, value, label, `order` FROM enum_entry WHERE enum_id=:enum_id", enum_id=enum_id)
                entries.sort(key=lambda entry: entry['label'])
                for index in xrange(len(entries)):
                    entries[index]['order'] = index + 1
                    sql.update("UPDATE enum_entry SET `order`=:order WHERE entry_id=:entry_id", entries[index])
                return json.dumps(entries)
            else:
                return "Bad action", 400
        

@application.route('/search')
@application.route('/search/<path:path>')
def search_endpoint(path=None):
    """ Perform a SOLR search.
    """
    params = [('q', request.args.get('q', '*')),
              ('start', request.args.get('start', 0)),
              ('rows', request.args.get('rows', 10))]

    # want to force the Enum SOLR component to reload if this is true, by adding
    # the reload prefix ('__') to the field name in an enum(..) call. The call is
    # either in a sort spec or will have to be a dummy call.
    reload_enums = request.args.get('reload_enums', False)

    sort = ['id asc']
    order = request.args.get('order', None)
    if order is not None:
        enum = False
        if order[0] == 'E':
            enum = True
            order = order[1:]
        if len(order) < 2 or order[0] not in '><':
            return "Bad order", 400
        if enum:
            if reload_enums:
                reload_prefix = '__'
                reload_enums = False
            else:
                reload_prefix = ''
            field = 'enum({0}{1})'.format(reload_prefix, order[1:])
        else:
            field = order[1:]
        sort.append('{0} {1}'.format(field, 'asc' if order[0] == '>' else 'desc'))
        params.append(('fq', '{0}:*'.format(order[1:])))
    sort.reverse()
    params.append(('sort', ','.join(sort)))

    # if reload_enums is still true, we need to add a dummy call to enum(__*)
    if reload_enums:
        params.append(('bq', 'enum(__foo)'))

    if path is not None:
        for field_value in path.split('/'):
            if field_value.count(':') != 1:
                return "Bad filter", 400
            field, value = field_value.split(':')
            if ',' in field:
                field = field.split(',')
                if len(field) != 2:
                    return "Bad filter", 400
                try:
                    float(value)
                except ValueError:
                    return "Bad filter", 400
                params.append(('fq', '{0}:[0 TO {1}]'.format(field[0], value)))
                params.append(('fq', '{0}:[{1} TO *]'.format(field[1], value)))
            elif field.startswith(XJOIN_PREFIX):
                if not application.user_has_role([ADMIN_ROLE, BOOK_ROLE]):
                    continue
                _, component, field = field.split('_')
                neg = False
                if len(value) > 0 and value[0] == '-':
                    neg = True
                    value = value[1:]
                params.append(('xjoin_{0}'.format(component), 'true'))
                params.append(('xjoin_{0}.external.{1}'.format(component, field), value))
                params.append(('fq', '{1}{{!xjoin}}xjoin_{0}'.format(component, '-' if neg else '')))
            else:
                if value != '*':
                    value = '"{0}"'.format(value)
                params.append(('fq', '{0}:{1}'.format(field, value)))

    if 'facets' in request.args:
        params.append(('facet', 'true'))
        params.append(('facet.limit', '-1'))
        for field in request.args.get('facets', '').split(','):
            params.append(('facet.field', field))

    # get enum definitions
    with application.db.cursor() as sql:
        enums = {}
        for enum_id, field in sql.selectAll("SELECT enum_id, field FROM enum"):
            stmt = "SELECT value, label, `order` FROM enum_entry WHERE enum_id=:enum_id"
            enums[field] = sql.selectAllDict(stmt, enum_id=enum_id)

    data = {'solr': application.solr.search(params), 'enums': enums}
    return Response(json.dumps(data), mimetype='application/json')


@application.route('/asset', methods=['POST'])
@application.route('/asset/<asset_id>', methods=['PUT', 'DELETE'])
@application.role_required([ADMIN_ROLE, BOOK_ROLE, VIEW_ROLE])
def asset_endpoint(asset_id=None):
    """ Asset add, delete, update endpoint.
    """
    if asset_id is None:
        if not application.user_has_role([ADMIN_ROLE]):
            return "Not authorized", 403
        asset_id = application.solr.new_id()
    if request.method == 'DELETE':
        # delete an existing asset
        if not application.user_has_role([ADMIN_ROLE]):
            return "Not authorized", 403
        application.solr.delete(asset_id)
    else:
        # add a new asset or update an existing asset
        asset = request.get_json()
        asset['id'] = asset_id

        if request.method == 'PUT' and not application.solr.id_exists(asset_id) and not application.user_has_role([ADMIN_ROLE]):
            return "Not authorized", 403

        # validate doc - not much to do at present, but FIXME should validate enum values are in range
        if 'calibration_date' in asset and 'calibration_due' in asset:
            if asset['calibration_date'] > asset['calibration_due']:
                return "Invalid asset data", 400

        application.solr.update(asset_id, asset)
    return Response(json.dumps({'id': asset_id}), mimetype='application/json')


@application.route('/asset/<asset_id>')
def asset_endpoint_GET(asset_id):
    """ Asset endpoint to get an existing asset.
    """
    asset = application.solr.get(asset_id)
    if asset is None:
        return "Asset not found", 404
    return Response(json.dumps(asset), mimetype='application/json')


@application.route('/file', methods=['GET', 'POST'])
@application.route('/file/<attachment_id>', methods=['GET', 'PUT', 'DELETE'])
@application.route('/file/<attachment_id>/<filename>')
def file_endpoint(attachment_id=None, filename=None):
    """ Get the data for the attachment with given id, or list all attachment ids,
        or delete an attachment, or add a new attachment (if the data is already present
        simply respond with the attachment id).

        Currently, name is a property of the attachment, so if you upload the same
        file with a different name, you get told the old name. We could make the name
        a property of the association (i.e. a column on attachment_asset_pivot).
    """
    with application.db.cursor() as sql:
        if request.method == 'GET' and attachment_id is not None:
            try:
                name, data = sql.selectOne(GET_ATTACHMENT_SQL, attachment_id=attachment_id)
            except NoResult:
                return "No such attachment", 404
            mimetype = mimetypes.guess_type(name)[0] or 'application/octet-stream'
            return Response(str(data), mimetype=mimetype)
        if request.method == 'GET':
            folder_id = request.args.get('folder_id', None)
            clause = "folder_id IS NULL" if folder_id is None else "folder_id=:folder_id"
            files = sql.selectAllDict(FOLDER_ATTACHMENTS_SQL.format(clause), folder_id=folder_id)
            clause = "parent_id IS NULL" if folder_id is None else "parent_id=:folder_id"
            folders = sql.selectAllDict(FOLDER_SQL.format(clause), folder_id=folder_id)
            return json.dumps({'files': files, 'folders': folders})
        if not application.user_has_role([ADMIN_ROLE]):
            return "Not authorized", 403
        if request.method == 'POST':
            name = request.args.get('name')
            values = {'name': name, 'data': buffer(request.get_data())}
            values['hash'] = hashlib.md5(values['data']).hexdigest()
            values['folder_id'] = request.args.get('folder_id', None)
            conflict = False
            try:
                attachment_id, name = sql.selectOne("SELECT attachment_id, name FROM attachment WHERE hash=:hash", values)
                conflict = True
            except NoResult:
                attachment_id = sql.insert("INSERT INTO attachment VALUES (NULL, :name, :folder_id, :data, :hash)", values)
            return json.dumps({'attachment_id': attachment_id, 'name': name, 'conflict': conflict})
        if request.method == 'PUT':
            # rename attachment
            if sql.update("UPDATE attachment SET name=:name WHERE attachment_id=:attachment_id", attachment_id=attachment_id, name=request.args['name']) == 0:
                return "No such attachment", 404
            return json.dumps({})
        if request.method == 'DELETE':
            # only allow deletion of an attachment if it is orphaned
            if sql.selectSingle(COUNT_ASSETS_FOR_ATTACHMENT_SQL, attachment_id=attachment_id) != 0:
                return "Attachment not orphaned", 400
            sql.delete(DELETE_ATTACHMENT_SQL, attachment_id=attachment_id)
            return json.dumps({})

@application.route('/folder', methods=['POST'])
@application.route('/folder/<folder_id>', methods=['PUT', 'DELETE'])
@application.role_required([ADMIN_ROLE])
def folder_endpoint(folder_id=None):
    """ Create or delete attachment folders.
    """
    with application.db.cursor() as sql:
        if request.method == 'PUT':
            # rename folder
            if sql.update("UPDATE attachment_folder SET name=:name WHERE folder_id=:folder_id", folder_id=folder_id, name=request.args['name']) == 0:
                return "No such folder", 404
            return json.dumps({})
        if request.method == 'POST':
            # create folder, need the name and parent, and return the new id
            parent_id = request.args.get('parent_id', None)
            if parent_id is not None and sql.selectSingle("SELECT COUNT(*) FROM attachment_folder WHERE folder_id=:parent_id", parent_id=parent_id) == 0:
                return "Bad parent id", 400
            name = request.args['name']
            folder_id = sql.insert("INSERT INTO attachment_folder VALUES (NULL, :parent_id, :name)", parent_id=parent_id, name=name)
            return json.dumps({'folder_id': folder_id})
        if request.method == 'DELETE':
            # delete folder by id
            if sql.delete("DELETE FROM attachment_folder WHERE folder_id=:folder_id", folder_id=folder_id) == 0:
                return "No such folder", 404
            return json.dumps({})

@application.route('/attachment/<asset_id>')
@application.route('/attachment/<asset_id>/<attachment_id>', methods=['PUT', 'DELETE'])
def attachment_endpoint(**values):
    """ Get all attachment ids for an asset, attach an attachment file to an asset, or remove the attachment from the asset.
    """
    with application.db.cursor() as sql:
        if request.method == 'GET':
            return json.dumps(sql.selectAllDict(ASSET_ATTACHMENTS_SQL, values))
        if not application.user_has_role([ADMIN_ROLE, BOOK_ROLE]):
            return "Not authorized", 403
        if request.method == 'DELETE':
            count = sql.delete("DELETE FROM attachment_asset_pivot WHERE asset_id=:asset_id AND attachment_id=:attachment_id", values)
            if count == 0:
                return "No such association", 404
            return json.dumps({})
        if request.method == 'PUT':
            count = sql.selectSingle("SELECT COUNT(*) FROM attachment WHERE attachment_id=:attachment_id", values)
            if count == 0:
                return "Bad attachment id", 400
            count = sql.selectSingle("SELECT COUNT(*) FROM attachment_asset_pivot WHERE asset_id=:asset_id AND attachment_id=:attachment_id", values)
            if count != 0:
                return "Association already exists", 409
            sql.insert("INSERT INTO attachment_asset_pivot VALUES (NULL, :attachment_id, :asset_id)", values)
            return json.dumps({})


@application.route('/booking', methods=['GET', 'POST'])
@application.route('/booking/<booking_id>', methods=['PUT', 'DELETE'])
@application.role_required([ADMIN_ROLE, BOOK_ROLE, VIEW_ROLE])
def booking_endpoint(booking_id=None):
    """ Add or interact with bookings.
    """
    with application.db.cursor() as sql:
        if request.method == 'GET':
            # get bookings for an asset or user, applying any given range
            if 'user_id' in request.args and not application.user_has_role([ADMIN_ROLE, BOOK_ROLE]):
                return "Role required", 403
            for table, column, xjoin_key in [('booking', 'asset_id', None), ('user', 'user_id', 'user'), ('booking', 'project', 'project')]:
                if column in request.args:
                    args = {column: request.args[column]}
                    if 'fromDate' in request.args and 'toDate' in request.args:
                        clause = RANGE_CLAUSE
                        args['from_date'] = request.args['fromDate']
                        args['to_date'] = request.args['toDate']
                    else:
                        clause = EXTANT_CLAUSE
                    bookings = sql.selectAllDict(BOOKINGS_SQL.format(table, column, clause), args)
                    if xjoin_key is not None:
                        # talk to SOLR to get some asset details
                        assets_dict = application.solr.assets_dict_xjoin(xjoin_key, args[column])
                        update_booking = lambda b: b.update(assets_dict.get(b['asset_id'], {})) or b
                        bookings = [update_booking(booking) for booking in bookings]
                    return json.dumps(bookings)
            return 'Missing argument', 400
        if request.method == 'POST':
            # add a booking for an asset for the current user - returns a clashing booking if one exists (and doesn't add the submitted booking)
            if not application.user_has_role([ADMIN_ROLE, BOOK_ROLE]):
                return "Role required", 403
            args = request.args.to_dict()
            try:
                booking = sql.selectOneDict(CHECK_BOOKING_SQL, args)
                return json.dumps(booking), 409
            except NoResult:
                pass
            args['booking_id'] = sql.insert("INSERT INTO booking VALUES (NULL, :asset_id, :user_id, datetime('now'), :due_out_date, :due_in_date, NULL, NULL, NULL, NULL, :project, :notes)", args, notes=request.get_data(), user_id=current_user.user_id)
            return json.dumps(args)
        if request.method == 'PUT':
            # update an existing booking by id
            if not application.user_has_role([ADMIN_ROLE, BOOK_ROLE]):
                return "Role required", 403

            # check for clashing bookings - need to use newly supplied dates over existing ones
            due_out_date = '"{0}"'.format(request.args['due_out_date']) if 'due_out_date' in request.args else "booking.due_out_date"
            due_in_date = '"{0}"'.format(request.args['due_in_date']) if 'due_in_date' in request.args else "booking.due_in_date"
            try:
                booking = sql.selectOneDict(CHECK_CLASH_SQL.format(due_out_date, due_in_date), booking_id=booking_id)
                return json.dumps(booking), 409
            except NoResult:
                pass

            fields = [field for field in ['project', 'due_out_date', 'due_in_date'] if field in request.args]
            notes = request.get_data()
            if notes is not None:
                fields.append('notes')
            if len(fields) == 0:
                return "No update arguments", 400
            set_fields = ', '.join(["{0}=:{0}".format(field) for field in fields])
            clauses = ["booking_id=:booking_id"]
            if 'project' in fields or 'due_out_date' in fields:
                clauses.append("out_date IS NULL")
            if 'project' in fields or 'due_out_date' in fields or 'due_in_date' in fields:
                clauses.append("in_date IS NULL")
            if not application.user_has_role([ADMIN_ROLE]):
                clauses.append("user_id=:user_id")
            booking = request.args.to_dict()
            booking['booking_id'] = booking_id
            if sql.update("UPDATE booking SET {0} WHERE {1}".format(set_fields, ' AND '.join(clauses)), booking, notes=notes, user_id=current_user.user_id) < 1:
                return "No updatable booking", 400
            return json.dumps(booking)
        if request.method == 'DELETE':
            # delete a particular booking by id
            if not application.user_has_role([ADMIN_ROLE, BOOK_ROLE]):
                return "Role required", 403
            user_clause = " AND user_id=:user_id" if not application.user_has_role([ADMIN_ROLE]) else ""
            if sql.delete("DELETE FROM booking WHERE booking_id=:booking_id AND out_date IS NULL AND in_date IS NULL{0}".format(user_clause), booking_id=booking_id, user_id=current_user.user_id) < 1:
                return "No deletable booking", 400
            return json.dumps({})


@application.route('/check/<asset_id>', methods=['PUT'])
@application.role_required([ADMIN_ROLE, BOOK_ROLE])
def book_endpoint(asset_id):
    """ Endpoint for checking out (request body empty) or checking in (request body is condition) an asset.
    """
    with application.db.cursor() as sql:
        condition = request.get_data()
        if len(condition) == 0:
            if sql.update(CHECK_OUT_SQL, asset_id=asset_id, user_id=current_user.user_id) < 1:
                return "Bad request", 400
        else:
            if sql.update(CHECK_IN_SQL, asset_id=asset_id, user_id=current_user.user_id, condition=condition) < 1:
                return "Bad request", 400
            application.solr.update_field(asset_id, CONDITION_FIELD, condition)
        return json.dumps({})


def _delete_triggers(sql, notification_id):
    for trigger_id in sql.selectAllSingle("SELECT trigger_id FROM trigger WHERE notification_id=:notification_id", notification_id=notification_id):
        sql.delete("DELETE FROM trigger_filter WHERE trigger_id=:trigger_id", trigger_id=trigger_id)
    sql.delete("DELETE FROM trigger WHERE notification_id=:notification_id", notification_id=notification_id)

def _default(d, *keys):
    for key in keys:
        if key not in d:
            d[key] = None

def _insert_triggers(sql, notification):
    for trigger in notification['triggers']:
        _default(trigger, 'column', 'field')
        trigger['trigger_id'] = sql.insert("INSERT INTO trigger VALUES (NULL, :notification_id, :column, :field, :days)", trigger, notification_id=notification['notification_id'])
        for filter in trigger['filters']:
            filter['trigger_id'] = trigger['trigger_id']
            _default(filter, 'column', 'field')
            filter['filter_id'] = sql.insert("INSERT INTO trigger_filter VALUES (NULL, :trigger_id, :column, :field, :operator, :value)", filter, trigger_id=trigger['trigger_id'])

def _delete_roles(sql, notification_id):
    sql.delete("DELETE FROM notification_role_pivot WHERE notification_id=:notification_id", notification_id=notification_id)

def _insert_roles(sql, notification):
    for role in notification['roles']:
        sql.insert("INSERT INTO notification_role_pivot VALUES (NULL, :notification_id, :role)", notification_id=notification['notification_id'], role=role)

def _insert_notification(sql, notification, notification_id=None):
    notification['notification_id'] = sql.insert("INSERT INTO notification VALUES (:notification_id, :name, :title_template, :body_template, :every, :offset, NULL)", notification, notification_id=notification_id)
    _delete_roles(sql, notification['notification_id'])
    _insert_roles(sql, notification)
    _delete_triggers(sql, notification['notification_id'])
    _insert_triggers(sql, notification)

def _update_notification(sql, notification, notification_id):
    notification['notification_id'] = notification_id
    sql.update("UPDATE notification SET name=:name, title_template=:title_template, body_template=:body_template, every=:every, offset=:offset WHERE notification_id=:notification_id", notification, notification_id=notification_id)
    _delete_roles(sql, notification_id)
    _insert_roles(sql, notification)
    _delete_triggers(sql, notification_id)
    _insert_triggers(sql, notification)

@application.route('/notification', methods=['GET', 'POST'])
@application.route('/notification/<notification_id>', methods=['GET', 'PUT', 'POST', 'DELETE'])
@application.role_required([ADMIN_ROLE])
def notification_endpoint(notification_id=None):
    """ Endpoint for notifications. From the server API standpoint, these are hierarchal objects - notifications contains triggers,
        triggers contain filters. This makes updating complicated, because we have to check for contained triggers, and within those,
        contained filters - simplify by deleting the inserting. Notifications cannot share triggers, and triggers cannot share filters,
        so that makes things a bit easier.
    """
    with application.db.cursor() as sql:
        if request.method == 'GET':
            if notification_id is not None:
                try:
                    notifications = [sql.selectAllDict("SELECT * FROM notification WHERE notification_id=:notification_id", notification_id=notification_id)]
                except NoResult:
                    return "No such notification", 404
            else:
                notifications = sql.selectAllDict("SELECT * FROM notification")
            for notification in notifications:
                notification['roles'] = sql.selectAllSingle("SELECT role FROM notification_role_pivot WHERE notification_id=:notification_id", notification_id=notification['notification_id'])
                notification['triggers'] = sql.selectAllDict("SELECT * FROM trigger WHERE notification_id=:notification_id", notification_id=notification['notification_id'])
                for trigger in notification['triggers']:
                    trigger['filters'] = sql.selectAllDict("SELECT * FROM trigger_filter WHERE trigger_id=:trigger_id", trigger_id=trigger['trigger_id'])
            if notification_id is not None:
                notifications = notifications[0]
            return json.dumps(notifications)
        if request.method == 'PUT':
            notification = request.get_json()
            try:
                sql.selectOneDict("SELECT * FROM notification WHERE notification_id=:notification_id", notification_id=notification_id)
                _update_notification(sql, notification, notification_id)
            except NoResult:
                _insert_notification(sql, notification, notification_id)
            return json.dumps(notification)
        if request.method == 'DELETE':
            if sql.delete("DELETE FROM notification WHERE notification_id=:notification_id", notification_id=notification_id) == 0:
                return "No such notification", 404
            _delete_roles(sql, notification_id)
            _delete_triggers(sql, notification_id)
            return json.dumps({})
        if request.method == 'POST':
            if notification_id is not None:
                # clear 'run' date
                if sql.update("UPDATE notification SET run=NULL WHERE notification_id=:notification_id", notification_id=notification_id) == 0:
                    return "No such notification", 404
                return json.dumps({})
            else:
                notification = request.get_json()
                _insert_notification(sql, notification)
                return json.dumps(notification)


if __name__ == '__main__':
    if 'debug' in sys.argv:
        application.debug = True
    application.run('0.0.0.0', port=3389)
