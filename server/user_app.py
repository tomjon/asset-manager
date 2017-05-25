#!/usr/bin/python
""" Flask server for the Server API.
"""
import sys
import os
import functools
from time import time
from sql import NoResult
from sql_app import SqlApplication, SqlDatabase, DATABASE
from flask import request
from flask_login import LoginManager, login_required, current_user, login_user, logout_user
from config import ROUNDS, USER_TIMEOUT_SECS

try:
    from hashlib import pbkdf2_hmac
except ImportError:
    from backports.pbkdf2 import pbkdf2_hmac

ANONYMOUS, VIEW_ROLE, BOOK_ROLE, ADMIN_ROLE = range(4)

class User(object):
    """ User session class for flask login.
    """
    def __init__(self, user_id, role, username, email, label, password_salt, password_hash):
        self.user_id = user_id
        self.role = role
        self.username = username
        self.email = email
        self.label = label
        self.password_salt = str(password_salt)
        self.password_hash = str(password_hash)
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
        return pbkdf2_hmac('sha256', str(password), str(self.password_salt), ROUNDS) == self.password_hash

    def set_password(self, password):
        """ Set the password (generating random salt).
        """
        self.password_salt = os.urandom(32)
        self.password_hash = pbkdf2_hmac('sha256', str(password), str(self.password_salt), ROUNDS)

    def to_dict(self, db):
        """ Return fields in a dictionary, omitting password fields.
        """
        with db.cursor() as sql:
            roleLabel = sql.selectSingle("SELECT label FROM enum, enum_entry WHERE field='role' AND enum_entry.enum_id=enum.enum_id AND value=:role", role=self.role)
        return {'user_id': self.user_id, 'role': self.role, 'username': self.username, 'email': self.email, 'label': self.label, 'roleLabel': roleLabel}

