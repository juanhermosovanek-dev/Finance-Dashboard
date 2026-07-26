# Juan Personal Finances

A personal finance dashboard that runs as a website but saves your data to a
free Supabase database, so it's not tied to one browser or device, and
clearing your browser cache won't erase anything.

Your Supabase keys are already filled in (`js/config.js`). You still need to
run the database schema once, see below.

## One-time setup

1. **Run the schema**: in your Supabase project, open the SQL Editor, paste
   in the contents of `supabase-schema.sql` (included in this folder), and
   run it. Skip this step if you already ran it before.
2. **Turn off email confirmation** (if you haven't already): Authentication
   → Providers → Email → toggle off "Confirm email"

## Hosting it

Push this folder to your GitHub repo (replacing the old files) and GitHub
Pages will pick up the changes automatically, same URL as before.

## What's new in this version

- **Edit and delete** any transaction, from the Edit/Delete links on any row
- **Confirmation prompt** before every transaction is saved or deleted, so
  nothing posts by accident
- **Four pages**, via the tabs at the top:
  - **Summary** — the original overview: net worth, budget progress, cash flow
  - **Expenses** — every expense, with this-month and all-time totals
  - **Income** — every paycheck/income entry, with totals
  - **Investments** — your investment account balances and their history
- **Negative balances display correctly**, in red, wherever they occur (a
  credit card you're carrying a balance on, debt, overspending). Account
  balances were never artificially floored at zero, they just weren't
  visually distinguished before; now negative numbers are always red,
  positive always green.
- **New look**: Argentina-themed (light blue/white, gold accent), with a
  logo and the tab navigation described above

## First time using the app

1. Open the site, sign in (or create an account if this is your first time)
2. Add your accounts: checking, savings, cards, investment account, and the
   debt (as a "Debt / Liability" account), each with today's actual balance
3. Click "Add Recurring Rule" to set up your paycheck, the automatic
   transfers to savings/investing, and the 4-payment debt schedule
4. Use "Add Transaction" for day-to-day spending, or edit/delete existing
   ones directly from any of the four pages

## Backing up your data anyway

Even though your data lives in a real database now, click "Export Backup"
occasionally, good practice in case you ever forget your password or want a
local copy for your own records.



## Project structure

```
finance-dashboard/
├── index.html          Entry point
├── css/styles.css       All styling / design tokens
├── js/
│   ├── app.js            Startup sequencing, wires everything together
│   ├── util.js            Shared helpers (dates, money formatting, IDs)
│   ├── db/db.js            The only file that talks to IndexedDB directly
│   ├── models/            Business logic, no DOM code here
│   │   ├── accounts.js       Accounts + balance calculation
│   │   ├── categories.js     The 6 spending/savings categories
│   │   ├── transactions.js   Income/expense/transfer records
│   │   ├── budget.js         60/15/25 targets and progress
│   │   ├── netWorth.js       Net worth calculation + history snapshots
│   │   ├── recurring.js      Recurring rules (paycheck, transfers, debt)
│   │   ├── monthEnd.js       Month-end wrap-up detection
│   │   └── backup.js         Export/import JSON backup
│   └── ui/                DOM rendering, no business logic here
│       ├── dashboard.js      Main dashboard cards + transaction list
│       ├── forms.js           Add transaction / account / recurring rule
│       ├── alerts.js          Due/upcoming recurring rule banners
│       ├── monthEndModal.js  Month-end wrap-up dialog
│       └── chart.js           Net worth trend line (plain SVG, no library)
```

## What's next (Phase 6 candidates, not built yet)

Multi-currency support, detailed per-holding investment tracking, retirement
projections, receipt attachments, and syncing across devices were all
deliberately left out of this version to keep the first build simple and
reliable. Any of these can be added later without restructuring what's here.
