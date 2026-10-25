# 🏗 ARCHITECTURE — THE SANCTUM KEEPER: TVA EDITION

> Deep-dive technical architecture for developers and curious judges.

---

## Process Model

Electron applications run in **two separate, isolated processes**. This is crucial for security and stability:

```
┌──────────────────────────────────────────────────────────────────────┐
│                       MAIN PROCESS (Node.js)                          │
│                                                                        │
│   Has full access to: OS filesystem, native dialogs, system tray,     │
│   hardware events, all Node.js APIs.                                   │
│                                                                        │
│   Files: main.js, watcher.js, engine.js, ledger.js                   │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                  preload.js
            (contextBridge — security boundary)
                       │
┌──────────────────────▼───────────────────────────────────────────────┐
│                    RENDERER PROCESS (Chromium)                         │
│                                                                        │
│   Runs in a sandboxed browser context. No direct Node.js access.      │
│   Can ONLY call window.tvaAPI.* methods defined in preload.js.        │
│                                                                        │
│   Files: index.html, app.js, doorways-ui.js, rules-ui.js,            │
│          preview-ui.js, ledger-ui.js, tva-theme.css, components.css  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## IPC (Inter-Process Communication) Map

All communication between renderer and main goes through defined IPC channels:

| Direction | Channel | Handler | Description |
|-----------|---------|---------|-------------|
| R → M | `doorway:select` | `dialog.showOpenDialog` | Native folder picker |
| R → M | `doorway:getAll` | `sentinel.getDoorways()` | List watched folders |
| R → M | `doorway:remove` | `sentinel.removeDoorway()` | Stop watching folder |
| R → M | `rules:getAll` | `loadRules()` | Load rules from JSON |
| R → M | `rules:save` | `saveRules()` | Persist rules to JSON |
| R → M | `sweep:simulate` | `engine.simulateSweep()` | Dry-run (no disk changes) |
| R → M | `sweep:execute` | `engine.executeSweep()` | Live sweep execution |
| R → M | `sweep:executeAll` | Loop over doorways | All-doorways sweep |
| R → M | `ledger:getAll` | `ledger.getAll()` | Retrieve all ledger entries |
| R → M | `ledger:rewind` | `ledger.rewind(id)` | Undo single action |
| R → M | `ledger:rewindLatest` | `ledger.rewindLatestSweep()` | Undo latest batch |
| M → R | `event:fileProcessed` | `mainWindow.webContents.send` | Real-time file notification |
| M → R | `event:loopDetected` | `mainWindow.webContents.send` | Dormammu loop alert |
| M → R | `event:ledgerUpdated` | `mainWindow.webContents.send` | Ledger refresh signal |

---

## Data Flow: File Arrives in Watched Folder

```
[User drops file.pdf into TVA_Dropzone]
           ↓
[Chokidar 'add' event fires in watcher.js]
           ↓
[800ms delay — wait for OS to release file handle]
           ↓
[onNewFileCallback(filePath) called in main.js]
           ↓
[engine.findFirstMatch(filePath, rules)]
   ↓ loads rules from rules.json
   ↓ engine.getFileStats(filePath) → { name, ext, size, mtimeMs }
   ↓ engine.evaluateRule(rule[0], stats) → true/false
   ↓ if false → try rule[1], rule[2], ...
   ↓ if first match found → return { matchedRule, fileStats }
           ↓
[engine.checkDormammuLoop(fileName)]
   ↓ if moved >2× in 10s → throw DORMAMMU LOOP error
   ↓ main.js catches → emits 'event:loopDetected' to renderer
           ↓
[engine.executeAction(action, fileStats, ruleName)]
   ↓ MOVE: fs.rename(src, safeDestination)
   ↓ COPY: fs.copyFile(src, safeDestination)
   ↓ RENAME: fs.rename(src, pattern-applied name)
   ↓ TRASH: trash([src])
           ↓
[ledger.record({ actionType, source, destination, ruleName, batchId })]
   ↓ Atomic write: write to .tmp → rename to .json
           ↓
