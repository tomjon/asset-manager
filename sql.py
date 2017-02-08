import sqlite3


class NoResult(Exception):
    pass


class SqlDatabase(object):
    def __init__(self, database):
        self.db = sqlite3.connect(database, isolation_level='EXCLUSIVE')

    def cursor(self):
        return SqlCursor(self.db)

    def close(self):
        self.db.close()


class SqlCursor(object):
    def __init__(self, db):
        self.db = db
        self.cursor = db.cursor()
        self._commit = False

    def __enter__(self):
        return self

    def __exit__(self, *args):
        if self._commit:
            self.db.commit()

    def _execute(self, stmt, values, kwargs):
        if values is None:
            values = {}
        values = dict(values) # work on a copy
        values.update(kwargs)
        #print stmt, values
        self.cursor.execute(stmt, values)

    def selectOne(self, stmt, values=None, **kwargs):
        self._execute(stmt, values, kwargs)
        row = self.cursor.fetchone()
        if row is None:
            raise NoResult()
        return row

    def selectSingle(self, stmt, values=None, **kwargs):
        return self.selectOne(stmt, values, **kwargs)[0]

    def selectOneDict(self, stmt, values=None, **kwargs):
        row = self.selectOne(stmt, values, **kwargs)
        return dict(zip([col[0] for col in self.cursor.description], row))

    def selectAll(self, stmt, values=None, **kwargs):
        self._execute(stmt, values, kwargs)
        return self.cursor.fetchall()

    def selectAllSingle(self, stmt, values=None, **kwargs):
        self._execute(stmt, values, kwargs)
        return [v[0] for v in self.cursor.fetchall()]

    def selectAllDict(self, stmt, values=None, **kwargs):
        rows = self.selectAll(stmt, values, **kwargs)
        return [dict(zip([col[0] for col in self.cursor.description], row)) for row in rows]

    def insert(self, stmt, values=None, **kwargs):
        self.update(stmt, values, **kwargs)
        return self.cursor.lastrowid

    def update(self, stmt, values=None, **kwargs):
        self._execute(stmt, values, kwargs)
        self._commit = True
        return self.cursor.rowcount

    def delete(self, stmt, values=None, **kwargs):
        self._execute(stmt, values, kwargs)
        self._commit = True
        return self.cursor.rowcount

