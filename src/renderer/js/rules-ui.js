/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          SANCTUM KEEPER — TVA EDITION                           ║
 * ║          rules-ui.js — Visual Enchantment Builder (B2 + B3)     ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  FEATURES: B2 — Visual Rule Builder, B3 — First Spell Wins      ║
 * ║                                                                  ║
 * ║  HANDLES:                                                        ║
 * ║  • Listing all rules with priority numbers (#1 = highest)       ║
 * ║  • Add/Edit rules via modal form (no coding required)           ║
 * ║  • Move Up / Move Down buttons to change priority order         ║
 * ║  • Delete rules with confirmation                               ║
 * ║  • Persist rules via tvaAPI.saveRules()                         ║
 * ║                                                                  ║
 * ║  RULE SCHEMA:                                                    ║
 * ║  { id, name, logic, conditions: [], action: { type, ... } }     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// Module-level rules array (kept in sync with disk via saveRules)
let rules = [];

// Index of rule currently being edited (-1 = new rule)
let editingRuleIndex = -1;

/**
 * Initializes the rules UI — loads rules, renders list, attaches modal handlers.
 */
async function initRulesUI() {
  rules = await window.tvaAPI.getRules();
  renderRulesList();
  initRuleModal();
  document.getElementById('btnAddRule')?.addEventListener('click', openNewRuleModal);
}

// ── Rules List Rendering ──────────────────────────────────────────────

/**
 * Re-renders the complete rules list from the current `rules` array.
 * Each rule card shows: priority number, name, conditions summary, action badge, controls.
 */
function renderRulesList() {
  const container = document.getElementById('rulesList');
  const emptyState = document.getElementById('rulesEmptyState');

  // Clear only rule cards (leave empty state element)
  container.querySelectorAll('.rule-card').forEach(c => c.remove());

  if (rules.length === 0) {
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (emptyState) emptyState.hidden = true;

  rules.forEach((rule, index) => {
    const card = createRuleCard(rule, index);
    container.appendChild(card);
  });
}

/**
 * Creates a rule card DOM element for the given rule.
 * @param {Object} rule  - Rule object
 * @param {number} index - Zero-based priority index
 * @returns {HTMLElement}
 */
function createRuleCard(rule, index) {
  const card = document.createElement('div');
  card.className = 'rule-card';
  card.dataset.priority = index + 1; // CSS pseudo-element reads this
  card.dataset.ruleId = rule.id;

  // Build conditions summary text
  const condSummary = (rule.conditions || [])
    .map(c => `<span class="condition-chip">${c.field} ${c.operator} "${c.value}"</span>`)
    .join(' ');

  // Determine logic label
  const logicLabels = { ALL: 'ALL (AND)', ANY: 'ANY (OR)', NONE: 'NONE (NOT)' };
  const logicLabel = logicLabels[rule.logic] || 'ALL';

  // Build action badge
  const actionBadgeClass = `badge-${rule.action?.type || 'move'}`;
  const actionLabels = { move: '⇒ BRANCH', copy: '⊕ REPLICATE', rename: '✎ TRANSMUTE', trash: '🗑 PRUNE' };
  const actionLabel = actionLabels[rule.action?.type] || rule.action?.type?.toUpperCase();
  const actionDest = rule.action?.destination
    ? `<span class="muted-text"> → ${rule.action.destination}</span>`
    : rule.action?.pattern
    ? `<span class="muted-text"> → pattern: "${rule.action.pattern}"</span>`
    : '';

  card.innerHTML = `
    <div class="rule-card-body">
      <div class="rule-card-header">
        <div class="rule-name">${escapeHtml(rule.name || 'Unnamed Enchantment')}</div>
        <div class="rule-actions">
          <!-- Move priority buttons -->
          <button class="btn btn-ghost btn-sm btn-move-up" title="Increase Priority (Move Up)" ${index === 0 ? 'disabled' : ''}>▲</button>
          <button class="btn btn-ghost btn-sm btn-move-down" title="Decrease Priority (Move Down)" ${index === rules.length - 1 ? 'disabled' : ''}>▼</button>
          <!-- Edit / Delete -->
          <button class="btn btn-secondary btn-sm btn-edit-rule">EDIT</button>
          <button class="btn btn-danger btn-sm btn-delete-rule">✕</button>
        </div>
      </div>

      <!-- Conditions summary -->
      <div class="rule-conditions-summary">
        <span class="gold-text">[${logicLabel}]</span> ${condSummary || '<span class="muted-text">No conditions defined</span>'}
      </div>

      <!-- Action badge -->
      <div>
        <span class="rule-action-badge ${actionBadgeClass}">${actionLabel}</span>
        ${actionDest}
      </div>
    </div>
  `;

  // ── Event Listeners for this card ──────────────────────────────────

  // Move Up (decreases priority number = moves earlier in list)
  card.querySelector('.btn-move-up').addEventListener('click', async () => {
    if (index > 0) {
      [rules[index - 1], rules[index]] = [rules[index], rules[index - 1]];
      await persistRules();
      renderRulesList();
    }
  });

  // Move Down
  card.querySelector('.btn-move-down').addEventListener('click', async () => {
    if (index < rules.length - 1) {
      [rules[index], rules[index + 1]] = [rules[index + 1], rules[index]];
      await persistRules();
      renderRulesList();
    }
  });

  // Edit rule — open modal pre-populated with this rule's data
  card.querySelector('.btn-edit-rule').addEventListener('click', () => {
    openEditRuleModal(index);
  });

  // Delete rule with a simple confirm
  card.querySelector('.btn-delete-rule').addEventListener('click', async () => {
    if (confirm(`Delete enchantment "${rule.name}"? This cannot be undone.`)) {
      rules.splice(index, 1);
      await persistRules();
      renderRulesList();
      showToast(`Enchantment "${rule.name}" deleted.`, 'info');
    }
  });

  return card;
}

// ── Rule Modal ─────────────────────────────────────────────────────────

/**
 * Attaches all event handlers to the rule editor modal.
 * The modal is reused for both "Add" and "Edit" operations.
 */
function initRuleModal() {
  // Close modal on × button
  document.getElementById('btnCloseRuleModal')?.addEventListener('click', closeRuleModal);
  document.getElementById('btnCancelRule')?.addEventListener('click', closeRuleModal);

  // Close modal when clicking the overlay backdrop
  document.getElementById('ruleModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('ruleModal')) closeRuleModal();
  });

  // Add a new condition row
  document.getElementById('btnAddCondition')?.addEventListener('click', () => {
    addConditionRow();
  });

  // Toggle action destination / pattern field based on action type
  document.getElementById('actionType')?.addEventListener('change', updateActionFields);

  // Browse button for destination folder
  document.getElementById('btnPickDest')?.addEventListener('click', async () => {
    try {
      const selectedPath = await window.tvaAPI.selectDestFolder();
      if (selectedPath) {
        document.getElementById('actionDestination').value = selectedPath;
      }
    } catch (err) {
      console.warn('Native picker failed or unavailable, fallback to prompt:', err);
      const path = prompt('Enter the destination folder path:');
      if (path) {
        document.getElementById('actionDestination').value = path;
      }
    }
  });

  // Save / Engrave rule
  document.getElementById('btnSaveRule')?.addEventListener('click', saveRuleFromModal);
}

/**
 * Opens the modal for adding a brand new rule.
 */
function openNewRuleModal() {
  editingRuleIndex = -1;
  document.getElementById('ruleModalTitle').textContent = 'INSCRIBE NEW ENCHANTMENT';
  resetModal();
  addConditionRow(); // Start with one blank condition
  document.getElementById('ruleModal').hidden = false;
}

/**
 * Opens the modal pre-populated with an existing rule's data.
 * @param {number} index - Index of the rule in the rules array
 */
function openEditRuleModal(index) {
  editingRuleIndex = index;
  const rule = rules[index];

  document.getElementById('ruleModalTitle').textContent = 'EDIT ENCHANTMENT';
  resetModal();

  // Fill in existing data
  document.getElementById('ruleName').value = rule.name || '';
  document.getElementById('ruleLogic').value = rule.logic || 'ALL';
  document.getElementById('actionType').value = rule.action?.type || 'move';

  // Fill action destination/pattern
  if (rule.action?.destination) {
    document.getElementById('actionDestination').value = rule.action.destination;
  }
  if (rule.action?.pattern) {
    document.getElementById('actionPattern').value = rule.action.pattern;
  }

  // Populate conditions
  (rule.conditions || []).forEach(cond => addConditionRow(cond));

  updateActionFields();
  document.getElementById('ruleModal').hidden = false;
}

/**
 * Closes and resets the rule editor modal.
 */
function closeRuleModal() {
  document.getElementById('ruleModal').hidden = true;
  resetModal();
}

/**
 * Resets all form fields in the modal to blank/default state.
 */
function resetModal() {
  document.getElementById('ruleName').value = '';
  document.getElementById('ruleLogic').value = 'ALL';
  document.getElementById('actionType').value = 'move';
  document.getElementById('actionDestination').value = '';
  document.getElementById('actionPattern').value = '';
  document.getElementById('conditionsList').innerHTML = '';
  updateActionFields();
}

/**
 * Shows/hides the destination or pattern input based on selected action type.
 */
function updateActionFields() {
  const actionType = document.getElementById('actionType')?.value;
  const destGroup = document.getElementById('actionDestGroup');
  const patternGroup = document.getElementById('actionPatternGroup');

  if (!destGroup || !patternGroup) return;

  if (actionType === 'rename') {
    destGroup.style.display = 'none';
    patternGroup.style.display = 'block';
  } else if (actionType === 'trash') {
    destGroup.style.display = 'none';
    patternGroup.style.display = 'none';
  } else {
    // move or copy
    destGroup.style.display = 'block';
    patternGroup.style.display = 'none';
  }
}

// ── Conditions Builder ────────────────────────────────────────────────

/**
 * Adds a condition row to the modal's condition list.
 * @param {Object} [cond] - Optional pre-populated condition { field, operator, value }
 */
function addConditionRow(cond = {}) {
  const container = document.getElementById('conditionsList');

  const row = document.createElement('div');
  row.className = 'condition-row';

  row.innerHTML = `
    <!-- Field selector: what attribute of the file to check -->
    <select class="form-select cond-field">
      <option value="name"      ${cond.field === 'name'      ? 'selected' : ''}>File Name</option>
      <option value="extension" ${cond.field === 'extension' ? 'selected' : ''}>Extension</option>
      <option value="size"      ${cond.field === 'size'      ? 'selected' : ''}>File Size (bytes)</option>
      <option value="age_days"  ${cond.field === 'age_days'  ? 'selected' : ''}>Age (days)</option>
    </select>

    <!-- Operator selector: how to compare -->
    <select class="form-select cond-operator">
      <option value="contains"    ${cond.operator === 'contains'    ? 'selected' : ''}>contains</option>
      <option value="starts_with" ${cond.operator === 'starts_with' ? 'selected' : ''}>starts with</option>
      <option value="ends_with"   ${cond.operator === 'ends_with'   ? 'selected' : ''}>ends with</option>
      <option value="equals"      ${cond.operator === 'equals'      ? 'selected' : ''}>equals</option>
      <option value="greater_than"${cond.operator === 'greater_than'? 'selected' : ''}>greater than</option>
      <option value="less_than"   ${cond.operator === 'less_than'   ? 'selected' : ''}>less than</option>
      <option value="regex"       ${cond.operator === 'regex'       ? 'selected' : ''}>regex</option>
    </select>

    <!-- Value input: what to compare against -->
    <input type="text" class="form-input cond-value" placeholder="value..." value="${escapeHtml(String(cond.value || ''))}" />

    <!-- Remove this condition row -->
    <button class="btn btn-danger btn-icon btn-sm btn-remove-cond" title="Remove condition">✕</button>
  `;

  // Remove condition row on click
  row.querySelector('.btn-remove-cond').addEventListener('click', () => {
    row.remove();
  });

  container.appendChild(row);
}

// ── Save Rule from Modal ──────────────────────────────────────────────

/**
 * Reads form data from the modal and saves the rule.
 * Validates that: name is non-empty, at least one condition exists,
 * and action destination is provided (for move/copy).
 */
async function saveRuleFromModal() {
  const name = document.getElementById('ruleName').value.trim();
  if (!name) {
    showToast('⚠ Enchantment must have a name!', 'error');
    document.getElementById('ruleName').focus();
    return;
  }

  const logic = document.getElementById('ruleLogic').value;
  const actionType = document.getElementById('actionType').value;

  // Collect all conditions
  const conditions = [];
  document.querySelectorAll('#conditionsList .condition-row').forEach(row => {
    const field    = row.querySelector('.cond-field').value;
    const operator = row.querySelector('.cond-operator').value;
    const value    = row.querySelector('.cond-value').value.trim();
    if (value !== '') {
      conditions.push({ field, operator, value });
    }
  });

  if (conditions.length === 0) {
    showToast('⚠ At least one condition is required!', 'error');
    return;
  }

  // Build action object
  const action = { type: actionType };
  if (actionType === 'move' || actionType === 'copy') {
    const dest = document.getElementById('actionDestination').value.trim();
    if (!dest) {
      showToast('⚠ A destination folder is required for Move/Copy!', 'error');
      return;
    }
    action.destination = dest;
  } else if (actionType === 'rename') {
    const pattern = document.getElementById('actionPattern').value.trim();
    if (!pattern) {
      showToast('⚠ A rename pattern is required!', 'error');
      return;
    }
    action.pattern = pattern;
  }

  // Assemble the rule object
  const rule = {
    id: editingRuleIndex >= 0 ? rules[editingRuleIndex].id : generateId(),
    name,
    logic,
    conditions,
    action
  };

  if (editingRuleIndex >= 0) {
    // Update existing rule in-place
    rules[editingRuleIndex] = rule;
    showToast(`✦ Enchantment "${name}" updated.`, 'success');
  } else {
    // Add new rule at the end (lowest priority by default)
    rules.push(rule);
    showToast(`✦ Enchantment "${name}" inscribed.`, 'success');
  }

  await persistRules();
  renderRulesList();
  closeRuleModal();
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Persists the current `rules` array to disk via IPC.
 */
async function persistRules() {
  const result = await window.tvaAPI.saveRules(rules);
  if (!result.success) {
    showToast(`Failed to save rules: ${result.error}`, 'error');
  }
}

/**
 * Generates a simple unique ID for new rules.
 * @returns {string}
 */
function generateId() {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Escapes HTML special characters to prevent XSS in innerHTML.
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
