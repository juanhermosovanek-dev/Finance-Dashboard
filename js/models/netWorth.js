// models/netWorth.js
// Net worth = sum of asset balances minus sum of liability balances.
// We snapshot it every time a transaction changes, so trend charts have
// real history instead of only ever showing "right now."

import { dbAdd, dbGetAll } from '../db/db.js';
import { getAllAccounts, getAccountBalance, ACCOUNT_TYPES } from './accounts.js';
import { generateId, todayStr } from '../util.js';

async function calculateNetWorth() {
  const accounts = await getAllAccounts();
  let total = 0;
  const breakdown = [];

  for (const account of accounts) {
    const balance = await getAccountBalance(account.id);
    const isDebtLike = account.type === ACCOUNT_TYPES.LIABILITY || account.type === ACCOUNT_TYPES.CARD;
    const signed = isDebtLike ? -Math.abs(balance) : balance;
    total += signed;
    breakdown.push({ accountId: account.id, name: account.name, type: account.type, balance: signed });
  }

  return { total, breakdown };
}

/**
 * Records a net worth snapshot for a given date. If a snapshot already
 * exists for that exact date, it's overwritten rather than duplicated,
 * so re-editing a same-day transaction doesn't create noise.
 */
async function recordBalanceSnapshot(date = todayStr()) {
  const { total } = await calculateNetWorth();
  const existing = await dbGetAll('balanceSnapshots');
  const sameDay = existing.find((s) => s.date === date);

  const snapshot = {
    id: sameDay ? sameDay.id : generateId('snap'),
    date,
    netWorth: total
  };

  await dbAdd('balanceSnapshots', snapshot).catch(async () => {
    // add() fails if the id already exists; fall back to put() for same-day updates.
    const { dbPut } = await import('../db/db.js');
    await dbPut('balanceSnapshots', snapshot);
  });

  return snapshot;
}

/** Returns all snapshots sorted oldest to newest, for trend charting. */
async function getNetWorthHistory() {
  const snapshots = await dbGetAll('balanceSnapshots');
  return snapshots.sort((a, b) => (a.date > b.date ? 1 : -1));
}

export { calculateNetWorth, recordBalanceSnapshot, getNetWorthHistory };
