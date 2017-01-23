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

application = SqlApplication(__name__) # pylint: disable=invalid-name

@application.route('/booking', methods=['GET'])
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
            # all assets that are NOT available (due in) on the specified date (we use this negatively)
            return json.dumps(sql.selectAllDict("SELECT asset_id FROM booking WHERE due_out_date <= '{0}' AND '{0}' <= due_in_date".format(request.args['unavailable'])))
        return "Unknown filter args", 400


@application.route('/project/<project_id>')
def project_endpoint(project_id):
    """ Project XJoin endpoint.
    """
    with application.db.cursor() as sql:
        # booking data for XJoin (filters for assets based on bookings)
        return json.dumps(sql.selectAllDict("SELECT asset_id, booking.user_id, user.label, due_out_date, due_in_date, out_date, in_date FROM booking, user WHERE project=:project_id AND user.user_id=booking.user_id", project_id=project_id))


if __name__ == '__main__':
    if 'debug' in sys.argv:
        application.debug = True
    application.run('0.0.0.0', port=8081)
