# Juan Personal Finances

A professional-grade personal finance dashboard, benchmarked against
Monarch, Copilot, and YNAB. Runs as a website, saves your data to a free
Supabase database. Argentina-themed, single user, no subscription.

Your Supabase keys are already filled in (`js/config.js`).

## What's new in this rebuild

This update closes the biggest gaps versus commercial finance apps that are
actually achievable without paid bank-sync services:

- **Goals**: set a target amount (and optional date) linked to any account,
  track progress with a visual bar. Shown on the Summary page.
- **Custom categories**: no longer locked to the original 6, add, rename, or
  remove your own from the new Categories manager (Manage menu). "Savings"
  and "Investing" stay protected since the budget math depends on them.
- **Search and pagination** on every transaction table, so it stays usable
  once your history grows past a couple dozen entries.
- **CSV export**, in addition to the full JSON backup, for taxes or opening
  in a spreadsheet.
- **Plain-language monthly insight**: the month-end wrap-up now includes a
  one-line comparison ("You spent 12% less than the previous month").
- **Reorganized navigation**: setup actions (Add Account, Categories,
  Recurring Rules) moved into a "Manage" menu instead of crowding the main
  toolbar, exports moved into an "Export/Backup" menu. Matches how
  Monarch/YNAB separate daily actions from occasional settings.
- **Favicon and search-engine opt-out** for a more finished, private feel.

## One-time setup

### If you're already running the app
Run the small additive migration (safe, doesn't touch existing data):

1. Supabase → SQL Editor → paste in `supabase-migration-goals.sql` → Run

That's it, everything else (categories, search, CSV export) needed no
database changes, they're new fields inside existing records.

### If you're starting completely fresh
1. Run the full `supabase-schema.sql` in the SQL Editor
2. Authentication → Providers → Email → toggle off "Confirm email"
3. Authentication → Providers → Email → toggle off "Allow new users to sign
   up" once you've created your own account (keeps it to you only)

### To wipe everything and start over
Only if you actually want to lose all your data:

```sql
drop table if exists accounts cascade;
drop table if exists transactions cascade;
drop table if exists categories cascade;
drop table if exists budget_rules cascade;
drop table if exists balance_snapshots cascade;
drop table if exists recurring_rules cascade;
drop table if exists app_state cascade;
drop table if exists goals cascade;
```

Then run `supabase-schema.sql` again.

## Hosting it

Push this folder to your GitHub repo (replacing the old files), GitHub
Pages updates automatically at the same URL.

## Using the app

**Navigation**: Summary, Expenses, Income, Savings, Investments tabs across
the top.

**Add Transaction** (primary button): the one action you'll use daily.

**Manage menu**: Add Account, Add Goal, Categories, Add/Manage Recurring
Rules, everything you set up occasionally rather than daily.

**Export/Backup menu** (footer): full JSON backup, CSV export, and restore.

Every transaction, account, recurring rule, and goal can be edited or
deleted from wherever it appears.

## What's still out of scope (and why)

Bank auto-sync (what Monarch/Copilot charge $95-150/year for) requires a
paid third-party aggregator (Plaid, Yodlee, MX) with real per-connection
costs, there's no free way to do this responsibly. Multi-user/household
sharing wasn't requested and adds real complexity (concurrent edits,
permissions) for a single-user app. Both are legitimate future directions if
priorities change, just not free, simple additions.

## Backing up your data anyway

Even with a real database, click Export/Backup → Full Backup occasionally,
good practice regardless of where data lives.
