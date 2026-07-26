-- Finance Dashboard: Supabase schema
-- Run this once in the Supabase SQL Editor.
--
-- Design note: each table mirrors one of the app's IndexedDB stores, using a
-- flexible jsonb "data" column instead of rigid typed columns. This keeps
-- the migration simple and matches how the app's model layer already reads
-- and writes whole objects. Every row is locked to the user who created it
-- via Row Level Security, so even though the API key is public in the
-- browser, no user can read or write another user's rows.

create table accounts (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null
);

create table transactions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null
);

create table categories (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null
);

create table budget_rules (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null
);

create table balance_snapshots (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null
);

create table recurring_rules (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null
);

create table app_state (
  key text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null
);

-- Enable Row Level Security and lock every table to its owner.
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table categories enable row level security;
alter table budget_rules enable row level security;
alter table balance_snapshots enable row level security;
alter table recurring_rules enable row level security;
alter table app_state enable row level security;

create policy "Users manage own rows" on accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own rows" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own rows" on categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own rows" on budget_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own rows" on balance_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own rows" on recurring_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own rows" on app_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
