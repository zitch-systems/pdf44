-- ============================================================================
--  PDF44 — email integrity for reliable payment fulfilment
--  Supabase / Postgres migration 0005
--
--  The Paystack webhook resolves the paying user by email when a transaction
--  carries no metadata.user_id:
--      select id from public.profiles where email = <customer email>
--  Two problems made that unsafe (audit findings H1 / H4):
--    1. profiles.email had no UNIQUE constraint, so duplicate emails made the
--       webhook's .maybeSingle() error out — and because the webhook swallows
--       errors to HTTP 200, the charge was silently dropped (lost fulfilment).
--    2. The profiles_update_own RLS policy let any signed-in user rewrite their
--       OWN profile.email to an arbitrary value (only `role` was guarded), so a
--       user could point their email at someone else's address.
--
--  Fix: enforce uniqueness on email, and extend the existing role guard to also
--  freeze `email` for non-admin client updates (the auth system / admins remain
--  the only writers). NULL emails stay allowed (Postgres treats NULLs as
--  distinct in a unique index).
-- ============================================================================

-- 1. One profile per email. (auth.users.email is already unique, so a correctly
--    populated profiles table will satisfy this; NULLs are permitted.)
create unique index if not exists uniq_profiles_email
  on public.profiles (email);

-- 2. Freeze role AND email against changes from authenticated non-admin clients.
--    auth.uid() is NULL for the service role / SQL editor, so those trusted
--    contexts (and the handle_new_user trigger) can still set both.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    if new.role is distinct from old.role then
      new.role := old.role;   -- a non-admin client may not change roles
    end if;
    if new.email is distinct from old.email then
      new.email := old.email; -- a non-admin client may not change their email
    end if;
  end if;
  return new;
end;
$$;
