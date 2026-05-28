#!/usr/bin/env node
// build.js — PDF44 static prerender
// Generates dist/ with per-route HTML for Cloudflare Pages.
//
// CF Pages dashboard settings:
//   Build command:  node build.js
//   Output dir:     dist
//
// Run locally: node build.js

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://pdf44.com';

// ── 1. Read index.html as the page template ──────────────────────────────────
const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ── 2. Extract the main app script block ────────────────────────────────────
// Pick the largest inline (no src=, no ld+json type) script block — that is the main application.
// IMPORTANT: test only the opening tag, not the full block, because the app script's
// JS source legitimately contains strings like "src=" and "ld+json".
const appScript = (() => {
  const re = /<script((?:\s+[^>]*)?)>([\s\S]*?)<\/script>/gi;
  let largest = '';
  let m;
  while ((m = re.exec(template)) !== null) {
    const openingAttrs = m[1]; // everything between <script and >
    if (/src=/i.test(openingAttrs) || /ld\+json/i.test(openingAttrs)) continue;
    const src = m[2];
    if (src.length > largest.length) largest = src;
  }
  return largest;
})();

// ── 3. Extract JS objects from the app script ────────────────────────────────
// Uses a brace-counting approach so it handles nested objects reliably.
function extractObjectLiteral(src, constName) {
  const marker = `${constName} = `;
  const idx = src.indexOf(marker);
  if (idx === -1) return null;
  let i = idx + marker.length;
  // Skip to the opening brace or bracket
  while (i < src.length && src[i] !== '{' && src[i] !== '[') i++;
  if (i >= src.length) return null;
  const open = src[i], close = open === '{' ? '}' : ']';
  let depth = 0, start = i;
  while (i < src.length) {
    if (src[i] === open)  depth++;
    else if (src[i] === close) { depth--; if (depth === 0) { i++; break; } }
    else if (src[i] === '"' || src[i] === "'") {
      // Skip over string literals to avoid counting braces inside them
      const q = src[i++];
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; }
    }
    i++;
  }
  try {
    // eslint-disable-next-line no-new-func
    return (new Function(`return (${src.slice(start, i)})`))();
  } catch (e) {
    return null;
  }
}

const TOOL_SLUGS = extractObjectLiteral(appScript, 'TOOL_SLUGS') || {};
const SEO_META   = extractObjectLiteral(appScript, 'SEO')        || {};

// Build a slug → tool-key reverse map from TOOL_SLUGS
const SLUG_TO_TOOL = Object.fromEntries(
  Object.entries(TOOL_SLUGS).map(([k, v]) => [v, k])
);

// ── 4. Collect all slugs from _redirects ─────────────────────────────────────
// _redirects is the single authoritative list of every URL the site owns.
const redirectsText = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8');
const slugSet = new Set();

for (const rawLine of redirectsText.split('\n')) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const parts = line.split(/\s+/);
  const src = parts[0];

  // Skip the SPA catch-all and ignore non-root paths
  if (!src || src === '/*') continue;

  // 200-rewrite lines: /slug  /index.html?tool=...  200
  if (parts[1] && parts[1].includes('?tool=') && parts[2] === '200') {
    const slug = src.replace(/^\//, '');
    if (slug) slugSet.add(slug);
  }

  // 301 redirect targets: /canonical-slug  /other-slug  301
  // Add the destination slug so it also gets prerendered if it's a clean URL
  if (parts[2] === '301') {
    const dest = parts[1].replace(/^\//, '');
    if (dest && !dest.includes('?')) slugSet.add(dest);
  }
}

// Add all slugs from TOOL_SLUGS (in case any are missing from _redirects)
for (const slug of Object.values(TOOL_SLUGS)) {
  if (slug) slugSet.add(slug);
}

// ── 5. Metadata helpers ──────────────────────────────────────────────────────
function escAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getMeta(slug) {
  const toolKey = SLUG_TO_TOOL[slug];
  if (toolKey && SEO_META[toolKey]) return SEO_META[toolKey];
  // Graceful fallback: humanise the slug
  const words = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1));
  return {
    title: `${words.join(' ')} — Free Online | PDF44`,
    desc:  `${words.join(' ')} free online. Private, no upload, no registration. PDF44.`,
  };
}

