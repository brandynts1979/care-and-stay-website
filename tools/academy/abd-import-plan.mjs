// Run against a locally checked out private ABD source directory. Never publish stdout.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalize } from './curriculum-rehearsal.mjs';

export function verifyAbdPlan(plan) {
  const rows=normalize(plan);
  assert.equal(rows.courses[0].id,'bbfa9397-aae5-864c-ab72-bfcf448fd715');
  assert.equal(rows.courses[0].slug,'stay-culture-appreciative-business-development-v1');
  for(const [key,count] of Object.entries({modules:8,lessons:32,scenarios:64,choices:192,worksheet_templates:15,care_settings:7,lesson_applications:224})) {
    assert.equal(rows[key]?.length,count,'Incomplete ABD '+key);
  }
  for(const scenario of rows.scenarios) {
    const choices=rows.choices.filter(c=>c.scenario_id===scenario.id);
    assert.equal(choices.length,3);
    assert.equal(choices.filter(c=>c.feedback.startsWith('Correct.')).length,1);
  }
  const coverage=new Set(rows.lesson_applications.filter(a=>a.kind==='case_study').map(a=>a.setting_key+':'+a.lesson_id));
  for(const setting of rows.care_settings) for(const lesson of rows.lessons)
    assert.ok(coverage.has(setting.setting_key+':'+lesson.id),'Missing contextual lesson');
  return rows;
}
export async function buildAbdPlan(root) {
  const {buildPlan}=await import(pathToFileURL(resolve(root,'platform-import.mjs')).href);
  const {plan,goalMap}=buildPlan();
  verifyAbdPlan(plan);
  const goals=goalMap[plan.course.id]?.goals;
  assert.equal(goals?.length,9);
  for(const goal of goals) for(const lesson of goal.lessons) assert.ok(plan.lessons.some(l=>l.id===lesson));
  return plan;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  assert.equal(process.argv.length,3,'Pass the private academy/business-development directory');
  const plan=await buildAbdPlan(process.argv[2]);
  process.stdout.write(JSON.stringify(plan)+'\n');
}
