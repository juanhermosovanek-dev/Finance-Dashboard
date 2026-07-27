// app.js
// Entry point. Loaded as a module from index.html. Responsible for startup
// sequencing and page routing, all real logic lives in models/ and ui/.

import { openDatabase } from './db/db.js';
import { getSession, signOut } from './auth.js';
import { renderLoginScreen } from './ui/loginScreen.js';
import { seedDefaultCategoriesIfNeeded } from './models/categories.js';
import { seedDefaultBudgetRuleIfNeeded } from './models/budget.js';
import { getAllAccounts } from './models/accounts.js';
import { checkMonthEndWrapUp } from './models/monthEnd.js';
import { exportBackup, importBackup } from './models/backup.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderExpensesPage } from './ui/pages/expenses.js';
import { renderIncomePage } from './ui/pages/income.js';
import { renderSavingsPage } from './ui/pages/savings.js';
import { renderInvestmentsPage } from './ui/pages/investments.js';
import { renderAlerts } from './ui/alerts.js';
import { openAddTransactionForm, openAddAccountForm, openAddRecurringForm } from './ui/forms.js';
import { openRecurringRulesModal } from './ui/recurringRulesModal.js';
import { showMonthEndWrapUp } from './ui/monthEndModal.js';
import { todayStr } from './util.js';

const PAGES = {
  summary: renderDashboard,
  expenses: renderExpensesPage,
  income: renderIncomePage,
  savings: renderSavingsPage,
  investments: renderInvestmentsPage
};

let currentPage = 'summary';

async function renderCurrentPage() {
  const pageRoot = document.querySelector('#page-root');
  const renderFn = PAGES[currentPage];
  await renderFn(pageRoot, refreshApp);
}

async function refreshApp() {
  const alertsRoot = document.querySelector('#alerts-root');
  await renderCurrentPage();
  await renderAlerts(alertsRoot, refreshApp);
}

function setActivePage(page) {
  currentPage = page;
  document.querySelectorAll('.nav-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
  renderCurrentPage();
}

/** Decides whether to show the login screen or the main app. */
async function start() {
  const session = await getSession();
  if (session) {
    showApp();
    await initApp();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.querySelector('#login-root').style.display = 'block';
  document.querySelector('#app-root').style.display = 'none';
  renderLoginScreen(document.querySelector('#login-root'), async () => {
    showApp();
    await initApp();
  });
}

function showApp() {
  document.querySelector('#login-root').style.display = 'none';
  document.querySelector('#app-root').style.display = 'block';
}

async function initApp() {
  await openDatabase();
  // Seeding failures shouldn't take down the whole app, worst case the
  // categories or budget rule get created on a later visit instead.
  try {
    await seedDefaultCategoriesIfNeeded();
    await seedDefaultBudgetRuleIfNeeded();
  } catch (err) {
    console.warn('Startup seeding had an issue (non-fatal):', err.message);
  }

  document.querySelector('#today-date').textContent = todayStr();

  document.querySelectorAll('.nav-tab').forEach((btn) => {
    btn.addEventListener('click', () => setActivePage(btn.dataset.page));
  });

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

  document.querySelector('#manage-recurring-btn').addEventListener('click', () => {
    openRecurringRulesModal(refreshApp);
  });

  document.querySelector('#export-backup-btn').addEventListener('click', () => {
    exportBackup();
  });

  document.querySelector('#sign-out-btn').addEventListener('click', async () => {
    await signOut();
    window.location.reload();
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

  // Same principle as the seeding step above: this is a nice-to-have, it
  // should never be able to take the whole app down if it hits a snag.
  try {
    const wrapUp = await checkMonthEndWrapUp();
    if (wrapUp) showMonthEndWrapUp(wrapUp);
  } catch (err) {
    console.warn('Month-end wrap-up check had an issue (non-fatal):', err.message);
  }
}

start().catch((err) => {
  console.error(err);
  document.body.innerHTML =
    `<p style="color:#DC2626;font-family:sans-serif;padding:40px;">Something went wrong starting the app: ${err.message}</p>`;
});
