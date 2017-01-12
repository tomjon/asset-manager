""" Flask server for the Server API.
"""
import json
import sys
import os
import requests
import httplib
from sql import SqlDatabase, NoResult
import mimetypes
from werkzeug.local import LocalProxy
from flask import Flask, redirect, request, Response, send_file, g

application = Flask(__name__) # pylint: disable=invalid-name

SOLR_COLLECTION = "assets"
SOLR_QUERY_URL = "http://localhost:8983/solr/{0}/query".format(SOLR_COLLECTION)
SOLR_UPDATE_URL = "http://localhost:8983/solr/{0}/update".format(SOLR_COLLECTION)
DATABASE = "sql/assets.db"

class SolrError(Exception):
    """ Exception raised when SOLR returns an error status.
    """
    def __init__(self, status_code):
        super(SolrError, self).__init__()
        self.status_code = status_code

@application.errorhandler(SolrError)
def handle_solr_error(error):
    """ Error handler for SolrError - just pass forward the status code.
    """
    return "SOLR Error", error.status_code

def assert_status_code(r, status_code):
    """ Raise a SolrError if the status code of the response is not as specified.
    """
    if r.status_code != status_code:
        raise SolrError(r.status_code)

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = SqlDatabase(DATABASE)
    return db

db = LocalProxy(get_db)

@application.teardown_appcontext
def teardown_db(e):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

@application.route('/', methods=['GET', 'POST'])
def main_endpoint():
    """ Redirect to index.
    """
    return redirect("/static/index.html")


@application.route('/favicon.ico')
def favicon_endpoint():
    """ Serve a favicon.
    """
    path = os.path.join(application.root_path, 'static', 'favicon.ico')
    return send_file(path, mimetype='image/vnd.microsoft.icon')

def contact_key_fn(contact):
    contact_id, data = contact
    return data.get('Last Name', data.get('E-mail Address', None))

def contact_label(data):
    label = "{0} {1}".format(data.get('First Name', ''), data.get('Last Name', '')).strip()
    return label if len(label) > 0 else data.get('E-mail Address', '<blank>')

@application.route('/enum')
@application.route('/enum/<field>', methods=['POST'])
def enums_endpoint(field=None):
    """ Endpoint for getting and updating enumerations. Contacts ('owner') are treated here specially.
    """
    with db.cursor() as sql:
        if request.method == 'GET':
            enums = {'owner': []}
            for enum_id, field in sql.selectAll("SELECT enum_id, field FROM enum"):
                stmt = "SELECT value, label, `order` FROM enum_entry WHERE enum_id=:enum_id"
                enums[field] = sql.selectAllDict(stmt, enum_id=enum_id)
            contacts = [(contact_id, json.loads(data)) for contact_id, data in sql.selectAll("SELECT contact_id, json FROM contact")]
            for (contact_id, data), order in zip(sorted(contacts, key=contact_key_fn), xrange(len(contacts))):
                enums['owner'].append({'value': contact_id, 'order': order, 'label': contact_label(data)})
            return json.dumps(enums)
        else:
            try:
                enum_id = sql.selectSingle("SELECT enum_id FROM enum WHERE field=:field", field=field)
            except NoResult:
                return "No such enum", 400
            label = request.args.get('label', 'No label')
            try:
                entry = sql.selectOneDict("SELECT value, label, `order` FROM enum_entry WHERE enum_id=:enum_id AND label=:label", enum_id=enum_id, label=label)
            except NoResult:
                next = max(sql.selectOne("SELECT MAX(value), MAX(`order`) FROM enum_entry WHERE enum_id=:enum_id", enum_id=enum_id)) + 1
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

    sort = ['id asc']
    order = request.args.get('order', None)
    if order is not None:
        enum = False
        if order[0] == 'E':
            enum = True
            order = order[1:]
        if len(order) < 2 or order[0] not in '><':
            return "Bad order", 400
        field = 'enum({0})'.format(order[1:]) if enum else order[1:]
        sort.append('{0} {1}'.format(field, 'asc' if order[0] == '>' else 'desc'))
        params.append(('fq', '{0}:*'.format(order[1:])))
    sort.reverse()
    params.append(('sort', ','.join(sort)))

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
            else:
                if value != '*':
                    value = '"{0}"'.format(value)
                params.append(('fq', '{0}:{1}'.format(field, value)))

    if 'facets' in request.args:
        params.append(('facet', 'true'))
        params.append(('facet.limit', '-1'))
        for field in request.args.get('facets', '').split(','):
            params.append(('facet.field', field))

    r = requests.get(SOLR_QUERY_URL, params=params)
    assert_status_code(r, httplib.OK)
    return Response(r.text, mimetype=r.headers['content-type'])


