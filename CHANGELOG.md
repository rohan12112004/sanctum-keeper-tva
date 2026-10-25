# 📋 CHANGELOG — THE SANCTUM KEEPER: TVA EDITION

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — Stage 7: Advanced Features

### Planned
- [ ] A1: Boolean compound logic (AND/OR/NOT) toggler in UI
- [ ] A2: Dormammu Loop Detector — in-memory cycle breaker
- [ ] A3: System Tray integration (minimize to tray, cron scheduler)
- [ ] A4: Bulk queue (p-queue) for 200+ file drops, locked file retry
- [ ] A5: Crash-proof write-ahead ledger (already partially done via atomic writes)

---

## [1.0.0] — 2026-10-25 — Stage 0–6: Full Core Implementation

### ✅ Added (Stage 0 — Project Scaffold)
- Initialized Git repository
- Created full project directory structure
- `package.json` with `electron@28`, `chokidar@3`, `trash@8` dependencies
- `.gitignore` configured for `node_modules/`, `dist/`, logs

### ✅ Added (Stage 1 — Electron Window & IPC Bridge)
- `src/main/main.js` — BrowserWindow creation, IPC handler registration, app lifecycle
- `src/main/preload.js` — Secure `contextBridge` exposing `window.tvaAPI`
- `src/renderer/index.html` — TVA Holo-Terminal 4-tab shell layout
- `src/renderer/js/app.js` — Tab navigation, toast notifications, Miss Minutes clock, push-event coordinator

### ✅ Added (Stage 2 — B1: Branch Doorways)
- `src/main/watcher.js` — `DoorwaySentinel` class
  - Chokidar watcher, depth=0 non-recursive
  - `isSafePath()` blocking root/system directories
  - `awaitWriteFinish` to avoid processing locked/incomplete files
  - Persists doorways to `userData/doorways.json` (atomic write)
- `src/renderer/js/doorways-ui.js` — Add/Remove folder UI, sweep-per-folder button, counter badge, sim dropdown sync

### ✅ Added (Stage 3 — B2+B3: Temporal Loom + First Spell Wins)
- `src/main/engine.js` — `RuleEngine` class
  - `evaluateCondition()` for name/extension/size/age_days fields
  - `evaluateRule()` with ALL/ANY/NONE compound logic
  - `findFirstMatch()` — strict top-to-bottom, first-match-breaks-loop (B3)
  - `getSafeDestination()` — collision-safe naming (`file (1).pdf`)
  - `executeAction()` — MOVE/COPY/RENAME/TRASH with ledger recording
  - `simulateSweep()` — dry-run (B4), no disk modification
  - `executeSweep()` — live batch sweep with shared batchId
- `src/renderer/js/rules-ui.js` — Visual rule builder modal, priority reorder (▲▼), add/edit/delete

### ✅ Added (Stage 4 — B4: Eye of Simulation)
- `src/renderer/js/preview-ui.js` — Simulation matrix table renderer
  - Shows: File → Matched Rule → Action → Predicted Destination
  - Summary bar: total / will-act / untouched / ignored counts
  - Clear "SIMULATION ONLY" reminder banner

### ✅ Added (Stage 5 — B5: Sacred Ledger & Time Stone Rewind)
- `src/main/ledger.js` — `SacredLedger` class
  - `record()` — atomic JSON write with UUID, ISO timestamp, batchId
  - `rewind()` — single entry undo (MOVE/RENAME reversed, COPY deleted)
  - `rewindLatestSweep()` — batch undo by batchId
- `src/renderer/js/ledger-ui.js` — Ledger table renderer
  - TVA stamps: `BRANCHED` `REPLICATED` `TRANSMUTED` `PRUNED`
  - Status stamps: `COMMITTED` / `REWOUND`
  - Per-entry Rewind button + Rewind Latest Sweep

### ✅ Added (Stage 6 — Full TVA UI Theme)
- `src/renderer/css/tva-theme.css`
  - CRT scanline overlay (`repeating-linear-gradient` + scroll animation)
  - CRT flicker body animation
  - Amber glow typography (`text-shadow`)
  - Miss Minutes clock (CSS-only, animated hands)
  - Sentinel status pill (pulsing dot)
  - Custom amber scrollbar
- `src/renderer/css/components.css`
  - Amber LED indicator push-buttons
  - Emerald sweep button
  - Doorway cards with sentinel pulse dot
  - Rule cards with priority number (`::before` pseudo)
  - TVA action/status stamp badges
  - Modal with amber glow box-shadow
  - Simulation and Ledger tables

---

## Commit History

| Commit | Stage | Description |
|--------|-------|-------------|
| `17f4354` | All | `feat: initialize sanctum-keeper-tva — all 5 core features (B1-B5) complete with TVA/Loki theme` |

---

*For All Time. Always.*

