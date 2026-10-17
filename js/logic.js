// Pure date / streak / statistics logic. Dates are local "YYYY-MM-DD" keys.
export const DAY_MS = 86400000;

export const MILESTONES = [
  { days: 1, label: '24 hours' },
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '1 month' },
  { days: 60, label: '2 months' },
  { days: 90, label: '3 months' },
  { days: 180, label: '6 months' },
  { days: 365, label: '1 year' },
];

const pad = (n) => String(n).padStart(2, '0');

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k, n) {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Monday of the week containing k. */
export function weekStart(k) {
  const d = parseKey(k);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateKey(d);
}

const maxKey = (a, b) => (a > b ? a : b);

export function daysBetween(a, b) {
  return Math.round((parseKey(b) - parseKey(a)) / DAY_MS);
}

/**
 * Dashboard section a habit belongs to: 'todo' | 'avoid' | 'improve' | 'reduce'.
 * Older habits without one fall back by type.
 */
export function catOf(h) {
  if (h.category) return h.category;
  return h.type === 'quit' ? 'avoid' : h.type === 'limit' ? 'reduce' : 'todo';
}

/**
 * Habit types:
 *  check – yes/no        count – reach a daily goal
 *  limit – stay at or under a daily cap; the day counts once confirmed (entry.ok)
 *  quit  – never; tracked by a clean-time timer and slips
 */

const MINUTE_UNITS = /^(m|min|mins|minute|minutes)$/i;
const HOUR_UNITS = /^(h|hr|hrs|hour|hours)$/i;

/** Habits that get the built-in timer: time-based amounts, or yes/no habits marked as timed. */
export function isTimed(h) {
  if (h.type === 'check') return !!h.timed;
  if (h.type !== 'count' && h.type !== 'limit') return false;
  const u = (h.unit || '').trim();
  return MINUTE_UNITS.test(u) || HOUR_UNITS.test(u);
}

/** Converts elapsed milliseconds into the habit's unit (minutes or hours), 2 decimals. */
export function msToUnit(h, ms) {
  const mins = ms / 60000;
  const v = HOUR_UNITS.test((h.unit || '').trim()) ? mins / 60 : mins;
  return Math.round(v * 100) / 100;
}

export function isDue(h, k) {
  if (h.type === 'quit') return false;
  if (h.schedule?.kind === 'weekdays') return h.schedule.days.includes(parseKey(k).getDay());
  return true;
}

export function isDone(h, e) {
  // A Reduce day only counts once confirmed (swiped or saved) while within the limit.
  if (h.type === 'limit') return e?.s === 'skip' || (!!e?.ok && (e.v || 0) <= (h.target || 0));
  if (!e || e.s === 'skip') return false;
  if (h.type === 'count') return (e.v || 0) >= (h.target || 1);
  return (e.v || 0) >= 1;
}

/** 0..1 toward a goal; for limits, how much of the cap is used (can exceed 1). */
export function progress(h, e) {
  if (!e || e.s === 'skip') return 0;
  if (h.type === 'limit') return (e.v || 0) / (h.target || 1);
  if (h.type === 'count') return Math.min(1, (e.v || 0) / (h.target || 1));
  return e.v >= 1 ? 1 : 0;
}

export function weekCount(h, ents, k) {
  const w = weekStart(k);
  let n = 0;
  for (let i = 0; i < 7; i++) if (isDone(h, ents[addDays(w, i)])) n++;
  return n;
}

/** Whether a habit should count toward the day's progress ring. */
export function countsToday(h, ents, k) {
  if (h.schedule?.kind !== 'weekly') return true;
  return isDone(h, ents[k]) || weekCount(h, ents, k) < h.schedule.times;
}

/**
 * Current and best streak. Skipped days are "freezes": they don't add to the
 * streak but don't break it either. Today still being open never breaks it.
 */
export function streaks(h, ents = {}, today = dateKey()) {
  if (h.schedule?.kind === 'weekly') {
    const times = h.schedule.times || 1;
    const thisWeek = weekStart(today);
    let run = 0, best = 0;
    for (let w = weekStart(h.createdAt); w <= thisWeek; w = addDays(w, 7)) {
      let n = 0, skip = false;
      for (let i = 0; i < 7; i++) {
        const e = ents[addDays(w, i)];
        if (isDone(h, e)) n++;
        else if (e?.s === 'skip') skip = true;
      }
      if (n >= times) best = Math.max(best, ++run);
      else if (!skip && w !== thisWeek) run = 0;
    }
    return { current: run, best, unit: 'week' };
  }
  let run = 0, best = 0;
  for (let k = h.createdAt; k <= today; k = addDays(k, 1)) {
    if (!isDue(h, k)) continue;
    const e = ents[k];
    if (isDone(h, e)) best = Math.max(best, ++run);
    else if (e?.s !== 'skip' && k !== today) run = 0;
  }
  return { current: run, best, unit: 'day' };
}

/** Share of due days completed in the last `days` days (null if nothing due yet). */
export function completionRate(h, ents = {}, today = dateKey(), days = 30) {
  const from = maxKey(h.createdAt, addDays(today, -(days - 1)));
  let num = 0, den = 0;
  if (h.schedule?.kind === 'weekly') {
    const t = h.schedule.times || 1;
    const tw = weekStart(today);
    for (let w = weekStart(from); w <= tw; w = addDays(w, 7)) {
      const n = weekCount(h, ents, w);
      if (w === tw && n < t) continue;
      num += Math.min(n, t);
      den += t;
    }
  } else {
    for (let k = from; k <= today; k = addDays(k, 1)) {
      if (!isDue(h, k)) continue;
      const e = ents[k];
      if (e?.s === 'skip') continue;
      const d = isDone(h, e);
      if (k === today && !d) continue;
      den++;
      if (d) num++;
    }
  }
  return den ? num / den : null;
}

export function totals(h, ents = {}) {
  let done = 0, amount = 0;
  for (const e of Object.values(ents)) {
    if (isDone(h, e)) done++;
    if (e.s !== 'skip') amount += e.v || 0;
  }
  return { done, amount };
}

/** Done/due tally across daily-type habits for one day (weekly habits excluded). */
export function dayTally(habits, entries, k, today, includeOpenToday = false) {
  let num = 0, den = 0;
  for (const h of habits) {
    if (h.type === 'quit' || h.archived || h.schedule?.kind === 'weekly') continue;
    if (h.createdAt > k || !isDue(h, k)) continue;
    const e = (entries[h.id] || {})[k];
    if (e?.s === 'skip') continue;
    const d = isDone(h, e);
    if (k === today && !d && !includeOpenToday) continue;
    den++;
    if (d) num++;
  }
  return { num, den };
}

// ---------- quit / de-addiction ----------

/** Before this hour, a bedtime check-in still belongs to the previous day (late sleepers). */
export const NIGHT_CUTOFF_HOUR = 4;

/** The day a night check-in made at `now` counts for. */
export function nightKey(now = new Date()) {
  return now.getHours() < NIGHT_CUTOFF_HOUR ? addDays(dateKey(now), -1) : dateKey(now);
}

/** Night check-ins are only open from bedtime until the early-morning cutoff. */
export function nightCheckInOpen(now = new Date(), bedtimeHour = 20) {
  const h = now.getHours();
  return h >= bedtimeHour || h < NIGHT_CUTOFF_HOUR;
}

/** A day counts for a Not To Do habit only if it was checked in at night and has no slip. */
export function cleanNight(ents, slipDays, k) {
  return !!ents[k]?.v && !slipDays.has(k);
}

/** Consecutive confirmed clean nights; tonight still being open never breaks the streak. */
export function nightStreaks(h, ents = {}, slipDays = new Set(), today = dateKey()) {
  let run = 0, best = 0, total = 0;
  for (let k = dateKey(new Date(h.quitStart || Date.now())); k <= today; k = addDays(k, 1)) {
    if (cleanNight(ents, slipDays, k)) { total++; best = Math.max(best, ++run); }
    else if (k !== today) run = 0;
  }
  return { current: run, best, total };
}

export function quitInfo(h, slips, now = Date.now()) {
  const start = h.quitStart || now;
  const ts = slips
    .filter((s) => s.habitId === h.id && s.ts >= start)
    .map((s) => s.ts)
    .sort((a, b) => a - b);
  let prev = start, best = 0;
  for (const t of ts) {
    best = Math.max(best, t - prev);
    prev = t;
  }
  const elapsed = Math.max(0, now - prev);
  best = Math.max(best, elapsed);
  const slipDays = new Set(ts.map((t) => dateKey(new Date(t))));
  const totalDays = Math.floor((now - start) / DAY_MS);
  const cleanDays = Math.max(0, totalDays - slipDays.size);
  return { start, last: prev, elapsed, best, count: ts.length, slipDays, cleanDays, saved: (h.cost || 0) * cleanDays };
}

export function nextMilestone(elapsed) {
  const d = elapsed / DAY_MS;
  const next = MILESTONES.find((m) => m.days > d);
  if (!next) return null;
  const prevDays = [0, ...MILESTONES.map((m) => m.days)].filter((x) => x <= d).pop();
  return { ...next, progress: (d - prevDays) / (next.days - prevDays) };
}

export function fmtDuration(ms, style = 'long') {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (style === 'short') {
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    return `${m}m`;
  }
  if (d) return `${d}d ${pad(h)}h ${pad(m)}m ${pad(sec)}s`;
  if (h) return `${h}h ${pad(m)}m ${pad(sec)}s`;
  return `${m}m ${pad(sec)}s`;
}
