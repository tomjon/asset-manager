#!/usr/bin/python -S

""" SAX based parser for XML files and output CSV.
"""
import sys
sys.setdefaultencoding("utf-8")
import site

import xml.sax
import re
import base64
import os
from field_map import FieldMap

ENTITY_RE = re.compile(r'(_[^_]+_)')
FILE_DATA = 'FileData'
FILE_NAME = 'FileName'
ID = 'ID'
ATTACHMENTS = 'Attachments'

def _unentitise(name):
    """ If x is of the form _X_ then parse X and return the unencoded value.
    """
    def _undo(x):
        if len(x) > 0 and x[0] == '_' and x[-1] == '_':
            v = x[1:-1]
            if v[0] == 'x':
                # we have a hex representation of a character
                return chr(int(v[1:], 16))
            raise Exception("Unknown entity: {0}".format(x))
        return x
    return ''.join(_undo(x) for x in ENTITY_RE.split(name))

class Node(object):
    """ XML object representation. The nodes attribute is a list of
        Node objects.
    """
    def __init__(self, name, parent):
        self.id_node = None
        self.name = name
        self.parent = parent
        self.data = []
        self.nodes = []

    def append(self, node):
        # append a child node
        self.nodes.append(node)
        if node.name == ID:
            self.id_node = node

    def value(self):
        return u''.join(self.data)

    def as_dict(self):
        d = {}
        for node in self.nodes:
            name = _unentitise(node.name)
            if name not in d:
                d[name] = []
            v = node.value().strip()
            if len(v) > 0:
                d[name].append(v)
        return d

    def save_attachments(self, path):
        for node in self.nodes:
            if node.name != ATTACHMENTS:
                continue
            data, name = None, None
            for subnode in node.nodes:
                if subnode.name == FILE_DATA:
                    data = base64.b64decode(subnode.value())
                elif subnode.name == FILE_NAME:
                    name = subnode.value()
            asset_id = self.id_node.value()
            assert data is not None and name is not None
            print >>sys.stderr, "Saving attachment", asset_id, name
            asset_path = os.path.join(path, asset_id)
            if not os.path.exists(asset_path):
                os.makedirs(asset_path)
            with open(os.path.join(asset_path, name), 'w') as f:
                f.write(buffer(data[20:])) # skip 20 bytes of metadata added by Access

class Handler(xml.sax.ContentHandler, xml.sax.ErrorHandler):
    """ SAX XML handler. Whitespace is stripped and content characters
        concatenated. Attributes are ignored.
    """
    def __init__(self, emit):
        self.emit = emit
        self.count = 0
        self.root = None
        self.node = None

    def startElement(self, name, attrs):
        if self.root is None:
            # we have encountered the root element
            self.root = name
            return
        node = Node(name, self.node)
        if self.node is not None:
            self.node.append(node)
        self.node = node

    def endElement(self, name):
        if self.node is not None:
            assert self.node.name == name
            if self.node.parent is None:
                self.emit(self.node)
                self.count += 1                     
            self.node = self.node.parent
            return
        # this better be the root element then
        assert self.root == name

    def characters(self, content):
        if self.node is not None:
            self.node.data.append(unicode(content.strip()))


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print >>sys.stderr, "Usage: {0} <map file> <xml file> <files path>".format(sys.argv[0])
        sys.exit(1)

    with open(sys.argv[1]) as f:
        fields = list(FieldMap(f).iter_fields(True))

    print '#', ','.join(fields)

    def emit(node):
        row = []
        values = node.as_dict()
        for field in fields:
            v = values.get(field, [])
            if len(v) > 1:
                print >>sys.stderr, "Can not cope with multiple values", field, v
                sys.exit(1)
            v = ''.join(v)
            row.append('"{0}"'.format(v.replace('"', '""')) if len(v) > 0 else '')
        print ','.join(row)
        node.save_attachments(sys.argv[3])

    try:
        with open(sys.argv[2]) as f:
            handler = Handler(emit)
            xml.sax.parse(f, handler)
        print >>sys.stderr, handler.count, "documents processed"
    except KeyboardInterrupt:
        print >>sys.stderr, "Processing interrupted"


