/* ============================================================================
 *  PDF44 — public runtime config for accounts, subscriptions & admin
 *
 *  These values are PUBLIC by design (the Supabase anon key and Paystack public
 *  key are safe to ship to the browser — they are protected by Row-Level
 *  Security and server-side secret keys respectively). Secret keys NEVER go here.
 *
 *  ▸ Until `enabled` is true, the site behaves EXACTLY as before: no account
 *    button, no auth, ads unchanged. Flip it on only after the four values
 *    below are filled in. See SUBSCRIPTION_SETUP.md.
 * ========================================================================== */
window.PDF44_CONFIG = {
  // Master switch. Leave false to ship without touching the live experience.
  enabled: false,

  // From Supabase dashboard → Project Settings → API
  supabaseUrl:     "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",

  // Edge function names (defaults match supabase/functions/*)
  functions: {
    initialize: "paystack-initialize",
    verify:     "paystack-verify",
  },

  // Display-only plan info. The real Paystack plan CODES + amounts live in the
  // edge-function environment variables (server-side), never in the browser.
  plans: {
    monthly: { key: "monthly", label: "Monthly", price: "$1",  per: "/month", blurb: "Billed monthly. Cancel anytime." },
    annual:  { key: "annual",  label: "Annual",  price: "$10", per: "/year",  blurb: "Best value — 2 months free vs monthly." },
  },

  // Optional: which sign-in methods to offer. Both are on by default.
  auth: { email: true, google: true },

  // Cosmetic
  brand: "PDF44",
  supportEmail: "hello@pdf44.com",
};
