/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          SANCTUM KEEPER — TVA EDITION                           ║
 * ║          preload.js — Secure IPC Bridge (contextBridge)         ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  PURPOSE:                                                        ║
 * ║  This file runs in a sandboxed context between the Electron     ║
 * ║  main process (Node.js) and the renderer process (browser).     ║
 * ║  It ONLY exposes the functions we explicitly whitelist via       ║
 * ║  contextBridge.exposeInMainWorld() — nothing else leaks through. ║
 * ║                                                                  ║
 * ║  ARCHITECTURE NOTE:                                              ║
 * ║  ipcRenderer.invoke() → async call to main → returns Promise    ║
 * ║  ipcRenderer.on()     → subscribe to events pushed by main      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tvaAPI', {

  // ──────────────────────────────────────────────────────────────────
  // B1: DOORWAYS — Watched Folder Management
  // ──────────────────────────────────────────────────────────────────

  /** Opens native OS folder-picker dialog and returns the chosen path */
  selectFolder: () => ipcRenderer.invoke('doorway:select'),

  /** Returns the array of currently watched folder paths */
  getDoorways: () => ipcRenderer.invoke('doorway:getAll'),

  /** Removes a watched folder given its absolute path */
  removeDoorway: (folderPath) => ipcRenderer.invoke('doorway:remove', folderPath),

  // ──────────────────────────────────────────────────────────────────
  // B2 + B3: TEMPORAL LOOM — Rule CRUD & Persistence
  // ──────────────────────────────────────────────────────────────────

  /** Returns all saved rules in ordered array (rule index = priority) */
  getRules: () => ipcRenderer.invoke('rules:getAll'),

  /** Persists the entire rules array (sorted by user-defined priority) */
  saveRules: (rules) => ipcRenderer.invoke('rules:save', rules),

  // ──────────────────────────────────────────────────────────────────
  // B4: EYE OF SIMULATION — Dry Run (Look Before You Leap)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Runs rules against files in ONE folder without touching the disk.
   * Returns an array of prediction objects: { file, matchedRule, simulatedDest }
   */
  simulateSweep: (folderPath) => ipcRenderer.invoke('sweep:simulate', folderPath),

  /** Actually executes the sweep for ONE folder — moves/renames/copies/trashes files */
  executeSweep: (folderPath) => ipcRenderer.invoke('sweep:execute', folderPath),

  /** Execute sweep across ALL currently watched doorways */
  executeSweepAll: () => ipcRenderer.invoke('sweep:executeAll'),

  // ──────────────────────────────────────────────────────────────────
  // B5: SACRED LEDGER — Audit Trail & Time Stone Rewind (Undo)
  // ──────────────────────────────────────────────────────────────────

  /** Returns all ledger entries (newest first) */
  getLedger: () => ipcRenderer.invoke('ledger:getAll'),

  /** Rewinds a single ledger entry by its UUID — moves the file back */
  rewindTransaction: (entryId) => ipcRenderer.invoke('ledger:rewind', entryId),

  /** Rewinds the ENTIRE latest batch sweep — mass undo */
  rewindLatestSweep: () => ipcRenderer.invoke('ledger:rewindLatest'),

  /** Utility: Opens native OS folder picker to choose a destination directory */
  selectDestFolder: () => ipcRenderer.invoke('dialog:selectDestFolder'),

  // ──────────────────────────────────────────────────────────────────
  // PUSH EVENTS — Main Process → Renderer (real-time notifications)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Called whenever a file is processed by the watcher (real-time)
   * @param {function} callback — receives { filePath, ruleName, actionType, destination }
   */
  onFileProcessed: (callback) =>
    ipcRenderer.on('event:fileProcessed', (_event, data) => callback(data)),

  /**
   * Called when the Dormammu Loop Detector fires (A2)
   * @param {function} callback — receives { fileName, message }
   */
  onLoopDetected: (callback) =>
    ipcRenderer.on('event:loopDetected', (_event, data) => callback(data)),

  /**
   * Called whenever the ledger is updated so the UI can refresh automatically
   * @param {function} callback — receives updated ledger entry
   */
  onLedgerUpdated: (callback) =>
    ipcRenderer.on('event:ledgerUpdated', (_event, data) => callback(data))
});
