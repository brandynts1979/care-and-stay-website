import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const slug = /^stay-culture-[a-z0-9]+(?:-[a-z0-9]+)*-v[1-9][0-9]*$/;
const tables = [
  ['courses', null, { id: 'uuid', slug: 'text', title: 'text', published: 'boolean' }],
  ['modules', 'course_id', { id: 'uuid', course_id: 'uuid', position: 'integer', title: 'text', overview: 'text' }],
  ['lessons', 'module_id', { id: 'uuid', module_id: 'uuid', position: 'integer', title: 'text', body: 'text', published: 'boolean' }],
  ['scenarios', 'lesson_id', { id: 'uuid', lesson_id: 'uuid', position: 'integer', prompt: 'text' }],
  ['choices', 'scenario_id', { id: 'uuid', scenario_id: 'uuid', position: 'integer', choice_text: 'text', feedback: 'text' }],
];

const contextTables = [
  ['care_settings', { course_id: 'uuid', setting_key: 'text', label: 'text', published: 'boolean' }],
  ['lesson_applications', { course_id: 'uuid', setting_key: 'text', lesson_id: 'uuid', kind: 'text', body: 'text', published: 'boolean' }],
];
const applicationKinds = new Set(['case_study', 'scenario', 'simulation', 'exercise', 'reflection', 'fieldwork', 'recommendation']);

function normalizeContext(plan, normalized) {
  const {care_settings: settings, lesson_applications: applications} = plan;
  if (settings === undefined && applications === undefined) return;
  assert.ok(Array.isArray(settings) && settings.length && Array.isArray(applications) && applications.length,
    'Both nonempty context row sets are required');
  const courseId = normalized.courses[0].id;
  const lessonIds = new Set(normalized.lessons.map(row => row.id));
  const settingKeys = new Set();
  const applicationKeys = new Set();
  for (const [table, fields] of contextTables) {
    const rows = plan[table];
    normalized[table] = rows.map(row => {
      assert.ok(row && typeof row === 'object' && !Array.isArray(row), `Invalid ${table} row`);
      assert.equal(Object.keys(row).length, Object.keys(fields).length, `Unexpected ${table} fields`);
      for (const [name, type] of Object.entries(fields)) {
        assert.ok(validValue(type, row[name]), `Invalid ${table}.${name}`);
      }
      assert.equal(row.course_id, courseId, 'Context row refers to another course');
      assert.match(row.setting_key, /^[a-z][a-z0-9_]{0,47}$/, 'Invalid care setting key');
      if (table === 'care_settings') {
        assert.ok(row.label.trim().length <= 100, 'Care setting label is too long');
        assert.ok(!settingKeys.has(row.setting_key), 'Duplicate care setting');
        settingKeys.add(row.setting_key);
      } else {
        assert.ok(lessonIds.has(row.lesson_id) && settingKeys.has(row.setting_key),
          'Unknown contextual lesson or care setting');
        assert.ok(applicationKinds.has(row.kind) && row.body.trim().length <= 12000, 'Invalid lesson application');
        const key = [row.setting_key, row.lesson_id, row.kind].join(':');
        assert.ok(!applicationKeys.has(key), 'Duplicate lesson application');
        applicationKeys.add(key);
      }
      return Object.fromEntries(Object.keys(fields).map(key => [key, row[key]]));
    }).sort((a, b) => a.setting_key.localeCompare(b.setting_key, 'en')
      || (a.lesson_id || '').localeCompare(b.lesson_id || '', 'en')
      || (a.kind || '').localeCompare(b.kind || '', 'en'));
  }
}

function validValue(type, value) {
  switch (type) {
    case 'uuid': return typeof value === 'string' && uuid.test(value);
    case 'boolean': return value === false;
    case 'integer': return Number.isInteger(value) && value > 0 && value <= 2147483647;
    case 'text': return typeof value === 'string' && value.trim().length > 0 && !value.includes('\0');
  }
}

