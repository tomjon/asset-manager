#!/usr/bin/python
# -*- coding: utf-8 -*-

""" Script for sending email notifications. Should be run periodically, once per day.
"""

import sys
import time
import datetime
import re
import subprocess
import logging
from sql import SqlDatabase, NoResult
from solr import AssetIndex
from config import DATABASE, SOLR_COLLECTION, MAIL_COMMAND, MAIL_FROM
from logger import get_logger

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

    def send(self, debug=False):
        if self.to is None:
            if len(self.cc) == 0:
                log.warn("No To: and no Cc:")
                return
            self.to = self.cc[0]
            self.cc = self.cc[1:]
        log.info("Sending mail To: %s", self.to)
        if debug:
            return
        args = [MAIL_COMMAND, '-s', self.title, '-a', 'From: {0} <{1}>'.format(*MAIL_FROM)]
        if len(self.cc) > 0:
            args += ['-c', ','.join(self.cc)]
        args += ['{0} <{1}>'.format(*self.to)]
        p = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = p.communicate(self.body)
        log.debug("%s\nStdout: %s\nStderr: %s", str(args), stdout, stderr)


BRACKETS_RE = re.compile(r'\[(.+?)\]|<(.+?)>')

def _get_enumeration_value(sql, key, value):
    try:
        return sql.selectSingle("SELECT label FROM enum, enum_entry WHERE field=:field AND enum.enum_id=enum_entry.enum_id AND value=:value", field=key, value=value)
    except NoResult:
        return "<bad key or no value>"

def _eval_template(sql, template, values, asset):
    result = []
    pos = 0
    for match in BRACKETS_RE.finditer(template):
        result.append(template[pos:match.start()])
        for index, brackets, source in [(0, '[]', values), (1, '<>', asset)]:
            if match.groups()[index] is not None:
                key = match.groups()[index].lower()
                enum = key[0] == ':'
                if enum:
                    key = key[1:]
                if source is not None:
                    value = source.get(key, '{0}BAD KEY: {1}{2}'.format(brackets[0], key, brackets[1]))
                else:
                    value = '{0}NOT AVAILABLE{1}'.format(brackets[0], brackets[1])
                if enum:
                    value = _get_enumeration_value(sql, key, value)
                result.append(value)
        pos = match.end()
    result.append(template[pos:])
    return ''.join(result)


class Filter(object):
    def __init__(self, column=None, field=None, operator=None, value=None, **_):
        self.column = column
        self.field = field
        self.operator = operator
        self.value = value # currently allowed values are 'null' and 'now'
        assert self.column is None or COLUMN_FIELD.match(self.column)
        assert self.field is None or COLUMN_FIELD.match(self.field)
        assert operator in OPERATORS

    def _apply(self, values, asset):
        test_value = values[self.column] if self.column is not None else asset[self.field]
        if self.value == 'now':
            value = datetime.datetime.now().isoformat()[:10]
        elif self.value == 'null':
            value = None
        else:
            raise Exception("Invalid value")
        return eval("test_value{0}value".format(self.operator))

    def __repr__(self):
        return "<Filter: column='{0}' field='{1}' operator='{2}' value='{3}'>".format(self.column, self.field, self.operator, self.value)

class Trigger(object):
    def __init__(self, filters, column=None, field=None, days=None, **_):
        self.column = column # trigger can have a column OR a field - column is a booking table column,
        self.field = field # field is a SOLR asset field
        self.days = '{0}{1}'.format('+' if days >= 0 else '', str(days))
        self.filters = filters
        assert self.column is None or COLUMN_FIELD.match(self.column)
        assert self.field is None or COLUMN_FIELD.match(self.field)

    def _filter(self, values, asset):
        """ Return whether the filters allow a trigger event.
        """
        log.debug("Testing trigger filters against asset %s", asset['id'])
        for filter in self.filters:
            if not filter._apply(values, asset):
                log.debug("No")
                return False
        log.debug("Yes")
        return True

