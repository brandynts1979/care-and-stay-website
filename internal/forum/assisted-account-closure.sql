-- Operator-only assisted closure. Default is a nonmutating preview.
create or replace function cs_forum_private.close_account(target_user uuid, execute_removal boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare counts jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(target_user::text,0));
 if not exists(select 1 from auth.users where id=target_user) then
  raise exception 'Forum account not found';
 end if;
 if exists(select 1 from cs_forum_private.members m where m.user_id=target_user
  and m.role='moderator' and m.status='active'
  and not exists(select 1 from cs_forum_private.members backup
   where backup.community=m.community and backup.user_id<>target_user
    and backup.role='moderator' and backup.status='active')) then
  raise exception 'Assign a replacement moderator before closing this account';
 end if;
 select jsonb_build_object(
  'memberships',(select count(*) from cs_forum_private.members where user_id=target_user),
  'messages',(select count(*) from cs_forum_private.messages where author_id=target_user),
  'reports',(select count(*) from cs_forum_private.reports r where r.reporter_id=target_user or exists(select 1 from cs_forum_private.messages m where m.id=r.message_id and m.author_id=target_user)),
  'audit_records',(select count(*) from cs_forum_private.audit where actor_id=target_user or target_id=target_user),
  'executed',execute_removal) into counts;
 if not execute_removal then return counts; end if;
 -- Remove report free text relating to this account before authors are anonymized.
 delete from cs_forum_private.reports r where r.reporter_id=target_user or exists(
  select 1 from cs_forum_private.messages m where m.id=r.message_id and m.author_id=target_user);
 update cs_forum_private.messages set body='[Removed by author]',
  title=case when parent_id is null then '[Removed by author]' else null end,
  hidden=true where author_id=target_user;
 update cs_forum_private.audit set actor_id=null,target_id=null,reason='Account removed'
  where actor_id=target_user or target_id=target_user;
 -- Sessions and identities cascade; the request gateway rejects missing users,
 -- including requests with a previously issued access token.
 delete from auth.users where id=target_user;
 return counts;
end $$;
revoke all on function cs_forum_private.close_account(uuid,boolean) from public,anon,authenticated,service_role;
