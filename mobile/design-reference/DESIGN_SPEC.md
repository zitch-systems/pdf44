# Handoff: PDF44 — Android Mobile App (Material 3)

## Overview
PDF44 is a free, **privacy-first PDF & document toolkit**. The defining product promise is that **every operation runs entirely on the user's device** — no uploads, no accounts required, no watermarks. This package is the design for the **Android phone/tablet/foldable app**: a complete Material 3 surface covering the home hub, the full tool catalog, a document viewer, and every editing/signing/organizing flow.

The app is **subscription-based** (a "PRO" tier). The user is always signed in to a local profile; there is no "install as app" step inside the product (it already *is* the app).

## About the Design Files
The files in `prototype/` are **design references created in HTML/React (via in-browser Babel)** — they are prototypes that show the intended look, layout, and interaction behavior. **They are not production code to copy directly.**

Your task is to **recreate these designs in the target codebase's environment** using its established patterns and libraries. For a real Android build the natural targets are:
- **Jetpack Compose with Material 3** (`androidx.compose.material3`) — strongly recommended; the design is authored to M3 specs (navigation bar with pill indicators, FAB, bottom sheets, snackbars, large top app bars, segmented buttons, switches, ripple state layers).
- or **React Native** (e.g. `react-native-paper` for M3) if the project is cross-platform.

If no environment exists yet, choose Jetpack Compose + Material 3. Map every component below to its M3 equivalent rather than reproducing the HTML DOM.

To run the prototype locally: open `prototype/index.html` in a browser (it needs network access for React/Babel CDNs and Google Fonts). Use the **Tweaks** panel (top-right toggle in the host) to flip theme, accent, nav style, tool layout, density, and device frame.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, shadows, and interactions are all specified here and in `tokens/`. Recreate the UI faithfully using the codebase's Material 3 components, substituting M3 primitives where they match (they almost always do).

---

## Design Tokens
All values live in `tokens/`. Import order is `fonts → colors → typography → spacing`.

### Color — Dark (default brand surface)
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0a0a0f` | App canvas |
| `--bg-2` | `#12121a` | Cards, panels, nav bar, bottom sheets |
| `--bg-3` | `#1a1a2e` | Insets, page background behind documents |
| `--bg-elev` | `#1e1e2e` | Elevated menus / popovers / sheets |
| `--text` | `#ffffff` | Primary text |
| `--text-2` | `#b8b8c8` | Secondary / body |
| `--text-3` | `#a0a0b8` | Tertiary / labels / meta |
| `--border` | `rgba(255,255,255,0.07)` | Hairlines |
| `--border-strong` | `rgba(255,255,255,0.12)` | Stronger dividers, chip outlines |

### Color — Light (full mirror)
`--bg #f7f8fc` · `--bg-2 #ffffff` · `--bg-3 #eef0f7` · `--text #0f1729` · `--text-2 #475569` · `--text-3 #64748b` · `--border rgba(15,23,41,0.08)` · `--border-strong rgba(15,23,41,0.15)`.

### Accent (brand red → coral → orange) — used as Material 3 **primary**
- `--accent #e5322d` · `--accent-2 #ff5a52` · `--accent-3 #ff7a45`
- `--grad-brand: linear-gradient(135deg, #e5322d, #ff5a52)` — logo mark, FABs, primary buttons, headline highlight.
- `--accent-glow rgba(229,50,45,0.18)` — colored shadow under primary/FAB.
- Accent is **tweakable**; alternates shipped: `#3b82f6`, `#22c55e`, `#8b5cf6`, `#f97316`.

### Status
`--success #22c55e` · `--warning #f59e0b` · `--error #ef4444` (light: `#16a34a` / `#d97706` / `#dc2626`).

### Tool-category gradients (icon tiles)
12 named ramps, each `linear-gradient(135deg, base, light)`:
`red #ef4444→#f87171` · `orange #f97316→#fb923c` · `yellow #eab308→#facc15` · `green #22c55e→#4ade80` · `teal #14b8a6→#2dd4bf` · `cyan #06b6d4→#22d3ee` · `blue #3b82f6→#60a5fa` · `indigo #6366f1→#818cf8` · `purple #8b5cf6→#a78bfa` · `pink #ec4899→#f472b6` · `rose #f43f5e→#fb7185` · `slate #64748b→#94a3b8`.
Each tool has an assigned ramp (see catalog). Tile shadow: `0 8px 18px -8px <baseColor>` + `inset 0 1px 0 rgba(255,255,255,0.25)`.

