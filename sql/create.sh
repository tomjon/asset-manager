rm assets.db
cat create.sql | sqlite3 assets.db
echo .tables | sqlite3 assets.db
