# PDF44 — Critical Functionality Audit

_Audited: 2026-06-27 · Scope: entire repository (web app, payments/RLS backend, account/paywall/admin, React-Native mobile app, PWA/CI infra)._

This audit was produced by fanning out independent auditor agents across every subsystem,
then adversarially re-verifying each finding against the source. The findings below were
additionally **re-confirmed by hand against the actual code** (file + line cited). Where an
original hypothesis was *disproved* by verification it is recorded as such — those are
credibility signals, not omissions.

## Verdict

**The product is not currently trustworthy for production: the payments/fulfilment path,
the paywall, and several headline "security" tools are broken or misleading, and the entire
mobile app is demo-grade.** The web PDF *page-manipulation* tools (merge/split/organize/
rotate/extract/convert-image/text) are genuinely real and work client-side as advertised.
But the monetization layer leaks revenue at every seam, two "security" tools (Protect, Redact)
actively endanger users by claiming protection they do not provide, and the project can ship
in a state where **no one can download anything** (missing Supabase config). The mobile app
presents ~30 tools of which 9 run; its interactive editors fake success and discard work.

### Severity counts (89 findings kept after verification; 0 refuted findings were removed as false, 7 hypotheses explicitly refuted/downgraded to INFO)

| Severity | Count |
|---|---|
| Critical | 7 |
| High | 18 |
| Medium | 30 |
| Low | 27 |
| Info / refuted-hypothesis | 7 |

---

## Systemic themes

1. **The paywall is structurally unenforceable.** All PDF processing runs in the browser, so
   the output bytes exist before any gate runs. On top of that the gate trusts a client flag
   (`localStorage.pdf44_prem`), the server quota is keyed on a spoofable IP header, and both
   client and server fail open on error. The daily-download paywall is a UI animation, not access control.

2. **Fulfilment failures are silently converted to "success."** The webhook catches every DB
   error and returns HTTP 200, so Paystack never retries — one transient blip permanently loses
   a paid subscription. `paystack-verify` reports `active` without re-validating the amount or the
   true payer.

3. **Security-claim tools don't enforce their claims.** Protect produces an *unencrypted* file
   yet says "Protection applied"; Redact draws a black box over still-extractable text yet is
   marketed (to lawyers) as "permanent/irreversible"; Unlock can't decrypt; Sign is an image stamp
   sold as a "legally usable" signature. Standard pdf-lib 1.17.1 has no crypto/redaction primitives.

4. **The deploy is broken without `supabase/config.toml`.** The webhook and the anonymous
   download-quota function both require `verify_jwt = false`, but that file is absent, so Supabase
   defaults to `verify_jwt = true` and 401-rejects both — breaking fulfilment *and* paywalling
   every free download (fail-closed at the client).

5. **The mobile app is theater above a thin real engine.** 9 of ~30 tools run; the rest are
   (honestly-labeled) preview stubs, but the Edit / Fill&Sign / Organize / Compare / Comment /
   RequestSign screens and the Viewer fake success and never touch a real PDF.

6. **"Claims vs reality" gaps on flagship web tools.** Compress only strips metadata (often makes
   files *larger*); MOBI→PDF outputs binary garbage; EPUB→PDF scrambles chapter order; Background
   paints over and hides page content; every text tool crashes on non-Latin-1 input.

---

## CRITICAL findings

### C1 — `paystack-verify` lets any logged-in user self-grant premium for free
`supabase/functions/paystack-verify/index.ts:51-91` · _verified (workflow + manual)_

