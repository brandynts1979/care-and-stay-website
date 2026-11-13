-- DD document impersonation and path isolation tests. All fixtures rolled back.
BEGIN;
SELECT set_config('ddt.a',id::text,true),set_config('ddt.aemail',email,true) FROM (SELECT id,email FROM auth.users WHERE email IS NOT NULL ORDER BY created_at LIMIT 1) u;
SELECT set_config('ddt.b',id::text,true),set_config('ddt.bemail',email,true) FROM (SELECT id,email FROM auth.users WHERE email IS NOT NULL ORDER BY created_at OFFSET 1 LIMIT 1) u;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE a uuid:=current_setting('ddt.a')::uuid;b uuid:=current_setting('ddt.b')::uuid;p uuid;d uuid;blocked boolean;
BEGIN
 PERFORM set_config('request.jwt.claims',json_build_object('sub',a,'email',current_setting('ddt.aemail'),'role','authenticated')::text,true);
 INSERT INTO public.dd_people(owner_id,display_name) VALUES(a,'AUTOTEST fictional profile') RETURNING id INTO p;
 blocked:=false;
 BEGIN
  INSERT INTO public.dd_documents(owner_id,person_id,document_name,category,file_path,media_type,file_size)
  VALUES(a,p,'Bad owner path','other',b||'/'||p||'/test.pdf','application/pdf',99);
 EXCEPTION WHEN OTHERS THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Wrong user path accepted'; END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',b,'email',current_setting('ddt.bemail'),'role','authenticated')::text,true);
 blocked:=false;
 BEGIN
  INSERT INTO public.dd_documents(owner_id,person_id,document_name,category,file_path,media_type,file_size)
  VALUES(a,p,'Forged owner','other',a||'/'||p||'/test.pdf','application/pdf',99);
 EXCEPTION WHEN OTHERS THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Owner forgery accepted'; END IF;
 blocked:=false;
 BEGIN
  INSERT INTO public.dd_documents(person_id,document_name,category,file_path,media_type,file_size)
  VALUES(p,'Other profile','other',b||'/'||p||'/test.pdf','application/pdf',99);
 EXCEPTION WHEN OTHERS THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Cross-profile insert accepted'; END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',a,'email',current_setting('ddt.aemail'),'role','authenticated')::text,true);
 INSERT INTO public.dd_documents(owner_id,person_id,document_name,category,file_path,media_type,file_size)
 VALUES(a,p,'Valid fictional file','other',a||'/'||p||'/'||gen_random_uuid()||'.pdf','application/pdf',99)
 RETURNING id INTO d;
 IF d IS NULL THEN RAISE EXCEPTION 'Valid owner insert failed'; END IF;
END $test$;
ROLLBACK;
SELECT 'PASS: document path integrity and owner impersonation denied (rolled back)' AS result;