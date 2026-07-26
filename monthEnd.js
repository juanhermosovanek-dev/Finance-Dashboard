// models/accounts.js
// Accounts never have their balance edited directly (except the one-time
// starting balance). Current balance is always derived from transactions,
// so the numbers can't silently drift from reality.

import { dbAdd, dbGet, dbGetAll, dbPut, dbDelete } from '../db/db.js';
import { generateId, todayStr } from '../util.js';

export const ACCOUNT_TYPES = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  CARD: 'card',
  INVESTMENT: 'investment',
  LIABILITY: 'liability' // e.g. the college debt, or any other loan/card balance owed
};

/**
 * Creates a new account with a starting balance.
 * This starting balance is logged as a special one-time transaction
 * (type "starting_balance") so it still flows through the same math
 * as everything else, rather than being a special-cased field.
 */
async function createAccount({ name, type, startingBalance = 0, interestRate = null }) {
  const account = {
    id: generateId('acct'),
    name,
    type,
    interestRate, // relevant mainly for liabilities; null if not applicable
    createdAt: todayStr()
  };
  await dbAdd('accounts', account);

  if (startingBalance !== 0) {
    const { addTransaction } = await import('./transactions.js');
    await addTransaction({
      date: account.createdAt,
      type: 'starting_balance',
      accountId: account.id,
      amount: startingBalance,
      categoryId: null,
      note: 'Starting balance'
    });
  }

  return account;
}

async function getAccount(id) {
  return dbGet('accounts', id);
}

async function getAllAccounts() {
  return dbGetAll('accounts');
}

async function updateAccount(id, changes) {
  const existing = await dbGet('accounts', id);
  if (!existing) throw new Error(`Account ${id} not found`);
  const updated = { ...existing, ...changes };
  await dbPut('accounts', updated);
  return updated;
}

async function deleteAccount(id) {
  return dbDelete('accounts', id);
}

/**
 * Calculates an account's current balance by summing every transaction
 * that touches it. Transfers out are negative, transfers in are positive,
 * income is positive, expenses are negative.
 */
async function getAccountBalance(accountId) {
  const { getTransactionsForAccount } = await import('./transactions.js');
  const txs = await getTransactionsForAccount(accountId);
  return txs.reduce((sum, tx) => sum + signedAmountForAccount(tx, accountId), 0);
}

/**
 * A transaction's amount is stored as a positive number with a type and,
 * for transfers, a fromAccountId/toAccountId. This figures out whether a
 * given account should see that amount as positive or negative.
 */
function signedAmountForAccount(tx, accountId) {
  if (tx.type === 'income' || tx.type === 'starting_balance') return tx.amount;
  if (tx.type === 'expense') return -tx.amount;
  if (tx.type === 'transfer') {
    if (tx.fromAccountId === accountId) return -tx.amount;
    if (tx.toAccountId === accountId) return tx.amount;
    return 0;
  }
  return 0;
}

export {
  createAccount,
  getAccount,
  getAllAccounts,
  updateAccount,
  deleteAccount,
  getAccountBalance,
  signedAmountForAccount
};