`ownerId = tx?.metadata?.user_id ?? user.id`, and the only guard is `if (ownerId !== user.id) return 403`.
For any genuinely-successful Paystack transaction that carries **no** `metadata.user_id`
(dashboard/manual charges, Payment Pages/Links, one-off API charges, any other integration on the
same Paystack account), `ownerId` falls back to the caller, the guard always passes, and an active
subscription is inserted for `user.id` — never for the real payer. The function never reads back the
`payments` row that `initialize` wrote (keyed by the unique `reference` with the correct `user_id`),
and `reference` is taken verbatim from the request body with no `pdf44_…` format check.
**Impact:** one shared reference grants permanent premium to unlimited accounts.
**Fix:** load `payments` by `reference`, require `payments.user_id === user.id` and a matching amount/plan;
ignore Paystack metadata for ownership.

### C2 — Missing `supabase/config.toml` breaks Paystack webhook fulfilment
`supabase/functions/paystack-webhook/index.ts:7-9,45` + absent `supabase/config.toml` · _manual: file confirmed absent_

The webhook authenticates solely by HMAC and is documented "deploy with `verify_jwt = false`," but no
`config.toml` exists. Supabase's default is `verify_jwt = true`, so the gateway 401-rejects every
webhook delivery (Paystack sends the signature header, not a Supabase JWT) before the code runs.
**Impact:** paying customers are charged but never upgraded via the source-of-truth path; silent revenue loss.
**Fix:** add `supabase/config.toml` with `[functions.paystack-webhook] verify_jwt = false` and
`[functions.download-quota] verify_jwt = false` (keep initialize/verify/cancel at `true`), or set it on deploy.
_(Caveat: if the functions were deployed via the dashboard with the flag toggled there, this is already
mitigated out-of-repo — confirm in the Supabase dashboard.)_

### C3 — Same missing config 401-blocks `download-quota` → **all** free downloads are paywalled
`supabase/functions/download-quota/index.ts:13,35-45` + `index.html:1980-1986,2072-2081` · _manual_

`download-quota` is called anonymously by free users (apikey only, no JWT). With `verify_jwt=true`
(C2) the gateway returns 401; `fetch` does **not** reject on 401, so `r.json()` yields the gateway
error body, which lacks `allowed`/`premium`, so the client `consume()` handler falls into the
`else` branch (`queue.length=0; paywall('limit')`). The fail-open `.catch` only runs on *network*
errors, never a 401.
**Impact:** on deploy, every free user is blocked from their very first download across all ~45
tools. Combined with C2, the product can ship where literally no one can download.
**Fix:** same as C2; also make the client treat HTTP≥400 from quota as fail-open.

### C4 — Mobile editors (Edit / Fill&Sign / Organize) and Viewer fake success and discard all work
`mobile/src/screens/EditPdf.tsx:62,84-93`, `FillSign.tsx:70`, `Organize.tsx:52`, `Viewer.tsx:18-44,54` · _manual_

None of these screens read `params.uri` bytes or call the engine. EditPdf renders 16 hardcoded grey
bars and "Done" just `showToast('Saved changes'); back()`. Organize mutates a synthetic
`Array.from({length: total})` and never calls the real `reorderPages/rotatePdf/extractPages` that exist
in `engine.ts`. FillSign "Export" only toasts "Exported signed PDF." Viewer renders skeleton
`PaperPage()` bars and never displays the real document — even for tools that *do* produce a real file.
**Impact:** a user who signs a contract, fills a form, reorders/deletes pages, or redacts, then taps
Done/Export, is told it was saved while the original file is unchanged and the work is silently lost.

### C5 — Mobile "Redact" draws a movable black box and removes nothing
`mobile/src/screens/EditPdf.tsx:176-178,62` · _manual (depends on C4)_

The redact tool adds a black `View` over the *fake* canvas; with C4 nothing is ever written to a PDF
and no engine redaction primitive exists. **Impact:** users redacting SSNs/financials/medical data
produce no redaction at all — textbook PII-leak failure mode.

### C6 — Web "Protect PDF" outputs an UNENCRYPTED file but reports "Protection applied"
`index.html:8580-8615` (lib at `:440`) · _manual_

