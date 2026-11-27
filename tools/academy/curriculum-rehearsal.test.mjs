import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { normalize, renderRehearsal, renderStagedImport, summarize } from './curriculum-rehearsal.mjs';

const id = value => '00000000-0000-4000-8000-' + String(value).padStart(12, '0');
const plan = {
  course: { id: id(1), slug: 'stay-culture-fictional-v2', title: 'Private example', published: false },
  modules: [{ id: id(2), course_id: id(1), position: 1, title: 'Module', overview: 'Overview' }],
  lessons: [
    { id: id(3), module_id: id(2), position: 1, title: 'Lesson', body: "Fictional student's example", published: false },
    { id: id(4), module_id: id(2), position: 2, title: 'Lesson', body: 'Reading', published: false },
  ],
  scenarios: [],
  choices: [],
};

const setting = {course_id: id(1), setting_key: 'hospice', label: 'Hospice', published: false};
const application = {
  course_id: id(1), setting_key: 'hospice', lesson_id: id(3), kind: 'reflection', body: 'Fictional', published: false,
};
const contextual = {...plan, care_settings: [setting], lesson_applications: [application]};

test('staging digest covers unpublished contextual rows tied to the existing course and lessons', () => {
  const source = 'b'.repeat(40);
  const baseline = summarize(plan, source);
  const extended = summarize(contextual, source);
  assert.notEqual(baseline.sha256, extended.sha256);
  assert.equal(extended.counts.lesson_applications, 1);
  assert.match(renderStagedImport(contextual, source, extended.sha256, id(35)), /academy_lesson_applications/);
  assert.throws(() => normalize({...contextual, care_settings: [{...setting, published: true}]}), /published/);
  assert.throws(() => normalize({...contextual, lesson_applications: [{...application, lesson_id: id(99)}]}), /Unknown contextual lesson/);
  assert.throws(() => normalize({...contextual, lesson_applications: [{...application, course_id: id(99)}]}), /another course/);
  assert.throws(() => normalize({...contextual, lesson_applications: [application, application]}), /Duplicate lesson application/);
});

test('import rehearsal excludes private metadata and produces a deterministic receipt', () => {
  const sha = 'a'.repeat(40);
  const { course, ...rest } = plan;
  const equivalent = { ...rest, courses: [course], lessons: [...rest.lessons].reverse(), private_activity_metadata: ['private'] };
  assert.deepEqual(summarize(plan, sha), summarize(equivalent, sha));
  assert.throws(() => summarize(plan, 'main'), /full private source commit/);
  const sql = renderRehearsal(plan);
  assert.match(sql, /Disposable Academy curriculum database required/);
  assert.match(sql, /ROLLBACK;\n$/);
  assert.doesNotMatch(sql, /Fictional student|academy_enrollments|\bCOMMIT;/);
});

test('import rehearsal rejects published, draft, mislinked and conflicting row identities', () => {
  assert.throws(() => normalize({ ...plan, draft: true }), /Draft/);
  assert.throws(() => normalize({ ...plan, course: { ...plan.course, published: true } }), /published/);
  assert.throws(() => normalize({ ...plan, lessons: [{ ...plan.lessons[0], module_id: id(9) }] }), /Unknown lessons parent/);
  assert.throws(() => normalize({ ...plan, lessons: [plan.lessons[0], plan.lessons[0]] }), /Duplicate row identity/);
  assert.throws(() => normalize({ ...plan, lessons: [plan.lessons[0], { ...plan.lessons[1], position: 1 }] }), /Duplicate lessons position/);
});

test('staging import requires the reviewed digest and writes its receipt in the same transaction', () => {
  const sha = 'b'.repeat(40);
  const approved = summarize(plan, sha).sha256;
  const staged = renderStagedImport(plan, sha, approved, id(35));
  assert.match(staged, /Academy staging import target mismatch/);
  assert.match(staged, /curriculum_import_receipts[\s\S]*COMMIT;\n$/);
  assert.throws(() => renderStagedImport(plan, sha, 'c'.repeat(64), id(35)), /digest mismatch/);
  assert.throws(() => renderStagedImport(plan, sha, approved, 'production'), /target UUID/);
});

test('PostgreSQL commits a matching target and rolls back a late row conflict', {
  skip: process.env.ACADEMY_IMPORT_TEST !== '1',
}, () => {
  assert.equal(process.env.PGDATABASE, 'academy_ci');
  assert.equal(process.env.PGHOST, 'localhost');
  const target = id(35);
  const source = 'b'.repeat(40);
  const digest = summarize(contextual, source).sha256;

  function psql(input, errorPattern, ...args) {
    const result = spawnSync('psql', ['-XqAt', '-v', 'ON_ERROR_STOP=1', ...args], {
      input, encoding: 'utf8',
    });
    assert.ifError(result.error);
    if (errorPattern) {
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, errorPattern);
    } else {
      assert.equal(result.status, 0, result.stderr);
    }
    return result.stdout.trim();
  }

  const setup = readFileSync(new URL('./staging-import-target.sql', import.meta.url), 'utf8');
  psql(setup, null, '-v', 'academy_target_uuid=' + target);
  const staged = renderStagedImport(contextual, source, digest, target);
  psql(renderStagedImport(contextual, source, digest, id(36)), /target mismatch/);
  assert.equal(psql('select count(*) from academy_internal.curriculum_import_receipts;'), '0');
  psql(staged);
  assert.equal(psql(`select content_sha256 from academy_internal.curriculum_import_receipts where course_id='${id(1)}';`), digest);
  assert.equal(psql(`select count(*) from public.academy_lessons where module_id='${id(2)}' and not published;`), '2');
  assert.equal(psql(`select count(*) from public.academy_care_settings where course_id='${id(1)}' and not published;`), '1');
  assert.equal(psql(`select count(*) from public.academy_lesson_applications where lesson_id='${id(3)}' and not published;`), '1');
  psql(staged, /duplicate key/);

  const conflicting = {
    ...plan,
    course: { ...plan.course, id: id(5), slug: 'stay-culture-fictional-v3' },
    modules: [{ ...plan.modules[0], id: id(6), course_id: id(5) }],
    lessons: [{ ...plan.lessons[0], module_id: id(6) }],
  };
  psql(renderStagedImport(conflicting, source, summarize(conflicting, source).sha256, target), /duplicate key/);
  assert.equal(psql(`select count(*) from public.academy_courses where id='${id(5)}';`), '0');
  assert.equal(psql(`select count(*) from public.academy_modules where id='${id(6)}';`), '0');
  assert.equal(psql('select count(*) from academy_internal.curriculum_import_receipts;'), '1');
});
