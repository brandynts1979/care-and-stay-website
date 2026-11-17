-- Internal Academy evaluation access; no Stripe billing and no public self-entitlement.
-- Only a verified allowlisted email may activate one 30-day training location.
begin;
create table if not exists public.academy_demo_authorized (
 email text primary key check (email = lower(trim(email))),
 enabled boolean not null default true,
 location_id uuid unique references public.academy_locations(id),
 activated_by uuid references auth.users(id),
 activated_at timestamptz,
 expires_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.academy_demo_authorized enable row level security;
revoke all on public.academy_demo_authorized from anon, authenticated;
grant all on public.academy_demo_authorized to service_role;
insert into public.academy_demo_authorized(email)
values ('firststepworldwide@gmail.com')
on conflict(email) do nothing;
commit;