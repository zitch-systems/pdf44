-- ============================================================================
--  PDF44 — performance hardening from Supabase database advisors
--  Supabase / Postgres migration 0006
--
--  (a) Add covering indexes for the two unindexed foreign keys
--      (advisor 0001 unindexed_foreign_keys).
--  (b) Rewrite the RLS policies so auth.uid() / is_admin() are evaluated ONCE
--      per query as an initplan — `(select auth.uid())` — instead of once per
--      row (advisor 0003 auth_rls_initplan). Semantics are unchanged; only the
--      evaluation strategy differs.
--
--  Not addressed here (deliberately):
--   • 0006 multiple_permissive_policies — the per-action SELECT overlap between
--     each `*_admin_all` (FOR ALL) and `*_select_own_or_admin` policy is a micro-
--     optimisation with no correctness impact; splitting FOR ALL into per-command
--     admin policies adds complexity for negligible benefit at this scale.
--   • 0005 unused_index — those indexes are simply not exercised yet by traffic.
--   • Auth "leaked password protection" is an Auth dashboard setting, not SQL.
-- ============================================================================

-- (a) Covering indexes for foreign keys ─────────────────────────────────────
create index if not exists idx_payments_subscription_id on public.payments(subscription_id);
create index if not exists idx_site_settings_updated_by on public.site_settings(updated_by);

-- (b) RLS initplan rewrites ──────────────────────────────────────────────────
-- profiles
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles for select
  using (((select auth.uid()) = id) or (select public.is_admin((select auth.uid()))));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles for all
  using ((select public.is_admin((select auth.uid()))))
  with check ((select public.is_admin((select auth.uid()))));

-- subscriptions
drop policy if exists "subs_select_own_or_admin" on public.subscriptions;
create policy "subs_select_own_or_admin" on public.subscriptions for select
  using (((select auth.uid()) = user_id) or (select public.is_admin((select auth.uid()))));

drop policy if exists "subs_admin_all" on public.subscriptions;
create policy "subs_admin_all" on public.subscriptions for all
  using ((select public.is_admin((select auth.uid()))))
  with check ((select public.is_admin((select auth.uid()))));

-- payments
drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin" on public.payments for select
  using (((select auth.uid()) = user_id) or (select public.is_admin((select auth.uid()))));

drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all" on public.payments for all
  using ((select public.is_admin((select auth.uid()))))
  with check ((select public.is_admin((select auth.uid()))));

-- site_settings (settings_public_read uses `true` — no auth call, left unchanged)
drop policy if exists "settings_admin_write" on public.site_settings;
create policy "settings_admin_write" on public.site_settings for all
  using ((select public.is_admin((select auth.uid()))))
  with check ((select public.is_admin((select auth.uid()))));
