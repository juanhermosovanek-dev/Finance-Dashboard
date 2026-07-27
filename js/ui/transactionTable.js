// ui/transactionTable.js
// One table renderer shared by every page that lists transactions. Includes
// a search box and pagination so it stays usable once history grows past a
// couple dozen entries, the same reason every real finance app paginates.

import { formatMoney } from '../util.js';

const PAGE_SIZE = 15;

/**
 * Renders a searchable, paginated ledger table into `container`.
 * callbacks: { onEdit(tx), onDelete(tx) }
 */
function renderTransactionTable(container, transactions, accounts, categories, callbacks = {}) {
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

  let query = '';
  let page = 1;

  container.innerHTML = `
    <div class="table-search-row">
      <input type="text" class="table-search" placeholder="Search description, category, date..." />
    </div>
    <div class="tx-table-body"></div>
  `;

  const searchInput = container.querySelector('.table-search');
  const bodyEl = container.querySelector('.tx-table-body');

  function matches(tx) {
    if (!query) return true;
    const label = describeTransaction(tx, accountById, categoryById);
    const haystack = `${label.description} ${label.tag} ${tx.date} ${tx.note || ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function renderBody() {
    const filtered = transactions.filter(matches);

    if (filtered.length === 0) {
      bodyEl.innerHTML = `<p class="empty-state">${
        query ? 'No transactions match your search.' : 'No transactions here yet.'
      }</p>`;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    page = Math.min(page, totalPages);
    const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const rows = pageItems
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

    const paginationHtml =
      totalPages > 1
        ? `
      <div class="table-pagination">
        <button class="text-only" id="tx-prev-page" ${page === 1 ? 'disabled' : ''}>Previous</button>
        <span class="table-pagination-label">Page ${page} of ${totalPages} (${filtered.length} total)</span>
        <button class="text-only" id="tx-next-page" ${page === totalPages ? 'disabled' : ''}>Next</button>
      </div>`
        : `<div class="table-pagination"><span class="table-pagination-label">${filtered.length} transaction${filtered.length === 1 ? '' : 's'}</span></div>`;

    bodyEl.innerHTML = `
      <table class="ledger">
        <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${paginationHtml}
    `;

    bodyEl.querySelectorAll('tr[data-tx-id]').forEach((row) => {
      const txId = row.dataset.txId;
      const tx = transactions.find((t) => t.id === txId);
      row.querySelector('.edit-btn')?.addEventListener('click', () => callbacks.onEdit?.(tx));
      row.querySelector('.delete-btn')?.addEventListener('click', () => callbacks.onDelete?.(tx));
    });

    bodyEl.querySelector('#tx-prev-page')?.addEventListener('click', () => {
      page -= 1;
      renderBody();
    });
    bodyEl.querySelector('#tx-next-page')?.addEventListener('click', () => {
      page += 1;
      renderBody();
    });
  }

  searchInput.addEventListener('input', (e) => {
    query = e.target.value;
    page = 1;
    renderBody();
  });

  renderBody();
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
