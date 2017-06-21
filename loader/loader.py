#!/usr/bin/python

""" Script for loading Asset data.
"""
import sys
import requests
import codecs
import json
import csv
import sqlite3
import re
import function
from field_map import FieldMap

SOLR_URL = 'http://localhost:8983/solr/{0}/update'
SOLR_HEADERS = {'content-type': 'application/xml'}

ENCODING = 'Windows-1252' #'utf-8'

#FIXME: need to create an enumeration for each 'enum' field (as marked in the field map) even if it remains empty

def file_encoder(unicode_csv_data):
    for line in unicode_csv_data:
        yield line.encode(ENCODING)

def process_row(row, field_map, enums, core):
    """ Process a row and POST to SOLR.
    """
    doc = {}
    for field in field_map.iter_fields():
        # there are no multiple values
        value = unicode(row[field] if field in row else '', ENCODING)
        name, values = field_map.map(field, value, doc, enums)
        if name is not None and values is not None and len(values) > 0:
            doc[name] = values

    # formulate SOLR update XML
    xml = ['<doc>']
    for field, values in doc.iteritems():
        for value in values:
            xml.append(u'<field name="{0}"><![CDATA[{1}]]></field>'.format(unicode(field), unicode(value)))
    xml.append('</doc>')

    # POST to SOLR
    data = u'<add>{0}</add>'.format('\n'.join(xml))
    r = requests.post(SOLR_URL.format(core), headers=SOLR_HEADERS, data=data.encode("utf-8"))
    if r.status_code != 200:
        print >>sys.stderr, data
        print >>sys.stderr, r.text
        sys.exit(1)


if __name__ == '__main__':
    if len(sys.argv) != 5:
        print "Usage: {0} <map file> <CSV file> <SQL db> <SOLR core>".format(sys.argv[0])
        sys.exit(1)

    with open(sys.argv[1]) as f:
        field_map = FieldMap(f)

    sql_conn = sqlite3.connect(sys.argv[3])
    sql = sql_conn.cursor()

    # load up enums, preserving order
    enums = {}
    for field in field_map._enum_fields:
        enums[field] = []
    sql.execute("SELECT enum_id, field FROM enum")
    for enum_id, field in sql.fetchall():
        sql.execute("SELECT value, label FROM enum_entry WHERE enum_id=:enum_id ORDER BY `order`", {'enum_id': enum_id})
        for value, label in sql.fetchall():
            if field in enums: # ignore enums not in the field map (e.g. role)
                enums[field].append((value, label))

    # import from CSV rows
    count = 0
    try:
        with codecs.open(sys.argv[2], encoding=ENCODING) as f:
            f.seek(1)
            reader = csv.DictReader(file_encoder(f))
            for row in reader:
                process_row(row, field_map, enums, sys.argv[4])
                count += 1
    except function.FunctionError as e:
        print >>sys.stderr, e.message, row
        sys.exit(1)
    except KeyboardInterrupt:
        print >>sys.stderr, "Processing interrupted after", count, "documents"

    # store enumerations in SQL db
    for field, enum in enums.iteritems():
        sql.execute("SELECT enum_id FROM enum WHERE field=:field", {"field": field})
        row = sql.fetchone()
        if row is not None:
            enum_id = row[0]
        else:
            sql.execute("INSERT INTO enum VALUES (NULL, :field)", {"field": field})
            enum_id = sql.lastrowid
        order = 0
        for value, label in enum:
            entry = {'enum_id': enum_id, 'value': value, 'label': label}
            sql.execute("SELECT `order` FROM enum_entry WHERE enum_id=:enum_id AND value=:value", entry)
            row = sql.fetchone()
            if row is not None:
                order = max([row[0], order])
            else:
                order += 1
                entry['order'] = order
                sql.execute("INSERT INTO enum_entry VALUES (NULL, :enum_id, :order, :value, :label)", entry)

    # tidy up - commit SOLR, close SQL
    r = requests.post(SOLR_URL.format(sys.argv[4]), headers=SOLR_HEADERS, data='<commit/>')
    sql_conn.commit()
    sql_conn.close()
    assert r.status_code == 200

