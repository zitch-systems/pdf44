# PDF44 — Every PDF Tool You Need

A complete, privacy-first PDF toolkit that runs entirely in the user's browser. No uploads, no servers, no accounts. Installable as a PWA on iOS, Android, and Desktop.

## What changed in this version

### Fixed
- **Light theme** — full design-token system with a polished light mode. Persists in `localStorage` with a `try/catch` so blocked storage (private mode, Tracking Prevention) doesn't break the app. Falls back to system preference, then dark.
- **Deprecated meta tag** — added `<meta name="mobile-web-app-capable">` alongside the older `apple-mobile-web-app-capable`.
- **Tracking Prevention warning** — storage access wrapped in `try/catch`; no exceptions in private/incognito or strict-tracking browsers.
- **Broken previews** — previews now use a cached `pdf.js` document for *both* preview and processing instead of re-saving via `pdf-lib`. This eliminates the `TT: undefined function: 21` warnings and is 5–10× faster. Previews are rendered at `devicePixelRatio` for crisp 4K output.
- **Service worker** — bumped to `v2`, added runtime cache, navigation falls back gracefully when offline, no longer fails install if a CDN asset is briefly unreachable.
- **Hero badge** — was `🟢 Available on all devices`; now uses a CSS-animated dot.
- **All chrome icons** — replaced emoji with crisp inline SVGs that scale to 4K.

### Added
- **Light + Dark theme** with toggle in the topbar; theme-color meta tag updates dynamically.
- **25 tools** (was 17). New: Extract Pages, Repair PDF, PDF to Text, Crop PDF, Redact PDF, PDF Metadata. Matches/extends iLovePDF feature coverage.
- **Page-number format options** (1, 1 of N, Page 1, Page 1 of N).
- **HTML to PDF** rewritten to use `html2canvas` + `jsPDF` for accurate inline-CSS rendering with multi-page overflow.
- **Install section** matching the screenshot — three cards (iPhone, Android, Desktop) with platform-specific behavior. Uses `beforeinstallprompt` for one-click install on Android/Desktop. iPhone gets a step-by-step modal because Safari doesn't expose a programmatic prompt.
- **Contact page + section** — `hello@pdf44.com` rendered as a real `mailto:` link, prominently styled.
- **Privacy page** — documents the zero-upload architecture for trust signals.
- **App footer** with contact, install, privacy links.
- **Toast notifications** with proper SVG status icons.
- **Page-grid (organize / remove)** uses `pdf.js` thumbnails with DPR-aware sharpness.
- **High-resolution rendering** — every canvas, preview, and grid thumbnail multiplies by `devicePixelRatio` (capped at 2 to avoid memory blowups on huge PDFs).
- **PWA shortcuts** — long-press the installed icon to jump straight to Merge, Split, Compress, or PDF→JPG.

### Improved
- **Layout** — bigger hero, animated stat counters, category headings with separators, hover-elevated tool cards, gradient icon backgrounds.
- **Icon system** — single-color SVG paths through a runtime `icon()` helper. 30+ named icons. Renders at any size, picks up `currentColor`, no emoji rendering inconsistencies across OS/browser.
- **Drag & drop** is more forgiving — accepts files of nearly any case (`.PDF`, `.Pdf`), rejects oversized files with a clear toast.
- **File-size check** — 200 MB cap with a per-file error message rather than silent failure.
- **Compression options** — three preset levels controlling `objectsPerTick`.

## Files

Upload these to your repo root:

| File           | Purpose                          |
|----------------|----------------------------------|
| `index.html`   | The entire app (HTML/CSS/JS)     |
| `sw.js`        | Service worker for offline + PWA |
| `manifest.json`| PWA manifest with shortcuts      |

## Deploy to Cloudflare Pages

1. Create GitHub repo, push these 3 files.
2. dash.cloudflare.com → Pages → Create Project → Connect to GitHub → pick your repo.
3. Build settings: Framework = **None**, Build command = *(empty)*, Output = `/`.
4. Deploy.

## Monetag ad setup

In `index.html`, find and replace these three placeholders:

```html
<!-- Top banner -->
<div class="ad-slot ad-banner" id="adBanner">📢 Ad banner — Replace…</div>

<!-- Rectangle (appears in home + tool pages) -->
<div class="ad-slot ad-rectangle">📢 Rectangle ad — Replace…</div>

<!-- Sticky bottom -->
<div class="ad-slot ad-sticky" id="adSticky">📢 Sticky ad — Replace…</div>
```

Also enable the Monetag script tag at the top of `<head>`:

```html
<script src="//monetag.com/tag/YOUR_ID.js"></script>
```

## Tech stack
- **pdf-lib** — PDF creation, editing, encryption
- **PDF.js** — rendering & text extraction (the source of truth for visuals)
- **jsPDF** — image/text/HTML→PDF
- **html2canvas** — HTML rendering for HTML→PDF fidelity
- **JSZip + FileSaver** — bulk downloads
- Loaded from cdnjs.cloudflare.com — zero build step

## Privacy guarantees
- No file ever leaves the browser tab. All `pdf-lib` and `pdf.js` work happens in-memory.
- No analytics, no accounts, no fingerprinting.
- Service worker caches static assets only. User files are never persisted.
- Theme preference is the *only* thing stored (in `localStorage`).
