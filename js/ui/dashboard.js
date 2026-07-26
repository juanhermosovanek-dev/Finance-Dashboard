// ui/dashboard.js
// Renders the Summary page: net worth, spending, emergency fund, investing,
// cash flow, and debt countdown, all as equal-weight cards, plus a recent
// transactions table with edit/delete.

import { getAllAccounts, getAccountBalance, ACCOUNT_TYPES } from '../models/accounts.js';
import { calculateNetWorth, getNetWorthHistory } from '../models/netWorth.js';
import { getBudgetProgressForMonth } from '../models/budget.js';
import { getAllTransactions } from '../models/transactions.js';
import { getAllCategories } from '../models/categories.js';
import { formatMoney, todayStr, monthKey } from '../util.js';
import { renderLineChart } from './chart.js';
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
  const debtAccount = accounts.find((a) => a.type === ACCOUNT_TYPES.LIABILITY);
  const debtBalance = debtAccount ? Math.abs(await getAccountBalance(debtAccount.id)) : 0;
  const netWorthClass = netWorth.total >= 0 ? 'positive' : 'negative';
  const cashFlowClass = cashFlow >= 0 ? 'positive' : 'negative';

  root.innerHTML = `
    <div class="dashboard-grid">
      ${card('Net Worth', formatMoney(netWorth.total), null, netWorthClass)}
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
      ${card('Cash Flow', formatMoney(cashFlow), `<span class="card-sub">Income minus spending &amp; transfers</span>`, cashFlowClass)}
      ${
        debtAccount
          ? card('College Debt Remaining', formatMoney(debtBalance), `<span class="card-sub">Paying down over 4 months</span>`, 'negative')
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
      <div id="recent-transactions"></div>
    </div>
  `;

  renderLineChart(
    root.querySelector('#net-worth-chart'),
    history.map((s) => ({ date: s.date, value: s.netWorth }))
  );

  renderTransactionTable(root.querySelector('#recent-transactions'), transactions.slice(0, 12), accounts, categories, {
    onEdit: (tx) => openEditTransactionForm(tx, onChanged),
    onDelete: (tx) => confirmAndDeleteTransaction(tx, onChanged)
  });
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

function subLine(status, text) {
  const cls = status === 'good' ? 'good' : 'watch';
  return `<p class="card-sub ${cls}">${text}</p>`;
}

export { renderDashboard };
