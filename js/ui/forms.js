// ui/forms.js
// Simple modal dialogs for data entry. No form libraries, just direct DOM
// construction, kept intentionally small since the app only has a few forms.

import { getAllAccounts, createAccount, updateAccount, deleteAccount, ACCOUNT_TYPES } from '../models/accounts.js';
import { getAllCategories } from '../models/categories.js';
import { addTransaction, updateTransaction, deleteTransaction, getTransactionsForAccount } from '../models/transactions.js';
import { createRecurringRule, updateRecurringRule, deleteRecurringRule, RECURRENCE } from '../models/recurring.js';
import { formatMoney, todayStr } from '../util.js';

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

/**
 * One form for both adding and editing a transaction.
 * Pass `existing` (a transaction object) to pre-fill and edit it, or leave
 * it null to add a new one. Before anything is saved, a plain-language
 * confirm() summary is shown so nothing posts by accident.
 */
async function openTransactionForm({ existing = null, onDone } = {}) {
  const accounts = await getAllAccounts();
  const categories = await getAllCategories();

  // Starting-balance entries are structurally different (no category, can be
  // negative to represent debt), so they get their own small edit form.
  if (existing && existing.type === 'starting_balance') {
    return openEditStartingBalanceForm(existing, accounts, onDone);
  }

  const accountOptions = (selectedId) =>
    accounts.map((a) => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.name}</option>`).join('');
  const categoryOptions = (selectedId) =>
    categories.map((c) => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}</option>`).join('');

  const isEdit = !!existing;
  const typeOptions = ['expense', 'income', 'transfer']
    .map((t) => `<option value="${t}" ${existing?.type === t ? 'selected' : ''}>${t[0].toUpperCase()}${t.slice(1)}</option>`)
    .join('');

  const modal = openModal(`
    <h2>${isEdit ? 'Edit Transaction' : 'Add Transaction'}</h2>
    <div class="form-row">
      <label for="tx-type">Type</label>
      <select id="tx-type" ${isEdit ? 'disabled' : ''}>${typeOptions}</select>
    </div>
    <div class="form-row">
      <label for="tx-date">Date</label>
      <input id="tx-date" type="date" value="${existing?.date || todayStr()}" />
    </div>
    <div class="form-row">
      <label for="tx-amount">Amount</label>
      <input id="tx-amount" type="number" min="0.01" step="0.01" placeholder="0.00" value="${existing?.amount ?? ''}" />
    </div>
    <div id="tx-fields-single" class="form-row">
      <label for="tx-account">Account</label>
      <select id="tx-account">${accountOptions(existing?.accountId)}</select>
    </div>
    <div id="tx-fields-category" class="form-row">
      <label for="tx-category">Category</label>
      <select id="tx-category">${categoryOptions(existing?.categoryId)}</select>
    </div>
    <div id="tx-fields-transfer" class="form-row" style="display:none">
      <label for="tx-from">From Account</label>
      <select id="tx-from">${accountOptions(existing?.fromAccountId)}</select>
      <label for="tx-to" style="margin-top:8px">To Account</label>
      <select id="tx-to">${accountOptions(existing?.toAccountId)}</select>
      <label for="tx-purpose" style="margin-top:8px">Purpose (for budget tracking)</label>
      <select id="tx-purpose">
        <option value="">Other / not budget-related</option>
        ${categories
          .filter((c) => c.bucket === 'savings')
          .map((c) => `<option value="${c.id}" ${c.id === existing?.categoryId ? 'selected' : ''}>${c.name}</option>`)
          .join('')}
      </select>
    </div>
    <div class="form-row">
      <label for="tx-note">Note (optional)</label>
      <input id="tx-note" type="text" placeholder="e.g. Groceries at Publix" value="${existing?.note || ''}" />
    </div>
    <div class="form-actions">
      <button class="text-only" id="tx-cancel">Cancel</button>
      <button class="primary" id="tx-save">${isEdit ? 'Save Changes' : 'Save Transaction'}</button>
    </div>
  `);

  const typeSelect = modal.querySelector('#tx-type');
  const singleFields = modal.querySelector('#tx-fields-single');
  const categoryFields = modal.querySelector('#tx-fields-category');
  const transferFields = modal.querySelector('#tx-fields-transfer');

  function updateVisibility() {
    const isTransfer = typeSelect.value === 'transfer';
    singleFields.style.display = isTransfer ? 'none' : 'flex';
    transferFields.style.display = isTransfer ? 'flex' : 'none';
    categoryFields.style.display = typeSelect.value === 'expense' ? 'flex' : 'none';
  }
  typeSelect.addEventListener('change', updateVisibility);
  updateVisibility();

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

    let payload;
    let summary;

    if (type === 'transfer') {
      const fromAccountId = modal.querySelector('#tx-from').value;
      const toAccountId = modal.querySelector('#tx-to').value;
      const categoryId = modal.querySelector('#tx-purpose').value || null;
      if (fromAccountId === toAccountId) {
        alert('Pick two different accounts for a transfer.');
        return;
      }
      const fromName = accounts.find((a) => a.id === fromAccountId)?.name;
      const toName = accounts.find((a) => a.id === toAccountId)?.name;
      const purposeName = categories.find((c) => c.id === categoryId)?.name;
      payload = { type, amount, date, fromAccountId, toAccountId, note, categoryId };
      summary = `Transfer ${formatMoney(amount)} from ${fromName} to ${toName}${purposeName ? ` (${purposeName})` : ''} on ${date}?`;
    } else {
      const accountId = modal.querySelector('#tx-account').value;
      const categoryId = type === 'expense' ? modal.querySelector('#tx-category').value : null;
      const accountName = accounts.find((a) => a.id === accountId)?.name;
      const categoryName = type === 'expense' ? categories.find((c) => c.id === categoryId)?.name : null;
      payload = { type, amount, date, accountId, categoryId, note };
      summary =
        type === 'expense'
          ? `Log ${formatMoney(amount)} expense (${categoryName}) from ${accountName} on ${date}?`
          : `Log ${formatMoney(amount)} income to ${accountName} on ${date}?`;
    }

    if (!confirm(summary)) return;

    try {
      if (isEdit) {
        await updateTransaction(existing.id, payload);
      } else {
        await addTransaction(payload);
      }
      closeModal();
      onDone?.();
    } catch (err) {
      alert(err.message);
    }
  });
}

