/**
 * Most data fields are described by the enum/enum_entry tables. So, for example, a 'location'
 * field might have enum_id 5; and entries identified by the enum_id 5 in the enum_entry table.
 * The associated columns value, label and order describe the possible numerical values, how to
 * order them in the UI, and how to display each value in the UI. Note that values for 'order'
 * must start at 0 and be contiguous (otherwise the UI breaks).
 *
 * The table 'user' augments user values described by the user enum (i.e. the enum with field
 * value 'user'), adding role and login credentials. The table 'project' plays a similar role.
 *
 * Other tables 'attachment' and 'booking' are not associated with an enum and describe the
 * corresponding entities in the system.
 */

CREATE TABLE user(
	user_id INTEGER PRIMARY KEY,
	role INTEGER,
	username VARCHAR(256),
	email VARCHAR(256),
	password_salt BLOB,
	password_hash BLOB,
	last_login DATE
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
	name VARCHAR(256),
	folder_id INTEGER,
	data BLOB,
	hash CHAR(32)
);

CREATE TABLE attachment_folder(
	folder_id INTEGER PRIMARY KEY,
	parent_id INTEGER,
	name VARCHAR(256)
);

CREATE TABLE attachment_asset_pivot(
	pivot_id INTEGER PRIMARY KEY,
	attachment_id INTEGER,
	asset_id INTEGER
);

CREATE TABLE project(
	project_id INTEGER PRIMARY KEY,
	active BOOLEAN,
	tpr VARCHAR(64),
	close_date DATE
);

CREATE TABLE booking(
	booking_id INTEGER PRIMARY KEY,
	asset_id INTEGER,
	user_id INTEGER,
	booked_date DATE,
	due_out_date DATE,
	due_in_date DATE,
	out_date DATE,
	out_user_id INTEGER,
	in_date DATE,
	in_user_id INTEGER,
	project INTEGER,
	notes TEXT
);

CREATE TABLE notification(
	notification_id INTEGER PRIMARY KEY,
	name TEXT,
	title_template TEXT,
	body_template TEXT,
	every INTEGER,
	offset INTEGER,
	run DATE
);

CREATE TABLE notification_role_pivot(
	pivot_id INTEGER PRIMARY KEY,
	notification_id INTEGER,
	role INTEGER
);

CREATE TABLE trigger(
	trigger_id INTEGER PRIMARY KEY,
	notification_id INTEGER,
	column VARCHAR(64),
	field VARCHAR(64),
	days INTEGER
);

CREATE TABLE trigger_filter(
	filter_id INTEGER PRIMARY KEY,
	trigger_id INTEGER,
	column VARCHAR(64),
	field VARCHAR(64),
	operator VARCHAR(2),
	value VARCHAR(64)
);

/**
 * Create and populate the 'role' and 'every' enums, and create the 'project', 'user' and 'condition' enums, which are
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

INSERT INTO enum_entry VALUES (NULL, -1, 0, 0, 'Never');
INSERT INTO enum_entry VALUES (NULL, -1, 1, 1, 'Day');
INSERT INTO enum_entry VALUES (NULL, -1, 2, 2, 'Week');
INSERT INTO enum_entry VALUES (NULL, -1, 3, 3, 'Month');
INSERT INTO enum_entry VALUES (NULL, -1, 4, 4, 'Year');
INSERT INTO enum VALUES (NULL, 'every');
UPDATE enum_entry SET enum_id=(SELECT last_insert_rowid()) WHERE enum_id=-1;

INSERT INTO enum VALUES (NULL, 'user');
INSERT INTO enum VALUES (NULL, 'project');
INSERT INTO enum VALUES (NULL, 'condition');

