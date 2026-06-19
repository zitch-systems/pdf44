-- ============================================================================
--  PDF44 — fix the profile role guard
--  Supabase / Postgres migration 0004
--
--  guard_profile_role() exists to stop a signed-in NON-admin from escalating
--  their own `role` through the profiles_update_own RLS policy. The original
--  version reverted the change whenever is_admin(auth.uid()) was false — but
--  auth.uid() is NULL for trusted server contexts (the service role, the SQL
--  editor), so it silently blocked legitimate admin promotions too (the
--  documented `update ... set role='admin'` was a no-op).
--
--  Fix: only guard when there IS an authenticated caller (auth.uid() not null).
--  Anonymous clients can't update profiles at all (RLS requires auth.uid()=id),
--  so a null caller is always a trusted server/SQL context.
-- ============================================================================
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin(auth.uid()) then
    new.role := old.role; -- a non-admin client may not change roles
  end if;
  return new;
end;
$$;
