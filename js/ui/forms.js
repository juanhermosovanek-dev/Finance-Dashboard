// ui/forms.js
// Simple modal dialogs for data entry. No form libraries, just direct DOM
// construction, kept intentionally small since the app only has a few forms.

import { getAllAccounts, createAccount, ACCOUNT_TYPES } from '../models/accounts.js';
import { getAllCategories } from '../models/categories.js';
import { addTransaction } from '../models/transactions.js';
import { createRecurringRule, RECURRENCE } from '../models/recurring.js';
import { todayStr } from '../util.js';

function openModal(innerHtml) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal">${innerHtml}</div>`;
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.body.appendChild(backdrop);
  return backdrop;
}

function closeModal() {
  document.querySelector('.modal-backdrop')?.remove();
}

async function openAddTransactionForm(onDone) {
  const accounts = await getAllAccounts();
  const categories = await getAllCategories();

  const accountOptions = accounts.map((a) => `<option value="${a.id}">${a.name}</option>`).join('');
  const categoryOptions = categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');

  const modal = openModal(`
    <h2>Add Transaction</h2>
    <div class="form-row">
      <label for="tx-type">Type</label>
      <select id="tx-type">
        <option value="expense">Expense</option>
        <option value="income">Income</option>
        <option value="transfer">Transfer</option>
      </select>
    </div>
    <div class="form-row">
      <label for="tx-date">Date</label>
      <input id="tx-date" type="date" value="${todayStr()}" />
    </div>
    <div class="form-row">
      <label for="tx-amount">Amount</label>
      <input id="tx-amount" type="number" min="0.01" step="0.01" placeholder="0.00" />
    </div>
    <div id="tx-fields-single" class="form-row">
      <label for="tx-account">Account</label>
      <select id="tx-account">${accountOptions}</select>
    </div>
    <div id="tx-fields-category" class="form-row">
      <label for="tx-category">Category</label>
      <select id="tx-category">${categoryOptions}</select>
    </div>
    <div id="tx-fields-transfer" class="form-row" style="display:none">
      <label for="tx-from">From Account</label>
      <select id="tx-from">${accountOptions}</select>
      <label for="tx-to" style="margin-top:8px">To Account</label>
      <select id="tx-to">${accountOptions}</select>
    </div>
    <div class="form-row">
      <label for="tx-note">Note (optional)</label>
      <input id="tx-note" type="text" placeholder="e.g. Groceries at Publix" />
    </div>
    <div class="form-actions">
      <button class="text-only" id="tx-cancel">Cancel</button>
      <button class="primary" id="tx-save">Save Transaction</button>
    </div>
  `);

  const typeSelect = modal.querySelector('#tx-type');
  const singleFields = modal.querySelector('#tx-fields-single');
  const categoryFields = modal.querySelector('#tx-fields-category');
  const transferFields = modal.querySelector('#tx-fields-transfer');

  typeSelect.addEventListener('change', () => {
    const isTransfer = typeSelect.value === 'transfer';
    singleFields.style.display = isTransfer ? 'none' : 'flex';
    transferFields.style.display = isTransfer ? 'flex' : 'none';
    categoryFields.style.display = typeSelect.value === 'expense' ? 'flex' : 'none';
  });
  typeSelect.dispatchEvent(new Event('change'));

  modal.querySelector('#tx-cancel').addEventListener('click', closeModal);

  modal.querySelector('#tx-save').addEventListener('click', async () => {
    const type = typeSelect.value;
    const amount = parseFloat(modal.querySelector('#tx-amount').value);
    const date = modal.querySelector('#tx-date').value;
    const note = modal.querySelector('#tx-note').value;

    if (!amount || amount <= 0) {
      alert('Enter an amount greater than zero.');
      return;
    }

    try {
      if (type === 'transfer') {
        const fromAccountId = modal.querySelector('#tx-from').value;
        const toAccountId = modal.querySelector('#tx-to').value;
        if (fromAccountId === toAccountId) {
          alert('Pick two different accounts for a transfer.');
          return;
        }
        await addTransaction({ type, amount, date, fromAccountId, toAccountId, note });
      } else {
        const accountId = modal.querySelector('#tx-account').value;
        const categoryId = type === 'expense' ? modal.querySelector('#tx-category').value : null;
        await addTransaction({ type, amount, date, accountId, categoryId, note });
      }
      closeModal();
      onDone?.();
    } catch (err) {
      alert(err.message);
    }
  });
}