### Typography
- **Sans (all UI):** Inter — weights 400/500/600/700/800.
- **Mono (file paths, signature-typed, form values):** JetBrains Mono — 400/600.
- Size ramp (px): 11, 12, 13, 14, 15, 16, 18, 20, 24, 32; display `clamp(28,5vw,48)`.
- Line heights: tight 1.1 · snug 1.3 · normal 1.5 · relaxed 1.65.
- Letter spacing: display `-0.02em` · titles `-0.01em` · uppercase labels `0.06em`.
- Roles: H1 = 800/32/1.1; H2 = 700/24/1.3; Title = 700/20/1.3; Body = 400/16/1.5; Label = 600/14/1.3.
- **Large top-app-bar headline** in-app uses 800/33px, `-0.02em`.

### Spacing / Radii / Shadow / Motion
- Spacing (4px base): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Radii: xs 6 · sm 10 · **16 (cards/panels)** · lg 24 · pill 999. **Note:** the app multiplies M3 radii by a `radius` tweak (0.4–1.6, default 1) — treat 16 as the base card radius and scale a corner-radius theme value if you support density theming.
- Shadows (dark): sm `0 2px 8px rgba(0,0,0,.3)` · base `0 8px 32px rgba(0,0,0,.4)` · lg `0 20px 60px rgba(0,0,0,.5)` · hover/lift `0 8px 24px rgba(229,50,45,.18)`.
- Motion: standard ease `cubic-bezier(.4,0,.2,1)`; bounce (toggles, springy) `cubic-bezier(.34,1.56,.64,1)`; durations fast .15s / base .25s / slow .4s.

---

## App Shell & Navigation

### Device frames (tweakable)
Three responsive frames: **Phone** (≈384×832, punch-hole camera, gesture-nav handle), **Tablet**, and **Foldable** (wider, two-pane capable). On real Android, implement adaptive layout with **WindowSizeClass** — single column on compact width, list-detail/two-pane on medium/expanded.

### Material 3 Navigation Bar (bottom)
Height ~74dp, surface `--bg-2` at 90% with 24px blur, top hairline `--border`. Tabs: **Home · Tools · Files · Settings** (an optional **Scan** tab appears when nav style = "bar"). Active item shows the M3 **active indicator pill** (60×32, radius 16, `accent @ 20%` fill) behind the icon; active icon + label use accent/`--text`, inactive use `--text-3`. Icon stroke thickens 2 → 2.4 when active.

### FAB (tweakable: "fab" vs "bar")
When nav style = **fab** (default): a brand-gradient **Scan FAB** floats bottom-right (60dp, radius 20, `--grad-brand`, glow shadow). It is **extended** (icon + "Scan" label) on the Files tab, circular elsewhere. Hidden on Settings. When nav style = **bar**, the FAB is removed and Scan becomes a 5th nav-bar destination instead.

### Navigation model
A **back stack** drives everything. Tapping a tab resets to that root; opening a file/tool pushes a screen; every Back/Close pops one entry (so file → viewer → back returns to Files, not Home). Implement with the Navigation component + a stack; tab switches clear to root.

### Feedback
Actions (process, sign, scan, export, star, delete, save) raise an **M3 Snackbar** — bottom-anchored above the nav bar, `--bg-elev`, leading accent icon, auto-dismiss ~2.6s.

---

## Screens / Views

### 1. Onboarding / First run
- **Purpose:** introduce the privacy promise before entering the app.
- **Layout:** radial accent glow at top; 64dp brand-gradient logo mark ("P"); H1 (800/34, `-0.02em`) with the phrase "private & on-device" rendered in the brand gradient (gradient text); lead paragraph in `--text-2`; three feature rows (44dp gradient icon tile + title + description) for *No file ever leaves your device* / *41+ tools, one app* / *No registration, no watermarks*.
- **Footer:** full-width primary Button "Get started" + centered text "Skip". Both route to Home (reset stack).

### 2. Home
- **Greeting header:** small brand logo + "PDF" with "44" in gradient; a pill status chip ("On-device", pulsing green dot).
- **Greeting line:** "Good morning, Alex" (`--text-3`). *(No big headline — removed by request.)*
- **Search bar (docked, M3):** centered, 56dp tall, radius 28 (pill), `--bg-3`, leading search icon, placeholder "Search tools & files", trailing 36dp circular avatar (gradient, initials "AC"). Tapping opens the Search screen.
- **Quick actions:** 4-column grid of tool tiles — Scan · Edit PDF · Fill PDF · Sign PDF · Merge · Compress.
- **Recent:** horizontal scroller of file cards (152dp wide, doc thumbnail + name + meta). "All files" action → Files.
- **Popular tools:** vertical list rows.
- Tool **layout is tweakable** (grid of tiles vs. list rows) — applies anywhere tools are shown.

