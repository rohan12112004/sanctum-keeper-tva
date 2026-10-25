# 🛠 DEVELOPMENT GUIDE — THE SANCTUM KEEPER: TVA EDITION

> For developers contributing to or extending this hackathon project.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org) | v18+ | JavaScript runtime |
| [npm](https://npmjs.com) | v9+ | Package manager |
| [Git](https://git-scm.com) | v2+ | Version control |

---

## Setup

```bash
# Clone
git clone https://github.com/RohanSingh/sanctum-keeper-tva.git
cd sanctum-keeper-tva

# Install all dependencies (Electron + chokidar + trash)
npm install

# Start the app in development mode
npm start
```

> **Electron Download:** First install downloads the Electron binary (~80MB). If network is slow, use `npm install --prefer-offline` if you have a cached version.

---

## npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `npm start` | Launch Electron app in dev mode |
| `pack` | `npm run pack` | Package app into distributable (requires `electron-builder`) |

---

## Project Architecture (Developer View)

### Process Model

Electron has **two separate JavaScript processes**:

```
Main Process (Node.js)          Renderer Process (Chromium)
─────────────────────          ─────────────────────────────
main.js                    ←IPC→  index.html + js/*.js
watcher.js                         (no direct Node access)
engine.js                 preload.js
ledger.js                 (contextBridge boundary)
```

### Security Rules
- `nodeIntegration: false` — renderer cannot use `require('fs')` directly
- `contextIsolation: true` — renderer's `window` is isolated from Node globals
- **Only** functions explicitly listed in `preload.js`'s `contextBridge.exposeInMainWorld` are accessible from the renderer as `window.tvaAPI.*`

### IPC Pattern

```javascript
// Renderer (browser side) — calls via window.tvaAPI
const rules = await window.tvaAPI.getRules();

// → Goes through preload.js bridge →
ipcRenderer.invoke('rules:getAll')

// → Handled in main.js →
ipcMain.handle('rules:getAll', () => loadRules())
```

---

## File Reference

### `src/main/main.js`
- Creates `BrowserWindow` with `backgroundColor: '#121413'` (TVA dark)
- Registers all IPC handlers via `registerIpcHandlers()`
- Instantiates `DoorwaySentinel`, `RuleEngine`, `SacredLedger`
- Handles watcher callback: auto-evaluates rules on new file → emits `event:fileProcessed`
- Cleans up watchers on `before-quit`

### `src/main/watcher.js` — `DoorwaySentinel`
| Method | What it does |
|--------|-------------|
| `addDoorway(path)` | Safety checks → add to list → start Chokidar → save to JSON |
| `removeDoorway(path)` | Close Chokidar → remove from list → save |
| `isSafePath(path)` | Blocks root drives + Windows system dirs + Unix system paths |
| `startWatching(path)` | Chokidar: `depth:0`, `awaitWriteFinish`, ignores temp extensions |
| `initWatchers()` | Called at startup, restores saved doorways |
| `closeAll()` | Called on app quit |

### `src/main/engine.js` — `RuleEngine`
| Method | What it does |
|--------|-------------|
| `evaluateCondition(stats, cond)` | Evaluates one condition (name/ext/size/age) |
| `evaluateRule(rule, stats)` | ALL/ANY/NONE compound evaluation |
| `findFirstMatch(filePath, rules)` | Top-to-bottom scan; returns first match (B3) |
| `getSafeDestination(path)` | Appends `(1)`, `(2)` to avoid overwriting |
| `executeAction(action, stats, ...)` | MOVE/COPY/RENAME/TRASH + Dormammu loop check |
| `simulateSweep(folder, rules)` | Read-only prediction — no disk changes (B4) |
| `executeSweep(folder, rules)` | Live execution with shared batchId |
| `checkDormammuLoop(fileName)` | Halts if file moved >2× in 10 seconds (A2) |

### `src/main/ledger.js` — `SacredLedger`
| Method | What it does |
|--------|-------------|
| `record({...})` | Writes entry with UUID, timestamp, batchId; atomic save |
| `rewind(entryId)` | Reverses MOVE/RENAME (fs.rename back) or COPY (fs.unlink copy) |
| `rewindLatestSweep()` | Finds latest batchId, rewinds all COMMITTED entries in it |

### `src/main/preload.js`
Exposes `window.tvaAPI` — the ONLY interface between renderer and backend. Every method maps 1:1 to an IPC channel.

---

## Adding New Features

### Adding a New Rule Condition Field
1. In `engine.js` → `evaluateCondition()` → add a new `case 'your_field'`
2. In `rules-ui.js` → `addConditionRow()` → add `<option value="your_field">` to the field select

### Adding a New Action Type
1. In `engine.js` → `executeAction()` → add a new `case 'your_action'`
2. In `rules-ui.js` → modal `#actionType` select → add new option
3. In `rules-ui.js` → `updateActionFields()` → show/hide relevant input
4. Add badge color in `components.css` → `.badge-your-action`

### Adding a New IPC Channel
1. `preload.js` → add method to `contextBridge.exposeInMainWorld('tvaAPI', { ... })`
2. `main.js` → `registerIpcHandlers()` → add `ipcMain.handle('channel:name', handler)`

---

## Code Style & Comments

- **All backend files** have a top banner docblock explaining the feature, design rationale, and schema
- **All methods** have JSDoc comments explaining parameters and return values
- **Algorithm comments** explain the "why", not just the "what"
- **Constants** named with TVA vocabulary (`DORMAMMU LOOP`, `SENTINEL`, `SACRED TIMELINE`)
- Use `console.log('[Module] Message')` prefix pattern for all debug output

---

## Development Stages

| Stage | Feature | Status |
|-------|---------|--------|
| 0 | Project scaffold + Git init | ✅ Done |
| 1 | Electron window + IPC bridge + TVA shell UI | ✅ Done |
| 2 | B1: Branch Doorways (watched folders) | ✅ Done |
| 3 | B2+B3: Visual rule builder + First Spell Wins | ✅ Done |
| 4 | B4: Eye of Simulation (dry run) | ✅ Done |
| 5 | B5: Sacred Ledger + Time Stone Rewind | ✅ Done |
| 6 | Full TVA/Loki UI theme + animations | ✅ Done |
| 7 | Advanced features (A1–A5) | 🔜 Next |

---

## Known Limitations (to fix in Stage 7)

| Issue | Fix Plan |
|-------|---------|
| `trash` package is ESM-only; dynamic `import()` used | Works but adds async overhead; consider `trash@7` (CJS) |
| `btnPickDest` uses `prompt()` fallback | Replace with proper `dialog.showOpenDialog` IPC call |
| No batch-size queue on watcher callback | Add `p-queue` in Stage 7 for 200+ simultaneous files |
| Destination folder picker in modal uses prompt | Stage 7: add dedicated IPC `dialog:selectDestFolder` |

---

*"He who writes the rules controls the timeline."*
