-- Deployment candidate, NOT applied to a hosted project.
-- Run once as database owner in a dedicated community staging project.
begin;
create schema cs_forum_private;
revoke all on schema cs_forum_private from public, anon, authenticated;
create table cs_forum_private.settings (
 id boolean primary key default true check (id),
 enabled boolean not null default false,
 terms_version text not null default 'pilot-v1'
);
insert into cs_forum_private.settings default values;
create table cs_forum_private.members (
 community text not null check (community in ('family-caregivers','dd-families')),
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check (length(btrim(display_name)) between 2 and 50),
 role text not null default 'member' check (role in ('member','moderator')),
 status text not null default 'active' check (status in ('active','suspended','left')),
 terms_version text not null,
 accepted_at timestamptz not null default now(),
 primary key (community,user_id)
);
create table cs_forum_private.messages (
 id uuid primary key default gen_random_uuid(),
 community text not null check (community in ('family-caregivers','dd-families')),
 author_id uuid references auth.users(id) on delete set null,
 parent_id uuid references cs_forum_private.messages(id) on delete cascade,
 topic text not null check (topic in ('everyday','resources','family')),
 title text check (length(title) between 3 and 160),
 body text not null check (length(btrim(body)) between 1 and 8000),
 hidden boolean not null default false,
 created_at timestamptz not null default now(),
 check ((parent_id is null and title is not null) or (parent_id is not null and title is null))
);
create index messages_community_date on cs_forum_private.messages(community,created_at desc,id desc);
create index messages_parent_date on cs_forum_private.messages(parent_id,created_at,id);
create index messages_author_date on cs_forum_private.messages(author_id,created_at desc);
create table cs_forum_private.reports (
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null references cs_forum_private.messages(id) on delete cascade,
 reporter_id uuid references auth.users(id) on delete set null,
 reason text not null check(length(btrim(reason)) between 5 and 1000),
 resolved boolean not null default false,
 created_at timestamptz not null default now(),
 unique(message_id,reporter_id)
);
create table cs_forum_private.audit (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id) on delete set null,
 community text not null,
 action text not null,
 target_id uuid,
 reason text not null check(length(btrim(reason)) between 5 and 1000),
 created_at timestamptz not null default now()
);
alter table cs_forum_private.settings enable row level security;
alter table cs_forum_private.members enable row level security;
alter table cs_forum_private.messages enable row level security;
alter table cs_forum_private.reports enable row level security;
alter table cs_forum_private.audit enable row level security;
revoke all on all tables in schema cs_forum_private from public, anon, authenticated;
revoke all on all sequences in schema cs_forum_private from public, anon, authenticated;

