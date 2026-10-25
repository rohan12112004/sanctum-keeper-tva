/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          SANCTUM KEEPER — TVA EDITION                           ║
 * ║          engine.js — Deterministic Rule Evaluator (B2, B3, A2)  ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  FEATURES:                                                       ║
 * ║  B2 — Enchantments Anyone Can Write (rules with conditions)     ║
 * ║  B3 — First Spell Wins (strict first-match-breaks loop)         ║
 * ║  A2 — Dormammu Loop Detector (cycle breaker)                    ║
 * ║                                                                  ║
 * ║  DESIGN PRINCIPLE — "No Guesswork, No AI":                      ║
 * ║  Every rule is evaluated purely by logical conditions on        ║
 * ║  file metadata: name, extension, size, and age. There is no     ║
 * ║  machine learning, heuristics, or probabilistic decision-making. ║
 * ║  Wong writes the rule. The engine follows it. Every time.       ║
 * ║                                                                  ║
 * ║  RULE SCHEMA:                                                    ║
 * ║  {                                                               ║
 * ║    id: "uuid",                                                   ║
 * ║    name: "Invoice Sorter",                                       ║
 * ║    logic: "ALL" | "ANY" | "NONE",                               ║
 * ║    conditions: [                                                 ║
 * ║      { field: "name", operator: "contains", value: "invoice" }, ║
 * ║      { field: "extension", operator: "equals", value: "pdf" },  ║
 * ║      { field: "size", operator: "greater_than", value: 1048576} ║
 * ║      { field: "age_days", operator: "greater_than", value: 7 }  ║
 * ║    ],                                                            ║
 * ║    action: {                                                     ║
 * ║      type: "move" | "copy" | "rename" | "trash",                ║
 * ║      destination: "C:/sorted/invoices",   (for move/copy)       ║
 * ║      pattern: "{date}_{originalName}"     (for rename)          ║
 * ║    }                                                             ║
 * ║  }                                                               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// trash is an ESM-only package in v8+. We dynamically import it.
let trashFn = null;
async function getTrash() {
  if (!trashFn) {
    const trashModule = await import('trash');
    trashFn = trashModule.default;
  }
  return trashFn;
}

class RuleEngine {
  /**
   * @param {SacredLedger} ledger - Instance of the SacredLedger class
   */
  constructor(ledger) {
    this.ledger = ledger;

    /**
     * Dormammu Loop Detector: tracks recent file movements.
     * Map of fileName → [timestamps of moves within last 10 seconds]
     * If a file is moved >2 times in 10 seconds → loop detected → HALT.
     */
    this.recentMoves = new Map();
  }

  // ── A2: Dormammu Loop Detector ─────────────────────────────────────

  /**
   * Detects if a file is caught in a recursive rule loop.
   *
   * PROBLEM: Rule A moves file from Folder1 → Folder2.
   *          Rule B watches Folder2 and moves file back to Folder1.
   *          This creates an infinite loop.
   *
   * SOLUTION: Track how many times a file has been moved in the last 10s.
   *           If count > 2, throw a loop error and halt processing.
   *
   * @param {string} fileName - Basename of the file being moved
   * @throws {Error} if a loop is detected
   */
  checkDormammuLoop(fileName) {
    const now = Date.now();
    const TEN_SECONDS = 10000;

    // Keep only timestamps within the last 10 seconds
    const history = (this.recentMoves.get(fileName) || [])
      .filter(t => now - t < TEN_SECONDS);

    history.push(now);
    this.recentMoves.set(fileName, history);

    if (history.length > 2) {
      throw new Error(
        `DORMAMMU LOOP DETECTED: "${fileName}" is trapped in temporal recursion! ` +
        `Moved ${history.length} times in 10 seconds. Halting — file is now LOCKED_IN_TIME.`
      );
    }
  }

  // ── File Metadata Extraction ───────────────────────────────────────

