-- Ephemeral PostgreSQL 17 CI only, never run this against a hosted Supabase project.
-- Requires 001_academy_schema.sql and the auth mock created by the CI workflow.
\set ON_ERROR_STOP on
insert into auth.users(id) values
('10000000-0000-4000-8000-000000000001'),
('10000000-0000-4000-8000-000000000002'),
('10000000-0000-4000-8000-000000000003');
insert into public.academy_courses(id,slug,title,published) values
('20000000-0000-4000-8000-000000000001','test-course','CI academy course',true);
insert into public.academy_modules(id,course_id,position,title) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',1,'Module');
insert into public.academy_lessons(id,module_id,position,title,body,published) values
('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',1,'Lesson','Private test content',true);
insert into public.academy_enrollments(id,user_id,course_id,status) values
('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','active'),
('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','active');
insert into public.academy_private_reflections(enrollment_id,lesson_id,body) values
('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','secret for A'),
('50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','secret for B');
insert into public.academy_submissions(id,enrollment_id,lesson_id,body) values
('60000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','shared A'),
('60000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','shared B');
insert into public.academy_reviewer_assignments(reviewer_user_id,enrollment_id) values
('10000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000001');

-- Check RLS turned on for every Academy table
do $$begin
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname like 'academy_%' and c.relkind='r' and not c.relrowsecurity)
 then raise exception 'Academy table without RLS'; end if;
end $$;

set role authenticated;
set request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
do $$begin
 if (select count(*) from public.academy_enrollments) <> 1 then raise exception 'learner A enrollment isolation failed'; end if;
 if (select count(*) from public.academy_courses) <> 1 then raise exception 'course enrollment-gating failed'; end if;
 if (select count(*) from public.academy_lessons) <> 1 then raise exception 'published lesson enrollment-gating failed'; end if;
 if (select count(*) from public.academy_private_reflections) <> 1 then raise exception 'learner A private reflection isolation failed'; end if;
 if (select body from public.academy_private_reflections limit 1) <> 'secret for A' then raise exception 'wrong learner reflection'; end if;
 if (select count(*) from public.academy_submissions) <> 1 then raise exception 'learner A submission isolation failed'; end if;
end $$;

set request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
do $$begin
 if (select count(*) from public.academy_private_reflections) <> 0 then raise exception 'reviewer leaked private notes'; end if;
 if (select count(*) from public.academy_courses) <> 0 then raise exception 'reviewer accessed paid course without enrollment'; end if;
 if (select count(*) from public.academy_submissions) <> 1 then raise exception 'reviewer assignment isolation failed'; end if;
 if (select body from public.academy_submissions limit 1) <> 'shared A' then raise exception 'reviewer saw unassigned submission'; end if;
end $$;
insert into public.academy_reviews(submission_id,reviewer_user_id,decision,feedback) values
('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','approved','Nice');

-- Ensure this reviewer cannot self-assign or create a billing entitlement.
do $$begin
 begin
  insert into public.academy_reviewer_assignments(reviewer_user_id,enrollment_id)
  values ('10000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000002');
  raise exception 'FAILED: reviewer was able to self-assign';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.academy_enrollments(user_id,course_id,status)
  values ('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','active');
  raise exception 'FAILED: client created entitlement';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
