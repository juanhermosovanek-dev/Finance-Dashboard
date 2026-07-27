# Juan Personal Finances

A personal finance dashboard that runs as a website and saves your data to a
free Supabase database, so it's not tied to one browser or device.

Your Supabase keys are already filled in (`js/config.js`).

## What's new in this update

- **Fixed: manual transfers to savings/investing weren't counting.** The
  "Add Transaction" transfer form now has a Purpose field, tag a transfer as
  Savings or Investing and it'll count toward your budget targets and show
  up on the new Savings/Investments pages.
- **New Savings page**, mirroring the Investments page: savings account
  balances, emergency fund contributions (month/year/all-time), and history.
- **Monthly and yearly totals** added to Expenses, Income, Investments, and
  Savings, not just "all time."
- **Edit and delete accounts**, from the Accounts table on the Summary,
  Investments, or Savings pages. Deleting an account also deletes every
  transaction tied to it (you're warned first, with the count).
- **Edit and delete recurring rules** after the fact via the new "Manage
  Recurring Rules" button, change the amount, schedule, or stop one
  entirely, not just adjust a single occurrence at confirm time.
- **Interest/growth rate** field added to accounts (savings, investments,
  and loans). Where set, an "Est. in 1 Year" projection shows up next to
  the balance, a simple compounding estimate, not a precise forecast.

## One-time setup

1. **Run the schema** (skip if you already did this): in your Supabase
   project's SQL Editor, paste in `supabase-schema.sql` and run it
2. **Turn off email confirmation** (skip if already done): Authentication →
   Providers → Email → toggle off "Confirm email"

No destructive reset is needed for this update, the database structure is
unchanged (new fields like interest rate just live inside existing records),
so your current data is safe.

### If you ever do want to start completely fresh

Only do this if you actually want to wipe everything:

```sql
drop table if exists accounts cascade;
drop table if exists transactions cascade;
drop table if exists categories cascade;
drop table if exists budget_rules cascade;
drop table if exists balance_snapshots cascade;
drop table if exists recurring_rules cascade;
drop table if exists app_state cascade;
```

Then run the full `supabase-schema.sql` again, refresh the app, and you're
back to a blank slate.

## Hosting it

Push this folder to your GitHub repo (replacing the old files), GitHub
Pages updates automatically at the same URL.

## Using the app

- **Summary**: net worth, budget progress, accounts overview (with
  edit/delete and growth estimates), recent activity
- **Expenses**: every expense, with month/year/all-time totals and a
  category breakdown chart
- **Income**: every paycheck/income entry, with month/year/all-time totals
- **Savings**: your savings accounts and emergency fund contributions
- **Investments**: your investment accounts and contributions
- Every transaction and every account can be edited or deleted, from any
  page
- **Add Recurring Rule** sets up your paycheck, transfers, and temporary
  debt payments. **Manage Recurring Rules** lets you edit or remove them
  later, separate from the one-time "confirm this occurrence" prompt

## Adding to savings or your emergency fund

Use "Add Transaction" → Transfer → pick the Purpose dropdown (Savings or
Investing). This is what makes a transfer count toward your budget targets
and appear on the Savings/Investments pages, an untagged transfer ("Other")
still moves the money but won't count toward either target.

## Interest rates and growth estimates

When adding or editing an account, you can set an annual interest/growth
rate. This is used only to show a rough "Est. in 1 Year" number assuming no
further deposits or withdrawals, monthly compounding. It's a sanity-check
estimate, not investment advice or a guarantee.

## Backing up your data anyway

Even though your data lives in a real database, click "Export Backup"
occasionally, good practice in case you ever forget your password or want a
local copy for your own records.
