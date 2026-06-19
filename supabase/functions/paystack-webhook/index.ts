// ============================================================================
//  paystack-webhook
//  Server-to-server fulfilment endpoint called by Paystack. This is the source
//  of truth for subscription state across the whole lifecycle (first charge,
//  renewals, cancellations, failed payments).
//
//  Security: verifies the x-paystack-signature HMAC-SHA512 of the RAW body
//  against PAYSTACK_SECRET_KEY. No Supabase JWT — deploy with verify_jwt = false
//  (see supabase/config.toml). All writes use the service-role key.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

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

  // Resolve the owning user: prefer transaction metadata, else match by email.
  async function resolveUserId(): Promise<string | null> {
    if (data?.metadata?.user_id) return data.metadata.user_id;
    const email = data?.customer?.email ?? data?.email;
    if (!email) return null;
    const { data: prof } = await admin
      .from("profiles").select("id").eq("email", email).maybeSingle();
    return prof?.id ?? null;
  }

  try {
    switch (event) {
      case "charge.success": {
        const userId = await resolveUserId();
        const plan = planKeyFrom(data);
        const ref = data.reference as string | undefined;

        if (ref) {
          await admin.from("payments").update({
            status: "success",
            user_id: userId,
            plan,
            amount: data.amount,
            currency: data.currency ?? "NGN",
            paid_at: new Date().toISOString(),
            raw: data,
          }).eq("reference", ref);
        }

        if (userId) {
          await admin.from("subscriptions")
            .update({ status: "expired" })
            .eq("user_id", userId).eq("status", "active");
          await admin.from("subscriptions").insert({
            user_id: userId,
            plan,
            status: "active",
            source: "paystack",
            paystack_customer_code: data?.customer?.customer_code ?? null,
            current_period_end: addInterval(plan),
          });
        }
        break;
      }

      case "subscription.create": {
        const userId = await resolveUserId();
        if (userId) {
          await admin.from("subscriptions")
            .update({
              paystack_subscription_code: data.subscription_code,
              paystack_email_token: data.email_token,
              paystack_customer_code: data?.customer?.customer_code ?? null,
              current_period_end: data.next_payment_date ?? null,
            })
            .eq("user_id", userId).eq("status", "active");
        }
        break;
      }

      case "invoice.update":
      case "invoice.payment_failed": {
        const failed = data?.status && data.status !== "success";
        const code = data?.subscription?.subscription_code;
        if (code) {
          await admin.from("subscriptions")
            .update({ status: failed ? "past_due" : "active" })
            .eq("paystack_subscription_code", code);
        }
        break;
      }

      case "subscription.not_renew":
      case "subscription.disable": {
        const code = data.subscription_code;
        if (code) {
          await admin.from("subscriptions")
            .update({
              status: event === "subscription.disable" ? "cancelled" : "active",
              cancel_at_period_end: true,
            })
            .eq("paystack_subscription_code", code);
        }
        break;
      }
    }
  } catch (e) {
    console.error("webhook error", e);
    // Still 200 so Paystack doesn't hammer retries on a transient DB blip.
  }

  return new Response("ok", { status: 200 });
});