// Derive a short H1 from the full SEO title (strip "| PDF44" and free/online suffixes)
function titleToH1(title) {
  return title
    .replace(/\s*\|\s*PDF44\s*$/i, '')
    .replace(/\s*[—–]\s*(?:Free\s+)?Online\s*$/i, '')
    .trim();
}

// ── 6. HTML generation ───────────────────────────────────────────────────────
function generatePageHTML(slug) {
  const { title, desc } = getMeta(slug);
  const canonical = `${SITE}/${slug}`;
  const h1 = titleToH1(title);

  // Prerendered content visible to crawlers (JS replaces it for live users)
  const prerendered = `<div class="content" id="content" style="padding:32px 28px 80px;">` +
    `<h1 style="font-size:clamp(22px,4vw,36px);font-weight:800;letter-spacing:-0.5px;` +
    `margin-bottom:12px;line-height:1.15;">${escAttr(h1)}</h1>` +
    `<p style="color:var(--text-2);font-size:15px;line-height:1.6;max-width:600px;margin-bottom:24px;">` +
    `${escAttr(desc)}</p>` +
    `<p style="color:var(--text-3);font-size:13px;">` +
    `<a href="/" style="color:var(--accent);">← All PDF tools</a></p>` +
    `</div>`;

  return template
    // Head metadata
    .replace(/<title>[^<]*<\/title>/, `<title>${escAttr(title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"/,
      `<meta name="description" content="${escAttr(desc)}"`
    )
    .replace(
      /<link rel="canonical" href="[^"]*"/,
      `<link rel="canonical" href="${canonical}"`
    )
    // OpenGraph
    .replace(/(<meta property="og:url" content=")[^"]*(")/,         `$1${canonical}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/,       `$1${escAttr(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/,  `$1${escAttr(desc)}$2`)
    // Twitter Card
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/,      `$1${escAttr(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/,`$1${escAttr(desc)}$2`)
    // Inject prerendered content (replaces empty #content div)
    .replace(
      /<div class="content" id="content"><\/div>/,
      prerendered
    );
}

// ── 7. Build ─────────────────────────────────────────────────────────────────
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

let built = 0;

// Homepage (no slug transformation needed)
fs.writeFileSync(path.join(DIST, 'index.html'), template);
built++;

// Per-route pages
const failed = [];
for (const slug of [...slugSet].sort()) {
  if (!slug) continue;
  try {
    const dir = path.join(DIST, slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), generatePageHTML(slug));
    built++;
  } catch (e) {
    failed.push(`${slug}: ${e.message}`);
  }
}

// Copy static assets
const ASSETS = [
  'sw.js', 'manifest.json', 'icon.svg', 'og-image.png', 'og-image.svg',
  'robots.txt', 'sitemap.xml', 'llms.txt', '_headers', '404.html',
];
for (const f of ASSETS) {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST, f));
}

// _redirects: replace SPA catch-all with real 404 so unknown paths return HTTP 404
const rawRedirects = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8');
const distRedirects = rawRedirects.replace(
  /^\/\*\s+\/index\.html\s+200\s*$/m,
  '/*                      /404.html                     404'
);
fs.writeFileSync(path.join(DIST, '_redirects'), distRedirects);

// ── 8. Report ────────────────────────────────────────────────────────────────
console.log(`✓ Built ${built} route(s) → dist/`);
if (failed.length) {
  console.warn(`⚠ ${failed.length} route(s) failed:`);
  failed.forEach(m => console.warn('  ', m));
}
