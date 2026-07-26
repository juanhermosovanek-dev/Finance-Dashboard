# Juan Personal Finances

A personal finance dashboard that runs as a website but saves your data to a
free Supabase database, so it's not tied to one browser or device, and
clearing your browser cache won't erase anything.

Your Supabase keys are already filled in (`js/config.js`).

## What's new in this update

- **Fixed the credit card bug**: a card's "amount owed" was being treated
  like an asset instead of debt. Now, when adding a Credit Card or Loan/Debt
  account, you just type what you owe as a positive number and the app
  handles the sign correctly. If you already have a card with the wrong
  balance from before, see "Fixing an existing account" below.
- **Removed the dedicated debt box**: your college debt doesn't need its
  own account or dashboard card. Set it up as a "Temporary debt payment"
  recurring rule (Add Recurring Rule), it'll show up as a normal expense
  that automatically stops after its last payment.
- **Removed the redundant target text** under "This Month Spending" and
  "Emergency Fund," replaced with a short on-track/behind status instead.
- **Added an Accounts overview** on the Summary page, showing every
  account's real balance, in red if negative.
- **Added two donut charts**: where this month's income went (Summary page)
  and this month's spending by category (Expenses page).
- Debt-payment recurring rules now correctly count toward your 60% spending
  target (they were silently uncategorized before).

## Fixing an existing account with the wrong balance

If you already added a credit card and its "starting balance" is showing as
a positive number instead of debt: go to the Summary page, find the
"Starting balance" entry for that account in Recent Transactions (or Edit
any transaction from that account if that's easier), click Edit, and enter
the amount as negative (e.g. -500). If it's easier, just delete that account
and re-add it, the fixed form will handle the sign correctly this time.

## One-time setup

1. **Run the schema** (skip if you already did this): in your Supabase
   project's SQL Editor, paste in `supabase-schema.sql` and run it
2. **Turn off email confirmation** (skip if already done): Authentication →
   Providers → Email → toggle off "Confirm email"

## Hosting it

Push this folder to your GitHub repo (replacing the old files), GitHub
Pages updates automatically at the same URL.

## Using the app

- **Summary**: net worth, budget progress, accounts overview, recent activity
- **Expenses**: every expense, with monthly/all-time totals and a category
  breakdown chart
- **Income**: every paycheck/income entry, with totals
- **Investments**: your investment account balances and their history
- Every transaction can be edited or deleted from any page
- "Add Recurring Rule" sets up your paycheck, automatic savings/investing
  transfers, and any temporary debt payments

## Backing up your data anyway

Even though your data lives in a real database, click "Export Backup"
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