`processProtect` calls `f.pdfDoc.save({ encryption: {...} })`. Standard upstream pdf-lib 1.17.1
(loaded from cdnjs) has no encryption — the `encryption` option is silently ignored and `save()`
does not throw, so the `catch` never fires and the unconditional `toast('Protection applied','success')`
always runs. The downloaded `protected_*.pdf` is password-free and fully readable, while the SEO/landing
copy advertises "AES encryption, owner/user passwords."
**Impact:** a user "password-protecting" a confidential PDF gets a file anyone can open, while being
told it's protected. (The no-print/no-copy permission flags are equally non-functional.)
**Fix:** swap to a build with real encryption (e.g. a pdf-lib fork with encryption, or qpdf-wasm),
or remove the feature and its marketing.

### C7 — Web "Redact" only draws a rectangle over still-extractable text, marketed as "permanent/irreversible"
`index.html:8705-8720` · _manual_

`processRedact` calls `drawRectangle({color: rgb(0,0,0)})` then `save()`. pdf-lib appends the fill to
the content stream *on top of* existing text/images; the underlying `Tj/TJ` text remains selectable,
copyable, and recoverable (delete the rectangle). The code's own toast admits "visual only," but the
landing pages claim "Permanently redact … Removal is irreversible" and pitch it to lawyers.
**Impact:** severe, real-world confidentiality breach for anyone who trusts it.
**Fix:** implement true redaction (remove the underlying content operators / rasterize the region),
or relabel honestly and remove the "permanent" claims.

---

## HIGH findings

### Payments / backend
- **H1 — Webhook resolves payer by non-unique `profiles.email` via `maybeSingle()`** (`paystack-webhook:61-68`, _verified_). `profiles.email` has no UNIQUE constraint; duplicate emails make `maybeSingle()` error → swallowed to 200 → fulfilment silently dropped.
- **H2 — `subscription.create` only updates rows already `status='active'`** (`paystack-webhook:105-117`, _verified_). If it arrives before/without `charge.success`, the `subscription_code` is never stored, so all later renewal/cancel webhooks (matched by code) silently no-op → renewals don't extend access; cancellations never register.
- **H3 — `paystack-verify` never re-validates the paid amount; plan tier from attacker-influenceable metadata** (`paystack-verify:52,84-91`, _verified_). A cheap or wrong-tier charge can be redeemed as annual premium.
- **H4 — `profiles.email` is user-writable (only `role` is guarded) and feeds the webhook lookup** (`0001:35-43,92-96`, _manual_). Any user can `update profiles set email=<victim>`; combined with H1 this enables mis-attributed or dropped fulfilment.
- **H5 — Free-download quota bypassed via spoofed IP headers** (`download-quota:24-31,63,80`, _verified_). `clientIp()` trusts `cf-connecting-ip`/`x-forwarded-for`/`x-real-ip`; the function is `verify_jwt=false` and called directly, so rotating the header yields unlimited free downloads.

### Paywall / PWA
- **H6 — Paywall bypassed by `localStorage.setItem('pdf44_prem','1')`** (`index.html:1963-1970,2067`, _manual_). `premium()` trusts the client flag and short-circuits the server `consume()` call entirely.
- **H7 — Service worker caches Supabase REST GETs cache-first with no revalidation** (`sw.js:54-89`, _manual_). Subscription/profile/`site_settings` reads are cached forever; a cancelled/expired subscription keeps reading the stale "premium" row (ads suppressed, limits bypassed) until a manual `CACHE_NAME` bump.

### Web "security" tools
- **H8 — "Unlock PDF" cannot decrypt real encrypted PDFs** (`index.html:8617-8627`, _manual_). pdf-lib has no `password` load option; genuinely-encrypted files throw → "Wrong password" even when correct.

