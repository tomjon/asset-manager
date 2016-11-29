""" Field mapping module.
"""
import function

class FieldMap(object):
    def __init__(self, f):
        self._map = {}
        for line in f:
            line = line.strip()
            if len(line) == 0 or line[0] == '#':
                continue
            bits = line.split('\t')
            while '' in bits:
                bits.remove('')
            in_name, out_name = bits[0], bits[1] if len(bits) > 1 else None
            self._map[in_name] = (out_name, bits[2] if len(bits) > 2 else None)

    def map(self, field, nodes, doc):
        name, fn_name = self._map[field]
        if name is None:
            return None, None
	if fn_name is not None:
            try:
                fn = getattr(function, 'map_{0}'.format(fn_name))
                values = fn(nodes, doc)
            except AttributeError:
                raise Exception("No mapping function defined: {0}".format(fn_name))
        else:
            values = [node.value() for node in nodes]
        return name, values

    def iter_fields(self):
        for field in self._map:
            yield field

