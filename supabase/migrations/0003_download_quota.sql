-- ============================================================================
--  PDF44 — free-tier daily download quota (IP-based)
--  Supabase / Postgres migration 0003
--
--  Free users get a limited number of downloads per IP per UTC day; premium
--  subscribers are unlimited (enforced in the download-quota edge function,
--  which bypasses this table entirely for active subscribers).
--
--  Only the service role (the edge function) ever touches this table — RLS is
--  enabled with NO policies so anon/authenticated clients can never read or
--  write it directly.
-- ============================================================================

create table if not exists public.download_usage (
  ip          text not null,
  day         date not null default (now() at time zone 'utc')::date,
  count       integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (ip, day)
);

create index if not exists idx_download_usage_day on public.download_usage(day);

alter table public.download_usage enable row level security;
-- Intentionally no policies: service-role only.

-- Atomically consume one download credit for an IP on the current UTC day.
-- Returns the post-state as JSON. Refuses (allowed=false) once the limit is hit.
create or replace function public.consume_download(p_ip text, p_limit integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'utc')::date;
  cur   integer;
begin
  select count into cur from public.download_usage
    where ip = p_ip and day = today
    for update;
  if cur is null then cur := 0; end if;

  if cur >= p_limit then
    return json_build_object('allowed', false, 'used', cur,
                             'remaining', 0, 'limit', p_limit);
  end if;

  insert into public.download_usage (ip, day, count)
    values (p_ip, today, 1)
    on conflict (ip, day)
    do update set count = public.download_usage.count + 1, updated_at = now();

  return json_build_object('allowed', true, 'used', cur + 1,
                           'remaining', p_limit - (cur + 1), 'limit', p_limit);
end;
$$;

-- Only the service role (the edge function) may call this — never the browser.
revoke execute on function public.consume_download(text, integer) from anon, authenticated, public;
grant  execute on function public.consume_download(text, integer) to service_role;