### 3. All Tools
- Large top app bar "All tools" / subtitle "41+ tools · everything runs on-device".
- Docked search → Search screen.
- **Filter chips** row: All · Convert · Edit & sign · Review & sign · Organize · Optimize & secure (single-select; updates the visible groups).
- Tool groups by category, each a section header + tool grid/list.

**Tool catalog (id · icon-ramp · title · subtitle):**
- *Convert:* PDF to Word (blue) · PDF to JPG (indigo) · Image to PDF (pink) · Scan to PDF (green) · EPUB to PDF (orange, **New**) · PDF to Excel (green).
- *Edit & sign:* Edit PDF (orange) · Fill PDF (teal) · Sign PDF (green) · Fill & Sign (blue) · Watermark (cyan) · Page Numbers (indigo).
- *Review & sign:* Comment (yellow) · Fill PDF (teal) · Sign PDF (green) · Request signatures (purple) · Compare files (teal).
- *Organize:* Organize (yellow) · Merge (red) · Split (orange) · Extract (teal) · Crop (indigo) · Rotate (green).
- *Optimize & secure:* Compress (cyan) · Protect (red) · Unlock (green) · Redact (slate) · Recognize text/OCR (blue) · Flatten (slate).

Tool tile: 60dp rounded-square gradient icon (radius 18), 27dp white line icon, optional "New" badge (gradient, top-right). List row variant: 44dp tile + title + one-line description + chevron.

### 4. Search
- Pinned field row: back arrow + live text input (auto-focus) + clear button, in a pill `--bg-3` container.
- **Empty state:** "Suggested" chips (Merge, Compress, Sign, Scan, PDF to Word, Protect) + "Recent files" list.
- **Typing:** live-filters into **Tools** and **Files** result sections; no-match shows an icon + "No results for ‘…’".

### 5. Files
- Large top app bar "Files" / "Stored only on this device"; actions: Import + a primary (gradient-circle) Scan.
- Filter chips: All · Recent · Scanned · Signed · Starred (actually filter the list).
- File rows: doc thumbnail (42dp) + name + meta + overflow (⋮). Hairline divider inset to 80px left.
- **⋮ overflow → M3 bottom sheet (ActionSheet):** header (thumb + name + meta) then Open · Share/Export · Add/Remove star · Rename · **Delete** (destructive, `--error`). Star and Delete mutate the list live + raise a snackbar. Empty filter shows an empty state.

### 6. Document Viewer
- Top app bar: file name + "Page 1 of 12"; actions: **Thumbnails** (grid icon) · **Reading mode** toggle · **Share**.
- **Page view:** scrollable `--bg-3` stage; white page (332dp, 8dp accent top band, sample letter content) + a floating "1 / 12" pill; next page peeks at 50% opacity.
- **Reading (liquid) mode:** reflows to a single text column on `--bg` (heading + paragraph skeleton lines + sub-heading) — the M3 "liquid mode" analog.
- **Thumbnails drawer (bottom sheet):** 3-col page thumbnails; "Organize" link opens the Organize screen; tapping a thumb jumps + snackbar.
- **Bottom action bar:** Edit · Comment · Sign · Pages · Export — routes to the respective flows.

### 7. Edit PDF — comprehensive object editor
A full annotate/markup canvas. This is the most complex screen — replicate carefully.
- **Compact header:** Close (×) + "Edit PDF" + primary "Done" (saves + snackbar + back).
- **Tool rail (horizontal, scrollable):** Select · Text · Draw · Shape · Highlight · Image · Sign · Stamp · Redact · Erase. Active tool = accent-tinted tile.
- **Contextual property bar** (changes by selected object / active tool):
  - *Text:* Font family segmented (Sans/Serif/Mono, shown as "Aa") · Size stepper (− value +, 8–72) · Style toggles **B / I / U** · Align left/center/right.
  - *Shape:* shape-kind segmented (rect / ellipse / line / arrow) · Outline⇄Filled · stroke-width dots (1/2/4/6).
  - *Line/Arrow, Draw, Sign:* stroke-width dots.
  - *Always (except image/redact):* color swatch row (8 colors incl. black/white).
  - *Any selection:* opacity slider (0.1–1).
  - Default hint when nothing applies: "Pick a tool, or tap an object to edit it".
