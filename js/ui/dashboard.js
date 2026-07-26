// ui/dashboard.js
// Renders the Summary page: net worth, spending, emergency fund, investing,
// cash flow, an accounts overview, a budget-split donut, and recent
// transactions with edit/delete.

import { getAllAccounts, getAccountBalance } from '../models/accounts.js';
import { calculateNetWorth, getNetWorthHistory } from '../models/netWorth.js';
import { getBudgetProgressForMonth } from '../models/budget.js';
import { getAllTransactions } from '../models/transactions.js';
import { getAllCategories } from '../models/categories.js';
import { formatMoney, todayStr, monthKey } from '../util.js';
import { renderLineChart, renderDonutChart } from './chart.js';
import { renderTransactionTable } from './transactionTable.js';
import { openEditTransactionForm, confirmAndDeleteTransaction } from './forms.js';

async function renderDashboard(root, onChanged) {
  const currentMonth = monthKey(todayStr());
  const [netWorth, history, progress, accounts, transactions, categories] = await Promise.all([
    calculateNetWorth(),
    getNetWorthHistory(),
    getBudgetProgressForMonth(currentMonth),
    getAllAccounts(),
    getAllTransactions(),
    getAllCategories()
  ]);

  const cashFlow = progress.income - progress.spending - progress.emergencyFund - progress.investing;
  const netWorthClass = netWorth.total >= 0 ? 'positive' : 'negative';
  const cashFlowClass = cashFlow >= 0 ? 'positive' : 'negative';

  const accountRows = await Promise.all(
    accounts.map(async (a) => {
      const breakdown = netWorth.breakdown.find((b) => b.accountId === a.id);
      const balance = breakdown ? breakdown.balance : await getAccountBalance(a.id);
      return { name: a.name, type: a.type, balance };
    })
  );

  root.innerHTML = `
    <div class="dashboard-grid">
      ${card('Net Worth', formatMoney(netWorth.total), null, netWorthClass)}
      ${card('This Month Spending', formatMoney(progress.spending), subLine(progress.spendingStatus, progress.spendingStatus === 'good' ? 'On track' : 'Above target'))}
      ${card('Emergency Fund', formatMoney(progress.emergencyFund), subLine(progress.emergencyFundStatus, progress.emergencyFundStatus === 'good' ? 'On track' : 'Behind pace'))}
      ${card(
        'Investing This Month',
        formatMoney(progress.investing),
        subLine(progress.investingStatus, `Target ${formatMoney(progress.targetInvesting)} (25%)`)
      )}
      ${card('Cash Flow', formatMoney(cashFlow), `<span class="card-sub">Income minus spending &amp; transfers</span>`, cashFlowClass)}
      <div class="card">
        <p class="card-label">Where This Month's Income Went</p>
        <div id="budget-donut"></div>
      </div>
      <div class="card wide">
        <p class="card-label">Net Worth Trend</p>
        <div id="net-worth-chart"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <h2>Accounts</h2>
      </div>
      ${renderAccountsTable(accountRows)}
    </div>

    <div class="section">
      <div class="section-header">
        <h2>Recent Transactions</h2>
      </div>
      <div id="recent-transactions"></div>
    </div>
  `;

  renderLineChart(
    root.querySelector('#net-worth-chart'),
    history.map((s) => ({ date: s.date, value: s.netWorth }))
  );

  renderDonutChart(root.querySelector('#budget-donut'), [
    { label: 'Spending', value: progress.spending, color: 'var(--color-primary)' },
    { label: 'Emergency Fund', value: progress.emergencyFund, color: 'var(--color-gold)' },
    { label: 'Investing', value: progress.investing, color: 'var(--color-good)' }
  ]);

  renderTransactionTable(root.querySelector('#recent-transactions'), transactions.slice(0, 12), accounts, categories, {
    onEdit: (tx) => openEditTransactionForm(tx, onChanged),
    onDelete: (tx) => confirmAndDeleteTransaction(tx, onChanged)
  });
}

function renderAccountsTable(accountRows) {
  if (accountRows.length === 0) {
    return `<p class="empty-state">No accounts yet.</p>`;
  }
  const rows = accountRows
    .map((a) => {
      const cls = a.balance >= 0 ? 'positive' : 'negative';
      return `
        <tr>
          <td>${a.name}</td>
          <td><span class="tag">${typeLabel(a.type)}</span></td>
          <td class="amount ${cls}">${formatMoney(a.balance)}</td>
        </tr>
      `;
    })
    .join('');
  return `
    <table class="ledger">
      <thead><tr><th>Account</th><th>Type</th><th>Balance</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function typeLabel(type) {
  const labels = {
    checking: 'Checking',
    savings: 'Savings',
    card: 'Credit Card',
    investment: 'Investment',
    liability: 'Loan / Debt'
  };
  return labels[type] || type;
}

function card(label, value, subHtml, valueClass = '') {
  return `
    <div class="card">
      <p class="card-label">${label}</p>
      <p class="card-value ${valueClass}">${value}</p>
      ${subHtml || ''}
    </div>
  `;
}

function subLine(status, label) {
  const cls = status === 'good' ? 'good' : 'watch';
  return `<p class="card-sub ${cls}">${label}</p>`;
}

export { renderDashboard };
