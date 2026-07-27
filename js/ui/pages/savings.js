// ui/pages/savings.js
// Mirrors the Investments page, but for Savings-type accounts and
// contributions tagged to the "Savings" (emergency fund) budget category.

import { getAllTransactions } from '../../models/transactions.js';
import { getAllAccounts, getAccountBalance, ACCOUNT_TYPES } from '../../models/accounts.js';
import { getAllCategories } from '../../models/categories.js';
import { formatMoney, todayStr, monthKey, yearKey, estimateGrowth } from '../../util.js';
import { renderTransactionTable } from '../transactionTable.js';
import { openEditTransactionForm, confirmAndDeleteTransaction, openEditAccountForm, confirmAndDeleteAccount } from '../forms.js';

async function renderSavingsPage(root, onChanged) {
  const [transactions, accounts, categories] = await Promise.all([
    getAllTransactions(),
    getAllAccounts(),
    getAllCategories()
  ]);

  const savingsAccounts = accounts.filter((a) => a.type === ACCOUNT_TYPES.SAVINGS);
  const savingsAccountIds = new Set(savingsAccounts.map((a) => a.id));
  const savingsCategory = categories.find((c) => c.name === 'Savings');

  const relatedTransactions = transactions.filter(
    (tx) =>
      savingsAccountIds.has(tx.accountId) ||
      savingsAccountIds.has(tx.fromAccountId) ||
      savingsAccountIds.has(tx.toAccountId) ||
      tx.categoryId === savingsCategory?.id
  );

  // "Contributions" = anything tagged as the Savings/emergency-fund budget
  // category, whether it's a transfer or a direct deposit.
  const contributions = relatedTransactions.filter((tx) => tx.categoryId === savingsCategory?.id);
  const currentMonth = monthKey(todayStr());
  const currentYear = yearKey(todayStr());
  const thisMonthContrib = contributions.filter((tx) => monthKey(tx.date) === currentMonth).reduce((s, tx) => s + tx.amount, 0);
  const thisYearContrib = contributions.filter((tx) => yearKey(tx.date) === currentYear).reduce((s, tx) => s + tx.amount, 0);
  const allTimeContrib = contributions.reduce((s, tx) => s + tx.amount, 0);

  let totalSaved = 0;
  const balanceRows = [];
  for (const acct of savingsAccounts) {
    const balance = await getAccountBalance(acct.id);
    totalSaved += balance;
    balanceRows.push({ account: acct, balance });
  }

  root.innerHTML = `
    <div class="section-header"><h2>Savings &amp; Emergency Fund</h2></div>
    ${
      savingsAccounts.length === 0
        ? `<p class="empty-state">No savings accounts yet. Add one from "Add Account" and choose the Savings type.</p>`
        : `
          <div class="dashboard-grid" style="margin-bottom:24px;">
            <div class="card"><p class="card-label">Total Saved</p><p class="card-value positive">${formatMoney(totalSaved)}</p></div>
            <div class="card"><p class="card-label">Contributed This Month</p><p class="card-value positive">${formatMoney(thisMonthContrib)}</p></div>
            <div class="card"><p class="card-label">Contributed This Year</p><p class="card-value positive">${formatMoney(thisYearContrib)}</p></div>
            <div class="card"><p class="card-label">Contributed All Time</p><p class="card-value positive">${formatMoney(allTimeContrib)}</p></div>
          </div>
          <div class="section">
            <div class="section-header"><h2>Accounts</h2></div>
            ${renderAccountsTable(balanceRows)}
          </div>
          <div id="savings-table"></div>
        `
    }
  `;

  if (savingsAccounts.length > 0) {
    renderTransactionTable(root.querySelector('#savings-table'), relatedTransactions, accounts, categories, {
      onEdit: (tx) => openEditTransactionForm(tx, onChanged),
      onDelete: (tx) => confirmAndDeleteTransaction(tx, onChanged)
    });

    root.querySelectorAll('tr[data-account-id]').forEach((row) => {
      const accountId = row.dataset.accountId;
      const entry = balanceRows.find((r) => r.account.id === accountId);
      row.querySelector('.edit-btn')?.addEventListener('click', () => openEditAccountForm(entry.account, onChanged));
      row.querySelector('.delete-btn')?.addEventListener('click', () => confirmAndDeleteAccount(entry.account, onChanged));
    });
  }
}

function renderAccountsTable(balanceRows) {
  const rows = balanceRows
    .map(({ account, balance }) => {
      const growth = account.interestRate ? formatMoney(estimateGrowth(balance, account.interestRate, 1)) : '\u2014';
      return `
        <tr data-account-id="${account.id}">
          <td>${account.name}</td>
          <td class="amount positive">${formatMoney(balance)}</td>
          <td class="amount">${account.interestRate ? `${account.interestRate}%` : '\u2014'}</td>
          <td class="amount">${growth}</td>
          <td class="row-actions">
            <button class="icon-btn edit-btn">Edit</button>
            <button class="icon-btn delete delete-btn">Delete</button>
          </td>
        </tr>
      `;
    })
    .join('');
  return `
    <table class="ledger">
      <thead><tr><th>Account</th><th>Balance</th><th>Interest Rate</th><th>Est. in 1 Year</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export { renderSavingsPage };