- **Canvas:** white page with faint document text behind; objects are absolutely placed. Tapping the page with a creation tool **adds** that object at a default spot and selects it. Object kinds rendered: text box, rect, ellipse, line, arrow (drawn arrowhead), highlight band, redact (solid black), ink/signature (hand-drawn SVG path), stamp ("APPROVED", rotated −8°, bordered), image placeholder.
- **Selected object:** accent outline + a floating mini-toolbar above it (Duplicate · Bring forward · Delete) and a **Move** nudge bar (←↑↓→, 8px steps).
- **Bottom bar:** Undo · Redo (history stack) · Zoom − / % / + (60–160%) · **Layers** (count badge) · Add page.
- **Layers sheet:** reversed object list; tap to select, per-row delete; live count.

State to model: `objects[]` (each with id, kind, x, y, w, h, color, opacity + kind-specific props: text/fontSize/bold/italic/underline/align/font, strokeWidth, fill, stampLabel), `selectedId`, `activeTool`, `past[]`/`future[]` undo stacks, tool-default style state (color, fontSize, font, bold/italic/underline, align, shapeKind, strokeWidth), `zoom`.

### 8. Fill & Sign / Fill PDF / Sign PDF
One engine, a `mode` flag drives three entry points:
- **Fill PDF** (`mode: fill`): form tools only (Text, Check, Date); the signature field is dimmed/disabled.
- **Sign PDF** (`mode: sign`): opens with the **signature sheet** up immediately; only the signature tool.
- **Fill & Sign** (`mode: both`): all four tools.
- Page shows a form (name field on an underline, an agree checkbox, a "Tap to sign" target). Header trailing button is Share, then **Export** once signed.
- **Signature bottom sheet:** segmented Draw / Type / Image; a white capture area (drawn SVG path, or cursive typed name, or photo prompt); ink color choices; Clear; "Use signature" (fills the field + snackbar).

### 9. Scan to PDF
- Full-bleed dark camera screen: Close + title + Flash; a viewfinder card with a detected-document outline (accent border + glow) and corner brackets; "Document detected — hold steady".
- Mode selector: Document · ID Card · Book.
- Bottom: gallery import · 74dp white shutter (capture → snackbar → Viewer) · captured-stack thumbnail with a count badge.

### 10. Generic Tool flow (Merge, Compress, Protect, …)
- Top app bar with the tool name; tool identity row (gradient icon + name + "Runs entirely on your device").
- **UploadZone** ("Add a file / nothing is uploaded"); an **Options** card (e.g. a quality Select, "Remove metadata" checkbox, "Keep original" checkbox); full-width **Process** primary button (→ result in Viewer + snackbar); reassurance line "No file ever leaves your phone".

### 11. Organize Pages
- Top app bar: title + page count (+ "N selected"); actions Select-all + Done.
- **3-col page grid**; each page tile selectable (accent ring + check badge), can be rotated (animated), plus a dashed "Add" tile (blank page).
- **Contextual bottom bar** when ≥1 selected: Rotate · Duplicate · Extract · **Delete**. All mutate + snackbar.

### 12. Comment / Markup
- Header: Close + "Comment" + a **comments count** action (badge) + Done.
- Markup tool rail: Highlight · Underline · Strike · Note · Draw · Text (each with its own color).
- Page preview shows applied markup (yellow highlight band, blue underline, orange sticky-note pin).
- Contextual add bar ("Tap the page to add a <tool>") with an **Add** button.
- **Comments panel (bottom sheet):** threaded list — avatar (initials, colored), name, relative time, comment text. Adding pushes a new entry.

### 13. Compare files
- Large top app bar. Two file slots (Original / Revised) with a swap affordance between them.
- **Compare** button → results: three stat cards (+Added / −Removed / Modified) and **side-by-side page renders** with colored change bands (green add / red delete / amber modified). **Export report** secondary button.

### 14. Request signatures (send for signature)
- Large top app bar. Document chip (thumb + name + "12 pages · 1 signature field").
- **Recipients** list — each card: colored avatar (initials, or order number when ordered) + Name + Email inputs + remove. "Add recipient" dashed button.
- **Set signing order** toggle (M3 Switch) — when on, recipients sign sequentially (avatars show 1,2,3…).
- Full-width **Send request** (→ snackbar "Request sent to N recipients" + back). Footnote "Audit trail kept on-device".

