-- ============================================================================
--  PDF44 — Subscriptions, profiles & admin schema
--  Supabase / Postgres migration 0001
--
--  Creates:
--    • profiles        — 1:1 with auth.users (name, avatar, role)
--    • subscriptions   — Paystack-backed plan state per user
--    • payments        — billing history / revenue source of truth
--    • site_settings   — admin-controlled key/value flags (ad kill-switch etc.)
--
--  Plus row-level-security policies, a new-user trigger, an is_admin() helper
--  (SECURITY DEFINER to avoid RLS recursion), and seed settings.
--
--  Apply with the Supabase CLI:  supabase db push
--  or paste into the SQL editor in the Supabase dashboard.
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto; present by default on Supabase but be safe.
create extension if not exists pgcrypto;

-- ── updated_at helper ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
--  PROFILES
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  role        text not null default 'user' check (role in ('user','admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- is_admin(): SECURITY DEFINER so it bypasses RLS and does NOT recurse into the
-- profiles policies that themselves call is_admin().
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

-- Block non-admins from escalating their own role on update.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin(auth.uid()) then
    new.role := old.role; -- silently keep the previous role
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_role on public.profiles;
create trigger trg_profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- New auth user → profile row. Names/avatars come from OAuth metadata when present.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════════════
--  SUBSCRIPTIONS
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.subscriptions (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  plan                        text not null check (plan in ('monthly','annual')),
  status                      text not null default 'pending'
                                check (status in ('pending','active','cancelled','past_due','expired')),
  source                      text not null default 'paystack'  -- 'paystack' | 'manual' (admin grant)
                                check (source in ('paystack','manual')),
  paystack_customer_code      text,
  paystack_subscription_code  text,
  paystack_email_token        text,
  current_period_end          timestamptz,
  cancel_at_period_end        boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
-- At most one active subscription per user.
create unique index if not exists uniq_active_sub_per_user
  on public.subscriptions(user_id) where status = 'active';

drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

-- Read-only for owners; full control for admins. Writes from the billing
-- webhook use the service_role key, which bypasses RLS entirely.
drop policy if exists "subs_select_own_or_admin" on public.subscriptions;
create policy "subs_select_own_or_admin"
  on public.subscriptions for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "subs_admin_all" on public.subscriptions;
create policy "subs_admin_all"
  on public.subscriptions for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Convenience: does this user currently have ad-free access?
create or replace function public.has_active_subscription(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and s.status = 'active'
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- ════════════════════════════════════════════════════════════════════════════
--  PAYMENTS (billing history / revenue)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  reference       text unique,
  plan            text check (plan in ('monthly','annual')),
  amount          integer,           -- in minor units (cents)
  currency        text default 'USD',
  status          text not null default 'pending'
                    check (status in ('pending','success','failed')),
  paid_at         timestamptz,
  raw             jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);

alter table public.payments enable row level security;

drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin"
  on public.payments for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all"
  on public.payments for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ════════════════════════════════════════════════════════════════════════════
--  SITE SETTINGS (admin-controlled flags — read by the public site)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

drop trigger if exists trg_site_settings_updated on public.site_settings;
create trigger trg_site_settings_updated
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

-- Anyone (including anonymous visitors) may READ settings so the site can honour
-- the ad kill-switch. Only admins may write.
drop policy if exists "settings_public_read" on public.site_settings;
create policy "settings_public_read"
  on public.site_settings for select
  using (true);

drop policy if exists "settings_admin_write" on public.site_settings;
create policy "settings_admin_write"
  on public.site_settings for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Seed defaults (idempotent).
insert into public.site_settings (key, value) values
  ('ads_enabled',        'true'::jsonb),
  ('subscriptions_open', 'true'::jsonb),
  ('announcement',       '""'::jsonb)
on conflict (key) do nothing;

-- ── grants so PostgREST can see the helper functions ────────────────────────
grant execute on function public.is_admin(uuid)                 to anon, authenticated;
grant execute on function public.has_active_subscription(uuid)  to anon, authenticated;

-- ============================================================================
--  AFTER APPLYING: promote yourself to admin so you can open /admin
--    update public.profiles set role = 'admin' where email = 'you@example.com';
-- ============================================================================
