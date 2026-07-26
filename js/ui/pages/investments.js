// ui/pages/investments.js

import { getAllTransactions } from '../../models/transactions.js';
import { getAllAccounts, getAccountBalance, ACCOUNT_TYPES } from '../../models/accounts.js';
import { getAllCategories } from '../../models/categories.js';
import { formatMoney } from '../../util.js';
import { renderTransactionTable } from '../transactionTable.js';
import { openEditTransactionForm, confirmAndDeleteTransaction } from '../forms.js';

async function renderInvestmentsPage(root, onChanged) {
  const [transactions, accounts, categories] = await Promise.all([
    getAllTransactions(),
    getAllAccounts(),
    getAllCategories()
  ]);

  const investmentAccounts = accounts.filter((a) => a.type === ACCOUNT_TYPES.INVESTMENT);
  const investmentAccountIds = new Set(investmentAccounts.map((a) => a.id));

  let totalInvested = 0;
  const balanceCards = [];
  for (const acct of investmentAccounts) {
    const balance = await getAccountBalance(acct.id);
    totalInvested += balance;
    balanceCards.push(
      `<div class="card"><p class="card-label">${acct.name}</p><p class="card-value positive">${formatMoney(balance)}</p></div>`
    );
  }

  const relatedTransactions = transactions.filter(
    (tx) =>
      investmentAccountIds.has(tx.accountId) ||
      investmentAccountIds.has(tx.fromAccountId) ||
      investmentAccountIds.has(tx.toAccountId)
  );

  root.innerHTML = `
    <div class="section-header"><h2>Investments</h2></div>
    ${
      investmentAccounts.length === 0
        ? `<p class="empty-state">No investment accounts yet. Add one from "Add Account" and choose the Investment type.</p>`
        : `
          <div class="dashboard-grid" style="margin-bottom:24px;">
            <div class="card"><p class="card-label">Total Invested</p><p class="card-value positive">${formatMoney(totalInvested)}</p></div>
            ${balanceCards.join('')}
          </div>
          <div id="investments-table"></div>
        `
    }
  `;

  if (investmentAccounts.length > 0) {
    renderTransactionTable(root.querySelector('#investments-table'), relatedTransactions, accounts, categories, {
      onEdit: (tx) => openEditTransactionForm(tx, onChanged),
      onDelete: (tx) => confirmAndDeleteTransaction(tx, onChanged)
    });
  }
}

export { renderInvestmentsPage };
