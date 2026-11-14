-- Allow preassigned moderators to prepare a closed pilot.
-- Pending membership does not record agreement to community terms.
alter table cs_forum_private.members alter column accepted_at drop not null;
do $migration$
declare definition text;
old_gate text := 'select terms_version into expected_terms from cs_forum_private.settings where enabled;';
new_gate text := 'select s.terms_version into expected_terms from cs_forum_private.settings s
 where s.enabled or exists (
  select 1 from cs_forum_private.members pilot
  where pilot.user_id=actor and pilot.role=''moderator''
   and pilot.status in (''active'',''left'')
   and (action=''me'' or pilot.community=c)
 );';
begin
 select pg_get_functiondef('cs_forum_private.request(text,jsonb)'::regprocedure) into definition;
 if position(old_gate in definition)=0 then raise exception 'Unexpected forum gate; review migration before applying.'; end if;
 execute replace(definition,old_gate,new_gate);
end $migration$;