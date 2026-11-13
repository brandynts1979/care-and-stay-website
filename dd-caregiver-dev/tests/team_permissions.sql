-- Care & Stay DD Care Team RLS regression checks.
-- Runs inside a single transaction and ALWAYS rolls back.
-- Requires 2 existing verified test identities; writes only fictional fixture rows.
BEGIN;
SELECT set_config('dd_test.owner_id',id::text,true),set_config('dd_test.owner_email',email,true)
FROM (SELECT id,email FROM auth.users WHERE email IS NOT NULL ORDER BY created_at LIMIT 1) a;
SELECT set_config('dd_test.member_id',id::text,true),set_config('dd_test.member_email',email,true)
FROM (SELECT id,email FROM auth.users WHERE email IS NOT NULL ORDER BY created_at OFFSET 1 LIMIT 1) b;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
 owner_id uuid:=current_setting('dd_test.owner_id')::uuid;
 member_id uuid:=current_setting('dd_test.member_id')::uuid;
 owner_email text:=current_setting('dd_test.owner_email');
 member_email text:=current_setting('dd_test.member_email');
 p uuid; s uuid; g uuid; i uuid; n int;
BEGIN
 IF owner_id=member_id THEN RAISE EXCEPTION 'Need two accounts'; END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',owner_id,'email',owner_email,'role','authenticated')::text,true);
 INSERT INTO public.dd_people(owner_id,display_name) VALUES(owner_id,'AUTOTEST Fictional profile') RETURNING id INTO p;
 INSERT INTO public.dd_strengths(owner_id,person_id,description) VALUES(owner_id,p,'Enjoys cooking') RETURNING id INTO s;
 INSERT INTO public.dd_goals(owner_id,person_id,strength_id,goal_text) VALUES(owner_id,p,s,'Prepare a favorite snack') RETURNING id INTO g;
 INSERT INTO public.dd_goal_steps(owner_id,person_id,goal_id,step_text) VALUES(owner_id,p,g,'Choose ingredients');
 INSERT INTO public.dd_progress_notes(owner_id,person_id,goal_id,observation) VALUES(owner_id,p,g,'Prepared snack with prompting');
 INSERT INTO public.dd_team_invitations(owner_id,person_id,invitee_email,role,authority_confirmed)
 VALUES(owner_id,p,member_email,'family_supporter',true) RETURNING id INTO i;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',member_id,'email',member_email,'role','authenticated')::text,true);
 SELECT count(*) INTO n FROM public.dd_team_invitations WHERE id=i;
 IF n<>1 THEN RAISE EXCEPTION 'Invite not visible'; END IF;
 SELECT count(*) INTO n FROM public.dd_people WHERE id=p;
 IF n<>0 THEN RAISE EXCEPTION 'Pending invite disclosed profile'; END IF;
 UPDATE public.dd_team_invitations SET status='accepted',invitee_user_id=member_id WHERE id=i;
 IF NOT FOUND THEN RAISE EXCEPTION 'Acceptance failed'; END IF;
 SELECT count(*) INTO n FROM public.dd_people WHERE id=p;
 IF n<>1 THEN RAISE EXCEPTION 'Shared profile inaccessible'; END IF;
 SELECT count(*) INTO n FROM public.dd_strengths WHERE person_id=p;
 IF n<>1 THEN RAISE EXCEPTION 'Shared strengths inaccessible'; END IF;
 SELECT count(*) INTO n FROM public.dd_goals WHERE person_id=p;
 IF n<>1 THEN RAISE EXCEPTION 'Shared goals inaccessible'; END IF;
 SELECT count(*) INTO n FROM public.dd_goal_steps WHERE person_id=p;
 IF n<>1 THEN RAISE EXCEPTION 'Shared steps inaccessible'; END IF;
 SELECT count(*) INTO n FROM public.dd_progress_notes WHERE person_id=p;
 IF n<>1 THEN RAISE EXCEPTION 'Shared progress inaccessible'; END IF;
 UPDATE public.dd_people SET display_name='UNAUTHORIZED' WHERE id=p;
 IF FOUND THEN RAISE EXCEPTION 'Read-only member edited profile'; END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',owner_id,'email',owner_email,'role','authenticated')::text,true);
 DELETE FROM public.dd_team_invitations WHERE id=i;
 IF NOT FOUND THEN RAISE EXCEPTION 'Owner revoke failed'; END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',member_id,'email',member_email,'role','authenticated')::text,true);
 SELECT count(*) INTO n FROM public.dd_people WHERE id=p;
 IF n<>0 THEN RAISE EXCEPTION 'Revoked member can still read profile'; END IF;
 SELECT count(*) INTO n FROM public.dd_progress_notes WHERE person_id=p;
 IF n<>0 THEN RAISE EXCEPTION 'Revoked member can still read progress'; END IF;
END
$test$;
ROLLBACK;
SELECT 'PASS: Care Team invitation and revocation regression (rolled back)' AS result;