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

SOLR_COLLECTION = "assets"
SOLR_QUERY_URL = "http://localhost:8983/solr/{0}/query".format(SOLR_COLLECTION)
SOLR_UPDATE_URL = "http://localhost:8983/solr/{0}/update".format(SOLR_COLLECTION)
DATABASE = "sql/assets.db"

ROUNDS = 10^6
ANONYMOUS, VIEW_ROLE, BOOK_ROLE, ADMIN_ROLE = range(4)

class User(object):
    """ User session class for flask login.
    """
    def __init__(self, user_id, role, username, label, password_salt, password_hash, data_json):
        self.user_id = user_id
        self.role = role
        self.username = username
        self.label = label
        self.password_salt = password_salt
        self.password_hash = password_hash
        self.data = json.loads(data_json)
        self.is_authenticated = True
        self.is_active = True
        self.is_anonymous = False

    def get_id(self):
        """ Get the user id.
        """
        return self.user_id

    def check_password(self, password):
        """ Check the given pasword against the salt and hash.
        """
        return hashlib.pbkdf2_hmac('sha256', password, str(self.password_salt), ROUNDS) == str(self.password_hash)

    def set_password(self, password):
        """ Set the password (generating random salt).
        """
        self.password_salt = os.urandom(32)
        self.password_hash = hashlib.pbkdf2_hmac('sha256', password, self.password_salt, ROUNDS)

    def to_dict(self):
        """ Return fields in a dictionary, omitting password fields.
        """
        return {'user_id': self.user_id, 'role': self.role, 'username': self.username, 'label': self.label, 'data': json.dumps(self.data)}

class UserApplication(Flask):
    def __init__(self, name):
        super(UserApplication, self).__init__(name)
        self.secret_key = os.urandom(32)
        self.request_times = {}
        self.logged_in_users = []
        login_manager = LoginManager()
        login_manager.init_app(self)
        login_manager.user_loader(self.load_user)

    def load_user(self, user_id):
        """ User loader for flask login.
        """
        if user_id not in self.logged_in_users:
            return None # log out this user, who was logged in before server restart
        try:
            with db.cursor() as sql:
                values = sql.selectOne("SELECT role, username, label, password_salt, password_hash, json FROM user WHERE user_id=:user_id", user_id=user_id)
        except NoResult:
            return None
        return User(user_id, *values)

    def user_has_role(self, roles): # pylint: disable=no-self-use
        """ Return whether the current user has one of the specified list of roles.
        """
        return hasattr(current_user, 'role') and current_user.role in roles

    def role_required(self, roles):
        """ Define a decorator for specifying which roles can access which endpoints.
        """
        def _role_decorator(func):
            @functools.wraps(func)
            def _decorated_view(*args, **kwargs):
                if hasattr(current_user, 'name'):
                    self.request_times[current_user.name] = time()
                if self.user_has_role(roles):
                    return login_required(func)(*args, **kwargs)
                return self.login_manager.unauthorized() # pylint: disable=no-member
            return _decorated_view
        return _role_decorator

    def check_user_timeout(self):
        """ Check for user timeout since last request.
        """
        # check for user timeouts
        for user_id in self.logged_in_users:
            if not self.debug and time() > self.request_times[user_id] + self.user_timeout_secs:
                self.logged_in_users.remove(user_id)
        # check whether current user has been logged out?
        if not hasattr(current_user, 'role'):
            return None
        if current_user.user_id not in self.logged_in_users:
            logout_user()
            return "User session timed out", 403
        return None

application = UserApplication(__name__) # pylint: disable=invalid-name

@application.route('/login', methods=['POST'])
def login_endpoint():
    """ Log in endpoint.
    """
    username = request.args['username']
    password = request.get_data()
    try:
        with db.cursor() as sql:
            values = sql.selectOne("SELECT user_id, role, username, label, password_salt, password_hash, json FROM user WHERE username=:username", username=username)
            user = User(*values)
            if user.check_password(password):
                login_user(user)
                application.request_times[user.user_id] = time()
                application.logged_in_users.append(user.user_id)
                return json.dumps(user.to_dict())
    except NoResult:
        pass
    return json.dumps({})

