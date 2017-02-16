#!/usr/bin/python
import sys
import os
import hashlib
import csv
from sql import SqlDatabase, NoResult

def add_attachment(sql, asset_id, name, data):
    h = hashlib.md5(data).hexdigest()
    try:
        attachment_id = sql.selectSingle('SELECT attachment_id FROM attachment WHERE hash=:h', h=h)
        print "Duplicate:", name
    except NoResult:
        print "New file:", name
        attachment_id = sql.insert('INSERT INTO attachment VALUES (NULL, :name, :data, :h)', name=name, data=buffer(data), h=h)
    sql.insert('INSERT INTO attachment_asset_pivot VALUES (NULL, :attachment_id, :asset_id)', attachment_id=attachment_id, asset_id=asset_id)


if __name__ == '__main__':
    if len(sys.argv) != 5:
        print "Usage: {0} <files path> <old CSV> <new CSV> <SQL db>".format(sys.argv[0])
        sys.exit(1)

    db = SqlDatabase(sys.argv[4])

    with db.cursor() as sql:
        sql.delete('DELETE FROM attachment')
        sql.delete('DELETE FROM attachment_asset_pivot')

        # map from old asset id to serial number
        old_map = {}
        with open(sys.argv[2]) as f:
            f.seek(2)
            for row in csv.DictReader(f):
                if row['Serial Number'] != '':
                    old_map[row['ID']] = row['Serial Number']

        # map from serial number to new asset id
        new_map = {}
        with open(sys.argv[3]) as f:
            f.seek(2)
            for row in csv.DictReader(f):
                if row['Serial No.'] != '':
                    new_map[row['Serial No.']] = row['ID']

        for asset_id in os.listdir(sys.argv[1]):
            try:
                serial = old_map[asset_id]
            except KeyError:
                print "Can't find serial number for asset id:", asset_id
                continue
            try:
                new_id = new_map[serial]
            except KeyError:
                print "Can't find serial number in new CSV:", serial
                continue

            asset_path = os.path.join(sys.argv[1], asset_id)
            for filename in os.listdir(asset_path):
                with open(os.path.join(asset_path, filename)) as f:
                    data = f.read()
                add_attachment(sql, new_id, filename, data)

