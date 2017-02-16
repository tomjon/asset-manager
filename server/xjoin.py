""" Flask server for the XJoin API (called only by the local SOLR server).
"""
import json
import sys
import os
from time import time
import functools
import requests
from sql import SqlDatabase, NoResult
import mimetypes
from werkzeug.local import LocalProxy
from flask import Flask, redirect, request, Response, send_file, g
from user_app import UserApplication, ADMIN_ROLE, BOOK_ROLE, VIEW_ROLE
from sql_app import SqlApplication

application = SqlApplication(__name__, static_path=None) # pylint: disable=invalid-name


@application.route('/')
def main_endpoint():
    """ Output brief info.
    """
    return json.dumps({'name': 'BADASS XJoin (SOLR) API'})

@application.route('/enum')
def enums_endpoint():
    """ Endpoint for getting enumerations.
    """
    with application.db.cursor() as sql:
        enums = {}
        for enum_id, field in sql.selectAll("SELECT enum_id, field FROM enum"):
            stmt = "SELECT value, label, `order` FROM enum_entry WHERE enum_id=:enum_id"
            enums[field] = sql.selectAllDict(stmt, enum_id=enum_id)
        return json.dumps(enums)

@application.route('/booking')
def booking_endpoint():
    """ Booking XJoin endpoint.
    """
    with application.db.cursor() as sql:
        if 'out' in request.args:
            # all assets that are currently out
            return json.dumps(sql.selectAllDict("SELECT asset_id FROM booking WHERE out_date IS NOT NULL AND in_date IS NULL"))
        elif 'due' in request.args:
            if request.args['due'] == 'out':
                # all assets that are due out (so today is after the due_out_date but before the due_in_date)
                return json.dumps(sql.selectAllDict("SELECT asset_id FROM booking WHERE out_date IS NULL AND due_out_date <= date('now') AND date('now') <= due_in_date"))
            elif request.args['due'] == 'in':
                # all assets that are currently overdue to be returned
                return json.dumps(sql.selectAllDict("SELECT asset_id FROM booking WHERE out_date IS NOT NULL AND in_date IS NULL AND due_in_date < date('now')"))
        elif 'unavailable' in request.args:
            # all assets that are NOT available (so not due in and not returned early) on the specified date (we use this negatively)
            return json.dumps(sql.selectAllDict("SELECT asset_id FROM booking WHERE due_out_date <= '{0}' AND '{0}' <= due_in_date AND in_date IS NULL".format(request.args['unavailable'])))
    return "Unknown booking arguments", 400


@application.route('/filter')
def project_endpoint():
    """ Filter XJoin endpoint.
    """
    with application.db.cursor() as sql:
        if 'project' in request.args:
            # booking data for XJoin (filters for assets based on bookings)
            return json.dumps(sql.selectAllDict("SELECT asset_id FROM booking WHERE project=:project_id", project_id=request.args['project']))
        if 'user' in request.args:
            # booking data for XJoin (filters for assets based on user)
            return json.dumps(sql.selectAllDict("SELECT asset_id FROM booking WHERE user_id=:user_id AND (due_in_date >= date('now') OR (out_date IS NOT NULL AND in_date IS NULL))", user_id=request.args['user']))
    return "Unknown filter arguments", 400


if __name__ == '__main__':
    if 'debug' in sys.argv:
        application.debug = True
    application.run('0.0.0.0', port=8081)
