/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          SANCTUM KEEPER — TVA EDITION                           ║
 * ║          watcher.js — Doorway Sentinel (B1)                     ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  FEATURE: B1 — The Keeper Needs Doors to Watch                  ║
 * ║                                                                  ║
 * ║  WHAT IT DOES:                                                   ║
 * ║  • Watches up to 3 folders at a time using Chokidar             ║
 * ║  • Persists watched folders across restarts (doorways.json)     ║
 * ║  • Guards against root/system directory monitoring              ║
 * ║  • Ignores incomplete downloads (.tmp, .crdownload, .part)      ║
 * ║  • Non-recursive: only files placed DIRECTLY in the folder      ║
 * ║  • 800ms delay before processing (waits for file write finish)  ║
 * ║                                                                  ║
 * ║  HOW IT'S DIFFERENT:                                             ║
 * ║  Most watchers blindly recurse into subfolders and miss locks.  ║
 * ║  Ours isolates depth=0 and holds 800ms to avoid processing      ║
 * ║  half-written Chrome downloads or Word temp files.              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

class DoorwaySentinel {
  /**
   * @param {string} userDataPath - Electron's app.getPath('userData')
   * @param {function} onNewFileCallback - called with (filePath) when a new file appears
   */
  constructor(userDataPath, onNewFileCallback) {
    this.configPath = path.join(userDataPath, 'doorways.json');
    this.onNewFile = onNewFileCallback;

    // Map of folderPath → chokidar watcher instance
    this.watchers = new Map();

    // Map of normalized filePath → expiration timestamp
    // Prevents watcher from reacting to files created by the Keeper itself
    this.ignoredPaths = new Map();

    // Load previously saved doorways from disk
    this.doorways = this.loadDoorways();
  }

  /**
   * Temporarily ignores a file path so the watcher doesn't re-trigger
   * when our own rule engine moves, copies, or renames a file.
   */
  ignoreNext(filePath, ttlMs = 5000) {
    if (!filePath) return;
    const normalized = path.resolve(filePath).toLowerCase();
    this.ignoredPaths.set(normalized, Date.now() + ttlMs);
  }

  /**
   * Checks if a path is currently suppressed from triggering rules.
   */
  isIgnored(filePath) {
    if (!filePath) return false;
    const normalized = path.resolve(filePath).toLowerCase();
    const expire = this.ignoredPaths.get(normalized);
    if (!expire) return false;
    if (Date.now() > expire) {
      this.ignoredPaths.delete(normalized);
      return false;
    }
    return true;
  }

  // ── Persistence: Load & Save ──────────────────────────────────────

