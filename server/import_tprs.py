#!/usr/bin/python
import sys
from sql import SqlDatabase

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print >>sys.stderr, "Usage: {0} <asset DB> <tpr CSV file>"
        sys.exit(1)

    db = SqlDatabase(sys.argv[1])

    with open(sys.argv[2]) as f:
        lines = f.readlines()

    with db.cursor() as sql:
        enum_id = sql.selectSingle("SELECT enum_id FROM enum WHERE field=:field", field='project')
        order = sql.selectSingle("SELECT MAX(`order`) FROM enum_entry WHERE enum_id=:enum_id", enum_id=enum_id)
        value = sql.selectSingle("SELECT MAX(`value`) FROM enum_entry WHERE enum_id=:enum_id", enum_id=enum_id)

        for line in lines[1:]:
            tpr, name = line.split(',')[:2]
            label = '{0} - {1}'.format(tpr, name)
            order += 1
            value += 1
            sql.insert("INSERT INTO enum_entry VALUES (NULL, :enum_id, :order, :value, :label)", enum_id=enum_id, order=order, value=value, label=label)

