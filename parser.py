""" SAX based parser for XML files.
"""
import xml.sax
import re

ENTITY_RE = re.compile(r'(_[^_]+_)')

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
    """ XML object representation. The fields attribute is a list of
        Node objects.
    """
    def __init__(self, name, parent):
        self.name = name
        self.parent = parent
        self.data = []
        self.fields = []

    def value(self):
        return ''.join(self.data)

    def as_dict(self):
        d = {}
        for node in self.fields:
            name = _unentitise(node.name)
            if name not in d:
                d[name] = []
            d[name].append(node)
        return d

class Handler(xml.sax.ContentHandler, xml.sax.ErrorHandler):
    """ SAX XML handler. Whitespace is stripped and content characters
        concatenated. Attributes are ignored.
    """
    def __init__(self, emit, args):
        self.emit = emit
        self.args = args
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
            self.node.fields.append(node)
        self.node = node

    def endElement(self, name):
        if self.node is not None:
            assert self.node.name == name
            if self.node.parent is None:
                self.emit(self.node, *self.args)
                self.count += 1                     
            self.node = self.node.parent
            return
        # this better be the root element then
        assert self.root == name

    def characters(self, content):
        if self.node is not None:
            self.node.data.append(content.strip())

def parse_xml(f, emit, *args):
    handler = Handler(emit, args)
    xml.sax.parse(f, handler)
    return handler.count

