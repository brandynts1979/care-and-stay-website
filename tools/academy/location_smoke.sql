-- Disposable PostgreSQL integration test, after migrations 001-003.
\set ON_ERROR_STOP on
insert into public.academy_locations(id,name,billing_owner_id,stripe_subscription_id,subscription_status)
values
('70000000-0000-4000-8000-000000000001','QSR North','10000000-0000-4000-8000-000000000001','sub_locationA','active'),
('70000000-0000-4000-8000-000000000002','QSR South','10000000-0000-4000-8000-000000000002','sub_locationB','active');
insert into public.academy_location_members(location_id,user_id,role)
values
('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','owner'),
('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','manager'),
('70000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','owner');
insert into public.academy_invitations(location_id,invited_email,intended_role,invited_by,token_digest,expires_at)
values ('70000000-0000-4000-8000-000000000001','worker@example.com','manager',
'10000000-0000-4000-8000-000000000001',repeat('f',64),now()+interval '7 days');
-- Multiple manager enrollments must share one restaurant subscription.
insert into public.academy_enrollments(user_id,location_id,course_id,status,stripe_subscription_id)
values
('10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',
 '20000000-0000-4000-8000-000000000001','active','sub_locationA'),
('10000000-0000-4000-8000-000000000003','70000000-0000-4000-8000-000000000001',
 '20000000-0000-4000-8000-000000000001','active','sub_locationA');

do $$begin
 if (select count(*) from public.academy_enrollments where stripe_subscription_id='sub_locationA') <> 2
 then raise exception 'Unlimited shared subscription seats failed';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('academy_locations','academy_location_members','academy_invitations') and not c.relrowsecurity)
 then raise exception 'Location table missing RLS';end if;
end $$;

set role authenticated;
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
do $$begin
 if (select count(*) from public.academy_locations) <> 1 then raise exception 'Owner accessed a different location';end if;
 if (select count(*) from public.academy_location_members) <> 1 then raise exception 'Owner unexpectedly accessed others via browser';end if;
 if (select count(*) from public.academy_invitations) <> 1 then raise exception 'Owner invitation visibility failed';end if;
end $$;
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
do $$begin
 if (select count(*) from public.academy_locations) <> 1 then raise exception 'Manager location access failed';end if;
 if (select count(*) from public.academy_invitations) <> 0 then raise exception 'Manager accessed owner invitations';end if;
end $$;
-- The frontend is never allowed to forge billing, invitations, or manager roles.
do $$begin
 if has_table_privilege('authenticated','public.academy_locations','UPDATE') then raise exception 'Client can change subscription'; end if;
 if has_table_privilege('authenticated','public.academy_location_members','INSERT') then raise exception 'Client can grant membership'; end if;
 if has_table_privilege('authenticated','public.academy_invitations','INSERT') then raise exception 'Client can forge invitation'; end if;
end $$;
reset role;