async function openAddAccountForm(onDone) {
  const modal = openModal(`
    <h2>Add Account</h2>
    <div class="form-row">
      <label for="acct-name">Name</label>
      <input id="acct-name" type="text" placeholder="e.g. Chase Checking" />
    </div>
    <div class="form-row">
      <label for="acct-type">Type</label>
      <select id="acct-type">
        <option value="${ACCOUNT_TYPES.CHECKING}">Checking</option>
        <option value="${ACCOUNT_TYPES.SAVINGS}">Savings</option>
        <option value="${ACCOUNT_TYPES.CARD}">Credit Card</option>
        <option value="${ACCOUNT_TYPES.INVESTMENT}">Investment</option>
        <option value="${ACCOUNT_TYPES.LIABILITY}">Debt / Liability</option>
      </select>
    </div>
    <div class="form-row">
      <label for="acct-balance">Starting Balance</label>
      <input id="acct-balance" type="number" step="0.01" value="0" />
    </div>
    <div class="form-actions">
      <button class="text-only" id="acct-cancel">Cancel</button>
      <button class="primary" id="acct-save">Save Account</button>
    </div>
  `);

  modal.querySelector('#acct-cancel').addEventListener('click', closeModal);
  modal.querySelector('#acct-save').addEventListener('click', async () => {
    const name = modal.querySelector('#acct-name').value.trim();
    const type = modal.querySelector('#acct-type').value;
    const startingBalance = parseFloat(modal.querySelector('#acct-balance').value) || 0;

    if (!name) {
      alert('Give the account a name.');
      return;
    }

    await createAccount({ name, type, startingBalance });
    closeModal();
    onDone?.();
  });
}

/**
 * Form for setting up a recurring rule: paycheck (income), savings/investing
 * transfer, or the fixed debt-payment schedule. This is how Phase 5's
 * automation gets configured, rather than being hardcoded into the app.
 */
