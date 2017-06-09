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

#    sql.execute("SELECT enum_id FROM enum WHERE field != 'role' AND field != 'user' AND field != 'project'")
#    enum_ids = [str(x[0]) for x in sql.fetchall()]
#    sql.execute("DELETE FROM enum_entry WHERE enum_id IN ({0})".format(','.join(enum_ids))) 
#    sql.execute("DELETE FROM enum WHERE enum_id IN ({0})".format(','.join(enum_ids)))

#FIXME load up enums, we'll delete them all, then add them back later. Oh dear - don't delete until later! in case of error ;)

    enums = {}
    for field in field_map._enum_fields:
        enums[field] = []

    count = 0
    try:
        with codecs.open(sys.argv[2], encoding=ENCODING) as f:
            f.seek(1)
            reader = csv.DictReader(file_encoder(f))
            for row in reader:
		print row
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

