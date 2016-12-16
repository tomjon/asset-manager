""" Flask server for the Server API.
"""
import json
import sys
import os
import uuid
import requests
import httplib
from flask import Flask, redirect, request, Response, send_file

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


@application.route('/enums')
def enums_endpoint():
    """ Endpoint for getting enumerations.
    """
    enums = {}
    for field in os.listdir('enums'):
        with open(os.path.join('enums', field)) as f:
            enums[field] = json.loads(f.read())
    return json.dumps(enums)


@application.route('/search')
@application.route('/search/<path:path>')
def search_endpoint(path=None):
    """ Perform a SOLR search.
    """
    params = [('q', request.args.get('q', '*')),
              ('start', request.args.get('start', 0)),
              ('rows', request.args.get('rows', 10))]

    order = request.args.get('order', None)
    if order is not None:
        if len(order) < 2 or order[0] not in '><':
            return "Bad order", 400
        params.append(('sort', '{0} {1}'.format(order[1:], 'asc' if order[0] == '>' else 'desc')))

    if path is not None:
        for field_value in path.split('/'):
            if field_value.count(':') != 1:
                return "Bad filter", 400
            field, value = field_value.split(':')
            if value != '*':
                value = '"{0}"'.format(value)
            params.append(('fq', '{0}:{1}'.format(field, value)))

    if 'facets' in request.args:
        params.append(('facet', 'true'))
        params.append(('facet.limit', '-1'))
        for field in request.args.get('facets', '').split(','):
            params.append(('facet.field', field))

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
        if '_version_' in data['add']['doc']:
            del data['add']['doc']['_version_']
    headers = {'Content-Type': 'application/json'}
    r = requests.post(SOLR_UPDATE_URL, headers=headers, params={'commit': 'true'}, data=json.dumps(data))
    assert_status_code(r, httplib.OK)
    return Response(json.dumps({'id': asset_id}), mimetype='application/json')


@application.route('/file/<asset_id>/<filename>')
def file_endpoint(asset_id, filename):
   """ Emit a file.
   """
   path = os.path.join('files', asset_id, filename)
   return send_file(path)


if __name__ == '__main__':
    if 'debug' in sys.argv:
        application.debug = True
    application.run('0.0.0.0', port=8080)
