// ui/alerts.js
// Renders the "due now" and "coming up" recurring-rule banners at the top
// of the dashboard, and the confirm dialog for posting one.

import { checkDueRecurringRules, confirmRecurringRule, skipRecurringRuleThisCycle } from '../models/recurring.js';
import { formatMoney } from '../util.js';
import { openModal, closeModal } from './forms.js';

async function renderAlerts(root, onChanged) {
  const { due, upcoming } = await checkDueRecurringRules();

  if (due.length === 0 && upcoming.length === 0) {
    root.innerHTML = '';
    return;
  }

  const dueCards = due
    .map(
      (rule) => `
      <div class="alert-card" data-rule-id="${rule.id}">
        <div class="alert-text">
          <p class="alert-title">${rule.name} is due</p>
          <p class="alert-detail">Last amount: ${formatMoney(rule.amount)}</p>
        </div>
        <div class="alert-actions">
          <button class="text-only skip-btn">Skip</button>
          <button class="primary confirm-btn">Confirm</button>
        </div>
      </div>`
    )
    .join('');

  const upcomingCards = upcoming
    .map(
      (rule) => `
      <div class="alert-card watch">
        <div class="alert-text">
          <p class="alert-title">${rule.name} due in ${rule.daysUntil} day${rule.daysUntil === 1 ? '' : 's'}</p>
          <p class="alert-detail">${formatMoney(rule.amount)} expected</p>
        </div>
      </div>`
    )
    .join('');

  root.innerHTML = dueCards + upcomingCards;

  root.querySelectorAll('.alert-card[data-rule-id]').forEach((card) => {
    const ruleId = card.dataset.ruleId;
    const rule = due.find((r) => r.id === ruleId);

    card.querySelector('.confirm-btn')?.addEventListener('click', () => {
      openConfirmDialog(rule, async (confirmedAmount) => {
        await confirmRecurringRule(ruleId, confirmedAmount);
        onChanged?.();
      });
    });

    card.querySelector('.skip-btn')?.addEventListener('click', async () => {
      await skipRecurringRuleThisCycle(ruleId);
      onChanged?.();
    });
  });
}

function openConfirmDialog(rule, onConfirm) {
  const modal = openModal(`
    <h2>Confirm: ${rule.name}</h2>
    <div class="form-row">
      <label for="confirm-amount">Amount</label>
      <input id="confirm-amount" type="number" step="0.01" value="${rule.amount}" />
    </div>
    <div class="form-actions">
      <button class="text-only" id="confirm-cancel">Cancel</button>
      <button class="primary" id="confirm-save">Post Transaction</button>
    </div>
  `);

  modal.querySelector('#confirm-cancel').addEventListener('click', closeModal);
  modal.querySelector('#confirm-save').addEventListener('click', async () => {
    const amount = parseFloat(modal.querySelector('#confirm-amount').value);
    if (!amount || amount <= 0) {
      alert('Enter an amount greater than zero.');
      return;
    }
    closeModal();
    await onConfirm(amount);
  });
}

export { renderAlerts };
