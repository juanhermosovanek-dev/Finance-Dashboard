// ui/goalsModal.js
// Forms for creating and managing savings/investing goals. A goal is always
// linked to one account, its progress is just that account's balance
// against the target, kept simple on purpose.

import { getAllAccounts } from '../models/accounts.js';
import { createGoal, updateGoal, deleteGoal } from '../models/goals.js';
import { formatMoney, todayStr } from '../util.js';
import { openModal, closeModal } from './forms.js';

async function openGoalForm({ existing = null, onDone } = {}) {
  const accounts = await getAllAccounts();
  const isEdit = !!existing;
  const accountOptions = accounts
    .map((a) => `<option value="${a.id}" ${a.id === existing?.accountId ? 'selected' : ''}>${a.name}</option>`)
    .join('');

  const modal = openModal(`
    <h2>${isEdit ? 'Edit Goal' : 'Add Goal'}</h2>
    <div class="form-row">
      <label for="goal-name">Goal Name</label>
      <input id="goal-name" type="text" placeholder="e.g. Vacation Fund" value="${existing?.name || ''}" />
    </div>
    <div class="form-row">
      <label for="goal-account">Linked Account</label>
      <select id="goal-account">${accountOptions}</select>
      <p style="font-size:12px;color:var(--color-ink-soft);margin:2px 0 0;">Progress is tracked from this account's balance.</p>
    </div>
    <div class="form-row">
      <label for="goal-target">Target Amount</label>
      <input id="goal-target" type="number" step="0.01" min="0.01" value="${existing?.targetAmount ?? ''}" />
    </div>
    <div class="form-row">
      <label for="goal-date">Target Date (optional)</label>
      <input id="goal-date" type="date" value="${existing?.targetDate || ''}" />
    </div>
    <div class="form-actions">
      <button class="text-only" id="goal-cancel">Cancel</button>
      <button class="primary" id="goal-save">${isEdit ? 'Save Changes' : 'Create Goal'}</button>
    </div>
  `);

  modal.querySelector('#goal-cancel').addEventListener('click', closeModal);
  modal.querySelector('#goal-save').addEventListener('click', async () => {
    const name = modal.querySelector('#goal-name').value.trim();
    const accountId = modal.querySelector('#goal-account').value;
    const targetAmount = parseFloat(modal.querySelector('#goal-target').value);
    const targetDate = modal.querySelector('#goal-date').value || null;

    if (!name || !accountId || !targetAmount || targetAmount <= 0) {
      alert('Fill in a name, account, and a target amount greater than zero.');
      return;
    }

    try {
      if (isEdit) {
        await updateGoal(existing.id, { name, accountId, targetAmount, targetDate });
      } else {
        await createGoal({ name, accountId, targetAmount, targetDate });
      }
      closeModal();
      onDone?.();
    } catch (err) {
      alert(err.message);
    }
  });
}

function openAddGoalForm(onDone) {
  return openGoalForm({ onDone });
}

function openEditGoalForm(goal, onDone) {
  return openGoalForm({ existing: goal, onDone });
}

async function confirmAndDeleteGoal(goal, onDone) {
  if (!confirm(`Delete the goal "${goal.name}"? This only removes the goal, not the linked account or its money.`)) return;
  await deleteGoal(goal.id);
  onDone?.();
}

export { openAddGoalForm, openEditGoalForm, confirmAndDeleteGoal };
