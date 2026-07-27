// models/goals.js
// A goal is a target amount tied to a specific account (e.g. "Vacation Fund"
// linked to a savings account). Progress is simply that account's current
// balance against the target, no separate contribution tracking needed,
// which keeps this simple instead of building a second accounting system.

import { dbAdd, dbGetAll, dbPut, dbDelete } from '../db/db.js';
import { generateId, todayStr } from '../util.js';
import { getAccountBalance } from './accounts.js';

async function createGoal({ name, targetAmount, targetDate = null, accountId }) {
  const goal = {
    id: generateId('goal'),
    name,
    targetAmount,
    targetDate,
    accountId,
    createdAt: todayStr()
  };
  await dbAdd('goals', goal);
  return goal;
}

async function getAllGoals() {
  return dbGetAll('goals');
}

async function updateGoal(id, changes) {
  const goals = await dbGetAll('goals');
  const existing = goals.find((g) => g.id === id);
  if (!existing) throw new Error(`Goal ${id} not found`);
  const updated = { ...existing, ...changes };
  await dbPut('goals', updated);
  return updated;
}

async function deleteGoal(id) {
  return dbDelete('goals', id);
}

/** Returns each goal with its current progress attached. */
async function getGoalsWithProgress() {
  const goals = await getAllGoals();
  return Promise.all(
    goals.map(async (goal) => {
      const currentAmount = await getAccountBalance(goal.accountId);
      const fraction = goal.targetAmount > 0 ? Math.max(0, currentAmount) / goal.targetAmount : 0;
      return { ...goal, currentAmount, fraction: Math.min(fraction, 1) };
    })
  );
}

export { createGoal, getAllGoals, updateGoal, deleteGoal, getGoalsWithProgress };
