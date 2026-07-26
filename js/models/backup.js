// models/backup.js
// Since data lives on one device only, this is the user's entire safety net.
// Export bundles every store into one JSON file; Import wipes and restores.

import { dbGetAll, dbClearAll, dbAdd, STORES } from '../db/db.js';

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

export { exportBackup, importBackup };
