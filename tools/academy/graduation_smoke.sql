-- This uses disposable PostgreSQL CI with the seeded fixtures from rls_smoke.sql.
\set ON_ERROR_STOP on
do $$begin
  if has_schema_privilege('authenticated','academy_internal','USAGE') then
    raise exception 'Graduation schema leaked to browser role';
  end if;
  if has_function_privilege('authenticated','academy_internal.finalize_graduation(uuid,uuid)','EXECUTE') then
    raise exception 'Browser can execute graduation function';
  end if;
  if has_table_privilege('authenticated','public.academy_graduations','INSERT') then
    raise exception 'Browser can write graduation directly';
  end if;
end $$;

-- The reviewer approved submission from the previous security test.
-- Graduation must fail until the actual lesson progress exists.
do $$begin
  begin
    perform academy_internal.finalize_graduation(
      '50000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000003'
    );
    raise exception 'FAILED: incomplete learner graduated';
  exception
    when others then
      if SQLERRM <> 'Course lessons incomplete' then raise; end if;
  end;
end $$;

insert into public.academy_lesson_progress(enrollment_id,lesson_id)
values('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001');
select academy_internal.finalize_graduation(
  '50000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000003'
);
do $$begin
  if (select count(*) from public.academy_graduations where enrollment_id='50000000-0000-4000-8000-000000000001')<>1
  then raise exception 'Graduate record not created';end if;
  if (select status from public.academy_enrollments where id='50000000-0000-4000-8000-000000000001')<>'completed'
  then raise exception 'Graduation entitlement status not completed';end if;
  if exists (select 1 from public.academy_graduations where enrollment_id='50000000-0000-4000-8000-000000000002')
  then raise exception 'Unassigned learner graduated';end if;
end $$;
