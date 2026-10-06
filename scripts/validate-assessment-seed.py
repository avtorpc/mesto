#!/usr/bin/env python3
"""Validate CSV integrity and FK behavior in SQLite; not PostgreSQL execution."""
from pathlib import Path
import csv, hashlib, json, sqlite3
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'/'assessment'
CSV=DATA/'csv'
manifest=json.loads((DATA/'seed-manifest.json').read_text())
for path, digest in manifest['files'].items():
    assert hashlib.sha256((DATA/path).read_bytes()).hexdigest()==digest, path

def rows(name, demo=False):
    with (CSV/('demo' if demo else '')/(name+'.csv')).open(encoding='utf-8',newline='') as f:
        return list(csv.DictReader(f))

connection=sqlite3.connect(':memory:')
connection.execute('PRAGMA foreign_keys=ON')
connection.executescript('''
CREATE TABLE specializations(id INTEGER PRIMARY KEY,code TEXT UNIQUE,name TEXT,description TEXT,direction_code TEXT,active TEXT);
CREATE TABLE grades(id INTEGER PRIMARY KEY,code TEXT UNIQUE,name TEXT,sort_order INTEGER);
CREATE TABLE competencies(id INTEGER PRIMARY KEY,code TEXT UNIQUE,name TEXT,description TEXT,active TEXT);
CREATE TABLE technologies(id INTEGER PRIMARY KEY,code TEXT UNIQUE,name TEXT,kind TEXT,active TEXT);
CREATE TABLE criteria(id INTEGER PRIMARY KEY,code TEXT,version INTEGER,name TEXT,description TEXT,check_templates TEXT,active TEXT,UNIQUE(code,version));
CREATE UNIQUE INDEX one_active_version ON criteria(code) WHERE active='true';
CREATE TABLE specialization_competencies(specialization_id INTEGER REFERENCES specializations(id),competency_id INTEGER REFERENCES competencies(id),relevance_description TEXT,PRIMARY KEY(specialization_id,competency_id));
CREATE TABLE criterion_competencies(criterion_id INTEGER REFERENCES criteria(id),competency_id INTEGER REFERENCES competencies(id),active TEXT,scope_note TEXT,PRIMARY KEY(criterion_id,competency_id));
CREATE TABLE tests(id INTEGER PRIMARY KEY,candidate_id TEXT,request_key TEXT,specialization_id INTEGER REFERENCES specializations(id),declared_grade_id INTEGER REFERENCES grades(id),competency_ids TEXT,technology_context TEXT,criteria_snapshot TEXT,assignment TEXT,status TEXT,generation_metadata TEXT,created_at TEXT,UNIQUE(id,candidate_id),UNIQUE(candidate_id,request_key));
CREATE TABLE test_attempts(id INTEGER PRIMARY KEY,candidate_id TEXT,test_id INTEGER UNIQUE,answer TEXT,evaluation TEXT,status TEXT,started_at TEXT,submitted_at TEXT,FOREIGN KEY(test_id,candidate_id) REFERENCES tests(id,candidate_id));
''')
order=['specializations','grades','competencies','technologies','criteria','specialization_competencies','criterion_competencies','tests','test_attempts']
loaded={}
for name in order:
    loaded[name]=rows(name)
    assert len(loaded[name])==manifest['seed_counts'][name],name
    for row in loaded[name]:
        connection.execute('INSERT INTO '+name+' ('+','.join(row)+') VALUES ('+','.join('?' for _ in row)+')',list(row.values()))
assert connection.execute('PRAGMA foreign_key_check').fetchall()==[]
assert connection.execute("SELECT c.id FROM competencies c WHERE NOT EXISTS (SELECT 1 FROM criterion_competencies cc JOIN criteria x ON x.id=cc.criterion_id WHERE cc.competency_id=c.id AND cc.active='true' AND x.active='true')").fetchall()==[]
for name in ['tests','test_attempts']:
    loaded[name]=rows(name,True)
    for row in loaded[name]:
        connection.execute('INSERT INTO '+name+' ('+','.join(row)+') VALUES ('+','.join('?' for _ in row)+')',list(row.values()))
by={name:{int(row['id']):row for row in loaded[name]} for name in ['specializations','grades','competencies','technologies','criteria']}
relations={(int(row['criterion_id']),int(row['competency_id'])) for row in loaded['criterion_competencies']}
allowed={(int(row['specialization_id']),int(row['competency_id'])) for row in loaded['specialization_competencies']}
for row in loaded['tests']:
    pairs=json.loads(row['criteria_snapshot']); comps=json.loads(row['competency_ids']); tech=json.loads(row['technology_context'])
    assert len(comps)==len(set(comps))==len(pairs) and 1<=len(comps)<=3
    assert {x['competency_id'] for x in pairs}==set(comps)
    assert len({x['criterion_code'] for x in pairs})==len(pairs)
    for pair in pairs:
        assert (pair['criterion_id'],pair['competency_id']) in relations
        assert (int(row['specialization_id']),pair['competency_id']) in allowed
        criterion=by['criteria'][pair['criterion_id']]
        assert criterion['code']==pair['criterion_code'] and int(criterion['version'])==pair['criterion_version']
        assert len(pair['checks'])==2 and len({x['check_id'] for x in pair['checks']})==2
    assert all(by['technologies'][x['id']]['code']==x['code'] for x in tech)
    assert json.loads(row['generation_metadata'])['is_demo'] is True
for row in loaded['test_attempts']:
    evaluation=json.loads(row['evaluation']); assert evaluation['is_demo'] is True
    assert all(x['score'] is None and all(ch['status']=='unknown' for ch in x['checks']) for x in evaluation['criteria'])
assert connection.execute('PRAGMA foreign_key_check').fetchall()==[]
# Negative checks verify the relationship constraints, including task ownership.
for query,args in [
 ('INSERT INTO criterion_competencies VALUES (?,?,?,?)',(999999,1,'true','invalid')),
 ('INSERT INTO specialization_competencies VALUES (?,?,?)',(999999,1,'invalid')),
 ('INSERT INTO test_attempts(id,candidate_id,test_id) VALUES (?,?,?)',(2,'another-candidate',1)),
 ('INSERT INTO criterion_competencies SELECT * FROM criterion_competencies LIMIT 1',()),
]:
    try:connection.execute(query,args)
    except sqlite3.IntegrityError:pass
    else:raise AssertionError('Constraint did not reject invalid data: '+query)
assert len(loaded['specializations'])==120 and len(loaded['competencies'])==65
assert len(loaded['criteria'])==72 and len(loaded['criterion_competencies'])==78
print('CSV, JSON, checksums and all FK links validated; optional demo populates all 9 tables.')
print('Invalid references, duplicate edges and wrong task owner rejected in SQLite validation model.')
print('PostgreSQL SQL files have not been executed by this validator.')
