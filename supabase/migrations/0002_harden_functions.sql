-- ============================================================================
--  PDF44 — security hardening for migration 0001 functions
--  Supabase / Postgres migration 0002
--
--  Addresses Supabase database-linter advisories:
--    • 0011 function_search_path_mutable — pin set_updated_at's search_path.
--    • 0028/0029 *_security_definer_function_executable — the trigger-only
--      functions handle_new_user() and guard_profile_role() never need to be
--      reachable over PostgREST RPC, so revoke EXECUTE from the API roles.
--
--  is_admin() and has_active_subscription() remain executable on purpose:
--  the client and RLS policies call them, and they are read-only.
-- ============================================================================

-- Pin a stable search_path on the updated_at helper (it was the only function
-- missing one; the rest already set search_path = public).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- These two are wired to triggers only; calling them directly via RPC errors
-- anyway, but removing the grant clears the advisory and shrinks the surface.
revoke execute on function public.handle_new_user()    from anon, authenticated, public;
revoke execute on function public.guard_profile_role() from anon, authenticated, public;
