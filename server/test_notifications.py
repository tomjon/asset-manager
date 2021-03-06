# -*- coding: utf-8 -*-

""" Unit tests for the notifications module.
"""
import pytest
import re
import logging
from datetime import datetime, timedelta
from sql import SqlDatabase, NoResult
import notifications
from user_app import ADMIN_ROLE, BOOK_ROLE, VIEW_ROLE
from logger import get_logger

TEST_ASSETS = [
    {'id': 1, 'serial': 'a4b6e251'},
    {'id': 2, 'serial': 'b34t5341', 'manufacturer': 'Roberts', 'model': 'Radio', 'calibration_due': '2012-06-06T00:00:00Z'}
]

TEST_USERS = [
    {'user_id': 1, 'role': BOOK_ROLE, 'username': 'booker', 'email': 'booker@ofcom.org.uk', 'label': 'Charlie Booker'},
    {'user_id': 2, 'role': ADMIN_ROLE, 'username': 'pointy', 'email': 'pointy@ofcom.org.uk', 'label': 'Pointy Haired Boss'}
]

TEST_BOOKINGS = [
    {'booking_id': 0, 'asset_id': 1, 'user_id': 1, 'booked_date': '2017-02-10', 'due_out_date': '2017-02-15', 'due_in_date': '2017-02-25', 'out_date': None, 'in_date': None, 'project': 1}
]

TEST_NOTIFICATIONS = [
    {'notification_id': 1, 'name': '', 'title_template': 'Asset <SERIAL>', 'body_template': 'Asset <SERIAL> due out on [DUE_OUT_DATE]!', 'every': 1, 'offset': None},
    {'notification_id': 2, 'name': '', 'title_template': '<MANUFACTURER> <MODEL>', 'body_template': 'Asset <SERIAL> was due for calibration on <CALIBRATION_DUE>', 'every': 2, 'offset': 1},
    {'notification_id': 3, 'name': '', 'title_template': '<SERIAL>', 'body_template': 'Asset <SERIAL> became overdue on [DUE_IN_DATE]', 'every': 1, 'offset': None},
    {'notification_id': 4, 'name': '', 'title_template': '', 'body_template': '', 'every': 0, 'offset': None}
]

TEST_ROLES = [
    {'notification_id': 1, 'role': ADMIN_ROLE},
    {'notification_id': 2, 'role': ADMIN_ROLE}, {'notification_id': 2, 'role': BOOK_ROLE},
    {'notification_id': 3, 'role': ADMIN_ROLE}
]

TEST_TRIGGERS = [
    {'notification_id': 1, 'column': 'due_out_date', 'field': None, 'days': 0},
    {'notification_id': 2, 'column': None, 'field': 'calibration_due', 'days': -2},
    {'notification_id': 3, 'column': 'due_in_date', 'field': None, 'days': 0}
]

TEST_FILTERS = [
    {'trigger_id': 1, 'column': 'out_date', 'field': None, 'operator': '==', 'value': 'null'},
    {'trigger_id': 3, 'column': 'out_date', 'field': None, 'operator': '!=', 'value': 'null'},
    {'trigger_id': 3, 'column': 'in_date', 'field': None, 'operator': '==', 'value': 'null'}
]

notifications.log = get_logger(logging.DEBUG)

class AssetIndex(object):
    def __init__(self, assets):
        self.assets = {}
        self.q_re = re.compile(r"([^:]+):\[\* TO ([^Z]+Z)([+-][^D]+)DAYS\]")
        for asset in assets:
            self.assets[asset['id']] = asset

    def search(self, params):
        # currently, the only query is like q=calibration_date:[* TO <DATE>+<N>DAYS] where <DATE> could be '2017-02-10T00:00:00Z' for example
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
        sql.cursor.executemany("INSERT INTO user VALUES (:user_id, :role, :username, :email, NULL, NULL, NULL)", TEST_USERS)
        enum_id = sql.insert("INSERT INTO enum VALUES (NULL, :field)", field='user')
        sql.cursor.executemany("INSERT INTO enum_entry VALUES (NULL, :enum_id, :value, :value, :label)", [{'enum_id': enum_id, 'value': x['user_id'], 'label': x['label']} for x in TEST_USERS])
        sql.cursor.executemany("INSERT INTO booking VALUES (:booking_id, :asset_id, :user_id, :booked_date, :due_out_date, :due_in_date, :out_date, :in_date, :project)", TEST_BOOKINGS)
        sql.cursor.executemany("INSERT INTO notification VALUES (:notification_id, :name, :title_template, :body_template, :every, :offset, NULL)", TEST_NOTIFICATIONS)
        sql.cursor.executemany("INSERT INTO notification_role_pivot VALUES (NULL, :notification_id, :role)", TEST_ROLES)
        sql.cursor.executemany("INSERT INTO trigger VALUES (NULL, :notification_id, :column, :field, :days)", TEST_TRIGGERS)
        sql.cursor.executemany("INSERT INTO trigger_filter VALUES (NULL, :trigger_id, :column, :field, :operator, :value)", TEST_FILTERS)
    return db

