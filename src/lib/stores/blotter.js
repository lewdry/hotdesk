import { writable } from 'svelte/store';
import { openDB } from 'idb';

const DB_NAME = 'hotdesk';
const STORE_NAME = 'blotter';
const KEY = 'content';

let db;

async function getDB() {
  if (!db) {
    db = await openDB(DB_NAME, 1, {
      upgrade(database) {
        database.createObjectStore(STORE_NAME);
      }
    });
  }
  return db;
}

async function load() {
  try {
    const database = await getDB();
    return (await database.get(STORE_NAME, KEY)) ?? '';
  } catch {
    return '';
  }
}

async function save(value) {
  try {
    const database = await getDB();
    await database.put(STORE_NAME, value, KEY);
  } catch {
    // Silently fail — content remains in memory
  }
}

async function clear() {
  try {
    const database = await getDB();
    await database.delete(STORE_NAME, KEY);
  } catch {
    // ignore
  }
}

// Create the store with an empty initial value
const { subscribe, set, update } = writable('');

// Debounce timer
let saveTimer;

function debouncedSet(value) {
  set(value);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save(value), 400);
}

// Initialise from IndexedDB
load().then(set);

export const blotter = {
  subscribe,
  set: debouncedSet,
  async clear() {
    set('');
    clearTimeout(saveTimer);
    await clear();
  }
};
