""" Field mapping module.
"""
import sys
import function

class FieldMap(object):
    def __init__(self, f):
        self._fields = []
        self._map = {}
        self._enum_fields = []
        for line in f:
            line = line.strip()
            if len(line) == 0 or line[0] == '#':
                continue
            bits = line.split('\t')
            while '' in bits:
                bits.remove('')
            while len(bits) < 4:
                bits.append(None)
            in_name, out_name, fn_name, fn_args = bits
            self._fields.append(in_name)
            self._map[in_name] = (out_name, fn_name, fn_args)
            if fn_name == 'enum':
                self._enum_fields.append(out_name)

    def map(self, field, value, doc, enums):
        name, fn_name, default_value = self._map[field]
        value = value.strip()
        if default_value is not None and value.strip() == '':
            value = default_value
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
