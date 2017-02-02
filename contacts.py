#!/usr/bin/python
import csv
import sys
import json
from config import DATABASE
from sql import SqlDatabase, NoResult

if len(sys.argv) != 2:
    print >>sys.stderr, "Usage: {0} <contacts CSV>".format(sys.argv[0])
    sys.exit(1)

db = SqlDatabase(DATABASE)

with open(sys.argv[1]) as f:
    with db.cursor() as sql:
        try:
            enum_id = sql.selectSingle("SELECT enum_id FROM enum WHERE field=:field", field='owner')
        except NoResult:
            enum_id = sql.insert("INSERT INTO enum VALUES (NULL, :field)", field='owner')
        sql.delete("DELETE FROM enum_entry WHERE enum_id=:enum_id", enum_id=enum_id)

        for row in csv.DictReader(f):
            contact_id = int(row['ID'])
            data = {}
            for k, v in row.iteritems():
                if k in ('ID', 'Attachments'):
                    continue
                v = v.strip()
                if len(v) > 0:
                    data[k] = v
            label = "{0} {1}".format(data.get('First Name', ''), data.get('Last Name', '')).strip() or data.get('E-mail Address', '<anonymous>')
            sql.insert("INSERT INTO enum_entry VALUES (NULL, :enum_id, :order, :value, :label)", enum_id=enum_id, order=contact_id, value=contact_id, label=label)

