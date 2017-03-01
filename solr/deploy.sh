if [ "" = "$1" ]; then
  echo "Usage: $0 [user@host]"
  echo "e.g. $0 tom@bart.ofcom.net"
  exit 1
fi
scp -r conf create.sh delete_all.sh java reindex.sh $1:/usr/lib/badass/solr
