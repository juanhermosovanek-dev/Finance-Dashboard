// models/recurring.js
// Recurring rules describe a pattern ("every month on the 1st") and the
// last amount used. When the app opens, checkDueRecurringRules() finds any
// that are due and returns them as PENDING SUGGESTIONS. Nothing posts to
// the ledger until the user confirms the amount, since paychecks and
// transfer amounts can vary. The one exception is the debt payment rule,
// which auto-retires itself after its 4th occurrence.

import { dbAdd, dbGetAll, dbPut, dbDelete } from '../db/db.js';
import { addTransaction } from './transactions.js';
import { generateId, todayStr, addMonths, addDays } from '../util.js';

export const RECURRENCE = {
  MONTHLY: 'monthly',
  BIWEEKLY: 'biweekly'
};

/**
 * Creates a recurring rule.
 * kind: 'income' | 'transfer'
 * For income: accountId, categoryId not needed.
 * For transfer: fromAccountId, toAccountId, categoryId (Savings or Investing).
 * occurrencesRemaining: null = repeats forever, a number = auto-retires after that many posts.
 */
async function createRecurringRule({
  name,
  kind,
  recurrence,
  amount,
  accountId = null,
  fromAccountId = null,
  toAccountId = null,
  categoryId = null,
  nextDueDate,
  occurrencesRemaining = null,
  reminderDaysBefore = 3
}) {
  const rule = {
    id: generateId('rec'),
    name,
    kind,
    recurrence,
    amount,
    accountId,
    fromAccountId,
    toAccountId,
    categoryId,
    nextDueDate,
    occurrencesRemaining,
    reminderDaysBefore,
    active: true
  };
  await dbAdd('recurringRules', rule);
  return rule;
}

async function getAllRecurringRules() {
  return dbGetAll('recurringRules');
}

/**
 * Updates an existing rule's details (amount, schedule, accounts, etc.).
 * Preserves fields like `active` and `occurrencesRemaining` unless the
 * caller explicitly overrides them.
 */
async function updateRecurringRule(id, changes) {
  const rules = await dbGetAll('recurringRules');
  const existing = rules.find((r) => r.id === id);
  if (!existing) throw new Error(`Recurring rule ${id} not found`);
  const updated = { ...existing, ...changes };
  await dbPut('recurringRules', updated);
  return updated;
}

async function deleteRecurringRule(id) {
  return dbDelete('recurringRules', id);
}

function nextDate(dateStr, recurrence) {
  return recurrence === RECURRENCE.MONTHLY ? addMonths(dateStr, 1) : addDays(dateStr, 14);
}

/**
 * Call this once when the app loads. Returns two lists:
 *   due: rules whose nextDueDate has arrived, ready to confirm-and-post
 *   upcoming: rules due within their reminderDaysBefore window (heads-up only)
 * This is how "reminders" work without a background process: we simply
 * check on every app open whether something needs attention.
 */
async function checkDueRecurringRules() {
  const rules = (await dbGetAll('recurringRules')).filter((r) => r.active);
  const today = todayStr();
  const due = [];
  const upcoming = [];

  for (const rule of rules) {
    if (rule.nextDueDate <= today) {
      due.push(rule);
    } else {
      const daysUntil = daysUntilDue(today, rule.nextDueDate);
      if (daysUntil <= rule.reminderDaysBefore) {
        upcoming.push({ ...rule, daysUntil });
      }
    }
  }
  return { due, upcoming };
}

function daysUntilDue(today, dueDate) {
  const a = new Date(today);
  const b = new Date(dueDate);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Posts a due recurring rule as a real transaction, using the amount the
 * user confirmed (which may differ from the rule's stored default), then
 * advances the rule to its next due date, or retires it if it just used
 * its last occurrence.
 */
async function confirmRecurringRule(ruleId, confirmedAmount) {
  const rules = await dbGetAll('recurringRules');
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) throw new Error(`Recurring rule ${ruleId} not found`);

  if (rule.kind === 'income') {
    await addTransaction({
      date: todayStr(),
      type: 'income',
      amount: confirmedAmount,
      accountId: rule.accountId,
      note: rule.name
    });
  } else if (rule.kind === 'transfer') {
    await addTransaction({
      date: todayStr(),
      type: 'transfer',
      amount: confirmedAmount,
      fromAccountId: rule.fromAccountId,
      toAccountId: rule.toAccountId,
      categoryId: rule.categoryId,
      note: rule.name
    });
  } else if (rule.kind === 'expense') {
    await addTransaction({
      date: todayStr(),
      type: 'expense',
      amount: confirmedAmount,
      accountId: rule.accountId,
      categoryId: rule.categoryId,
      note: rule.name
    });
  }

  // Remember the confirmed amount as the new default for next time.
  const updated = {
    ...rule,
    amount: confirmedAmount,
    nextDueDate: nextDate(rule.nextDueDate, rule.recurrence),
    occurrencesRemaining: rule.occurrencesRemaining === null ? null : rule.occurrencesRemaining - 1
  };

  if (updated.occurrencesRemaining !== null && updated.occurrencesRemaining <= 0) {
    updated.active = false; // auto-retires, e.g. after the 4th debt payment
  }

  await dbPut('recurringRules', updated);
  return updated;
}

/** Dismisses a due suggestion for now without posting it (skip this cycle). */
async function skipRecurringRuleThisCycle(ruleId) {
  const rules = await dbGetAll('recurringRules');
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) throw new Error(`Recurring rule ${ruleId} not found`);
  const updated = { ...rule, nextDueDate: nextDate(rule.nextDueDate, rule.recurrence) };
  await dbPut('recurringRules', updated);
  return updated;
}

export {
  createRecurringRule,
  getAllRecurringRules,
  updateRecurringRule,
  deleteRecurringRule,
  checkDueRecurringRules,
  confirmRecurringRule,
  skipRecurringRuleThisCycle
};
