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
        sql.delete("DELETE FROM contact")
        try:
            enum_id = sql.selectSingle("SELECT enum_id FROM enum WHERE field=:field", field='owner')
        except NoResult:
            enum_id = sql.insert("INSERT INTO enum VALUES (NULL, :field)", field='owner')
        sql.delete("DELETE FROM enum_entry WHERE enum_id=:enum_id", enum_id=enum_id)

        for row in csv.DictReader(f):
            contact_id = row['ID']
            data = {}
            for k, v in row.iteritems():
                if k in ('ID', 'Attachments'):
                    continue
                v = v.strip()
                if len(v) > 0:
                    data[k] = v
            sql.insert("INSERT INTO contact VALUES (:contact_id, :json)", contact_id=contact_id, json=json.dumps(data))

            label = "{0} {1}".format(data.get('First Name', ''), data.get('Last Name', '')).strip() or data.get('E-mail Address', '<anonymous>')
            sql.insert("INSERT INTO enum_entry VALUES (NULL, :enum_id, :n, :n, :label)", enum_id=enum_id, n=contact_id, label=label)

