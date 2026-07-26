// db.js
// This is the ONLY file that talks to IndexedDB directly.
// Every other file in the app goes through the functions exported here.
// Keeping all the IndexedDB-specific code in one place means if we ever
// need to change how data is stored, this is the only file that changes.

const DB_NAME = 'financeDashboard';
const DB_VERSION = 1;

// Object stores (IndexedDB's version of tables) and their indexes.
// keyPath is the field used as the unique ID for each record.
const STORES = {
  accounts: { keyPath: 'id', indexes: [] },
  transactions: {
    keyPath: 'id',
    indexes: [
      { name: 'date', keyPath: 'date' },
      { name: 'accountId', keyPath: 'accountId' },
      { name: 'categoryId', keyPath: 'categoryId' },
      { name: 'type', keyPath: 'type' }
    ]
  },
  categories: { keyPath: 'id', indexes: [] },
  budgetRules: { keyPath: 'id', indexes: [] },
  balanceSnapshots: {
    keyPath: 'id',
    indexes: [{ name: 'date', keyPath: 'date' }]
  },
  recurringRules: { keyPath: 'id', indexes: [] },
  appState: { keyPath: 'key' } // small key/value store for things like "last month-end shown"
};

let dbInstance = null;

/**
 * Opens (or creates/upgrades) the database. Called once at app startup.
 * Returns a promise that resolves to the open database connection.
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      for (const [storeName, config] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: config.keyPath });
          (config.indexes || []).forEach((idx) => {
            store.createIndex(idx.name, idx.keyPath, { unique: false });
          });
        }
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(new Error('Failed to open database: ' + event.target.error));
    };
  });
}

/**
 * Runs a function inside a transaction against one store.
 * mode is 'readonly' or 'readwrite'.
 */
function withStore(storeName, mode, callback) {
  return new Promise((resolve, reject) => {
    if (!dbInstance) {
      reject(new Error('Database not open yet. Call openDatabase() first.'));
      return;
    }
    const tx = dbInstance.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;

    try {
      result = callback(store);
    } catch (err) {
      reject(err);
      return;
    }

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// --- Generic CRUD helpers used by every model file ---

function dbAdd(storeName, record) {
  return withStore(storeName, 'readwrite', (store) => {
    store.add(record);
    return record;
  });
}

function dbPut(storeName, record) {
  return withStore(storeName, 'readwrite', (store) => {
    store.put(record);
    return record;
  });
}

function dbDelete(storeName, id) {
  return withStore(storeName, 'readwrite', (store) => {
    store.delete(id);
    return id;
  });
}

function dbGet(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = dbInstance.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = dbInstance.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAllByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const tx = dbInstance.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const req = index.getAll(value);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** Wipes every store. Used only by "Restore Backup" before re-importing. */
function dbClearAll() {
  return Promise.all(Object.keys(STORES).map((storeName) =>
    withStore(storeName, 'readwrite', (store) => store.clear())
  ));
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
