begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
('00000000-0000-4000-8000-000000009931','closure-test@example.invalid',now(),false),
('00000000-0000-4000-8000-000000009932','closure-reply-test@example.invalid',now(),false);
insert into cs_forum_private.members(community,user_id,display_name,terms_version) values('family-caregivers','00000000-0000-4000-8000-000000009931','Closure test','test-fixture');
insert into cs_forum_private.messages(id,community,author_id,topic,title,body) values('00000000-0000-4000-8000-000000009933','family-caregivers','00000000-0000-4000-8000-000000009931','everyday','Fictional private title','Fictional private body');
insert into cs_forum_private.messages(id,community,author_id,parent_id,topic,body) values('00000000-0000-4000-8000-000000009934','family-caregivers','00000000-0000-4000-8000-000000009932','00000000-0000-4000-8000-000000009933','everyday','Other member reply');
do $test$
declare r jsonb;
begin
 r:=cs_forum_private.close_account('00000000-0000-4000-8000-000000009931');
 if r->>'executed'<>'false' or not exists(select 1 from auth.users where id='00000000-0000-4000-8000-000000009931') then raise exception 'Preview mutated data'; end if;
 if has_function_privilege('authenticated','cs_forum_private.close_account(uuid,boolean)','execute') or has_function_privilege('anon','cs_forum_private.close_account(uuid,boolean)','execute') then raise exception 'Client can delete accounts'; end if;
 perform cs_forum_private.close_account('00000000-0000-4000-8000-000000009931',true);
 if exists(select 1 from auth.users where id='00000000-0000-4000-8000-000000009931') then raise exception 'Account remains'; end if;
 if not exists(select 1 from cs_forum_private.messages where id='00000000-0000-4000-8000-000000009933' and author_id is null and body='[Removed by author]' and hidden) then raise exception 'Message not scrubbed'; end if;
 if not exists(select 1 from cs_forum_private.messages where id='00000000-0000-4000-8000-000000009934' and body='Other member reply') then raise exception 'Other member content changed'; end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009931',true);
 begin perform public.cs_forum_request('me','{}'); raise exception 'Deleted user retains access'; exception when insufficient_privilege then null; end;
end $test$;
rollback;
select 'PASS: preview is read-only; clients denied; test account removed; authored content scrubbed; other replies preserved; stale identity blocked; fixture changes rolled back' as result;