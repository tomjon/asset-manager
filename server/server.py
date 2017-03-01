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

ASSET_BOOKINGS_SQL = """
  SELECT booking_id,
         booking.user_id,
         user_enum_entry.label AS user_label,
         project,
         project_enum_entry.label AS project_label,
         due_out_date, due_in_date, out_date, in_date
    FROM booking, user,
         enum AS user_enum, enum_entry AS user_enum_entry,
         enum AS project_enum, enum_entry AS project_enum_entry
   WHERE asset_id=:asset_id
         AND (date('now') <= due_in_date OR (out_date IS NOT NULL AND in_date IS NULL))
         AND booking.user_id=user.user_id
         AND user_enum.field='user' AND user_enum.enum_id=user_enum_entry.enum_id AND user_enum_entry.value=user.user_id
         AND project_enum.field='project' AND project_enum.enum_id=project_enum_entry.enum_id AND project_enum_entry.value=booking.project
ORDER BY due_out_date
"""

# the IFNULL ensures that in_date is used in preference to due_in_date, should it be non-null, so that a user can book
# an asset where it has been returned early, and can not book an asset that has been returned late (in both cases where
# the requested booking would have overlapped or not with the previous booking)
CHECK_BOOKING_SQL = """
  SELECT booking_id, booking.user_id AS user_id, enum_entry.label AS user_label
    FROM booking, user, enum, enum_entry
   WHERE asset_id=:asset_id AND booking.user_id=user.user_id
         AND :dueInDate > due_out_date AND :dueOutDate < IFNULL(in_date, due_in_date)
         AND field='user' AND enum_entry.enum_id=enum.enum_id AND enum_entry.value=user.user_id
"""

CHECK_OUT_SQL = """
  UPDATE booking
     SET out_date=date('now')
   WHERE asset_id=:asset_id AND user_id=:user_id
         AND date('now') >= due_out_date AND date('now') <= due_in_date
         AND out_date IS NULL AND in_date IS NULL
"""

CHECK_IN_SQL = """
  UPDATE booking
     SET in_date=date('now')
   WHERE asset_id=:asset_id
         AND (user_id=:user_id OR (SELECT COUNT(*) FROM user WHERE user_id=:user_id AND role={0})=1)
         AND date('now') >= due_out_date
         AND out_date IS NOT NULL AND in_date IS NULL
""".format(ADMIN_ROLE)

GET_ATTACHMENT_SQL = """
  SELECT name, data
    FROM attachment
   WHERE attachment_id=:attachment_id
"""

