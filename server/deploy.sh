if [ "" = "$1" ]; then
  echo "Usage: $0 [user@host]"
  echo "e.g. $0 tom@bart.ofcom.net"
  exit 1
fi
scp import_tprs.py config.py.example logger.py notifications.py solr.py server.py sql.py sql_app.py user_app.py xjoin.py $1:/usr/lib/badass/server
