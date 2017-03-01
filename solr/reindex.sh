#!/bin/bash
if [ "" == "$1" ]; then
    echo "Usage: $0 <SOLR collection>"
    exit 1
fi

curl "http://localhost:8983/solr/$1/query?q=id:*&fl=*&rows=10000000&sort=id+asc" | jq "[.response.docs[] | del(._version_)]" > export.json
curl "http://localhost:8983/solr/$1/update?commit=true" -H "Content-Type: text/xml" --data-binary '<delete><query>*:*</query></delete>'
curl "http://localhost:8983/solr/$1/update?commit=true" -H "Content-Type: text/json" --data-binary @export.json

