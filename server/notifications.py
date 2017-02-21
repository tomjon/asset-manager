#!/usr/bin/python
# -*- coding: utf-8 -*-

""" Script for sending email notifications. Should be run periodically, once per day.
"""

import sys
import time
import re
from sql import SqlDatabase, NoResult
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
    def __init__(self, notification_id, trigger_column, trigger_field, trigger_days, title_template, body_template, roles, **_):
        self.id = notification_id
        self.trigger_column = trigger_column # trigger can have a column OR a field - column is a booking table column,
        self.trigger_field = trigger_field # field is a SOLR asset field
        self.trigger_days = '{0}{1}'.format('+' if trigger_days >= 0 else '', str(trigger_days)) # number of days away from now to trigger (trigger delay)
        self.title_template = title_template # title_template can refer to booking or user table column values like [column] and asset field values like <field>
        self.body_template = body_template # as title_template
        self.roles = roles # the roles associated with this notification (all users with any of these roles are cc'd in the mail, if triggered)

    def _last_sent(self, sql, asset_id, now, trigger_date):
        values = {'notification_id': self.id, 'asset_id': asset_id, 'now': now}
        try:
            sent, trigger = sql.selectOne("SELECT max(sent), CASE WHEN sent >= date('{0}', '{1} DAYS') THEN 1 ELSE 0 END FROM notification_sent WHERE notification_id=:notification_id AND asset_id=:asset_id".format(trigger_date, self.trigger_days), values)
            if trigger == 1:
                return False
        except NoResult:
            pass
        sql.insert("INSERT INTO notification_sent VALUES (NULL, :notification_id, :asset_id, :now)", values)
        return True

    def _mail(self, sql, values, asset):
        title = _eval_template(self.title_template, values, asset)
        body = _eval_template(self.body_template, values, asset)
        mail = Email((values['label'], values['email']) if values is not None else None, title, body)
        for user in sql.selectAllDict("SELECT label, email FROM user, enum, enum_entry WHERE role IN ({0}) AND field=:field AND enum.enum_id=enum_entry.enum_id AND value=user.user_id".format(','.join([str(role_id) for role_id in self.roles])), field='user'):
            mail.add_cc((user['label'], user['email']))
        return mail

    def run(self, now, sql, index):
        if self.trigger_column is not None:
            for values in sql.selectAllDict("SELECT * FROM booking, user, enum, enum_entry WHERE date(:now) >= date(booking.{0}, '{1} DAYS') AND booking.user_id=user.user_id AND enum.field=:user_field AND enum.enum_id=enum_entry.enum_id AND enum_entry.value=user.user_id".format(self.trigger_column, self.trigger_days), now=now, user_field='user'):
                if self._last_sent(sql, values['asset_id'], now, values[self.trigger_column]):
                    yield self._mail(sql, values, index.get(values['asset_id']))
        elif self.trigger_field is not None:
            for asset in index.search({'q': '{0}:[* TO {1}{2}DAYS]'.format(self.trigger_field, now.upper(), self.trigger_days)})['response']['docs']:
                if self._last_sent(sql, asset['id'], now, asset[self.trigger_field]):
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
