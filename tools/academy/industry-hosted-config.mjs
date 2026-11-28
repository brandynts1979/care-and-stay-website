// Public-safe deterministic identifiers only; no fixture credentials or content.
import {createHash} from 'node:crypto';
export const STAGING = 'https://dvdvjzqiiekakxzkhora.supabase.co';
export const PREVIEW = 'https://care-and-stay-qsr-staging.onrender.com';
export const ACCEPTANCE_REVISION = 'industry-hosted-v1';
export const ROLES = Object.freeze(['owner','gm','learner','outsider']);
export const canonicalId = key => {
 const b=createHash('sha256').update('care-and-stay/curriculum/'+key).digest().subarray(0,16);
 b[6]=(b[6]&15)|128;b[8]=(b[8]&63)|128;const h=b.toString('hex');
 return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
};
const descriptors=[
 ['senior-care',16,420,['assisted_living','senior_living','skilled_nursing','memory_care'],'V2-01-01'],
 ['hospice',16,456,['hospice','palliative_care','home_health'],'V2-01-01'],
 ['home-care',33,0,[],'V2-01-04'],
 ['dd-services',33,0,[],'V2-01-04'],
 ['hospitality',14,0,[],'V2-01-04']
];
export const PATHWAYS=Object.freeze(Object.fromEntries(descriptors.map(([key,worksheets,contexts,settings,practiceLesson])=>{
 const slug='stay-culture-leadership-academy-'+key+'-v2';
 return [key,Object.freeze({key,slug,courseId:canonicalId(slug),firstModuleId:canonicalId(slug+'/module/1'),modules:8,lessons:32,activities:64,choices:192,worksheets,contexts,settings:Object.freeze(settings),practiceLessonId:canonicalId(slug+'/'+practiceLesson),firstGoal:'Authenticity and self-awareness',firstGoalLessonIds:Object.freeze(['V2-01-02','V2-02-01','V2-02-02'].map(id=>canonicalId(slug+'/'+id)))})];
})));
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const requireTrue=(condition,message)=>{if(!condition)throw Error(message)};
export function validateFixture(fixture){
 requireTrue(fixture?.revision===ACCEPTANCE_REVISION,'Fixture revision mismatch');
 requireTrue(fixture?.staging===STAGING&&fixture?.preview===PREVIEW,'Exact staging origins required');
 requireTrue(/^sb_publishable_[A-Za-z0-9_-]+$/.test(fixture?.publishable_key||''),'Publishable key required');
 const pathway=PATHWAYS[fixture?.pathway];requireTrue(!!pathway,'Unknown industry pathway');
 requireTrue(fixture.course_id===pathway.courseId,'Course identity mismatch');
 requireTrue(uuid.test(fixture.location_id||'')&&/^Synthetic industry QA [a-z0-9 -]{4,80}$/i.test(fixture.location_name||''),'Dedicated synthetic location required');
 requireTrue(fixture.write_fixture===true,'Dedicated mutable fixture approval required');
 const userIds=new Set(),enrollments=new Set(),emails=new Set();
 for(const role of ROLES){
  const a=fixture[role];
  requireTrue(a&&uuid.test(a.user_id||'')&&/^industry-qa-[a-z0-9-]+@example\.(invalid|com|net|org)$/i.test(a.email||'')&&typeof a.password==='string'&&a.password.length>=12,'Dedicated synthetic identity required');
  userIds.add(a.user_id);emails.add(a.email.toLowerCase());
  if(role==='outsider'){requireTrue(a.enrollment_id===null,'Outsider must have no enrollment');continue;}
  requireTrue(uuid.test(a.enrollment_id||''),'Exact synthetic enrollment required');enrollments.add(a.enrollment_id);
 }
 requireTrue(userIds.size===4&&emails.size===4&&enrollments.size===3,'Fixture identities must be disjoint');
 return pathway;
}
export function exactEnrollment(rows,fixture,role){
 if(!Array.isArray(rows))throw Error('Enrollment response invalid');
 if(role==='outsider'){requireTrue(rows.length===0,'Outsider has course access');return null;}
 requireTrue(rows.length===1,'Fixture must have exactly one available enrollment');
 const e=rows[0];requireTrue(e.id===fixture[role].enrollment_id&&e.course_id===fixture.course_id&&e.location_id===fixture.location_id&&e.location_name===fixture.location_name,'Enrollment scope mismatch');
 return e;
}