  /**
   * Reads doorways.json from userData. Returns [] if missing or corrupt.
   */
  loadDoorways() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (err) {
      console.error('[Sentinel] Failed to load doorways.json:', err.message);
    }
    return [];
  }

  /**
   * Atomically writes the current doorways list to disk.
   */
  saveDoorways() {
    const tmp = `${this.configPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.doorways, null, 2));
    fs.renameSync(tmp, this.configPath);
  }

  // ── Safety Guards ──────────────────────────────────────────────────

  /**
   * Validates a folder path against system/root directory blocklist.
   * @param {string} folderPath
   * @returns {{ safe: boolean, reason?: string }}
   */
  isSafePath(folderPath) {
    const normalized = path.resolve(folderPath);
    const root = path.parse(normalized).root;

    // Block the root drive itself (e.g., "C:\")
    if (normalized === root) {
      return { safe: false, reason: 'TVA PROTOCOL VIOLATION: System root drives cannot be watched.' };
    }

    const lower = normalized.toLowerCase();
    const forbidden = ['windows', 'system32', 'program files', 'program files (x86)', 'syswow64'];
    for (const f of forbidden) {
      if (lower.includes(f)) {
        return { safe: false, reason: `TVA LOCKDOWN: Protected OS directory "${f}" cannot be monitored.` };
      }
    }

    // Block Unix system paths
    const unixForbidden = ['/etc', '/bin', '/usr/bin', '/sbin', '/sys', '/proc'];
    for (const u of unixForbidden) {
      if (normalized.startsWith(u)) {
        return { safe: false, reason: `TVA LOCKDOWN: Critical system path "${u}" is off-limits.` };
      }
    }

    return { safe: true };
  }

  // ── Doorway Management ─────────────────────────────────────────────

  /**
   * Adds a new watched folder. Throws if capacity or safety check fails.
   * @param {string} folderPath
   * @returns {string[]} updated doorways list
   */
  addDoorway(folderPath) {
    if (this.doorways.length >= 3) {
      throw new Error('TVA Sentinel Capacity Reached: Maximum 3 doorways allowed simultaneously.');
    }

    const check = this.isSafePath(folderPath);
    if (!check.safe) throw new Error(check.reason);

    // Prevent duplicates
    if (this.doorways.includes(folderPath)) return this.doorways;

    this.doorways.push(folderPath);
    this.saveDoorways();
    this.startWatching(folderPath);
    return this.doorways;
  }

  /**
   * Stops watching a folder and removes it from the persisted list.
   * @param {string} folderPath
   * @returns {string[]} updated doorways list
   */
  removeDoorway(folderPath) {
    this.stopWatching(folderPath);
    this.doorways = this.doorways.filter(p => p !== folderPath);
    this.saveDoorways();
    return this.doorways;
  }

  /**
   * Returns the current list of watched doorways.
   */
  getDoorways() {
    return this.doorways;
  }

  // ── Chokidar Watcher Lifecycle ─────────────────────────────────────

  /**
   * Starts a Chokidar file watcher for the given folder path.
   *
   * Key settings:
   *  - depth: 0          → only files directly in the folder (non-recursive)
   *  - ignoreInitial     → don't fire for existing files on startup
   *  - ignored patterns  → skip hidden files and incomplete downloads
   */
  startWatching(folderPath) {
    if (this.watchers.has(folderPath)) return; // Already watching

    const watcher = chokidar.watch(folderPath, {
      depth: 0,            // Non-recursive — surface files only
      ignoreInitial: true, // Don't trigger for files already there at startup

      // Ignore: hidden files, crdownload, part, tmp, partial (incomplete downloads)
      ignored: [
        /(^|[\/\\])\../,         // Hidden dotfiles
        /\.crdownload$/,          // Chrome partial downloads
        /\.part$/,                // Firefox/torrent partials
        /\.tmp$/,                 // Generic temp files
        /\.partial$/              // Other partials
      ],
      // Only fire after the file has stopped changing for 500ms (avoids locked files)
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    watcher.on('add', (filePath) => {
      // If Keeper itself just created or renamed this file, ignore it to prevent loop
      if (this.isIgnored(filePath)) {
        return;
      }
      // Brief buffer to allow the OS to release file handles
      setTimeout(() => {
        if (!this.isIgnored(filePath)) {
          this.onNewFile(filePath);
        }
      }, 500);
    });

    watcher.on('error', (err) => {
      console.error(`[Sentinel] Watcher error on ${folderPath}:`, err.message);
    });

    this.watchers.set(folderPath, watcher);
    console.log(`[Sentinel] ● Doorway opened: ${folderPath}`);
  }

  /**
   * Closes and removes the Chokidar watcher for the given folder.
   */
  stopWatching(folderPath) {
    const watcher = this.watchers.get(folderPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(folderPath);
      console.log(`[Sentinel] ○ Doorway closed: ${folderPath}`);
    }
  }

  /**
   * Initializes watchers for all saved doorways (called on app startup).
   * Skips folders that no longer exist on disk.
   */
  initWatchers() {
    this.doorways.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.startWatching(dir);
      } else {
        console.warn(`[Sentinel] Doorway missing from disk, skipping: ${dir}`);
      }
    });
  }

  /**
   * Closes ALL active watchers (called on app quit).
   */
  closeAll() {
    for (const [folderPath, watcher] of this.watchers) {
      watcher.close();
      console.log(`[Sentinel] Closed watcher: ${folderPath}`);
    }
    this.watchers.clear();
  }
}

module.exports = DoorwaySentinel;
