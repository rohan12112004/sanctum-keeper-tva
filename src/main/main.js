/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          SANCTUM KEEPER — TVA EDITION                           ║
 * ║          main.js — Electron Main Process (Entry Point)          ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  PURPOSE:                                                        ║
 * ║  This is the heart of the Electron application. It runs in     ║
 * ║  Node.js and manages:                                            ║
 * ║   1. BrowserWindow lifecycle (create, minimize, close)          ║
 * ║   2. All IPC handlers (bridges between UI and backend)          ║
 * ║   3. Instantiation of DoorwaySentinel, RuleEngine, SacredLedger ║
 * ║   4. Persistence of rules to rules.json in userData             ║
 * ║   5. Real-time event emission to the renderer (file processed)  ║
 * ║                                                                  ║
 * ║  IPC CHANNELS REGISTERED:                                        ║
 * ║  doorway:select      → open folder picker dialog                ║
 * ║  doorway:getAll      → return all watched folders               ║
 * ║  doorway:remove      → stop watching + remove from list         ║
 * ║  rules:getAll        → return all saved rules                   ║
 * ║  rules:save          → persist rules array to disk              ║
 * ║  sweep:simulate      → dry-run rules on a folder                ║
 * ║  sweep:execute       → live rule execution on a folder          ║
 * ║  sweep:executeAll    → live execution on all watched folders     ║
 * ║  ledger:getAll       → return all ledger entries                ║
 * ║  ledger:rewind       → undo a single ledger entry               ║
 * ║  ledger:rewindLatest → undo the entire latest sweep             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Import our backend modules
const DoorwaySentinel = require('./watcher');
const RuleEngine = require('./engine');
const SacredLedger = require('./ledger');

// ── Global State ──────────────────────────────────────────────────────
let mainWindow = null;  // Reference to the main browser window
let sentinel = null;    // DoorwaySentinel instance
let engine = null;      // RuleEngine instance
let ledger = null;      // SacredLedger instance

// Path for persisting rules
const getRulesPath = () => path.join(app.getPath('userData'), 'rules.json');

// ── Rules Persistence ─────────────────────────────────────────────────

/**
 * Loads rules from rules.json in userData.
 * Returns empty array if file doesn't exist or is corrupted.
 */
function loadRules() {
  try {
    const rulesPath = getRulesPath();
    if (fs.existsSync(rulesPath)) {
      return JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    }
  } catch (err) {
    console.error('[Main] Failed to load rules.json:', err.message);
  }
  return [];
}

/**
 * Atomically saves rules array to rules.json.
 */
