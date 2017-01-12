#!/usr/bin/python
import csv
import sys
import json
from sql import SqlDatabase

DATABASE = 'sql/assets.db'

if len(sys.argv) != 2:
    print >>sys.stderr, "Usage: {0} <contacts CSV>".format(sys.argv[0])
    sys.exit(1)

db = SqlDatabase(DATABASE)

with open(sys.argv[1]) as f:
    with db.cursor() as sql:
        for row in csv.DictReader(f):
            contact_id = row['ID']
            data = {}
            for k, v in row.iteritems():
                if k in ('ID', 'Attachments'):
                    continue
                v = v.strip()
                if len(v) > 0:
                    data[k] = v
            print >>sys.stderr, sql.insert("INSERT INTO contact VALUES (:contact_id, :json)", contact_id=contact_id, json=json.dumps(data))

