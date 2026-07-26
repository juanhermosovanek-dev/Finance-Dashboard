// db.js
// This is the ONLY file that talks to Supabase directly.
// Every other file in the app goes through the functions exported here,
// exactly like before. This file swaps the storage backend from IndexedDB
// to Supabase without any other file needing to change, because the
// function names and behavior are kept identical to the original version.

import { supabase } from './supabaseClient.js';

// Maps our internal store names to actual Supabase table names (snake_case).
const TABLE_NAMES = {
  accounts: 'accounts',
  transactions: 'transactions',
  categories: 'categories',
  budgetRules: 'budget_rules',
  balanceSnapshots: 'balance_snapshots',
  recurringRules: 'recurring_rules',
  appState: 'app_state'
};

// The primary key column name differs only for appState ('key' vs 'id').
const KEY_COLUMNS = {
  accounts: 'id',
  transactions: 'id',
  categories: 'id',
  budgetRules: 'id',
  balanceSnapshots: 'id',
  recurringRules: 'id',
  appState: 'key'
};

const STORES = TABLE_NAMES; // kept for compatibility with model files that import STORES

let cachedUserId = null;

async function getCurrentUserId() {
  if (cachedUserId) return cachedUserId;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not signed in.');
  cachedUserId = data.user.id;
  return cachedUserId;
}

/**
 * Called once at app startup. Unlike the IndexedDB version, there's no
 * database connection to open, but we keep this function so app.js doesn't
 * need to change. It just confirms a user is signed in.
 */
async function openDatabase() {
  await getCurrentUserId();
  return true;
}

function keyFieldFor(storeName) {
  return KEY_COLUMNS[storeName];
}

async function dbAdd(storeName, record) {
  const table = TABLE_NAMES[storeName];
  const keyField = keyFieldFor(storeName);
  const userId = await getCurrentUserId();

  const row = { [keyField]: record[keyField], user_id: userId, data: record };
  const { error } = await supabase.from(table).insert(row);
  if (error) throw new Error(error.message);
  return record;
}

async function dbPut(storeName, record) {
  const table = TABLE_NAMES[storeName];
  const keyField = keyFieldFor(storeName);
  const userId = await getCurrentUserId();

  const row = { [keyField]: record[keyField], user_id: userId, data: record };
  const { error } = await supabase.from(table).upsert(row, { onConflict: keyField });
  if (error) throw new Error(error.message);
  return record;
}

async function dbDelete(storeName, id) {
  const table = TABLE_NAMES[storeName];
  const keyField = keyFieldFor(storeName);
  const { error } = await supabase.from(table).delete().eq(keyField, id);
  if (error) throw new Error(error.message);
  return id;
}

async function dbGet(storeName, id) {
  const table = TABLE_NAMES[storeName];
  const keyField = keyFieldFor(storeName);
  const { data, error } = await supabase.from(table).select('data').eq(keyField, id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? data.data : null;
}

async function dbGetAll(storeName) {
  const table = TABLE_NAMES[storeName];
  const { data, error } = await supabase.from(table).select('data');
  if (error) throw new Error(error.message);
  return (data || []).map((row) => row.data);
}

/**
 * The IndexedDB version used real indexes for this. Supabase/Postgres can
 * do this with a jsonb filter, but for personal-scale data (hundreds or a
 * few thousand transactions, not millions) it's simpler and plenty fast to
 * fetch everything and filter in JavaScript, same result, less to maintain.
 */
async function dbGetAllByIndex(storeName, indexKey, value) {
  const all = await dbGetAll(storeName);
  return all.filter((record) => record[indexKey] === value);
}

async function dbClearAll() {
  const userId = await getCurrentUserId();
  for (const table of Object.values(TABLE_NAMES)) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) throw new Error(error.message);
  }
}

export {
  openDatabase,
  dbAdd,
  dbPut,
  dbDelete,
  dbGet,
  dbGetAll,
  dbGetAllByIndex,
  dbClearAll,
  STORES
};