@application.route('/asset', methods=['POST'])
@application.route('/asset/<asset_id>', methods=['GET', 'PUT', 'DELETE'])
def asset_endpoint(asset_id=None):
    """ Asset add, delete, update endpoint.
    """
    if asset_id is None:
        # do a SOLR search so we can generate a new asset id
        r = requests.get(SOLR_QUERY_URL, params={'q': '*', 'rows': 1, 'fl': 'id', 'sort': 'id desc'})
        assert_status_code(r, httplib.OK)
        rsp = json.loads(r.text)
        docs = rsp['response']['docs']
        asset_id = str(int(docs[0]['id']) + 1) if len(docs) > 0 else 1
    if request.method == 'DELETE':
        # delete an existing asset
        data = {'delete': asset_id}
    elif request.method == 'GET':
        # get an existing asset
        r = requests.get(SOLR_QUERY_URL, params={'q': 'id:{0}'.format(asset_id)})
        assert_status_code(r, httplib.OK)
        return Response(r.text, mimetype=r.headers['content-type'])
    else:
        # add a new asset or update an existing asset
        data = {'add': {'doc': request.get_json()}}
        data['add']['doc']['id'] = asset_id
        if '_version_' in data['add']['doc']:
            del data['add']['doc']['_version_']
    headers = {'Content-Type': 'application/json'}
    r = requests.post(SOLR_UPDATE_URL, headers=headers, params={'commit': 'true'}, data=json.dumps(data))
    assert_status_code(r, httplib.OK)
    return Response(json.dumps({'id': asset_id}), mimetype='application/json')


@application.route('/file/<asset_id>', methods=['GET', 'POST'])
@application.route('/file/<asset_id>/<attachment_id>', methods=['GET', 'DELETE'])
@application.route('/file/<asset_id>/<attachment_id>/<filename>', methods=['GET'])
def file_endpoint(asset_id=None, attachment_id=None, filename=None):
    """ Retrieve, upload or delete a file.
    """
    with db.cursor() as sql:
        if request.method == 'GET' and attachment_id is not None:
            # get the attachment with given id, checking the asset_id
            stmt = "SELECT name, data FROM attachment WHERE asset_id=:asset_id AND attachment_id=:attachment_id"
            try:
                name, data = sql.selectOne(stmt, asset_id=asset_id, attachment_id=attachment_id)
            except NoResult:
                return "No such attachment", 404
            mimetype = mimetypes.guess_type(name)[0] or 'application/octet-stream'
            return Response(str(data), mimetype=mimetype)
        if request.method == 'DELETE':
            # delete attachment with given id, checking the asset_id
            values = {'asset_id': asset_id, 'attachment_id': attachment_id}
            sql.delete("DELETE FROM attachment WHERE asset_id=:asset_id AND attachment_id=:attachment_id", values)
        if request.method == 'POST':
            # save a new attachment
            name = request.args.get('name')
            values = {'asset_id': asset_id, 'name': name, 'data': buffer(request.get_data())}
            sql.insert("INSERT INTO attachment VALUES (NULL, :asset_id, :name, :data)", values)
        # for these we return a list of attachment ids for this asset
        return json.dumps(sql.selectAllDict("SELECT attachment_id, name FROM attachment WHERE asset_id=:asset_id", asset_id=asset_id))


if __name__ == '__main__':
    if 'debug' in sys.argv:
        application.debug = True
    application.run('0.0.0.0', port=8080)
