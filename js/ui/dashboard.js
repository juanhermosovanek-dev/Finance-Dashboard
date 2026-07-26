// ui/dashboard.js
// Renders the main dashboard view: net worth, spending, emergency fund,
// investing, cash flow, and debt countdown, all as equal-weight cards,
// numbers-first, per the Phase 4 design.

import { getAllAccounts, getAccountBalance, ACCOUNT_TYPES } from '../models/accounts.js';
import { calculateNetWorth, getNetWorthHistory } from '../models/netWorth.js';
import { getBudgetProgressForMonth } from '../models/budget.js';
import { getAllTransactions } from '../models/transactions.js';
import { getAllCategories } from '../models/categories.js';
import { formatMoney, formatPercent, todayStr, monthKey } from '../util.js';
import { renderLineChart } from './chart.js';

async function renderDashboard(root) {
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
  const debtAccount = accounts.find((a) => a.type === ACCOUNT_TYPES.LIABILITY);
  const debtBalance = debtAccount ? Math.abs(await getAccountBalance(debtAccount.id)) : 0;

  root.innerHTML = `
    <div class="dashboard-grid">
      ${card('Net Worth', formatMoney(netWorth.total), null)}
      ${card(
        'This Month Spending',
        formatMoney(progress.spending),
        subLine(progress.spendingStatus, `Target ${formatMoney(progress.targetSpending)} (60%)`)
      )}
      ${card(
        'Emergency Fund',
        formatMoney(progress.emergencyFund),
        subLine(progress.emergencyFundStatus, `Target ${formatMoney(progress.targetEmergencyFund)} (15%)`)
      )}
      ${card(
        'Investing This Month',
        formatMoney(progress.investing),
        subLine(progress.investingStatus, `Target ${formatMoney(progress.targetInvesting)} (25%)`)
      )}
      ${card('Cash Flow', formatMoney(cashFlow), `<span class="card-sub">Income minus spending &amp; transfers</span>`)}
      ${
        debtAccount
          ? card('College Debt Remaining', formatMoney(debtBalance), `<span class="card-sub">Paying down over 4 months</span>`)
          : card('College Debt', 'Paid off', `<span class="card-sub good">Nothing owed</span>`)
      }
      <div class="card wide">
        <p class="card-label">Net Worth Trend</p>
        <div id="net-worth-chart"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <h2>Recent Transactions</h2>
      </div>
      ${renderTransactionsTable(transactions.slice(0, 12), accounts, categories)}
    </div>
  `;

  renderLineChart(
    root.querySelector('#net-worth-chart'),
    history.map((s) => ({ date: s.date, value: s.netWorth }))
  );
}

function card(label, value, subHtml) {
  return `
    <div class="card">
      <p class="card-label">${label}</p>
      <p class="card-value">${value}</p>
      ${subHtml || ''}
    </div>
  `;
}

function subLine(status, text) {
  const cls = status === 'good' ? 'good' : 'watch';
  return `<p class="card-sub ${cls}">${text}</p>`;
}

function renderTransactionsTable(transactions, accounts, categories) {
  if (transactions.length === 0) {
    return `<p class="card-sub">No transactions yet. Use "Add Transaction" above to log your first one.</p>`;
  }

  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

  const rows = transactions
    .map((tx) => {
      const label = describeTransaction(tx, accountById, categoryById);
      const isNegative = tx.type === 'expense' || (tx.type === 'transfer' && false);
      const amountClass = tx.type === 'income' ? 'positive' : tx.type === 'expense' ? 'negative' : '';
      return `
        <tr>
          <td>${tx.date}</td>
          <td>${label.description}<br/><span class="tag">${label.tag}</span></td>
          <td class="amount ${amountClass}">${tx.type === 'expense' ? '-' : ''}${formatMoney(tx.amount)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table class="ledger">
      <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function describeTransaction(tx, accountById, categoryById) {
  if (tx.type === 'income') {
    return { description: tx.note || 'Income', tag: accountById[tx.accountId]?.name || 'Income' };
  }
  if (tx.type === 'expense') {
    return { description: tx.note || 'Expense', tag: categoryById[tx.categoryId]?.name || 'Expense' };
  }
  if (tx.type === 'transfer') {
    const from = accountById[tx.fromAccountId]?.name || '?';
    const to = accountById[tx.toAccountId]?.name || '?';
    return { description: `${from} → ${to}`, tag: 'Transfer' };
  }
  if (tx.type === 'starting_balance') {
    return { description: 'Starting balance', tag: accountById[tx.accountId]?.name || '' };
  }
  return { description: tx.note || tx.type, tag: tx.type };
}

export { renderDashboard };