class Notification(object):
    """ Class representing a notification specification.
    """
    def __init__(self, roles, triggers, notification_id=None, title_template=None, body_template=None, every=None, offset=None, run=None, **_):
        self.id = notification_id
        self.title_template = title_template # title_template can refer to booking or user table column values like [column] and asset field values like <field>
        self.body_template = body_template # as title_template
        self.roles = roles # the roles associated with this notification (all users with any of these roles are cc'd in the mail, if triggered)
        self.triggers = triggers
        self.every = every
        self.offset = int(offset) if offset is not None else None
        self.run = run

    def _mail(self, sql, values, asset):
        title = _eval_template(sql, self.title_template, values, asset)
        body = _eval_template(sql, self.body_template, values, asset)
        mail = Email((values['label'], values['email']) if values is not None else None, title, body)
        for user in sql.selectAllDict("SELECT label, email FROM user, enum, enum_entry WHERE role IN ({0}) AND field='user' AND enum.enum_id=enum_entry.enum_id AND value=user.user_id".format(','.join([str(role_id) for role_id in self.roles]))):
            mail.add_cc((user['label'], user['email']))
        return mail

    def check_run(self, now, sql):
        """ Return whether to run the notification based on when it was last run, the 'every' (every day, week, ..) and the offset.
        """
        if self.run is None:
            return True
        if self.every == 0: # every day, ignore offset
            every = 'start of day'
            offset = '0 day'
        elif self.every == 1: # every week - offset starts from Monday (sqlite starts from Sunday, hence 0/-6)
            every = 'weekday 0' # next Sunday, or same day if it is Sunday
            offset = '{0} day'.format(str(self.offset - 6))
        elif self.every == 2: # every month
            every = 'start of month'
            offset = '{0} day'.format(str(self.offset))
        elif self.every == 3: # every year
            every = 'start of year'
            offset = '{0} day'.format(str(self.offset))
        else:
            raise Exception("Bad value for 'every' for notification id {0}".format(self.id))
        return sql.selectSingle("SELECT :run < DATE(:now, :every, :offset)", run=self.run, now=now, every=every, offset=offset) == 1

    def _insert_sent(self, now, sql, asset_id):
        sql.insert("INSERT INTO notification_sent VALUES (NULL, :notification_id, :asset_id, DATE(:now))", notification_id=self.id, asset_id=asset_id, now=now)

    def run_now(self, now, sql, index):
        """ Triggers are ORed - if any fire, yield a mail.
        """
        log.debug("Running notification: %s", self.id)
        sql.insert("UPDATE notification SET run=DATE(:now) WHERE notification_id=:notification_id", notification_id=self.id, now=now)
        for trigger in self.triggers:
            if trigger.column is not None:
                for values in sql.selectAllDict("SELECT * FROM booking, user, enum, enum_entry WHERE DATE(:now) >= date(booking.{0}, '{1} DAYS') AND booking.user_id=user.user_id AND enum.field='user' AND enum.enum_id=enum_entry.enum_id AND enum_entry.value=user.user_id".format(trigger.column, trigger.days), now=now):
                    asset = index.get(values['asset_id'])
                    self._insert_sent(now, sql, values['asset_id'])
                    if trigger._filter(values, asset):
                        yield self._mail(sql, values, asset)
            elif trigger.field is not None:
                for asset in index.search({'q': '{0}:[* TO {1}{2}DAYS]'.format(trigger.field, now.upper(), trigger.days)})['response']['docs']:
                    self._insert_sent(now, sql, asset['id'])
                    if trigger._filter(None, asset):
                        yield self._mail(sql, None, asset)


def run_notifications(now, db, index):
    log.info("Running notifications")
    with db.cursor() as sql:
        for n_dict in sql.selectAllDict("SELECT * FROM notification"):
            roles = sql.selectAllSingle("SELECT role FROM notification_role_pivot WHERE notification_id=:notification_id", n_dict)
            triggers = []
            for t_dict in sql.selectAllDict("SELECT * FROM trigger WHERE notification_id=:notification_id", n_dict):
                f_dicts = sql.selectAllDict("SELECT * FROM trigger_filter WHERE trigger_id=:trigger_id", t_dict)
                filters = [Filter(**f) for f in f_dicts]
                triggers.append(Trigger(filters, **t_dict))
            notification = Notification(roles, triggers, **n_dict)
            if notification.check_run(now, sql):
                for mail in notification.run_now(now, sql, index):
                    yield mail


if __name__ == "__main__":
    if len(sys.argv) < 1:
        print >>sys.stderr, "Usage: {0} [debug]".format(sys.argv[0])
        sys.exit(1)

    debug = len(sys.argv) > 1 and sys.argv[1].lower() == 'debug'
    log = get_logger(logging.DEBUG if debug else logging.INFO)
    db = SqlDatabase(DATABASE)
    index = AssetIndex(SOLR_COLLECTION)
    for mail in run_notifications('now', db, index):
        mail.send(debug=debug)
