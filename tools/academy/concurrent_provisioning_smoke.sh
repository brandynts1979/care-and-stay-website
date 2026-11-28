#!/usr/bin/env bash
set -euo pipefail
# Only the disposable CI PostgreSQL database. Never run on a customer environment.
test "$(psql -Atc 'select current_database()')" = academy_ci
test "${PGHOST:-}" = localhost
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
psql -v ON_ERROR_STOP=1 <<'SQL'
alter role service_role bypassrls;
insert into auth.users(id) values ('c1000000-0000-4000-8000-000000000001'),('c1000000-0000-4000-8000-000000000002');
insert into public.academy_courses(id,slug,title,published) values
 ('c2000000-0000-4000-8000-000000000001','stay-culture-leadership-academy','Legacy CI',true)
 on conflict(slug) do update set published=true;
insert into public.academy_locations(id,name,billing_owner_id,subscription_status,current_period_end) values
 ('c3000000-0000-4000-8000-000000000001','Concurrent CI','c1000000-0000-4000-8000-000000000001','active',now()+interval '30 days');
insert into public.academy_location_members(location_id,user_id,role,active) values
 ('c3000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','owner',true);
insert into public.academy_invitations(id,location_id,invited_email,intended_role,invited_by,token_digest,expires_at) values
 ('c4000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','concurrent@example.invalid','manager','c1000000-0000-4000-8000-000000000001','ci-concurrent-1',now()+interval '1 day');
SQL
invite_sql="select public.academy_accept_invitation_atomic('c4000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002','concurrent@example.invalid')->>'result'"
# Start two separate PostgreSQL sessions, both submitting the same invite.
psql -qAt -v ON_ERROR_STOP=1 -c "set role service_role; $invite_sql" >"$tmp/invite1" & p1=$!
psql -qAt -v ON_ERROR_STOP=1 -c "set role service_role; $invite_sql" >"$tmp/invite2" & p2=$!
wait "$p1"; wait "$p2"
test "$(cat "$tmp/invite1" "$tmp/invite2" | sort)" = "$(printf 'already_joined\njoined')"
# Both snapshots are prepared from revision 0, even if execution order varies.
psql -qAt -v ON_ERROR_STOP=1 -c "set role service_role; select public.academy_reconcile_subscription_atomic('c3000000-0000-4000-8000-000000000001',0,'evt_concurrent_a','invoice.paid','sub_concurrent','cus_concurrent','active',now()+interval '30 days')" >"$tmp/bill1" & p1=$!
psql -qAt -v ON_ERROR_STOP=1 -c "set role service_role; select public.academy_reconcile_subscription_atomic('c3000000-0000-4000-8000-000000000001',0,'evt_concurrent_b','invoice.paid','sub_concurrent','cus_concurrent','active',now()+interval '30 days')" >"$tmp/bill2" & p2=$!
wait "$p1"; wait "$p2"
test "$(cat "$tmp/bill1" "$tmp/bill2" | sort)" = "$(printf 'applied\nretry')"
psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
 if (select count(*) from public.academy_enrollments where location_id='c3000000-0000-4000-8000-000000000001')<>2 then raise exception 'Concurrent provisioning duplicate or missing enrollment'; end if;
 if (select count(*) from public.academy_audit_log where actor_id='c1000000-0000-4000-8000-000000000002' and action='invite_accepted')<>1 then raise exception 'Concurrent invite audit duplicated'; end if;
 if (select billing_revision from public.academy_locations where id='c3000000-0000-4000-8000-000000000001')<>1 then raise exception 'Revision incorrectly advanced'; end if;
 if (select count(*) from public.academy_billing_events where stripe_event_id in ('evt_concurrent_a','evt_concurrent_b') and processed_at is not null)<>1 then raise exception 'Wrong event completion count'; end if;
END $$;
SQL
echo "Concurrent invitation and billing sessions passed."
