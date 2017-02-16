""" Flask server for the Server API.
"""
from sql import SqlDatabase
from werkzeug.local import LocalProxy
from flask import Flask, g
from config import DATABASE

class SqlApplication(Flask):
    def __init__(self, name, **args):
        super(SqlApplication, self).__init__(name, **args)
        self.teardown_appcontext_funcs.append(self._teardown_db)
        self.db = LocalProxy(self._get_db)

    def _get_db(self):
        db = getattr(g, '_database', None)
        if db is None:
	        db = g._database = SqlDatabase(DATABASE)
        return db

    def _teardown_db(self, e):
        db = getattr(g, '_database', None)
        if db is not None:
            db.close()

