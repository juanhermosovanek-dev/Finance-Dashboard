// util.js
// Small shared helpers used across models and UI. Kept dependency-free on purpose.

/** Generates a reasonably unique ID without needing an external library. */
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Returns today's date as 'YYYY-MM-DD', used consistently as our date format. */
function todayStr() {
  return dateToStr(new Date());
}

function dateToStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Formats a number as US currency, e.g. 1234.5 -> "$1,234.50" */
function formatMoney(amount) {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Formats a number as a percentage, e.g. 0.6 -> "60%" */
function formatPercent(fraction) {
  return `${Math.round(fraction * 100)}%`;
}

/** Returns 'YYYY-MM' for a given 'YYYY-MM-DD' date string. */
function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

/** Adds N months to a 'YYYY-MM-DD' date string, returns a new date string. */
function addMonths(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1 + n, d);
  return dateToStr(date);
}

/** Adds N days to a 'YYYY-MM-DD' date string, returns a new date string. */
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  return dateToStr(date);
}

/** Returns the number of whole days between two 'YYYY-MM-DD' strings (b - a). */
function daysBetween(aStr, bStr) {
  const a = new Date(aStr);
  const b = new Date(bStr);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export {
  generateId,
  todayStr,
  dateToStr,
  formatMoney,
  formatPercent,
  monthKey,
  addMonths,
  addDays,
  daysBetween
};
