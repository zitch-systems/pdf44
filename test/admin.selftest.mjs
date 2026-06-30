// PDF44 admin portal — browser self-test.
//
// Loads the SHIPPED admin.html in headless Chromium with ?selftest (which exposes
// the pure helpers on window.__PDF44_ADMIN_TEST__) and asserts the metrics math,
// CSV escaping/formula-injection guard, and filter predicates against fixtures —
// no Supabase backend required. Also asserts the page boots without an uncaught
// error and shows exactly one screen.
//
//   Run:  node test/admin.selftest.mjs
//
// Requires Playwright + a Chromium build. If neither is found the test SKIPS
// (exit 0) so it never blocks an environment that can't run a browser.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadChromium() {
  for (const spec of ['playwright', 'playwright-core']) {
    try { return require(spec).chromium; } catch {}
  }
  try {
    const g = execSync('npm root -g').toString().trim();
    return require(path.join(g, 'playwright')).chromium;
  } catch {}
  return null;
}
function findChromeBinary() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '';
  if (!base || !fs.existsSync(base)) return undefined;
  for (const d of fs.readdirSync(base)) {
    if (!/^chromium-/.test(d)) continue;
    const exe = path.join(base, d, 'chrome-linux', 'chrome');
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

const chromium = loadChromium();
if (!chromium) { console.log('SKIP: Playwright not installed (try: npm i -g playwright)'); process.exit(0); }

const TYPES = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.json':'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'text/plain' });
  fs.createReadStream(file).pipe(res);
});
const PORT = 8791;
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: findChromeBinary() });
} catch (e) {
  console.log('SKIP: could not launch Chromium —', e.message.split('\n')[0]);
  server.close(); process.exit(0);
}

