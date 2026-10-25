/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          SANCTUM KEEPER — TVA EDITION                           ║
 * ║          ledger.js — Sacred Timeline Ledger + Time Stone (B5)   ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  FEATURE: B5 — Turn Back Time                                   ║
 * ║                                                                  ║
 * ║  WHAT IT DOES:                                                   ║
 * ║  • Logs every file action (MOVE, RENAME, COPY, TRASH) to        ║
 * ║    sacred_ledger.json in Electron's userData directory          ║
 * ║  • Uses atomic writes (tmp → rename) to prevent corruption      ║
 * ║    even if power is cut mid-write                               ║
 * ║  • Single-entry rewind: reverses ONE action, puts file back     ║
 * ║  • Batch rewind: reverses all actions from the latest sweep     ║
 * ║                                                                  ║
 * ║  DATA SCHEMA per entry:                                         ║
 * ║  { id, timestamp, actionType, source, destination,              ║
 * ║    ruleName, batchId, status }                                  ║
 * ║                                                                  ║
 * ║  STATUS VALUES:                                                  ║
 * ║  COMMITTED  — action was executed successfully                  ║
 * ║  REWOUND    — action was undone by Time Stone                   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SacredLedger {
  /**
   * @param {string} userDataPath - Electron's app.getPath('userData')
   */
  constructor(userDataPath) {
    this.filePath = path.join(userDataPath, 'sacred_ledger.json');
    this.entries = this.load();
  }

  // ── Persistence: Atomic Load & Save ───────────────────────────────

  /**
   * Loads ledger entries from disk. Returns [] if file is missing/corrupt.
   * Atomic read: no partial-write issue since JSON.parse either works or fails.
   */
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[Ledger] Failed to load sacred_ledger.json:', err.message);
    }
    return [];
  }

  /**
   * Atomically writes ledger to disk.
   *
   * HOW ATOMIC WRITE WORKS:
   *  1. Write all data to a temp file (sacred_ledger.json.tmp)
   *  2. fs.renameSync() atomically replaces the real file
   *  → Even if power is cut between steps, we never have partial writes
   *    because the OS guarantees rename is atomic on the same filesystem.
   */
  save() {
    const tempFile = `${this.filePath}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(this.entries, null, 2), 'utf8');
    fs.renameSync(tempFile, this.filePath);
  }

  // ── Recording Actions ──────────────────────────────────────────────

  /**
   * Records a new action in the ledger.
   *
   * @param {Object} params
   * @param {string} params.actionType  - 'MOVE' | 'RENAME' | 'COPY' | 'TRASH'
   * @param {string} params.source      - Original file path
   * @param {string} params.destination - New file path (null for TRASH)
   * @param {string} params.ruleName    - Name of the rule that triggered this
   * @param {string} [params.batchId]   - UUID shared across a single sweep run
   * @returns {Object} the newly created ledger entry
   */
  record({ actionType, source, destination, ruleName, batchId }) {
    const entry = {
      id: crypto.randomUUID(),                    // Unique identifier per action
      timestamp: new Date().toISOString(),          // ISO-8601 timestamp
      actionType,                                   // MOVE | RENAME | COPY | TRASH
      source,                                       // Where file came from
      destination,                                  // Where file went (null = trash)
      ruleName: ruleName || 'Manual',               // Which rule triggered this
      batchId: batchId || crypto.randomUUID(),      // Groups actions from same sweep
      status: 'COMMITTED'                           // Start as committed
    };

    // Newest entries appear first in the ledger
    this.entries.unshift(entry);
    this.save();

    console.log(`[Ledger] ✦ Recorded: ${actionType} — ${path.basename(source)}`);
    return entry;
  }

  /**
   * Returns all ledger entries (newest first).
   */
  getAll() {
    return this.entries;
  }

  // ── Time Stone Rewind (Undo) ───────────────────────────────────────

  /**
   * Rewinds a SINGLE ledger entry.
   *
   * REWIND LOGIC BY ACTION TYPE:
   *  MOVE   → rename file from destination back to source path
   *  RENAME → rename file from destination back to source name
   *  COPY   → delete the copy at destination (original untouched)
   *  TRASH  → cannot auto-rewind from OS trash (user must restore manually)
   *
   * @param {string} entryId - UUID of the ledger entry to rewind
   * @returns {Object} the rewound ledger entry
   * @throws {Error} if entry not found, already rewound, or file missing
   */
  async rewind(entryId) {
    const entry = this.entries.find(e => e.id === entryId);

    if (!entry) {
      throw new Error(`[Ledger] No entry found with ID: ${entryId}`);
    }
    if (entry.status === 'REWOUND') {
      throw new Error(`[Ledger] Timeline branch already rewound for: ${path.basename(entry.source)}`);
    }

    if (entry.actionType === 'MOVE' || entry.actionType === 'RENAME') {
      // Ensure the moved/renamed file still exists at destination
      if (!fs.existsSync(entry.destination)) {
        throw new Error(
          `[Ledger] Cannot rewind — artifact "${path.basename(entry.destination)}" is missing from reality!`
        );
      }
      // Recreate source directory if it no longer exists
      const sourceDir = path.dirname(entry.source);
      if (!fs.existsSync(sourceDir)) {
        fs.mkdirSync(sourceDir, { recursive: true });
      }
      await fs.promises.rename(entry.destination, entry.source);

    } else if (entry.actionType === 'COPY') {
      // For copies: delete the copy at destination
      if (fs.existsSync(entry.destination)) {
        await fs.promises.unlink(entry.destination);
      }

    } else if (entry.actionType === 'TRASH') {
      throw new Error(
        '[Ledger] Files pruned to the Void (Trash) cannot be automatically restored. ' +
        'Please retrieve from your OS Recycle Bin manually.'
      );
    }

    entry.status = 'REWOUND';
    this.save();
    console.log(`[Ledger] ↩ Rewound: ${entry.actionType} — ${path.basename(entry.source)}`);
    return entry;
  }

  /**
   * Rewinds ALL entries from the most recent batch sweep.
   *
   * Finds the batchId of the first (newest) entry and reverts all entries
   * sharing that batchId that are still in COMMITTED status.
   *
   * @returns {Object[]} array of rewound entries
   */
  async rewindLatestSweep() {
    if (this.entries.length === 0) {
      throw new Error('[Ledger] The Sacred Timeline is empty — no sweep to rewind.');
    }

    // Find the batchId of the most recent sweep
    const latestBatchId = this.entries[0].batchId;
    const batchEntries = this.entries.filter(
      e => e.batchId === latestBatchId && e.status === 'COMMITTED'
    );

    if (batchEntries.length === 0) {
      throw new Error('[Ledger] Latest sweep already fully rewound.');
    }

    const rewound = [];
    for (const entry of batchEntries) {
      try {
        await this.rewind(entry.id);
        rewound.push(entry);
      } catch (err) {
        console.warn(`[Ledger] Skipped rewind for ${entry.id}: ${err.message}`);
      }
    }

    return rewound;
  }
}

module.exports = SacredLedger;