async function openAddRecurringForm(onDone) {
  const accounts = await getAllAccounts();
  const categories = await getAllCategories();
  const accountOptions = accounts.map((a) => `<option value="${a.id}">${a.name}</option>`).join('');
  const savingsCategory = categories.find((c) => c.name === 'Savings');
  const investingCategory = categories.find((c) => c.name === 'Investing');

  const modal = openModal(`
    <h2>Add Recurring Rule</h2>
    <div class="form-row">
      <label for="rec-kind">What is this?</label>
      <select id="rec-kind">
        <option value="income">Paycheck (income)</option>
        <option value="transfer-savings">Automatic transfer to Savings (emergency fund)</option>
        <option value="transfer-investing">Automatic transfer to Investing</option>
        <option value="expense-debt">Fixed debt payment (repeats a set number of times)</option>
      </select>
    </div>
    <div class="form-row">
      <label for="rec-name">Name</label>
      <input id="rec-name" type="text" placeholder="e.g. Biweekly Paycheck" />
    </div>
    <div class="form-row">
      <label for="rec-recurrence">Frequency</label>
      <select id="rec-recurrence">
        <option value="${RECURRENCE.MONTHLY}">Monthly</option>
        <option value="${RECURRENCE.BIWEEKLY}">Every 2 weeks</option>
      </select>
    </div>
    <div class="form-row">
      <label for="rec-amount">Usual Amount</label>
      <input id="rec-amount" type="number" step="0.01" min="0.01" />
    </div>
    <div id="rec-account-row" class="form-row">
      <label for="rec-account">Account</label>
      <select id="rec-account">${accountOptions}</select>
    </div>
    <div id="rec-from-row" class="form-row" style="display:none">
      <label for="rec-from">From Account</label>
      <select id="rec-from">${accountOptions}</select>
    </div>
    <div id="rec-to-row" class="form-row" style="display:none">
      <label for="rec-to">To Account</label>
      <select id="rec-to">${accountOptions}</select>
    </div>
    <div id="rec-occurrences-row" class="form-row" style="display:none">
      <label for="rec-occurrences">Number of payments remaining</label>
      <input id="rec-occurrences" type="number" min="1" value="4" />
    </div>
    <div class="form-row">
      <label for="rec-next-date">Next Due Date</label>
      <input id="rec-next-date" type="date" value="${todayStr()}" />
    </div>
    <div class="form-actions">
      <button class="text-only" id="rec-cancel">Cancel</button>
      <button class="primary" id="rec-save">Save Rule</button>
    </div>
  `);

  const kindSelect = modal.querySelector('#rec-kind');
  const accountRow = modal.querySelector('#rec-account-row');
  const fromRow = modal.querySelector('#rec-from-row');
  const toRow = modal.querySelector('#rec-to-row');
  const occurrencesRow = modal.querySelector('#rec-occurrences-row');

  function updateFieldVisibility() {
    const kind = kindSelect.value;
    const isTransfer = kind.startsWith('transfer');
    accountRow.style.display = isTransfer ? 'none' : 'flex';
    fromRow.style.display = isTransfer ? 'flex' : 'none';
    toRow.style.display = isTransfer ? 'flex' : 'none';
    occurrencesRow.style.display = kind === 'expense-debt' ? 'flex' : 'none';
  }
  kindSelect.addEventListener('change', updateFieldVisibility);
  updateFieldVisibility();

  modal.querySelector('#rec-cancel').addEventListener('click', closeModal);
  modal.querySelector('#rec-save').addEventListener('click', async () => {
    const kind = kindSelect.value;
    const name = modal.querySelector('#rec-name').value.trim();
    const recurrence = modal.querySelector('#rec-recurrence').value;
    const amount = parseFloat(modal.querySelector('#rec-amount').value);
    const nextDueDate = modal.querySelector('#rec-next-date').value;

    if (!name || !amount || amount <= 0 || !nextDueDate) {
      alert('Fill in a name, amount, and due date.');
      return;
    }

    try {
      if (kind === 'income') {
        const accountId = modal.querySelector('#rec-account').value;
        await createRecurringRule({ name, kind: 'income', recurrence, amount, accountId, nextDueDate });
      } else if (kind === 'transfer-savings' || kind === 'transfer-investing') {
        const fromAccountId = modal.querySelector('#rec-from').value;
        const toAccountId = modal.querySelector('#rec-to').value;
        const categoryId = kind === 'transfer-savings' ? savingsCategory?.id : investingCategory?.id;
        await createRecurringRule({
          name,
          kind: 'transfer',
          recurrence,
          amount,
          fromAccountId,
          toAccountId,
          categoryId,
          nextDueDate
        });
      } else if (kind === 'expense-debt') {
        const accountId = modal.querySelector('#rec-account').value;
        const occurrencesRemaining = parseInt(modal.querySelector('#rec-occurrences').value, 10) || 1;
        await createRecurringRule({
          name,
          kind: 'expense',
          recurrence,
          amount,
          accountId,
          nextDueDate,
          occurrencesRemaining
        });
      }
      closeModal();
      onDone?.();
    } catch (err) {
      alert(err.message);
    }
  });
}

export { openAddTransactionForm, openAddAccountForm, openAddRecurringForm, openModal, closeModal };
