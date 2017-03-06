#!/bin/bash
if [ "" == "$1" ] || [ "" == "$2" ]; then
    echo "Usage: $0 <SOLR collection> <SQL database>"
    exit 1
fi

curl "http://localhost:8983/solr/$1/query?q=id:*&fl=*&rows=10000000&sort=id+asc" | jq "[.response.docs[] | del(._version_)]" > solr-backup.json
echo ".dump" | sqlite3 $2 > sql-backup.sql
DATE=`date +%Y-%m-%d`
tar cvfz /home/tom/backups/backup_$DATE.tgz solr-backup.json sql-backup.sql
