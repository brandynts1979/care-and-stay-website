// Reads private PR #14 sources and emits an unpublished plan. Keep stdout private.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalize } from './curriculum-rehearsal.mjs';

const root = process.argv[2];
assert.ok(root && process.argv.length === 3, 'Pass the private academy/business-development directory');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const manifest = readJson('IMPORT_MANIFEST.json');
assert.equal(manifest.version, 'abd-import-v1');
assert.equal(manifest.courseId, 'abd-v1');
assert.equal(manifest.publication, 'unpublished');
assert.equal(manifest.modules.length, 8);

function stableId(key) {
  const bytes = createHash('sha256').update('care-and-stay/academy/abd-v1/' + key).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 128;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

const course = {
  id: stableId(manifest.courseId),
  slug: 'stay-culture-appreciative-business-development-v1',
  title: 'Appreciative Business Development Academy',
  published: false,
};
const plan = {course, modules: [], lessons: [], scenarios: [], choices: [], worksheet_templates: []};
const lessonIds = new Map();
const practiceLabels = {
  Objectives: 'LEARNING OBJECTIVES',
  Reflection: 'PRIVATE REFLECTION PROMPT',
  Fieldwork: 'PRACTICE EVIDENCE FOR REVIEW',
};

for (const [index, module] of manifest.modules.entries()) {
  const position = index + 1;
  const moduleNumber = String(position).padStart(2, '0');
  assert.equal(module.id, 'ABD-M' + moduleNumber);
  assert.equal(module.order, position);
  assert.equal(module.publication, 'unpublished');
  assert.match(module.source, /^curriculum\/[a-z0-9-]+\.md$/);
  const raw = readFileSync(join(root, module.source));
  const blob = createHash('sha1').update(`blob ${raw.length}\0`).update(raw).digest('hex');
  assert.equal(blob, module.sourceBlob, `Source blob mismatch for ${module.id}`);
  const [header, ...sections] = raw.toString('utf8').split(/^## /m);
  const titleMatch = header.match(/^# Module (\d+) — (.+)$/m);
  assert.equal(Number(titleMatch?.[1]), position);
  const moduleId = stableId(module.id);
  plan.modules.push({id: moduleId, course_id: course.id, position, title: titleMatch[2], overview: `Practice and apply the skills in ${titleMatch[2]}.`});
  assert.equal(module.lessons.length, 4);
  const lessonSections = sections.filter(section => /^ABD-/.test(section));
  assert.equal(lessonSections.length, 4);
  for (const [li, lesson] of module.lessons.entries()) {
    assert.equal(lesson.id, `ABD-${moduleNumber}-0${li + 1}`);
    assert.equal(lesson.publication, 'unpublished');
    const section = lessonSections[li];
    const newline = section.indexOf('\n');
    assert.equal(section.slice(0, newline).trimEnd(), lesson.sourceHeading);
    const body = section.slice(newline + 1).trim()
      .replace(/^([A-Z][A-Za-z ]+):\s*/gm, (_, label) => `\n\n${practiceLabels[label] || label.toUpperCase()}\n`)
      .trim();
    assert.ok(body.includes('PRACTICE EVIDENCE FOR REVIEW\n'), `Fieldwork missing for ${lesson.id}`);
    const id = stableId(lesson.id);
    lessonIds.set(lesson.id, id);
    plan.lessons.push({id, module_id: moduleId, position: li + 1, title: lesson.title, body, published: false});
  }
}

const toolkit = readJson('toolkit.json');
assert.equal(toolkit.course, 'abd-v1');
assert.equal(toolkit.publication, 'unpublished');
for (const resource of toolkit.resources) {
  assert.ok(lessonIds.has(resource.lesson), 'Worksheet references an unknown ABD lesson');
  const lesson = plan.lessons.find(row => row.id === lessonIds.get(resource.lesson));
  assert.ok(typeof resource.instructions === 'string' && resource.instructions.trim(), 'Missing worksheet instructions');
  lesson.body += '\n\nWORKSHEET INSTRUCTIONS\n' + resource.instructions;
  plan.worksheet_templates.push({
    id: stableId('worksheet/' + resource.id), lesson_id: lessonIds.get(resource.lesson),
    template_key: resource.id, version: 1,
    title: resource.id.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' '),
    prompts: resource.fields, published: false,
  });
}
normalize(plan);
process.stdout.write(JSON.stringify(plan) + '\n');
