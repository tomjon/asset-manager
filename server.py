""" Flask server for the Server API.
"""
import json
import sys
import os
import uuid
import requests
import httplib
from flask import Flask, redirect, request, Response, send_file, send_from_directory

application = Flask(__name__) # pylint: disable=invalid-name


SOLR_COLLECTION = "assets"
SOLR_QUERY_URL = "http://localhost:8983/solr/{0}/query".format(SOLR_COLLECTION)
SOLR_UPDATE_URL = "http://localhost:8983/solr/{0}/update".format(SOLR_COLLECTION)

class SolrError(Exception):
    """ Exception raised when SOLR returns an error status.
    """
    def __init__(self, status_code):
        super(SolrError, self).__init__()
        self.status_code = status_code

@application.errorhandler(SolrError)
def handle_solr_error(error):
    """ Error handler for SolrError - just pass forward the status code.
    """
    return "SOLR Error", error.status_code

def assert_status_code(r, status_code):
    """ Raise a SolrError if the status code of the response is not as specified.
    """
    if r.status_code != status_code:
        raise SolrError(r.status_code)


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


@application.route('/search')
def search_endpoint():
    """ Perform a SOLR search.
    """
    params = {'q': request.args.get('q', '*'),
              'start': request.args.get('start', 0),
              'rows': request.args.get('rows', 10)}
    r = requests.get(SOLR_QUERY_URL, params=params)
    assert_status_code(r, httplib.OK)
    return Response(r.text, mimetype=r.headers['content-type'])


@application.route('/asset', methods=['POST'])
@application.route('/asset/<asset_id>', methods=['PUT', 'DELETE'])
def asset_endpoint(asset_id=None):
    """ Asset add, delete, update endpoint.
    """
    if asset_id is None:
        asset_id = str(uuid.uuid4())
    if request.method == 'DELETE':
        # delete an existing asset
        data = {'delete': asset_id}
    else:
        # add a new asset or update an existing asset
        data = {'add': {'doc': request.get_json()}}
        data['add']['doc']['id'] = asset_id
        del data['add']['doc']['_version_']
    headers = {'Content-Type': 'application/json'}
    r = requests.post(SOLR_UPDATE_URL, headers=headers, params={'commit': 'true'}, data=json.dumps(data))
    assert_status_code(r, httplib.OK)
    return Response(json.dumps({'id': asset_id}), mimetype='application/json')


@application.route('/file/<asset_id>/<filename>')
def file_endpoint(asset_id, filename):
   """ Emit a file.
   """
   return send_from_directory(os.path.join('files', asset_id), filename)


if __name__ == '__main__':
    if 'debug' in sys.argv:
        application.debug = True
    application.run('0.0.0.0', port=8080)