/**
 * Small dedicated form for correcting an account's starting balance.
 * Unlike other transactions, this one is allowed to be negative, since a
 * negative starting balance is how debt (a credit card or loan balance you
 * already owe) gets represented.
 */
function openEditStartingBalanceForm(existing, accounts, onDone) {
  const account = accounts.find((a) => a.id === existing.accountId);
  const modal = openModal(`
    <h2>Edit Starting Balance</h2>
    <p style="font-size:13px;color:var(--color-ink-soft);margin-top:-8px;">
      For ${account?.name || 'this account'}. If this account is money you owe
      (a credit card balance or a loan), enter it as a negative number, e.g. -500.
    </p>
    <div class="form-row">
      <label for="sb-amount">Amount</label>
      <input id="sb-amount" type="number" step="0.01" value="${existing.amount}" />
    </div>
    <div class="form-actions">
      <button class="text-only" id="sb-cancel">Cancel</button>
      <button class="primary" id="sb-save">Save Changes</button>
    </div>
  `);

  modal.querySelector('#sb-cancel').addEventListener('click', closeModal);
  modal.querySelector('#sb-save').addEventListener('click', async () => {
    const amount = parseFloat(modal.querySelector('#sb-amount').value);
    if (!amount || amount === 0) {
      alert('Enter a non-zero amount.');
      return;
    }
    if (!confirm(`Set starting balance for ${account?.name || 'this account'} to ${formatMoney(amount)}?`)) return;
    try {
      await updateTransaction(existing.id, { amount });
      closeModal();
      onDone?.();
    } catch (err) {
      alert(err.message);
    }
  });
}

function openAddTransactionForm(onDone) {
  return openTransactionForm({ onDone });
}

function openEditTransactionForm(existing, onDone) {
  return openTransactionForm({ existing, onDone });
}

