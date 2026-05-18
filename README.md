# PDF44 - Complete PDF Toolkit PWA

Every PDF tool you need. 100% client-side. No uploads. No servers. Private & fast.

## All 17 Tools

| Category | Tools |
|----------|-------|
| **Organize** | Merge, Split, Organize Pages, Rotate, Delete Pages |
| **Optimize** | Compress, Extract Text (OCR) |
| **Convert** | PDF→JPG, JPG→PDF, PDF→PNG, HTML→PDF, Text→PDF |
| **Edit & Secure** | Edit, Watermark, Page Numbers, Protect, Unlock, Sign, Compare |

## Files to Upload to GitHub

Upload these 3 files to your repo root:
- `index.html` — Complete application
- `sw.js` — Service worker for offline
- `manifest.json` — PWA install config

## Deploy to Cloudflare Pages

1. Create GitHub repo → Upload 3 files
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Pages → Create Project
3. Connect to GitHub → Select `pdf44` repo
4. Build settings: Framework = **None**, Build command = *(empty)*, Output = `/`
5. Save & Deploy

## Monetag Ads Setup

Replace these placeholders in `index.html`:
1. **Top Banner** — Find `<div class="ad-slot ad-banner" id="adBanner">` → replace with your Monetag banner ad code
2. **Rectangle** — Find `<div class="ad-slot ad-rectangle">` → replace with Monetag rectangle/native ad code  
3. **Sticky Bottom** — Find `<div class="ad-slot ad-sticky" id="adSticky">` → replace with Monetag sticky/footer ad code

Also replace the script in `<head>`:
```html
<script src="//monetag.com/tag/YOUR_ID.js"></script>
```

## Tech Stack
- pdf-lib.js — PDF manipulation
- PDF.js — Rendering & text extraction
- jsPDF — Image/text/HTML to PDF
- JSZip — Bulk ZIP downloads
- FileSaver.js — Browser downloads
- All via CDN — zero build step

## Mobile Optimized
- Responsive sidebar (hamburger on mobile)
- Touch-friendly upload zone
- Optimized tap targets (44px minimum)
- Sticky bottom ad doesn't block content
- Toast notifications from bottom (thumb-reachable)
- 2-column tool grid on mobile
