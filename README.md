# ⏳ THE SANCTUM KEEPER — TVA EDITION

<div align="center">

![TVA Banner](assets/tva_banner_placeholder.png)

**"For All Time. Always."**

A deterministic, rule-based desktop file organizer — themed after the **Time Variance Authority** from Marvel's *Loki*.

[![Electron](https://img.shields.io/badge/Electron-28.x-47848F?style=flat-square&logo=electron)](https://electronjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square)](https://github.com)
[![Hackathon](https://img.shields.io/badge/Hackathon-Marvel%20Multiverse%20Theme-red?style=flat-square)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## 🎯 What is The Sanctum Keeper?

The **Sanctum Keeper** is a desktop application that watches your folders and automatically organizes files using **user-written rules** — no AI, no guessing, no randomness. You write the rule. The machine follows it. Every. Single. Time.

> **Problem Statement (Hackathon):**
> Wong's Sanctum Sanctorum is buried under relics arriving through portals all day. He wants enchantments he writes himself that behave the same way every single time — *no guesswork, no AI deciding what a file "feels like"*.

---

## ✨ Core Features (B1–B5)

### 📁 B1 — Branch Doorways (Watched Folders)
Watch up to **3 folders** simultaneously. The Keeper remembers them after restart.
- **Root/system directory protection** — refuses to watch `C:\`, `C:\Windows`, `/etc`, etc.
- **Temp file bypass** — ignores `.crdownload`, `.part`, `.tmp`, `.partial`
- **Non-recursive** — only watches files dropped directly in the folder (not subfolders)

### ⚡ B2 — Temporal Loom (Visual Rule Builder)
Build rules through a **visual interface** — no code required. Rules can filter on:
| Condition | Operators |
|---|---|
| **File Name** | contains, starts_with, ends_with, equals, regex |
| **Extension** | equals (e.g., `pdf`, `png`, `zip`) |
| **File Size** | greater_than / less_than (in bytes) |
| **File Age** | older than X days |

Actions available: **Move**, **Copy**, **Rename**, **Trash (Prune to Void)**

### 🥇 B3 — First Spell Wins (Deterministic Precedence)
Rules are evaluated **top to bottom** in order. The **first matching rule** fires and no further rules are checked for that file. Drag rules to reorder priority.

### 👁 B4 — Eye of Simulation (Look Before You Leap)
Preview exactly what would happen to every file **without touching anything on disk**. See:
```
[File Name] ──► [Matched Rule] ──► [Action] ──► [Predicted Destination]
```

### 📜 B5 — Turn Back Time (Sacred Ledger + Rewind)
Every action is logged in the **Sacred Ledger** with full metadata:
- **Single Rewind** — click Rewind on any entry to move the file back
- **Batch Rewind** — undo the entire latest sweep in one click (Time Stone)
- **Atomic writes** — ledger never corrupts even if power is cut mid-write

---

## 🚀 Advanced Features (A1–A5)

| Code | Feature | Description |
|------|---------|-------------|
| A2 | **Dormammu Loop Detector** | Detects recursive rule loops (file moved >2× in 10s) and halts with an alert |
| A3 | **System Tray + Scheduler** | Runs silently in the background, scheduled sweeps |
| A4 | **Bulk Queue + Retry** | Handles 200+ files at once; retries locked files with exponential backoff |
| A5 | **Crash-Proof Ledger** | Atomic write-ahead logging prevents corruption |

---

## 🎨 TVA Design Language

| Token | HEX | Usage |
|-------|-----|-------|
| TVA Dark Bronze | `#121413` | App background (deep terminal) |
| **CRT Amber Glow** | `#E58B24` | Primary accent, headers, active tabs |
| **Loki Emerald** | `#00FF9D` | Active sentinels, success, timeline lines |
| TVA Prune Red | `#E63946` | Errors, deletions, Dormammu alerts |
| Phosphor Gold | `#C7A75C` | Labels, timestamps, borders |
| Terminal Charcoal | `#1C201E` | Card backgrounds |

**Visual Motifs:**
- CRT phosphor scanline overlay (CSS animation)
- Miss Minutes clock emblem in header with live hands
- Glowing amber/emerald text-shadow on all headings
- 1970s mainframe tactile push-buttons with LED dots
- TVA stamp badges: `BRANCHED` `REPLICATED` `TRANSMUTED` `PRUNED` `REWOUND`

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  RENDERER PROCESS (Browser)                      │
│  ┌───────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────┐  │
│  │doorways-ui│ │  rules-ui.js │ │preview-ui  │ │ledger-ui  │  │
│  │   .js     │ │  (B2 + B3)   │ │  .js (B4)  │ │  .js (B5) │  │
│  └─────┬─────┘ └──────┬───────┘ └─────┬──────┘ └─────┬─────┘  │
│        └──────────────┼───────────────┼───────────────┘         │
│                    app.js (tab nav + IPC events)                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │  window.tvaAPI (contextBridge)
┌──────────────────────────▼──────────────────────────────────────┐
│                    preload.js (IPC Bridge)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │  ipcRenderer.invoke / ipcMain.handle
┌──────────────────────────▼──────────────────────────────────────┐
│                  MAIN PROCESS (Node.js)                           │
│  ┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────┐  │
│  │ watcher.js │ │  engine.js   │ │ ledger.js  │ │  main.js  │  │
│  │ (Chokidar) │ │(Rule Eval +  │ │(Atomic Log │ │  (IPC +   │  │
│  │   B1       │ │  B2+B3+A2)   │ │ + Rewind)  │ │ Window)   │  │
│  └────────────┘ └──────────────┘ └────────────┘ └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**IPC Security:** `nodeIntegration: false` + `contextIsolation: true` — only the explicitly whitelisted `window.tvaAPI` surface is accessible from the renderer.

---

## 📁 Project Structure

```
sanctum-keeper-tva/
├── package.json              # Dependencies & npm scripts
├── README.md                 # This file
├── CHANGELOG.md              # Version history & commit log
├── DEVELOPMENT.md            # Developer setup & contribution guide
├── docs/
│   ├── ARCHITECTURE.md       # Deep-dive system architecture
│   ├── FEATURES.md           # All features detailed
│   └── DEMO_SCRIPT.md        # Hackathon demo walkthrough
├── assets/
│   ├── tva_icon.png          # App icon
│   └── miss_minutes.png      # Header logo
└── src/
    ├── main/
    │   ├── main.js           # Electron entry: window + IPC handlers
    │   ├── watcher.js        # Chokidar doorway sentinel (B1)
    │   ├── engine.js         # Rule evaluator + file actions (B2,B3,A2)
    │   ├── ledger.js         # Sacred Ledger: audit + rewind (B5)
    │   └── preload.js        # Secure contextBridge IPC API
    └── renderer/
        ├── index.html        # TVA Holo-Terminal shell
        ├── css/
        │   ├── tva-theme.css # CRT amber/emerald theme + animations
        │   └── components.css# Buttons, cards, tables, modal, badges
        └── js/
            ├── app.js        # Tab router + push-event coordinator
            ├── doorways-ui.js# B1: Watched folders management
            ├── rules-ui.js   # B2+B3: Visual rule builder
            ├── preview-ui.js # B4: Dry-run simulation matrix
            └── ledger-ui.js  # B5: Ledger + Time Stone rewind
```

---

## ⚙️ Installation & Running

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher
- Git

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/RohanSingh/sanctum-keeper-tva.git
cd sanctum-keeper-tva

# 2. Install dependencies
npm install

# 3. Launch the app
npm start
```

> **Note:** First run downloads Electron (~80MB). Subsequent starts are instant.

---

## 🧪 Testing the App

Prepare a test folder called `TVA_Dropzone` and place these files in it:

| File | Triggers |
|------|---------|
| `Q3_invoice_2026.pdf` | Name contains "invoice" + extension pdf |
| `loki_variant_render.png` | Extension png |
| `heavy_chronicles.zip` | Size > 10MB |
| `download_in_progress.crdownload` | **Ignored** (incomplete download) |
| `ancient_script.tmp` | **Ignored** (temp file) |

### Demo Sequence for Judges

1. **Safety Check** → Try to add `C:\Windows` as a doorway → see TVA reject it with amber alert
2. **Rule Creation** → Create: `IF extension=pdf AND name contains "invoice" THEN Move to Invoices/`
3. **Simulation** → Eye of Simulation tab → See prediction matrix (nothing moves on disk)
4. **Live Sweep** → Execute Temporal Sweep → Watch files sort in real time
5. **Time Stone** → Sacred Chronicles tab → Click Rewind → file returns to original location
6. **Loop Test** → Set two conflicting rules to trigger Dormammu Loop Detector

---

## 🔑 Key Technical Decisions

| Decision | Reason |
|----------|--------|
| **No AI/ML** | 100% deterministic — Wong wants enchantments that "behave the same every time" |
| **Electron** | Cross-platform desktop with native Node.js file system access |
| **Chokidar** | Battle-tested file watching; handles all OS edge cases |
| **Atomic JSON ledger** | Simple, human-readable, crash-proof (write-to-tmp then rename) |
| **contextBridge IPC** | Security-first: renderer has zero direct Node.js access |
| **First-match rule engine** | O(n×rules) evaluation — predictable and debuggable |

---

## 📜 License

MIT © 2026 — Sanctum Keeper Dev Team  
*"He who holds the rules holds the timeline."*
