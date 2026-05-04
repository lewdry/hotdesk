import { writable } from 'svelte/store';

function applyTheme(dark) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#2A2A2A' : '#c0c0c0');
}

function resolveInitial() {
  try {
    const stored = localStorage.getItem('hotdesk:theme');
    if (stored === 'dark' || stored === 'light') return stored === 'dark';
  } catch (_) { /* private mode or storage blocked */ }
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const initialDark = resolveInitial();
applyTheme(initialDark);

const { subscribe, update } = writable(initialDark);

export const isDark = { subscribe };

export function toggleTheme() {
  update(dark => {
    const next = !dark;
    applyTheme(next);
    try {
      localStorage.setItem('hotdesk:theme', next ? 'dark' : 'light');
    } catch (_) { /* storage unavailable */ }
    return next;
  });
}
