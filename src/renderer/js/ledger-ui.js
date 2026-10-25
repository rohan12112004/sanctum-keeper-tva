/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          SANCTUM KEEPER — TVA EDITION                           ║
 * ║          ledger-ui.js — Sacred Chronicles Ledger (B5)           ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  FEATURE: B5 — Turn Back Time                                   ║
 * ║                                                                  ║
 * ║  HANDLES:                                                        ║
 * ║  • Rendering all ledger entries in a table (newest first)       ║
 * ║  • Per-entry "REWIND" button → reverses that single action      ║
 * ║  • "REWIND LATEST SWEEP" → mass-undo the most recent batch      ║
 * ║  • Status stamps: COMMITTED (green) | REWOUND (dimmed)          ║
 * ║  • Action type stamps: BRANCHED | REPLICATED | TRANSMUTED | PRUNED ║
 * ║  • TVA-branded timestamp display                                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

/**
 * Initializes the Sacred Chronicles ledger tab.
 * Loads entries and attaches button handlers.
 */
async function initLedgerUI() {
  await loadLedger();

  // Refresh button
  document.getElementById('btnRefreshLedger')?.addEventListener('click', async () => {
    await loadLedger();
    showToast('Sacred Chronicles refreshed.', 'info');
  });

  // Rewind latest sweep (batch undo)
  document.getElementById('btnRewindLatestSweep')?.addEventListener('click', async () => {
    showToast('⏳ Time Stone activated: Reversing latest sweep...', 'info');
    const result = await window.tvaAPI.rewindLatestSweep();

    if (result.success) {
      if (result.count === 0) {
        showToast('No actions to rewind — latest sweep already undone.', 'info');
      } else {
        showToast(`↩ Time Stone: ${result.count} action(s) rewound successfully.`, 'success', 5000);
      }
      await loadLedger();
    } else {
      showToast(`Rewind failed: ${result.error}`, 'error', 6000);
    }
  });
}

/**
 * Fetches all ledger entries from the main process and re-renders the table.
 * Exposed globally so app.js can call it when the ledger is updated by a push event.
 */
async function loadLedger() {
  const entries = await window.tvaAPI.getLedger();
  renderLedgerTable(entries);
}

/**
 * Renders the complete ledger entries table.
 * @param {Object[]} entries - Array of ledger entry objects (newest first)
 */
function renderLedgerTable(entries) {
  const container = document.getElementById('ledgerEntries');
  const emptyState = document.getElementById('ledgerEmptyState');

  if (!entries || entries.length === 0) {
    container.innerHTML = '';
    container.appendChild(document.getElementById('ledgerEmptyState') || createEmptyLedger());
    if (emptyState) emptyState.hidden = false;
    return;
  }

  // Build the table HTML
  let html = `
    <table class="ledger-table">
      <thead>
        <tr>
          <th>TIMESTAMP (Time)</th>
          <th>ACTION</th>
          <th>RELIC (Original File)</th>
          <th>DESTINATION (New Location)</th>
          <th>ENCHANTMENT (Rule)</th>
          <th>STATUS</th>
          <th>REWIND (Undo)</th>
        </tr>
      </thead>
      <tbody>
  `;

  entries.forEach(entry => {
    const isRewound = entry.status === 'REWOUND';
    const rowClass = isRewound ? 'rewound' : '';

    // Format timestamp for TVA display
    const ts = new Date(entry.timestamp);
    const timeStr = ts.toLocaleString('en-US', {
      month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });

    // Action type stamp
    const actionStamp = getActionStamp(entry.actionType);

    // Source filename (truncated for display)
    const srcName = entry.source ? entry.source.split(/[\\/]/).pop() : '—';
    const destDisplay = entry.destination
      ? entry.destination.split(/[\\/]/).pop()
      : '<span class="muted-text">🗑 Trash</span>';

    // Status stamp
    const statusStamp = isRewound
      ? '<span class="stamp stamp-rewound">REWOUND (Undone)</span>'
      : '<span class="stamp stamp-committed">COMMITTED (Active)</span>';

    // Rewind button (disabled if already rewound or if TRASH — can't auto-recover from OS trash)
    const canRewind = !isRewound && entry.actionType !== 'TRASH';
    const rewindBtn = canRewind
      ? `<button class="btn btn-rewind btn-sm" data-entry-id="${entry.id}">↩ REWIND (Undo)</button>`
      : `<span class="muted-text" style="font-size:10px;">${isRewound ? 'UNDONE' : 'N/A'}</span>`;

    html += `
      <tr class="${rowClass}">
        <td class="timestamp">${timeStr}</td>
        <td>${actionStamp}</td>
        <td>
          <span title="${escapeHtml(entry.source || '')}" class="file-path">${escapeHtml(srcName)}</span>
        </td>
        <td>
          <span title="${escapeHtml(entry.destination || '')}" class="file-path">${destDisplay}</span>
        </td>
        <td>
          <span class="gold-text" style="font-size:11px;">${escapeHtml(entry.ruleName || 'Manual')}</span>
        </td>
        <td>${statusStamp}</td>
        <td>${rewindBtn}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';

  container.innerHTML = html;

  // Attach rewind button handlers (event delegation on the rendered table)
  container.querySelectorAll('.btn-rewind').forEach(btn => {
    btn.addEventListener('click', async () => {
      const entryId = btn.dataset.entryId;
      await rewindSingleEntry(entryId);
    });
  });
}

/**
 * Sends a rewind request for a single ledger entry and refreshes the table.
 * @param {string} entryId - UUID of the entry to rewind
 */
async function rewindSingleEntry(entryId) {
  const result = await window.tvaAPI.rewindTransaction(entryId);

  if (result.success) {
    showToast(`↩ Action rewound: "${result.entry.source.split(/[\\/]/).pop()}" returned.`, 'success', 5000);
    await loadLedger();
  } else {
    showToast(`Rewind failed: ${result.error}`, 'error', 6000);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Returns the TVA-branded action stamp HTML for a given action type.
 * @param {string} actionType
 * @returns {string} HTML string
 */
function getActionStamp(actionType) {
  switch (actionType) {
    case 'MOVE':   return '<span class="stamp stamp-move">BRANCHED (Moved)</span>';
    case 'COPY':   return '<span class="stamp stamp-copy">REPLICATED (Copied)</span>';
    case 'RENAME': return '<span class="stamp stamp-rename">TRANSMUTED (Renamed)</span>';
    case 'TRASH':  return '<span class="stamp stamp-trash">PRUNED (Trashed)</span>';
    default:       return `<span class="stamp">${escapeHtml(actionType)}</span>`;
  }
}

/**
 * Creates the empty state element for the ledger (fallback if not in DOM).
 * @returns {HTMLElement}
 */
function createEmptyLedger() {
  const div = document.createElement('div');
  div.id = 'ledgerEmptyState';
  div.className = 'empty-state';
  div.innerHTML = `
    <div class="empty-icon">📖</div>
    <div class="empty-text">The Sacred Timeline is empty.<br />No actions have been recorded yet.</div>
  `;
  return div;
}

/**
 * Escapes HTML special characters.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
