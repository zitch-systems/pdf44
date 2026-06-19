// ============================================================================
//  paystack-initialize
//  Starts a Paystack subscription checkout for the signed-in user.
//
//  POST { plan: "monthly" | "annual" }
//  → { authorization_url, access_code, reference }
//
//  The browser redirects the user to authorization_url. Fulfilment happens in
//  paystack-webhook (source of truth) and is confirmed by paystack-verify on
//  return. Requires a valid Supabase user JWT (verify_jwt = true, the default).
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") ?? "";
const CURRENCY = Deno.env.get("PAYSTACK_CURRENCY") ?? "NGN";

// Amounts are in the currency's minor unit (kobo for NGN, cents for USD).
const PLANS: Record<string, { code: string; amount: number }> = {
  monthly: {
    code: Deno.env.get("PAYSTACK_PLAN_MONTHLY") ?? "",
    amount: Number(Deno.env.get("PAYSTACK_AMOUNT_MONTHLY") ?? "150000"), // ₦1,500
  },
  annual: {
    code: Deno.env.get("PAYSTACK_PLAN_ANNUAL") ?? "",
    amount: Number(Deno.env.get("PAYSTACK_AMOUNT_ANNUAL") ?? "1500000"), // ₦15,000
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!PAYSTACK_SECRET) return json({ error: "Billing is not configured" }, 500);

  // ── Identify the caller from their Supabase JWT ──────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return json({ error: "Not authenticated" }, 401);

  let body: { plan?: string };
  try { body = await req.json(); } catch { body = {}; }
  const planKey = body.plan === "annual" ? "annual" : "monthly";
  const plan = PLANS[planKey];
  if (!plan.code) return json({ error: `Plan "${planKey}" is not configured` }, 500);

  const reference = `pdf44_${planKey}_${user.id.slice(0, 8)}_${Date.now()}`;

  // ── Ask Paystack to start the transaction (plan code ⇒ recurring sub) ─────
  const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: plan.amount,
      currency: CURRENCY,
      plan: plan.code,
      reference,
      callback_url: SITE_URL ? `${SITE_URL}/billing/callback` : undefined,
      metadata: { user_id: user.id, plan: planKey },
    }),
  });
  const initJson = await initRes.json();
  if (!initRes.ok || !initJson.status) {
    return json({ error: initJson.message ?? "Paystack initialization failed" }, 502);
  }

  // ── Record a pending payment (service role bypasses RLS) ─────────────────
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  await admin.from("payments").insert({
    user_id: user.id,
    reference,
    plan: planKey,
    amount: plan.amount,
    currency: CURRENCY,
    status: "pending",
  });

  return json({
    authorization_url: initJson.data.authorization_url,
    access_code: initJson.data.access_code,
    reference,
  });
});
