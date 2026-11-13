-- Owner-only document metadata checks. All fixture changes rolled back.
BEGIN;
SELECT set_config('dd_docs.owner',id::text,true),set_config('dd_docs.email',email,true)
FROM (SELECT id,email FROM auth.users WHERE email IS NOT NULL ORDER BY created_at LIMIT 1) u;
SELECT set_config('dd_docs.other',id::text,true),set_config('dd_docs.other_email',email,true)
FROM (SELECT id,email FROM auth.users WHERE email IS NOT NULL ORDER BY created_at OFFSET 1 LIMIT 1) u;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE u uuid:=current_setting('dd_docs.owner')::uuid; other uuid:=current_setting('dd_docs.other')::uuid;p uuid;d uuid;n int;
BEGIN
 IF u=other THEN RAISE EXCEPTION 'Two users required';END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',u,'email',current_setting('dd_docs.email'),'role','authenticated')::text,true);
 INSERT INTO public.dd_people(owner_id,display_name) VALUES(u,'AUTOTEST fictional profile') RETURNING id INTO p;
 INSERT INTO public.dd_documents(owner_id,person_id,document_name,category,file_path,media_type,file_size)
 VALUES(u,p,'Fictional sample.pdf','education_iep',u||'/'||p||'/'||gen_random_uuid()||'.pdf','application/pdf',128)
 RETURNING id INTO d;
 SELECT count(*) INTO n FROM public.dd_documents WHERE id=d;
 IF n<>1 THEN RAISE EXCEPTION 'Owner read failed';END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',other,'email',current_setting('dd_docs.other_email'),'role','authenticated')::text,true);
 SELECT count(*) INTO n FROM public.dd_documents WHERE id=d;
 IF n<>0 THEN RAISE EXCEPTION 'Unauthorized metadata read';END IF;
 DELETE FROM public.dd_documents WHERE id=d;
 IF FOUND THEN RAISE EXCEPTION 'Unauthorized deletion';END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',u,'email',current_setting('dd_docs.email'),'role','authenticated')::text,true);
 DELETE FROM public.dd_documents WHERE id=d;
 IF NOT FOUND THEN RAISE EXCEPTION 'Owner delete failed';END IF;
END $test$;
ROLLBACK;
SELECT 'PASS: private documents metadata regression (rolled back)' AS result;