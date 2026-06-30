#!/usr/bin/env node
/* ============================================================================
 *  PDF44 — create (or reuse) the Paystack subscription plans.
 *
 *  Creates the two recurring plans the edge functions expect:
 *      • PDF44 Monthly  — ₦1,500 / month   (amount 150000 kobo)
 *      • PDF44 Annual   — ₦15,000 / year    (amount 1500000 kobo)
 *  then prints each plan_code and a ready-to-paste `supabase secrets set` block.
 *
 *  SECURITY: your Paystack secret key is read from the environment and is NEVER
 *  printed, hardcoded, or committed. Run it like this (the key stays in your
 *  shell, not in the repo or anywhere else):
 *
 *      PAYSTACK_SECRET_KEY=sk_live_xxx node scripts/create-paystack-plans.mjs
 *
 *  Idempotent: if a plan with the same interval+amount+currency already exists
 *  on the account it is reused (no duplicate is created), so re-running is safe.
 *
 *  Override the defaults with env vars if you price differently:
 *      PAYSTACK_CURRENCY        (default NGN)
 *      PAYSTACK_AMOUNT_MONTHLY  (default 150000  — minor units, e.g. kobo/cents)
 *      PAYSTACK_AMOUNT_ANNUAL   (default 1500000)
 *
 *  Requires Node 18+ (uses the built-in global fetch). No dependencies.
 * ========================================================================== */
'use strict';

const SECRET = process.env.PAYSTACK_SECRET_KEY || '';
if (!SECRET) {
  console.error('✗ PAYSTACK_SECRET_KEY is not set.\n' +
    '  Run:  PAYSTACK_SECRET_KEY=sk_live_xxx node scripts/create-paystack-plans.mjs');
  process.exit(1);
}

const MODE = SECRET.startsWith('sk_live_') ? 'LIVE'
           : SECRET.startsWith('sk_test_') ? 'TEST'
           : 'UNKNOWN';

const CURRENCY = process.env.PAYSTACK_CURRENCY || 'NGN';
const AMOUNT_MONTHLY = Number(process.env.PAYSTACK_AMOUNT_MONTHLY || '150000');
const AMOUNT_ANNUAL  = Number(process.env.PAYSTACK_AMOUNT_ANNUAL  || '1500000');

// Paystack intervals: 'monthly' | 'annually' | 'weekly' | 'daily' | 'quarterly' | 'biannually'.
const PLANS = [
  { key: 'monthly', name: 'PDF44 Monthly', interval: 'monthly',  amount: AMOUNT_MONTHLY,
    description: 'PDF44 ad-free — billed monthly.' },
  { key: 'annual',  name: 'PDF44 Annual',  interval: 'annually', amount: AMOUNT_ANNUAL,
    description: 'PDF44 ad-free — billed yearly (2 months free vs monthly).' },
];

const API = 'https://api.paystack.co';
const headers = { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' };

async function api(path, init) {
  const res = await fetch(`${API}${path}`, { ...init, headers });
  let body;
  try { body = await res.json(); } catch { body = {}; }
  if (!res.ok || body.status === false) {
    throw new Error(`${init?.method || 'GET'} ${path} → ${res.status} ${body.message || ''}`.trim());
  }
  return body;
}

// Fetch every existing plan (paginated) so we can reuse instead of duplicating.
async function listPlans() {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const { data } = await api(`/plan?perPage=100&page=${page}`, { method: 'GET' });
    if (!Array.isArray(data) || data.length === 0) break;
    out.push(...data);
    if (data.length < 100) break;
  }
  return out;
}

function findExisting(existing, plan) {
  return existing.find(p =>
    p.interval === plan.interval &&
    Number(p.amount) === plan.amount &&
    String(p.currency).toUpperCase() === CURRENCY.toUpperCase());
}

async function main() {
  console.log(`Paystack key mode: ${MODE}` +
    (MODE === 'UNKNOWN' ? '  (key prefix not sk_live_/sk_test_ — double-check it)' : ''));
  if (MODE === 'LIVE') console.log('⚠  Operating on your LIVE Paystack account.');
  console.log(`Currency: ${CURRENCY} · Monthly: ${AMOUNT_MONTHLY} · Annual: ${AMOUNT_ANNUAL} (minor units)\n`);

  const existing = await listPlans();
  const codes = {};

  for (const plan of PLANS) {
    const hit = findExisting(existing, plan);
    if (hit) {
      codes[plan.key] = hit.plan_code;
      console.log(`= reused  ${plan.name.padEnd(14)} ${hit.plan_code}  (already on the account)`);
      continue;
    }
    const { data } = await api('/plan', {
      method: 'POST',
      body: JSON.stringify({
        name: plan.name, interval: plan.interval, amount: plan.amount,
        currency: CURRENCY, description: plan.description,
      }),
    });
    codes[plan.key] = data.plan_code;
    console.log(`+ created ${plan.name.padEnd(14)} ${data.plan_code}`);
  }

  console.log('\nSet these as Supabase Edge Function secrets (server-side only — never in config.js):\n');
  console.log('supabase secrets set \\');
  console.log(`  PAYSTACK_SECRET_KEY=${MODE === 'LIVE' ? 'sk_live_…' : 'sk_test_…'} \\`);
  console.log(`  PAYSTACK_PLAN_MONTHLY=${codes.monthly} \\`);
  console.log(`  PAYSTACK_PLAN_ANNUAL=${codes.annual} \\`);
  console.log(`  PAYSTACK_AMOUNT_MONTHLY=${AMOUNT_MONTHLY} \\`);
  console.log(`  PAYSTACK_AMOUNT_ANNUAL=${AMOUNT_ANNUAL} \\`);
  console.log(`  PAYSTACK_CURRENCY=${CURRENCY} \\`);
  console.log('  SITE_URL=https://pdf44.com');
  console.log('\n(Replace the sk_… placeholder above with your real secret key when you run it.)');
}

main().catch((e) => { console.error('\n✗ ' + e.message); process.exit(1); });