[main.js emits 'event:fileProcessed' to renderer]
   ↓ app.js shows toast: "⚡ MOVE: file.pdf → matched rule 'PDF Sorter'"
   ↓ if ledger tab visible → refreshes ledger table
```

---

## Data Flow: Dry Run (Eye of Simulation)

```
[User clicks "Simulate Timeline"]
           ↓
[preview-ui.js calls window.tvaAPI.simulateSweep(folderPath)]
           ↓
[main.js IPC → engine.simulateSweep(folderPath, rules)]
           ↓
[fs.readdirSync(folderPath) — read top-level files only]
           ↓
For each file:
   ↓ Skip .crdownload, .part, .tmp, .partial → mark as IGNORED
   ↓ engine.findFirstMatch(filePath, rules)
   ↓ if no match → mark as UNTOUCHED
   ↓ if match → compute predicted destination string
   ↓ NO fs.rename / fs.copyFile / trash called
           ↓
[Returns prediction array to renderer]
           ↓
[preview-ui.js renders table — SIMULATION ONLY banner shown]
```

---

## Ledger Data Schema

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-10-25T16:04:22.000Z",
  "actionType": "MOVE",
  "source": "C:/Users/Rohan/Desktop/TVA_Dropzone/invoice.pdf",
  "destination": "C:/Users/Rohan/Desktop/TVA_Dropzone/Invoices/invoice.pdf",
  "ruleName": "Invoice Sorter",
  "batchId": "3b9d3c2a-7f1e-4d5b-8e9f-1a2b3c4d5e6f",
  "status": "COMMITTED"
}
```

- `batchId` — Shared UUID across all actions performed during one sweep run. Enables `rewindLatestSweep()` to group and revert them together.
- `status` — `COMMITTED` (action done) or `REWOUND` (undone via Time Stone)

---

## Rule Data Schema

```json
{
  "id": "rule_1698239062000_abc123",
  "name": "Invoice Sorter",
  "logic": "ALL",
  "conditions": [
    { "field": "extension", "operator": "equals",   "value": "pdf" },
    { "field": "name",      "operator": "contains", "value": "invoice" }
  ],
  "action": {
    "type": "move",
    "destination": "C:/Users/Rohan/Desktop/Invoices"
  }
}
```

---

## Atomic Write Pattern

To prevent ledger corruption if the process crashes mid-write:

```javascript
// BAD: if crash happens here, file is partially written and corrupt
fs.writeFileSync(filePath, JSON.stringify(data));

// GOOD: write to temp, then atomically swap
const tmp = `${filePath}.tmp`;
fs.writeFileSync(tmp, JSON.stringify(data));   // write to temp
fs.renameSync(tmp, filePath);                  // atomic OS-level rename
// If crash happens between these two lines:
// - filePath still has the old valid content
// - .tmp has the new content (will be cleaned on next write)
```

The OS guarantees `rename()` is atomic on the same filesystem — it's either fully done or not done at all.

---

## Dormammu Loop Detector (A2)

**Problem:** Rule A moves files from `Folder1` → `Folder2`. Rule B watches `Folder2` and moves them back to `Folder1`. This creates an infinite loop, consuming CPU and causing files to bounce endlessly.

**Detection mechanism:**

```javascript
checkDormammuLoop(fileName) {
  const now = Date.now();
  const TEN_SECONDS = 10000;
  
  // Keep only moves that happened in the last 10 seconds
  const history = (this.recentMoves.get(fileName) || [])
    .filter(t => now - t < TEN_SECONDS);
  
  history.push(now);
  this.recentMoves.set(fileName, history);
  
  if (history.length > 2) {
    throw new Error(`DORMAMMU LOOP DETECTED: "${fileName}" moved ${history.length} times in 10s`);
  }
}
```

**Response:**
1. Throws error that halts further processing for this file
2. `main.js` catches it and emits `event:loopDetected` to renderer
3. Renderer shows full-screen red alert banner
4. File is left in its current location (not deleted, not corrupted)

---

*"The Sacred Timeline must not be compromised."*
