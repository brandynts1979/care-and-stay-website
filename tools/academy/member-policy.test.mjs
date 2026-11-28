import test from 'node:test';
import assert from 'node:assert/strict';
import {canDeactivateMember, summarizeTeamProgress} from '../../academy/edge-functions/academy-manager/member-policy.mjs';
test('owners may remove GM/manager/shift lead, never owners or billing owner',()=>{
  for(const role of ['gm','manager','shift_leader']) assert.equal(canDeactivateMember('owner',role,false),true);
  assert.equal(canDeactivateMember('owner','owner',false),false);
  assert.equal(canDeactivateMember('owner','manager',true),false);
});
test('GM cannot remove another GM, owner, billing owner, unknown role or act as learner',()=>{
  assert.equal(canDeactivateMember('gm','gm',false),false);
  assert.equal(canDeactivateMember('gm','owner',false),false);
  assert.equal(canDeactivateMember('gm','manager',true),false);
  assert.equal(canDeactivateMember('gm','manager',false),true);
  assert.equal(canDeactivateMember('gm','shift_leader',false),true);
  assert.equal(canDeactivateMember('gm','admin',false),false);
  assert.equal(canDeactivateMember('manager','shift_leader',false),false);
});
test('summary scopes location, active membership, enrollment and published course lessons; deduplicates progress',()=>{
  const members=[{user_id:'u1',role:'manager',active:true,added_at:'2026-11-25',private_reflection:'must not leak'},
    {user_id:'u2',role:'shift_leader',active:false},{user_id:'u3',role:'gm',active:true}];
  const enrollments=[{id:'e1',location_id:'a',user_id:'u1',course_id:'c1',status:'active'},
    {id:'e2',location_id:'b',user_id:'u1',course_id:'c1',status:'active'},
    {id:'e3',location_id:'a',user_id:'u2',course_id:'c1',status:'active'},
    {id:'e4',location_id:'a',user_id:'outsider',course_id:'c1',status:'active'},
    {id:'e5',location_id:'a',user_id:'u3',course_id:'c2',status:'completed'}];
  const courses=[{id:'c1',title:'Foundations'},{id:'c2',title:'Advanced'}];
  const modules=[{id:'m1',course_id:'c1'},{id:'m2',course_id:'c2'}];
  const lessons=[{id:'l1',module_id:'m1',published:true},{id:'l2',module_id:'m1',published:true},
    {id:'draft',module_id:'m1',published:false},{id:'l3',module_id:'m2',published:true}];
  const progress=[{enrollment_id:'e1',lesson_id:'l1'},{enrollment_id:'e1',lesson_id:'l1'},
    {enrollment_id:'e1',lesson_id:'l3'},{enrollment_id:'e1',lesson_id:'draft'},
    {enrollment_id:'e2',lesson_id:'l2'},{enrollment_id:'e3',lesson_id:'l2'},
    {enrollment_id:'e4',lesson_id:'l2'},{enrollment_id:'e5',lesson_id:'l3'}];
  const actual=summarizeTeamProgress('a',members,enrollments,courses,modules,lessons,progress);
  assert.deepEqual(actual[0].progress,[{course_id:'c1',course_title:'Foundations',status:'active',lessons_completed:1,lessons_total:2}]);
  assert.deepEqual(actual[1].progress,[]);
  assert.deepEqual(actual[2].progress,[{course_id:'c2',course_title:'Advanced',status:'completed',lessons_completed:1,lessons_total:1}]);
  assert.equal(JSON.stringify(actual).includes('must not leak'),false);
});
test('empty and zero-lesson courses do not invent completion',()=>{
  assert.deepEqual(summarizeTeamProgress('a',[],[],[],[],[],[]),[]);
  const actual=summarizeTeamProgress('a',[{user_id:'u',role:'manager',active:true}],
    [{id:'e',location_id:'a',user_id:'u',course_id:'c',status:'active'}],[{id:'c',title:'New'}],[],[],[]);
  assert.equal(actual[0].progress[0].lessons_completed,0);
  assert.equal(actual[0].progress[0].lessons_total,0);
});
