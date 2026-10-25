# ✨ FEATURES — THE SANCTUM KEEPER: TVA EDITION

> Complete feature specification with implementation details.

---

## B1 — The Keeper Needs Doors to Watch

**What it does:** Lets the user select up to 3 folders to monitor. Files dropped into these folders are automatically processed by the rule engine.

**Implementation:**
- `DoorwaySentinel` class in `src/main/watcher.js`
- Uses **Chokidar** v3 for cross-platform file watching
- `depth: 0` — watches ONLY the top-level folder, not subfolders
- `awaitWriteFinish: { stabilityThreshold: 500ms }` — waits for files to finish writing before triggering
- Extra 800ms delay on `add` event to allow OS to release file handles (e.g., from Chrome downloads)
- **Persistence:** doorways saved to `userData/doorways.json` via atomic write; reloaded on next app start

**Root/System Directory Protection:**
```
Blocked: C:\  D:\  E:\  (any root drive)
Blocked: anything containing 'windows', 'system32', 'program files'
Blocked: /etc  /bin  /usr/bin  /sbin  /sys  /proc
```

**Temp File Bypass (never touched):**
```
.crdownload  (Chrome partial downloads)
.part        (Firefox / torrent partials)
.tmp         (Generic temp files)
.partial     (Other partials)
```

**UI:** `src/renderer/js/doorways-ui.js`
- Emerald pulsing sentinel dot on each active doorway card
- "CLOSE" button stops the watcher and removes the folder
- Counter badge: `2/3 Doorways Active`
- Manual sweep per-folder or all-doorways buttons

---

## B2 — Enchantments Anyone Can Write

**What it does:** Visual rule builder that lets non-technical users create file-sorting rules without writing any code.

**Implementation:** `RuleEngine` class in `src/main/engine.js`

### Condition Fields & Operators

| Field | Operators | Example |
|-------|-----------|---------|
| `name` | `contains`, `starts_with`, `ends_with`, `equals`, `regex` | name contains "invoice" |
| `extension` | `equals` | extension equals "pdf" |
| `size` | `greater_than`, `less_than` | size greater_than 1048576 |
| `age_days` | `greater_than` | age_days greater_than 30 |

### Logic Modes (A1 preview)

| Mode | Meaning | SQL equivalent |
|------|---------|---------------|
| `ALL` | Every condition must be true | `WHERE A AND B AND C` |
| `ANY` | At least one must be true | `WHERE A OR B OR C` |
| `NONE` | None must be true | `WHERE NOT (A OR B OR C)` |

### Actions

| Action | TVA Name | Description |
|--------|---------|-------------|
| `move` | BRANCH | Moves file to destination folder |
| `copy` | REPLICATE | Copies file to destination folder |
| `rename` | TRANSMUTE | Renames file using pattern tokens |
| `trash` | PRUNE TO VOID | Sends to OS Recycle Bin (safe delete) |

**Rename Pattern Tokens:**
- `{originalName}` → filename without extension
- `{date}` → `YYYY-MM-DD` of today
- `{timestamp}` → Unix timestamp in milliseconds

**Example pattern:** `{date}_INVOICE_{originalName}` → `2026-10-25_INVOICE_Q3_report`

**Collision Safety:** If destination `file.pdf` already exists → automatically saves as `file (1).pdf`, then `file (2).pdf`, etc.

**UI:** `src/renderer/js/rules-ui.js`
- Modal dialog with dynamic condition rows (add/remove)
- Action type selector that shows/hides relevant inputs
- Amber LED push-button styling on all buttons

---

## B3 — First Spell Wins

**What it does:** When multiple rules could match a file, only the first one in the list fires. Ensures every file has exactly one deterministic outcome.

**Implementation:** `engine.findFirstMatch()` in `src/main/engine.js`

```javascript
// Strict sequential scan — breaks on first match
for (let i = 0; i < rules.length; i++) {
  if (this.evaluateRule(rules[i], fileStats)) {
    return { matchedRule: rules[i], ruleIndex: i, fileStats };
  }
}
return null; // No match → file left untouched
```

