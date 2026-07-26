// ui/pages/income.js

import { getAllTransactions } from '../../models/transactions.js';
import { getAllAccounts } from '../../models/accounts.js';
import { getAllCategories } from '../../models/categories.js';
import { formatMoney, todayStr, monthKey } from '../../util.js';
import { renderTransactionTable } from '../transactionTable.js';
import { openEditTransactionForm, confirmAndDeleteTransaction } from '../forms.js';

async function renderIncomePage(root, onChanged) {
  const [transactions, accounts, categories] = await Promise.all([
    getAllTransactions(),
    getAllAccounts(),
    getAllCategories()
  ]);

  const income = transactions.filter((tx) => tx.type === 'income');
  const currentMonth = monthKey(todayStr());
  const thisMonthTotal = income.filter((tx) => monthKey(tx.date) === currentMonth).reduce((s, tx) => s + tx.amount, 0);
  const allTimeTotal = income.reduce((s, tx) => s + tx.amount, 0);

  root.innerHTML = `
    <div class="section-header"><h2>Income</h2></div>
    <div class="section-totals">
      <div class="stat">
        <p class="stat-label">This Month</p>
        <p class="stat-value positive">${formatMoney(thisMonthTotal)}</p>
      </div>
      <div class="stat">
        <p class="stat-label">All Time</p>
        <p class="stat-value positive">${formatMoney(allTimeTotal)}</p>
      </div>
    </div>
    <div id="income-table"></div>
  `;

  renderTransactionTable(root.querySelector('#income-table'), income, accounts, categories, {
    onEdit: (tx) => openEditTransactionForm(tx, onChanged),
    onDelete: (tx) => confirmAndDeleteTransaction(tx, onChanged)
  });
}

export { renderIncomePage };
