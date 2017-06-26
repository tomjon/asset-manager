if [ "" = "$1" ]; then
  echo "Usage: $0 [user@host]"
  echo "e.g. $0 tom@bart.ofcom.net"
  exit 1
fi
scp ../field_map attachments.py field_map.py function.py loader.py parser.py $1:/usr/lib/badass/loader
