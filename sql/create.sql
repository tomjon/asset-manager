CREATE TABLE user(
	user_id INTEGER PRIMARY KEY,
	role INTEGER,
	username VARCHAR(256),
	label VARCHAR(256),
	password_salt BLOB,
	password_hash BLOB,
	json TEXT
);

CREATE TABLE enum(
	enum_id INTEGER PRIMARY KEY,
	field VARCHAR(32)
);

CREATE TABLE enum_entry(
	entry_id INTEGER PRIMARY KEY,
	enum_id INTEGER,
	'order' INTEGER,
	value INTEGER,
	label VARCHAR(64)
);

CREATE TABLE attachment(
	attachment_id INTEGER PRIMARY KEY,
	asset_id INTEGER,
	name VARCHAR(256),
	data BLOB
);

CREATE TABLE contact(
	contact_id INTEGER PRIMARY KEY,
	json TEXT
);

CREATE TABLE booking(
	booking_id INTEGER PRIMARY KEY,
	asset_id INTEGER,
	user_id INTEGER,
	booked_date DATE,
	due_out_date DATE,
	due_in_date DATE,
	out_date DATE,
	in_date DATE,
	project INTEGER,
	json TEXT
);

INSERT INTO enum_entry VALUES (NULL, -1, 0, 1, 'Viewer');
INSERT INTO enum_entry VALUES (NULL, -1, 1, 2, 'Booker');
INSERT INTO enum_entry VALUES (NULL, -1, 2, 3, 'Admin');
INSERT INTO enum VALUES (NULL, 'role');
UPDATE enum_entry SET enum_id=(SELECT last_insert_rowid()) WHERE enum_id=-1;