### 15. Settings
- Large top app bar "Settings".
- **Account block:** 56dp avatar (gradient, "AC") + name + "Subscription · Active" + **PRO** pill. *(There is no "install as app" row — the product is the app.)*
- **Subscription section:** current plan card (PRO, price, renewal date), Manage subscription, Restore purchases.
- **Appearance:** Dark theme switch · Tool layout (grid/list) · (accent/density live in the Tweaks layer).
- **Privacy:** On-device processing (locked on) · Privacy policy.
- **App:** Clear recent files · About PDF44 (version) → can replay Onboarding.
- Footnote: "No uploads · no registration · no watermarks".

---

## Interactions & Behavior (summary)
- **Ripple state layers** on every pressable (M3 default — you get this free in Compose).
- **Bottom sheets** rise from bottom with a drag handle + scrim; dismiss on scrim tap.
- **Switch** thumb springs with the bounce easing; grows 16→22dp when on.
- **Reading mode**, **theme**, **nav style**, **tool layout**, **accent**, **corner radius**, **density**, **device frame** are all live-switchable (these map to app settings + theming; in the prototype they're exposed via Tweaks).
- **Toasts/snackbars** confirm every mutating action.
- Entrance animations should degrade gracefully (respect `prefers-reduced-motion` / Android animator-duration settings).

## State Management
- **Navigation:** back stack of screens; tabs reset to root.
- **Theme:** `dark` boolean, `accent` color, `density`, `cornerRadius`, `navStyle`, `toolLayout`, `deviceClass`.
- **Files:** list with `{id, name, meta, accent, starred, tags[]}`; filter selection; selected file for the action sheet.
- **Editor:** see screen 7.
- **Fill & Sign:** `mode`, `signed`, signature-sheet open, signature data.
- **Organize:** `pages[]` with rotation, selection set.
- **Comment:** `comments[]`, active markup tool, panel open.
- **Compare:** two file refs, computed diff result.
- **Request signatures:** `recipients[]`, signing-order boolean.
- No network data fetching — all state is local/on-device (that's the product promise). Real PDF operations would be backed by an on-device PDF engine (e.g. PDFium/pdf-android, Apache PDFBox-Android, or platform print/rendering APIs).

## Assets
- **Icons:** the prototype uses PDF44's own 74-icon line set (single-color, `currentColor`, 2px stroke). In the app, use **Material Symbols** equivalents (or your icon system) at matching stroke weights. Tool icon names referenced: scan, edit, sign, text2pdf, jpg2pdf, merge, compress, split, extract, organize, protect, unlock, redact, watermark, pagenumber, compare, contact, ebook, pdf2word, pdf2jpg, pdf2excel, crop, rotate, flatten, install, history, shield_check, etc.
- **Fonts:** Inter + JetBrains Mono (Google Fonts). Bundle them with the app for offline use.
- **Imagery:** none required — documents are represented by generated "paper" thumbnails (white card, accent top band, skeleton text lines). Real thumbnails come from rendering page 1.
- **Logo:** the "P" brand mark is a gradient rounded square (`--grad-brand`); "PDF44" wordmark renders "44" in the gradient.

## Files (in this bundle)
- `prototype/index.html` — host page (loads React/Babel + the design-system bundle, mounts the app, defines device frames & keyframes).
- `prototype/android.jsx` — Material 3 atoms: phone/tablet/foldable frame, status bar, gesture bar, ripple `Press`, top app bar, docked search, navigation bar, FAB, chips, tool tiles/rows, doc thumbnails, file cards/rows, switch, bottom sheet + action sheet, toast.
- `prototype/screens-home.jsx` — Home, All Tools, Files, Search + the tool catalog data.
- `prototype/screens-doc.jsx` — Viewer, **Edit PDF** (comprehensive editor), Fill & Sign / Fill PDF / Sign PDF, Scan, generic Tool flow, Share sheet, Settings.
- `prototype/screens-pro.jsx` — Organize Pages, Comment/Markup, Compare files, Request signatures.
- `prototype/app.jsx` — app shell, navigation back-stack, Tweaks wiring, toast provider.
- `prototype/tweaks-panel.jsx` — the in-prototype controls (theme/accent/nav/layout/radius/density/device). **Not part of the product** — a prototype affordance only.
- `prototype/_ds_bundle.js`, `prototype/styles.css` — the PDF44 design-system runtime + stylesheet entry the prototype links.
- `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`, `tokens/fonts.css` — the source of truth for all token values above.

> **Note on the prototype stack:** React + in-browser Babel is a *prototyping* convenience, not a recommendation. Build the real app in Jetpack Compose + Material 3 (or React Native + Paper). Treat this bundle as the spec.
