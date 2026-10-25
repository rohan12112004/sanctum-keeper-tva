/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          SANCTUM KEEPER — TVA EDITION                           ║
 * ║          doorways-ui.js — Branch Doorways UI (B1)               ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  FEATURE: B1 — The Keeper Needs Doors to Watch                  ║
 * ║                                                                  ║
 * ║  HANDLES:                                                        ║
 * ║  • Rendering the list of currently watched folders              ║
 * ║  • Add Doorway button → calls native OS folder picker           ║
 * ║  • Remove Doorway button → stops watching and removes card      ║
 * ║  • Manual sweep button → execute all rules on all doorways      ║
 * ║  • Syncs doorway list with preview tab's folder selector        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

/**
 * Initializes the doorways UI — fetches saved doorways, renders cards,
 * and attaches event listeners.
 */
async function initDoorwaysUI() {
  const btnAdd       = document.getElementById('btnAddDoorway');
  const btnSweepAll  = document.getElementById('btnSweepAll');
  const sweepResult  = document.getElementById('sweepResult');

  // ── Render Doorways List ─────────────────────────────────────────

  /**
   * Fetches doorways from main process and re-renders the doorway cards.
   * Also updates the counter badge and syncs the simulation tab dropdown.
   */
  async function renderDoorways() {
    const doorways = await window.tvaAPI.getDoorways();
    const list = document.getElementById('doorwaysList');
    const emptyState = document.getElementById('doorwaysEmptyState');
    const counter = document.getElementById('doorwayCount');

    // Update counter
    if (counter) counter.textContent = doorways.length;

    // Clear existing cards (keep empty state div)
    const existingCards = list.querySelectorAll('.doorway-card');
    existingCards.forEach(card => card.remove());

    if (doorways.length === 0) {
      if (emptyState) emptyState.hidden = false;
    } else {
      if (emptyState) emptyState.hidden = true;

      // Render a card for each watched doorway
      doorways.forEach((folderPath, index) => {
        const card = createDoorwayCard(folderPath, index + 1);
        list.appendChild(card);
      });
    }

    // Sync the simulation tab's folder dropdown
    syncSimFolderDropdown(doorways);
  }

  /**
   * Creates a doorway card DOM element.
   * @param {string} folderPath - Absolute folder path
   * @param {number} number - Doorway number (1, 2, or 3)
   * @returns {HTMLElement}
   */
  function createDoorwayCard(folderPath, number) {
    const card = document.createElement('div');
    card.className = 'doorway-card';
    card.dataset.path = folderPath;

    // Extract folder name for display
    const folderName = folderPath.split(/[\\/]/).pop() || folderPath;

    card.innerHTML = `
      <div class="doorway-card-left">
        <div class="doorway-sentinel-dot" title="Active folder sentinel"></div>
        <div>
          <div class="doorway-label">WATCHED FOLDER #${number} — TVA SENTINEL ACTIVE</div>
          <div class="doorway-path" title="${folderPath}">${folderPath}</div>
        </div>
      </div>
      <div class="flex gap-8 items-center">
        <button class="btn btn-secondary btn-sm btn-sweep-single" data-path="${folderPath}">
          ▶ Run Rules
        </button>
        <button class="btn btn-danger btn-sm btn-remove-doorway" data-path="${folderPath}">
          ✕ Remove
        </button>
      </div>
    `;

    // Remove doorway handler
    card.querySelector('.btn-remove-doorway').addEventListener('click', async () => {
      const result = await window.tvaAPI.removeDoorway(folderPath);
      if (result.success) {
        showToast(`○ Doorway closed: ${folderName}`, 'info');
        await renderDoorways();
      } else {
        showToast(`Error closing doorway: ${result.error}`, 'error');
      }
    });

    // Single-folder sweep handler
    card.querySelector('.btn-sweep-single').addEventListener('click', async () => {
      sweepResult.textContent = `⚡ Sweeping "${folderName}"...`;
      const result = await window.tvaAPI.executeSweep(folderPath);
      if (result.success) {
        sweepResult.textContent = `✦ Sweep complete — ${result.count} relic(s) sorted.`;
        showToast(`Sweep complete: ${result.count} relic(s) sorted in "${folderName}"`, 'success');
      } else {
        sweepResult.textContent = `✗ Sweep failed: ${result.error}`;
        showToast(`Sweep failed: ${result.error}`, 'error');
      }
    });

    return card;
  }

  /**
   * Syncs the "Select Doorway" dropdown in the simulation tab with current doorways.
   * @param {string[]} doorways
   */
  function syncSimFolderDropdown(doorways) {
    const select = document.getElementById('simFolderSelect');
    if (!select) return;

    // Preserve current selection if possible
    const currentVal = select.value;
    select.innerHTML = '<option value="">— Choose a watched doorway —</option>';

    doorways.forEach(fp => {
      const opt = document.createElement('option');
      opt.value = fp;
      opt.textContent = fp;
      select.appendChild(opt);
    });

    // Restore previous selection
    if (currentVal && doorways.includes(currentVal)) {
      select.value = currentVal;
    }
  }

  // ── Add Doorway Button ────────────────────────────────────────────

  btnAdd?.addEventListener('click', async () => {
    const result = await window.tvaAPI.selectFolder();

    if (!result) {
      // User cancelled the dialog — no action needed
      return;
    }

    if (result.success) {
      const folderName = result.doorways[result.doorways.length - 1].split(/[\\/]/).pop();
      showToast(`● Doorway opened: ${folderName}`, 'success');
      await renderDoorways();
    } else {
      // Show TVA-styled error message
      showToast(`⚠ TVA PROTOCOL VIOLATION: ${result.error}`, 'error', 6000);
    }
  });

  // ── Sweep All Button ──────────────────────────────────────────────

  btnSweepAll?.addEventListener('click', async () => {
    sweepResult.textContent = '⚡ Initiating Temporal Sweep across all doorways...';
    const result = await window.tvaAPI.executeSweepAll();

    if (result.success) {
      if (result.count === 0) {
        sweepResult.textContent = '○ Sweep complete — no relics matched any enchantment.';
        showToast('Sweep complete — no relics matched.', 'info');
      } else {
        sweepResult.textContent = `✦ Temporal Sweep complete — ${result.count} relic(s) sorted across all doorways.`;
        showToast(`✦ ${result.count} relic(s) sorted successfully.`, 'success');
      }
    } else {
      sweepResult.textContent = `✗ Sweep failed: ${result.error}`;
      showToast(`Sweep failed: ${result.error}`, 'error');
    }
  });

  // ── Initial Render ────────────────────────────────────────────────
  await renderDoorways();
}
