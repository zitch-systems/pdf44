// ============================================================================
//  download-quota
//  Free-tier daily download metering, keyed by client IP.
//
//  POST { action: "check" | "consume" }
//   → { premium, allowed, used, remaining, limit }
//
//  Free users get FREE_DAILY_DOWNLOADS (default 3) downloads per IP per UTC day.
//  Active subscribers are unlimited: if a valid Supabase JWT is supplied and the
//  user has an active subscription, the quota is skipped entirely.
//
//  Anonymous callers are expected (free, logged-out users), so deploy with
//  verify_jwt = false. The Authorization header, when present, is only used to
//  detect premium — it is never required.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FREE_LIMIT = Number(Deno.env.get("FREE_DAILY_DOWNLOADS") ?? "3");

// Best-effort client IP from the usual proxy headers.
function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

// True only for a signed-in user with an active subscription.
async function callerIsPremium(req: Request, admin: ReturnType<typeof createClient>): Promise<boolean> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return false;
  try {
    const sb = createClient(URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return false;
    const { data } = await admin.rpc("has_active_subscription", { uid: user.id });
    return data === true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { action?: string };
  try { body = await req.json(); } catch { body = {}; }
  const action = body.action === "consume" ? "consume" : "check";

  const admin = createClient(URL, SERVICE_ROLE);

  // Premium: unlimited, never touch the quota table.
  if (await callerIsPremium(req, admin)) {
    return json({ premium: true, allowed: true, used: 0, remaining: -1, limit: -1 });
  }

  const ip = clientIp(req);
  const today = new Date().toISOString().slice(0, 10); // UTC date

  if (action === "check") {
    const { data } = await admin.from("download_usage")
      .select("count").eq("ip", ip).eq("day", today).maybeSingle();
    const used = data?.count ?? 0;
    return json({
      premium: false,
      allowed: used < FREE_LIMIT,
      used,
      remaining: Math.max(0, FREE_LIMIT - used),
      limit: FREE_LIMIT,
    });
  }

  // consume
  const { data, error } = await admin.rpc("consume_download", { p_ip: ip, p_limit: FREE_LIMIT });
  if (error) {
    // Fail open: a metering blip should never block a paying-or-free download.
    return json({ premium: false, allowed: true, used: 0, remaining: FREE_LIMIT, limit: FREE_LIMIT, soft_error: true });
  }
  return json({ premium: false, ...(data as object) });
});
