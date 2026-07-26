# Finance Dashboard

A personal finance dashboard that runs entirely in your browser. No server,
no account, no cloud, no subscription. Your data lives in this browser's
IndexedDB storage on this device only.

## How to run it

Browsers block JavaScript modules from loading over a plain `file://` link,
so you need a tiny local server to view the app. You only need one of these
(pick whichever you already have installed):

**Option A: Python (most Macs/Linux already have this)**
```
cd finance-dashboard
python3 -m http.server 8000
```
Then open http://localhost:8000 in your browser.

**Option B: Node.js**
```
cd finance-dashboard
npx http-server -p 8000
```
Then open http://localhost:8000 in your browser.

Leave the terminal window open while you use the app; closing it stops the
server. Your data itself is saved in the browser, not in the terminal, so
closing the terminal does not erase anything you've entered.

## First time setup

1. Open the app. Since there are no accounts yet, it'll immediately prompt
   you to add one. Add your checking, savings, cards, investment account,
   and the debt (as a "Debt / Liability" account) with today's actual balance
   as the starting balance for each.
2. Click "Add Recurring Rule" to set up:
   - Your paycheck (Income, biweekly or monthly, whatever matches reality)
   - The automatic transfer from checking to savings (tag: Savings)
   - The automatic transfer from checking to investing (tag: Investing)
   - The college debt payment: choose "Fixed debt payment," set it to 4
     occurrences, monthly, ~$875 (or whatever your actual split is)
3. From then on, just use "Add Transaction" for day-to-day spending. Anything
   recurring will show up as a banner at the top of the dashboard when it's
   due, you just confirm the amount.

## Backing up your data

Since everything lives only on this device, click "Export Backup" in the
footer regularly (e.g. after your weekly review) and save the resulting
`.json` file somewhere safe, like a cloud drive folder. "Restore Backup"
lets you load that file back in, on this device or a new one, but it fully
replaces whatever is currently in the app, so use it carefully.

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
