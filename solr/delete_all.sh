#!/bin/bash
if [ "" == "$1" ]; then
    echo "Usage: $0 <SOLR collection>"
    exit 1
fi

curl "http://localhost:8983/solr/$1/update?commit=true" -H "Content-Type: text/xml" --data-binary '<delete><query>*:*</query></delete>'
