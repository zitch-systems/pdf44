// Shared CORS headers for browser-invoked PDF44 edge functions.
// SITE_URL pins the allowed origin in production; falls back to "*" when unset
// (e.g. local dev) so the functions stay invokable from the SPA.
const SITE_URL = Deno.env.get("SITE_URL") ?? "*";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": SITE_URL,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
