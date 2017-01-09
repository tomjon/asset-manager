#!/usr/bin/python
import csv
import sys
import json

enum = []

with open(sys.argv[1]) as f:
    for row in csv.DictReader(f):
        label = "{0} {1}".format(row['First Name'], row['Last Name'])
        label = label.strip()
        if len(label) == 0:
            label = row['E-mail Address']
            label = label.strip()
        if len(label) > 0:
            enum.append({"order": len(enum), "value": row['ID'], "label": label})

print json.dumps(enum)