const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e)));
await page.goto(`http://127.0.0.1:${PORT}/admin.html?selftest`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction('!!window.__PDF44_ADMIN_TEST__', { timeout: 10000 });

const results = await page.evaluate(() => {
  const T = window.__PDF44_ADMIN_TEST__;
  const out = [];
  const eq = (name, got, want) => out.push({ name, pass: JSON.stringify(got) === JSON.stringify(want), got, want });
  const ok = (name, cond, got) => out.push({ name, pass: !!cond, got, want: true });

  const now = Date.UTC(2026, 5, 30), iso = d => new Date(d).toISOString();
  const profiles = [
    { id:'u1', email:'a@x.com', full_name:'Alice', role:'admin', created_at: iso(now - 2*864e5) },
    { id:'u2', email:'bob@y.com', full_name:'Bob', role:'user', created_at: iso(now - 40*864e5) },
    { id:'u3', email:'carol@z.com', full_name:'', role:'user', created_at: iso(now - 5*864e5) },
  ];
  const subs = [
    { user_id:'u2', plan:'monthly', status:'active', source:'paystack', current_period_end: iso(now + 10*864e5) },
    { user_id:'u3', plan:'annual', status:'active', source:'manual', current_period_end: iso(now - 1*864e5) },
    { user_id:'u1', plan:'monthly', status:'cancelled', source:'paystack', current_period_end: null },
  ];
  const payments = [
    { reference:'pdf44_monthly_u2_1', user_id:'u2', plan:'monthly', amount:150000, currency:'NGN', status:'success', created_at: iso(now-3*864e5) },
    { reference:'pdf44_annual_u3_1', user_id:'u3', plan:'annual', amount:1500000, currency:'NGN', status:'success', created_at: iso(now-4*864e5) },
    { reference:'pdf44_fail_u2', user_id:'u2', plan:'monthly', amount:150000, currency:'NGN', status:'failed', created_at: iso(now-1*864e5) },
  ];
  const cfg = { plans:{ monthly:{ price:'₦1,500' }, annual:{ price:'₦15,000' } } };
  const emailFor = id => ({ u1:'a@x.com', u2:'bob@y.com', u3:'carol@z.com' }[id] || id);

  const m = T.computeMetrics(profiles, subs, payments, cfg, now);
  eq('metrics.users', m.users, 3);
  eq('metrics.newU30', m.newU30, 2);
  eq('metrics.activeSubs', m.activeSubs, 1);
  eq('metrics.monthly', m.monthly, 1);
  eq('metrics.annual', m.annual, 0);
  eq('metrics.successCount', m.successCount, 2);
  eq('metrics.revenueMinor', m.revenueMinor, 1650000);
  eq('metrics.failedCount', m.failedCount, 1);
  eq('metrics.pendingCount', m.pendingCount, 0);
  eq('metrics.mrr', m.mrr, 1500);
  eq('metrics.arr', m.arr, 18000);
  eq('metrics.cancelled', m.cancelled, 1);
  eq('metrics.admins', m.admins, 1);
  eq('metrics.currency', m.currency, 'NGN');
  ok('metrics.conversionPct≈33.33', Math.abs(m.conversionPct - 33.3333) < 0.01, m.conversionPct);
  eq('activeSubMap keys', Object.keys(T.activeSubMap(subs, now)).sort(), ['u2']);

  eq('csvCell plain', T.csvCell('plain'), 'plain');
  eq('csvCell comma', T.csvCell('x,y'), '"x,y"');
  eq('csvCell quote', T.csvCell('a"b'), '"a""b"');
  eq('csvCell newline', T.csvCell('a\nb'), '"a\nb"');
  eq('csvCell formula', T.csvCell('=SUM(A1)'), "'=SUM(A1)");
  eq('csvCell null', T.csvCell(null), '');
  eq('toCSV empty', T.toCSV([]), '');
  eq('toCSV basic', T.toCSV([{ a:1, b:'x,y' }, { a:2, b:'he "hi"' }]), 'a,b\r\n1,"x,y"\r\n2,"he ""hi"""');

  eq('filterUsers bob', T.filterUsers(profiles, 'bob').map(p=>p.id), ['u2']);
  eq('filterUsers empty=all', T.filterUsers(profiles, '').length, 3);
  eq('filterUsers by name', T.filterUsers(profiles, 'alice').map(p=>p.id), ['u1']);
  eq('filterSubs status=active', T.filterSubs(subs, '', 'active', emailFor).length, 2);
  eq('filterSubs plan=annual', T.filterSubs(subs, 'annual', '', emailFor).map(s=>s.user_id), ['u3']);
  eq('filterSubs email', T.filterSubs(subs, 'bob@y', '', emailFor).map(s=>s.user_id), ['u2']);
  eq('filterPayments failed', T.filterPayments(payments, '', 'failed', emailFor).map(p=>p.reference), ['pdf44_fail_u2']);
  eq('filterPayments by ref', T.filterPayments(payments, 'annual_u3', '', emailFor).length, 1);
  eq('filterPayments by email', T.filterPayments(payments, 'bob@y', '', emailFor).length, 2);
  return out;
});

const screen = await page.evaluate(() =>
  ['noconfig','login','denied','app'].filter(id => { const el = document.getElementById(id); return el && !el.classList.contains('hide'); }));

await browser.close();
server.close();

const failed = results.filter(r => !r.pass);
console.log(`\nHelper assertions: ${results.length - failed.length}/${results.length} passed`);
failed.forEach(f => console.log(`  ✗ ${f.name}: got ${JSON.stringify(f.got)} want ${JSON.stringify(f.want)}`));
console.log(`Visible screen after boot: [${screen.join(', ') || 'NONE'}]`);
console.log(`Uncaught page errors: ${pageErrors.length}${pageErrors.length?(' -> '+pageErrors.join(' | ')):''}`);
const screenOK = screen.length === 1;
if (!screenOK) console.log('  ✗ expected exactly one visible screen');
const passAll = failed.length === 0 && screenOK && pageErrors.length === 0;
console.log(passAll ? '\n✓ admin self-test PASSED' : '\n✗ admin self-test FAILED');
process.exit(passAll ? 0 : 1);
