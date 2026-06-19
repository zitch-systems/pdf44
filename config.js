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
  enabled: true,

  // From Supabase dashboard → Project Settings → API
  supabaseUrl:     "https://rqknwkiyoudsqjvdrvmg.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxa253a2l5b3Vkc3FqdmRydm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjI0NjAsImV4cCI6MjA5NzQzODQ2MH0.diR1gwceEKhj21Jrst_eY3717_kDaL3XAqpWO5ZYivU",

  // Edge function names (defaults match supabase/functions/*)
  functions: {
    initialize: "paystack-initialize",
    verify:     "paystack-verify",
  },

  // Display-only plan info. The real Paystack plan CODES + amounts live in the
  // edge-function environment variables (server-side), never in the browser.
  plans: {
    monthly: { key: "monthly", label: "Monthly", price: "₦1,500",  per: "/month", blurb: "Billed monthly. Cancel anytime." },
    annual:  { key: "annual",  label: "Annual",  price: "₦15,000", per: "/year",  blurb: "Best value — 2 months free vs monthly." },
  },

  // Optional: which sign-in methods to offer. Both are on by default.
  auth: { email: true, google: true },

  // Cosmetic
  brand: "PDF44",
  supportEmail: "hello@pdf44.com",
};