### Web converters / tools (claims vs reality)
- **H9 — "Compress PDF" doesn't compress** (`index.html:8112-8135`, _manual_). Only clears metadata (then *adds* `Producer/Creator=PDF44`) and re-saves with object streams; `objectsPerTick` (the "quality" selector) only affects scheduling, not bytes. Output is often the same size or larger; FAQ promises "30–80% smaller."
- **H10 — MOBI→PDF never decompresses PalmDoc/LZ77 → garbage output** (`index.html:10046-10071,10188`, _manual_). Standard MOBI compression (type 2) is read but not decoded; the binary is decoded as UTF-8 and passes the "no readable text" guard, producing a "successful" PDF of garbage.
- **H11 — EPUB→PDF/Word always falls back to alphabetical chapter order** (`index.html:9978-10001`, _manual_). The spine regex `/<itemrefs+idref=/` has a literal `s+` (missing `\`) and never matches real EPUBs; the manifest regex hard-codes attribute order. Result: chapters out of order (chapter10 before chapter2) with cover/nav/toc dumped inline.
- **H12 — Every web text tool crashes on non-Latin-1 input** (`index.html:8455,8487,8531,9178,9235,10378`, _manual_). `drawText` is called without an embedded Unicode font; pdf-lib's default WinAnsi throws "cannot encode" (uncaught) on accents beyond Latin-1, Cyrillic/CJK, emoji, curly quotes, en/em-dashes — aborting watermark/page-number/header/Bates/edit with no output. `{filename}` substitution makes Header/Bates fail on non-ASCII filenames.
- **H13 — "Background color" paints over and hides page content** (`index.html:9196-9214`, _manual_). `drawRectangle` is appended after existing content; for normal opaque PDFs every page becomes a solid color block. The code comment/toast admit it.

### Mobile
- **H14 — Mobile Split/Extract silently keep only the first ⌈n/2⌉ pages** (`mobile/src/pdf/operations.ts:104-111`, _manual_). No page selection; "Split" doesn't split into multiple files — it discards the back half and reports success.
- **H15 — ~21 of ~30 mobile tools are no-ops** (`operations.ts:140-149` + `registry.ts`, _manual_). Only 9 ids run; the rest (Protect/Redact/OCR/all conversions) return a stub. _Mitigation:_ ToolFlow shows an honest "preview mode — engine not bundled" note/toast (`ToolFlow.tsx:96-103,56`), so these are incomplete rather than deceptive — unlike the editor screens (C4).
- **H16 — Mobile Compress/Flatten are a plain re-save** (`operations.ts:116-131`, _manual_). No compression; Flatten leaves annotations/forms editable despite the "Lock annotations" claim.

---

## MEDIUM findings (30)

**Webhook robustness** (`paystack-webhook`): all errors swallowed to HTTP 200 so Paystack never retries (`:70-151`); non-atomic expire-then-insert races the `uniq_active_sub_per_user` partial index → constraint violation drops the new sub (`:89-101`); no event idempotency → duplicate `charge.success` stacks subscription rows and re-writes `payments` (`:70-103`); `invoice.update` flips status by `subscription_code` with no state guard → can resurrect a cancelled/expired sub to `active` (`:120-130`); `payments.update` keyed only on `reference` with no insert fallback → records nothing if no pending row exists (`:77-87`).

**Cancel / quota**: `paystack-cancel` sets `cancel_at_period_end` but leaves `status='active'` and returns `ok:true` even when the Paystack `disable` call is skipped/fails (recurring charge never stopped) (`paystack-cancel:41-57`); the gate's 3-second burst window lets unbounded downloads cost one credit (`index.html:2058-2082`); the quota gates a blob that already exists client-side — no real enforcement (`index.html:2053-2094`); client gate + server quota both fail open on error (`index.html:2079-2081`).

**Paywall upload cap**: html2pdf, scan, and **fromurl** take input outside `handleFiles`, bypassing the 5 MB cap — `fromurl` lets a free user process an arbitrarily large remote PDF (`index.html:7550-7562,2452-2460`).

**Web tool correctness**: `processSplit` single-range branch skips the bounds validation the multi-range branch has → crash on out-of-range (`index.html:8013-8020`); Rotate/Info/Compress mutate the shared cached `pdfDoc`, so re-running stacks transforms (rotate twice = 180°) and corrupts later ops (`index.html:8054-8073`); Flatten rasterizes via pdf.js with default annotation handling and doesn't reliably burn in form values (`index.html:9134-9156`); form-fill field-id mapping collides distinct field names (`index.html:10282,10317`); Sign is an image stamp marketed as "legally usable" e-signature (`index.html:8629-8703`); Protect permission flags non-functional (`index.html:8585-8606`); MOBI text-region offset is fragile/can truncate (`index.html:10059-10062`); MOBI/EPUB "no readable text" guard can't catch garbled output (`index.html:10067,10196`).

**Admin (business-logic, not security)**: revenue dashboard MRR/ARR use placeholder `$1`/`$10` constants instead of real ₦1,500/₦15,000 (~1500× wrong) (`admin.html:233-242`); lifetime revenue/payments hardcode `$`/USD while data is NGN/kobo (`admin.html:163,234,242,313`).

**Mobile**: `editorReducer 'addPage'` is a no-op behind a "Page added" toast (`editor/state.ts:194-195`); Flatten claims to lock annotations but only re-saves (`operations.ts:127-130`); ToolFlow "Remove metadata"/"Keep original" checkboxes are dead controls (`ToolFlow.tsx:32-63`); Compare shows hardcoded diff results regardless of input (`Compare.tsx:29-84`); RequestSign is toast-only (`RequestSign.tsx:68-77`); Settings subscription/account hardcoded, Restore/Manage no-ops (`Settings.tsx:43-65`).

**PWA**: `config.js` cached cache-first with no expiry → rotated keys / flipped flags never reach returning users (`sw.js:72-81`).

**Infra**: client gate comment says "fail open" but the HTTP-error path is fail-closed (`index.html:2072-2081`).

## LOW findings (27, condensed)

Webhook: non-constant-time HMAC compare (`:44-47`); trusts `metadata.user_id` without verifying it owns the email (`:61-62`); plan inference via amount-midpoint guess (`:31-38`); dead `config.toml` reference (`:7-9`). Billing: unawaited DB writes can drop fulfilment (`paystack-verify:64-97`); verify throws 500 if Paystack omits `data` (`:46-63`). Quota: IP key is shared/resettable (`download-quota:23-31`); consume fails open on DB error (`:80-85`); premium detection does 2 round-trips, fails closed-to-free on transient auth error (`:34-46`). Paywall: burst window shares a credit (`index.html:2058-2075`); metering marketed as server-enforced but is client-trust + soft fail-open (`index.html:1955-2003`). RLS: `site_settings` world-readable (fine for flags, no value schema) (`0001:244-260`). Web: Compare performs no diff, only side-by-side (`index.html:8722-8745`); `fetchPdfFromUrl` fetches arbitrary URL with no scheme/host validation (`index.html:9803-9818`); watermark fixed -45° pushes long text off-page (`index.html:8476-8489`). Mobile: `rotatePdf` not normalized for negative/non-90° (`engine.ts:47-48`); Viewer page-counter hardcoded 380px stride (`Viewer.tsx:73-77`); Scan import promise unawaited (`Scan.tsx:98`); FillSign marks doc signed with empty input (`FillSign.tsx:57-61`); Files Import/Share/Rename are toasts (`Files.tsx:46-91`); Comment markup never saved (`Comment.tsx:43-85`). Admin: grant-premium prompt case-sensitivity mismatch (`admin.html:287-290`); `loadAll()` swallows RLS errors → empty tables (`admin.html:207-218`); Announcement writable but never consumed (`admin.html:149,326`). Infra: CSP lacks `frame-ancestors` (relies on X-Frame-Options) (`_headers:7,23`).

---

## What is actually solid (verified, hypotheses refuted)

These were investigated and found **not** to be defects — important for calibrating the report:

- **Admin authorization is sound.** The client-side `role==='admin'` gate is only UX; every sensitive
  write (grant/revoke sub, make/revoke admin, settings) goes through the anon-key client and is enforced
  server-side by `is_admin()` RLS, with the `guard_profile_role` trigger (fixed in `0004`) blocking
  self role-escalation. No anon-reachable write bypass found. (`admin.html` + `0001`/`0004`)
- **No XSS found.** `esc()` is applied consistently to `full_name`/`email`/`reference` in both
  `pdf44-account.js` and `admin.html`; `site_settings.announcement` is never injected into the public DOM.
- **Direct RLS INSERT into `subscriptions`/`payments` by a normal user is correctly denied** (no user
  write policy; the `FOR ALL` admin policy doesn't grant it).
- **`config.js` leaks no secret** — only the public anon key (role `anon`) and Paystack *public* key.
- **The real page-manipulation web tools work**: merge, split (multi-range), organize, remove, extract,
  rotate, PDF→image, JPG→PDF, HTML→PDF, text→PDF, PDF→text, ZIP→PDF, and Tesseract OCR all produce valid
  output client-side. PDF→Word/PPT and PDF→Excel(CSV) are real (with fidelity caveats).
- **`build.js` runs clean** (212 routes, exit 0) and `_headers` ships a strong CSP/HSTS/nosniff set.
- **Mobile `bytes.ts` base64 codec and the pure pdf-lib engine ops are correct** and test-covered; the
  reducer/store are immutable and persisted. The mobile **Scan** flow is genuinely functional.

---

## Completeness / what this audit did NOT fully verify

- **No dynamic/runtime testing.** Findings are from static analysis. The two `config.toml` criticals
  (C2/C3) depend on actual deploy configuration — confirm `verify_jwt` per function in the Supabase
  dashboard; if it was set there, they're already mitigated.
- **Supabase RLS not executed.** Policy logic was read, not run against a live DB; `auth.uid()` behavior,
  the partial-unique-index race, and PostgREST `maybeSingle()` error semantics should be confirmed live.
- **pdf-lib encryption/encoding behavior asserted from known library semantics**, not executed in-browser
  for this exact build — worth a 5-minute manual repro for Protect/Unlock/non-Latin-1.
- **No dependency/CVE or supply-chain scan** beyond noting CDN scripts have SRI but Supabase-js (loaded
  in `pdf44-account.js`) does not.
- **OCR/conversion output quality** judged structurally, not against a corpus of real documents.
- **Mobile build/runtime** (Gradle, Codemagic APK, navigation on device) not executed.
- **Accessibility, i18n, and performance under very large PDFs** were out of scope.

---

## Recommended remediation order

1. **Stop revenue leaks & breakage (do first):** add `supabase/config.toml` (C2/C3); fix `paystack-verify`
   ownership/amount checks (C1, H3); add a UNIQUE constraint on `profiles.email` + stop the email-based
   webhook lookup or make it deterministic (H1/H4); stop swallowing webhook errors to 200 (M).
2. **Stop the dangerous "security" lies (do first):** disable or relabel Protect (C6), Redact (C7/C5),
   Unlock (H8), Sign — and the mobile equivalents — until real implementations exist.
3. **Fix data-loss bugs:** mobile Split/Extract (H14), web Compress claims (H9), MOBI (H10)/EPUB (H11)
   converters, Background-over-content (H13), non-Latin-1 crash (H12).
4. **Make the mobile editors real or remove them** (C4); fix the Viewer to render actual PDFs.
5. **Harden the paywall** if it's meant to enforce anything: server-side entitlement checks that don't
   trust client flags/IP headers, and don't cache entitlement reads in the SW (H6/H7/H5).
6. **Tidy:** admin revenue math/currency, dead controls, SW over-broad caching, CSP `frame-ancestors`.
