// models/categories.js
// Your 6 categories, each tagged to a budget bucket: 'spending' (needs+wants
// combined) or 'savings' (emergency fund + investing). The debt payment isn't
// a category, it's handled separately by the recurring debt-payment rule,
// but it counts toward the "spending" bucket when totaling up the budget.

import { dbAdd, dbGetAll, dbPut } from '../db/db.js';
import { generateId } from '../util.js';

export const BUDGET_BUCKETS = {
  SPENDING: 'spending', // 60% target
  SAVINGS: 'savings'    // 40% target (15% emergency fund + 25% investing, handled in budget.js)
};

const DEFAULT_CATEGORIES = [
  { name: 'Housing & Bills', bucket: BUDGET_BUCKETS.SPENDING },
  { name: 'Food', bucket: BUDGET_BUCKETS.SPENDING },
  { name: 'Transportation', bucket: BUDGET_BUCKETS.SPENDING },
  { name: 'Personal & Lifestyle', bucket: BUDGET_BUCKETS.SPENDING },
  { name: 'Savings', bucket: BUDGET_BUCKETS.SAVINGS, protected: true },
  { name: 'Investing', bucket: BUDGET_BUCKETS.SAVINGS, protected: true }
];

/** Called once on first app launch to seed the 6 default categories. */
async function seedDefaultCategoriesIfNeeded() {
  const existing = await dbGetAll('categories');
  if (existing.length > 0) return existing;

  const created = [];
  for (const def of DEFAULT_CATEGORIES) {
    const category = { id: generateId('cat'), ...def };
    await dbAdd('categories', category);
    created.push(category);
  }
  return created;
}

async function getAllCategories() {
  return dbGetAll('categories');
}

async function createCategory({ name, bucket }) {
  const category = { id: generateId('cat'), name, bucket, protected: false };
  await dbAdd('categories', category);
  return category;
}

async function updateCategory(id, changes) {
  const categories = await dbGetAll('categories');
  const existing = categories.find((c) => c.id === id);
  if (!existing) throw new Error(`Category ${id} not found`);
  if (existing.protected && changes.name && changes.name !== existing.name) {
    throw new Error('"Savings" and "Investing" are used by name in the budget math and can\'t be renamed.');
  }
  const updated = { ...existing, ...changes };
  await dbPut('categories', updated);
  return updated;
}

/**
 * Deleting a category doesn't delete the transactions that used it, they're
 * left uncategorized (categoryId set to null) rather than silently vanishing.
 */
async function deleteCategory(id) {
  const categories = await dbGetAll('categories');
  const existing = categories.find((c) => c.id === id);
  if (!existing) throw new Error(`Category ${id} not found`);
  if (existing.protected) {
    throw new Error('"Savings" and "Investing" are required by the budget system and can\'t be deleted.');
  }

  const { getAllTransactions, updateTransaction } = await import('./transactions.js');
  const affected = (await getAllTransactions()).filter((tx) => tx.categoryId === id);
  for (const tx of affected) {
    await updateTransaction(tx.id, { categoryId: null });
  }

  const { dbDelete } = await import('../db/db.js');
  await dbDelete('categories', id);
  return { deleted: id, uncategorizedCount: affected.length };
}

export {
  seedDefaultCategoriesIfNeeded,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
