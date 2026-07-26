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
  { name: 'Savings', bucket: BUDGET_BUCKETS.SAVINGS },
  { name: 'Investing', bucket: BUDGET_BUCKETS.SAVINGS }
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

async function updateCategory(id, changes) {
  const categories = await dbGetAll('categories');
  const existing = categories.find((c) => c.id === id);
  if (!existing) throw new Error(`Category ${id} not found`);
  const updated = { ...existing, ...changes };
  await dbPut('categories', updated);
  return updated;
}

export { seedDefaultCategoriesIfNeeded, getAllCategories, updateCategory };
