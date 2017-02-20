""" Unit tests for the notifications module.
"""
import pytest
import re
from datetime import datetime, timedelta
from sql import SqlDatabase, NoResult
from notifications import run_notifications
from user_app import ADMIN_ROLE, BOOK_ROLE, VIEW_ROLE

TEST_ASSETS = [
    {'id': 1, 'serial': 'a4b6e251'},
    {'id': 2, 'serial': 'b34t5341', 'manufacturer': 'Roberts', 'model': 'Radio', 'calibration_due': '2012-06-06T00:00:00Z'}
]

TEST_USERS = [
    {'user_id': 1, 'role': BOOK_ROLE, 'username': 'booker', 'email': 'booker@ofcom.org.uk', 'label': 'Charlie Booker'},
    {'user_id': 2, 'role': ADMIN_ROLE, 'username': 'pointy', 'email': 'pointy@ofcom.org.uk', 'label': 'Pointy Haired Boss'}
]

TEST_BOOKINGS = [
    {'asset_id': 1, 'user_id': 1, 'booked_date': '2017-02-10', 'due_out_date': '2017-02-15', 'due_in_date': '2017-02-25', 'out_date': None, 'in_date': None, 'project': 1}
]

TEST_NOTIFICATIONS = [
    {'notification_id': 1, 'trigger_column': 'due_out_date', 'trigger_field': None, 'trigger_time': 3600, 'title_template': 'Asset <SERIAL>', 'body_template': 'Asset <SERIAL> due out on [DUE_OUT_DATE]!', 'roles': [ADMIN_ROLE]},
    {'notification_id': 2, 'trigger_column': None, 'trigger_field': 'calibration_due', 'trigger_time': 5400, 'title_template': '<MANUFACTURER> <MODEL>', 'body_template': 'Asset <SERIAL> was due for calibration on [CALIBRATION_DUE]', 'roles': [ADMIN_ROLE]}
]

class AssetIndex(object):
    def __init__(self, assets):
        self.assets = {}
        self.q_re = re.compile(r"([^:]+):\[\* TO ([^+]+)\+([^S]+)SECONDS\]")
        for asset in assets:
            self.assets[asset['id']] = asset

    def search(self, params):
        # currently, the only query is like q=calibration_date:[* TO <DATE>+<N>SECONDS] where <DATE> could be '2017-02-10T00:00:00Z' for example
        if 'q' in params:
            match = self.q_re.match(params['q'])
            if match is not None:
                field, dt, delay = match.groups()
                docs = [asset for asset in self.assets.itervalues() if field in asset and datetime.strptime(asset[field], "%Y-%m-%dT%H:%M:%SZ") <= datetime.strptime(dt, "%Y-%m-%dT%H:%M:%SZ") + timedelta(seconds=int(delay))]
                return {'response': {'docs': docs}}
        return {}

    def get(self, asset_id):
        return self.assets.get(asset_id, None)

@pytest.fixture()
def db():
    db = SqlDatabase(':memory:')
    with db.cursor() as sql:
        sql.executePath('../sql/create.sql')
        sql.cursor.executemany("INSERT INTO user VALUES (:user_id, :role, :username, :email, NULL, NULL)", TEST_USERS)
        enum_id = sql.insert("INSERT INTO enum VALUES (NULL, :field)", field='user')
        sql.cursor.executemany("INSERT INTO enum_entry VALUES (NULL, :enum_id, :value, :value, :label)", [{'enum_id': enum_id, 'value': x['user_id'], 'label': x['label']} for x in TEST_USERS])
        sql.cursor.executemany("INSERT INTO booking VALUES (NULL, :asset_id, :user_id, :booked_date, :due_out_date, :due_in_date, :out_date, :in_date, :project)", TEST_BOOKINGS)
        sql.cursor.executemany("INSERT INTO notification VALUES (:notification_id, :trigger_column, :trigger_field, :trigger_time, :title_template, :body_template, NULL)", TEST_NOTIFICATIONS)
        sql.cursor.executemany("INSERT INTO notification_role_pivot VALUES (NULL, :notification_id, :role_id)", [(x['notification_id'], role_id) for x in TEST_NOTIFICATIONS for role_id in x['roles']])
    return db

@pytest.fixture()
def index():
    return AssetIndex(TEST_ASSETS)

def test_due_out_not_triggered(db, index):
    """ Check notifications don't trigger when trigger time not passed.
    """
    for now, count in [('2010-12-01T00:00:00Z', 0), ('2017-02-12T17:22:01Z', 1), ('2017-02-15T00:01:25Z', 1)]:
        mails = list(run_notifications(now, db, index))
        assert len(mails) == count
        with db.cursor() as sql:
            assert sql.selectAllSingle("SELECT last_run FROM notification") == 2 * [now]

def test_due_out(db, index):
    """ Check triggered notifications generate mail.
    """
    now = '2017-02-16T10:21:43Z'
    mails = list(run_notifications(now, db, index))
    assert len(mails) == 2
    assert mails[0].to == (TEST_USERS[0]['label'], TEST_USERS[0]['email'])
    assert mails[0].title == 'Asset {0}'.format(TEST_ASSETS[0]['serial'])
    assert mails[0].body == 'Asset {0} due out on {1}!'.format(TEST_ASSETS[0]['serial'], TEST_BOOKINGS[0]['due_out_date'])
    assert mails[0].cc == [(TEST_USERS[1]['label'], TEST_USERS[1]['email'])]
    with db.cursor() as sql:
        assert sql.selectAllSingle("SELECT last_run FROM notification") == 2 * [now]

