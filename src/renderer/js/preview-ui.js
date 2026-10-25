/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          SANCTUM KEEPER — TVA EDITION                           ║
 * ║          preview-ui.js — Eye of Simulation (Dry Run) (B4)       ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  FEATURE: B4 — Look Before You Leap                             ║
 * ║                                                                  ║
 * ║  HANDLES:                                                        ║
 * ║  • Dropdown to select which watched doorway to simulate         ║
 * ║  • Run simulation button → calls sweep:simulate IPC             ║
 * ║  • Renders prediction matrix table with per-file fate:          ║
 * ║    [File Name] → [Matched Rule] → [Action] → [Predicted Dest]  ║
 * ║  • Highlights untouched files separately                        ║
 * ║  • NO files are moved/renamed/copied/trashed during simulation  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

/**
 * Initializes the Eye of Simulation tab.
 * Attaches the "Run Simulation" button handler.
 */
function initPreviewUI() {
  const btnRun = document.getElementById('btnRunSimulation');

  btnRun?.addEventListener('click', async () => {
    const folderPath = document.getElementById('simFolderSelect')?.value;

    if (!folderPath) {
      showToast('⚠ Select a doorway to simulate first!', 'error');
      return;
    }

    // Show loading state
    const resultsContainer = document.getElementById('simulationResults');
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔄</div>
        <div class="empty-text">Consulting the Eye of Simulation...<br />Evaluating relics against active enchantments.</div>
      </div>
    `;

    const result = await window.tvaAPI.simulateSweep(folderPath);

    if (!result.success) {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠</div>
          <div class="empty-text red-text">Simulation failed:<br />${escapeHtml(result.error)}</div>
        </div>
      `;
      showToast(`Simulation error: ${result.error}`, 'error');
      return;
    }

    renderSimulationTable(result.predictions, resultsContainer, folderPath);
  });
}

/**
 * Renders the simulation prediction matrix as an HTML table.
 *
 * @param {Object[]} predictions - Array of prediction objects from engine.simulateSweep()
 * @param {HTMLElement} container - DOM element to render into
 * @param {string} folderPath - The simulated folder path (for context display)
 */
function renderSimulationTable(predictions, container, folderPath) {
  if (predictions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <div class="empty-text">No files found in this doorway.<br />Drop some relics into the folder and try again.</div>
      </div>
    `;
    return;
  }

  // Summary stats
  const total = predictions.length;
  const matched = predictions.filter(p => p.predictedAction !== 'UNTOUCHED' && p.predictedAction !== 'IGNORED').length;
  const untouched = predictions.filter(p => p.predictedAction === 'UNTOUCHED').length;
  const ignored = predictions.filter(p => p.predictedAction === 'IGNORED').length;

  // Show toast with summary
  showToast(`Eye of Simulation: ${matched} matched, ${untouched} untouched, ${ignored} ignored`, 'info', 5000);

  // Build the HTML
  let html = `
    <!-- Simulation header bar -->
    <div class="sim-header-bar" style="
      display: flex;
      gap: 24px;
      padding: 12px 16px;
      background: rgba(229,139,36,0.04);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 14px;
      font-size: 11px;
    ">
      <div>
        <span class="muted-text">FOLDER</span><br/>
        <span class="amber-text" style="font-size:10px;">${escapeHtml(folderPath)}</span>
      </div>
      <div style="border-left:1px solid var(--border);padding-left:24px;">
        <span class="muted-text">TOTAL FILES</span><br/>
        <span style="color:var(--text-primary);font-weight:700;">${total}</span>
      </div>
      <div>
        <span class="muted-text">WILL ORGANIZE</span><br/>
        <span class="emerald-text">${matched}</span>
      </div>
      <div>
        <span class="muted-text">UNTOUCHED</span><br/>
        <span class="gold-text">${untouched}</span>
      </div>
      <div>
        <span class="muted-text">IGNORED (TEMP)</span><br/>
        <span class="red-text">${ignored}</span>
      </div>
    </div>

    <!-- Prediction matrix table -->
    <table class="sim-table">
      <thead>
        <tr>
          <th>#</th>
          <th>FILE NAME</th>
          <th>MATCHED RULE</th>
          <th>ACTION</th>
          <th>PREDICTED DESTINATION</th>
        </tr>
      </thead>
      <tbody>
  `;

  predictions.forEach((pred, index) => {
    const actionBadgeClass = getActionBadgeClass(pred.predictedAction);
    const rowClass = (pred.predictedAction === 'UNTOUCHED' || pred.predictedAction === 'IGNORED') ? 'style="opacity:0.5;"' : '';

    html += `
      <tr ${rowClass}>
        <td style="color:var(--text-muted);width:36px;">${index + 1}</td>
        <td>
          <span style="color:var(--text-primary);">${escapeHtml(pred.fileName)}</span>
        </td>
        <td>
          ${pred.matchedRule
            ? `<span class="amber-text">${escapeHtml(pred.matchedRule)}</span>`
            : `<span class="muted-text">—</span>`
          }
        </td>
        <td>
          <span class="action-badge ${actionBadgeClass}">${pred.predictedAction}</span>
        </td>
        <td class="file-path" title="${escapeHtml(pred.predictedDestination)}">
          ${escapeHtml(pred.predictedDestination)}
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <!-- Reminder banner -->
    <div style="
      margin-top: 14px;
      padding: 10px 14px;
      border: 1px solid rgba(0,255,157,0.2);
      border-radius: var(--radius);
      font-size: 11px;
      color: var(--emerald-dim);
      background: rgba(0,255,157,0.03);
    ">
      👁 <strong>SIMULATION ONLY</strong> — No files were moved, renamed, copied, or trashed.
      Head to <strong>Branch Doorways</strong> and click <strong>Execute Temporal Sweep</strong> to apply these changes.
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Returns the CSS class for an action badge based on the action type string.
 * @param {string} action
 * @returns {string}
 */
function getActionBadgeClass(action) {
  switch (action?.toLowerCase()) {
    case 'move':     return 'ab-move';
    case 'copy':     return 'ab-copy';
    case 'rename':   return 'ab-rename';
    case 'trash':    return 'ab-trash';
    case 'untouched': return 'ab-untouched';
    case 'ignored':  return 'ab-ignored';
    default:         return 'ab-untouched';
  }
}

/**
 * Escapes HTML special characters to prevent XSS.
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
