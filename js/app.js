// app.js
// Entry point. Loaded as a module from index.html. Responsible for startup
// sequencing only, all real logic lives in models/ and ui/.

import { openDatabase } from './db/db.js';
import { seedDefaultCategoriesIfNeeded } from './models/categories.js';
import { seedDefaultBudgetRuleIfNeeded } from './models/budget.js';
import { getAllAccounts } from './models/accounts.js';
import { checkMonthEndWrapUp } from './models/monthEnd.js';
import { exportBackup, importBackup } from './models/backup.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderAlerts } from './ui/alerts.js';
import { openAddTransactionForm, openAddAccountForm, openAddRecurringForm } from './ui/forms.js';
import { showMonthEndWrapUp } from './ui/monthEndModal.js';
import { todayStr } from './util.js';

async function refreshApp() {
  const dashboardRoot = document.querySelector('#dashboard-root');
  const alertsRoot = document.querySelector('#alerts-root');
  await renderDashboard(dashboardRoot);
  await renderAlerts(alertsRoot, refreshApp);
}

async function init() {
  await openDatabase();
  await seedDefaultCategoriesIfNeeded();
  await seedDefaultBudgetRuleIfNeeded();

  document.querySelector('#today-date').textContent = todayStr();

  // First-run nudge: if there are no accounts yet, open the add-account form.
  const accounts = await getAllAccounts();
  if (accounts.length === 0) {
    openAddAccountForm(refreshApp);
  }

  document.querySelector('#add-transaction-btn').addEventListener('click', () => {
    openAddTransactionForm(refreshApp);
  });

  document.querySelector('#add-account-btn').addEventListener('click', () => {
    openAddAccountForm(refreshApp);
  });

  document.querySelector('#add-recurring-btn').addEventListener('click', () => {
    openAddRecurringForm(refreshApp);
  });

  document.querySelector('#export-backup-btn').addEventListener('click', () => {
    exportBackup();
  });

  document.querySelector('#import-backup-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const confirmed = confirm(
      'Restoring a backup replaces ALL current data in this app. This cannot be undone. Continue?'
    );
    if (!confirmed) {
      e.target.value = '';
      return;
    }
    try {
      await importBackup(file);
      alert('Backup restored.');
      await refreshApp();
    } catch (err) {
      alert('Could not restore backup: ' + err.message);
    }
    e.target.value = '';
  });

  await refreshApp();

  const wrapUp = await checkMonthEndWrapUp();
  if (wrapUp) showMonthEndWrapUp(wrapUp);
}

init().catch((err) => {
  console.error(err);
  document.querySelector('#dashboard-root').innerHTML =
    `<p style="color:#B5713F">Something went wrong starting the app: ${err.message}</p>`;
});