  /**
   * Reads OS-level file metadata needed for condition evaluation.
   *
   * @param {string} filePath - Absolute path to the file
   * @returns {{ filePath, name, base, ext, size, mtimeMs, birthtimeMs }}
   */
  getFileStats(filePath) {
    const stat = fs.statSync(filePath);
    const parsed = path.parse(filePath);
    return {
      filePath,
      name: parsed.name,              // filename without extension (e.g., "invoice_2024")
      base: parsed.base,              // full filename (e.g., "invoice_2024.pdf")
      ext: parsed.ext.replace('.', '').toLowerCase(), // extension without dot (e.g., "pdf")
      size: stat.size,                // size in bytes
      mtimeMs: stat.mtimeMs,          // last modified time in ms since epoch
      birthtimeMs: stat.birthtimeMs   // creation time in ms since epoch
    };
  }

  // ── B2: Condition Evaluation ───────────────────────────────────────

  /**
   * Evaluates a SINGLE condition against a file's stats.
   *
   * Supported conditions:
   *  field=name:      contains | starts_with | ends_with | equals | regex
   *  field=extension: equals (e.g., "pdf")
   *  field=size:      greater_than | less_than (value in bytes)
   *  field=age_days:  greater_than (days since last modification)
   *
   * @param {Object} fileStats - from getFileStats()
   * @param {Object} cond      - condition object { field, operator, value }
   * @returns {boolean}
   */
  evaluateCondition(fileStats, cond) {
    switch (cond.field) {
      case 'name': {
        const val = String(cond.value).toLowerCase();
        const fname = fileStats.name.toLowerCase();
        if (cond.operator === 'contains')    return fname.includes(val);
        if (cond.operator === 'starts_with') return fname.startsWith(val);
        if (cond.operator === 'ends_with')   return fname.endsWith(val);
        if (cond.operator === 'equals')      return fname === val;
        if (cond.operator === 'regex') {
          try { return new RegExp(cond.value, 'i').test(fname); }
          catch { return false; }
        }
        break;
      }

      case 'extension': {
        // Compare without dots, case-insensitive
        const ruleExt = String(cond.value).replace('.', '').toLowerCase();
        return fileStats.ext === ruleExt;
      }

      case 'size': {
        const targetBytes = Number(cond.value);
        if (isNaN(targetBytes)) return false;
        if (cond.operator === 'greater_than') return fileStats.size > targetBytes;
        if (cond.operator === 'less_than')    return fileStats.size < targetBytes;
        break;
      }

      case 'age_days': {
        const ageDays = (Date.now() - fileStats.mtimeMs) / (1000 * 60 * 60 * 24);
        return ageDays >= Number(cond.value);
      }
    }
    return false;
  }

  /**
   * Evaluates ALL conditions of a rule using the rule's logic mode (AND/ANY/NONE).
   *
   * logic = "ALL"  → every condition must be true (AND)
   * logic = "ANY"  → at least one condition must be true (OR)
   * logic = "NONE" → no condition must be true (NOT/NOR)
   *
   * @param {Object} rule      - rule object with conditions[] and logic
   * @param {Object} fileStats - from getFileStats()
   * @returns {boolean}
   */
  evaluateRule(rule, fileStats) {
    if (!rule.conditions || rule.conditions.length === 0) return false;

    const results = rule.conditions.map(c => this.evaluateCondition(fileStats, c));

    if (rule.logic === 'ANY')  return results.some(Boolean);
    if (rule.logic === 'NONE') return !results.some(Boolean);
    return results.every(Boolean); // Default: 'ALL' (AND logic)
  }

  // ── B3: First Spell Wins ───────────────────────────────────────────

  /**
   * Scans rules in index order and returns the FIRST matching rule.
   * Once a match is found, evaluation stops immediately.
   *
   * This guarantees determinism: the same file always triggers the same rule.
   *
   * @param {string}   filePath - Absolute file path
   * @param {Object[]} rules    - Ordered rules array (index = priority)
   * @returns {{ matchedRule, ruleIndex, fileStats } | null}
   */
  findFirstMatch(filePath, rules) {
    let fileStats;
    try {
      fileStats = this.getFileStats(filePath);
    } catch (err) {
      console.warn(`[Engine] Could not stat file "${filePath}": ${err.message}`);
      return null;
    }

    for (let i = 0; i < rules.length; i++) {
      if (this.evaluateRule(rules[i], fileStats)) {
        return { matchedRule: rules[i], ruleIndex: i, fileStats };
      }
    }
    return null; // No rule matched → file left untouched
  }

