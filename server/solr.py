""" Solr asset index.
"""
import json
import requests
import httplib
from config import BASE_SOLR_URL

class SolrError(Exception):
    """ Exception raised when SOLR returns an error status.
    """
    def __init__(self, status_code):
        super(SolrError, self).__init__()
        self.status_code = status_code

def assert_status_code(r, status_code):
    """ Raise a SolrError if the status code of the response is not as specified.
    """
    if r.status_code != status_code:
        raise SolrError(r.status_code)

class AssetIndex(object):
    def __init__(self, collection):
        self.query_url = "{0}/{1}/query".format(BASE_SOLR_URL, collection)
        self.update_url = "{0}/{1}/update".format(BASE_SOLR_URL, collection)

    def search(self, params):
        """ Perform a SOLR search.
        """
        r = requests.get(self.query_url, params=params)
        assert_status_code(r, httplib.OK)
        return json.loads(r.text)

    def assets_dict(self, user_id):
        """ Get a dictionary keyed by asset_id whose values are the asset details to be displayed
            for the user's bookings table.
        """
        docs = self.search({'q': '*', 'fl': 'id,barcode,manufacturer,model', 'xjoin_user': 'true', 'xjoin_user.external.user': user_id, 'fq': '{!xjoin}xjoin_user'})['response']['docs']
        return dict((doc['id'], doc) for doc in docs)

    def new_id(self):
        r = requests.get(self.query_url, params={'q': '*', 'rows': 1, 'fl': 'id', 'sort': 'id desc'})
        assert_status_code(r, httplib.OK)
        rsp = json.loads(r.text)
        docs = rsp['response']['docs']
        return str(int(docs[0]['id']) + 1) if len(docs) > 0 else 1

    def id_exists(self, id):
        r = requests.get(self.query_url, params={'q': 'id:"{0}"'.format(id), 'rows': 0})
        assert_status_code(r, httplib.OK)
        rsp = json.loads(r.text)
        return int(rsp['response']['numFound']) > 0

    def _update(self, data):
        headers = {'Content-Type': 'application/json'}
        r = requests.post(self.update_url, headers=headers, params={'commit': 'true'}, data=json.dumps(data))
        assert_status_code(r, httplib.OK)

    def delete(self, asset_id):
        self._update({'delete': asset_id})

    def update(self, asset_id, asset):
        data = {'add': {'doc': asset}}
        data['add']['doc']['id'] = asset_id
        if '_version_' in data['add']['doc']:
            del data['add']['doc']['_version_']
        self._update(data)

    def get(self, asset_id):
        r = requests.get(self.query_url, params={'q': 'id:{0}'.format(asset_id)})
        assert_status_code(r, httplib.OK)
        rsp = json.loads(r.text)
        docs = rsp['response']['docs']
        return docs[0] if len(docs) > 0 else None
