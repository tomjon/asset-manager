#!/usr/bin/python

""" Script for loading Asset data from an XML dump.
"""
import sys
import requests
from parser import parse_xml
from field_map import FieldMap

SOLR_URL = 'http://localhost:8983/solr/{0}/update'
SOLR_HEADERS = {'content-type': 'application/xml'}

class Document(dict):
    def __init__(self, files_path):
        super(Document, self).__init__()
        self.files_path = files_path

    def append_list(self, name, value):
        self.extend_list(name, [value])

    def extend_list(self, name, values):
        if name not in self:
            self[name] = []
        self[name].extend(values)

def process_document(node, field_map, files_path, core):
    """ Process a document by extracting any attachments and POSTing to SOLR.
    """
    node_dict = node.as_dict()
    doc = Document(files_path)
    for field in field_map.iter_fields():
        if field not in node_dict:
            continue
        name, values = field_map.map(field, node_dict[field], doc)
        if name is not None and values is not None and len(values) > 0:
            doc.extend_list(name, values)
        node_dict.pop(field)
    if len(node_dict) > 0:
        print >>sys.stderr, "Document has unprocessed fields: {0}".format(','.join(node_dict))
        sys.exit(1)
    
    xml = ['<doc>']
    for field, values in doc.iteritems():
        for value in values:
            value = unicode(value).replace('&', '&amp;')
            xml.append(u'<field name="{0}"><![CDATA[{1}]]></field>'.format(field, value))
    xml.append('</doc>')

    # POST to SOLR
    data = u'<add>{0}</add>'.format('\n'.join(xml))
    r = requests.post(SOLR_URL.format(core), headers=SOLR_HEADERS, data=data.encode("utf-8"))
    if r.status_code != 200:
        print >>sys.stderr, data
        print >>sys.stderr, r.text
        sys.exit(1)

if len(sys.argv) != 5:
    print "Usage: {0} <map file> <xml file> <files path> <SOLR core>".format(sys.argv[0])
    sys.exit(1)

with open(sys.argv[1]) as f:
    field_map = FieldMap(f)

try:
    with open(sys.argv[2]) as f:
        print parse_xml(f, process_document, field_map, sys.argv[3], sys.argv[4]), "documents processed"
except KeyboardInterrupt:
    print >>sys.stderr, "Processing interrupted"

r = requests.post(SOLR_URL.format(sys.argv[4]), headers=SOLR_HEADERS, data='<commit/>')
assert r.status_code == 200

