-- Agency sponsorship foundation. Apply only after review in isolated test environment.
begin;
create table public.care_agencies (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 name text not null check (length(trim(name)) between 2 and 200),
 tier text not null check (tier in ('founding','growth','premier')),
 seat_limit integer generated always as (case tier when 'founding' then 10 when 'growth' then 25 when 'premier' then 50 end) stored,
 status text not null default 'pending' check(status in ('pending','active','suspended','cancelled')),
 access_until timestamptz,
 created_at timestamptz not null default now()
);
create index care_agencies_owner_idx on public.care_agencies(owner_id);
create table public.care_agency_seats (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.care_agencies(id),
 email text not null check(email=lower(trim(email)) and length(email)<=254 and position('@' in email)>1),
 family_user_id uuid references auth.users(id),
 state text not null default 'invited' check(state in ('invited','accepted','revoked','expired')),
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 check(state <> 'accepted' or family_user_id is not null)
);
create unique index care_agency_live_email on public.care_agency_seats(agency_id,email) where state in ('invited','accepted');
create index care_agency_family_idx on public.care_agency_seats(family_user_id);
alter table public.care_agencies enable row level security;
alter table public.care_agency_seats enable row level security;
revoke all on public.care_agencies, public.care_agency_seats from public,anon,authenticated;
grant select on public.care_agencies,public.care_agency_seats to authenticated;
grant select,insert,update,delete on public.care_agencies,public.care_agency_seats to service_role;
create policy agency_owner_read on public.care_agencies for select to authenticated using(owner_id=(select auth.uid()));
create policy agency_owner_seats_read on public.care_agency_seats for select to authenticated using(exists(select 1 from public.care_agencies a where a.id=agency_id and a.owner_id=(select auth.uid())));
create policy agency_family_seat_read on public.care_agency_seats for select to authenticated using(family_user_id=(select auth.uid()));
-- Server-only token storage; never return token hashes to agency owners.
create schema if not exists care_agency_private;
revoke all on schema care_agency_private from public,anon,authenticated;
grant usage on schema care_agency_private to service_role;
create table care_agency_private.invitation_tokens (
 seat_id uuid primary key references public.care_agency_seats(id) on delete cascade,
 token_hash text not null unique,
 consumed_at timestamptz
);
alter table care_agency_private.invitation_tokens enable row level security;
revoke all on care_agency_private.invitation_tokens from public,anon,authenticated;
grant select,insert,update,delete on care_agency_private.invitation_tokens to service_role;
-- Serialize seat changes against the agency row. Pending invites reserve seats.
create function care_agency_private.enforce_capacity() returns trigger language plpgsql set search_path='' as $$
declare a public.care_agencies%rowtype; used integer;
begin
 if tg_op='UPDATE' then
   if new.agency_id<>old.agency_id then raise exception 'Agency cannot be changed'; end if;
 end if;
 if new.state not in ('invited','accepted') then return new; end if;
 select * into a from public.care_agencies where id=new.agency_id for update;
 if a.status<>'active' or a.access_until is null or a.access_until<=now() then raise exception 'Agency access inactive'; end if;
 select count(*) into used from public.care_agency_seats s where s.agency_id=new.agency_id and s.id<>new.id and (s.state='accepted' or (s.state='invited' and s.expires_at>now()));
 if used>=a.seat_limit then raise exception 'Agency seat limit reached'; end if;
 return new;
end $$;
revoke all on function care_agency_private.enforce_capacity() from public,anon,authenticated;
create trigger care_agency_capacity before insert or update on public.care_agency_seats for each row execute function care_agency_private.enforce_capacity();
commit;