function saveRules(rules) {
  const rulesPath = getRulesPath();
  const tmp = `${rulesPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rules, null, 2), 'utf8');
  fs.renameSync(tmp, rulesPath);
}

// ── Window Creation ───────────────────────────────────────────────────

/**
 * Creates the main application window with TVA-appropriate styling.
 * nodeIntegration is false and contextIsolation is true for security —
 * only the contextBridge API in preload.js is accessible to the renderer.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    title: 'SANCTUM KEEPER — TVA TEMPORAL MONITOR',
    backgroundColor: '#121413',  // TVA Dark Bronze background
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,    // Security: isolate renderer from main context
      nodeIntegration: false,    // Security: no direct Node.js access in renderer
      sandbox: false             // Required for contextBridge to work with preload
    },
    // Custom title bar styling
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon: path.join(__dirname, '../../assets/tva_icon.png')
  });

  // Load the TVA Holo-Terminal HTML interface
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development mode (comment out for production)
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('[Main] ● TVA Terminal initialized. Sacred Timeline monitoring active.');
}

// ── IPC Handlers Registration ─────────────────────────────────────────

/**
 * Registers all IPC channels that the renderer can invoke via window.tvaAPI.
 * Each handler is wrapped in try/catch to return structured error objects
 * rather than crashing the main process.
 */
function registerIpcHandlers() {

  // ── B1: Doorway Management ────────────────────────────────────────

  /**
   * Opens the native OS folder selection dialog.
   * Returns the selected path, or null if user cancelled.
   */
  ipcMain.handle('doorway:select', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'SELECT TEMPORAL DOORWAY — TVA SENTINEL',
      properties: ['openDirectory']
    });
    if (result.canceled || !result.filePaths.length) return null;
    try {
      const doorways = sentinel.addDoorway(result.filePaths[0]);
      return { success: true, doorways };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  /** Returns all currently watched folder paths */
  ipcMain.handle('doorway:getAll', () => {
    return sentinel.getDoorways();
  });

  /** Stops watching a folder and removes it from persistence */
  ipcMain.handle('doorway:remove', (_event, folderPath) => {
    try {
      const doorways = sentinel.removeDoorway(folderPath);
      return { success: true, doorways };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  /** Opens native folder picker to select a destination folder (for rule action) */
  ipcMain.handle('dialog:selectDestFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'SELECT DESTINATION SANCTUM SHELF',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  // ── B2 + B3: Rules CRUD ────────────────────────────────────────────

  /** Returns all saved rules */
  ipcMain.handle('rules:getAll', () => {
    return loadRules();
  });

  /** Persists the complete rules array (sorted by priority index) */
  ipcMain.handle('rules:save', (_event, rules) => {
    try {
      saveRules(rules);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── B4: Simulation (Dry Run) ───────────────────────────────────────

  /** Simulates sweep on one folder — returns prediction matrix without touching files */
  ipcMain.handle('sweep:simulate', (_event, folderPath) => {
    try {
      const rules = loadRules();
      const predictions = engine.simulateSweep(folderPath, rules);
      return { success: true, predictions };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Live Sweep Execution ───────────────────────────────────────────

  /** Executes sweep on ONE folder — applies rules and records to ledger */
  ipcMain.handle('sweep:execute', async (_event, folderPath) => {
    try {
      const rules = loadRules();
      const ledgerEntries = await engine.executeSweep(folderPath, rules);
      // Notify renderer of ledger update
      if (mainWindow) {
        mainWindow.webContents.send('event:ledgerUpdated', ledgerEntries);
      }
      return { success: true, count: ledgerEntries.length, entries: ledgerEntries };
    } catch (err) {
      if (err.message.includes('DORMAMMU LOOP')) {
        if (mainWindow) {
          mainWindow.webContents.send('event:loopDetected', { message: err.message });
        }
      }
      return { success: false, error: err.message };
    }
  });

  /** Executes sweep on ALL watched doorways */
  ipcMain.handle('sweep:executeAll', async () => {
    try {
      const rules = loadRules();
      const doorways = sentinel.getDoorways();
      const allEntries = [];

      for (const folder of doorways) {
        const entries = await engine.executeSweep(folder, rules);
        allEntries.push(...entries);
      }

      if (mainWindow && allEntries.length > 0) {
        mainWindow.webContents.send('event:ledgerUpdated', allEntries);
      }

      return { success: true, count: allEntries.length, entries: allEntries };
    } catch (err) {
      if (err.message.includes('DORMAMMU LOOP')) {
        if (mainWindow) {
          mainWindow.webContents.send('event:loopDetected', { message: err.message });
        }
      }
      return { success: false, error: err.message };
    }
  });

  // ── B5: Sacred Ledger & Rewind ─────────────────────────────────────

  /** Returns all ledger entries sorted newest-first */
  ipcMain.handle('ledger:getAll', () => {
    return ledger.getAll();
  });

  /** Rewinds a single ledger entry (undo one action) */
  ipcMain.handle('ledger:rewind', async (_event, entryId) => {
    try {
      const entry = await ledger.rewind(entryId);
      return { success: true, entry };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  /** Rewinds the entire latest sweep batch */
  ipcMain.handle('ledger:rewindLatest', async () => {
    try {
      const entries = await ledger.rewindLatestSweep();
      return { success: true, count: entries.length, entries };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

// ── App Lifecycle ─────────────────────────────────────────────────────

app.whenReady().then(() => {
  const userDataPath = app.getPath('userData');
  console.log(`[Main] userData path: ${userDataPath}`);

  // Initialize backend modules
  ledger = new SacredLedger(userDataPath);

  engine = new RuleEngine(ledger);

  /**
   * Watcher callback: called every time a NEW file lands in a watched folder.
   * The file is automatically evaluated against saved rules and acted upon.
   */
  sentinel = new DoorwaySentinel(userDataPath, async (filePath) => {
    console.log(`[Main] ⚡ New incursion detected: ${path.basename(filePath)}`);
    const rules = loadRules();
    const match = engine.findFirstMatch(filePath, rules);

    if (!match) {
      console.log(`[Main] ○ No rule matched: ${path.basename(filePath)} — left untouched.`);
      return;
    }

    try {
      const ledgerEntry = await engine.executeAction(
        match.matchedRule.action,
        match.fileStats,
        match.matchedRule.name
      );

      // Push real-time notification to renderer
      if (mainWindow) {
        mainWindow.webContents.send('event:fileProcessed', {
          fileName: path.basename(filePath),
          ruleName: match.matchedRule.name,
          actionType: match.matchedRule.action.type.toUpperCase(),
          destination: ledgerEntry.destination
        });
        mainWindow.webContents.send('event:ledgerUpdated', [ledgerEntry]);
      }
    } catch (err) {
      if (err.message.includes('DORMAMMU LOOP') && mainWindow) {
        mainWindow.webContents.send('event:loopDetected', {
          fileName: path.basename(filePath),
          message: err.message
        });
      }
      console.error('[Main] Action execution failed:', err.message);
    }
  });

  // Start watching all previously saved doorways
  sentinel.initWatchers();
  engine.setSentinel(sentinel);

  // Register all IPC communication handlers
  registerIpcHandlers();

  // Create the main application window
  createWindow();

  // macOS: recreate window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    sentinel?.closeAll();
    app.quit();
  }
});

app.on('before-quit', () => {
  sentinel?.closeAll();
});
