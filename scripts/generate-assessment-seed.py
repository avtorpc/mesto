#!/usr/bin/env python3
"""Rebuild PostgreSQL/CSV seed files from the agreed assessment catalogs."""
from pathlib import Path
import csv
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'assessment'
SQL = DATA / 'sql'
CSV = DATA / 'csv'
DIRECTIONS = ['web-development', 'application-systems', 'enterprise-automation', 'games', 'devices-computing', 'data-analytics', 'ai', 'databases', 'quality', 'infrastructure', 'networks', 'security', 'analysis', 'architecture', 'design', 'support', 'it-services', 'product-project', 'documentation-training', 'technology-governance']

def dump(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))

def quote(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, int):
        return str(value)
    if isinstance(value, (dict, list)):
        return quote(dump(value)) + '::jsonb'
    return "'" + str(value).replace("'", "''") + "'"

def write_csv(table, fields, rows, target=CSV):
    target.mkdir(parents=True, exist_ok=True)
    with (target / (table + '.csv')).open('w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: dump(row[key]) if isinstance(row.get(key), (list, dict)) else ('true' if row[key] is True else 'false' if row[key] is False else row.get(key, '')) for key in fields})

def load_catalogs():
    specifications = []; direction = 0
    for line in (ROOT / 'IT_SPECIALIZATIONS.md').read_text().splitlines():
        heading = re.match(r'## (\d+)\. ', line)
        if heading:
            direction = int(heading[1])
        match = re.match(r'\| `([^`]+)` \| ([^|]+) \| ([^|]+) \|', line)
        if match:
            specifications.append(dict(id=len(specifications)+1, code=match[1], name=match[2].strip(), description=match[3].strip(), direction_code=DIRECTIONS[direction-1], active=True))
    competencies = []
    text = (ROOT / 'IT_COMPETENCIES.md').read_text()
    for line in text.splitlines():
        match = re.match(r'\| `([^`]+)` \| ([^|]+) \| ([^|]+) \|', line)
        if match:
            competencies.append(dict(id=len(competencies)+1, code=match[1], name=match[2].strip(), description=match[3].strip(), active=True))
    groups = [('Языки и средства программирования','language'),('Web-разметка и оформление','markup-style'),('Backend-фреймворки','backend-framework'),('Frontend-фреймворки и библиотеки','frontend-framework'),('Среды и платформы','platform'),('Запросы и базы данных','query-database'),('Контейнеры и оркестрация','containers'),('Системы и инфраструктурные инструменты','infrastructure'),('Сборка, доставка и версии','delivery-versioning'),('Инструменты тестирования','testing'),('Данные и ИИ','data-ai'),('Дизайн и корпоративные платформы','design-enterprise')]
    overrides = {'C++':'cpp','C#':'csharp','.NET':'dotnet','Node.js':'nodejs','ASP.NET Core':'aspnet-core','1С':'1c'}
    technologies = []
    for label, kind in groups:
        match = re.search(r'^\| ' + re.escape(label) + r' \| ([^|]+) \|', text, re.M)
        assert match, label
        for name in match[1].split(';')[0].split(','):
            name = name.strip()
            code = overrides.get(name, re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-'))
            technologies.append(dict(id=len(technologies)+1,code=code,name=name,kind=kind,active=True))
    grades = [dict(id=i,code=code,name=name,sort_order=i) for i,(code,name) in enumerate([('junior','Junior'),('middle','Middle'),('senior','Senior')],1)]
    criteria_data = json.loads((DATA/'criteria-mvp.json').read_text())
    criteria = [dict(id=i,**row) for i,row in enumerate(criteria_data['criteria'],1)]
    spec_by_code={row['code']:row for row in specifications}
    comp_by_code={row['code']:row for row in competencies}
    criterion_by_key={(row['code'],row['version']):row for row in criteria}
    old_catalog=json.loads((DATA/'criteria-catalog.json').read_text())
    spec_links=[]
    for link in old_catalog['specialization_links']:
        for code in link['competency_ids']:
            spec_links.append(dict(specialization_id=spec_by_code[link['specialization_id']]['id'],competency_id=comp_by_code[code]['id'],relevance_description='Предлагаемая применимость; не обязательная программа грейда'))
    raw_links=json.loads((DATA/'criterion-competencies-mvp.json').read_text())['links']
    criterion_links=[dict(criterion_id=criterion_by_key[(link['criterion_code'],link['criterion_version'])]['id'],competency_id=comp_by_code[link['competency_code']]['id'],active=link['active'],scope_note=link['scope_note']) for link in raw_links]
    return dict(specializations=specifications,grades=grades,competencies=competencies,technologies=technologies,criteria=criteria,specialization_competencies=spec_links,criterion_competencies=criterion_links)

FIELDS = {
 'specializations':['id','code','name','description','direction_code','active'],
 'grades':['id','code','name','sort_order'],
 'competencies':['id','code','name','description','active'],
 'technologies':['id','code','name','kind','active'],
 'specialization_competencies':['specialization_id','competency_id','relevance_description'],
 'criteria':['id','code','version','name','description','check_templates','active'],
 'criterion_competencies':['criterion_id','competency_id','active','scope_note'],
 'tests':['id','candidate_id','request_key','specialization_id','declared_grade_id','competency_ids','technology_context','criteria_snapshot','assignment','status','generation_metadata','created_at'],
 'test_attempts':['id','candidate_id','test_id','answer','evaluation','status','started_at','submitted_at'],
}

SCHEMA = '''-- PostgreSQL. Apply once to a new schema; no DROP or destructive cleanup.
BEGIN;
CREATE SCHEMA IF NOT EXISTS mesto_assessment;
SET LOCAL search_path TO mesto_assessment, pg_catalog;
SET LOCAL standard_conforming_strings = on;

CREATE TABLE specializations (
 id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
 code TEXT NOT NULL UNIQUE CHECK (code <> ''),
 name TEXT NOT NULL, description TEXT NOT NULL,
 direction_code TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE grades (
 id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
 code TEXT NOT NULL UNIQUE CHECK (code <> ''),
 name TEXT NOT NULL, sort_order INTEGER NOT NULL CHECK (sort_order > 0)
);
CREATE TABLE competencies (
 id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
 code TEXT NOT NULL UNIQUE CHECK (code <> ''),
 name TEXT NOT NULL, description TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE technologies (
 id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
 code TEXT NOT NULL UNIQUE CHECK (code <> ''),
 name TEXT NOT NULL, kind TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE specialization_competencies (
 specialization_id BIGINT NOT NULL REFERENCES specializations(id) ON DELETE RESTRICT,
 competency_id BIGINT NOT NULL REFERENCES competencies(id) ON DELETE RESTRICT,
 relevance_description TEXT NOT NULL,
 PRIMARY KEY (specialization_id, competency_id)
);
CREATE INDEX specialization_competencies_by_competency ON specialization_competencies(competency_id);
CREATE TABLE criteria (
 id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
 code TEXT NOT NULL CHECK (code <> ''), version INTEGER NOT NULL CHECK (version > 0),
 name TEXT NOT NULL, description TEXT NOT NULL,
 check_templates JSONB NOT NULL CHECK (jsonb_typeof(check_templates) = 'array'),
 active BOOLEAN NOT NULL DEFAULT TRUE,
 UNIQUE (code, version)
);
CREATE UNIQUE INDEX criteria_one_active_version ON criteria(code) WHERE active;
CREATE TABLE criterion_competencies (
 criterion_id BIGINT NOT NULL REFERENCES criteria(id) ON DELETE RESTRICT,
 competency_id BIGINT NOT NULL REFERENCES competencies(id) ON DELETE RESTRICT,
 active BOOLEAN NOT NULL DEFAULT TRUE, scope_note TEXT NOT NULL,
 PRIMARY KEY (criterion_id, competency_id)
);
CREATE INDEX criterion_competencies_by_competency ON criterion_competencies(competency_id) WHERE active;
CREATE TABLE tests (
 id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
 -- External account ID. No account table exists in this standalone export.
 candidate_id TEXT NOT NULL CHECK (candidate_id <> ''),
 request_key TEXT NOT NULL CHECK (request_key <> ''),
 specialization_id BIGINT NOT NULL REFERENCES specializations(id) ON DELETE RESTRICT,
 declared_grade_id BIGINT NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
 competency_ids JSONB NOT NULL CHECK (jsonb_typeof(competency_ids) = 'array' AND jsonb_array_length(competency_ids) BETWEEN 1 AND 3),
 technology_context JSONB NOT NULL CHECK (jsonb_typeof(technology_context) = 'array'),
 criteria_snapshot JSONB NOT NULL CHECK (jsonb_typeof(criteria_snapshot) = 'array' AND jsonb_array_length(criteria_snapshot) = jsonb_array_length(competency_ids)),
 assignment JSONB CHECK (assignment IS NULL OR jsonb_typeof(assignment) = 'object'),
 status TEXT NOT NULL CHECK (status IN ('generating','ready','generation_failed')),
 generation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(generation_metadata) = 'object'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE (candidate_id, request_key), UNIQUE (id, candidate_id),
 CHECK (status <> 'ready' OR assignment IS NOT NULL)
);
CREATE INDEX tests_by_candidate ON tests(candidate_id, created_at);
CREATE TABLE test_attempts (
 id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
 candidate_id TEXT NOT NULL CHECK (candidate_id <> ''), test_id BIGINT NOT NULL,
 answer JSONB CHECK (answer IS NULL OR jsonb_typeof(answer) = 'object'),
 evaluation JSONB CHECK (evaluation IS NULL OR jsonb_typeof(evaluation) = 'object'),
 status TEXT NOT NULL CHECK (status IN ('in_progress','evaluating','preliminary','awaiting_review','verified','evaluation_failed')),
 started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, submitted_at TIMESTAMPTZ,
 FOREIGN KEY (test_id, candidate_id) REFERENCES tests(id, candidate_id) ON DELETE RESTRICT,
 UNIQUE (test_id), CHECK (submitted_at IS NULL OR submitted_at >= started_at)
);
CREATE INDEX test_attempts_by_candidate ON test_attempts(candidate_id, started_at);
COMMIT;
'''

def seed_sql(tables):
    lines=['-- PostgreSQL. Catalogs and relationships only; no real tasks or attempts.', '-- For a new schema created by 01_schema.sql. Repeated seed preserves existing rows.', 'BEGIN;', 'SET LOCAL search_path TO mesto_assessment, pg_catalog;', 'SET LOCAL standard_conforming_strings = on;']
    for table in ['specializations','grades','competencies','technologies','criteria']:
        fields=FIELDS[table]
        conflict='code, version' if table=='criteria' else 'code'
        lines += ['\nINSERT INTO '+table+' ('+', '.join(fields)+') VALUES', ',\n'.join('('+', '.join(quote(row[key]) for key in fields)+')' for row in tables[table]), 'ON CONFLICT ('+conflict+') DO NOTHING;']
    spec={x['id']:x['code'] for x in tables['specializations']}; comps={x['id']:x['code'] for x in tables['competencies']}; crit={x['id']:(x['code'],x['version']) for x in tables['criteria']}
    lines += ['\nINSERT INTO specialization_competencies (specialization_id, competency_id, relevance_description)', 'SELECT s.id, c.id, v.description FROM (VALUES', ',\n'.join('('+', '.join(quote(x) for x in [spec[row['specialization_id']],comps[row['competency_id']],row['relevance_description']])+')' for row in tables['specialization_competencies']), ') AS v(specialization_code, competency_code, description)', 'JOIN specializations AS s ON s.code = v.specialization_code', 'JOIN competencies AS c ON c.code = v.competency_code', 'ON CONFLICT (specialization_id, competency_id) DO NOTHING;']
    lines += ['\nINSERT INTO criterion_competencies (criterion_id, competency_id, active, scope_note)', 'SELECT c.id, p.id, v.active, v.scope_note FROM (VALUES', ',\n'.join('('+', '.join(quote(x) for x in [*crit[row['criterion_id']],comps[row['competency_id']],row['active'],row['scope_note']])+')' for row in tables['criterion_competencies']), ') AS v(criterion_code, criterion_version, competency_code, active, scope_note)', 'JOIN criteria AS c ON c.code = v.criterion_code AND c.version = v.criterion_version', 'JOIN competencies AS p ON p.code = v.competency_code', 'ON CONFLICT (criterion_id, competency_id) DO NOTHING;']
    for table in ['specializations','grades','competencies','technologies','criteria']:
        lines.append("SELECT setval(pg_get_serial_sequence('mesto_assessment."+table+"', 'id'), GREATEST(COALESCE(MAX(id), 1), 1), TRUE) FROM "+table+';')
    lines += ['COMMIT;','']
    return '\n'.join(lines)

def demo_rows(tables):
    by={name:{x['code']:x for x in tables[name]} for name in ['specializations','grades','competencies','technologies','criteria']}
    response=json.loads((DATA/'generated-task-mvp.example.json').read_text())
    snapshot=[]
    for item in response['criteria_checks']:
        criterion=by['criteria'][item['criterion_code']]; comp=by['competencies'][item['competency_code']]
        snapshot.append(dict(criterion_id=criterion['id'],criterion_code=criterion['code'],criterion_version=criterion['version'],competency_id=comp['id'],competency_code=comp['code'],description=criterion['description'],scale_code='mvp_checks_0_2_v1',checks=item['checks']))
    test=dict(id=1,candidate_id='demo-candidate-not-a-real-account',request_key='demo-api-transactions-v1',specialization_id=by['specializations']['backend']['id'],declared_grade_id=by['grades']['middle']['id'],competency_ids=[by['competencies'][x]['id'] for x in ['api-design','transactions']],technology_context=[dict(id=by['technologies'][code]['id'],code=code,role='assessed') for code in ['php','postgresql']],criteria_snapshot=snapshot,assignment=dict(title=response['title'],**response['assignment']),status='ready',generation_metadata=dict(is_demo=True,source='authored_example_not_real_ai_output',selection_policy='random_complete_unique_matching_v1',prompt_version='mvp-generation-v1'),created_at='2026-10-06T10:00:00+03:00')
    result=[dict(criterion_code=x['criterion_code'],criterion_version=x['criterion_version'],competency_id=x['competency_id'],checks=[dict(check_id=ch['check_id'],status='unknown',explanation='Демонстрационная запись: реальная проверка не выполнялась.') for ch in x['checks']],score=None,source='demo',status='awaiting_review') for x in snapshot]
    attempt=dict(id=1,candidate_id=test['candidate_id'],test_id=1,answer=dict(text='Демонстрационная запись, не решение кандидата.',is_demo=True),evaluation=dict(is_demo=True,status='awaiting_review',criteria=result,revisions=[]),status='awaiting_review',started_at='2026-10-06T10:00:00+03:00',submitted_at='2026-10-06T10:05:00+03:00')
    return test,attempt

def demo_sql(test,attempt):
    def lookup(table,code):
        return '(SELECT id FROM '+table+' WHERE code = '+quote(code)+')'
    def array_objects(objects):
        return 'jsonb_build_array('+', '.join(objects)+')'
    snapshots=[]
    for x in test['criteria_snapshot']:
        parts=[]
        for key,value in x.items():
            if key=='criterion_id':expr='(SELECT id FROM criteria WHERE code = '+quote(x['criterion_code'])+' AND version = '+str(x['criterion_version'])+')'
            elif key=='competency_id':expr=lookup('competencies',x['competency_code'])
            else:expr=quote(value)
            parts += [quote(key),expr]
        snapshots.append('jsonb_build_object('+', '.join(parts)+')')
    technology=["jsonb_build_object('id', "+lookup('technologies',x['code'])+", 'code', "+quote(x['code'])+", 'role', 'assessed')" for x in test['technology_context']]
    values=[quote(test['candidate_id']),quote(test['request_key']),lookup('specializations','backend'),lookup('grades','middle'),array_objects([lookup('competencies',x) for x in ['api-design','transactions']]),array_objects(technology),array_objects(snapshots),quote(test['assignment']),quote(test['status']),quote(test['generation_metadata']),quote(test['created_at'])]
    fields=FIELDS['tests'][1:]
    # Demo evaluation competency IDs are resolved from the inserted test snapshot.
    evaluation="jsonb_build_object('is_demo', TRUE, 'status', 'awaiting_review', 'revisions', '[]'::jsonb, 'criteria', (SELECT jsonb_agg(jsonb_build_object('criterion_code', item->>'criterion_code', 'criterion_version', item->'criterion_version', 'competency_id', item->'competency_id', 'score', NULL, 'source', 'demo', 'status', 'awaiting_review', 'checks', (SELECT jsonb_agg(jsonb_build_object('check_id', ch->>'check_id', 'status', 'unknown', 'explanation', 'Демонстрационная запись: реальная проверка не выполнялась.')) FROM jsonb_array_elements(item->'checks') AS ch))) FROM jsonb_array_elements(t.criteria_snapshot) AS item))"
    return '\n'.join(['-- OPTIONAL synthetic example. No real account, AI call, answer or score.', 'BEGIN;', 'SET LOCAL search_path TO mesto_assessment, pg_catalog;', 'SET LOCAL standard_conforming_strings = on;', 'INSERT INTO tests ('+', '.join(fields)+') VALUES', '('+', '.join(values)+')', 'ON CONFLICT (candidate_id, request_key) DO NOTHING;', 'INSERT INTO test_attempts (candidate_id, test_id, answer, evaluation, status, started_at, submitted_at)', 'SELECT t.candidate_id, t.id, '+quote(attempt['answer'])+', '+evaluation+', '+quote(attempt['status'])+', '+quote(attempt['started_at'])+', '+quote(attempt['submitted_at']), 'FROM tests AS t WHERE t.candidate_id = '+quote(test['candidate_id'])+' AND t.request_key = '+quote(test['request_key']), 'ON CONFLICT (test_id) DO NOTHING;', 'COMMIT;',''])

def main():
    SQL.mkdir(parents=True,exist_ok=True)
    tables=load_catalogs()
    for name,fields in FIELDS.items():write_csv(name,fields,tables.get(name,[]))
    test,attempt=demo_rows(tables)
    write_csv('tests',FIELDS['tests'],[test],CSV/'demo')
    write_csv('test_attempts',FIELDS['test_attempts'],[attempt],CSV/'demo')
    (SQL/'01_schema.sql').write_text(SCHEMA)
    (SQL/'02_seed.sql').write_text(seed_sql(tables))
    (SQL/'03_demo.sql').write_text(demo_sql(test,attempt))
    counts={name:len(tables.get(name,[])) for name in FIELDS}
    query=["-- Read-only checks after schema/seed (optional demo may add runtime rows).", "SET search_path TO mesto_assessment, pg_catalog;"]
    query.append('\nUNION ALL\n'.join("SELECT "+quote(name)+" AS table_name, COUNT(*) AS actual_rows, "+str(count)+" AS seed_rows FROM "+name for name,count in counts.items())+';')
    query += ["\n-- Every competency must have at least one active eligible criterion; expect zero rows.","SELECT p.code FROM competencies p WHERE p.active AND NOT EXISTS (SELECT 1 FROM criterion_competencies cc JOIN criteria c ON c.id=cc.criterion_id WHERE cc.competency_id=p.id AND cc.active AND c.active);", "\n-- Foreign keys enforce ownership; expect zero rows.","SELECT a.id FROM test_attempts a JOIN tests t ON t.id=a.test_id WHERE a.candidate_id <> t.candidate_id;", "\n-- JSON references are checked by the server; this query also checks persisted pair links. Expect zero rows.", "SELECT t.id AS test_id, pair FROM tests t CROSS JOIN LATERAL jsonb_array_elements(t.criteria_snapshot) AS pair WHERE NOT EXISTS (SELECT 1 FROM criterion_competencies cc JOIN criteria c ON c.id=cc.criterion_id WHERE cc.criterion_id=(pair->>'criterion_id')::bigint AND cc.competency_id=(pair->>'competency_id')::bigint AND c.code=pair->>'criterion_code' AND c.version=(pair->>'criterion_version')::integer);", "\n-- No repeated criterion or competency inside one task; expect zero rows.", "SELECT t.id FROM tests t CROSS JOIN LATERAL jsonb_array_elements(t.criteria_snapshot) AS pair GROUP BY t.id HAVING COUNT(*) <> COUNT(DISTINCT pair->>'criterion_code') OR COUNT(*) <> COUNT(DISTINCT pair->>'competency_id');", '']
    (SQL/'04_validate.sql').write_text('\n'.join(query))
    def csv_import(names, demo=False):
        lines=[r"\set ON_ERROR_STOP on", "BEGIN;", "SET LOCAL search_path TO mesto_assessment, pg_catalog;"]
        for name in names:
            relative='data/assessment/csv/'+('demo/' if demo else '')+name+'.csv'
            lines.append(r"\copy "+name+' ('+', '.join(FIELDS[name])+") FROM '"+relative+"' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');")
        for name in ['specializations','grades','competencies','technologies','criteria','tests','test_attempts']:
            if name in names:
                lines.append("SELECT setval(pg_get_serial_sequence('mesto_assessment."+name+"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "+name+';')
        lines+=['COMMIT;','']
        return '\n'.join(lines)
    import_order=['specializations','grades','competencies','technologies','criteria','specialization_competencies','criterion_competencies','tests','test_attempts']
    (SQL/'05_import_csv.psql').write_text(csv_import(import_order))
    (SQL/'06_import_demo_csv.psql').write_text(csv_import(['tests','test_attempts'],True))
    files=sorted(list(SQL.glob('*.sql'))+list(SQL.glob('*.psql'))+list(CSV.glob('*.csv'))+list((CSV/'demo').glob('*.csv')))
    manifest={'generated_on':'2026-10-06','database':'PostgreSQL','schema':'mesto_assessment','catalog_status':'draft_for_experimental_mvp_not_calibrated','seed_counts':counts,'optional_demo_counts':{'tests':1,'test_attempts':1},'files':{str(p.relative_to(DATA)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
    (DATA/'seed-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    technology_doc=['# Начальный справочник технологий MVP','','Дата: **6 октября 2026 года**. Составлен из примеров [IT_COMPETENCIES.md](IT_COMPETENCIES.md), не исчерпывающий каталог. Наличие тега не подтверждает навык.','','Коды используются в JSON и SQL; числовые ID ниже относятся к начальной загрузке в пустую схему. CSV: [technologies.csv](data/assessment/csv/technologies.csv).','','| ID | Код | Название | Тип |','| --- | --- | --- | --- |']
    technology_doc += [f"| {x['id']} | `{x['code']}` | {x['name']} | `{x['kind']}` |" for x in tables['technologies']]
    (ROOT/'IT_TECHNOLOGIES.md').write_text('\n'.join(technology_doc)+'\n')
    print(json.dumps(counts,ensure_ascii=False))

if __name__=='__main__':main()
