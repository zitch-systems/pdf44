# PDF44 — Android app (React Native)

A privacy-first PDF & document toolkit for Android, recreated from the PDF44
Material 3 design handoff. **Every operation runs on-device** — no uploads, no
accounts. Built with **bare React Native 0.76 + react-native-paper (Material 3)**.

## What's implemented

All 15 screens from the design spec, with a back-stack navigation model, live
theming (dark/light, 5 accents, grid/list tool layout, FAB/bar nav style), and
snackbar feedback on every mutating action:

| Area | Screens |
|---|---|
| Hub | Onboarding · Home · All Tools · Search · Files (with action sheet) |
| Document | Viewer (reading mode, thumbnails) · **Edit PDF** (full object editor + undo/redo + layers) |
| Sign | Fill & Sign / Fill / Sign (draw/type/image signature) · Request signatures |
| Capture | Scan to PDF (camera) |
| Review | Comment / Markup · Compare files |
| Organize | Organize Pages (rotate/duplicate/extract/delete) |
| Tools | Generic tool flow · Settings |

### Real on-device PDF operations

These run for real via [`pdf-lib`](https://pdf-lib.js.org/) (pure JS, no native
engine), reading/writing files with `react-native-fs` and the system pickers:

- **Image → PDF** (gallery or camera) · **Scan → PDF**
- **Merge** · **Split / Extract** · **Rotate** · **Compress (re-save)**
- **Page numbers** · **Watermark** · **Flatten**

Tools needing a heavier engine (PDF→Word/Excel, rasterising PDF→JPG, OCR,
password protect/unlock, redact, crop, EPUB) run in **preview mode** and say so
honestly in the UI. They're isolated behind `src/pdf/registry.ts` so swapping in
a real engine later is a one-line change.

## Project layout

```
mobile/
├── App.tsx                  providers (SafeArea, Paper theme, app + toast state)
├── src/
│   ├── theme/               design tokens → Paper MD3 themes
│   ├── data/tools.ts        the full tool catalog
│   ├── state/               reducer-based store (nav back-stack, files, prefs) + persistence
│   ├── pdf/                 engine.ts (pdf-lib ops) · operations.ts (I/O wiring) · bytes.ts · registry.ts
│   ├── components/          M3 atoms (TopAppBar, NavBar+FAB, Sheet, Tool tiles, etc.)
│   ├── screens/             all 15 screens (+ editor/state.ts reducer)
│   └── AppShell.tsx         navigation host, tab bar, FAB, screen router
├── __tests__/               jest unit tests (28 tests: codec, engine, reducers, catalog, editor)
├── android/                 Gradle project (RN 0.76)
├── codemagic.yaml           CI: typecheck + test + build debug & release APK
└── design-reference/        the original design tokens + DESIGN_SPEC.md
```

## Develop locally

```bash
cd mobile
npm install
npm run tsc      # typecheck
npm test         # unit tests
npm start        # Metro
npm run android  # build & run on a device/emulator (needs Android SDK)
```

## Build an APK

Locally (needs Android SDK):

```bash
cd mobile/android
./gradlew assembleRelease     # → app/build/outputs/apk/release/app-release.apk
```

On **Codemagic** (recommended): the config is `codemagic.yaml` at the **repo root**
(Codemagic only auto-detects it there). Connect the repo as a React Native app and
run the `android-apk` workflow to build APKs, or `android-emulator-test` to boot an
emulator and run the Maestro UI smoke flow. The debug APK always builds; for a
release-signed APK add the `pdf44_release` env group with your keystore (details in
the YAML header). Without it, release falls back to debug signing.

## Notes

- New Architecture (Fabric) + Hermes are enabled (RN 0.76 defaults).
- Native modules used: paper, safe-area-context, svg, vector-icons,
  async-storage, fs, image-picker, document-picker — all autolinked.
- Inter / JetBrains Mono are referenced in tokens; bundle the font files into
  `android/app/src/main/assets/fonts` for pixel-exact type (the app renders fine
  with system fonts until then).