@pytest.fixture()
def index():
    return AssetIndex(TEST_ASSETS)

def test_not_triggered(db, index):
    """ Check notifications don't trigger when trigger time not passed.
    """
    for now, count in [('2010-12-01T00:00:00Z', 0), ('2017-02-12T17:22:01Z', 1), ('2017-02-16T00:01:25Z', 2), ('2017-02-17T00:01:25Z', 1)]:
        mails = list(notifications.run_notifications(now, db, index))
        assert len(mails) == count

def test_notifications(db, index):
    """ Check triggered notifications generate mail, but not the second time we run them shortly after. Re-run a third time
        after checking out an asset.
    """
    for now, count in [('2017-02-23T10:21:43Z', 2), ('2017-02-23T10:21:52Z', 0), ('2017-02-26T00:00:00Z', 1)]:
        mails = list(notifications.run_notifications(now, db, index))
        assert len(mails) == count
        if count == 2: # first run
            assert mails[0].to == (TEST_USERS[0]['label'], TEST_USERS[0]['email'])
            assert mails[0].title == 'Asset {0}'.format(TEST_ASSETS[0]['serial'])
            assert mails[0].body == 'Asset {0} due out on {1}!'.format(TEST_ASSETS[0]['serial'], TEST_BOOKINGS[0]['due_out_date'])
            assert mails[0].cc == [(TEST_USERS[1]['label'], TEST_USERS[1]['email'])]
            assert mails[1].to == None
            assert mails[1].title == '{0} {1}'.format(TEST_ASSETS[1]['manufacturer'], TEST_ASSETS[1]['model'])
            assert mails[1].body == 'Asset {0} was due for calibration on {1}'.format(TEST_ASSETS[1]['serial'], TEST_ASSETS[1]['calibration_due'])
            assert mails[1].cc == [(TEST_USERS[0]['label'], TEST_USERS[0]['email']), (TEST_USERS[1]['label'], TEST_USERS[1]['email'])]
        elif count == 0: # second run: no mails to verify, but check the asset out
            with db.cursor() as sql:
                sql.update("UPDATE booking SET out_date='2017-02-25' WHERE booking_id=0")
        elif count == 1: # third run
            assert mails[0].to == (TEST_USERS[0]['label'], TEST_USERS[0]['email'])
            assert mails[0].title == TEST_ASSETS[0]['serial']
            assert mails[0].body == 'Asset {0} became overdue on {1}'.format(TEST_ASSETS[0]['serial'], TEST_BOOKINGS[0]['due_in_date'])
            assert mails[0].cc == [(TEST_USERS[1]['label'], TEST_USERS[1]['email'])]

def test_check_out(db, index):
    """ Test that the 'due out' notification isn't sent if the asset has been taken out.
    """
    mails = list(notifications.run_notifications('2017-02-16T00:00:00Z', db, index))
    assert len(mails) == 2 # due out and calibration due notifications
    db.cursor().delete("DELETE FROM notification_sent") # clear sent notifications (reset)
    db.cursor().update("UPDATE booking SET out_date='2017-02-15' WHERE booking_id=1")
    mails = list(notifications.run_notifications('2017-02-16T00:00:00Z', db, index))
    assert len(mails) == 0

def test_overdue(db, index):
    """ Test that the 'overdue' notification isn't sent if the asset has been returned.
        Also tests that the 'overdue' notification isn't sent if the asset isn't actually out (but is when it is).
    """
    mails = list(notifications.run_notifications('2017-02-26T00:00:00Z', db, index))
    assert len(mails) == 2 # due out and calibration due notifications
    db.cursor().delete("DELETE FROM notification_sent") # clear sent notifications (reset)
    db.cursor().update("UPDATE booking SET out_date='2017-02-15', in_date='2017-02-25' WHERE booking_id=1")
    mails = list(notifications.run_notifications('2017-02-26T00:00:00Z', db, index))
    assert len(mails) == 0

