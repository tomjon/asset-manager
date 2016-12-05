""" Flask server for the Server API.
"""
import json
import sys
import os
import requests
from flask import Flask, redirect, request, Response, send_file, send_from_directory

application = Flask(__name__) # pylint: disable=invalid-name


SOLR_COLLECTION = "assets"
SOLR_URL = "http://localhost:8983/solr/{0}/query".format(SOLR_COLLECTION)
MAX_ITEM_COUNT = 100000

@application.route('/', methods=['GET', 'POST'])
def main_endpoint():
    """ Redirect to index.
    """
    return redirect("/static/index.html")


@application.route('/favicon.ico')
def favicon_endpoint():
    """ Serve a favicon.
    """
    path = os.path.join(application.root_path, 'static', 'favicon.ico')
    return send_file(path, mimetype='image/vnd.microsoft.icon')


@application.route('/solr')
def solr_endpoint():
    """ Perform a SOLR search.
    """
    r = requests.get(SOLR_URL, params={'q': request.args.get('q'), 'rows': MAX_ITEM_COUNT})
    if r.status_code != 200:
        return "SOLR error", r.status_code
    return Response(r.text, mimetype=r.headers['content-type'])
    

@application.route('/file/<item_id>/<filename>')
def file_endpoint(item_id, filename):
   """ Emit a file.
   """
   return send_from_directory(os.path.join('files', item_id), filename)


if __name__ == '__main__':
    if 'debug' in sys.argv:
        application.debug = True
    application.run('0.0.0.0', port=8080)

