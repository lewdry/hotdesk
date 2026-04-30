import { writable } from 'svelte/store';
import { openDB } from 'idb';

const DB_NAME = 'hotdesk';
const STORE_NAME = 'blotter';
const KEY = 'content';

const WELCOME_TEXT = `# Welcome to Hotdesk v1.0

The web should be a place to create, not just browse. **Hotdesk** is a "read-write" home page: a private space to think, link and build. 

It is a quiet corner of the digital world that belongs to you.

---

### How to use this space

Hotdesk is a **Markdown-enabled** editor. As you type, your work is saved automatically to your browser's local storage. 

*   **Persistence:** Your text remains here even if you close the tab, restart your computer, or go offline.
*   **Focus:** Use this as a scratchpad for daily tasks, a personal journal, or a library for your most-used links.
*   **Privacy:** No tracking and no cloud. Your data never leaves your device.

### Markdown Cheat Sheet

Structure your thoughts with simple shortcuts:
*   Use \`#\` for headers
*   Use \`**bold**\` for **emphasis**
*   Use \`*\` or \`-\` for bulleted lists
*   Use \`[Link Name](URL)\` to create links

---

**Getting started.** Select **New** to start a blank document, or toggle **Markdown** to edit this text.

When you are ready to move your notes, use **File > Save** to export your work as a universal \`.md\` file.

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
