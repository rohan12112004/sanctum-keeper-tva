/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          SANCTUM KEEPER — TVA EDITION                           ║
 * ║          app.js — Main UI Controller & Tab Navigation           ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  PURPOSE:                                                        ║
 * ║  Central coordinator for the renderer process.                  ║
 * ║  • Manages tab switching                                        ║
 * ║  • Initializes all sub-UI modules on load                       ║
 * ║  • Registers real-time push-event handlers from main process    ║
 * ║  • Drives the Miss Minutes clock and live status pill           ║
 * ║  • Provides global utility functions (showToast, showAlert)     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ── Tab Navigation ────────────────────────────────────────────────────

/**
 * Activates a tab panel and updates tab button states.
 * @param {string} tabName - one of: 'doorways' | 'rules' | 'simulation' | 'ledger'
 */
function activateTab(tabName) {
  // Deactivate all tabs
  document.querySelectorAll('.tva-tab').forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });

  // Hide all panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.hidden = true;
    panel.classList.remove('active');
  });

  // Activate selected tab button
  const tabBtn = document.querySelector(`.tva-tab[data-tab="${tabName}"]`);
  if (tabBtn) {
    tabBtn.classList.add('active');
    tabBtn.setAttribute('aria-selected', 'true');
  }

  // Show selected panel
  const panel = document.getElementById(`tab-${tabName}`);
  if (panel) {
    panel.hidden = false;
    panel.classList.add('active');
  }

  // Refresh tab content dynamically on view
  if (tabName === 'simulation') {
    window.tvaAPI.getDoorways().then(doorways => {
      if (typeof syncSimFolderDropdown === 'function') syncSimFolderDropdown(doorways);
    });
  } else if (tabName === 'ledger') {
    if (typeof loadLedger === 'function') loadLedger();
  } else if (tabName === 'doorways') {
    if (typeof renderDoorways === 'function') renderDoorways();
  } else if (tabName === 'rules') {
    if (typeof renderRulesList === 'function') renderRulesList();
  }
}

// ── Toast Notifications ───────────────────────────────────────────────

/**
 * Shows a brief toast notification in the bottom-right corner.
 * @param {string} message - Message to display
 * @param {'success'|'error'|'info'} type - Toast type (controls color)
 * @param {number} duration - Auto-dismiss in ms (default: 4000)
 */
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Auto-dismiss after duration
  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(60px)';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/**
 * Shows the Dormammu loop detector alert banner at the top of the screen.
 * @param {string} message - Error message from the loop detector
 */
function showDormammuAlert(message) {
  const alert = document.getElementById('dormammuAlert');
  const msgEl = document.getElementById('dormammuMessage');
  msgEl.textContent = `⚠ DORMAMMU LOOP DETECTED: ${message}`;
  alert.hidden = false;

  // Auto-dismiss after 10 seconds
  setTimeout(() => { alert.hidden = true; }, 10000);
}

// ── Sentinel Status Pill ──────────────────────────────────────────────

/**
 * Updates the sentinel status pill in the header.
 * @param {boolean} active
 * @param {string} [text]
 */
function setStatusActive(active, text) {
  const dot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  if (dot) {
    dot.classList.toggle('inactive', !active);
  }
  if (statusText && text) {
    statusText.textContent = text;
  }
}

// ── Miss Minutes Clock ────────────────────────────────────────────────

/**
 * Sets the clock hands to the current time.
 * Called on startup and every minute.
 */
function updateClock() {
  const now = new Date();
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();

  const hourDeg = (hours * 30) + (minutes * 0.5); // 30 deg/hr + partial
  const minDeg = minutes * 6;                       // 6 deg/min

  const hourHand = document.getElementById('clockHourHand');
  const minHand = document.getElementById('clockMinuteHand');
  if (hourHand) hourHand.style.transform = `rotate(${hourDeg}deg)`;
  if (minHand) minHand.style.transform = `rotate(${minDeg}deg)`;
}

// ── Real-Time Event Listeners (Main → Renderer) ───────────────────────

/**
 * Registers IPC push event callbacks so the UI updates in real time
 * whenever the background watcher processes a file.
 */
function registerPushEvents() {
  // File processed by watcher (auto-rule triggered)
  window.tvaAPI.onFileProcessed((data) => {
    console.log('[App] File processed:', data);
    showToast(
      `⚡ ${data.actionType}: "${data.fileName}" → matched rule "${data.ruleName}"`,
      'success',
      5000
    );
    // Show a timeline pulse animation on the doorways tab sweep result
    const sweepResult = document.getElementById('sweepResult');
    if (sweepResult) {
      const bar = document.createElement('div');
      bar.className = 'timeline-pulse-bar';
      sweepResult.appendChild(bar);
      setTimeout(() => bar.remove(), 1600);
    }
    // Refresh ledger if it's the active tab
    if (document.getElementById('tab-ledger') && !document.getElementById('tab-ledger').hidden) {
      if (typeof loadLedger === 'function') loadLedger();
    }
  });

  // Dormammu loop detected
  window.tvaAPI.onLoopDetected((data) => {
    console.warn('[App] Dormammu loop caught:', data);
    showToast(`⚠ DORMAMMU LOOP HALTED: ${data.message || 'File trapped in recursion.'}`, 'error', 5000);
  });

  // Ledger updated (sweep or rewind)
  window.tvaAPI.onLedgerUpdated(() => {
    // If ledger tab is visible, refresh it
    const ledgerPanel = document.getElementById('tab-ledger');
    if (ledgerPanel && !ledgerPanel.hidden) {
      if (typeof loadLedger === 'function') loadLedger();
    }
  });
}

// ── Application Startup ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[App] TVA Holo-Terminal initializing...');

  // Set up tab click handlers
  document.querySelectorAll('.tva-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activateTab(tab.dataset.tab);
    });
  });

  // Initialize clock
  updateClock();
  setInterval(updateClock, 60000); // Update every minute

  // Register real-time event listeners
  registerPushEvents();

  // Initialize all feature UI modules
  if (typeof initDoorwaysUI === 'function') await initDoorwaysUI();
  if (typeof initRulesUI === 'function') await initRulesUI();
  if (typeof initPreviewUI === 'function') initPreviewUI();
  if (typeof initLedgerUI === 'function') await initLedgerUI();

  // Show doorways tab by default
  activateTab('doorways');

  console.log('[App] ● TVA Holo-Terminal online. Sacred Timeline secure.');
});

// ── Global Exports (accessible to other UI modules) ──────────────────
window.showToast = showToast;
window.showDormammuAlert = showDormammuAlert;
window.setStatusActive = setStatusActive;
