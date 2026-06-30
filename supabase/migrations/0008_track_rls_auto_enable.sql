-- ============================================================================
--  PDF44 — track the rls_auto_enable() event trigger + tighten its grants
--  Supabase / Postgres migration 0008
--
--  CONTEXT
--  -------
--  The live database carries an event trigger `ensure_rls` (added out-of-band,
--  not via these migrations) whose function `public.rls_auto_enable()` enables
--  row-level security on every newly created table in the `public` schema. It is
--  a security-POSITIVE safety net, but it was untracked drift, and the database
--  linter (advisors 0028/0029) flagged it because it carried EXECUTE grants to
--  `PUBLIC`, `anon`, and `authenticated`.
--
--  Those grants are harmless in practice: `rls_auto_enable()` is an
--  `event_trigger` function, which Postgres refuses to invoke directly (it can
--  only fire from its event trigger), so it is not reachable via PostgREST RPC.
--  The event trigger also fires regardless of EXECUTE privilege. Revoking the
--  grants therefore changes nothing functionally — it only clears the advisory
--  and shrinks the exposed surface.
--
--  This migration:
--    1. Records the function definition in source (so a fresh project built from
--       these migrations reproduces the same auto-RLS behaviour). `create or
--       replace` is a no-op on the live DB where it already exists, and it
--       preserves the existing owner.
--    2. Recreates the `ensure_rls` event trigger ONLY if it is absent, so the
--       live trigger is never dropped/recreated (it already exists there).
--    3. Revokes EXECUTE from PUBLIC/anon/authenticated (the actual advisor fix).
-- ============================================================================

-- 1. Function (verbatim current definition; idempotent, owner-preserving).
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table','partitioned table')
  loop
     if cmd.schema_name is not null and cmd.schema_name in ('public') and cmd.schema_name not in ('pg_catalog','information_schema') and cmd.schema_name not like 'pg_toast%' and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
     else
        raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     end if;
  end loop;
end;
$function$;

-- 2. Event trigger — create only when missing, so the existing live trigger is
--    left untouched (there is no CREATE OR REPLACE form for event triggers).
do $$
begin
  if not exists (select 1 from pg_event_trigger where evtname = 'ensure_rls') then
    create event trigger ensure_rls
      on ddl_command_end
      when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      execute function public.rls_auto_enable();
  end if;
end $$;

-- 3. Tighten grants: this function must never be (and cannot be) called from the
--    API roles. Keep it owner/service-role only.
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
