import uuid
import sys
import base64
import re
from decimal import Decimal

FILE_DATA = 'FileData'
FILE_NAME = 'FileName'

UNITS = ['hz', 'khz', 'mhz', 'ghz']
FLOAT_EXPR = r'\d*\.?\d+'
FREQ_RE = re.compile(r'^(.*?)({0})\s*({1})?-({0})\s*({1})(.*)$'.format(FLOAT_EXPR, '|'.join(UNITS)), re.IGNORECASE)

class FunctionError(Exception):
    def __init__(self, message):
        self.message = message

def map_uuid(name, nodes, doc):
    """ Generate a unique id for the document.
    """
    return [str(uuid.uuid4())]

def map_date(name, nodes, doc):
    """ All we need is to add the final Z to get a SOLR date formatted string.
    """
    return ['{0}Z'.format(node.value()) for node in nodes]

def map_set(name, nodes, doc):
    """ Ensure the values in the list are unique.
    """
    return list(set([node.value() for node in nodes]))

def map_attachment(name, nodes, doc):
    for node in nodes:
        data, name = None, None
        for subfield in node.fields:
            if subfield.name == FILE_DATA:
                data = base64.b64decode(subfield.value())
            elif subfield.name == FILE_NAME:
                name = subfield.value()
        assert data is not None and name is not None
        doc.add_file(name, data[20:]) # skip 20 bytes of metadata added by Access
    return None

def map_enum(name, nodes, doc):
    """ We want to store this field as an integer, adding the string value to an
        enumeration for the field that is stored in JSON format (as a list).
    """
    def _get_int_value(v):
        if name not in doc.enums:
            doc.enums[name] = [v]
        elif v not in doc.enums[name]:
            doc.enums[name].append(v)
        return doc.enums[name].index(v)
    return [_get_int_value(node.value()) for node in nodes]

# parse a range like 10hz-15ghz into start/stop freqs in Hz
def _parse_freq_range(value):
    def fpow(n, u):
        e = 3 * UNITS.index(u.lower()) - 6
        return float('{0}E{1}'.format(n, e))
    m = FREQ_RE.search(value)
    if m is None:
        return None, None, None
    g = list(m.groups())
    # if units for start of range were omitted, use units for end of range
    if g[2] is None:
        g[2] = g[4]
    comment = '{0} {1}'.format(g[0].strip(), g[5].strip())
    return fpow(g[1], g[2]), fpow(g[3], g[4]), comment.strip()

def map_non_zero(name, nodes, doc):
    values = [float(node.value()) for node in nodes]
    while 0 in values:
        values.remove(0)
    return values

def map_parse_freqs(name, nodes, doc):
    """ Parse start/stop frequencies and check they agree with any already defined.
    """
    if len(nodes) == 0:
        return None
    value = nodes[0].value()
    if value == 'n/a':
        if 'start_freq' in doc or 'stop_freq' in doc:
            raise FunctionError("n/a for freq range but start/stop specified")
	return None
    r_start, r_stop, comment = _parse_freq_range(value)
    if r_start is None or len(comment) > 0:
        doc['dirty'] = [True]
        doc.append_list('notes', u'Frequency range: {0}'.format(value))
        if r_start is None:
            return None
    try:
        start = float(doc.get('start_freq', [0])[0])
        stop = float(doc.get('stop_freq', [0])[0])
        if r_start != 0:
            doc['start_freq'] = [str(r_start)]
        if r_stop != 0:
            doc['stop_freq'] = [str(r_stop)]
        if (start != 0 or stop != 0) and (start != r_start or stop != r_stop):
            # we trust the frequency range over start/stop but mark dirty
            doc['dirty'] = [True]
            doc.append_list('notes', u'Frequency range: {0} (start {1} stop {2})'.format(value, start, stop))
            return None
    except ValueError:
        raise FunctionError("Could not parse start or stop freq")
    return None
