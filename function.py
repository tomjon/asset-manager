import re
import datetime

UNITS = ['hz', 'khz', 'mhz', 'ghz']
FLOAT_EXPR = r'\d*\.?\d+'
FREQ_RE = re.compile(r'^(.*?)({0})\s*({1})?-({0})\s*({1})(.*)$'.format(FLOAT_EXPR, '|'.join(UNITS)), re.IGNORECASE)

class FunctionError(Exception):
    def __init__(self, message):
        self.message = message

def map_date(name, value, doc, enums):
    """ All we need is to add the final Z to get a SOLR date formatted string.
    """
    return ['{0}Z'.format(value)]

def map_date2(name, value, doc, enums):
    """ Convert from DD/MM/YYYY to SOLR date formatted string.
    """
    if value.lower() in ['not cal', 'none', '?', '??']:
        return None
    dt = datetime.datetime.strptime(value, '%d/%m/%Y')
    return ['{0}Z'.format(dt.isoformat())]

def map_enum(name, value, doc, enums):
    """ We want to store this field as an integer, adding the string value to an
        enumeration for the field that is stored in JSON format (as a list).
    """
    if name not in enums:
        enums[name] = [value]
    elif value not in enums[name]:
        enums[name].append(value)
    return [enums[name].index(value)]

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

def map_non_zero(name, value, doc, enums):
    try:
        value = float(value or 0)
        return [value] if value != 0 else None
    except ValueError:
        raise FunctionError("Could not convert to float: {0}".format(value))

def map_freq(name, value, doc, enums):
    value = (value or '').lower().replace('mhz', '')
    try:
        value = float(value)
        return [value] if value != 0 else None
    except ValueError:
        raise FunctionError("Could not convert to float: {0}".format(value))    

def map_strip_tags(name, value, doc, enums):
    return [re.sub('<.+?>', '', value)]

def map_validate_cal_dates(name, value, doc, enums):
    if 'calibration_date' in doc and 'calibration_due' in doc:
        if doc['calibration_date'][0] > doc['calibration_due'][0]:
            del doc['calibration_date']
    if 'calibration_date' in doc and doc['calibration_date'][0].startswith('9999'):
        del doc['calibration_date']
    return None    

def _append_note(doc, note):
    if 'notes' not in doc:
        doc['notes'] = []
    doc['notes'].append(note)

def map_parse_freqs(name, value, doc, enums):
    """ Parse start/stop frequencies and check they agree with any already defined.
    """
    if value == 'n/a':
        if 'start_freq' in doc or 'stop_freq' in doc:
            raise FunctionError("n/a for freq range but start/stop specified")
	return None
    r_start, r_stop, comment = _parse_freq_range(value)
    if r_start is None or len(comment) > 0:
        _append_note(doc, u'Frequency range: {0}'.format(value))
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
            # we trust the frequency range over start/stop
            _append_note(doc, u'Frequency range: {0} (start {1} stop {2})'.format(value, start, stop))
            return None
    except ValueError:
        raise FunctionError("Could not parse start or stop freq")
    return None
