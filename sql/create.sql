/**
 * Most data fields are described by the enum/enum_entry tables. So, for example, a 'location'
 * field might have enum_id 5; and entries identified by the enum_id 5 in the enum_entry table.
 * The associated columns value, label and order describe the possible numerical values, how to
 * order them in the UI, and how to display each value in the UI. Note that values for 'order'
 * must start at 0 and be contiguous (otherwise the UI breaks).
 *
 * The table 'user' augments user values described by the user enum (i.e. the enum with field
 * value 'user'), adding role and login credentials. A similar table 'project' might be created
 * to fulfill a similar function, etc.
 *
 * Other tables 'attachment' and 'booking' are not associated with an enum and describe the
 * corresponding entities in the system.
 */

CREATE TABLE user(
	user_id INTEGER PRIMARY KEY,
	role INTEGER,
	username VARCHAR(256),
	password_salt BLOB,
	password_hash BLOB
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
	label VARCHAR(256)
);

CREATE TABLE attachment(
	attachment_id INTEGER PRIMARY KEY,
	asset_id INTEGER,
	name VARCHAR(256),
	data BLOB
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
	project INTEGER
);

/**
 * Create and populate the 'role' enum, and create the 'project' and 'user' enums, which are
 * all required for the system to run. The labels for roles can be edited later, but the
 * particular values are assumed by server.py and the UI.
 *
 * The initial Admin user must be created using the user_app.py script.
 */

INSERT INTO enum_entry VALUES (NULL, -1, 0, 1, 'Viewer');
INSERT INTO enum_entry VALUES (NULL, -1, 1, 2, 'Booker');
INSERT INTO enum_entry VALUES (NULL, -1, 2, 3, 'Admin');
INSERT INTO enum VALUES (NULL, 'role');
UPDATE enum_entry SET enum_id=(SELECT last_insert_rowid()) WHERE enum_id=-1;
INSERT INTO enum VALUES (NULL, 'user');
INSERT INTO enum VALUES (NULL, 'project');

