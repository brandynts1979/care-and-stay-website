-- Disposable PostgreSQL checks for the paid-location content gate.
\set ON_ERROR_STOP on
set role authenticated;
set request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
do $$begin
 if (select count(*) from public.academy_courses) <> 1 then
  raise exception 'Paid owner cannot access course';
 end if;
end $$;
set request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
do $$begin
 if (select count(*) from public.academy_courses) <> 1 then
  raise exception 'Paid manager cannot access course';
 end if;
end $$;
reset role;
update public.academy_location_members set active=false
 where location_id='70000000-0000-4000-8000-000000000001'
 and user_id='10000000-0000-4000-8000-000000000003';
set role authenticated;
set request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
do $$begin
 if (select count(*) from public.academy_courses) <> 0 then
  raise exception 'Removed manager still has course access';
 end if;
end $$;
reset role;
update public.academy_locations set subscription_status='canceled'
 where id='70000000-0000-4000-8000-000000000001';
set role authenticated;
set request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
do $$begin
 if (select count(*) from public.academy_courses) <> 0 then
  raise exception 'Canceled restaurant still has course access';
 end if;
end $$;
reset role;
