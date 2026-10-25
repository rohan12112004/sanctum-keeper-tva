# 🏆 HACKATHON DEMO SCRIPT — THE SANCTUM KEEPER: TVA EDITION

> **For judges, audience, and presenters.**
> This script walks through the complete 5-minute demo flow.

---

## Pre-Demo Checklist

Before presenting, ensure:
- [ ] App is running (`npm start`)
- [ ] `TVA_Dropzone` folder exists on Desktop with these test files:
  - `Q3_invoice_2026.pdf` (small PDF)
  - `loki_variant_render.png` (any PNG)
  - `heavy_chronicles.zip` (any zip)
  - `download_in_progress.crdownload` (rename any file with this extension)
  - `ancient_script.tmp` (rename any file with this extension)
- [ ] Rules pre-created (or create live during demo):
  - Rule 1: IF `extension` equals `pdf` AND `name` contains `invoice` → **MOVE** to `TVA_Dropzone/Invoices`
  - Rule 2: IF `extension` equals `png` → **MOVE** to `TVA_Dropzone/Images`
  - Rule 3: IF `size` greater than `10485760` (10MB) → **RENAME** to `{date}_LARGE_{originalName}`

---

## Demo Flow (5 Minutes)

### 🔴 Minute 1 — The Problem & The App
**Say:** *"Imagine Wong's Sanctum — relics pouring in through portals all day. He wants rules HE writes, not an AI guessing. That's The Sanctum Keeper."*

- Point to the TVA header: Miss Minutes clock, Sentinel Active pill
- Briefly walk through the 4 tabs visible in the navigation bar
- **Why it's different:** "No AI. No machine learning. 100% deterministic."

---

### 🟡 Minute 2 — B1: Branch Doorways (Folder Watching)

**Action 1: Show Safety Guard**
1. Click **"+ OPEN NEW DOORWAY"**
2. Navigate to `C:\Windows` and try to select it
3. **Expected:** TVA amber error toast → *"TVA LOCKDOWN: Protected OS directory..."*

> **Say:** *"The Keeper refuses to monitor system directories. This is non-negotiable."*

**Action 2: Add the real dropzone**
1. Click **"+ OPEN NEW DOORWAY"** again
2. Select `TVA_Dropzone` on the Desktop
3. See the emerald sentinel dot appear — doorway is active
4. **Expected:** Green pulsing dot, folder path shown in card

> **Say:** *"Up to 3 doorways at once. These settings survive restarts."*

---

### 🟠 Minute 3 — B2+B3: Rules & First Spell Wins

**Action 3: Show the rule builder (no code!)**
1. Click the **TEMPORAL LOOM** tab
2. If rules exist, point to the **priority numbers** (#1, #2, #3)
3. If no rules, click **"+ INSCRIBE NEW ENCHANTMENT"** and build Rule 1 live:
   - Name: "Invoice Sorter"
   - Logic: ALL conditions must match
   - Condition 1: `extension` equals `pdf`
   - Condition 2: `name` contains `invoice`
   - Action: MOVE to `TVA_Dropzone/Invoices`
4. Click "ENGRAVE ENCHANTMENT"

> **Say:** *"Wong is a librarian, not a programmer. No code required — just drop-downs and text boxes."*

**Action 4: Show First Spell Wins**
- Point to the priority order: *"Rule #1 fires first. The same file always meets the same fate. Zero ambiguity."*
- Drag a rule up/down to show priority reordering

---

### 🔵 Minute 4 — B4: Eye of Simulation

**Action 5: Run the dry run**
1. Click **EYE OF SIMULATION** tab
2. Select `TVA_Dropzone` from the dropdown
3. Click **"SIMULATE TIMELINE"**
4. **Expected:** Table appears showing:
   - `Q3_invoice_2026.pdf` → Invoice Sorter → MOVE → `TVA_Dropzone/Invoices/Q3_invoice_2026.pdf`
   - `loki_variant_render.png` → Image Sorter → MOVE → `TVA_Dropzone/Images/loki_variant_render.png`
   - `download_in_progress.crdownload` → IGNORED (incomplete download)
   - `ancient_script.tmp` → IGNORED (temp file)
5. Point to the banner: **"SIMULATION ONLY — No files were touched"**

> **Say:** *"A mistaken rule costs you a glance, not your library. Look before you leap."*

---

### 🟣 Minute 5 — B5: Time Stone Rewind + Closing

**Action 6: Execute live sweep**
1. Go back to **BRANCH DOORWAYS** tab
2. Click **"EXECUTE TEMPORAL SWEEP (ALL DOORWAYS)"**
3. Watch the emerald toast notification pop up: *"N relics sorted"*
4. Open `TVA_Dropzone` in Windows Explorer — files have moved!

**Action 7: Time Stone rewind**
1. Click **SACRED CHRONICLES** tab
2. Show the ledger entries with `BRANCHED` / `TRANSMUTED` stamps and timestamps
3. Click **"↩ REWIND"** on the `Q3_invoice_2026.pdf` entry
4. **Expected:** Toast: *"Action rewound: Q3_invoice_2026.pdf returned"*
5. Open Windows Explorer — file is back in `TVA_Dropzone`

**Action 8 (if time): Batch rewind**
1. Click **"↩ REWIND LATEST SWEEP (TIME STONE)"**
2. Confirm the dialog
3. All files return at once

> **Closing:** *"The Sanctum Keeper: deterministic, reversible, beautifully ruthless. For All Time. Always."*

---

## Possible Judge Questions & Answers

| Question | Answer |
|----------|--------|
| *"Why not use AI for classification?"* | "The problem statement explicitly forbids guesswork. Wong wants enchantments that 'behave the same every time.' A deterministic rule engine gives exactly that — 100% explainable, 100% predictable." |
| *"What if two rules match the same file?"* | "First Spell Wins — only Rule #1 (in the list) fires. The user controls priority via drag reorder." |
| *"Can it handle 1000 files at once?"* | "Yes — a controlled task queue (Stage 7, p-queue) processes files sequentially without memory overflow. The Dormammu Loop Detector halts any infinite cycles." |
| *"What prevents it from moving system files?"* | "The watcher uses `depth:0` (non-recursive) + a root/system-path blocklist. It also ignores `.tmp`, `.crdownload`, `.part` extensions." |
| *"How do you prevent data loss?"* | "Every action is logged to the Sacred Ledger before it's executed. Any action can be reversed in one click. The ledger uses atomic writes — crash-proof." |

---

## TVA Vocabulary Cheat Sheet (for presentation)

| UI Element | TVA Term | Real Meaning |
|------------|---------|-------------|
| Watched Folder | **Branch Doorway / Portal** | Directory being monitored |
| Rule | **Temporal Enchantment** | Condition-action pair |
| File | **Relic** | Any file in a watched folder |
| Move to folder | **Branch** | `fs.rename` to destination |
| Copy to folder | **Replicate** | `fs.copyFile` to destination |
| Rename | **Transmute** | Pattern-based filename change |
| Send to trash | **Prune to the Void** | `trash()` to OS recycle bin |
| Dry run | **Eye of Simulation** | Read-only rule preview |
| Audit log | **Sacred Timeline Ledger** | Action history in JSON |
| Undo | **Time Stone Rewind** | Reverse a ledger entry |
| Loop detection | **Dormammu Detector** | Cycle breaker for conflicting rules |

---

*"For All Time. Always."*
