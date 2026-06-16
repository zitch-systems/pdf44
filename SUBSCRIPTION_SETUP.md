# PDF44 — Subscriptions, Accounts & Admin (setup guide)

This branch adds an **optional** ad-free subscription tier, user profiles, and an
admin portal — built on **Supabase** (auth + Postgres + Edge Functions) and
**Paystack** (billing: **$1/month** or **$10/year**).

> **Nothing changes on the live site until you turn it on.**
> `config.js` ships with `enabled: false`. While it's off there is no account
> button, no auth, and ads behave exactly as before. Flip it on only after the
> steps below.

---

## What you get

| Feature | Where |
|---|---|
| Sign up / sign in (email + Google) | account button in the top bar → modal |
| User profile (name, avatar, plan) | account modal → profile view |
| Subscribe — $1/mo or $10/yr, ads removed | "Go ad-free" / `/pricing` |
| Ad-free enforcement | `body.pdf44-premium` + ad-inject guard |
| Admin dashboard (users, subs, revenue/MRR/ARR, signups) | `/admin` |
| Admin: grant/revoke premium, make admin | `/admin` → Users |
| Admin: site & ad controls (ad kill-switch, pause checkout) | `/admin` → Site & Ads |

## Architecture

```
Browser (index.html + assets/pdf44-account.js)
  │   Supabase JS (auth, reads own profile/subscription via RLS)
  ▼
Supabase
  • Postgres: profiles · subscriptions · payments · site_settings  (RLS-protected)
  • Edge Functions:
      paystack-initialize  → starts checkout (needs login)
      paystack-verify      → confirms on return (needs login)
      paystack-webhook     → Paystack → us, source of truth (HMAC verified)
  ▼
Paystack  (plans, recurring billing, hosted checkout)
```

Files added by this branch:

```
config.js                              # public keys + plan display (enabled:false)
assets/pdf44-account.css / .js         # account UI + ad gating
admin.html                             # standalone admin portal (noindex)
supabase/migrations/0001_*.sql         # schema + RLS + triggers
supabase/functions/paystack-*          # 3 edge functions
```

---

## 1. Create a Supabase project

1. <https://supabase.com> → **New project**. Note the **Project URL** and the
   **anon public** key (Project Settings → API).
2. You'll also need the **service_role** key for the functions (kept server-side).

## 2. Apply the database schema

Either paste `supabase/migrations/0001_subscriptions_init.sql` into the Supabase
**SQL Editor** and run it, or with the CLI:

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

This creates `profiles`, `subscriptions`, `payments`, `site_settings`, the
row-level-security policies, the new-user trigger, and the `is_admin()` helper.

## 3. Enable auth providers

Supabase dashboard → **Authentication → Providers**:

- **Email** — enabled by default. (Optionally turn off "Confirm email" while testing.)
- **Google** — enable it, paste your Google OAuth **Client ID/Secret**
  (from <https://console.cloud.google.com> → Credentials → OAuth client).
  Add Supabase's callback `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
  to the Google client's *Authorized redirect URIs*.

Authentication → **URL Configuration** → add your site to **Redirect URLs**:

```
https://pdf44.com/account
https://pdf44.com/admin
http://localhost:8788/account     # if testing locally
```

## 4. Create the Paystack plans

Paystack dashboard → **Plans → Create Plan** (do this twice):

| Plan | Interval | Amount | Currency |
|---|---|---|---|
| PDF44 Monthly | Monthly | 1.00 | USD* |
| PDF44 Annual | Annually | 10.00 | USD* |

Copy each **plan code** (`PLN_xxxxxxxx`). Grab your **secret key** (`sk_...`) from
Settings → API Keys & Webhooks.

> *Currency:* Paystack settles in NGN/GHS/ZAR/KES and USD depending on your
> account. If USD isn't enabled for you, set `PAYSTACK_CURRENCY` and the amounts
> below to your enabled currency, and update the price labels in `config.js`.

## 5. Deploy the Edge Functions + secrets

Set the function secrets (server-side only — never in `config.js`):

```bash
supabase secrets set \
  PAYSTACK_SECRET_KEY=sk_live_or_test_xxx \
  PAYSTACK_PLAN_MONTHLY=PLN_monthly_code \
  PAYSTACK_PLAN_ANNUAL=PLN_annual_code \
  PAYSTACK_AMOUNT_MONTHLY=100 \
  PAYSTACK_AMOUNT_ANNUAL=1000 \
  PAYSTACK_CURRENCY=USD \
  SITE_URL=https://pdf44.com
```

Deploy. **The webhook must skip JWT verification** (Paystack calls it directly):

```bash
supabase functions deploy paystack-initialize
supabase functions deploy paystack-verify
supabase functions deploy paystack-webhook --no-verify-jwt
```

## 6. Point Paystack at the webhook

Paystack dashboard → Settings → API Keys & Webhooks → **Webhook URL**:

```
https://YOUR_PROJECT.supabase.co/functions/v1/paystack-webhook
```

## 7. Fill in `config.js` and switch it on

```js
window.PDF44_CONFIG = {
  enabled: true,                                  // ← turn it on
  supabaseUrl:     "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "eyJ... (anon public key)",
  // plans.* are display-only; amounts/codes live in the function secrets
};
```

Commit & deploy (Cloudflare Pages picks it up). Until `enabled` is `true`, the
site is byte-for-byte the old experience.

## 8. Make yourself an admin

Sign up once on the site, then in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Now `/admin` opens for you (everyone else gets "access denied", enforced by RLS).

---

## How it behaves

- **Free users** see ads exactly as today.
- **Subscribed users** get `body.pdf44-premium` and every `.ad-slot` is removed;
  the ad-injection guard also stops new ad iframes from loading.
- A returning premium user's browser remembers the last known state
  (`localStorage pdf44_prem`) so there's **no flash of ads** before Supabase
  confirms the live subscription.
- **Admins** can flip the global **ad kill-switch** (`site_settings.ads_enabled`)
  to remove ads for everyone, or **pause checkout** (`subscriptions_open`).

## Testing

1. Use Paystack **test** keys and a [test card](https://paystack.com/docs/payments/test-payments/).
2. Sign up → "Go ad-free" → pick a plan → complete checkout.
3. You return to `/billing/callback`; `paystack-verify` activates you and ads vanish.
4. Confirm the row in Supabase `subscriptions` (status `active`) and `payments` (`success`).
5. Open `/admin` to see the user, subscription, revenue, and toggles.

## Security notes

- The **anon key** and **Paystack public** values are safe in the browser; data is
  protected by **row-level security** and the **secret** keys live only in the
  function environment.
- `is_admin()` is `SECURITY DEFINER` and gates every admin read/write **server-side** —
  the admin page can't be bypassed by editing client JS.
- The webhook authenticates Paystack via **HMAC-SHA512** of the raw body; forged
  calls are rejected.
- `/admin` is `noindex` + `no-store` and disallowed in `robots.txt`.

## Rollback

Set `enabled: false` in `config.js` (or revert this branch). The Supabase project
and Paystack plans can stay — they simply go unused.
