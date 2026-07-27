// ui/recurringRulesModal.js
// A list view of every recurring rule (paycheck, transfers, debt payments),
// so they can be edited or removed after the fact, not just at creation time.

import { getAllRecurringRules } from '../models/recurring.js';
import { formatMoney } from '../util.js';
import { openModal, closeModal, openEditRecurringForm, confirmAndDeleteRecurringRule } from './forms.js';

async function openRecurringRulesModal(onChanged) {
  const rules = await getAllRecurringRules();

  const rows = rules.length
    ? rules
        .map(
          (rule) => `
        <tr data-rule-id="${rule.id}">
          <td>${rule.name}${rule.active ? '' : ' <span class="tag">Finished</span>'}</td>
          <td>${frequencyLabel(rule.recurrence)}</td>
          <td class="amount">${formatMoney(rule.amount)}</td>
          <td>${rule.nextDueDate}</td>
          <td class="row-actions">
            <button class="icon-btn edit-btn">Edit</button>
            <button class="icon-btn delete delete-btn">Delete</button>
          </td>
        </tr>`
        )
        .join('')
    : '';

  const modal = openModal(`
    <h2>Recurring Rules</h2>
    ${
      rules.length === 0
        ? `<p class="empty-state">No recurring rules yet. Close this and use "Add Recurring Rule" to set one up.</p>`
        : `<table class="ledger"><thead><tr><th>Name</th><th>Frequency</th><th>Amount</th><th>Next Due</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
    }
    <div class="form-actions">
      <button class="text-only" id="rules-close">Close</button>
    </div>
  `);

  modal.querySelector('#rules-close').addEventListener('click', closeModal);

  modal.querySelectorAll('tr[data-rule-id]').forEach((row) => {
    const ruleId = row.dataset.ruleId;
    const rule = rules.find((r) => r.id === ruleId);
    row.querySelector('.edit-btn')?.addEventListener('click', () => {
      closeModal();
      openEditRecurringForm(rule, onChanged);
    });
    row.querySelector('.delete-btn')?.addEventListener('click', async () => {
      await confirmAndDeleteRecurringRule(rule, () => {
        closeModal();
        onChanged?.();
        openRecurringRulesModal(onChanged);
      });
    });
  });
}

function frequencyLabel(recurrence) {
  return recurrence === 'monthly' ? 'Monthly' : 'Every 2 weeks';
}

export { openRecurringRulesModal };
