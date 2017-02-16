rm $1 
cat create.sql | sqlite3 $1
echo .tables | sqlite3 $1
