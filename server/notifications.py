#!/usr/bin/python
# -*- coding: utf-8 -*-

""" Script for sending email notifications. Should be run periodically.
"""

import sys
import time
import re
from sql import SqlDatabase
from solr import AssetIndex
from config import DATABASE, SOLR_COLLECTION


class Email(object):
    """ Representation of an email.
    """
    def __init__(self, to, title, body):
        self.to = to # expects (name, email)
        self.cc = []
        self.title = title
        self.body = body

    def add_cc(self, cc):
        self.cc.append(cc) # expects (name, email)

    def send(self):
        pass


BRACKETS_RE = re.compile(r'\[(.+?)\]|<(.+?)>')

def _eval_template(template, values, asset):
    result = []
    pos = 0
    for match in BRACKETS_RE.finditer(template):
        result.append(template[pos:match.start()])
        for index, brackets, source in [(0, '[]', values), (1, '<>', asset)]:
            if match.groups()[index] is not None:
                key = match.groups()[index].lower()
                if source is not None:
                    value = source.get(key, '{0}BAD KEY: {1}{2}'.format(brackets[0], key, brackets[1]))
                else:
                    value = '{0}NOT AVAILABLE{1}'.format(brackets[0], brackets[1])
                result.append(value)
        pos = match.end()
    result.append(template[pos:])
    return ''.join(result)


class Notification(object):
    """ Class representing a notification specification.
    """
    def __init__(self, notification_id, trigger_column, trigger_field, trigger_time, title_template, body_template, roles, **_):
        self.id = notification_id
        self.trigger_column = trigger_column # trigger can have a column OR a field - column is a booking table column,
        self.trigger_field = trigger_field # field is a SOLR asset field
        self.trigger_time = trigger_time # amount of time away from now to trigger (trigger delay)
        self.title_template = title_template # title_template can refer to booking or user table column values like [column] and asset field values like <field>
        self.body_template = body_template # as title_template
        self.roles = roles # the roles associated with this notification (all users with any of these roles are cc'd in the mail, if triggered)

    def _mail(self, sql, values, asset):
        title = _eval_template(self.title_template, values, asset)
        body = _eval_template(self.body_template, values, asset)
        mail = Email((values['label'], values['email']) if values is not None else None, title, body)
        for user in sql.selectAllDict("SELECT label, email FROM user, enum, enum_entry WHERE role IN ({0}) AND field=:field AND enum.enum_id=enum_entry.enum_id AND value=user.user_id".format(','.join([str(role_id) for role_id in self.roles])), field='user'):
            mail.add_cc((user['label'], user['email']))
        return mail

    def run(self, now, sql, index):
        sql.update("UPDATE notification SET last_run=:now WHERE notification_id=:notification_id", notification_id=self.id, now=now)
        if self.trigger_column is not None:
            for values in sql.selectAllDict("SELECT booking.*, user.*, enum_entry.* FROM booking, user, enum, enum_entry WHERE datetime(:now) >= datetime({0}, '+{1} SECONDS') AND booking.user_id=user.user_id AND enum.field=:user_field AND enum.enum_id=enum_entry.enum_id AND enum_entry.value=user.user_id".format(self.trigger_column, self.trigger_time), now=now, user_field='user'):
                yield self._mail(sql, values, index.get(values['asset_id']))
        if self.trigger_field is not None:
            for asset in index.search({'q': '{0}:[* TO {1}+{2}SECONDS]'.format(self.trigger_field, now.upper(), self.trigger_time)})['response']['docs']:
                yield self._mail(sql, None, asset)


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
