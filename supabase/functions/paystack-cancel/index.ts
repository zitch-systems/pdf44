// ============================================================================
//  paystack-cancel
//  Cancels the signed-in user's active subscription.
//
//  POST {}  (requires a valid Supabase user JWT)
//   → { ok: true, cancel_at_period_end: true }
//
//  Disables the recurring charge at Paystack (so it won't renew) and marks the
//  row cancel_at_period_end. The user keeps premium until current_period_end —
//  has_active_subscription()/isPremium() stop returning true once that passes.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Not authenticated" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subs } = await admin.from("subscriptions")
    .select("*").eq("user_id", user.id).eq("status", "active")
    .order("created_at", { ascending: false }).limit(1);
  const sub = subs && subs[0];
  if (!sub) return json({ error: "No active subscription to cancel" }, 404);

  // Stop the recurring charge at Paystack when we have the subscription handle.
  if (PAYSTACK_SECRET && sub.paystack_subscription_code && sub.paystack_email_token) {
    try {
      await fetch("https://api.paystack.co/subscription/disable", {
        method: "POST",
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code: sub.paystack_subscription_code, token: sub.paystack_email_token }),
      });
      // Paystack also fires a subscription.disable webhook which reconciles state.
    } catch (_e) { /* fall through — we still mark it locally below */ }
  }

  await admin.from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("id", sub.id);

  return json({ ok: true, cancel_at_period_end: true });
});
