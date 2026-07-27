// ui/pages/expenses.js

import { getAllTransactions } from '../../models/transactions.js';
import { getAllAccounts } from '../../models/accounts.js';
import { getAllCategories } from '../../models/categories.js';
import { formatMoney, todayStr, monthKey, yearKey } from '../../util.js';
import { renderTransactionTable } from '../transactionTable.js';
import { renderDonutChart } from '../chart.js';
import { openEditTransactionForm, confirmAndDeleteTransaction } from '../forms.js';

const CATEGORY_COLORS = [
  'var(--color-primary)',
  'var(--color-gold)',
  'var(--color-good)',
  'var(--color-watch)',
  '#8B6FB3',
  '#4E7FB0'
];

async function renderExpensesPage(root, onChanged) {
  const [transactions, accounts, categories] = await Promise.all([
    getAllTransactions(),
    getAllAccounts(),
    getAllCategories()
  ]);

  const expenses = transactions.filter((tx) => tx.type === 'expense');
  const currentMonth = monthKey(todayStr());
  const currentYear = yearKey(todayStr());
  const thisMonthExpenses = expenses.filter((tx) => monthKey(tx.date) === currentMonth);
  const thisYearExpenses = expenses.filter((tx) => yearKey(tx.date) === currentYear);
  const thisMonthTotal = thisMonthExpenses.reduce((s, tx) => s + tx.amount, 0);
  const thisYearTotal = thisYearExpenses.reduce((s, tx) => s + tx.amount, 0);
  const allTimeTotal = expenses.reduce((s, tx) => s + tx.amount, 0);

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const totalsByCategory = {};
  for (const tx of thisMonthExpenses) {
    const name = categoryById[tx.categoryId]?.name || 'Other';
    totalsByCategory[name] = (totalsByCategory[name] || 0) + tx.amount;
  }
  const donutSegments = Object.entries(totalsByCategory).map(([label, value], i) => ({
    label,
    value,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
  }));

  root.innerHTML = `
    <div class="section-header"><h2>Expenses</h2></div>
    <div class="dashboard-grid" style="margin-bottom:24px;">
      <div class="card">
        <p class="card-label">This Month</p>
        <p class="card-value negative">${formatMoney(thisMonthTotal)}</p>
      </div>
      <div class="card">
        <p class="card-label">This Year</p>
        <p class="card-value negative">${formatMoney(thisYearTotal)}</p>
      </div>
      <div class="card">
        <p class="card-label">All Time</p>
        <p class="card-value negative">${formatMoney(allTimeTotal)}</p>
      </div>
      <div class="card wide">
        <p class="card-label">This Month by Category</p>
        <div id="expenses-donut"></div>
      </div>
    </div>
    <div id="expenses-table"></div>
  `;

  renderDonutChart(root.querySelector('#expenses-donut'), donutSegments, { size: 140 });

  renderTransactionTable(root.querySelector('#expenses-table'), expenses, accounts, categories, {
    onEdit: (tx) => openEditTransactionForm(tx, onChanged),
    onDelete: (tx) => confirmAndDeleteTransaction(tx, onChanged)
  });
}

export { renderExpensesPage };
