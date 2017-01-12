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
	co_date DATE,
	co_contact INTEGER,
	due_date DATE,
	co_location INTEGER,
	project INTEGER
);

