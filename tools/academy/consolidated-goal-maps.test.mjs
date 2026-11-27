import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../../academy/learn/goal-maps.js',import.meta.url),'utf8');
const sandbox={window:{}};runInNewContext(source,sandbox);const maps=JSON.parse(JSON.stringify(sandbox.window.ACADEMY_GOAL_MAPS));
const canonical=[['Authenticity and self-awareness','V2-01-02','V2-02-01','V2-02-02'],['Trust and psychological safety','V2-07-01','V2-07-03','V2-07-04'],['Listening and coaching','V2-03-01','V2-03-02','V2-04-03'],['Appreciation and strengths','V2-04-02','V2-08-03','V2-03-03'],['Purpose and direction','V2-01-01','V2-03-04','V2-08-01'],['Accountability and constructive conflict','V2-05-01','V2-06-03','V2-06-04'],['Growth and sustainable leadership','V2-04-04','V2-08-02','V2-08-04']];
function id(key){const b=createHash('sha256').update('care-and-stay/curriculum/'+key).digest().subarray(0,16);b[6]=(b[6]&15)|128;b[8]=(b[8]&63)|128;const h=b.toString('hex');return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-')}
test('both consolidated manual goal maps match private deterministic identities and only public-safe labels',()=>{
 const seen=new Set();
 for(const slug of ['stay-culture-leadership-academy-senior-care-v2','stay-culture-leadership-academy-hospice-v2']){
  const entry=maps[id(slug)];assert.deepEqual(entry,{slug,goals:canonical.map(([label,...lessons])=>({label,lessons:lessons.map(x=>id(slug+'/'+x))}))});
  for(const lesson of entry.goals.flatMap(g=>g.lessons)){assert.ok(!seen.has(lesson));seen.add(lesson)}
 }
 assert.equal(seen.size,42);
 assert.ok(maps['eebba15b-b30f-8f72-bd7f-3e1fc9471589']);assert.ok(maps['bbfa9397-aae5-864c-ab72-bfcf448fd715']);
});
test('learner recommendation renderer restricts to exact course and accessible lesson actions',()=>{
 const app=readFileSync(new URL('../../academy/learn/app.js',import.meta.url),'utf8');
 assert.match(app,/ACADEMY_GOAL_MAPS\?\.\[course\.id\]/);
 assert.match(app,/map\?\.slug !== course\.slug/);
 assert.match(app,/goal\.lessons\.map\(id => lessonActions\.get\(id\)\)\.filter\(Boolean\)/);
});
