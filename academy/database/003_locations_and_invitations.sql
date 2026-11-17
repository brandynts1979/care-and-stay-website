-- Per-location subscriptions: owner pays, authorized owner/GM invites unlimited managers.
-- Apply AFTER 001 and 002, only in approved Academy project.
begin;

create table public.academy_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name))>1),
  billing_owner_id uuid not null references auth.users(id),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  subscription_status text not null default 'pending'
    check(subscription_status in ('pending','trialing','active','past_due','canceled','unpaid','incomplete','paused')),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
create index academy_locations_owner_idx on public.academy_locations(billing_owner_id);
create table public.academy_location_members (
  location_id uuid not null references public.academy_locations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','gm','manager','shift_leader')),
  active boolean not null default true,
  added_at timestamptz not null default now(),
  primary key(location_id,user_id)
);
create index academy_location_members_user_idx on public.academy_location_members(user_id);

create table public.academy_invitations (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.academy_locations(id) on delete cascade,
  invited_email text not null,
  intended_role text not null check(intended_role in ('gm','manager','shift_leader')),
  invited_by uuid not null references auth.users(id),
  token_digest text not null unique,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check(invited_email = lower(trim(invited_email))),
  check(expires_at > created_at)
);
create unique index academy_pending_invites_unique on public.academy_invitations(location_id,invited_email)
 where accepted_at is null and revoked_at is null;

-- An individual may work at multiple locations. Each enrollment must be tied to a specific location.
alter table public.academy_enrollments
 add column location_id uuid references public.academy_locations(id);
alter table public.academy_enrollments
 drop constraint if exists academy_enrollments_user_id_course_id_key;
-- One Stripe subscription funds unlimited enrollments within the location.
alter table public.academy_enrollments
 drop constraint if exists academy_enrollments_stripe_subscription_id_key;
create index academy_enrollments_subscription_idx on public.academy_enrollments(stripe_subscription_id);
alter table public.academy_enrollments
 add constraint academy_enrollments_location_user_course_unique unique(location_id,user_id,course_id);
create index academy_enrollments_location_idx on public.academy_enrollments(location_id,user_id);

-- Keep existing dev data compatible but require a location for new production enrollments
-- through the provisioning function. No authenticated clients may create enrollments.
do $$ declare t text;begin
 foreach t in array array['academy_locations','academy_location_members','academy_invitations'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from anon,authenticated',t);
   execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant select on public.academy_locations,public.academy_location_members,public.academy_invitations to authenticated;

-- Owners and GMs can see location members; learners can see their own memberships.
create policy "location visible to active members" on public.academy_locations
 for select to authenticated using(exists(
 select 1 from public.academy_location_members m
 where m.location_id=academy_locations.id and m.user_id=(select auth.uid()) and m.active
));
create policy "member can view own memberships" on public.academy_location_members
 for select to authenticated using(user_id=(select auth.uid()));
create policy "invitation visible to its sender" on public.academy_invitations
 for select to authenticated using(invited_by=(select auth.uid()));

-- No grant for browser INSERT/UPDATE/DELETE on locations, memberships or invitations:
-- server handler validates caller, owner/GM role, location subscription and recipient email.
-- Owner must not be impersonated by a client-side role selector.
commit;
