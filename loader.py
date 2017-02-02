#!/usr/bin/python

""" Script for loading Asset data from an XML dump.
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

def utf8_encoder(unicode_csv_data):
    for line in unicode_csv_data:
        yield line.encode('utf-8')

def process_row(row, field_map, enums, core):
    """ Process a row and POST to SOLR.
    """
    doc = {}
    for field in field_map.iter_fields():
        # there are no multiple values
        value = unicode(row[field] if field in row else '', 'utf-8')
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

    sql.execute("SELECT enum_id FROM enum WHERE field != 'role' AND field != 'user' AND field != 'owner' AND field != 'project'")
    enum_ids = [str(x[0]) for x in sql.fetchall()]
    sql.execute("DELETE FROM enum_entry WHERE enum_id IN ({0})".format(','.join(enum_ids))) 
    sql.execute("DELETE FROM enum WHERE enum_id IN ({0})".format(','.join(enum_ids)))

    enums = {}
    count = 0
    try:
        with codecs.open(sys.argv[2], encoding='utf-8') as f:
            f.seek(2)
            reader = csv.DictReader(utf8_encoder(f))
            for row in reader:
                process_row(row, field_map, enums, sys.argv[4])
                count += 1
    except function.FunctionError as e:
        print >>sys.stderr, e.message, row
        sys.exit(1)
    except KeyboardInterrupt:
        print >>sys.stderr, "Processing interrupted after", count, "documents"

    # store enumerations in SQL db
    for name, values in enums.iteritems():
        sql.execute("INSERT INTO enum VALUES (NULL, :name)", {"name": name})
        enum = [{'enum_id': sql.lastrowid, 'label': v, 'value': i, 'order': i} for i, v in zip(xrange(len(values)), values)]
        sql.executemany("INSERT INTO enum_entry VALUES (NULL, :enum_id, :order, :value, :label)", enum)

    r = requests.post(SOLR_URL.format(sys.argv[4]), headers=SOLR_HEADERS, data='<commit/>')
    assert r.status_code == 200

    sql_conn.commit()
    sql_conn.close()

