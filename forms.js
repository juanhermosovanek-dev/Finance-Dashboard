// models/transactions.js
// The atomic record of the whole app. Every dollar movement is a transaction.
// Types: 'income', 'expense', 'transfer', 'starting_balance'.
// Transfers use fromAccountId/toAccountId instead of a single accountId.

import { dbAdd, dbGet, dbGetAll, dbGetAllByIndex, dbPut, dbDelete } from '../db/db.js';
import { generateId, todayStr } from '../util.js';
import { recordBalanceSnapshot } from './netWorth.js';

/**
 * Adds a transaction. For income/expense, pass accountId + categoryId (categoryId
 * is required for expenses, ignored for income). For transfers, pass
 * fromAccountId + toAccountId instead of accountId.
 */
async function addTransaction({
  date = todayStr(),
  type,
  amount,
  accountId = null,
  fromAccountId = null,
  toAccountId = null,
  categoryId = null,
  note = ''
}) {
  if (type === 'starting_balance') {
    if (!amount || amount === 0) throw new Error('Starting balance cannot be zero.');
  } else if (!amount || amount <= 0) {
    throw new Error('Transaction amount must be positive.');
  }
  if (type === 'transfer' && (!fromAccountId || !toAccountId)) {
    throw new Error('Transfers require both fromAccountId and toAccountId.');
  }
  if ((type === 'income' || type === 'expense' || type === 'starting_balance') && !accountId) {
    throw new Error(`${type} transactions require an accountId.`);
  }

  const tx = {
    id: generateId('tx'),
    date,
    type,
    amount,
    accountId,
    fromAccountId,
    toAccountId,
    categoryId,
    note,
    createdAt: new Date().toISOString()
  };

  await dbAdd('transactions', tx);

  // Every new transaction shifts balances, so we log a snapshot for trend charts.
  await recordBalanceSnapshot(date);

  return tx;
}

async function getTransaction(id) {
  return dbGet('transactions', id);
}

async function getAllTransactions() {
  const txs = await dbGetAll('transactions');
  return txs.sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
}

/** Returns every transaction touching a given account, either directly or via transfer. */
async function getTransactionsForAccount(accountId) {
  const all = await dbGetAll('transactions');
  return all.filter(
    (tx) => tx.accountId === accountId || tx.fromAccountId === accountId || tx.toAccountId === accountId
  );
}

/** Returns transactions within a date range, inclusive. Dates as 'YYYY-MM-DD'. */
async function getTransactionsBetween(startDate, endDate) {
  const all = await dbGetAll('transactions');
  return all.filter((tx) => tx.date >= startDate && tx.date <= endDate);
}

async function updateTransaction(id, changes) {
  const existing = await dbGet('transactions', id);
  if (!existing) throw new Error(`Transaction ${id} not found`);
  const updated = { ...existing, ...changes };
  await dbPut('transactions', updated);
  await recordBalanceSnapshot(updated.date);
  return updated;
}

async function deleteTransaction(id) {
  const existing = await dbGet('transactions', id);
  await dbDelete('transactions', id);
  if (existing) await recordBalanceSnapshot(existing.date);
  return id;
}

export {
  addTransaction,
  getTransaction,
  getAllTransactions,
  getTransactionsForAccount,
  getTransactionsBetween,
  updateTransaction,
  deleteTransaction
};
