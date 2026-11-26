import assert from 'node:assert/strict';
import test from 'node:test';
import { normalize, renderRehearsal, summarize } from './curriculum-rehearsal.mjs';

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
