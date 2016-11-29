#!/bin/bash
curl http://localhost:8983/solr/asset/update?commit=true -H "Content-Type: text/xml" --data-binary '<delete><query>*:*</query></delete>'