  // ── Collision-Safe Destination ─────────────────────────────────────

  /**
   * Generates a safe destination path, avoiding overwrites.
   *
   * If "report.pdf" already exists at target, returns "report (1).pdf",
   * then "report (2).pdf", etc.
   *
   * @param {string} targetPath - Desired destination path
   * @returns {string} Safe path that doesn't conflict with existing files
   */
  getSafeDestination(targetPath) {
    if (!fs.existsSync(targetPath)) return targetPath;

    const parsed = path.parse(targetPath);
    let counter = 1;
    let newPath;

    do {
      newPath = path.join(parsed.dir, `${parsed.name} (${counter})${parsed.ext}`);
      counter++;
    } while (fs.existsSync(newPath));

    return newPath;
  }

  // ── B2: Action Execution ───────────────────────────────────────────

  /**
   * Executes the action specified in a matched rule.
   *
   * Actions:
   *  move    → fs.rename from source to destination folder
   *  copy    → fs.copyFile to destination folder
   *  rename  → rename in-place using pattern substitution
   *  trash   → send to OS recycle bin using the 'trash' package
   *
   * RENAME PATTERNS:
   *  {originalName} → replaced with filename (without ext)
   *  {timestamp}    → replaced with Unix timestamp (ms)
   *  {date}         → replaced with YYYY-MM-DD
   *
   * @param {Object} action    - rule.action object
   * @param {Object} fileStats - from getFileStats()
   * @param {string} ruleName  - for ledger recording
   * @param {string} batchId   - for grouping ledger entries by sweep
   * @returns {Object} the ledger entry created
   */
  async executeAction(action, fileStats, ruleName, batchId = null) {
    // Check for Dormammu loop before executing
    this.checkDormammuLoop(fileStats.base);

    const src = fileStats.filePath;

    switch (action.type) {
      case 'move': {
        if (!fs.existsSync(action.destination)) {
          fs.mkdirSync(action.destination, { recursive: true });
        }
        const dest = this.getSafeDestination(
          path.join(action.destination, fileStats.base)
        );
        await fs.promises.rename(src, dest);
        return this.ledger.record({
          actionType: 'MOVE',
          source: src,
          destination: dest,
          ruleName,
          batchId
        });
      }

      case 'copy': {
        if (!fs.existsSync(action.destination)) {
          fs.mkdirSync(action.destination, { recursive: true });
        }
        const dest = this.getSafeDestination(
          path.join(action.destination, fileStats.base)
        );
        await fs.promises.copyFile(src, dest);
        return this.ledger.record({
          actionType: 'COPY',
          source: src,
          destination: dest,
          ruleName,
          batchId
        });
      }

      case 'rename': {
        // Apply pattern substitutions
        const newName = action.pattern
          .replace('{originalName}', fileStats.name)
          .replace('{timestamp}', Date.now())
          .replace('{date}', new Date().toISOString().split('T')[0]);

        const dest = this.getSafeDestination(
          path.join(path.dirname(src), `${newName}.${fileStats.ext}`)
        );
        await fs.promises.rename(src, dest);
        return this.ledger.record({
          actionType: 'RENAME',
          source: src,
          destination: dest,
          ruleName,
          batchId
        });
      }

      case 'trash': {
        const trash = await getTrash();
        await trash([src]);
        return this.ledger.record({
          actionType: 'TRASH',
          source: src,
          destination: null,
          ruleName,
          batchId
        });
      }

      default:
        throw new Error(`[Engine] Unknown action type: "${action.type}"`);
    }
  }

  // ── Sweep Operations ───────────────────────────────────────────────

