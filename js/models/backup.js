// models/backup.js
// Since data lives on one device only, this is the user's entire safety net.
// Export bundles every store into one JSON file; Import wipes and restores.

import { dbGetAll, dbClearAll, dbAdd, STORES } from '../db/db.js';
import { getAllTransactions } from './transactions.js';
import { getAllAccounts } from './accounts.js';
import { getAllCategories } from './categories.js';

async function exportBackup() {
  const data = {};
  for (const storeName of Object.keys(STORES)) {
    data[storeName] = await dbGetAll(storeName);
  }
  const payload = {
    appName: 'financeDashboard',
    exportedAt: new Date().toISOString(),
    data
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Restores from a backup file. This is destructive: it clears all existing
 * data first. The caller is responsible for confirming with the user before
 * calling this.
 */
async function importBackup(file) {
  const text = await file.text();
  const payload = JSON.parse(text);

  if (!payload.data || payload.appName !== 'financeDashboard') {
    throw new Error('This does not look like a valid finance dashboard backup file.');
  }

  await dbClearAll();

  for (const [storeName, records] of Object.entries(payload.data)) {
    if (!STORES[storeName]) continue; // ignore unknown stores, e.g. from a future version
    for (const record of records) {
      await dbAdd(storeName, record);
    }
  }

  return payload;
}

export { exportBackup, importBackup, exportTransactionsCSV };

/**
 * Exports every transaction as a CSV file, the format spreadsheets and tax
 * software actually expect. This is separate from the JSON backup, which
 * exists to restore the app itself, not to be opened in Excel.
 */
async function exportTransactionsCSV() {
  const [transactions, accounts, categories] = await Promise.all([
    getAllTransactions(),
    getAllAccounts(),
    getAllCategories()
  ]);
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const header = ['Date', 'Type', 'Amount', 'Account', 'From Account', 'To Account', 'Category', 'Note'];
  const rows = transactions.map((tx) => [
    tx.date,
    tx.type,
    tx.amount,
    accountById[tx.accountId] || '',
    accountById[tx.fromAccountId] || '',
    accountById[tx.toAccountId] || '',
    categoryById[tx.categoryId] || '',
    tx.note || ''
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
