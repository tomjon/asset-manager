if [ "" = "$1" ]; then
  echo "Usage: $0 [user@host]"
  echo "e.g. $0 tom@bart.ofcom.net"
  exit 1
fi
ng build --base-href=.
(cd dist; tar cvfz badass-ui.tgz *; mv badass-ui.tgz ..)
scp badass-ui.tgz $1:~
rm badass-ui.tgz
