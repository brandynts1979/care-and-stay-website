import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db = new PGlite();
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
insert into auth.users(id,email_confirmed_at) select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,now() from generate_series(1,6)n;
update auth.users set email_confirmed_at=null where id='${uid(6)}';`);
await db.exec(await readFile(new URL('../../internal/forum/schema.sql', import.meta.url),'utf8'));
async function call(n, action, payload={},role='authenticated') {
 await db.exec(`set role ${role}`);
 try {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?uid(n):'']);
  const res=await db.query('select public.cs_forum_request($1,$2::jsonb) as data',[action,JSON.stringify(payload)]);
  return res.rows[0].data;
 } finally {await db.exec('reset role');}
}
const family='family-caregivers',dd='dd-families';
const join=(n,c=family,extra={})=>call(n,'join',{community:c,display_name:`Member ${n}`,adult:true,terms_version:'pilot-v1',...extra});
const post=(n,c=family,extra={})=>call(n,'create',{community:c,title:'A fictional question',body:'Fictional test message',topic:'everyday',...extra});
let root,reply;
await test('deployment starts closed, even for verified users',async()=>{
 await assert.rejects(()=>call(1,'me'),/not open/);
 await db.exec('update cs_forum_private.settings set enabled=true');
});
await test('anonymous, unverified and anonymous-auth users cannot enter',async()=>{
 await assert.rejects(()=>call(null,'me',{},'anon'),/permission denied/);
 await assert.rejects(()=>call(null,'me'),/verified/);
 await assert.rejects(()=>call(6,'me'),/verified/);
 await db.exec(`update auth.users set is_anonymous=true where id='${uid(5)}'`);
 await assert.rejects(()=>call(5,'me'),/verified/);
 await db.exec(`update auth.users set is_anonymous=false where id='${uid(5)}'`);
});
await test('joining requires adult attestation and current terms',async()=>{
 await assert.rejects(()=>join(1,family,{adult:false}),/Confirm/);
 await assert.rejects(()=>join(1,family,{terms_version:'old'}),/Confirm/);
 await join(1); await join(2,dd); await join(3); await join(4); await join(5,dd);
});
await test('client-supplied roles and author IDs cannot elevate access or impersonate',async()=>{
 await join(1,family,{role:'moderator',status:'active',user_id:uid(4)});
 assert.equal((await call(1,'me')).memberships[0].role,'member');
 root=(await post(1,family,{author_id:uid(4)})).id;
 assert.equal((await call(1,'thread',{community:family,id:root})).mine,true);
 await assert.rejects(()=>call(1,'moderation',{community:family}),/Moderator/);
 await assert.rejects(()=>call(1,'hide',{community:family,id:root,reason:'Invalid escalation'}),/Moderator/);
});
await test('membership is required, including direct-ID and cross-community requests',async()=>{
 await assert.rejects(()=>call(2,'list',{community:family}),/Join/);
 await assert.rejects(()=>call(2,'thread',{community:dd,id:root}),/unavailable/);
 await assert.rejects(()=>call(2,'reply',{community:dd,id:root,body:'Cross community'}),/unavailable/);
 await assert.rejects(()=>call(2,'report',{community:dd,id:root,reason:'Cross community'}),/unavailable/);
 assert.equal((await call(2,'list',{community:dd})).length,0);
});
await test('rate limits hold across message operations',async()=>{
 await assert.rejects(()=>post(1),/30 seconds/);
 await assert.rejects(()=>call(1,'reply',{community:family,id:root,body:'Too soon'}),/30 seconds/);
 reply=(await call(3,'reply',{community:family,id:root,body:'A fictional reply'})).id;
 assert.equal((await call(1,'thread',{community:family,id:root})).replies.length,1);
});
await test('members cannot remove each other’s posts or read private tables',async()=>{
 await assert.rejects(()=>call(3,'delete_own',{community:family,id:root}),/only your own/);
 await db.exec('set role authenticated');
 try {await assert.rejects(()=>db.query('select * from cs_forum_private.members'),/permission denied/);}finally{await db.exec('reset role');}
});
await test('reports are idempotent and visible only to moderators of that community',async()=>{
 await call(3,'report',{community:family,id:root,reason:'Fictional moderation concern'});
 await call(3,'report',{community:family,id:root,reason:'Duplicate report'});
 await db.exec(`update cs_forum_private.members set role='moderator' where user_id in ('${uid(4)}','${uid(5)}')`);
 assert.equal((await call(4,'moderation',{community:family})).length,1);
 assert.equal((await call(5,'moderation',{community:dd})).length,0);
 await assert.rejects(()=>call(5,'hide',{community:dd,id:root,reason:'Cross community'}),/unavailable/);
});
await test('hidden roots also block access and replies to their descendants',async()=>{
 await call(4,'hide',{community:family,id:root,reason:'Testing moderator removal'});
 assert.equal((await call(1,'list',{community:family})).length,0);
 await assert.rejects(()=>call(1,'thread',{community:family,id:root}),/unavailable/);
 await assert.rejects(()=>call(3,'report',{community:family,id:reply,reason:'Hidden parent'}),/unavailable/);
 await call(4,'restore',{community:family,id:root,reason:'Testing moderator restore'});
 assert.equal((await call(1,'list',{community:family})).length,1);
});
await test('suspended members cannot rejoin, read, post, or remove their suspension',async()=>{
 await call(4,'suspend',{community:family,user_id:uid(1),reason:'Fictional suspension test'});
 await assert.rejects(()=>join(1),/paused/);
 await assert.rejects(()=>call(1,'list',{community:family}),/paused/);
 await assert.rejects(()=>post(1),/paused/);
 await assert.rejects(()=>call(1,'reinstate',{community:family,user_id:uid(1),reason:'Self reinstatement'}),/paused/);
 await assert.rejects(()=>call(4,'suspend',{community:family,user_id:uid(4),reason:'Self suspension'}),/protected/);
 await call(4,'reinstate',{community:family,user_id:uid(1),reason:'Fictional test complete'});
});
await test('report resolution is audited and removes it from the queue',async()=>{
 await call(4,'resolve',{community:family,id:root,reason:'Fictional concern reviewed'});
 assert.equal((await call(4,'moderation',{community:family})).length,0);
 const audit=await db.query('select count(*)::int as n from cs_forum_private.audit');
 assert.equal(audit.rows[0].n,5);
});
await test('own removal erases body, leaving revokes access, and settings close access',async()=>{
 await call(3,'delete_own',{community:family,id:reply});
 assert.equal((await call(1,'thread',{community:family,id:root})).replies.length,0);
 assert.equal((await db.query('select body from cs_forum_private.messages where id=$1',[reply])).rows[0].body,'[Removed by author]');
 await call(3,'leave',{community:family});
 await assert.rejects(()=>call(3,'list',{community:family}),/Join/);
 await db.exec('update cs_forum_private.settings set enabled=false');
 await assert.rejects(()=>call(4,'moderation',{community:family}),/not open/);
});
await db.close();