-- One bounded gateway. The definer is required to access private, non-API tables.
-- Every action checks the authenticated actor and community; no dynamic SQL.
create function cs_forum_private.request(action text, payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 actor uuid := auth.uid();
 c text := payload->>'community';
 member cs_forum_private.members%rowtype;
 msg cs_forum_private.messages%rowtype;
 new_id uuid;
 target uuid;
 result jsonb;
 expected_terms text;
 name text := btrim(payload->>'display_name');
 content text := btrim(payload->>'body');
 reason_text text := btrim(payload->>'reason');
 page_offset integer := least(10000,greatest(0,coalesce((payload->>'offset')::integer,0)));
 is_mod boolean;
begin
 if actor is null or not exists (
  select 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null
   and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until < now())
 ) then raise exception 'Please sign in with a verified email account.' using errcode='42501'; end if;
 select terms_version into expected_terms from cs_forum_private.settings where enabled;
 if expected_terms is null then raise exception 'Community access is not open yet.' using errcode='42501'; end if;
 if action='me' then
  select coalesce(jsonb_agg(jsonb_build_object('community',m.community,'display_name',m.display_name,'role',m.role,'status',m.status)),'[]'::jsonb)
   into result from cs_forum_private.members m where m.user_id=actor;
  return jsonb_build_object('memberships',result,'terms_version',expected_terms);
 end if;
 if c is null or c not in ('family-caregivers','dd-families') then raise exception 'Choose a valid community.'; end if;
 -- Serialize writes from the same account, including rate-limit checks and joins.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 select * into member from cs_forum_private.members m where m.community=c and m.user_id=actor;
 if member.status='suspended' then raise exception 'Your access to this community is paused. Contact Care & Stay.' using errcode='42501'; end if;
 if action='join' then
  if payload->>'terms_version' is distinct from expected_terms or payload->>'adult' is distinct from 'true' then
   raise exception 'Confirm you are 18 or older and accept the current community guidelines.';
  end if;
  if name is null or length(name) not between 2 and 50 then raise exception 'Use a display name of 2–50 characters.'; end if;
  insert into cs_forum_private.members(community,user_id,display_name,terms_version)
   values(c,actor,name,expected_terms)
   on conflict(community,user_id) do update set status='active',display_name=excluded.display_name,
    terms_version=excluded.terms_version,accepted_at=now();
  return jsonb_build_object('ok',true);
 end if;
 if member.status is distinct from 'active' then raise exception 'Join this community to continue.' using errcode='42501'; end if;
 is_mod := member.role='moderator';
 if action='profile' then
  if name is null or length(name) not between 2 and 50 then raise exception 'Use a display name of 2–50 characters.'; end if;
  update cs_forum_private.members set display_name=name where community=c and user_id=actor;
  return jsonb_build_object('ok',true);
 elsif action='leave' then
  if is_mod then raise exception 'Transfer moderation responsibility before leaving.'; end if;
  update cs_forum_private.members set status='left' where community=c and user_id=actor;
  return jsonb_build_object('ok',true);
 elsif action='list' then
  select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into result from (
   select m.id,m.title,m.topic,m.created_at,coalesce(n.display_name,'Former member') as author,
    m.author_id=actor as mine
   from cs_forum_private.messages m left join cs_forum_private.members n on n.community=m.community and n.user_id=m.author_id
   where m.community=c and m.parent_id is null and not m.hidden
    and (nullif(payload->>'topic','') is null or m.topic=payload->>'topic')
   order by m.created_at desc,m.id desc limit 21 offset page_offset
  )t;
  return result;
 elsif action='create' then
  if content is null or length(content) not between 1 and 8000 or length(btrim(coalesce(payload->>'title',''))) not between 3 and 160 then
   raise exception 'Add a title (3–160 characters) and message (1–8,000 characters).'; end if;
  if exists(select 1 from cs_forum_private.messages where author_id=actor and created_at > now()-interval '30 seconds') then
   raise exception 'Please wait 30 seconds between messages.'; end if;
  insert into cs_forum_private.messages(community,author_id,topic,title,body)
   values(c,actor,payload->>'topic',btrim(payload->>'title'),content) returning id into new_id;
  return jsonb_build_object('id',new_id);
 elsif action='moderation' then
  if not is_mod then raise exception 'Moderator access required.' using errcode='42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into result from (
   select r.id,r.reason,r.created_at,m.id as message_id,m.author_id,m.body,m.title,m.hidden,
     coalesce(n.display_name,'Former member') as author
   from cs_forum_private.reports r join cs_forum_private.messages m on m.id=r.message_id
   left join cs_forum_private.members n on n.community=m.community and n.user_id=m.author_id
   where m.community=c and not r.resolved order by r.created_at,r.id limit 21 offset page_offset
  )t;
  return result;
 elsif action in ('suspend','reinstate') then
  if not is_mod then raise exception 'Moderator access required.' using errcode='42501'; end if;
  target := (payload->>'user_id')::uuid;
  if reason_text is null or length(reason_text) not between 5 and 1000 then raise exception 'Record a reason (5–1,000 characters).'; end if;
  update cs_forum_private.members set status=case when action='suspend' then 'suspended' else 'active' end
   where community=c and user_id=target and role='member';
  if not found then raise exception 'Member not found or protected moderator account.'; end if;
  insert into cs_forum_private.audit(actor_id,community,action,target_id,reason) values(actor,c,action,target,reason_text);
  return jsonb_build_object('ok',true);
 end if;
 -- All remaining actions are scoped to an existing message in this community.
 select * into msg from cs_forum_private.messages where id=(payload->>'id')::uuid and community=c;
 if msg.id is null then raise exception 'Discussion unavailable.' using errcode='42501'; end if;
 if action in ('hide','restore','resolve') then
  if not is_mod then raise exception 'Moderator access required.' using errcode='42501'; end if;
  if reason_text is null or length(reason_text) not between 5 and 1000 then raise exception 'Record a reason (5–1,000 characters).'; end if;
  if action in ('hide','restore') then update cs_forum_private.messages set hidden=(action='hide') where id=msg.id;
  else update cs_forum_private.reports set resolved=true where message_id=msg.id; end if;
  insert into cs_forum_private.audit(actor_id,community,action,target_id,reason) values(actor,c,action,msg.id,reason_text);
  return jsonb_build_object('ok',true);
 end if;
 if msg.hidden or (msg.parent_id is not null and not exists(select 1 from cs_forum_private.messages where id=msg.parent_id and not hidden)) then
  raise exception 'Discussion unavailable.' using errcode='42501'; end if;
 if action='thread' then
  if msg.parent_id is not null then raise exception 'Choose a discussion.'; end if;
  select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into result from (
   select m.id,m.body,m.created_at,coalesce(n.display_name,'Former member') as author,m.author_id=actor as mine,
    case when is_mod then m.author_id else null end as author_id
   from cs_forum_private.messages m left join cs_forum_private.members n on n.community=m.community and n.user_id=m.author_id
   where m.parent_id=msg.id and not m.hidden order by m.created_at,m.id limit 21 offset page_offset
  )t;
  return jsonb_build_object('id',msg.id,'title',msg.title,'body',msg.body,'topic',msg.topic,'created_at',msg.created_at,
   'author',coalesce((select display_name from cs_forum_private.members where community=c and user_id=msg.author_id),'Former member'),
   'mine',msg.author_id=actor,'author_id',case when is_mod then msg.author_id else null end,'replies',result);
 elsif action='reply' then
  if msg.parent_id is not null then raise exception 'Reply to the discussion, not another reply.'; end if;
  if content is null or length(content) not between 1 and 8000 then raise exception 'Write a message of 1–8,000 characters.'; end if;
  if exists(select 1 from cs_forum_private.messages where author_id=actor and created_at > now()-interval '30 seconds') then raise exception 'Please wait 30 seconds between messages.'; end if;
  insert into cs_forum_private.messages(community,author_id,parent_id,topic,body) values(c,actor,msg.id,msg.topic,content) returning id into new_id;
  return jsonb_build_object('id',new_id);
 elsif action='report' then
  if reason_text is null or length(reason_text) not between 5 and 1000 then raise exception 'Describe the concern in 5–1,000 characters.'; end if;
  if (select count(*) from cs_forum_private.reports where reporter_id=actor and created_at>now()-interval '1 hour') >=10 then raise exception 'Report limit reached. Contact Care & Stay for further concerns.'; end if;
  insert into cs_forum_private.reports(message_id,reporter_id,reason) values(msg.id,actor,reason_text)
   on conflict(message_id,reporter_id) do nothing;
  return jsonb_build_object('ok',true);
 elsif action='delete_own' then
  if msg.author_id is distinct from actor then raise exception 'You can remove only your own messages.' using errcode='42501'; end if;
  update cs_forum_private.messages set hidden=true,body='[Removed by author]',title=case when parent_id is null then '[Removed by author]' else null end where id=msg.id;
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Unknown community action.';
end $$;
revoke all on function cs_forum_private.request(text,jsonb) from public,anon,authenticated;
grant usage on schema cs_forum_private to authenticated;
grant execute on function cs_forum_private.request(text,jsonb) to authenticated;
create function public.cs_forum_request(action text,payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
 select cs_forum_private.request(action,payload);
$$;
revoke all on function public.cs_forum_request(text,jsonb) from public,anon;
grant execute on function public.cs_forum_request(text,jsonb) to authenticated;
commit;
