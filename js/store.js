// Local-first persistence. All data lives in this browser (localStorage).
const KEY = 'habitflow:v1';

function blank() {
  return { version: 1, habits: [], entries: {}, slips: [], settings: { theme: 'system', currency: '$' } };
}

function normalize(s) {
  const b = blank();
  return {
    ...b,
    ...s,
    habits: Array.isArray(s.habits) ? s.habits : [],
    entries: s.entries && typeof s.entries === 'object' ? s.entries : {},
    slips: Array.isArray(s.slips) ? s.slips : [],
    settings: { ...b.settings, ...(s.settings || {}) },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) {
    console.warn('Could not load data', e);
  }
  return blank();
}

let state = load();

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const getState = () => state;
export const habit = (id) => state.habits.find((h) => h.id === id);

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save data', e);
  }
}

export function addHabit(h) {
  state.habits.push(h);
  save();
}

export function updateHabit(id, patch) {
  const h = habit(id);
  if (!h) return;
  Object.assign(h, patch);
  save();
}

export function deleteHabit(id) {
  state.habits = state.habits.filter((h) => h.id !== id);
  delete state.entries[id];
  state.slips = state.slips.filter((s) => s.habitId !== id);
  save();
}

export const getEntry = (id, key) => state.entries[id]?.[key];

export function setEntry(id, key, entry) {
  const h = habit(id);
  if (!h) return;
  state.entries[id] ??= {};
  if (entry == null) {
    delete state.entries[id][key];
  } else {
    state.entries[id][key] = entry;
    // Logging a day before the habit existed backdates it so streaks include it.
    if (key < h.createdAt) h.createdAt = key;
  }
  save();
}

export function addSlip(slip) {
  state.slips.push(slip);
  save();
}

export function deleteSlip(id) {
  state.slips = state.slips.filter((s) => s.id !== id);
  save();
}

export function setSetting(k, v) {
  state.settings[k] = v;
  save();
}

export const exportData = () => JSON.stringify(state, null, 2);

export function importData(json) {
  const s = JSON.parse(json);
  if (!s || !Array.isArray(s.habits)) throw new Error('Not a HabitFlow backup file');
  state = normalize(s);
  save();
}

export function resetAll() {
  state = blank();
  save();
}
