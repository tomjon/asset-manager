import os
import base64

FILE_DATA = 'FileData'
FILE_NAME = 'FileName'

def map_date(nodes, doc):
    """ All we need is to add the final Z to get a SOLR date formatted string.
    """
    return ['{0}Z'.format(node.value()) for node in nodes]

def map_set(nodes, doc):
    """ Ensure the values in the list are unique.
    """
    return list(set([node.value() for node in nodes]))

def map_attachment(nodes, doc):
    for node in nodes:
        data, name = None, None
        for subfield in node.fields:
            if subfield.name == FILE_DATA:
                data = base64.b64decode(subfield.value())
            elif subfield.name == FILE_NAME:
                name = subfield.value()
        assert data is not None and name is not None
        if 'file' not in doc:
            doc['file'] = []
        doc['file'].append(name)

        # save attachment file
        path = os.path.join(doc.files_path, doc['id'][0], name)
        try:
            os.makedirs(os.path.dirname(path))
        except OSError:
            pass
        with open(path, 'w') as f:
            f.write(data[20:]) # first 20 bytes are metadata prepended by Access

    return None
