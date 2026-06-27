// ============================================================================
//  paystack-webhook
//  Server-to-server fulfilment endpoint called by Paystack. This is the source
//  of truth for subscription state across the whole lifecycle (first charge,
//  renewals, cancellations, failed payments).
//
//  Security: verifies the x-paystack-signature HMAC-SHA512 of the RAW body
//  against PAYSTACK_SECRET_KEY. No Supabase JWT — deploy with verify_jwt = false
//  (see supabase/config.toml). All writes use the service-role key.
//
//  Robustness (audit fixes):
//   • Idempotency — each fully-processed delivery is recorded in
//     public.webhook_events (keyed by sha256 of the raw body); a duplicate
//     delivery is acknowledged with 200 and does no work.
//   • Retries — a DB failure now returns 500 so Paystack RETRIES, instead of the
//     old swallow-to-200 that permanently lost paid subscriptions on a transient
//     blip. The dedup row is only written AFTER success, so a failed delivery is
//     reprocessed on retry.
//   • invoice.update can no longer resurrect an expired/cancelled subscription
//     (it only touches rows currently 'active' or 'past_due').
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac, createHash } from "node:crypto";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

// Plan amounts (minor units) — used as a currency-agnostic fallback to tell the
// monthly and annual charges apart when an event carries no interval metadata.
const AMOUNT_MONTHLY = Number(Deno.env.get("PAYSTACK_AMOUNT_MONTHLY") ?? "150000");
const AMOUNT_ANNUAL = Number(Deno.env.get("PAYSTACK_AMOUNT_ANNUAL") ?? "1500000");

function addInterval(plan: string, from = new Date()): string {
  const d = new Date(from);
  if (plan === "annual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

// Paystack plan codes carry no interval; infer from the plan name, then fall
// back to the amount. The amount threshold is the midpoint between the two
// configured prices, so it works for any currency (kobo, cents, …).
function planKeyFrom(event: Record<string, any>): "monthly" | "annual" {
  const meta = String(event?.metadata?.plan ?? event?.plan?.interval ?? "").toLowerCase();
  if (meta.includes("annual") || meta.includes("year")) return "annual";
  if (meta.includes("month")) return "monthly";
  const amount = Number(event?.amount ?? event?.plan?.amount ?? 0);
  const midpoint = (AMOUNT_MONTHLY + AMOUNT_ANNUAL) / 2;
  return amount >= midpoint ? "annual" : "monthly";
}

// Throw on a Supabase error so the top-level handler can return 500 (→ retry)
// instead of silently dropping a write.
async function chk<T>(p: PromiseLike<{ data: T; error: any }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!PAYSTACK_SECRET) return new Response("Not configured", { status: 500 });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", PAYSTACK_SECRET).update(raw).digest("hex");
  if (signature !== expected) return new Response("Invalid signature", { status: 401 });

  let evt: { event?: string; data?: Record<string, any> };
  try { evt = JSON.parse(raw); } catch { return new Response("Bad payload", { status: 400 }); }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const data = evt.data ?? {};
  const event = evt.event ?? "";

  // Idempotency key: a hash of the exact signed body. A retried/duplicate
  // delivery hashes identically and is skipped once it has been processed.
  const eventKey = createHash("sha256").update(raw).digest("hex");
  try {
    const { data: prior } = await admin
      .from("webhook_events").select("id").eq("id", eventKey).maybeSingle();
    if (prior) return new Response("ok (duplicate)", { status: 200 });
  } catch (_e) {
    // If the dedup lookup itself fails, fall through and process — at worst we
    // reprocess (the writes below are retry-safe), never silently drop an event.
  }

  // Resolve the owning user: prefer transaction metadata, else match by email
  // (profiles.email is UNIQUE as of migration 0005, so this is unambiguous).
  async function resolveUserId(): Promise<string | null> {
    if (data?.metadata?.user_id) return data.metadata.user_id;
    const email = data?.customer?.email ?? data?.email;
    if (!email) return null;
    const prof = await chk(
      admin.from("profiles").select("id").eq("email", email).maybeSingle(),
    );
    return (prof as { id?: string } | null)?.id ?? null;
  }

  try {
    switch (event) {
      case "charge.success": {
        const userId = await resolveUserId();
        const plan = planKeyFrom(data);
        const ref = data.reference as string | undefined;

        if (ref) {
          await chk(admin.from("payments").update({
            status: "success",
            user_id: userId,
            plan,
            amount: data.amount,
            currency: data.currency ?? "NGN",
            paid_at: new Date().toISOString(),
            raw: data,
          }).eq("reference", ref));
        }

        if (userId) {
          // Expire any current active sub first, then insert the new active one.
          // Order matters: expiring first keeps the one-active-per-user partial
          // unique index satisfied and makes a retry self-healing.
          await chk(admin.from("subscriptions")
            .update({ status: "expired" })
            .eq("user_id", userId).eq("status", "active"));
          await chk(admin.from("subscriptions").insert({
            user_id: userId,
            plan,
            status: "active",
            source: "paystack",
            paystack_customer_code: data?.customer?.customer_code ?? null,
            current_period_end: addInterval(plan),
          }));
        }
        break;
      }

      case "subscription.create": {
        const userId = await resolveUserId();
        if (userId) {
          await chk(admin.from("subscriptions")
            .update({
              paystack_subscription_code: data.subscription_code,
              paystack_email_token: data.email_token,
              paystack_customer_code: data?.customer?.customer_code ?? null,
              current_period_end: data.next_payment_date ?? null,
            })
            .eq("user_id", userId).eq("status", "active"));
        }
        break;
      }

      case "invoice.update":
      case "invoice.payment_failed": {
        const failed = data?.status && data.status !== "success";
        const code = data?.subscription?.subscription_code;
        if (code) {
          // Only flip between active/past_due — never resurrect an expired or
          // already-cancelled subscription back to active.
          await chk(admin.from("subscriptions")
            .update({ status: failed ? "past_due" : "active" })
            .eq("paystack_subscription_code", code)
            .in("status", ["active", "past_due"]));
        }
        break;
      }

      case "subscription.not_renew":
      case "subscription.disable": {
        // Cancellation: stop renewal but keep access until the paid period ends.
        // Status stays 'active'; has_active_subscription() falls false once
        // current_period_end passes. (We never hard-cancel mid-period.)
        const code = data.subscription_code;
        if (code) {
          await chk(admin.from("subscriptions")
            .update({ cancel_at_period_end: true })
            .eq("paystack_subscription_code", code));
        }
        break;
      }
    }
  } catch (e) {
    console.error("webhook error", e);
    // Return 500 so Paystack RETRIES (the old code returned 200 here, which
    // permanently dropped the subscription on any transient DB error).
    return new Response("error", { status: 500 });
  }

  // Record the delivery as processed (best-effort — a failure here only risks a
  // harmless reprocess on retry, so it must not turn a successful fulfilment
  // into a 500).
  try {
    await admin.from("webhook_events").upsert({ id: eventKey, event });
  } catch (_e) { /* ignore */ }

  return new Response("ok", { status: 200 });
});
