#!/usr/bin/python
# -*- coding: utf-8 -*-

""" Script for sending email notifications. Should be run periodically, once per day.
"""

import sys
import time
import re
import subprocess
from sql import SqlDatabase, NoResult
from solr import AssetIndex
from config import DATABASE, SOLR_COLLECTION, MAIL_COMMAND, MAIL_FROM

OPERATORS = ['==', '!=', '<', '>', '<=', '>='] # allowed filter operators
COLUMN_FIELD = re.compile(r'^[a-zA-Z_]+$') # allowed column/field names

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
        args = [MAIL_COMMAND, '-s', self.title, '-r', '{0} <{1}>'.format(MAIL_FROM)]
        if len(self.cc) > 0:
            args += ['-c', ','.join(self.cc)]
        args += ['{0} <{1}>'.format(self.to)]
        p = subprocess.Popen(args, stdin=subprocess.PIPE)
        p.communicate(self.body)


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


class Filter(object):
    def __init__(self, column, field, operator, value):
        self.column = column
        self.field = field
        self.operator = operator
        self.value = value
        assert self.column is None or COLUMN_FIELD.match(self.column)
        assert self.field is None or COLUMN_FIELD.match(self.field)
        assert operator in OPERATORS

    def _apply(self, values, asset):
        test_value = values[self.column] if self.column is not None else asset[self.field]
        return eval("'{0}'{1}'{2}'".format(test_value, self.operator, self.value))

    def __repr__(self):
        return "<Filter: column='{0}' field='{1}' operator='{2}' value='{3}'>".format(self.column, self.field, self.operator, self.value)


class Trigger(object):
    def __init__(self, column, field, days, filters):
        self.column = column # trigger can have a column OR a field - column is a booking table column,
        self.field = field # field is a SOLR asset field
        self.days = '{0}{1}'.format('+' if days >= 0 else '', str(days)) # number of days (as a string with sign) away from now to trigger (trigger delay)
        self.filters = filters
        assert self.column is None or COLUMN_FIELD.match(self.column)
        assert self.field is None or COLUMN_FIELD.match(self.field)

    def _filter(self, values, asset):
        """ Return whether the filters allow a trigger event.
        """
        for filter in self.filters:
            if not filter._apply(values, asset):
                return False
        return True

    def _last_sent(self, sql, notification_id, asset_id, now, trigger_date):
        values = {'notification_id': notification_id, 'asset_id': asset_id, 'now': now}
        try:
            sent, trigger = sql.selectOne("SELECT max(sent), CASE WHEN sent >= date('{0}', '{1} DAYS') THEN 1 ELSE 0 END FROM notification_sent WHERE notification_id=:notification_id AND asset_id=:asset_id".format(trigger_date, self.days), values)
            if trigger == 1:
                return False
        except NoResult:
            pass
        sql.insert("INSERT INTO notification_sent VALUES (NULL, :notification_id, :asset_id, :now)", values)
        return True

class Notification(object):
    """ Class representing a notification specification.
    """
    def __init__(self, notification_id, title_template, body_template, roles, triggers):
        self.id = notification_id
        self.title_template = title_template # title_template can refer to booking or user table column values like [column] and asset field values like <field>
        self.body_template = body_template # as title_template
        self.roles = roles # the roles associated with this notification (all users with any of these roles are cc'd in the mail, if triggered)
        self.triggers = triggers

    def _mail(self, sql, values, asset):
        title = _eval_template(self.title_template, values, asset)
        body = _eval_template(self.body_template, values, asset)
        mail = Email((values['label'], values['email']) if values is not None else None, title, body)
        for user in sql.selectAllDict("SELECT label, email FROM user, enum, enum_entry WHERE role IN ({0}) AND field='user' AND enum.enum_id=enum_entry.enum_id AND value=user.user_id".format(','.join([str(role_id) for role_id in self.roles]))):
            mail.add_cc((user['label'], user['email']))
        return mail

    def run(self, now, sql, index):
        """ Triggers are ORed - if any fire, yield a mail.
        """
        for trigger in self.triggers:
            if trigger.column is not None:
                for values in sql.selectAllDict("SELECT * FROM booking, user, enum, enum_entry WHERE date(:now) >= date(booking.{0}, '{1} DAYS') AND booking.user_id=user.user_id AND enum.field='user' AND enum.enum_id=enum_entry.enum_id AND enum_entry.value=user.user_id".format(trigger.column, trigger.days), now=now):
                    asset_id = values['asset_id']
                    asset = index.get(asset_id)
                    if trigger._filter(values, asset) and trigger._last_sent(sql, self.id, asset_id, now, values[trigger.column]):
                        yield self._mail(sql, values, asset)
            elif trigger.field is not None:
                for asset in index.search({'q': '{0}:[* TO {1}{2}DAYS]'.format(trigger.field, now.upper(), trigger.days)})['response']['docs']:
                    if trigger._filter(None, asset) and trigger._last_sent(sql, self.id, asset['id'], now, asset[trigger.field]):
                        yield self._mail(sql, None, asset)


def run_notifications(now, db, index):
    with db.cursor() as sql:
        for n_dict in sql.selectAllDict("SELECT * FROM notification"):
            roles = sql.selectAllSingle("SELECT role FROM notification_role_pivot WHERE notification_id=:notification_id", n_dict)
            triggers = []
            for t_dict in sql.selectAllDict("SELECT * FROM trigger WHERE notification_id=:notification_id", n_dict):
                f_dicts = sql.selectAllDict("SELECT * FROM trigger_filter WHERE trigger_id=:trigger_id", t_dict)
                filters = [Filter(f['column'], f['field'], f['operator'], f['value']) for f in f_dicts]
                triggers.append(Trigger(t_dict['column'], t_dict['field'], t_dict['days'], filters))
            notification = Notification(n_dict['notification_id'], n_dict['title_template'], n_dict['body_template'], roles, triggers)
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
