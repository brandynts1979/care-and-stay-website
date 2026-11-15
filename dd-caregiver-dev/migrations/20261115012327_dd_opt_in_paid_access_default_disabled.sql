CREATE SCHEMA IF NOT EXISTS dd_internal;
REVOKE ALL ON SCHEMA dd_internal FROM PUBLIC;
GRANT USAGE ON SCHEMA dd_internal TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS dd_internal.release_controls (
 singleton boolean PRIMARY KEY DEFAULT TRUE CHECK(singleton),
 paid_data_required boolean NOT NULL DEFAULT FALSE,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO dd_internal.release_controls(singleton,paid_data_required)
VALUES (TRUE,FALSE) ON CONFLICT(singleton) DO NOTHING;
REVOKE ALL ON dd_internal.release_controls FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON dd_internal.release_controls TO service_role;

CREATE OR REPLACE FUNCTION dd_internal.owner_has_paid_access(p_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
SELECT
  COALESCE(
    (SELECT NOT c.paid_data_required
     FROM dd_internal.release_controls c WHERE c.singleton=TRUE), FALSE
  )
  OR EXISTS (
    SELECT 1 FROM public.dd_subscription_entitlements e
    WHERE e.owner_id=p_owner_id
      AND e.stripe_price_id='price_1Ubr0GHU2Vcv1mFQgOfj2Ww8'
      AND e.status='active'
      AND e.current_period_end > now()
  );
$$;
REVOKE ALL ON FUNCTION dd_internal.owner_has_paid_access(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION dd_internal.owner_has_paid_access(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION dd_internal.owner_has_paid_access_text(p_owner_text text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF p_owner_text IS NULL OR p_owner_text !~
   '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
 THEN RETURN FALSE; END IF;
 RETURN dd_internal.owner_has_paid_access(p_owner_text::uuid);
END;
$$;
REVOKE ALL ON FUNCTION dd_internal.owner_has_paid_access_text(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION dd_internal.owner_has_paid_access_text(text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.dd_can_upload_for_owner(p_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT dd_internal.owner_has_paid_access(p_owner_id);
$$;
REVOKE ALL ON FUNCTION public.dd_can_upload_for_owner(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dd_can_upload_for_owner(uuid) TO service_role;

DROP POLICY IF EXISTS dd_active_billing_required ON public.dd_people;
CREATE POLICY dd_active_billing_required ON public.dd_people
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT dd_internal.owner_has_paid_access(owner_id)))
  WITH CHECK ((SELECT dd_internal.owner_has_paid_access(owner_id)));

DROP POLICY IF EXISTS dd_active_billing_required ON public.dd_strengths;
CREATE POLICY dd_active_billing_required ON public.dd_strengths
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT dd_internal.owner_has_paid_access(owner_id)))
  WITH CHECK ((SELECT dd_internal.owner_has_paid_access(owner_id)));

DROP POLICY IF EXISTS dd_active_billing_required ON public.dd_goals;
CREATE POLICY dd_active_billing_required ON public.dd_goals
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT dd_internal.owner_has_paid_access(owner_id)))
  WITH CHECK ((SELECT dd_internal.owner_has_paid_access(owner_id)));

DROP POLICY IF EXISTS dd_active_billing_required ON public.dd_goal_steps;
CREATE POLICY dd_active_billing_required ON public.dd_goal_steps
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT dd_internal.owner_has_paid_access(owner_id)))
  WITH CHECK ((SELECT dd_internal.owner_has_paid_access(owner_id)));

DROP POLICY IF EXISTS dd_active_billing_required ON public.dd_progress_notes;
CREATE POLICY dd_active_billing_required ON public.dd_progress_notes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT dd_internal.owner_has_paid_access(owner_id)))
  WITH CHECK ((SELECT dd_internal.owner_has_paid_access(owner_id)));

DROP POLICY IF EXISTS dd_active_billing_required ON public.dd_team_invitations;
CREATE POLICY dd_active_billing_required ON public.dd_team_invitations
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT dd_internal.owner_has_paid_access(owner_id)))
  WITH CHECK ((SELECT dd_internal.owner_has_paid_access(owner_id)));

DROP POLICY IF EXISTS dd_active_billing_required ON public.dd_care_tasks;
CREATE POLICY dd_active_billing_required ON public.dd_care_tasks
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT dd_internal.owner_has_paid_access(owner_id)))
  WITH CHECK ((SELECT dd_internal.owner_has_paid_access(owner_id)));

DROP POLICY IF EXISTS dd_active_billing_required ON public.dd_documents;
CREATE POLICY dd_active_billing_required ON public.dd_documents
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT dd_internal.owner_has_paid_access(owner_id)))
  WITH CHECK ((SELECT dd_internal.owner_has_paid_access(owner_id)));

DROP POLICY IF EXISTS dd_active_billing_required ON public.dd_support_records;
CREATE POLICY dd_active_billing_required ON public.dd_support_records
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT dd_internal.owner_has_paid_access(owner_id)))
  WITH CHECK ((SELECT dd_internal.owner_has_paid_access(owner_id)));

DROP POLICY IF EXISTS dd_storage_paid_read_gate ON storage.objects;
CREATE POLICY dd_storage_paid_read_gate ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
USING (bucket_id <> 'dd-private-documents' OR
 dd_internal.owner_has_paid_access_text(split_part(name,'/',1)));
DROP POLICY IF EXISTS dd_storage_paid_delete_gate ON storage.objects;
CREATE POLICY dd_storage_paid_delete_gate ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING (bucket_id <> 'dd-private-documents' OR
 dd_internal.owner_has_paid_access_text(split_part(name,'/',1)));
COMMENT ON TABLE dd_internal.release_controls IS 'DD production paid data gate. Stays false through development; turning on requires full production approval and separate tests.';
