""" Field mapping module.
"""
import sys
import function

class FieldMap(object):
    def __init__(self, f):
        self._fields = []
        self._map = {}
        for line in f:
            line = line.strip()
            if len(line) == 0 or line[0] == '#':
                continue
            bits = line.split('\t')
            while '' in bits:
                bits.remove('')
            in_name, out_name = bits[0], bits[1] if len(bits) > 1 else None
            self._fields.append(in_name)
            self._map[in_name] = (out_name, bits[2] if len(bits) > 2 else None)

    def map(self, field, value, doc, enums):
        name, fn_name = self._map[field]
        value = value.strip()
        if field != '--' and (name is None or value.lower() in ['?', '', 'n/a', 'na']):
            return name, None
        if fn_name is not None:
            fn = getattr(function, 'map_{0}'.format(fn_name), None)
            if fn is None:
                raise Exception("No mapping function defined: {0}".format(fn_name))
            values = fn(name, value, doc, enums)
        else:
            values = [value]
        return name, values if name != '--' else None

    def iter_fields(self, ignore=False):
        for field in self._fields:
            if ignore and field == '--':
                continue
            if not ignore or self._map[field][0] is not None:
                yield field