export function normalize(plan) {
  assert.ok(plan && !plan.draft, 'Draft or missing curriculum plan');
  assert.ok(!(Object.hasOwn(plan, 'course') && Object.hasOwn(plan, 'courses')), 'Ambiguous course shape');
  const courses = Object.hasOwn(plan, 'course') ? [plan.course] : plan.courses;
  assert.ok(Array.isArray(courses) && courses.length === 1 && slug.test(courses[0]?.slug),
    'Exactly one versioned Stay Culture course is required');

  const normalized = {};
  const ids = new Set();
  let parents;
  for (const [table, parent, fields] of tables) {
    const rows = table === 'courses' ? courses : plan[table];
    assert.ok(Array.isArray(rows) && (rows.length || table === 'scenarios' || table === 'choices'), `Missing ${table}`);
    const positions = new Set();
    normalized[table] = rows.map(row => {
      assert.ok(row && typeof row === 'object' && !Array.isArray(row), `Invalid ${table} row`);
      assert.equal(Object.keys(row).length, Object.keys(fields).length, `Unexpected ${table} fields`);
      for (const [name, type] of Object.entries(fields)) {
        assert.ok(validValue(type, row[name]), `Invalid ${table}.${name}`);
      }
      assert.ok(!ids.has(row.id), 'Duplicate row identity');
      ids.add(row.id);
      if (parent) {
        assert.ok(parents.has(row[parent]), `Unknown ${table} parent`);
        const key = `${row[parent]}:${row.position}`;
        assert.ok(!positions.has(key), `Duplicate ${table} position`);
        positions.add(key);
      }
      return Object.fromEntries(Object.keys(fields).map(key => [key, row[key]]));
    }).sort((a, b) => a.id.localeCompare(b.id, 'en'));
    parents = new Set(normalized[table].map(row => row.id));
  }
  const withChoices = new Set(normalized.choices.map(row => row.scenario_id));
  assert.ok(normalized.scenarios.every(row => withChoices.has(row.id)), 'Scenario lacks choices');
  normalizeContext(plan, normalized);
  return normalized;
}

export function summarize(plan, sourceCommit) {
  assert.match(sourceCommit, /^[a-f0-9]{40}$/, 'A full private source commit SHA is required');
  const rows = normalize(plan);
  return {
    slug: rows.courses[0].slug,
    sourceCommit,
    sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    counts: Object.fromEntries(Object.entries(rows).map(([table, entries]) => [table, entries.length])),
  };
}

function renderImport(rows, gate, finish) {
  const commands = [
    '\\set ON_ERROR_STOP on',
    'BEGIN;',
    'SET LOCAL standard_conforming_strings = on;',
    "SET LOCAL lock_timeout = '5s';",
    "SET LOCAL statement_timeout = '30s';",
    gate,
  ];
  const importTables = tables.map(([table, , fields]) => [table, fields]).concat(contextTables);
  for (const [table, fields] of importTables) {
    if (!Object.hasOwn(rows, table)) continue;
    const columns = Object.keys(fields).join(', ');
    const types = Object.entries(fields).map(([name, type]) => `${name} ${type}`).join(', ');
    // Hex safely transports private UTF-8 without embedding source text in SQL syntax.
    const payload = Buffer.from(JSON.stringify(rows[table])).toString('hex');
    commands.push(
      `INSERT INTO public.academy_${table} (${columns}) SELECT ${columns} ` +
      `FROM jsonb_to_recordset(convert_from(decode('${payload}', 'hex'), 'UTF8')::jsonb) AS rows(${types});`,
    );
  }
  commands.push(...finish);
  return commands.join('\n') + '\n';
}

export function renderRehearsal(plan) {
  return renderImport(normalize(plan),
    "DO $$ BEGIN IF current_database() <> 'academy_curriculum_rehearsal' OR to_regclass('public.academy_curriculum_fixture_guard') IS NULL THEN RAISE EXCEPTION 'Disposable Academy curriculum database required'; END IF; END $$;",
    ['ROLLBACK;']);
}

export function renderStagedImport(plan, sourceCommit, approvedDigest, targetId) {
  const summary = summarize(plan, sourceCommit);
  assert.equal(summary.sha256, approvedDigest, 'Reviewed curriculum digest mismatch');
  assert.ok(typeof targetId === 'string' && uuid.test(targetId), 'A staging target UUID is required');
  const rows = normalize(plan);
  const targetGate = [
    'DO $$ BEGIN',
    "  IF NOT EXISTS (SELECT 1 FROM academy_internal.curriculum_staging_target",
    `    WHERE singleton AND target_id='${targetId}'::uuid) THEN`,
    "    RAISE EXCEPTION 'Academy staging import target mismatch';",
    '  END IF;',
    'END $$;',
  ].join('\n');
  const receipt = 'INSERT INTO academy_internal.curriculum_import_receipts(course_id, source_commit, content_sha256) ' +
    `VALUES ('${rows.courses[0].id}'::uuid, '${sourceCommit}', '${summary.sha256}');`;
  return renderImport(rows, targetGate, [receipt, 'COMMIT;']);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mode, filename, sourceCommit, ...extra] = process.argv.slice(2);
  assert.ok(filename && sourceCommit && (
    (['summary', 'sql'].includes(mode) && extra.length === 0) ||
    (mode === 'stage' && extra.length === 2)
  ), 'Usage: curriculum-rehearsal.mjs <summary|sql|stage> <private-plan.json> <source-commit> [<approved-digest> <staging-target-uuid>]');

  const plan = JSON.parse(readFileSync(filename, 'utf8'));
  if (mode === 'stage') {
    process.stdout.write(renderStagedImport(plan, sourceCommit, ...extra));
  } else {
    const summary = summarize(plan, sourceCommit);
    process.stdout.write(mode === 'sql' ? renderRehearsal(plan) : JSON.stringify(summary, null, 2) + '\n');
  }
}
