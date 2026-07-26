// ui/transactionTable.js
// One table renderer shared by the Summary, Expenses, Income, and
// Investments pages. Each page just decides which transactions to pass in.

import { formatMoney } from '../util.js';

/**
 * Renders a ledger table into `container`.
 * callbacks: { onEdit(tx), onDelete(tx) }
 */
function renderTransactionTable(container, transactions, accounts, categories, callbacks = {}) {
  if (transactions.length === 0) {
    container.innerHTML = `<p class="empty-state">No transactions here yet.</p>`;
    return;
  }

  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

  const rows = transactions
    .map((tx) => {
      const label = describeTransaction(tx, accountById, categoryById);
      const amountClass = tx.type === 'income' ? 'positive' : tx.type === 'expense' ? 'negative' : '';
      const sign = tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : '';
      return `
        <tr data-tx-id="${tx.id}">
          <td>${tx.date}</td>
          <td>${label.description}<br/><span class="tag">${label.tag}</span></td>
          <td class="amount ${amountClass}">${sign}${formatMoney(tx.amount)}</td>
          <td class="row-actions">
            <button class="icon-btn edit-btn" title="Edit">Edit</button>
            <button class="icon-btn delete delete-btn" title="Delete">Delete</button>
          </td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = `
    <table class="ledger">
      <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  container.querySelectorAll('tr[data-tx-id]').forEach((row) => {
    const txId = row.dataset.txId;
    const tx = transactions.find((t) => t.id === txId);
    row.querySelector('.edit-btn')?.addEventListener('click', () => callbacks.onEdit?.(tx));
    row.querySelector('.delete-btn')?.addEventListener('click', () => callbacks.onDelete?.(tx));
  });
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
    return { description: `${from} \u2192 ${to}`, tag: categoryById[tx.categoryId]?.name || 'Transfer' };
  }
  if (tx.type === 'starting_balance') {
    return { description: 'Starting balance', tag: accountById[tx.accountId]?.name || '' };
  }
  return { description: tx.note || tx.type, tag: tx.type };
}

export { renderTransactionTable };
