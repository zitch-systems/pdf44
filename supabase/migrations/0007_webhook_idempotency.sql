-- ============================================================================
--  PDF44 — webhook idempotency ledger
--  Supabase / Postgres migration 0007
--
--  The Paystack webhook is the source of truth for fulfilment, but it had no
--  dedup: a retried delivery (Paystack retries on any non-2xx, and also resends)
--  would re-run charge.success and stack subscription rows / re-write payments.
--  This table records each fully-processed delivery (keyed by a SHA-256 of the
--  raw signed body) so the function can skip work it has already completed.
--
--  Service-role only — RLS is enabled with NO policies so anon/authenticated can
--  never read or write it directly.
-- ============================================================================
create table if not exists public.webhook_events (
  id           text primary key,              -- sha256(hex) of the raw signed body
  event        text,                          -- Paystack event name (charge.success, …)
  received_at  timestamptz not null default now()
);

alter table public.webhook_events enable row level security;
-- Intentionally no policies: the edge function (service role) is the only writer.
