LIBDIR=../../solr-6.3.0/server/solr-webapp/webapp/WEB-INF/lib
LUCENE_CP=$LIBDIR/lucene-core-6.3.0.jar:$LIBDIR/lucene-queries-6.3.0.jar
SOLR_CP=$LIBDIR/solr-core-6.3.0.jar:$LIBDIR/solr-solrj-6.3.0.jar
javac -d bin -cp lib/json-simple-1.1.1.jar:$LUCENE_CP:$SOLR_CP src/uk/org/ofcom/ses/bams/solr/EnumValueSourceParser.java
jar cvf bams-enum.jar -C bin/ .
