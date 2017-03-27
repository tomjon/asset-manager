if [ "" = "$1" ]; then
  echo "Usage: $0 [location of solr-6.3.0]"
  echo "e.g. $0 /usr/src"
  exit 1
fi
rm bams-enum.jar
LIBDIR=$1/solr-6.3.0/server/solr-webapp/webapp/WEB-INF/lib
LUCENE_CP=$LIBDIR/lucene-core-6.3.0.jar:$LIBDIR/lucene-queries-6.3.0.jar
SOLR_CP=$LIBDIR/solr-core-6.3.0.jar:$LIBDIR/solr-solrj-6.3.0.jar
javac -g -d bin -cp lib/json-simple-1.1.1.jar:$LUCENE_CP:$SOLR_CP src/uk/org/ofcom/ses/bams/solr/EnumValueSourceParser.java
jar cvf bams-enum.jar -C bin/ .
