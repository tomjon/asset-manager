#!/usr/bin/python
import csv
import sys
import json

enum = []

with open(sys.argv[1]) as f:
    for row in csv.DictReader(f):
        enum.append({"order": len(enum), "value": row['ID'], "label": "{0} {1}".format(row['First Name'], row['Last Name'])})

print json.dumps(enum)

