// ui/categoriesModal.js
// Lets the user go beyond the 6 default categories: rename, add, or remove
// their own. "Savings" and "Investing" are protected since the budget math
// looks them up by name.

import { getAllCategories, createCategory, updateCategory, deleteCategory, BUDGET_BUCKETS } from '../models/categories.js';
import { openModal, closeModal } from './forms.js';

async function openCategoriesModal(onChanged) {
  const categories = await getAllCategories();

  const rows = categories
    .map(
      (c) => `
      <tr data-cat-id="${c.id}">
        <td>${c.name}${c.protected ? ' <span class="tag">Required</span>' : ''}</td>
        <td><span class="tag">${c.bucket === BUDGET_BUCKETS.SPENDING ? 'Spending' : 'Savings'}</span></td>
        <td class="row-actions">
          ${c.protected ? '' : `<button class="icon-btn edit-btn">Edit</button><button class="icon-btn delete delete-btn">Delete</button>`}
        </td>
      </tr>`
    )
    .join('');

  const modal = openModal(`
    <h2>Categories</h2>
    <table class="ledger" style="margin-bottom:16px;">
      <thead><tr><th>Name</th><th>Bucket</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="form-row">
      <label for="new-cat-name">New Category Name</label>
      <input id="new-cat-name" type="text" placeholder="e.g. Travel" />
    </div>
    <div class="form-row">
      <label for="new-cat-bucket">Counts Toward</label>
      <select id="new-cat-bucket">
        <option value="${BUDGET_BUCKETS.SPENDING}">Spending (60% target)</option>
        <option value="${BUDGET_BUCKETS.SAVINGS}">Savings / Investing (40% target)</option>
      </select>
    </div>
    <div class="form-actions">
      <button class="text-only" id="cat-close">Close</button>
      <button class="primary" id="cat-add">Add Category</button>
    </div>
  `);

  modal.querySelector('#cat-close').addEventListener('click', closeModal);

  modal.querySelector('#cat-add').addEventListener('click', async () => {
    const name = modal.querySelector('#new-cat-name').value.trim();
    const bucket = modal.querySelector('#new-cat-bucket').value;
    if (!name) {
      alert('Give the category a name.');
      return;
    }
    try {
      await createCategory({ name, bucket });
      closeModal();
      onChanged?.();
      openCategoriesModal(onChanged);
    } catch (err) {
      alert(err.message);
    }
  });

  modal.querySelectorAll('tr[data-cat-id]').forEach((row) => {
    const catId = row.dataset.catId;
    const category = categories.find((c) => c.id === catId);

    row.querySelector('.edit-btn')?.addEventListener('click', () => {
      const newName = prompt('Rename category:', category.name);
      if (!newName || !newName.trim()) return;
      updateCategory(catId, { name: newName.trim() })
        .then(() => {
          closeModal();
          onChanged?.();
          openCategoriesModal(onChanged);
        })
        .catch((err) => alert(err.message));
    });

    row.querySelector('.delete-btn')?.addEventListener('click', async () => {
      if (!confirm(`Delete "${category.name}"? Transactions using it will become uncategorized, not deleted.`)) return;
      try {
        await deleteCategory(catId);
        closeModal();
        onChanged?.();
        openCategoriesModal(onChanged);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

export { openCategoriesModal };