class UserApplication(SqlApplication):
    def __init__(self, name, **args):
        super(UserApplication, self).__init__(name, **args)
        self.secret_key = os.urandom(32)
        self.request_times = {}
        self.logged_in_users = []
        self.before_request(self.check_user_timeout)
        login_manager = LoginManager()
        login_manager.init_app(self)
        login_manager.user_loader(self.load_user)

    def load_user(self, user_id):
        """ User loader for flask login.
        """
        if user_id not in self.logged_in_users:
            return None # log out this user, who was logged in before server restart
        try:
            with self.db.cursor() as sql:
                values = sql.selectOne("SELECT role, username, email, label, password_salt, password_hash FROM user, enum, enum_entry WHERE user_id=:user_id AND field='user' AND enum.enum_id=enum_entry.enum_id AND value=user_id", user_id=user_id)
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
                return "Need required role", 403
            return _decorated_view
        return _role_decorator

    def check_user_timeout(self):
        """ Check for user timeout since last request.
        """
        if USER_TIMEOUT_SECS is None:
            return None
        # check for user timeouts
        for user_id in self.logged_in_users:
            if not self.debug and time() > self.request_times[user_id] + USER_TIMEOUT_SECS:
                self.logged_in_users.remove(user_id)
        # check whether current user has been logged out?
        if not hasattr(current_user, 'role'):
            return None
        if current_user.user_id not in self.logged_in_users:
            logout_user()
            return "User session timed out", 403
        return None

    def login(self, username, password):
        """ Attempt to login a user, returns the user object or None if bad credentials.
        """
        try:
            with self.db.cursor() as sql:
                values = sql.selectOne("SELECT user_id, role, username, email, label, password_salt, password_hash FROM user, enum, enum_entry WHERE username=:username AND field='user' AND enum.enum_id=enum_entry.enum_id AND value=user_id", username=username)
                user = User(*values)
                if user.check_password(password):
                    login_user(user)
                    self.request_times[user.user_id] = time()
                    self.logged_in_users.append(user.user_id)
                    sql.update("UPDATE user SET last_login=date('now') WHERE user_id=:user_id", user_id=user.user_id)
                    return user
        except NoResult:
            pass
        return None

    def logout(self):
        """ Logout the current user. Does nothing if not logged in.
        """
        user_id = getattr(current_user, 'user_id', None)
        if user_id is not None and user_id in self.logged_in_users:
            self.logged_in_users.remove(user_id)
        logout_user()

    def update_user(self, user_dict):
        """ Update details for the logged in user from the given user dictionary.
        """
        current_user.label = user_dict['label']
        current_user.email = user_dict['email']
        new_password = user_dict.get('new_password', '')
        with self.db.cursor() as sql:
            if len(new_password) > 0:
                current_user.set_password(new_password)
                user_dict = current_user.to_dict(self.db)
                sql.update("UPDATE user SET password_salt=:salt, password_hash=:hash WHERE user_id=:user_id", user_dict, salt=buffer(current_user.password_salt), hash=buffer(current_user.password_hash))
            else:
                user_dict = current_user.to_dict(self.db)
            sql.update("UPDATE user SET email=:email WHERE user_id=:user_id", user_dict)
            sql.update("UPDATE enum_entry SET label=:label WHERE enum_id=(SELECT enum_id FROM enum WHERE field='user') AND value=:user_id", user_dict)

    def add_user(self, user_dict):
        """ Add a new user with values from the given user dictionary. Returns whether a new user
            was added (if username already exists it won't be). Raises a KeyError if necessary
            values are missing from the user_dict.
        """
        with self.db.cursor() as sql:
            try:
                sql.selectOne("SELECT user_id FROM user WHERE username=:username", username=user_dict['username'])
                return None
            except NoResult:
                pass
            user = User(None, user_dict['role'], user_dict['username'], user_dict['email'], user_dict['label'], None, None)
            user.set_password(user_dict['new_password'])
            user_dict = user.to_dict(self.db)
            user_id = sql.insert("INSERT INTO user VALUES (NULL, :role, :username, :email, :salt, :hash, NULL)", user_dict, salt=buffer(user.password_salt), hash=buffer(user.password_hash))
            sql.insert("INSERT INTO enum_entry VALUES (NULL, (SELECT enum_id FROM enum WHERE field='user'), :value, :value, :label)", user_dict, value=user_id)
        return user_id

    def edit_user(self, user_id, user_dict):
        """ Edit a user with values from the given user dictionary. Raises a KeyError if necessary
            values are missing from the user_dict. Returns None if a user with given id does not
            exist.
        """
        with self.db.cursor() as sql:
            user = User(None, user_dict['role'], user_dict['username'], user_dict['email'], user_dict['label'], None, None)
            if 'new_password' in user_dict:
                user.set_password(user_dict['new_password'])
                user_dict = user.to_dict(self.db)
                stmt = "UPDATE user SET role=:role, email=:email, password_salt=:salt, password_hash=:hash WHERE user_id=:user_id"
            else:
                stmt = "UPDATE user SET role=:role, email=:email WHERE user_id=:user_id"
            if sql.update(stmt, user_dict, salt=buffer(user.password_salt), hash=buffer(user.password_hash), user_id=user_id) == 0:
                return None
            sql.update("UPDATE enum_entry SET label=:label WHERE enum_id=(SELECT enum_id FROM enum WHERE field='user') AND value=:user_id", user_dict, user_id=user_id)
            return user_id

    def delete_user(self, user_id):
        """ Delete the user with given user id. A user can not delete themselves.
        """
        with self.db.cursor() as sql:
            ok = sql.delete("DELETE FROM user WHERE user_id=:user_id AND user_id != :current", user_id=user_id, current=current_user.user_id) > 0
            if ok:
                enum_id = sql.selectSingle("SELECT enum_id FROM enum WHERE field=:field", field='user')
                sql.delete("DELETE FROM enum_entry WHERE enum_id=:enum_id AND value=:value", enum_id=enum_id, value=user_id)
            return ok

if __name__ == '__main__':
    if len(sys.argv) != 5:
        print >>sys.stderr, "Usage: {0} <username> <password> <email> <label>".format(sys.argv[0])
        sys.exit(1)
    user = User(None, ADMIN_ROLE, unicode(sys.argv[1]), unicode(sys.argv[3]), unicode(sys.argv[4]), None, None)
    #FIXME clearly some consolidation to do here- move all the SQL into the User class? or a new class / set of functions
    user.set_password(unicode(sys.argv[2]))
    db = SqlDatabase(DATABASE)
    with db.cursor() as sql:
        user_dict = user.to_dict(db)
        user_id = sql.insert("INSERT INTO user VALUES (NULL, :role, :username, :email, :salt, :hash, NULL)", user_dict, salt=buffer(user.password_salt), hash=buffer(user.password_hash))
        sql.insert("INSERT INTO enum_entry VALUES (NULL, (SELECT enum_id FROM enum WHERE field='user'), :value, :value, :label)", user_dict, value=user_id)