/** Confirms with the user, then deletes a transaction and calls onDone. */
async function confirmAndDeleteTransaction(tx, onDone) {
  const confirmed = confirm(`Delete this ${formatMoney(tx.amount)} ${tx.type} from ${tx.date}? This cannot be undone.`);
  if (!confirmed) return;
  await deleteTransaction(tx.id);
  onDone?.();
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
        <option value="${ACCOUNT_TYPES.LIABILITY}">Loan / Other Debt</option>
      </select>
    </div>
    <div class="form-row">
      <label id="acct-balance-label" for="acct-balance">Starting Balance</label>
      <input id="acct-balance" type="number" step="0.01" value="0" />
      <p id="acct-balance-help" style="font-size:12px;color:var(--color-ink-soft);margin:2px 0 0;"></p>
    </div>
    <div class="form-row">
      <label id="acct-rate-label" for="acct-rate">Interest / Growth Rate (annual %, optional)</label>
      <input id="acct-rate" type="number" step="0.01" placeholder="e.g. 4.5" />
      <p style="font-size:12px;color:var(--color-ink-soft);margin:2px 0 0;">Used only to show a rough growth estimate. Leave blank if unsure.</p>
    </div>
    <div class="form-actions">
      <button class="text-only" id="acct-cancel">Cancel</button>
      <button class="primary" id="acct-save">Save Account</button>
    </div>
  `);

  const typeSelect = modal.querySelector('#acct-type');
  const balanceLabel = modal.querySelector('#acct-balance-label');
  const balanceHelp = modal.querySelector('#acct-balance-help');
  const isDebtType = (type) => type === ACCOUNT_TYPES.CARD || type === ACCOUNT_TYPES.LIABILITY;

  function updateBalanceHelp() {
    if (isDebtType(typeSelect.value)) {
      balanceLabel.textContent = 'Amount Currently Owed';
      balanceHelp.textContent = 'Enter as a positive number, e.g. 500. The app will treat it as debt automatically.';
    } else {
      balanceLabel.textContent = 'Starting Balance';
      balanceHelp.textContent = '';
    }
  }
  typeSelect.addEventListener('change', updateBalanceHelp);
  updateBalanceHelp();

  modal.querySelector('#acct-cancel').addEventListener('click', closeModal);
  modal.querySelector('#acct-save').addEventListener('click', async () => {
    const name = modal.querySelector('#acct-name').value.trim();
    const type = typeSelect.value;
    const rawBalance = parseFloat(modal.querySelector('#acct-balance').value) || 0;
    const rawRate = modal.querySelector('#acct-rate').value;
    const interestRate = rawRate === '' ? null : parseFloat(rawRate);
    // For debt-type accounts, whatever the user typed is treated as an
    // amount owed, so it's always stored as negative regardless of the sign
    // they actually typed.
    const startingBalance = isDebtType(type) ? -Math.abs(rawBalance) : rawBalance;

    if (!name) {
      alert('Give the account a name.');
      return;
    }

    try {
      await createAccount({ name, type, startingBalance, interestRate });
      closeModal();
      onDone?.();
    } catch (err) {
      alert(err.message);
    }
  });
}

/**
 * Editing an account only covers name and interest rate. Type and balance
 * aren't editable here on purpose: type affects how the whole app interprets
 * the account's transaction signs, and balance is always a derived total
 * from transaction history, not something to hand-edit (the one exception,
 * the starting balance, has its own dedicated edit form).
 */
async function openEditAccountForm(account, onDone) {
  const modal = openModal(`
    <h2>Edit Account</h2>
    <div class="form-row">
      <label for="acct-edit-name">Name</label>
      <input id="acct-edit-name" type="text" value="${account.name}" />
    </div>
    <div class="form-row">
      <label>Type</label>
      <input type="text" value="${account.type}" disabled />
      <p style="font-size:12px;color:var(--color-ink-soft);margin:2px 0 0;">
        Account type can't be changed after creation. Delete and re-add if you need a different type.
      </p>
    </div>
    <div class="form-row">
      <label for="acct-edit-rate">Interest / Growth Rate (annual %, optional)</label>
      <input id="acct-edit-rate" type="number" step="0.01" value="${account.interestRate ?? ''}" placeholder="e.g. 4.5" />
    </div>
    <div class="form-actions">
      <button class="text-only" id="acct-edit-cancel">Cancel</button>
      <button class="primary" id="acct-edit-save">Save Changes</button>
    </div>
  `);

  modal.querySelector('#acct-edit-cancel').addEventListener('click', closeModal);
  modal.querySelector('#acct-edit-save').addEventListener('click', async () => {
    const name = modal.querySelector('#acct-edit-name').value.trim();
    const rawRate = modal.querySelector('#acct-edit-rate').value;
    const interestRate = rawRate === '' ? null : parseFloat(rawRate);

    if (!name) {
      alert('Give the account a name.');
      return;
    }

    try {
      await updateAccount(account.id, { name, interestRate });
      closeModal();
      onDone?.();
    } catch (err) {
      alert(err.message);
    }
  });
}

/**
 * Deleting an account also deletes every transaction tied to it (as either
 * its own account, or the from/to side of a transfer), otherwise those
 * transactions would point at an account that no longer exists. This is
 * spelled out explicitly in the confirmation since it's not undoable.
 */
async function confirmAndDeleteAccount(account, onDone) {
  const relatedCount = (await getTransactionsForAccount(account.id)).length;
  const warning =
    relatedCount > 0
      ? `Delete "${account.name}"? This will also permanently delete ${relatedCount} transaction${relatedCount === 1 ? '' : 's'} tied to it. This cannot be undone.`
      : `Delete "${account.name}"? This cannot be undone.`;

  if (!confirm(warning)) return;

  const related = await getTransactionsForAccount(account.id);
  for (const tx of related) {
    await deleteTransaction(tx.id);
  }
  await deleteAccount(account.id);
  onDone?.();
}

/**
 * Form for setting up (or editing) a recurring rule: paycheck (income),
 * savings/investing transfer, or the temporary debt-payment schedule. Pass
 * `existing` to edit a rule already in place.
 */
async function openRecurringRuleForm({ existing = null, onDone } = {}) {
  const accounts = await getAllAccounts();
  const categories = await getAllCategories();
  const accountOptions = (selectedId) =>
    accounts.map((a) => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.name}</option>`).join('');
  const savingsCategory = categories.find((c) => c.name === 'Savings');
  const investingCategory = categories.find((c) => c.name === 'Investing');

  const isEdit = !!existing;
  const derivedKind = existing
    ? existing.kind === 'transfer'
      ? existing.categoryId === investingCategory?.id
        ? 'transfer-investing'
        : 'transfer-savings'
      : existing.kind === 'expense'
      ? 'expense-debt'
      : 'income'
    : 'income';

  const kindLabel = (value, label) => `<option value="${value}" ${derivedKind === value ? 'selected' : ''}>${label}</option>`;

  const modal = openModal(`
    <h2>${isEdit ? 'Edit Recurring Rule' : 'Add Recurring Rule'}</h2>
    <div class="form-row">
      <label for="rec-kind">What is this?</label>
      <select id="rec-kind" ${isEdit ? 'disabled' : ''}>
        ${kindLabel('income', 'Paycheck (income)')}
        ${kindLabel('transfer-savings', 'Automatic transfer to Savings (emergency fund)')}
        ${kindLabel('transfer-investing', 'Automatic transfer to Investing')}
        ${kindLabel('expense-debt', 'Temporary debt payment (repeats a set number of times, then stops)')}
      </select>
    </div>
    <div class="form-row">
      <label for="rec-name">Name</label>
      <input id="rec-name" type="text" placeholder="e.g. Biweekly Paycheck" value="${existing?.name || ''}" />
    </div>
    <div class="form-row">
      <label for="rec-recurrence">Frequency</label>
      <select id="rec-recurrence">
        <option value="${RECURRENCE.MONTHLY}" ${existing?.recurrence === RECURRENCE.MONTHLY ? 'selected' : ''}>Monthly</option>
        <option value="${RECURRENCE.BIWEEKLY}" ${existing?.recurrence === RECURRENCE.BIWEEKLY ? 'selected' : ''}>Every 2 weeks</option>
      </select>
    </div>
    <div class="form-row">
      <label for="rec-amount">Usual Amount</label>
      <input id="rec-amount" type="number" step="0.01" min="0.01" value="${existing?.amount ?? ''}" />
    </div>
    <div id="rec-account-row" class="form-row">
      <label for="rec-account">Account (paying from)</label>
      <select id="rec-account">${accountOptions(existing?.accountId)}</select>
    </div>
    <div id="rec-debt-category-row" class="form-row" style="display:none">
      <label for="rec-debt-category">Category</label>
      <select id="rec-debt-category">${categories.map((c) => `<option value="${c.id}" ${c.id === existing?.categoryId ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
    </div>
    <div id="rec-from-row" class="form-row" style="display:none">
      <label for="rec-from">From Account</label>
      <select id="rec-from">${accountOptions(existing?.fromAccountId)}</select>
    </div>
    <div id="rec-to-row" class="form-row" style="display:none">
      <label for="rec-to">To Account</label>
      <select id="rec-to">${accountOptions(existing?.toAccountId)}</select>
    </div>
    <div id="rec-occurrences-row" class="form-row" style="display:none">
      <label for="rec-occurrences">Number of payments remaining</label>
      <input id="rec-occurrences" type="number" min="1" value="${existing?.occurrencesRemaining ?? 4}" />
    </div>
    <div class="form-row">
      <label for="rec-next-date">Next Due Date</label>
      <input id="rec-next-date" type="date" value="${existing?.nextDueDate || todayStr()}" />
    </div>
    <div class="form-actions">
      <button class="text-only" id="rec-cancel">Cancel</button>
      <button class="primary" id="rec-save">${isEdit ? 'Save Changes' : 'Save Rule'}</button>
    </div>
  `);

  const kindSelect = modal.querySelector('#rec-kind');
  const accountRow = modal.querySelector('#rec-account-row');
  const fromRow = modal.querySelector('#rec-from-row');
  const toRow = modal.querySelector('#rec-to-row');
  const occurrencesRow = modal.querySelector('#rec-occurrences-row');
  const debtCategoryRow = modal.querySelector('#rec-debt-category-row');

  function updateFieldVisibility() {
    const kind = kindSelect.value;
    const isTransfer = kind.startsWith('transfer');
    accountRow.style.display = isTransfer ? 'none' : 'flex';
    fromRow.style.display = isTransfer ? 'flex' : 'none';
    toRow.style.display = isTransfer ? 'flex' : 'none';
    occurrencesRow.style.display = kind === 'expense-debt' ? 'flex' : 'none';
    debtCategoryRow.style.display = kind === 'expense-debt' ? 'flex' : 'none';
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
      let payload;
      if (kind === 'income') {
        const accountId = modal.querySelector('#rec-account').value;
        payload = { name, kind: 'income', recurrence, amount, accountId, nextDueDate };
      } else if (kind === 'transfer-savings' || kind === 'transfer-investing') {
        const fromAccountId = modal.querySelector('#rec-from').value;
        const toAccountId = modal.querySelector('#rec-to').value;
        const categoryId = kind === 'transfer-savings' ? savingsCategory?.id : investingCategory?.id;
        payload = { name, kind: 'transfer', recurrence, amount, fromAccountId, toAccountId, categoryId, nextDueDate };
      } else if (kind === 'expense-debt') {
        const accountId = modal.querySelector('#rec-account').value;
        const categoryId = modal.querySelector('#rec-debt-category').value;
        const occurrencesRemaining = parseInt(modal.querySelector('#rec-occurrences').value, 10) || 1;
        payload = { name, kind: 'expense', recurrence, amount, accountId, categoryId, nextDueDate, occurrencesRemaining };
      }

      if (isEdit) {
        await updateRecurringRule(existing.id, payload);
      } else {
        await createRecurringRule(payload);
      }
      closeModal();
      onDone?.();
    } catch (err) {
      alert(err.message);
    }
  });
}

function openAddRecurringForm(onDone) {
  return openRecurringRuleForm({ onDone });
}

function openEditRecurringForm(existing, onDone) {
  return openRecurringRuleForm({ existing, onDone });
}

/** Confirms with the user, then permanently deletes a recurring rule. */
async function confirmAndDeleteRecurringRule(rule, onDone) {
  if (!confirm(`Delete the recurring rule "${rule.name}"? This cannot be undone.`)) return;
  await deleteRecurringRule(rule.id);
  onDone?.();
}

export {
  openAddTransactionForm,
  openEditTransactionForm,
  confirmAndDeleteTransaction,
  openAddAccountForm,
  openEditAccountForm,
  confirmAndDeleteAccount,
  openAddRecurringForm,
  openEditRecurringForm,
  confirmAndDeleteRecurringRule,
  openModal,
  closeModal
};
