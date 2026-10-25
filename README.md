# ⏳ THE SANCTUM KEEPER — TVA EDITION

> *"For All Time. Always."*

**A deterministic, rule-based file organizer built as a desktop application.**  
**Theme:** Time Variance Authority (TVA) from Marvel's *Loki* — Amber CRT phosphor monitors, 1970s mainframe UI, Loki Emerald energy lines.

---

## 🎯 What Is This?

The Sanctum Keeper watches folders for new files and automatically sorts them using **user-defined rules** — no AI, no guessing. You write the rule. The machine follows it. Every time. Deterministically.

**Built for:** Hackathon — Marvel Multiverse Theme  
**Stack:** Electron + Node.js + HTML + CSS + JavaScript

---

## ✨ Features

| Feature | Code | Description |
|---------|------|-------------|
| **Branch Doorways** | B1 | Watch up to 3 folders. Root/system directory protection. Temp file bypass. |
| **Temporal Loom** | B2 | Visual rule builder — no coding needed. Filter by name, extension, size, age. |
| **First Spell Wins** | B3 | Deterministic priority order — first matching rule wins, no ambiguity. |
| **Eye of Simulation** | B4 | Dry-run preview: see exactly what would happen without touching files. |
| **Sacred Ledger** | B5 | Every action logged. Rewind single entries or entire sweeps (Time Stone undo). |
| **Dormammu Detector** | A2 | Detects and halts infinite rule-loop cycles automatically. |

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Launch the app
npm start
```

---

## 📁 Project Structure

```
sanctum-keeper-tva/
├── package.json
├── README.md
├── assets/             # Icons and imagery
└── src/
    ├── main/
    │   ├── main.js     # Electron entry point + IPC handlers
    │   ├── watcher.js  # Chokidar folder sentinel (B1)
    │   ├── engine.js   # Rule evaluator + file actions (B2, B3, A2)
    │   ├── ledger.js   # Audit log + Time Stone rewind (B5)
    │   └── preload.js  # Secure IPC contextBridge
    └── renderer/
        ├── index.html
        ├── css/
        │   ├── tva-theme.css   # TVA amber/emerald CRT theme
        │   └── components.css  # Buttons, tables, modal, badges
        └── js/
            ├── app.js          # Tab navigation + event coordinator
            ├── doorways-ui.js  # B1 UI
            ├── rules-ui.js     # B2+B3 UI
            ├── preview-ui.js   # B4 UI
            └── ledger-ui.js    # B5 UI
```

---

## 🎨 TVA Color Palette

| Color | Hex | Use |
|-------|-----|-----|
| TVA Dark Bronze | `#121413` | Background |
| CRT Amber | `#E58B24` | Primary accent, headings |
| Loki Emerald | `#00FF9D` | Active watchers, success states |
| Prune Red | `#E63946` | Errors, deletion, loop detection |
| Phosphor Gold | `#C7A75C` | Labels, timestamps, borders |

---

## 🏆 What Makes This Different

> **No AI. No guessing. Pure determinism.**

- Write a rule → the machine obeys it → every time → zero surprises
- **First Spell Wins** ensures exactly one rule fires per file
- **Eye of Simulation** lets you preview every outcome before a byte moves
- **Time Stone Rewind** makes every mistake reversible — even batch ops
- **Dormammu Loop Detector** prevents infinite recursive rule cycles

---

## 📋 Demo Script (For Hackathon Judges)

1. **Add a doorway** — try to add `C:\Windows` → see TVA reject it
2. **Write rules** — "if extension=pdf AND name contains 'invoice' → move to Invoices/"
3. **Simulate** → Eye of Simulation shows fate of every file (nothing moves)
4. **Sweep** → Execute the sweep, watch files sort themselves
5. **Rewind** → Sacred Ledger → click Rewind → file returns instantly

---

*"He who holds the rules holds the timeline."*
