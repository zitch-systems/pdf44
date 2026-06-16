// ============================================================================
//  paystack-verify
//  Confirms a transaction immediately after the user returns from Paystack,
//  so the UI can show "you're premium" without waiting for the webhook.
//
//  POST { reference }
//  → { status: "active" | "pending" | "failed", plan }
//
//  Idempotent and safe to call alongside the webhook — both upsert the same
//  active subscription row. Requires a valid Supabase user JWT.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

function periodEnd(plan: string): string {
  const d = new Date();
  if (plan === "annual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!PAYSTACK_SECRET) return json({ error: "Billing is not configured" }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Not authenticated" }, 401);

  let body: { reference?: string };
  try { body = await req.json(); } catch { body = {}; }
  if (!body.reference) return json({ error: "Missing reference" }, 400);

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(body.reference)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } },
  );
  const payload = await res.json();
  if (!res.ok || !payload.status) {
    return json({ error: payload.message ?? "Verification failed" }, 502);
  }

  const tx = payload.data;
  const planKey = tx?.metadata?.plan === "annual" ? "annual" : "monthly";
  const ownerId = tx?.metadata?.user_id ?? user.id;

  // Guard: a user can only verify their own transaction.
  if (ownerId !== user.id) return json({ error: "Reference does not belong to you" }, 403);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (tx.status !== "success") {
    await admin.from("payments")
      .update({ status: "failed", raw: tx })
      .eq("reference", body.reference);
    return json({ status: "failed", plan: planKey });
  }

  // Mark the payment paid.
  await admin.from("payments").update({
    status: "success",
    paid_at: new Date().toISOString(),
    raw: tx,
  }).eq("reference", body.reference);

  // If the webhook already activated this user (it is the source of truth),
  // don't clobber its row — just report active. This also avoids racing the
  // one-active-subscription-per-user unique index.
  const { data: existing } = await admin.from("subscriptions")
    .select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (existing) return json({ status: "active", plan: planKey });

  const { data: sub } = await admin.from("subscriptions").insert({
    user_id: user.id,
    plan: planKey,
    status: "active",
    source: "paystack",
    paystack_customer_code: tx?.customer?.customer_code ?? null,
    current_period_end: periodEnd(planKey),
  }).select("id").single();

  if (sub?.id) {
    await admin.from("payments")
      .update({ subscription_id: sub.id })
      .eq("reference", body.reference);
  }

  return json({ status: "active", plan: planKey });
});
