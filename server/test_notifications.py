""" Unit tests for the notifications module.
"""
import pytest
from sql import SqlDatabase, NoResult
from notifications import run_notifications
from user_app import ADMIN_ROLE, BOOK_ROLE, VIEW_ROLE

BOOKER = 'booker'
BOOKER_NAME = 'Charlie Booker'
BOOKER_EMAIL = 'booker@ofcom.org.uk'
SERIAL = 'abcde12345'
ADMIN_NAME = 'Pointy Hair'
ADMIN_EMAIL = 'pointy@ofcom.org.uk'

TEST_SQL = """
    INSERT INTO enum VALUES (1000, 'user');
    INSERT INTO enum_entry VALUES (NULL, 1000, 1, 1, '{1}');
    INSERT INTO user VALUES (1, {3}, '{0}', '{2}', NULL, NULL);
    INSERT INTO booking VALUES (NULL, 1, 1, '2017-02-10', '2017-02-15', '2017-02-25', NULL, NULL, 1);
    INSERT INTO notification VALUES (NULL, 'due_out_date', NULL, 5, 'Asset <SERIAL>', 'Asset <SERIAL> due out on [DUE_OUT_DATE]', NULL);
""".format(BOOKER, BOOKER_NAME, BOOKER_EMAIL, BOOK_ROLE)

TEST_ASSETS = [
    {'id': 1, 'serial': SERIAL}
]

class AssetIndex(object):
    def __init__(self, assets):
        self.assets = {}
        for asset in assets:
            self.assets[asset['id']] = asset

    def search(self, params):
        return {}

    def get(self, asset_id):
        return self.assets.get(asset_id, None)

@pytest.fixture()
def db():
    db = SqlDatabase(':memory:')
    with db.cursor() as sql:
        sql.executePath('../sql/create.sql')
        sql.executeScript(TEST_SQL)
    return db

@pytest.fixture()
def index():
    return AssetIndex(TEST_ASSETS)

def test_due_out(db, index):
    """ Check 'due out' booking generates a notification.
    """
    mails = list(run_notifications('2017-02-16 10:21:43', db, index))
    assert len(mails) == 1
    assert mails[0].to == (BOOKER_NAME, BOOKER_EMAIL)
    assert mails[0].title == 'Asset {0}'.format(SERIAL)
    assert mails[0].body == 'Asset {0} due out on {1}'.format(SERIAL, '2017-02-15')
    assert mails[0].cc == [(ADMIN_NAME, ADMIN_EMAIL)]
