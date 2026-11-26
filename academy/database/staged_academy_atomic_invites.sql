-- STAGED only, after staged_academy_course_entitlements.sql. No production changes.
BEGIN;
-- All invitation acceptance, enrollment grant, billing reconciliation and removal serialize
-- on the location row before membership/enrollment rows. Service-only invoker RPCs.
create function public.academy_grant_member_atomic(p_location uuid,p_user uuid)
returns text language plpgsql security invoker set search_path=pg_catalog,public as $$
declare loc public.academy_locations%rowtype;
begin
 select * into loc from public.academy_locations where id=p_location for update;
 if not found then return 'not_found'; end if;
 if loc.subscription_status not in ('active','trialing') or
    (loc.current_period_end is not null and loc.current_period_end<=now()) then return 'inactive'; end if;
 if not exists(select 1 from public.academy_location_members m where m.location_id=p_location and m.user_id=p_user and m.active) then return 'forbidden'; end if;
 if not exists(select 1 from public.academy_entitled_course_ids(p_location)) then return 'no_course'; end if;
 insert into public.academy_enrollments as e(location_id,user_id,course_id,status,stripe_subscription_id,granted_at,expires_at)
 select p_location,p_user,c.course_id,'active',loc.stripe_subscription_id,now(),null
 from public.academy_entitled_course_ids(p_location) c
 on conflict(location_id,user_id,course_id) do update set
   status=case when e.status='completed' then 'completed' else 'active' end,
   stripe_subscription_id=excluded.stripe_subscription_id,expires_at=null;
 return 'granted';
end;
$$;
revoke all on function public.academy_grant_member_atomic(uuid,uuid) from public,anon,authenticated;
grant execute on function public.academy_grant_member_atomic(uuid,uuid) to service_role;

create function public.academy_accept_invitation_atomic(p_invitation uuid,p_user uuid,p_verified_email text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare lid uuid; loc public.academy_locations%rowtype;
 inv public.academy_invitations%rowtype; inviter_role text; existing_role text; existing_active boolean; safe_role text; outcome text;
begin
 -- Caller passes identity from server auth.getUser, never from the client body.
 select location_id into lid from public.academy_invitations where id=p_invitation;
 if not found then return jsonb_build_object('result','invalid'); end if;
 select * into loc from public.academy_locations where id=lid for update;
 if not found then return jsonb_build_object('result','invalid'); end if;
 select * into inv from public.academy_invitations where id=p_invitation and location_id=lid for update;
 if not found or p_verified_email is null or lower(trim(p_verified_email))<>inv.invited_email or inv.revoked_at is not null
 then return jsonb_build_object('result','invalid'); end if;
 if inv.accepted_at is not null then
   -- A replay must not re-enable membership or restore access after removal.
   if inv.accepted_by=p_user and exists(select 1 from public.academy_location_members where location_id=lid and user_id=p_user and active)
     then return jsonb_build_object('result','already_joined','location_id',lid); end if;
   return jsonb_build_object('result','invalid');
 end if;
 if inv.expires_at<=now() then return jsonb_build_object('result','invalid'); end if;
 if loc.subscription_status not in ('active','trialing') or (loc.current_period_end is not null and loc.current_period_end<=now())
 then return jsonb_build_object('result','inactive'); end if;
 perform 1 from public.academy_location_members where location_id=lid and user_id in (p_user,inv.invited_by) order by user_id for update;
 select role into inviter_role from public.academy_location_members where location_id=lid and user_id=inv.invited_by and active;
 if inviter_role is null or inviter_role not in ('owner','gm') or (inv.intended_role='gm' and inviter_role<>'owner')
 then return jsonb_build_object('result','forbidden'); end if;
 select role,active into existing_role,existing_active from public.academy_location_members where location_id=lid and user_id=p_user;
 if existing_role='owner' and not existing_active then return jsonb_build_object('result','forbidden'); end if;
 -- Do not demote active owners/GMs. A formerly removed GM only gets the newly authorized role.
 safe_role=case when existing_active and existing_role in ('owner','gm') then existing_role else inv.intended_role end;
 if not exists(select 1 from public.academy_entitled_course_ids(lid)) then return jsonb_build_object('result','no_course'); end if;
 insert into public.academy_location_members(location_id,user_id,role,active)
 values(lid,p_user,safe_role,true)
 on conflict(location_id,user_id) do update set role=excluded.role,active=true;
 outcome=public.academy_grant_member_atomic(lid,p_user);
 if outcome<>'granted' then raise exception 'Enrollment provisioning did not complete'; end if;
 update public.academy_invitations set accepted_by=p_user,accepted_at=now() where id=p_invitation;
 insert into public.academy_audit_log(actor_id,action,target) values(p_user,'invite_accepted',lid::text);
 return jsonb_build_object('result','joined','location_id',lid);
end;
$$;
revoke all on function public.academy_accept_invitation_atomic(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.academy_accept_invitation_atomic(uuid,uuid,text) to service_role;
COMMIT;
