import { writable } from 'svelte/store';
import { openDB } from 'idb';

const DB_NAME = 'hotdesk';
const STORE_NAME = 'blotter';
const KEY = 'content';

const WELCOME_TEXT = `# Welcome to Hotdesk

The web should be a place to create, not just browse. 

**Hotdesk** is a "read-write" home page: a minimal notepad to think, link and build. 

---

## How to use this space

As you type, your work is saved automatically to your browser's local storage. 

*   **Persistence:** Your text remains here if you close the tab, restart your device or go offline.
*   **Focus:** Use this as a scratchpad for daily tasks, a personal journal or a library for your most-used links.
*   **Privacy:** No tracking. Your data doesn't leave your device, unless you share it.

---

## Getting started. 

Select **New** to open a blank page, or start writing below. Use the toolbar to apply formatting. Your work is saved automatically.

When you are ready to share your notes, use **File > Save** to export your work as a universal \`.md\` file.

---

## Formatting toolbar

Use the toolbar to apply formatting to selected text, or select before typing:
*   **B**, *I*, <u>U</u>, ~~S~~ — inline styles (bold, italic, underline, strikethrough)
*   **H1**, **H2**, **¶** — headings and body text
*   **•**, **1.**, **"** — lists and blockquotes
*   Type \`--\` on a blank line to insert a horizontal rule

---

> **Hotdesk**
> A persistent, distraction-free notepad by Lewis Dryburgh.`;

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
    const stored = await database.get(STORE_NAME, KEY);
    if (stored !== undefined) return stored;
    await database.put(STORE_NAME, WELCOME_TEXT, KEY);
    return WELCOME_TEXT;
  } catch {
    return WELCOME_TEXT;
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

// Initialise from IndexedDB — resolves true if this was a first visit
export const firstVisit = load().then(content => {
  set(content);
  return content === WELCOME_TEXT;
});

export const blotter = {
  subscribe,
  set: debouncedSet,
  async clear() {
    set('');
    clearTimeout(saveTimer);
    await clear();
  },
  async reset() {
    clearTimeout(saveTimer);
    set(WELCOME_TEXT);
    await save(WELCOME_TEXT);
  }
};