@application.route('/logout')
def logout_endpoint():
    """ Logout endpoint.
    """
    user_id = getattr(current_user, 'user_id', None)
    if user_id is not None and user_id in application.logged_in_users:
        application.logged_in_users.remove(user_id)
    logout_user()
    return json.dumps({})

@application.route('/user', methods=['GET', 'PUT'])
def user_endpoint():
    """ User details endpoint (for the logged in user only).
    """
    if request.method == 'GET':
        # if not logged in, return {}
        if hasattr(current_user, 'to_dict'):
            return json.dumps(current_user.to_dict())
    elif request.method == 'PUT':
        # update details for the logged in user (can only change label and json using this endpoint)
        if current_user.is_anonymous:
            return "Not logged in", 403
        user = request.get_json()
        if not current_user.check_password(user['password']):
            return "Bad credentials", 403
        current_user.label = user['label']
        current_user.data = user['data']
        new_password = user.get('new_password', '')
        with db.cursor() as sql:
            if len(new_password) > 0:
                current_user.set_password(new_password)
                sql.update("UPDATE user SET label=:label, password_salt=:salt, password_hash=:hash, json=:data WHERE user_id=:user_id", current_user.to_dict(), salt=buffer(current_user.password_salt), hash=buffer(current_user.password_hash))
            else:
                sql.update("UPDATE user SET label=:label, json=:data WHERE user_id=:user_id", current_user.to_dict())
    return json.dumps({})

@application.route('/user/admin', methods=['POST'])
@application.role_required([ADMIN_ROLE])
def user_admin_endpoint():
    """ Endpoint for an admin to add a new user.
    """
    new_user = request.get_json()
    try:
        if not current_user.check_password(new_user['password']):
            return "Bad credentials", 403
        with db.cursor() as sql:
            try:
                sql.selectOne("SELECT user_id FROM user WHERE username=:username", username=new_user['username'])
                return "User already exists", 400
            except NoResult:
                pass
            user = User(None, new_user['role'], new_user['username'], new_user['label'], None, None, json.dumps(new_user['data'])) #FIXME JSON back and forth...
            user.set_password(new_user['new_password'])
            sql.insert("INSERT INTO user VALUES (NULL, :role, :username, :label, :salt, :hash, :data)", user.to_dict(), salt=buffer(user.password_salt), hash=buffer(user.password_hash))
        return json.dumps({})
    except KeyError:
        return "Bad user details", 400
    

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
    """ Redirect / to index.
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


@application.route('/booking', methods=['POST'])
@application.role_required([ADMIN_ROLE, BOOK_ROLE])
def booking_endpoint():
    """ Add or interact with bookings.
    """
    with db.cursor() as sql:
        if request.method == 'POST':
            # add a booking for the current user
            data = request.get_json() # just to be sure it is valid JSON
            sql.insert("INSERT INTO booking VALUES (NULL, :asset_id, :user_id, datetime('now'), :dueOutDate, :dueInDate, NULL, NULL, :project, :data)", request.args.to_dict(), user_id=current_user.user_id, data=json.dumps(data))
            return json.dumps({})
        

if __name__ == '__main__':
    #FIXME clearly user stuff should be in another module, then that module can have this for it's __main__:
    if len(sys.argv) == 3:
        user = User(None, ADMIN_ROLE, sys.argv[1], "New Admin User", None, None, '{}')
        user.set_password(sys.argv[2])
        with SqlDatabase(DATABASE).cursor() as sql:
            sql.insert("INSERT INTO user VALUES (NULL, :role, :username, :label, :salt, :hash, :data)", user.to_dict(), salt=buffer(user.password_salt), hash=buffer(user.password_hash))
        sys.exit(0)
    if 'debug' in sys.argv:
        application.debug = True
    application.run('0.0.0.0', port=8080)
