// Local-first persistence. All data lives in this browser (localStorage).
const KEY = 'habitflow:v1';

function blank() {
  return { version: 1, profile: null, habits: [], entries: {}, slips: [], friends: [], settings: { theme: 'system', currency: '$', bedtime: 20 } };
}

function normalize(s) {
  const b = blank();
  return {
    ...b,
    ...s,
    profile: s.profile && typeof s.profile.name === 'string' ? s.profile : null,
    habits: Array.isArray(s.habits) ? s.habits : [],
    entries: s.entries && typeof s.entries === 'object' ? s.entries : {},
    slips: Array.isArray(s.slips) ? s.slips : [],
    friends: Array.isArray(s.friends) ? s.friends : [],
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

/** profile: { name, age, sex: 'male' | 'female' | 'unspecified', createdAt } */
export function setProfile(profile) {
  state.profile = { ...(state.profile || { createdAt: Date.now() }), ...profile };
  save();
}

/** Stable id that identifies this person on shared cards (created on first use). */
export function profileId() {
  if (!state.profile) return null;
  if (!state.profile.uid) { state.profile.uid = uid(); save(); }
  return state.profile.uid;
}

// Friends are saved snapshots ("cards") of other people's days: { id, card, addedAt, updatedAt }.
export const friend = (id) => state.friends.find((f) => f.id === id);

/** Adds a friend or refreshes their card if this one is newer. Returns 'added' | 'updated' | 'same'. */
export function upsertFriend(card) {
  const f = friend(card.id);
  if (!f) {
    state.friends.push({ id: card.id, card, addedAt: Date.now(), updatedAt: Date.now() });
    save();
    return 'added';
  }
  if ((card.ts || 0) <= (f.card.ts || 0)) return 'same';
  f.card = card;
  f.updatedAt = Date.now();
  save();
  return 'updated';
}

export function removeFriend(id) {
  state.friends = state.friends.filter((f) => f.id !== id);
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
