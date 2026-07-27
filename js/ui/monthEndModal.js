// ui/monthEndModal.js
// Shows the one-time "here's how last month went" summary.

import { formatMoney } from '../util.js';
import { openModal, closeModal } from './forms.js';

function showMonthEndWrapUp(summary) {
  const { month, progress, netWorthChange, insight } = summary;
  const netWorthLine =
    netWorthChange === null
      ? 'Not enough data yet to show a change.'
      : `${netWorthChange >= 0 ? 'Up' : 'Down'} ${formatMoney(Math.abs(netWorthChange))}`;

  const modal = openModal(`
    <h2>${month} Wrap-Up</h2>
    ${insight ? `<p style="font-size:14px;color:var(--color-ink-soft);margin-top:-8px;">${insight}</p>` : ''}
    <div class="form-row">
      <label>Income</label>
      <p class="card-value" style="font-size:18px">${formatMoney(progress.income)}</p>
    </div>
    <div class="form-row">
      <label>Spending (target 60%)</label>
      <p class="card-value" style="font-size:18px">${formatMoney(progress.spending)}</p>
    </div>
    <div class="form-row">
      <label>Emergency Fund (target 15%)</label>
      <p class="card-value" style="font-size:18px">${formatMoney(progress.emergencyFund)}</p>
    </div>
    <div class="form-row">
      <label>Investing (target 25%)</label>
      <p class="card-value" style="font-size:18px">${formatMoney(progress.investing)}</p>
    </div>
    <div class="form-row">
      <label>Net Worth Change</label>
      <p class="card-value" style="font-size:18px">${netWorthLine}</p>
    </div>
    <div class="form-actions">
      <button class="primary" id="wrap-close">Continue to Dashboard</button>
    </div>
  `);

  modal.querySelector('#wrap-close').addEventListener('click', closeModal);
}

export { showMonthEndWrapUp };
