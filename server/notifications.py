#!/usr/bin/python
# -*- coding: utf-8 -*-

""" Script for sending email notifications. Should be run periodically.
"""

import sys
import time
from sql import SqlDatabase
from solr import AssetIndex
from config import DATABASE, SOLR_COLLECTION


class Email(object):
    """ Representation of an email.
    """
    def __init__(self, name, email, title, body):
        self.to = (name, email)
        self.cc = []
        self.title = title
        self.body = body

    def send(self):
        pass


def _eval_template(template, values, asset):
    
    return template


class Notification(object):
    """ Class representing a notification specification.
    """
    def __init__(self, notification_id, trigger_column, trigger_field, trigger_time, title_template, body_template, last_triggered, roles):
        self.id = notification_id
        self.trigger_column = trigger_column # trigger can have a column OR a field - column is a booking table column,
        self.trigger_field = trigger_field # field is a SOLR asset field
        self.trigger_time = trigger_time # amount of time away from now to trigger
        self.title_template = title_template # title_template can refer to booking or user table column values like [column] and asset field values like <field>
        self.body_template = body_template # as title_template
        self.last_triggered = last_triggered # time since the epoch in seconds when this notification was last triggered
        self.roles = roles # the roles associated with this notification (all users with this role are send a mail, if triggered)

    def run(self, now, sql, index):
        if self.trigger_column is not None:
            for values in sql.selectAllDict("SELECT booking.*, user.*, enum_entry.* FROM booking, user, enum, enum_entry WHERE date(:now) >= {0} + :time AND booking.user_id=user.user_id AND enum.field=:user_field AND enum.enum_id=enum_entry.enum_id AND enum_entry.value=user.user_id".format(self.trigger_column), now=now, time=self.trigger_time, user_field='user'):
                title = _eval_template(self.title_template, values, index.get(values['asset_id']))
                body = _eval_template(self.body_template, values, index.get(values['asset_id']))
                yield Email(values['label'], values['email'], title, body)


def run_notifications(now, db, index):
    with db.cursor() as sql:
        for n_dict in sql.selectAllDict("SELECT * FROM notification"):
            roles = sql.selectAllSingle("SELECT role FROM notification_role_pivot WHERE notification_id=:notification_id", n_dict)
            notification = Notification(roles=roles, **n_dict)
            for mail in notification.run(now, sql, index):
                yield mail


if __name__ == "__main__":
    if len(sys.argv) != 1:
        print >>sys.stderr, "Usage: {0}".format(sys.argv[0])
        sys.exit(1)

    db = SqlDatabase(DATABASE)
    index = AssetIndex(SOLR_COLLECTION)
    for mail in run_notifications('now', db, index):
        mail.send()
