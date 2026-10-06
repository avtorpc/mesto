-- Read-only checks after schema/seed (optional demo may add runtime rows).
SET search_path TO mesto_assessment, pg_catalog;
SELECT 'specializations' AS table_name, COUNT(*) AS actual_rows, 120 AS seed_rows FROM specializations
UNION ALL
SELECT 'grades' AS table_name, COUNT(*) AS actual_rows, 3 AS seed_rows FROM grades
UNION ALL
SELECT 'competencies' AS table_name, COUNT(*) AS actual_rows, 65 AS seed_rows FROM competencies
UNION ALL
SELECT 'technologies' AS table_name, COUNT(*) AS actual_rows, 62 AS seed_rows FROM technologies
UNION ALL
SELECT 'specialization_competencies' AS table_name, COUNT(*) AS actual_rows, 1543 AS seed_rows FROM specialization_competencies
UNION ALL
SELECT 'criteria' AS table_name, COUNT(*) AS actual_rows, 72 AS seed_rows FROM criteria
UNION ALL
SELECT 'criterion_competencies' AS table_name, COUNT(*) AS actual_rows, 78 AS seed_rows FROM criterion_competencies
UNION ALL
SELECT 'tests' AS table_name, COUNT(*) AS actual_rows, 0 AS seed_rows FROM tests
UNION ALL
SELECT 'test_attempts' AS table_name, COUNT(*) AS actual_rows, 0 AS seed_rows FROM test_attempts;

-- Every competency must have at least one active eligible criterion; expect zero rows.
SELECT p.code FROM competencies p WHERE p.active AND NOT EXISTS (SELECT 1 FROM criterion_competencies cc JOIN criteria c ON c.id=cc.criterion_id WHERE cc.competency_id=p.id AND cc.active AND c.active);

-- Foreign keys enforce ownership; expect zero rows.
SELECT a.id FROM test_attempts a JOIN tests t ON t.id=a.test_id WHERE a.candidate_id <> t.candidate_id;

-- JSON references are checked by the server; this query also checks persisted pair links. Expect zero rows.
SELECT t.id AS test_id, pair FROM tests t CROSS JOIN LATERAL jsonb_array_elements(t.criteria_snapshot) AS pair WHERE NOT EXISTS (SELECT 1 FROM criterion_competencies cc JOIN criteria c ON c.id=cc.criterion_id WHERE cc.criterion_id=(pair->>'criterion_id')::bigint AND cc.competency_id=(pair->>'competency_id')::bigint AND c.code=pair->>'criterion_code' AND c.version=(pair->>'criterion_version')::integer);

-- No repeated criterion or competency inside one task; expect zero rows.
SELECT t.id FROM tests t CROSS JOIN LATERAL jsonb_array_elements(t.criteria_snapshot) AS pair GROUP BY t.id HAVING COUNT(*) <> COUNT(DISTINCT pair->>'criterion_code') OR COUNT(*) <> COUNT(DISTINCT pair->>'competency_id');