**Why this matters:** Without strict priority, a file matching 3 rules would have an undefined outcome. With First Spell Wins:
- Same file + same rules = same fate. Always.
- User controls priority by dragging rules up/down.

**UI:** Rule cards display priority numbers (#1, #2, #3...). Move Up ▲ / Move Down ▼ buttons reorder and immediately persist the new priority.

---

## B4 — Look Before You Leap (Eye of Simulation)

**What it does:** Simulates rule evaluation on all files in a watched folder and shows a prediction matrix — without modifying any file on disk.

**Implementation:** `engine.simulateSweep()` in `src/main/engine.js`

For each file, the method:
1. Reads file metadata (name, extension, size, age)
2. Evaluates all rules in priority order (same as live sweep)
3. Computes what the destination *would be*
4. Returns prediction objects — no `fs.rename`, `fs.copyFile`, or `trash()` is ever called

**Output per file:**
```javascript
{
  fileName: "Q3_invoice_2026.pdf",
  filePath: "C:/Users/Rohan/Desktop/TVA_Dropzone/Q3_invoice_2026.pdf",
  matchedRule: "Invoice Sorter",
  predictedAction: "MOVE",
  predictedDestination: "C:/Users/Rohan/Desktop/Invoices/Q3_invoice_2026.pdf"
}
```

**UI:** `src/renderer/js/preview-ui.js`
- Summary bar: total / will-act / untouched / ignored file counts
- Full table with action badges (color-coded by type)
- Clear reminder: *"SIMULATION ONLY — No files were moved, renamed, copied, or trashed"*

---

## B5 — Turn Back Time (Sacred Ledger & Time Stone Rewind)

**What it does:** Every automated or manual action is logged to a persistent audit trail. Any entry (or entire sweep) can be reversed in one click.

**Implementation:** `SacredLedger` class in `src/main/ledger.js`

### Ledger Entry Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier |
| `timestamp` | ISO-8601 | When the action occurred |
| `actionType` | ENUM | MOVE / COPY / RENAME / TRASH |
| `source` | String | Original file path |
| `destination` | String | New file path (null for TRASH) |
| `ruleName` | String | Which rule triggered this |
| `batchId` | UUID | Groups all actions from one sweep |
| `status` | ENUM | COMMITTED / REWOUND |

### Rewind Logic

| Action | Rewind behavior |
|--------|----------------|
| MOVE | `fs.rename(destination, source)` — file moved back |
| RENAME | `fs.rename(destination, source)` — name restored |
| COPY | `fs.unlink(destination)` — copy deleted; original untouched |
| TRASH | ❌ Cannot auto-rewind (file is in OS Trash) |

### Atomic Write Safety

Uses write-ahead pattern to prevent corruption:
1. Write full JSON to `sacred_ledger.json.tmp`
2. `fs.renameSync(tmp, filePath)` — atomic OS-level operation
3. Even if power is cut between steps, the main file is never partial

**UI:** `src/renderer/js/ledger-ui.js`
- TVA action stamps: `BRANCHED` `REPLICATED` `TRANSMUTED` `PRUNED`
- Status stamps: `COMMITTED` (green) / `REWOUND` (dimmed)
- Per-entry rewind button (disabled if already rewound or TRASH)
- Batch "REWIND LATEST SWEEP" button with confirmation dialog

---

## A2 — Dormammu Loop Detector

**What it does:** Detects and halts infinite rule-loop cycles automatically.

**Problem:** Rule A watches Folder1 and moves files to Folder2. Rule B watches Folder2 and moves files back to Folder1. Both rules keep triggering each other forever.

**Detection:**
- Tracks recent moves per filename: `Map<fileName, timestamp[]>`
- Filters to moves within the last 10 seconds
- If count > 2 → throws `DORMAMMU LOOP DETECTED` error
- Main process catches this and emits `event:loopDetected` to renderer
- Full-screen red alert banner appears in the UI
- File is left in its current location — safe, not lost

---

*"The Sacred Timeline must remain intact."*
