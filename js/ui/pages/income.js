// ui/pages/income.js

import { getAllTransactions } from '../../models/transactions.js';
import { getAllAccounts } from '../../models/accounts.js';
import { getAllCategories } from '../../models/categories.js';
import { formatMoney, todayStr, monthKey, yearKey } from '../../util.js';
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
  const currentYear = yearKey(todayStr());
  const thisMonthTotal = income.filter((tx) => monthKey(tx.date) === currentMonth).reduce((s, tx) => s + tx.amount, 0);
  const thisYearTotal = income.filter((tx) => yearKey(tx.date) === currentYear).reduce((s, tx) => s + tx.amount, 0);
  const allTimeTotal = income.reduce((s, tx) => s + tx.amount, 0);

  root.innerHTML = `
    <div class="section-header"><h2>Income</h2></div>
    <div class="dashboard-grid" style="margin-bottom:24px;">
      <div class="card">
        <p class="card-label">This Month</p>
        <p class="card-value positive">${formatMoney(thisMonthTotal)}</p>
      </div>
      <div class="card">
        <p class="card-label">This Year</p>
        <p class="card-value positive">${formatMoney(thisYearTotal)}</p>
      </div>
      <div class="card">
        <p class="card-label">All Time</p>
        <p class="card-value positive">${formatMoney(allTimeTotal)}</p>
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