  /**
   * B4: DRY RUN — Simulates rule evaluation without modifying any files.
   *
   * Scans all files in folderPath, evaluates rules, and returns
   * a prediction matrix: what would happen to each file.
   *
   * @param {string}   folderPath - Folder to scan
   * @param {Object[]} rules      - Ordered rules array
   * @returns {Object[]} array of { fileName, filePath, matchedRule, predictedAction, predictedDestination }
   */
  simulateSweep(folderPath, rules) {
    // Read only top-level files (non-recursive, matches watcher behavior)
    let files;
    try {
      files = fs.readdirSync(folderPath, { withFileTypes: true })
        .filter(d => d.isFile())
        .map(d => path.join(folderPath, d.name));
    } catch (err) {
      throw new Error(`[Engine] Cannot read folder "${folderPath}": ${err.message}`);
    }

    const TEMP_EXTENSIONS = ['.crdownload', '.part', '.tmp', '.partial'];

    return files.map(filePath => {
      const base = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase();

      // Skip temp/incomplete files (mirror watcher ignore rules)
      if (TEMP_EXTENSIONS.includes(ext)) {
        return {
          fileName: base,
          filePath,
          matchedRule: null,
          predictedAction: 'IGNORED',
          predictedDestination: 'Skipped — incomplete download'
        };
      }

      const match = this.findFirstMatch(filePath, rules);

      if (!match) {
        return {
          fileName: base,
          filePath,
          matchedRule: null,
          predictedAction: 'UNTOUCHED',
          predictedDestination: 'Remaining in current location'
        };
      }

      const { matchedRule, fileStats } = match;
      const action = matchedRule.action;

      // Build human-readable prediction of what would happen
      let predictedDestination = '';
      if (action.type === 'move' || action.type === 'copy') {
        predictedDestination = path.join(action.destination, fileStats.base);
      } else if (action.type === 'rename') {
        const newName = action.pattern
          .replace('{originalName}', fileStats.name)
          .replace('{timestamp}', '<timestamp>')
          .replace('{date}', new Date().toISOString().split('T')[0]);
        predictedDestination = path.join(path.dirname(filePath), `${newName}.${fileStats.ext}`);
      } else if (action.type === 'trash') {
        predictedDestination = '🗑 OS Recycle Bin / Trash';
      }

      return {
        fileName: base,
        filePath,
        matchedRule: matchedRule.name,
        predictedAction: action.type.toUpperCase(),
        predictedDestination
      };
    });
  }

  /**
   * LIVE SWEEP — Evaluates and executes rules on all files in a folder.
   *
   * Files are processed sequentially to avoid race conditions.
   * A shared batchId groups all actions from this sweep for bulk rewind.
   *
   * @param {string}   folderPath - Folder to sweep
   * @param {Object[]} rules      - Ordered rules array
   * @returns {Object[]} array of ledger entries created during this sweep
   */
  async executeSweep(folderPath, rules) {
    let files;
    try {
      files = fs.readdirSync(folderPath, { withFileTypes: true })
        .filter(d => d.isFile())
        .map(d => path.join(folderPath, d.name));
    } catch (err) {
      throw new Error(`[Engine] Cannot read folder "${folderPath}": ${err.message}`);
    }

    const TEMP_EXTENSIONS = ['.crdownload', '.part', '.tmp', '.partial'];
    const batchId = crypto.randomUUID(); // All actions in this sweep share one batchId
    const results = [];

    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase();
      if (TEMP_EXTENSIONS.includes(ext)) continue; // Skip incomplete files

      const match = this.findFirstMatch(filePath, rules);
      if (!match) continue; // No rule matched → leave untouched

      try {
        const ledgerEntry = await this.executeAction(
          match.matchedRule.action,
          match.fileStats,
          match.matchedRule.name,
          batchId
        );
        results.push(ledgerEntry);
      } catch (err) {
        if (err.message.includes('DORMAMMU LOOP')) {
          // Propagate loop detection upwards so main.js can emit an event
          throw err;
        }
        console.error(`[Engine] Action failed for "${path.basename(filePath)}":`, err.message);
      }
    }

    return results;
  }
}

module.exports = RuleEngine;
