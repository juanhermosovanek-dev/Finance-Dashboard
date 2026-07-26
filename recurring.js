// models/budget.js
// Implements the 60/15/25 budget philosophy:
//   60% Spending      (needs + wants combined, no forced split)
//   15% Emergency Fund
//   25% Investing
// The debt payment (while it lasts) counts inside the 60% spending bucket.
// These percentages are stored as data, not hardcoded, so they're editable
// later without a code change.

import { dbGetAll, dbPut } from '../db/db.js';
import { getTransactionsBetween } from './transactions.js';
import { getAllCategories, BUDGET_BUCKETS } from './categories.js';
import { generateId, monthKey } from '../util.js';

const DEFAULT_RULE = {
  id: 'default',
  spendingTarget: 0.60,
  emergencyFundTarget: 0.15,
  investingTarget: 0.25,
  emergencyFundGoalMonths: 4 // "full" emergency fund = this many months of spending
};

async function seedDefaultBudgetRuleIfNeeded() {
  const existing = await dbGetAll('budgetRules');
  if (existing.length > 0) return existing[0];
  // Using dbPut (upsert) instead of dbAdd (insert) here on purpose: if a
  // 'default' row already exists for any reason (a leftover from before a
  // reset, a race between two tabs loading at once), this just overwrites
  // it cleanly instead of throwing and crashing the whole app on startup.
  await dbPut('budgetRules', DEFAULT_RULE);
  return DEFAULT_RULE;
}

async function getBudgetRule() {
  const rules = await dbGetAll('budgetRules');
  return rules[0] || DEFAULT_RULE;
}

async function updateBudgetRule(changes) {
  const current = await getBudgetRule();
  const updated = { ...current, ...changes };
  await dbPut('budgetRules', updated);
  return updated;
}

/**
 * Calculates actual spending/savings/investing totals for a given month
 * ('YYYY-MM') against the target percentages, based on total income that month.
 * Debt payments are expenses tagged to a category in the SPENDING bucket,
 * so they're naturally included here with no special-casing needed.
 */
async function getBudgetProgressForMonth(yearMonth) {
  const rule = await getBudgetRule();
  const categories = await getAllCategories();
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-31`; // safe upper bound, string comparison handles shorter months fine
  const txs = await getTransactionsBetween(startDate, endDate);

  let income = 0;
  let spending = 0;
  let savingsAndInvesting = 0;
  let emergencyFund = 0;
  let investing = 0;

  for (const tx of txs) {
    if (tx.type === 'income') {
      income += tx.amount;
    } else if (tx.type === 'expense') {
      const category = categoryById[tx.categoryId];
      if (category && category.bucket === BUDGET_BUCKETS.SPENDING) {
        spending += tx.amount;
      } else if (category && category.bucket === BUDGET_BUCKETS.SAVINGS) {
        savingsAndInvesting += tx.amount;
      }
    } else if (tx.type === 'transfer') {
      // Transfers into savings/investment accounts count toward the savings bucket.
      // We identify which sub-bucket (emergency fund vs investing) via the
      // transfer's categoryId, which recurring rules set explicitly.
      const category = categoryById[tx.categoryId];
      if (category?.name === 'Savings') {
        emergencyFund += tx.amount;
        savingsAndInvesting += tx.amount;
      } else if (category?.name === 'Investing') {
        investing += tx.amount;
        savingsAndInvesting += tx.amount;
      }
    }
  }

  const targetSpending = income * rule.spendingTarget;
  const targetEmergencyFund = income * rule.emergencyFundTarget;
  const targetInvesting = income * rule.investingTarget;

  return {
    yearMonth,
    income,
    spending,
    emergencyFund,
    investing,
    targetSpending,
    targetEmergencyFund,
    targetInvesting,
    spendingStatus: statusFor(spending, targetSpending, true),
    emergencyFundStatus: statusFor(emergencyFund, targetEmergencyFund, false),
    investingStatus: statusFor(investing, targetInvesting, false)
  };
}

/**
 * Returns 'good' | 'watch' for a gentle nudge rather than a hard pass/fail.
 * For spending, going OVER target is the concern. For savings/investing,
 * falling UNDER target is the concern.
 */
function statusFor(actual, target, lowerIsBetter) {
  if (target === 0) return 'good';
  const ratio = actual / target;
  if (lowerIsBetter) {
    return ratio <= 1.05 ? 'good' : 'watch'; // small 5% cushion before flagging
  }
  return ratio >= 0.95 ? 'good' : 'watch';
}

export {
  seedDefaultBudgetRuleIfNeeded,
  getBudgetRule,
  updateBudgetRule,
  getBudgetProgressForMonth
};
