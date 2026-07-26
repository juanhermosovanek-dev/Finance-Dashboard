// ui/pages/expenses.js

import { getAllTransactions } from '../../models/transactions.js';
import { getAllAccounts } from '../../models/accounts.js';
import { getAllCategories } from '../../models/categories.js';
import { formatMoney, todayStr, monthKey } from '../../util.js';
import { renderTransactionTable } from '../transactionTable.js';
import { openEditTransactionForm, confirmAndDeleteTransaction } from '../forms.js';

async function renderExpensesPage(root, onChanged) {
  const [transactions, accounts, categories] = await Promise.all([
    getAllTransactions(),
    getAllAccounts(),
    getAllCategories()
  ]);

  const expenses = transactions.filter((tx) => tx.type === 'expense');
  const currentMonth = monthKey(todayStr());
  const thisMonthTotal = expenses.filter((tx) => monthKey(tx.date) === currentMonth).reduce((s, tx) => s + tx.amount, 0);
  const allTimeTotal = expenses.reduce((s, tx) => s + tx.amount, 0);

  root.innerHTML = `
    <div class="section-header"><h2>Expenses</h2></div>
    <div class="section-totals">
      <div class="stat">
        <p class="stat-label">This Month</p>
        <p class="stat-value negative">${formatMoney(thisMonthTotal)}</p>
      </div>
      <div class="stat">
        <p class="stat-label">All Time</p>
        <p class="stat-value negative">${formatMoney(allTimeTotal)}</p>
      </div>
    </div>
    <div id="expenses-table"></div>
  `;

  renderTransactionTable(root.querySelector('#expenses-table'), expenses, accounts, categories, {
    onEdit: (tx) => openEditTransactionForm(tx, onChanged),
    onDelete: (tx) => confirmAndDeleteTransaction(tx, onChanged)
  });
}

export { renderExpensesPage };
