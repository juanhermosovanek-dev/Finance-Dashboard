// models/monthEnd.js
// Detects when a new month has started since the app was last opened, so we
// can show a one-time wrap-up of the prior month before the live dashboard.

import { dbGet, dbPut } from '../db/db.js';
import { todayStr, monthKey, addMonths } from '../util.js';
import { getBudgetProgressForMonth } from './budget.js';
import { getNetWorthHistory } from './netWorth.js';

/**
 * Checks if a month-end wrap-up is owed. Returns the summary if so, or null
 * if the user has already seen this month's wrap-up.
 */
async function checkMonthEndWrapUp() {
  const currentMonth = monthKey(todayStr());
  const lastShown = await dbGet('appState', 'lastWrapUpMonth');
  const lastShownMonth = lastShown ? lastShown.value : null;

  if (lastShownMonth === currentMonth) return null; // already shown this month

  // Nothing to summarize on the very first run.
  if (!lastShownMonth) {
    await markWrapUpShown(currentMonth);
    return null;
  }

  const priorMonth = addMonths(`${currentMonth}-01`, -1).slice(0, 7);
  const twoMonthsAgo = addMonths(`${currentMonth}-01`, -2).slice(0, 7);
  const progress = await getBudgetProgressForMonth(priorMonth);
  const priorProgress = await getBudgetProgressForMonth(twoMonthsAgo);
  const history = await getNetWorthHistory();

  const netWorthChange = calculateNetWorthChangeForMonth(history, priorMonth);
  const insight = buildInsight(progress, priorProgress);

  await markWrapUpShown(currentMonth);

  return { month: priorMonth, progress, netWorthChange, insight };
}

/**
 * Builds one plain-language sentence comparing spending to the month
 * before it, the same idea behind the "AI summary" features other finance
 * apps charge a subscription for, just simpler and rule-based.
 */
function buildInsight(current, prior) {
  if (!prior || prior.spending === 0) return null;
  const change = current.spending - prior.spending;
  const pct = Math.round((Math.abs(change) / prior.spending) * 100);
  if (pct < 3) return 'Your spending was about the same as the month before.';
  return change > 0
    ? `You spent ${pct}% more than the previous month.`
    : `You spent ${pct}% less than the previous month, nice work.`;
}

function calculateNetWorthChangeForMonth(history, yearMonth) {
  const inMonth = history.filter((s) => monthKey(s.date) === yearMonth);
  if (inMonth.length === 0) return null;
  const first = inMonth[0].netWorth;
  const last = inMonth[inMonth.length - 1].netWorth;
  return last - first;
}

async function markWrapUpShown(monthStr) {
  await dbPut('appState', { key: 'lastWrapUpMonth', value: monthStr });
}

export { checkMonthEndWrapUp };
