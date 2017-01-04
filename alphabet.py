#!/usr/bin/python
import json
import sys

for filename in sys.argv[1:]:
    with open(filename) as f:
        enum = json.loads(f.read())

    enum.sort(key=lambda x: x['label'])

    n = 0
    for value in enum:
        value['order'] = n
        n += 1

    with open(filename, 'w') as f:
        f.write(json.dumps(enum))