ALL_ATTACHMENTS_SQL = """
  SELECT name, a.attachment_id, COUNT(p.attachment_id) AS count
    FROM attachment AS a LEFT JOIN attachment_asset_pivot AS p ON a.attachment_id=p.attachment_id
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
@application.role_required([ADMIN_ROLE])
def user_admin_endpoint():
    """ Endpoint for an admin to get a list of all users, or add a new user.
    """
    if request.method == 'GET':
        with application.db.cursor() as sql:
            # returns number of assets 'booked' (i.e. the booking lasts until after today - except for early returns - or the asset is still out),
            # number of assets 'out' (i.e. have been taken out and not returned),
            # number of assets 'overdue' (i.e. should have been returned by today, but hasn't been) 
            return json.dumps(sql.selectAllDict(USER_BOOKING_SUMMARY_SQL))
    else:
        new_user = request.get_json()
        if not current_user.check_password(new_user['password']):
            return "Bad credentials", 401
        try:
            if not application.add_user(new_user):
                return "User already exists", 409
        except KeyError:
            return "Bad user details", 400
        return json.dumps({})


@application.errorhandler(SolrError)
def handle_solr_error(error):
    """ Error handler for SolrError - just pass forward the status code.
    """
    return "SOLR Error", error.status_code

@application.route('/enum/<field>', methods=['POST'])
@application.role_required([ADMIN_ROLE])
def enums_endpoint(field=None):
    """ Endpoint for getting and updating enumerations.
    """
    with application.db.cursor() as sql:
        try:
            enum_id = sql.selectSingle("SELECT enum_id FROM enum WHERE field=:field", field=field)
        except NoResult:
            return "No such enum", 400
        label = request.args.get('label', 'No label')
        try:
            entry = sql.selectOneDict("SELECT value, label, `order` FROM enum_entry WHERE enum_id=:enum_id AND label=:label", enum_id=enum_id, label=label)
        except NoResult:
            next = max(sql.selectOne("SELECT MAX(value), MAX(`order`) FROM enum_entry WHERE enum_id=:enum_id", enum_id=enum_id))
            next = next + 1 if next is not None else 0
            entry = {'enum_id': enum_id, 'order': next, 'value': next, 'label': label}
            sql.insert("INSERT INTO enum_entry VALUES (NULL, :enum_id, :order, :value, :label)", entry)
        return json.dumps(entry)
        

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
    asset = applications.solr.get(asset_id)
    if asset is None:
        return "Asset not found", 404
    return Response(json.dumps(asset), mimetype=r.headers['content-type'])


@application.route('/file', methods=['GET', 'POST'])
@application.route('/file/<attachment_id>', methods=['GET', 'DELETE'])
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
            return json.dumps(sql.selectAllDict(ALL_ATTACHMENTS_SQL))
        if not application.user_has_role([ADMIN_ROLE]):
            return "Not authorized", 403
        if request.method == 'POST':
            name = request.args.get('name')
            values = {'name': name, 'data': buffer(request.get_data())}
            values['hash'] = hashlib.md5(values['data']).hexdigest()
            conflict = False
            try:
                attachment_id, name = sql.selectOne("SELECT attachment_id, name FROM attachment WHERE hash=:hash", values)
                conflict = True
            except NoResult:
                attachment_id = sql.insert("INSERT INTO attachment VALUES (NULL, :name, :data, :hash)", values)
            return json.dumps({'attachment_id': attachment_id, 'name': name, 'conflict': conflict})
        if request.method == 'DELETE':
            # only allow deletion of an attachment if it is orphaned
            if sql.selectSingle(COUNT_ASSETS_FOR_ATTACHMENT_SQL, attachment_id=attachment_id) != 0:
                return "Attachment not orphaned", 400
            sql.delete(DELETE_ATTACHMENT_SQL, attachment_id=attachment_id)
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


@application.route('/booking/<asset_id>', methods=['GET', 'POST'])
@application.route('/booking/<booking_id>', methods=['DELETE'])
@application.role_required([ADMIN_ROLE, BOOK_ROLE, VIEW_ROLE])
def booking_endpoint(asset_id=None, booking_id=None):
    """ Add or interact with bookings.
    """
    with application.db.cursor() as sql:
        if request.method == 'GET':
            return json.dumps(sql.selectAllDict(ASSET_BOOKINGS_SQL, asset_id=asset_id))
        elif request.method == 'POST':
            if not application.user_has_role([ADMIN_ROLE, BOOK_ROLE]):
                return "Role required", 403
            # add a booking for the current user - returns a clashing booking if one exists (and doesn't add the submitted booking)
            args = request.args.to_dict()
            try:
                booking = sql.selectOneDict(CHECK_BOOKING_SQL, args, asset_id=asset_id)
                return json.dumps(booking)
            except NoResult:
                pass
            sql.insert("INSERT INTO booking VALUES (NULL, :asset_id, :user_id, datetime('now'), :dueOutDate, :dueInDate, NULL, NULL, :project)", args, asset_id=asset_id, user_id=current_user.user_id)
            return json.dumps({})
        elif request.method == 'DELETE':
            if not application.user_has_role([ADMIN_ROLE, BOOK_ROLE]):
                return "Role required", 403
            user_clause = " AND user_id=:user_id" if not application.user_has_role([ADMIN_ROLE]) else ""
            if sql.delete("DELETE FROM booking WHERE booking_id=:booking_id AND out_date IS NULL AND in_date IS NULL{0}".format(user_clause), booking_id=booking_id, user_id=current_user.user_id) < 1:
                return "No deletable booking", 400
            return json.dumps({})


@application.route('/book/<asset_id>', methods=['PUT', 'DELETE'])
@application.role_required([ADMIN_ROLE, BOOK_ROLE])
def book_endpoint(asset_id):
    """ Endpoint for checking out (PUT) or checking in (DELETE) an asset.
    """
    with application.db.cursor() as sql:
        if request.method == 'PUT':
            if sql.update(CHECK_OUT_SQL, asset_id=asset_id, user_id=current_user.user_id) < 1:
                return "Bad request", 400
        elif request.method == 'DELETE':
            if sql.update(CHECK_IN_SQL, asset_id=asset_id, user_id=current_user.user_id) < 1:
                return "Bad request", 400
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

def _insert_notification(sql, notification, notification_id=None):
    notification['notification_id'] = sql.insert("INSERT INTO notification VALUES (:notification_id, :name, :title_template, :body_template)", notification, notification_id=notification_id)
    _delete_triggers(sql, notification_id)
    _insert_triggers(sql, notification)

def _update_notification(sql, notification, notification_id):
    notification['notification_id'] = notification_id
    sql.update("UPDATE notification SET name=:name, title_template=:title_template, body_template=:body_template WHERE notification_id=:notification_id", notification, notification_id=notification_id)
    _delete_triggers(sql, notification_id)
    _insert_triggers(sql, notification)

@application.route('/notification', methods=['GET', 'POST'])
@application.route('/notification/<notification_id>', methods=['GET', 'PUT', 'DELETE'])
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
            _delete_triggers(sql, notification_id)
            return json.dumps({})
        if request.method == 'POST':
            notification = request.get_json()
            _insert_notification(sql, notification)
            return json.dumps(notification)


if __name__ == '__main__':
    if 'debug' in sys.argv:
        application.debug = True
    application.run('0.0.0.0', port=3389)
