import { writable } from 'svelte/store';
import { openDB } from 'idb';

const DB_NAME = 'hotdesk';
const STORE_NAME = 'blotter';
const KEY = 'content';
const DRAFT_KEY = 'hotdesk:draft';

const WELCOME_TEXT = `# Welcome to Hotdesk

A local-first, minimal notepad.

**Hotdesk** is a private "read-write" home page. It is a tool for thinking, jotting and drafting without the cloud.

---

## How it works

*   **Automatic Saving:** Your work is stored in your browser's local storage as you type.
*   **Persistence:** Your text remains here if you close the tab, restart your device or go offline.
*   **Privacy:** No tracking and no sync. Your data never leaves this device. 

---

## Getting started 

Delete this text to start fresh, or select **New**.

If you want to share, select **Save** to export your work as a universal \`.md\` (markdown) file.

---

## Formatting toolbar

Use the toolbar to style your text:
*   **B**, *I*, ~~S~~ - bold, italic, strikethrough
*   **H1**, **H2**, **¶** - headings and body text
*   **•**, **1.**, **"** - lists and blockquotes
*   Type \`--\` on a blank line to insert a horizontal rule

---

> **Hotdesk**
> A persistent, distraction-free notepad by Lewis Dryburgh.`;

let db;
let saveTimer;
let latestValue = '';
let lifecycleBound = false;
const storageSupport = {
  indexedDB: null,
  localStorage: null
};
const sessionContext = {
  privateBrowsing: false,
  checked: false
};

export const persistence = writable({
  mode: 'persistent',
  message: ''
});

function updatePersistence() {
  if (sessionContext.privateBrowsing) {
    persistence.set({
      mode: 'private',
      message: 'Private browsing detected. Your notes will be cleared when this private window closes.'
    });
    return;
  }

  const { indexedDB, localStorage } = storageSupport;

  if (indexedDB === false && localStorage === false) {
    persistence.set({
      mode: 'memory',
      message: 'Storage is unavailable. This session will reset when you close the tab.'
    });
    return;
  }

  if (indexedDB === false) {
    persistence.set({
      mode: 'degraded',
      message: 'Using fallback browser storage. Recent work will still persist, but IndexedDB is unavailable.'
    });
    return;
  }

  persistence.set({
    mode: 'persistent',
    message: ''
  });
}

function markStorage(kind, ok) {
  storageSupport[kind] = ok;
  updatePersistence();
}

function markPrivateBrowsing(isPrivate) {
  sessionContext.privateBrowsing = isPrivate;
  sessionContext.checked = true;
  updatePersistence();
}

async function detectPrivateBrowsing() {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent;
  const isChromium = /Chrome|Chromium|CriOS|Edg\//.test(userAgent) && !/OPR\//.test(userAgent);

  if (isChromium && 'webkitRequestFileSystem' in window) {
    try {
      await new Promise((resolve, reject) => {
        window.webkitRequestFileSystem(window.TEMPORARY, 1, resolve, reject);
      });
      return false;
    } catch {
      return true;
    }
  }

  if (navigator.storage?.estimate) {
    try {
      const { quota } = await navigator.storage.estimate();
      if (typeof quota === 'number' && quota > 0 && quota < 120 * 1024 * 1024) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

function readDraft() {
  try {
    const value = window.localStorage.getItem(DRAFT_KEY);
    markStorage('localStorage', true);
    return value;
  } catch {
    markStorage('localStorage', false);
    return null;
  }
}

function writeDraft(value) {
  try {
    window.localStorage.setItem(DRAFT_KEY, value);
    markStorage('localStorage', true);
    return true;
  } catch {
    markStorage('localStorage', false);
    return false;
  }
}

function bindLifecycleFlush() {
  if (lifecycleBound || typeof window === 'undefined') return;

  const flushDraft = () => {
    clearTimeout(saveTimer);
    void save(latestValue);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushDraft();
    }
  });
  window.addEventListener('pagehide', flushDraft);
  lifecycleBound = true;
}

async function getDB() {
  if (!db) {
    try {
      db = await openDB(DB_NAME, 1, {
        upgrade(database) {
          database.createObjectStore(STORE_NAME);
        }
      });
      markStorage('indexedDB', true);
    } catch (error) {
      markStorage('indexedDB', false);
      throw error;
    }
  }
  return db;
}

async function load() {
  const draft = typeof window === 'undefined' ? null : readDraft();
  if (draft !== null) {
    return { content: draft, isFirstVisit: false };
  }

  try {
    const database = await getDB();
    const stored = await database.get(STORE_NAME, KEY);
    if (stored !== undefined) {
      writeDraft(stored);
      return { content: stored, isFirstVisit: false };
    }
    await database.put(STORE_NAME, WELCOME_TEXT, KEY);
    markStorage('indexedDB', true);
    writeDraft(WELCOME_TEXT);
    return { content: WELCOME_TEXT, isFirstVisit: true };
  } catch {
    return { content: WELCOME_TEXT, isFirstVisit: false };
  }
}

async function save(value) {
  latestValue = value;
  writeDraft(value);

  try {
    const database = await getDB();
    await database.put(STORE_NAME, value, KEY);
    markStorage('indexedDB', true);
  } catch {
    markStorage('indexedDB', false);
  }
}

// Create the store with an empty initial value
const { subscribe, set, update } = writable('');

function debouncedSet(value) {
  latestValue = value;
  set(value);
  writeDraft(value);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save(value), 400);
}

async function requestPersistence() {
  markPrivateBrowsing(await detectPrivateBrowsing());

  if (navigator.storage?.persist) {
    try {
      await navigator.storage.persist();
    } catch {
      // Ignore persistence request failures and rely on capability checks above.
    }
  }
}

// Initialise from IndexedDB — resolves true if this was a first visit
export const firstVisit = Promise.all([load(), requestPersistence()]).then(([content]) => {
  latestValue = content.content;
  set(content.content);
  bindLifecycleFlush();
  return content.isFirstVisit;
});

export const blotter = {
  subscribe,
  set: debouncedSet,
  async clear() {
    latestValue = '';
    set('');
    writeDraft('');
    clearTimeout(saveTimer);
    await save('');
  },
  async reset() {
    latestValue = WELCOME_TEXT;
    clearTimeout(saveTimer);
    set(WELCOME_TEXT);
    writeDraft(WELCOME_TEXT);
    await save(WELCOME_TEXT);
  }
};
