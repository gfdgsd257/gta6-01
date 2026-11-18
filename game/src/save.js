// Save and load: money, completed missions and best stats live in
// localStorage, so progress survives closing the tab. Everything is
// wrapped in try/catch — private windows may refuse storage.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    // A version tag so a future save format can tell old saves apart.
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, ...data }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear.
  }
}
