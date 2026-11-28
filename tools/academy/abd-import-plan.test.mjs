import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyAbdPlan} from './abd-import-plan.mjs';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
function fixture(){
 const course={id:'bbfa9397-aae5-864c-ab72-bfcf448fd715',slug:'stay-culture-appreciative-business-development-v1',title:'Synthetic course',published:false};
 const p={course,modules:[],lessons:[],scenarios:[],choices:[],worksheet_templates:[],care_settings:[],lesson_applications:[]};let next=1;
 for(let m=1;m<=8;m++){const mid=id(next++);p.modules.push({id:mid,course_id:course.id,position:m,title:'Module '+m,overview:'Synthetic'});for(let l=1;l<=4;l++){const lid=id(next++);p.lessons.push({id:lid,module_id:mid,position:l,title:'Lesson '+l,body:'Synthetic',published:false});for(let s=1;s<=2;s++){const sid=id(next++);p.scenarios.push({id:sid,lesson_id:lid,position:s,prompt:'Synthetic question'});for(let c=1;c<=3;c++)p.choices.push({id:id(next++),scenario_id:sid,position:c,choice_text:'Choice '+c,feedback:c===1?'Correct. Synthetic':'Not yet. Synthetic'});}}}
 for(let i=0;i<15;i++)p.worksheet_templates.push({id:id(next++),lesson_id:p.lessons[i].id,template_key:'synthetic-'+i,version:1,title:'Worksheet',prompts:['Prompt'],published:false});
 for(let s=0;s<7;s++){const setting_key='setting_'+s;p.care_settings.push({course_id:course.id,setting_key,label:'Setting '+s,published:false});for(const l of p.lessons)p.lesson_applications.push({course_id:course.id,setting_key,lesson_id:l.id,kind:'case_study',body:'Synthetic case',published:false});}
 return p;
}
test('complete unpublished ABD shape accepted',()=>{const r=verifyAbdPlan(fixture());assert.equal(r.lesson_applications.length,224);assert.equal(r.choices.length,192);});
test('reject incomplete and published plans',()=>{let p=fixture();p.scenarios.pop();assert.throws(()=>verifyAbdPlan(p));p=fixture();p.lesson_applications.pop();assert.throws(()=>verifyAbdPlan(p));p=fixture();p.course.published=true;assert.throws(()=>verifyAbdPlan(p));});
test('reject incorrect course identity, answer key and contextual coverage',()=>{let p=fixture();p.course.slug='stay-culture-other-v1';assert.throws(()=>verifyAbdPlan(p));p=fixture();p.choices[1].feedback='Correct. Duplicate';assert.throws(()=>verifyAbdPlan(p));p=fixture();p.lesson_applications[0].kind='reflection';assert.throws(()=>verifyAbdPlan(p));});
