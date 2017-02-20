#!/usr/bin/python
import sql
from config import DATABASE

db = sql.SqlDatabase(DATABASE)

with db.cursor() as sql:
    for enum_id in sql.selectAllSingle("SELECT enum_id FROM enum WHERE field != 'role' AND field != 'user'"):
        enum = sql.selectAllDict("SELECT * FROM enum_entry WHERE enum_id=:enum_id", enum_id=enum_id)

        enum.sort(key=lambda x: x['label'])

        order = 0
        for value in enum:
            sql.update("UPDATE enum_entry SET `order`=:order WHERE entry_id=:entry_id", entry_id=value['entry_id'], order=order)
            order += 1

