#!/usr/bin/python

""" Script for importing TPR projects from a CSV file.
"""
import sys
import sqlite3

def import_project(sql, enum_id, tpr, title):
    """ Import a project based on the TPR and title. Looks for a project with
        name starting with the TPR (followed by whitespace or punctuation). If
        it finds a match, activate the project; otherwise add a new active one.
    """
    label = "{} - {}".format(tpr, title)
    values = {'enum_id': enum_id, 'template': '{} -%'.format(tpr)}
    sql.execute("SELECT value FROM enum_entry WHERE enum_id=:enum_id AND label LIKE :template", values)
    row = sql.fetchone()
    if row is not None:
        sql.execute("UPDATE project SET active=1, tpr=:tpr WHERE project_id=:project_id", {'project_id': row[0], 'tpr': tpr})
    else:
        sql.execute("INSERT INTO project VALUES (NULL, 1, :tpr, NULL)", {'tpr': tpr})
        project_id = sql.lastrowid
        values = {'enum_id': enum_id, 'order': project_id + 1, 'value': project_id, 'label': label}
        sql.execute("INSERT INTO enum_entry VALUES (NULL, :enum_id, :order, :value, :label)", values)

def unactivate_projects(sql, enum_id, tpr_list):
    """ If a project exists with name beginning 'TPR' and it is not on the TPR
        list, it is made inactive.
    """
    sql.execute("SELECT value, label FROM enum_entry WHERE enum_id=:enum_id AND label LIKE 'TPR% -%'", {'enum_id': enum_id})
    for project_id, label in sql.fetchall():
        tpr = label.split(' -')[0]
        if tpr not in tpr_list:
            sql.execute("UPDATE project SET active=0 WHERE project_id=:project_id", {'project_id': project_id})

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print >>sys.stderr, "Usage: {0} <assets db> <CSV file>".format(*sys.argv)
        sys.exit(1)

    with open(sys.argv[2]) as f:
        projects = []
        count = 0
        for line in f:
            count += 1
            if count == 1: continue # ignore first line
            try:
                line = line.decode('ascii', 'ignore').encode('utf8').strip()
                tpr, status, title, assets = line.split(',')
                projects.append((tpr, title))
            except ValueError:
                print >>sys.stderr, "Bad CSV line:", line


    sql_conn = sqlite3.connect(sys.argv[1])
    sql = sql_conn.cursor()

    try:
        # get the enum_id for project
        sql.execute("SELECT enum_id FROM enum WHERE field=:field", {'field': 'project'})
        enum_id = sql.fetchone()[0]

        for tpr, title in sorted(projects):
            import_project(sql, enum_id, tpr, title)

        unactivate_projects(sql, enum_id, [tpr for tpr, title in projects])
    finally:
        sql_conn.commit()
        sql_conn.close()

