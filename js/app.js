import * as S from './store.js';
import * as L from './logic.js';
import { encodeCard, decodeCard, extractPayload, cardImage } from './share.js';

const $app = document.getElementById('app');
const $sheet = document.getElementById('sheet-root');
const $toast = document.getElementById('toast');

let viewDate = L.dateKey();
let lastToday = viewDate;
let currentPage = 'today';
let sheetTimers = [];
let installEvt = null;

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6'];
const EMOJIS = ['✅', '💧', '🏃', '💪', '🚶', '📖', '🧘', '😴', '🥗', '✍️', '💊', '🌿', '📵', '📺', '🍔', '🍩', '☕', '🚭', '🍺', '🔞', '🍬', '🎮'];
const TRIGGERS = ['Stress', 'Boredom', 'Craving', 'Social', 'Tired', 'Lonely', 'Anger', 'Celebrating', 'Other'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The four dashboard sections. */
const CATS = {
  todo: { label: 'To Do', icon: '✅', color: '#22c55e', hint: 'Things you commit to doing', empty: 'What must you do each day?' },
  avoid: { label: 'Not To Do', icon: '⛔', color: '#ef4444', hint: 'Things you strictly avoid', empty: 'What do you never want to do?' },
  improve: { label: 'Improve', icon: '🌱', color: '#6366f1', hint: 'Habits that make life better', empty: 'What would make life better?' },
  reduce: { label: 'Reduce', icon: '📉', color: '#f59e0b', hint: 'Cut down, not cut out', empty: 'What do you want less of?' },
};
const CAT_ORDER = ['todo', 'avoid', 'improve', 'reduce'];

const TEMPLATES = [
  { category: 'todo', name: 'Exercise', emoji: '💪', type: 'check', color: '#22c55e' },
  { category: 'todo', name: 'Walk', emoji: '🚶', type: 'count', target: 10000, unit: 'steps', step: 1000, color: '#14b8a6' },
  { category: 'todo', name: 'Drink water', emoji: '💧', type: 'count', target: 8, unit: 'glasses', step: 1, color: '#06b6d4' },
  { category: 'todo', name: 'Read', emoji: '📖', type: 'count', target: 20, unit: 'min', step: 5, color: '#8b5cf6' },
  { category: 'avoid', name: 'No alcohol', emoji: '🍺', type: 'quit', color: '#f59e0b' },
  { category: 'avoid', name: 'No sugar', emoji: '🍬', type: 'quit', color: '#ec4899' },
  { category: 'avoid', name: 'No porn', emoji: '🔞', type: 'quit', color: '#ef4444' },
  { category: 'avoid', name: 'No smoking', emoji: '🚭', type: 'quit', color: '#64748b', cost: 10 },
  { category: 'improve', name: 'Meditate', emoji: '🧘', type: 'check', timed: true, color: '#6366f1' },
  { category: 'improve', name: 'Sleep 8 hours', emoji: '😴', type: 'count', target: 8, unit: 'hours', step: 0.5, color: '#8b5cf6' },
  { category: 'improve', name: 'No-phone time', emoji: '📵', type: 'count', target: 60, unit: 'min', step: 15, color: '#14b8a6' },
  { category: 'improve', name: 'Digital detox', emoji: '🌿', type: 'check', color: '#22c55e' },
  { category: 'reduce', name: 'Sugar', emoji: '🍩', type: 'limit', target: 2, unit: 'servings', step: 1, color: '#ec4899' },
  { category: 'reduce', name: 'TV', emoji: '📺', type: 'limit', target: 60, unit: 'min', step: 15, color: '#f59e0b' },
  { category: 'reduce', name: 'Junk food', emoji: '🍔', type: 'limit', target: 1, unit: 'meals', step: 1, color: '#ef4444' },
  { category: 'reduce', name: 'Caffeine', emoji: '☕', type: 'limit', target: 2, unit: 'cups', step: 1, color: '#a16207' },
];

const GEAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
const PLAY_SVG = '<svg class="play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// Short daily nudges shown in the profile header (one per day).
const NUDGES = [
  'Small steps, every day.',
  'Progress, not perfection.',
  'You showed up. That counts.',
  'One good choice at a time.',
  'Be kinder to yourself than yesterday.',
  'Consistency beats intensity.',
  'Today is a fresh page.',
  'Your future self is cheering.',
  'Slow progress is still progress.',
  'Strong habits build a strong life.',
];

// ---------- helpers ----------
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const safeColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : COLORS[0]);
const fmtNum = (v) => (Number(v) || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
const fmtDate = (k, o = { weekday: 'short', month: 'short', day: 'numeric' }) => L.parseKey(k).toLocaleDateString(undefined, o);
const pct = (x) => (x == null ? '—' : Math.round(x * 100) + '%');
const ents = (h) => S.getState().entries[h.id] || {};
const money = (n) => esc(S.getState().settings.currency || '$') + fmtNum(Math.round(n));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const vibrate = (ms = 12) => navigator.vibrate?.(ms);

function toLocalInput(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Show a brief message; `action` ({label, fn}) adds a button such as Undo. */
function toast(msg, action) {
  $toast.textContent = msg;
  $toast.classList.toggle('actionable', !!action);
  if (action) {
    const b = document.createElement('button');
    b.className = 'toast-btn';
    b.textContent = action.label;
    b.onclick = () => { $toast.classList.remove('show'); action.fn(); };
    $toast.append(b);
  }
  $toast.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $toast.classList.remove('show'), action ? 4000 : 2400);
}

function ring(p, size = 64, stroke = 7) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, m = size / 2;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${stroke}"/>
    <circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="var(--c, var(--accent))" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamp(p, 0, 1))}" transform="rotate(-90 ${m} ${m})"/></svg>`;
}

/** First name from the profile, e.g. "Santhosh Kumar" → "Santhosh". */
function firstName() {
  return (S.getState().profile?.name || '').trim().split(/\s+/)[0] || '';
}

/** ", Name" when a name is set, else "". HTML-escaped unless `plain` (for textContent/toasts). */
const withName = (plain = false) => (firstName() ? `, ${plain ? firstName() : esc(firstName())}` : '');

function greeting(includeName = true) {
  const h = new Date().getHours();
  const g = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return includeName ? `${g}${withName()}` : g;
}

/** Calendar days since the profile was created, counting the first day as day 1. */
function daysOnApp() {
  const st = S.getState();
  const start = st.profile?.createdAt
    ? L.dateKey(new Date(st.profile.createdAt))
    : st.habits.reduce((m, h) => (h.createdAt < m ? h.createdAt : m), L.dateKey());
  return Math.max(0, L.daysBetween(start, L.dateKey())) + 1;
}

const SEXES = [['male', 'Male'], ['female', 'Female'], ['unspecified', 'Prefer not to say']];

function profileFields(p = {}) {
  return `
    <label class="field"><span>Your name</span>
      <input name="name" maxlength="30" value="${esc(p.name || '')}" placeholder="What should we call you?" autocomplete="given-name" autocapitalize="words"></label>
    <label class="field"><span>Age</span>
      <input name="age" type="number" inputmode="numeric" min="5" max="120" value="${esc(p.age ?? '')}" placeholder="e.g. 28"></label>
    <div class="field"><span>Sex</span>
      <div class="seg" role="radiogroup" aria-label="Sex">
        ${SEXES.map(([v, l]) => `<label><input type="radio" name="sex" value="${v}" ${p.sex === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
      </div>
    </div>`;
}

/** Validates the profile form; returns the profile or null (after showing why). */
function readProfile(form) {
  const fd = new FormData(form);
  const name = (fd.get('name') || '').trim().replace(/\s+/g, ' ');
  const age = parseInt(fd.get('age'), 10);
  const sex = fd.get('sex');
  if (!name) { toast('Please tell us your name'); form.elements.name.focus(); return null; }
  if (!(age >= 5 && age <= 120)) { toast('Please enter an age between 5 and 120'); form.elements.age.focus(); return null; }
  if (!sex) { toast('Please choose an option for sex'); return null; }
  return { name, age, sex };
}

// ---------- welcome / onboarding ----------
function renderWelcome() {
  $app.innerHTML = `
    <section class="welcome">
      <div class="welcome-logo" aria-hidden="true">🌱</div>
      <h1>Welcome to HabitFlow</h1>
      ${(() => { const c = pendingFriend() && decodeCard(pendingFriend()); return c ? `<p class="invite">👋 <b>${esc(c.n)}</b> invited you to HabitFlow. Set up your profile to see their day and add them as a friend.</p>` : ''; })()}
      <p class="muted">Small steps, every day. Tell us a little about yourself so we can cheer you on.</p>
      <form class="form card pad" data-form="welcome" novalidate>
        ${profileFields()}
        <button class="btn primary block" type="submit">Let's begin →</button>
        <p class="muted tiny center">🔒 This stays private on your device. It's never uploaded.</p>
      </form>
    </section>`;
  $app.querySelector('input[name="name"]')?.focus();
}

function renderHello() {
  $app.innerHTML = `
    <section class="welcome hello">
      <div class="wave" aria-hidden="true">👋</div>
      <h1>Nice to meet you, ${esc(firstName())}!</h1>
      <p class="muted">Every big change starts with one small habit. Whether it's getting fitter, building a routine or letting go of something that holds you back, we're in this together.</p>
      <div class="card pad promise">
        <p><b>Here's how we'll help you:</b></p>
        <ul class="tips">
          <li>✅ <b>To Do</b>: what you commit to, like exercise or 10k steps</li>
          <li>⛔ <b>Not To Do</b>: what you strictly avoid, with a clean-time timer</li>
          <li>🌱 <b>Improve</b>: habits that make life better, like meditation</li>
          <li>📉 <b>Reduce</b>: things to cut down, with a daily limit</li>
        </ul>
      </div>
      <a class="btn primary block" href="#/today">Go to my dashboard</a>
    </section>`;
}

function scheduleLabel(h) {
  const s = h.schedule || {};
  if (s.kind === 'weekdays') return s.days.length === 7 ? 'Every day' : s.days.map((d) => WEEKDAYS[d]).join(', ');
  if (s.kind === 'weekly') return `${s.times}× a week`;
  return 'Every day';
}

function topbar(title, back, right = '<span class="icon-btn" aria-hidden="true"></span>') {
  return `<header class="topbar"><a class="icon-btn" href="${back}" aria-label="Back">‹</a><h1>${title}</h1>${right}</header>`;
}

// ---------- router ----------
function parseRoute() {
  const [page, id] = (location.hash || '#/today').replace(/^#\/?/, '').split('/');
  return { page: page || 'today', id };
}

function render() {
  let { page, id } = parseRoute();
  // First launch: collect the profile before anything else.
  if (!S.getState().profile && page !== 'hello') {
    // Opened a friend's link before setting up: remember it and show it after onboarding.
    if (page === 'friend' && id) { try { localStorage.setItem(PENDING_FRIEND_KEY, id); } catch { /* ignore */ } }
    page = 'welcome';
  }
  currentPage = page;
  document.body.dataset.page = page;
  switch (page) {
    case 'welcome': return renderWelcome();
    case 'hello': return renderHello();
    case 'habit': return renderDetail(id);
    case 'new': return renderForm(null, id);
    case 'edit': return renderForm(id);
    case 'stats': return renderStats();
    case 'friends': return renderFriends();
    case 'friend': return renderFriendLink(id);
    case 'settings': return renderSettings();
    default: return renderToday();
  }
}

/** Re-render after a data change (forms are left alone so typing isn't lost). */
function refresh() {
  if (!['new', 'edit', 'welcome'].includes(currentPage)) render();
}

// ---------- Today (dashboard) ----------
function profileHeader() {
  const p = S.getState().profile || {};
  const days = daysOnApp();
  const initials = initialsOf(p.name);
  const meta = [p.age ? `${p.age} yrs` : '', p.sex === 'male' ? 'Male' : p.sex === 'female' ? 'Female' : ''].filter(Boolean).join(' · ');
  const nudge = NUDGES[L.daysBetween('2024-01-01', L.dateKey()) % NUDGES.length];
  return `<section class="hp">
    <div class="hp-left">
      <div class="hp-id">
        <span class="avatar" aria-hidden="true">${esc(initials)}</span>
        <div class="hp-who">
          <p class="hp-greet">${greeting(false)} 👋</p>
          <div class="hp-name-row">
            <h1 class="hp-name">${esc(p.name || 'Friend')}</h1>
            <a class="hp-gear" href="#/settings" aria-label="Settings" title="Settings">${GEAR_SVG}</a>
          </div>
          ${meta ? `<p class="hp-meta">${meta}</p>` : ''}
        </div>
      </div>
      <p class="hp-nudge">“${nudge}”</p>
    </div>
    <a class="hp-counter" href="#/stats" aria-label="${days} ${days === 1 ? 'day' : 'days'} on HabitFlow. View your stats" title="View your stats">
      <b>${days}</b><span>${days === 1 ? 'day' : 'days'} on<br>HabitFlow</span><small>Stats ›</small>
    </a>
  </section>`;
}

/**
 * The day a Not To Do check-in on the viewed day refers to: when viewing today,
 * that's tonight (which, after midnight and before the cutoff, is still yesterday).
 */
const nightFor = (key) => (key === L.dateKey() ? L.nightKey() : key);

/** Done/total for a set of habits on a day (Not To Do counts a confirmed clean night). */
function tally(habits, key) {
  let num = 0, den = 0;
  for (const h of habits) {
    if (h.type === 'quit') {
      den++;
      if (L.cleanNight(ents(h), L.quitInfo(h, S.getState().slips).slipDays, nightFor(key))) num++;
    } else if (L.isDue(h, key) && L.countsToday(h, ents(h), key)) {
      den++;
      if (L.isDone(h, ents(h)[key])) num++;
    }
  }
  return { num, den };
}

function dashRow(h, key) {
  const e = ents(h), entry = e[key];
  const due = h.type === 'quit' || L.isDue(h, key);
  let color = safeColor(h.color), sub, control, done = false, swipeLabel = '✓ Done for the day';

  if (h.type === 'quit') {
    const info = L.quitInfo(h, S.getState().slips);
    const nk = nightFor(key);
    const nights = L.nightStreaks(h, e, info.slipDays, L.nightKey()).current;
    done = L.cleanNight(e, info.slipDays, nk);
    sub = `${done ? '🌙 ✓' : `🌙 ${nights}`} · <span class="timer" data-since="${info.last}" data-fmt="short">${L.fmtDuration(info.elapsed, 'short')}</span>`;
    control = `<button class="mini" data-act="sos" data-id="${h.id}" aria-label="Get help with an urge">🆘</button>`;
    swipeLabel = '🌙 Going to bed clean';
  } else if (h.type === 'check') {
    done = L.isDone(h, entry);
    const st = L.streaks(h, e, L.dateKey());
    sub = h.schedule?.kind === 'weekly' ? `${L.weekCount(h, e, key)}/${h.schedule.times} this week`
      : !due ? 'Rest day' : entry?.s === 'skip' ? 'Skipped' : st.current ? `🔥 ${plural(st.current, 'day')}` : scheduleLabel(h);
    control = h.timed && !done
      ? `<button class="mini play-btn" data-act="timer" data-id="${h.id}" aria-label="Start ${esc(h.name)} timer">${PLAY_SVG}</button>`
      : `<button class="check sm ${done ? 'on' : ''}" data-act="toggle" data-id="${h.id}" aria-pressed="${done}" aria-label="Mark ${esc(h.name)} done">${CHECK_SVG}</button>`;
    if (h.timed && entry?.m) sub = `${fmtNum(entry.m)} min · ${sub}`;
  } else {
    const v = entry?.s === 'skip' ? 0 : entry?.v || 0;
    const over = h.type === 'limit' && v > h.target;
    done = h.type === 'count' ? L.isDone(h, entry) : !!entry?.ok && !over;
    if (over) color = '#ef4444';
    sub = `${done && h.type === 'limit' ? '✓ ' : ''}${fmtNum(v)}/${fmtNum(h.target)} ${esc(h.unit)}${over ? ' · over' : ''}`;
    const timed = L.isTimed(h);
    control = `<button class="mini ring-btn" data-act="${timed ? 'timer' : 'inc'}" data-id="${h.id}"
      aria-label="${timed ? `Start ${esc(h.name)} timer` : `Add ${fmtNum(h.step || 1)} ${esc(h.unit)} to ${esc(h.name)}`}">
      ${ring(h.type === 'limit' ? Math.min(1, v / h.target) : L.progress(h, entry), 34, 4)}${timed ? PLAY_SVG : '<span>+</span>'}</button>`;
    if (h.type === 'limit') swipeLabel = '✓ Within limit';
  }

  return `<div class="ri ${due ? '' : 'rest'} ${done ? 'done' : ''} ${h.type === 'quit' ? 'night' : ''}" data-swipe="${h.id}" style="--c:${color}">
    <div class="ri-bg" aria-hidden="true"><span>${swipeLabel}</span></div>
    <div class="ri-fg">
      <a class="ri-main" href="#/habit/${h.id}" draggable="false">
        <span class="ri-emoji">${esc(h.emoji)}</span>
        <span class="ri-text"><span class="ri-name">${esc(h.name)}</span><span class="ri-sub">${sub}</span></span>
      </a>
      ${control}
    </div>
  </div>`;
}

function quadrant(cat, habits, key) {
  const C = CATS[cat];
  const t = tally(habits, key);
  const sugg = TEMPLATES.map((tp, i) => ({ ...tp, i })).filter((tp) => tp.category === cat).slice(0, 3);
  return `<section class="quad" style="--q:${C.color}" aria-label="${C.label}">
    <header class="quad-head">
      <h2>${C.label}</h2>
      ${t.den ? `<span class="quad-count">${t.num}/${t.den}</span>` : ''}
      <a class="quad-add" href="#/new/${cat}" aria-label="Add to ${C.label}">+</a>
    </header>
    ${habits.length
      ? `<div class="quad-list">${habits.map((h) => dashRow(h, key)).join('')}</div>`
      : `<p class="quad-empty">${C.empty}</p>
         <div class="quad-sugg">${sugg.map((tp) => `<a class="chip sm" href="#/new/t${tp.i}">${tp.emoji} ${esc(tp.name)}</a>`).join('')}</div>`}
  </section>`;
}

function renderToday() {
  const st = S.getState(), today = L.dateKey();
  if (viewDate > today) viewDate = today;
  const isToday = viewDate === today;
  const active = st.habits.filter((h) => !h.archived && (h.type === 'quit' || h.createdAt <= viewDate));
  const byCat = Object.fromEntries(CAT_ORDER.map((c) => [c, active.filter((h) => L.catOf(h) === c)]));
  const all = tally(active, viewDate);
  const p = all.den ? all.num / all.den : 0;

  $app.innerHTML = `
    ${profileHeader()}
    <section class="midband">
      <div class="datenav">
        <button class="icon-btn" data-act="prev-day" aria-label="Previous day">‹</button>
        <div class="dn-label">
          <b>${isToday ? 'Today' : fmtDate(viewDate, { weekday: 'long' })}</b>
          <small>${isToday ? fmtDate(viewDate, { weekday: 'short', month: 'short', day: 'numeric' }) : `${fmtDate(viewDate, { month: 'short', day: 'numeric' })} · <button class="link" data-act="go-today">Today</button>`}</small>
        </div>
        <button class="icon-btn" data-act="next-day" aria-label="Next day" ${isToday ? 'disabled' : ''}>›</button>
      </div>
      <div class="mid-progress">
        <div class="bar"><i style="width:${p * 100}%"></i></div>
        <span>${!all.den ? 'Add your first habit below' : p === 1 ? `🎉 All done${withName()}!` : `${all.num} of ${all.den} on track`}</span>
      </div>
    </section>
    ${active.length && !st.settings.swipeHintSeen ? `<p class="swipe-hint">
      <span>👉 <b>Swipe right</b> on a habit to complete it for the day. For <b>Not To Do</b>, swipe at bedtime to log a clean night.</span>
      <button class="icon-btn" data-act="hide-hint" aria-label="Dismiss tip">×</button></p>` : ''}
    <div class="quads">${CAT_ORDER.map((c) => quadrant(c, byCat[c], viewDate)).join('')}</div>
    ${friendsStrip()}
  `;
}

// ---------- heatmap ----------
function heatmap(h, weeks = 18) {
  const today = L.dateKey(), e = ents(h);
  const start = L.addDays(L.weekStart(today), -7 * (weeks - 1));
  const quit = h.type === 'quit' ? L.quitInfo(h, S.getState().slips) : null;
  const quitStartKey = quit ? L.dateKey(new Date(quit.start)) : null;
  let cells = '';
  for (let i = 0; i < weeks * 7; i++) {
    const k = L.addDays(start, i);
    if (k > today) { cells += '<span class="cell future"></span>'; continue; }
    const label = fmtDate(k);
    if (quit) {
      const cls = k < quitStartKey ? 'pre' : quit.slipDays.has(k) ? 'slip' : L.cleanNight(e, quit.slipDays, k) ? 'l4' : 'miss';
      cells += `<span class="cell ${cls}" title="${label}"></span>`;
      continue;
    }
    const entry = e[k];
    let cls;
    if (h.type === 'limit') cls = k < h.createdAt ? 'off' : L.isDone(h, entry) ? 'l4' : (entry?.v || 0) > h.target ? 'slip' : 'miss';
    else if (entry?.s === 'skip') cls = 'skip';
    else {
      const p = L.progress(h, entry);
      cls = p >= 1 ? 'l4' : p >= 0.66 ? 'l3' : p >= 0.33 ? 'l2' : p > 0 ? 'l1' : L.isDue(h, k) && k >= h.createdAt ? 'miss' : 'off';
    }
    cells += `<button class="cell ${cls}" data-act="day" data-id="${h.id}" data-key="${k}" title="${label}" aria-label="${label}"></button>`;
  }
  return `<div class="heat-wrap">
    <div class="heat-days"><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span><span>S</span></div>
    <div class="heat" style="--weeks:${weeks}">${cells}</div>
  </div>`;
}

// ---------- detail ----------
function renderDetail(id) {
  const h = S.habit(id);
  if (!h) { location.hash = '#/today'; return; }
  const head = topbar(`<span>${esc(h.emoji)}</span> ${esc(h.name)}`, '#/today',
    `<a class="icon-btn" href="#/edit/${h.id}" aria-label="Edit habit">✎</a>`);
  $app.innerHTML = head + `<div style="--c:${safeColor(h.color)}">${h.type === 'quit' ? quitDetail(h) : buildDetail(h)}</div>`;
}

function buildDetail(h) {
  const e = ents(h), today = L.dateKey();
  const st = L.streaks(h, e, today);
  const tot = L.totals(h, e);
  const notes = Object.entries(e).filter(([, v]) => v.n).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 5);
  const C = CATS[L.catOf(h)];
  const limit = h.type === 'limit';
  let lastTile;
  if (limit) {
    // Average per day over the last 30 days (or since the habit started).
    const from = h.createdAt > L.addDays(today, -29) ? h.createdAt : L.addDays(today, -29);
    const n = L.daysBetween(from, today) + 1;
    let sum = 0;
    for (let k = from; k <= today; k = L.addDays(k, 1)) sum += e[k]?.v || 0;
    lastTile = `<b>${fmtNum(sum / n)}</b><span>Avg ${esc(h.unit)} per day</span>`;
  } else {
    lastTile = `<b>${h.type === 'count' ? fmtNum(tot.amount) : tot.done}</b><span>${h.type === 'count' ? `Total ${esc(h.unit)}` : 'Times done'}</span>`;
  }
  const goal = limit ? ` · limit ${fmtNum(h.target)} ${esc(h.unit)}/day` : h.type === 'count' ? ` · goal ${fmtNum(h.target)} ${esc(h.unit)}` : '';
  return `
    <p class="muted center"><span class="cat-tag" style="--q:${C.color}">${C.icon} ${C.label}</span> ${limit ? '' : scheduleLabel(h)}${goal}</p>
    <div class="tiles">
      <div class="card tile"><b>🔥 ${st.current}</b><span>${limit ? 'Days under limit' : `Current streak (${st.unit}s)`}</span></div>
      <div class="card tile"><b>🏆 ${st.best}</b><span>Best streak (${st.unit}s)</span></div>
      <div class="card tile"><b>${pct(L.completionRate(h, e, today, 30))}</b><span>${limit ? 'Within limit, 30 days' : 'Last 30 days'}</span></div>
      <div class="card tile">${lastTile}</div>
    </div>
    <section class="card pad">
      <div class="row"><h2 class="h2">History</h2><span class="muted small">Tap a day to edit</span></div>
      ${heatmap(h)}
      <div class="legend">${limit
        ? '<span><i class="cell miss"></i>Not confirmed</span><span><i class="cell slip"></i>Over</span><span><i class="cell l4"></i>Within limit</span>'
        : '<span><i class="cell miss"></i>Missed</span><span><i class="cell skip"></i>Skipped</span><span><i class="cell l4"></i>Done</span>'}</div>
    </section>
    ${L.isTimed(h) ? `<button class="btn primary block timer-cta" data-act="timer" data-id="${h.id}">${PLAY_SVG} Start ${esc(h.name)} timer</button>` : ''}
    <button class="btn block" data-act="day" data-id="${h.id}" data-key="${today}">${limit ? 'Log today' : 'Log today with a note'}</button>
    ${notes.length ? `<section class="card pad"><h2 class="h2">Recent notes</h2><ul class="notes">${notes.map(([k, v]) => `<li><b>${fmtDate(k)}</b> ${esc(v.n)}</li>`).join('')}</ul></section>` : ''}
  `;
}

function quitDetail(h) {
  const st = S.getState();
  const info = L.quitInfo(h, st.slips);
  const next = L.nextMilestone(info.elapsed);
  const slips = st.slips.filter((s) => s.habitId === h.id).sort((a, b) => b.ts - a.ts);

  const trig = {};
  const tod = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
  for (const s of slips) {
    if (s.trigger) trig[s.trigger] = (trig[s.trigger] || 0) + 1;
    const hr = new Date(s.ts).getHours();
    tod[hr >= 5 && hr < 12 ? 'Morning' : hr < 17 && hr >= 12 ? 'Afternoon' : hr >= 17 && hr < 21 ? 'Evening' : 'Night']++;
  }
  const trigRows = Object.entries(trig).sort((a, b) => b[1] - a[1]);
  const maxT = Math.max(1, ...trigRows.map((r) => r[1]));
  const maxTod = Math.max(1, ...Object.values(tod));
  const nk = L.nightKey();
  const nights = L.nightStreaks(h, ents(h), info.slipDays, nk);
  const checkedIn = L.cleanNight(ents(h), info.slipDays, nk);
  const bedtime = st.settings.bedtime ?? 20;
  const open = L.nightCheckInOpen(new Date(), bedtime);

  return `
    <section class="card hero">
      <p class="eyebrow">Clean for</p>
      <div class="timer-big" data-since="${info.last}">${L.fmtDuration(info.elapsed)}</div>
      ${next ? `<div class="bar big"><i style="width:${next.progress * 100}%"></i></div>
        <p class="muted small">Next milestone: <b>${next.label}</b> · longest ${L.fmtDuration(info.best, 'short')}</p>` : '<p>🏆 Every milestone reached. Incredible.</p>'}
      <div class="night-box ${checkedIn ? 'ok' : ''}">
        ${checkedIn
          ? `<b>🌙 Checked in for tonight</b><span>Sleep well${withName()}. That's ${plural(nights.current, 'clean night')} in a row.</span>`
          : `<b>🌙 Tonight's check-in</b><span>${open ? 'Going to bed without it? Swipe right on the dashboard or tap below.' : `Opens at ${fmtHour(bedtime)}. Swipe right on the dashboard at bedtime.`}</span>
             <button class="btn block night-btn" data-act="night" data-id="${h.id}" ${open ? '' : 'disabled'}>🌙 Going to bed clean</button>`}
      </div>
      <div class="row-btns">
        <button class="btn sos" data-act="sos" data-id="${h.id}">🆘 I have an urge</button>
        <button class="btn" data-act="slip" data-id="${h.id}">I slipped</button>
      </div>
    </section>
    <div class="tiles">
      <div class="card tile"><b>🌙 ${nights.current}</b><span>Clean nights in a row</span></div>
      <div class="card tile"><b>🏆 ${nights.best}</b><span>Best night streak · ${nights.total} total</span></div>
      <div class="card tile"><b>💪 ${h.urges || 0}</b><span>Urges beaten</span></div>
      ${h.cost ? `<div class="card tile"><b>${money(info.saved)}</b><span>Money saved</span></div>` : `<div class="card tile"><b>${info.count}</b><span>Slips logged</span></div>`}
    </div>
    ${h.reasons?.length ? `<section class="card pad"><h2 class="h2">Why I'm doing this</h2><ul class="reasons">${h.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></section>` : ''}
    <section class="card pad">
      <h2 class="h2">Milestones</h2>
      <div class="badges">${L.MILESTONES.map((m) => `<span class="badge ${info.best >= m.days * L.DAY_MS ? 'got' : ''}">${info.best >= m.days * L.DAY_MS ? '🏅' : '🔒'} ${m.label}</span>`).join('')}</div>
    </section>
    <section class="card pad">
      <h2 class="h2">Clean nights</h2>
      ${heatmap(h)}
      <div class="legend"><span><i class="cell miss"></i>Not checked in</span><span><i class="cell slip"></i>Slip</span><span><i class="cell l4"></i>Clean night</span></div>
    </section>
    ${slips.length ? `
    <section class="card pad">
      <h2 class="h2">Your patterns</h2>
      ${trigRows.length ? `<p class="muted small">Top triggers</p>${trigRows.map(([t, n]) => `<div class="hbar"><span>${esc(t)}</span><div class="bar"><i style="width:${(n / maxT) * 100}%"></i></div><b>${n}</b></div>`).join('')}` : ''}
      <p class="muted small" style="margin-top:14px">Time of day</p>
      ${Object.entries(tod).map(([t, n]) => `<div class="hbar"><span>${t}</span><div class="bar"><i style="width:${(n / maxTod) * 100}%"></i></div><b>${n}</b></div>`).join('')}
    </section>
    <section class="card pad">
      <h2 class="h2">Slip log</h2>
      <ul class="sliplist">${slips.slice(0, 30).map((s) => `<li>
        <div><b>${new Date(s.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</b>
        ${s.trigger ? `<span class="tag">${esc(s.trigger)}</span>` : ''}${s.intensity ? `<span class="tag">Urge ${s.intensity}/5</span>` : ''}
        ${s.note ? `<p class="muted small">${esc(s.note)}</p>` : ''}</div>
        <button class="icon-btn" data-act="del-slip" data-sid="${s.id}" aria-label="Delete slip">×</button></li>`).join('')}</ul>
    </section>` : ''}
  `;
}

// ---------- add / edit ----------
/** Habit type implied by a section (+ the yes/no vs amount choice for To Do / Improve). */
const typeFor = (cat, track) => (cat === 'avoid' ? 'quit' : cat === 'reduce' ? 'limit' : track === 'count' ? 'count' : 'check');

function templateChips(cat) {
  return TEMPLATES.map((t, i) => ({ ...t, i })).filter((t) => t.category === cat)
    .map((t) => `<a class="chip" href="#/new/t${t.i}">${t.emoji} ${esc(t.name)}</a>`).join('');
}

function renderForm(id, arg) {
  const editing = id ? S.habit(id) : null;
  if (id && !editing) { location.hash = '#/today'; return; }
  const tpl = arg && /^t\d+$/.test(arg) ? TEMPLATES[Number(arg.slice(1))] : null;
  const cat = editing ? L.catOf(editing) : tpl ? tpl.category : CATS[arg] ? arg : 'todo';
  const base = {
    name: '', emoji: '✅', color: CATS[cat].color, type: typeFor(cat, 'check'), target: 1, unit: '', step: 1,
    cost: '', reasons: [], quitStart: Date.now(), schedule: { kind: 'daily', days: [1, 2, 3, 4, 5], times: 3 },
  };
  const src = editing || tpl || {};
  const h = { ...base, ...src, schedule: { ...base.schedule, ...(src.schedule || {}) } };
  const track = h.type === 'count' ? 'count' : 'check';
  const radio = (name, value, label, cur) => `<label><input type="radio" name="${name}" value="${value}" ${value === cur ? 'checked' : ''}><span>${label}</span></label>`;

  $app.innerHTML = `
    ${topbar(editing ? 'Edit habit' : 'New habit', editing ? `#/habit/${editing.id}` : '#/today')}
    <form class="form" data-form="habit" data-id="${editing?.id || ''}" data-cat="${cat}" data-type="${h.type}" data-kind="${h.schedule.kind}" novalidate>
      <div class="field"><span>Which section?</span>
        <div class="catpick">
          ${CAT_ORDER.map((c) => `<label style="--q:${CATS[c].color}"><input type="radio" name="category" value="${c}" ${c === cat ? 'checked' : ''}>
            <span><b>${CATS[c].icon} ${CATS[c].label}</b><small>${CATS[c].hint}</small></span></label>`).join('')}
        </div>
      </div>

      ${editing ? '' : `<p class="muted small">Quick picks</p><div class="templates" id="tpl-chips">${templateChips(cat)}</div>`}

      <div class="field only-track"><span>How will you track it?</span>
        <div class="seg two" role="radiogroup" aria-label="Tracking">
          ${radio('track', 'check', '✓ Yes / No', track)}${radio('track', 'count', '🔢 Amount goal', track)}
        </div>
      </div>
      <p class="hint only-check">Tick it off once it's done, like exercising or meditating.</p>
      <p class="hint only-count">Log an amount toward a daily goal: steps, glasses, minutes, hours.</p>
      <p class="hint only-quit">Something you won't do at all. A live timer counts your clean time, and SOS helps with urges.</p>
      <p class="hint only-limit">Set a daily cap and log what you have. Staying at or under it keeps your streak going.</p>

      <label class="field"><span>Name</span><input name="name" maxlength="40" value="${esc(h.name)}" placeholder="e.g. Morning run" autocomplete="off"></label>

      <div class="field"><span>Icon</span>
        <div class="emoji-row"><input name="emoji" class="emoji-input" maxlength="8" value="${esc(h.emoji)}" aria-label="Emoji">
        <div class="emoji-picks">${EMOJIS.map((e) => `<button type="button" class="pick" data-act="pick-emoji" data-v="${e}">${e}</button>`).join('')}</div></div>
      </div>

      <div class="field"><span>Color</span><div class="swatches">
        ${[...new Set([h.color, ...COLORS])].map((c) => `<label class="swatch" style="--c:${safeColor(c)}"><input type="radio" name="color" value="${safeColor(c)}" ${c === h.color ? 'checked' : ''} aria-label="${safeColor(c)}"><i></i></label>`).join('')}
      </div></div>

      <fieldset class="only-amount">
        <div class="grid3">
          <label class="field"><span><span class="only-count">Daily goal</span><span class="only-limit">Daily limit</span></span>
            <input name="target" type="number" inputmode="decimal" min="0" step="any" value="${esc(h.target)}"></label>
          <label class="field"><span>Unit</span><input name="unit" maxlength="16" value="${esc(h.unit)}" placeholder="glasses"></label>
          <label class="field"><span>+ button adds</span><input name="step" type="number" inputmode="decimal" min="0" step="any" value="${esc(h.step)}"></label>
        </div>
        <p class="hint">⏱ Use <b>min</b> or <b>hours</b> as the unit to get a built-in timer for this habit.</p>
      </fieldset>

      <fieldset class="only-check">
        <label class="toggle-row"><input type="checkbox" name="timed" ${h.timed ? 'checked' : ''}>
          <span><b>⏱ Timed habit</b><small>Start a timer from the dashboard. Stopping it marks the habit done and records the minutes.</small></span></label>
      </fieldset>

      <fieldset class="only-build">
        <div class="field"><span>Schedule</span>
          <div class="seg" role="radiogroup" aria-label="Schedule">
            ${radio('kind', 'daily', 'Every day', h.schedule.kind)}${radio('kind', 'weekdays', 'Some days', h.schedule.kind)}${radio('kind', 'weekly', 'X per week', h.schedule.kind)}
          </div>
        </div>
        <div class="daychips only-weekdays">
          ${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label><input type="checkbox" name="days" value="${d}" ${h.schedule.days.includes(d) ? 'checked' : ''}><span>${WEEKDAYS[d][0]}</span></label>`).join('')}
        </div>
        <label class="field only-weekly"><span>Times per week</span><input name="times" type="number" min="1" max="7" value="${esc(h.schedule.times)}"></label>
      </fieldset>

      <fieldset class="only-quit">
        <label class="field"><span>Avoiding it since</span><input name="quitStart" type="datetime-local" value="${toLocalInput(h.quitStart)}" max="${toLocalInput(Date.now())}"></label>
        <label class="field"><span>Money it used to cost per day (optional)</span><input name="cost" type="number" inputmode="decimal" min="0" step="any" value="${esc(h.cost)}" placeholder="0"></label>
        <label class="field"><span>Why does this matter to you? (one reason per line)</span><textarea name="reasons" rows="3" maxlength="600" placeholder="Feel healthier&#10;Save money for a trip&#10;Be there for my family">${esc((h.reasons || []).join('\n'))}</textarea></label>
        <p class="hint">You'll see these when you hit the SOS button during an urge.</p>
      </fieldset>

      <button class="btn primary block" type="submit">${editing ? 'Save changes' : 'Add habit'}</button>
      ${editing ? `<div class="row-btns">
        <button type="button" class="btn" data-act="archive" data-id="${editing.id}">Archive</button>
        <button type="button" class="btn danger" data-act="delete" data-id="${editing.id}">Delete</button></div>` : ''}
    </form>`;
}

function saveHabit(form) {
  const fd = new FormData(form);
  const category = CATS[fd.get('category')] ? fd.get('category') : 'todo';
  const type = typeFor(category, fd.get('track'));
  const name = (fd.get('name') || '').trim();
  if (!name) { toast('Give your habit a name'); form.elements.name.focus(); return; }
  const h = { name, emoji: (fd.get('emoji') || '').trim() || '✅', color: safeColor(fd.get('color')), type, category, timed: type === 'check' && fd.get('timed') === 'on' };

  if (type === 'count' || type === 'limit') {
    const t = parseFloat(fd.get('target'));
    if (!(t > 0)) { toast(type === 'limit' ? 'Set a daily limit above 0' : 'Set a daily goal above 0'); return; }
    const step = parseFloat(fd.get('step'));
    Object.assign(h, { target: t, unit: (fd.get('unit') || '').trim(), step: step > 0 ? step : 1 });
  }
  if (type === 'check' || type === 'count') {
    let kind = fd.get('kind') || 'daily';
    const days = fd.getAll('days').map(Number);
    if (kind === 'weekdays' && !days.length) kind = 'daily';
    h.schedule = { kind, days: days.length ? days : [1, 2, 3, 4, 5], times: clamp(parseInt(fd.get('times'), 10) || 3, 1, 7) };
  } else if (type === 'limit') {
    h.schedule = { kind: 'daily', days: [1, 2, 3, 4, 5], times: 3 };
  } else {
    const ts = new Date(fd.get('quitStart')).getTime();
    h.quitStart = Math.min(Number.isNaN(ts) ? Date.now() : ts, Date.now());
    h.cost = parseFloat(fd.get('cost')) || 0;
    h.reasons = (fd.get('reasons') || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 10);
  }

  const id = form.dataset.id;
  if (id) {
    S.updateHabit(id, h);
    toast('Saved');
    location.hash = `#/habit/${id}`;
  } else {
    S.addHabit({ id: S.uid(), createdAt: L.dateKey(), archived: false, schedule: { kind: 'daily', days: [1, 2, 3, 4, 5], times: 3 }, quitStart: Date.now(), ...h });
    toast(`${h.emoji} ${name} added to ${CATS[category].label}`);
    viewDate = L.dateKey();
    location.hash = '#/today';
  }
}

// ---------- stats ----------
function renderStats() {
  const st = S.getState(), today = L.dateKey();
  const active = st.habits.filter((h) => !h.archived);
  if (!active.length) {
    $app.innerHTML = `${topbar('Your stats', '#/today')}<p class="muted center">Add a habit and your progress will show up here.</p>`;
    return;
  }
  const builds = active.filter((h) => h.type !== 'quit');
  const quits = active.filter((h) => h.type === 'quit');

  let n30 = 0, d30 = 0, checkins = 0;
  for (let i = 0; i < 30; i++) {
    const k = L.addDays(today, -i);
    const t = L.dayTally(builds, st.entries, k, today);
    n30 += t.num; d30 += t.den;
    for (const h of builds) if (L.isDone(h, ents(h)[k])) checkins++;
  }

  const days14 = [];
  for (let i = 13; i >= 0; i--) {
    const k = L.addDays(today, -i);
    const t = L.dayTally(builds, st.entries, k, today, true);
    days14.push({ k, r: t.den ? t.num / t.den : null });
  }

  const wd = Array.from({ length: 7 }, () => ({ num: 0, den: 0 }));
  for (let i = 0; i < 84; i++) {
    const k = L.addDays(today, -i);
    const t = L.dayTally(builds, st.entries, k, today);
    const d = (L.parseKey(k).getDay() + 6) % 7;
    wd[d].num += t.num; wd[d].den += t.den;
  }

  const bestStreak = builds.map((h) => ({ h, s: L.streaks(h, ents(h), today) })).sort((a, b) => b.s.current - a.s.current)[0];
  const quitInfos = quits.map((h) => ({ h, info: L.quitInfo(h, st.slips) }));
  const totalSaved = quitInfos.reduce((a, q) => a + q.info.saved, 0);
  const urges = quits.reduce((a, h) => a + (h.urges || 0), 0);

  const bars = (rows, labelFn) => `<div class="chart">${rows.map((r) => `<div class="col" title="${pct(r.r)}"><div class="b ${r.r == null ? 'none' : ''}" style="height:${r.r == null ? 3 : Math.max(3, r.r * 100)}%"></div><span class="lbl">${labelFn(r)}</span></div>`).join('')}</div>`;

  $app.innerHTML = `
    ${topbar('Your stats', '#/today')}
    <div class="tiles">
      <div class="card tile"><b>${pct(d30 ? n30 / d30 : null)}</b><span>Completion, 30 days</span></div>
      <div class="card tile"><b>${checkins}</b><span>Check-ins, 30 days</span></div>
      <div class="card tile"><b>🔥 ${bestStreak ? bestStreak.s.current : 0}</b><span>${bestStreak ? `Top streak · ${esc(bestStreak.h.name)}` : 'Top streak'}</span></div>
      <div class="card tile"><b>${active.length}</b><span>Active habits</span></div>
    </div>
    ${builds.length ? `
    <section class="card pad"><h2 class="h2">Last 14 days</h2>${bars(days14, (r) => (r.k === today ? 'T' : L.parseKey(r.k).getDate()))}</section>
    <section class="card pad"><h2 class="h2">Best days of the week</h2>
      ${bars(wd.map((w) => ({ r: w.den ? w.num / w.den : null })), (_, i) => '')}
      <div class="chart-labels">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<span>${d}</span>`).join('')}</div>
    </section>
    <section class="card pad"><h2 class="h2">By habit · 30 days</h2>
      ${builds.map((h) => { const r = L.completionRate(h, ents(h), today, 30); const s = L.streaks(h, ents(h), today); return `
        <a class="hbar link-row" href="#/habit/${h.id}" style="--c:${safeColor(h.color)}"><span>${esc(h.emoji)} ${esc(h.name)}</span><div class="bar"><i style="width:${(r || 0) * 100}%"></i></div><b>${pct(r)}</b></a>
        <p class="muted tiny">🔥 ${s.current} now · best ${s.best} ${s.unit}s</p>`; }).join('')}
    </section>` : ''}
    ${quits.length ? `
    <section class="card pad"><h2 class="h2">Quitting</h2>
      <div class="tiles inner">
        <div class="tile"><b>💪 ${urges}</b><span>Urges beaten</span></div>
        <div class="tile"><b>${totalSaved ? money(totalSaved) : '—'}</b><span>Money saved</span></div>
      </div>
      ${quitInfos.map(({ h, info }) => `<a class="link-row qrow" href="#/habit/${h.id}"><span>${esc(h.emoji)} ${esc(h.name)}</span><span class="timer" data-since="${info.last}" data-fmt="short">${L.fmtDuration(info.elapsed, 'short')}</span></a>`).join('')}
    </section>` : ''}
  `;
}

// ---------- friends ----------
// No server yet: each person shares a link carrying a snapshot of their day
// (totals only). Opening a friend's link adds or refreshes them here.
const PENDING_FRIEND_KEY = 'habitflow:pendingFriend';
const pendingFriend = () => { try { return localStorage.getItem(PENDING_FRIEND_KEY); } catch { return null; } };

function initialsOf(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function timeAgo(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

/** Snapshot of my day to share: totals per section, no habit names. */
function myCard() {
  const st = S.getState(), today = L.dateKey();
  const activeOn = (k) => st.habits.filter((h) => !h.archived && (h.type === 'quit' || h.createdAt <= k));
  const active = activeOn(today);
  const s = {};
  for (const c of CAT_ORDER) {
    const t = tally(active.filter((h) => L.catOf(h) === c), today);
    s[c] = [t.num, t.den];
  }
  const all = tally(active, today);
  const w = [];
  for (let i = 6; i >= 0; i--) {
    const k = L.addDays(today, -i);
    const t = tally(activeOn(k), k);
    w.push(t.den ? Math.round((t.num / t.den) * 100) : -1);
  }
  let best = 0;
  for (const h of active) {
    const cur = h.type === 'quit'
      ? L.nightStreaks(h, ents(h), L.quitInfo(h, st.slips).slipDays, L.nightKey()).current
      : L.streaks(h, ents(h), today).current;
    best = Math.max(best, cur);
  }
  return { v: 1, id: S.profileId(), n: firstName() || 'Friend', d: today, j: daysOnApp(), t: [all.num, all.den], s, k: best, w, ts: Date.now() };
}

// Links always point at a web address friends can open (a downloaded copy of the app
// runs from a local file, which nobody else can reach).
const LIVE_URL = 'https://sabareishmanokaran.github.io/habitflow/';
const shareBase = () => (location.protocol.startsWith('http') ? `${location.origin}${location.pathname}` : LIVE_URL);
const linkFor = (card) => `${shareBase()}#/friend/${encodeCard(card)}`;

function shareTextFor(card, toName) {
  const [done, total] = card.t;
  return `${toName ? `Hey ${toName}! ` : ''}${total ? `I've done ${done}/${total} of my habits today` : "I'm building better habits"} on HabitFlow 🌱${card.k ? ` 🔥 ${card.k}-day streak.` : ''} Add me as a friend:`;
}

// The day-card image is drawn ahead of time: phones only allow sharing straight from a
// tap, and drawing it after the tap can take too long on some browsers.
let preparedShare = null;
function prepareShare() {
  if (!navigator.canShare || !S.getState().profile) return;
  const card = myCard();
  const key = JSON.stringify({ ...card, ts: 0 });
  if (preparedShare?.key === key) return;
  const entry = { key, card, file: null };
  preparedShare = entry;
  cardImage(card, CATS, fmtDate(card.d, { weekday: 'short', month: 'short', day: 'numeric' })).then((blob) => {
    if (blob) entry.file = new File([blob], `habitflow-${card.d}.jpg`, { type: 'image/jpeg' });
  }).catch(() => {});
}

async function copyText(text, msg) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast(msg);
}

async function shareMyDay(toName) {
  hideSwipeHint();
  const ready = preparedShare?.file && preparedShare;
  const card = ready ? ready.card : myCard();
  const url = linkFor(card);
  const text = shareTextFor(card, toName);
  try {
    if (ready && navigator.canShare?.({ files: [ready.file] })) {
      await navigator.share({ files: [ready.file], title: 'My HabitFlow day', text: `${text}\n${url}` });
      return;
    }
    if (navigator.share) {
      await navigator.share({ title: 'My HabitFlow day', text, url });
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return; // user closed the share sheet
  }
  copyText(`${text}\n${url}`, 'Link copied. Paste it into a chat with your friends.');
}

async function askForUpdate(name) {
  const text = `Hey ${name}! Send me your HabitFlow day 💪 Here's mine:`;
  const url = linkFor(myCard());
  try {
    if (navigator.share) { await navigator.share({ title: 'HabitFlow', text, url }); return; }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }
  copyText(`${text}\n${url}`, `Message copied. Send it to ${name}.`);
}

function sparkline(w) {
  if (!w?.length) return '';
  return `<span class="spark" aria-label="Last 7 days">${w.map((x) =>
    `<i style="height:${x < 0 ? 8 : Math.max(8, x)}%" class="${x < 0 ? 'none' : ''}"></i>`).join('')}</span>`;
}

function friendCardHTML(card, { me = false } = {}) {
  const [done, total] = card.t;
  const p = total ? done / total : 0;
  const fresh = card.d === L.dateKey();
  const when = fresh ? `Today · ${timeAgo(card.ts)}` : card.d ? `Last shared ${fmtDate(card.d)}` : '';
  return `<article class="fcard ${fresh ? '' : 'stale'}">
    <header class="fc-head">
      <span class="avatar fc-av">${esc(initialsOf(card.n))}</span>
      <div class="fc-who"><b>${esc(card.n)}${me ? ' (you)' : ''}</b><small>${when}</small></div>
      <span class="fc-days">Day ${card.j}</span>
    </header>
    <div class="fc-body">
      <div class="ring-wrap">${ring(p, 84, 9)}<span>${total ? `${done}/${total}` : '—'}</span></div>
      <div class="fc-secs">${CAT_ORDER.map((c) => {
        const [n, d] = card.s[c];
        return d ? `<div class="fc-sec" style="--c:${CATS[c].color}"><span>${CATS[c].label}</span><div class="bar"><i style="width:${(n / d) * 100}%"></i></div><b>${n}/${d}</b></div>` : '';
      }).join('') || '<p class="muted small">No habits yet</p>'}</div>
    </div>
    <footer class="fc-foot"><span>${card.k ? `🔥 ${card.k}-day streak` : '🌱 Just getting started'}</span>${sparkline(card.w)}</footer>
  </article>`;
}

function friendsStrip() {
  const fr = S.getState().friends.slice().sort((a, b) => b.card.ts - a.card.ts);
  const today = L.dateKey();
  setTimeout(prepareShare, 300);
  return `<section class="friends-strip" aria-label="Friends">
    <header class="fs-head"><h2>👥 Friends</h2><a class="link" href="#/friends">${fr.length ? 'See all ›' : 'Open ›'}</a></header>
    ${fr.length ? `<div class="fs-row">
      ${fr.slice(0, 8).map(({ card: c }) => {
        const fresh = c.d === today;
        return `<a class="fs-friend ${fresh ? '' : 'stale'}" href="#/friends">
          <span class="ring-wrap">${ring(c.t[1] ? c.t[0] / c.t[1] : 0, 54, 5)}<span class="fs-av">${esc(initialsOf(c.n))}</span></span>
          <small class="fs-name">${esc(c.n)}</small><small class="fs-score">${fresh ? `${c.t[0]}/${c.t[1]}` : 'not today'}</small></a>`;
      }).join('')}
      <button class="fs-friend fs-share" data-act="share-day"><span class="fs-plus">📤</span><small class="fs-name">Share</small><small class="fs-score">my day</small></button>
    </div>` : `<p class="muted small">Share your day and cheer each other on. Friends only see your totals, never habit names.</p>
      <div class="row-btns"><button class="btn primary" data-act="share-day">📤 Share my day</button><a class="btn" href="#/friends">➕ Add a friend</a></div>`}
  </section>`;
}

function renderFriends() {
  const fr = S.getState().friends.slice().sort((a, b) => b.card.ts - a.card.ts);
  setTimeout(prepareShare, 0);
  $app.innerHTML = `
    ${topbar('Friends', '#/today')}
    <section class="card pad">
      <h2 class="h2">Share your day</h2>
      ${friendCardHTML(myCard(), { me: true })}
      <div class="row-btns">
        <button class="btn primary" data-act="share-day">📤 Share my day</button>
        <button class="btn" data-act="copy-link">🔗 Copy my link</button>
      </div>
      <p class="hint">🔒 Your link shows totals only, never habit names. Friends see your day as of when you share it, so share again to update them.</p>
    </section>
    <section class="card pad">
      <h2 class="h2">Add a friend</h2>
      <p class="muted small">Ask a friend to share their HabitFlow link. Open it, or paste it here.</p>
      <form class="paste-row" data-form="add-friend" novalidate>
        <input name="link" placeholder="Paste a friend's link" autocomplete="off" aria-label="Friend's link">
        <button class="btn primary">Add</button>
      </form>
    </section>
    <h2 class="sec">Your friends${fr.length ? ` (${fr.length})` : ''}</h2>
    ${fr.length ? fr.map(({ id, card }) => `
      <div class="card pad friend-item">
        ${friendCardHTML(card)}
        <div class="row-btns">
          <button class="btn" data-act="ask-update" data-id="${esc(id)}">💬 Ask for an update</button>
          <button class="btn ghost" data-act="remove-friend" data-id="${esc(id)}">Remove</button>
        </div>
      </div>`).join('')
    : '<p class="muted center small">No friends yet. Share your link, and when a friend sends theirs back, they\'ll appear here.</p>'}
  `;
}

function renderFriendLink(payload) {
  const card = payload && decodeCard(payload);
  if (!card) {
    $app.innerHTML = `${topbar('Friend link', '#/friends')}
      <div class="card pad center"><p>😕 This link doesn't look like a HabitFlow day card.</p>
      <p class="muted small">Ask your friend to share it again, and make sure the whole link was copied.</p></div>`;
    return;
  }
  if (card.id === S.profileId()) {
    $app.innerHTML = `${topbar('Your card', '#/friends')}${friendCardHTML(card, { me: true })}
      <p class="muted center small">This is your own link. Send it to friends so they can add you.</p>
      <button class="btn primary block" data-act="share-day">📤 Share my day</button>`;
    return;
  }
  const existing = S.friend(card.id);
  const result = existing ? S.upsertFriend(card) : null; // opening a friend's newer link refreshes them
  $app.innerHTML = `
    ${topbar(`${esc(card.n)}'s day`, '#/friends')}
    ${friendCardHTML(card)}
    ${existing
      ? `<p class="center small ${result === 'updated' ? '' : 'muted'}">${result === 'updated' ? `✅ ${esc(card.n)}'s progress is updated.` : `${esc(card.n)} is already your friend.`}</p>`
      : `<button class="btn primary block" data-act="add-friend" data-payload="${esc(payload)}">➕ Add ${esc(card.n)} as a friend</button>`}
    <button class="btn block" data-act="share-day" data-to="${esc(card.n)}">📤 Share your day with ${esc(card.n)}</button>
    <a class="btn ghost block" href="#/friends">See all friends</a>
  `;
}

// ---------- settings ----------
function renderSettings() {
  const st = S.getState();
  const archived = st.habits.filter((h) => h.archived);
  const theme = st.settings.theme || 'system';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  $app.innerHTML = `
    ${topbar('Settings', '#/today')}
    <section class="card pad">
      <h2 class="h2">Your profile</h2>
      <form class="form" data-form="profile" novalidate>
        ${profileFields(st.profile || {})}
        <button class="btn primary block" type="submit">Save profile</button>
      </form>
    </section>
    <section class="card pad">
      <h2 class="h2">Appearance</h2>
      <div class="seg">${['system', 'light', 'dark'].map((t) => `<label><input type="radio" name="theme" value="${t}" ${t === theme ? 'checked' : ''}><span>${t[0].toUpperCase() + t.slice(1)}</span></label>`).join('')}</div>
      <label class="field"><span>Currency symbol</span><input id="currency" maxlength="4" value="${esc(st.settings.currency)}"></label>
      <label class="field"><span>🌙 Night check-in opens at</span>
        <select id="bedtime">${[18, 19, 20, 21, 22, 23].map((hr) => `<option value="${hr}" ${hr === (st.settings.bedtime ?? 20) ? 'selected' : ''}>${fmtHour(hr)}</option>`).join('')}</select>
      </label>
      <p class="hint">For Not To Do habits, you confirm a clean day by swiping right at bedtime, from this time until ${fmtHour(L.NIGHT_CUTOFF_HOUR)}.</p>
    </section>
    ${standalone ? '' : `<section class="card pad">
      <h2 class="h2">Install on your phone</h2>
      ${installEvt ? '<button class="btn primary block" data-act="install">Install HabitFlow</button>' : ''}
      <p class="small"><b>iPhone / iPad:</b> open this page in Safari → tap <b>Share</b> → <b>Add to Home Screen</b>.</p>
      <p class="small"><b>Android:</b> open in Chrome → tap <b>⋮</b> → <b>Install app</b> (or Add to Home screen).</p>
      <p class="muted small">Once installed it opens full-screen and works offline.</p>
    </section>`}
    <section class="card pad">
      <h2 class="h2">Your data</h2>
      <p class="muted small">Everything is stored privately on this device. Nothing is sent anywhere. Export a backup to move to a new phone.</p>
      <div class="row-btns">
        <button class="btn" data-act="export">Export backup</button>
        <label class="btn">Import backup<input id="import-file" type="file" accept="application/json,.json" hidden></label>
      </div>
    </section>
    ${archived.length ? `<section class="card pad"><h2 class="h2">Archived habits</h2>
      ${archived.map((h) => `<div class="row"><span>${esc(h.emoji)} ${esc(h.name)}</span><button class="btn small" data-act="unarchive" data-id="${h.id}">Restore</button></div>`).join('')}
    </section>` : ''}
    <section class="card pad">
      <h2 class="h2">Danger zone</h2>
      <button class="btn danger block" data-act="reset">Erase all data</button>
    </section>
    <p class="muted tiny center">HabitFlow v1.0 · made with care</p>`;
}

// ---------- sheets ----------
function openSheet(html, onMount) {
  closeSheet();
  $sheet.innerHTML = `<div class="sheet-backdrop" data-act="close-sheet"></div>
    <div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>
    <button class="icon-btn sheet-close" data-act="close-sheet" aria-label="Close">×</button>${html}</div>`;
  document.body.classList.add('noscroll');
  onMount?.($sheet.querySelector('.sheet'));
}

function closeSheet() {
  sheetTimers.forEach((t) => clearTimeout(t));
  sheetTimers = [];
  $sheet.innerHTML = '';
  document.body.classList.remove('noscroll');
}

function openDaySheet(id, key) {
  const h = S.habit(id);
  if (!h) return;
  const e = S.getEntry(id, key) || {};
  openSheet(`<form data-form="day" data-id="${id}" data-key="${key}" style="--c:${safeColor(h.color)}">
    <h2>${esc(h.emoji)} ${esc(h.name)}</h2>
    <p class="muted">${fmtDate(key, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
    ${h.type === 'count' || h.type === 'limit' ? `<label class="field"><span>Amount (${esc(h.unit) || 'total'}) · ${h.type === 'limit' ? 'limit' : 'goal'} ${fmtNum(h.target)}</span>
      <input type="number" name="v" inputmode="decimal" min="0" step="any" value="${e.s === 'skip' ? '' : esc(e.v ?? '')}" placeholder="${h.type === 'limit' ? '0' : fmtNum(h.target)}"></label>` : ''}
    <label class="field"><span>Note</span><textarea name="n" rows="2" maxlength="280" placeholder="How did it go?">${esc(e.n || '')}</textarea></label>
    ${h.type === 'limit' ? `<div class="row-btns">
      <button class="btn primary" name="op" value="done">Save</button>
      <button class="btn ghost" name="op" value="clear">Clear</button>
    </div>` : `<div class="row-btns three">
      <button class="btn primary" name="op" value="done">${h.type === 'count' ? 'Save' : '✓ Done'}</button>
      <button class="btn" name="op" value="skip" title="Rest day: doesn't break your streak">⏸ Skip</button>
      <button class="btn ghost" name="op" value="clear">Clear</button>
    </div>
    <p class="hint">Skip is a rest day: it won't break your streak.</p>`}
  </form>`);
}

function openSlipSheet(id) {
  const h = S.habit(id);
  if (!h) return;
  openSheet(`<form data-form="slip" data-id="${id}" style="--c:${safeColor(h.color)}">
    <h2>Log a slip</h2>
    <p class="muted">A slip isn't failure. It's information. Noting what happened helps you spot patterns and plan for next time.</p>
    <label class="field"><span>When</span><input type="datetime-local" name="when" value="${toLocalInput(Date.now())}" max="${toLocalInput(Date.now())}"></label>
    <div class="field"><span>What triggered it?</span>
      <div class="chips">${TRIGGERS.map((t) => `<label class="chip-radio"><input type="radio" name="trigger" value="${t}"><span>${t}</span></label>`).join('')}</div></div>
    <div class="field"><span>How strong was the urge?</span>
      <div class="seg five">${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="intensity" value="${n}"><span>${n}</span></label>`).join('')}</div></div>
    <label class="field"><span>Note</span><textarea name="note" rows="2" maxlength="280" placeholder="What was happening? What could help next time?"></textarea></label>
    <button class="btn primary block">Save and restart timer</button>
  </form>`);
}

function openSOS(id) {
  const h = S.habit(id);
  if (!h) return;
  openSheet(`<div class="sos" style="--c:${safeColor(h.color)}">
    <h2>You've got this${withName()}.</h2>
    <p class="muted">Urges rise, peak and fade, usually within 15–20 minutes. You don't have to act on it. Just ride the wave.</p>
    <div class="breathe" id="breathe"><span id="breathe-label">Breathe in</span></div>
    <div class="card pad">
      <div class="row"><b>Urge delay</b><span class="timer" id="delay">10:00</span></div>
      <button class="btn block" data-act="start-delay">Start a 10-minute delay</button>
    </div>
    ${h.reasons?.length ? `<div class="card pad"><b>Remember why</b><ul class="reasons">${h.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
    <div class="card pad"><b>Try one right now</b>
      <ul class="tips"><li>💧 Drink a full glass of water</li><li>🚶 Walk for 5 minutes, outside if you can</li><li>📞 Text or call someone you trust</li><li>🧊 Splash cold water on your face</li><li>✍️ Write down what you're feeling</li></ul></div>
    <div class="row-btns">
      <button class="btn primary" data-act="urge-won" data-id="${h.id}">I made it through 💪</button>
      <button class="btn" data-act="slip" data-id="${h.id}">I slipped</button>
    </div>
    <p class="muted tiny center">If you're in crisis or feel unsafe, please contact local emergency services or a support helpline.</p>
  </div>`, startBreathing);
}

function startBreathing(sheet) {
  const el = sheet.querySelector('#breathe'), label = sheet.querySelector('#breathe-label');
  const phases = [['in', 'Breathe in', 4000], ['hold', 'Hold', 4000], ['out', 'Breathe out', 6000]];
  let i = 0;
  const step = () => {
    if (!el.isConnected) return;
    const [cls, text, ms] = phases[i % 3];
    el.className = `breathe ${cls}`;
    label.textContent = text;
    i++;
    sheetTimers.push(setTimeout(step, ms));
  };
  sheetTimers.push(setTimeout(step, 50));
}

function startDelay(btn) {
  const out = $sheet.querySelector('#delay');
  if (!out) return;
  btn.disabled = true;
  btn.textContent = 'Hang in there…';
  const end = Date.now() + 10 * 60 * 1000;
  const iv = setInterval(() => {
    const left = Math.max(0, end - Date.now());
    const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    out.textContent = `${m}:${String(s).padStart(2, '0')}`;
    if (!left) {
      clearInterval(iv);
      vibrate([80, 60, 80]);
      btn.textContent = 'Done. How do you feel now?';
      toast('10 minutes passed. The urge is weaker now.');
    }
  }, 250);
  sheetTimers.push(iv);
}

// ---------- events ----------
const actions = {
  'close-sheet': closeSheet,
  'prev-day': () => { viewDate = L.addDays(viewDate, -1); render(); },
  'next-day': () => { viewDate = L.addDays(viewDate, 1); render(); },
  'go-today': () => { viewDate = L.dateKey(); render(); },
  toggle(el) {
    const id = el.dataset.id, h = S.habit(id);
    const done = L.isDone(h, S.getEntry(id, viewDate));
    S.setEntry(id, viewDate, done ? null : { v: 1 });
    vibrate();
    refresh();
    if (!done) document.querySelector(`.check[data-id="${id}"]`)?.classList.add('pop');
  },
  inc(el) { bump(el.dataset.id); },
  night(el) { nightCheckIn(S.habit(el.dataset.id)); },
  timer(el) { startTimer(el.dataset.id); },
  'share-day'(el) { shareMyDay(el.dataset.to); },
  'copy-link'() { const c = myCard(); copyText(`${shareTextFor(c)}\n${linkFor(c)}`, 'Your link is copied. Paste it into a chat with friends.'); },
  'ask-update'(el) { const f = S.friend(el.dataset.id); if (f) askForUpdate(f.card.n); },
  'remove-friend'(el) {
    const f = S.friend(el.dataset.id);
    if (f && confirm(`Remove ${f.card.n} from your friends?`)) { S.removeFriend(f.id); toast(`${f.card.n} removed`); refresh(); }
  },
  'add-friend'(el) {
    const card = decodeCard(el.dataset.payload);
    if (!card) return;
    S.upsertFriend(card);
    vibrate([20, 40, 20]);
    toast(`🎉 ${card.n} added! Share your day back so they can add you too.`);
    refresh();
  },
  'timer-stop'() { stopTimer(true); },
  'timer-discard'() { if (confirm('Discard this session without saving the time?')) stopTimer(false); },
  'timer-continue'() {
    const t = loadTimer();
    if (t) { saveTimer({ ...t, runStart: Date.now(), reason: '' }); renderTimer(); }
  },
  'hide-hint'() { hideSwipeHint(); refresh(); },
  day(el) { openDaySheet(el.dataset.id, el.dataset.key); },
  slip(el) { openSlipSheet(el.dataset.id); },
  sos(el) { openSOS(el.dataset.id); },
  'start-delay': startDelay,
  'urge-won'(el) {
    const h = S.habit(el.dataset.id);
    S.updateHabit(h.id, { urges: (h.urges || 0) + 1 });
    closeSheet();
    vibrate([30, 40, 30]);
    toast(`Urge beaten${withName(true)}! That makes you stronger. 💪`);
    refresh();
  },
  'del-slip'(el) {
    if (!confirm('Delete this slip?')) return;
    S.deleteSlip(el.dataset.sid);
    refresh();
  },
  'pick-emoji'(el) {
    const input = el.closest('form').elements.emoji;
    input.value = el.dataset.v;
  },
  archive(el) {
    S.updateHabit(el.dataset.id, { archived: true });
    toast('Archived. Restore it any time in Settings.');
    location.hash = '#/today';
  },
  unarchive(el) { S.updateHabit(el.dataset.id, { archived: false }); refresh(); },
  delete(el) {
    if (!confirm('Delete this habit and all its history? This cannot be undone.')) return;
    S.deleteHabit(el.dataset.id);
    toast('Habit deleted');
    location.hash = '#/today';
  },
  export() {
    const blob = new Blob([S.exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `habitflow-backup-${L.dateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  reset() {
    if (!confirm('Erase ALL habits and history on this device? Export a backup first if you want to keep it.')) return;
    S.resetAll();
    applyTheme();
    toast('All data erased');
    location.hash = '#/today';
    render();
  },
  async install() {
    if (!installEvt) return;
    installEvt.prompt();
    await installEvt.userChoice;
    installEvt = null;
    refresh();
  },
};

/** Adds one step to an amount habit for the viewed day, with Undo. */
function bump(id) {
  const h = S.habit(id), key = viewDate;
  const e = S.getEntry(id, key);
  const cur = e?.s === 'skip' ? 0 : e?.v || 0;
  const v = Math.round((cur + (h.step || 1)) * 100) / 100;
  S.setEntry(id, key, { v, ...(e?.n ? { n: e.n } : {}), ...(e?.ok && v <= h.target ? { ok: 1 } : {}) });
  vibrate();
  refresh();
  const undo = { label: 'Undo', fn: () => { S.setEntry(id, key, e ? { ...e } : null); refresh(); } };
  let msg = `${h.emoji} ${fmtNum(v)}/${fmtNum(h.target)} ${h.unit}`;
  if (h.type === 'limit' && cur <= h.target && v > h.target) msg = `Over your ${h.name} limit today. Tomorrow is a fresh start.`;
  else if (h.type === 'count' && cur < h.target && v >= h.target) msg = `${h.emoji} Goal reached${withName(true)}!`;
  toast(msg, undo);
}

// ---------- built-in timer ----------
// Full-screen timer for timed habits. It runs until the screen is touched (or the
// user comes back to the app), then pauses and offers Stop (save) or Continue.
// State lives in localStorage so a running timer survives the app being killed.
const TIMER_KEY = 'habitflow:timer';
const $timer = document.getElementById('timer-root');
let timerTick = null;
let timerArmed = false; // ignore touches for a moment after start/continue

function loadTimer() {
  try { return JSON.parse(localStorage.getItem(TIMER_KEY)); } catch { return null; }
}
function saveTimer(t) {
  try { t ? localStorage.setItem(TIMER_KEY, JSON.stringify(t)) : localStorage.removeItem(TIMER_KEY); } catch { /* storage unavailable */ }
}
const timerElapsed = (t) => t.acc + (t.runStart ? Date.now() - t.runStart : 0);

function fmtClock(ms) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

/** Friendly duration for messages: "45 sec", "12 min", "1 h 05 min". */
function fmtSpent(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return `${Math.max(1, Math.round(ms / 1000))} sec`;
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')} min`;
}

function timerCopy(h) {
  const n = h.name.toLowerCase();
  if (/phone|screen|detox|social/.test(n)) return { run: 'Put your phone down. 📵', hint: 'The timer runs until you touch the screen again.' };
  if (/tv|netflix|youtube|game/.test(n)) return { run: `Timing your ${esc(h.name)}.`, hint: 'Touch the screen when you stop watching.' };
  if (/read|book/.test(n)) return { run: 'Enjoy your reading. 📖', hint: 'Touch the screen when you take a break.' };
  if (/medit|breath|yoga|pray/.test(n)) return { run: 'Breathe slowly. Be here now. 🧘', hint: 'Touch the screen when you finish.' };
  return { run: 'Timer running…', hint: 'Touch the screen to pause.' };
}

function startTimer(id) {
  const h = S.habit(id);
  if (!h || !L.isTimed(h)) return;
  const running = loadTimer();
  if (running && running.habitId !== id) {
    const other = S.habit(running.habitId);
    if (other) { renderTimer(); toast(`Finish your ${other.name} timer first.`); return; }
  }
  hideSwipeHint();
  closeSheet();
  saveTimer(running || { habitId: id, day: L.dateKey(), acc: 0, runStart: Date.now(), reason: '' });
  renderTimer();
}

function renderTimer() {
  const t = loadTimer();
  const h = t && S.habit(t.habitId);
  clearInterval(timerTick);
  if (!h) { saveTimer(null); $timer.innerHTML = ''; document.body.classList.remove('noscroll'); return; }

  const paused = !t.runStart;
  const copy = timerCopy(h);
  const prior = h.type === 'check' ? S.getEntry(h.id, t.day)?.m || 0 : S.getEntry(h.id, t.day)?.v || 0;
  const unit = h.type === 'check' ? 'min' : h.unit;
  const goalLine = h.type === 'check' ? '' : `${h.type === 'limit' ? 'limit' : 'goal'} ${fmtNum(h.target)} ${esc(unit)}`;

  $timer.innerHTML = `
    <div class="timer-screen ${paused ? 'paused' : ''}" style="--c:${safeColor(h.color)}" role="dialog" aria-modal="true" aria-label="${esc(h.name)} timer">
      <div class="ts-top"><span class="ts-emoji">${esc(h.emoji)}</span><b>${esc(h.name)}</b></div>
      <div class="ts-mid">
        <div class="ts-pulse" aria-hidden="true"></div>
        <div class="ts-clock" id="ts-clock" aria-live="off">${fmtClock(timerElapsed(t))}</div>
        <p class="ts-total" id="ts-total"></p>
        <p class="ts-msg">${paused ? (t.reason === 'away' ? '👋 Welcome back! The timer paused when you returned.' : '⏸ Paused') : copy.run}</p>
        ${paused ? '' : `<p class="ts-hint">${copy.hint}</p>`}
      </div>
      ${paused ? `<div class="ts-actions">
        <button class="btn ts-stop" data-act="timer-stop">Stop &amp; save <span id="ts-save"></span></button>
        <button class="btn ts-continue" data-act="timer-continue">Continue</button>
        <button class="link ts-discard" data-act="timer-discard">Discard this session</button>
      </div>` : ''}
    </div>`;
  document.body.classList.add('noscroll');

  const update = () => {
    const cur = loadTimer();
    if (!cur) return;
    const ms = timerElapsed(cur);
    const clock = document.getElementById('ts-clock');
    if (clock) clock.textContent = fmtClock(ms);
    const total = Math.round((prior + (h.type === 'check' ? ms / 60000 : L.msToUnit(h, ms))) * 10) / 10;
    const over = h.type === 'limit' && total > h.target;
    const totalEl = document.getElementById('ts-total');
    if (totalEl) {
      totalEl.textContent = `Today: ${fmtNum(total)} ${unit}${goalLine ? ` · ${goalLine}` : ''}${over ? ' · over limit' : ''}`;
      totalEl.classList.toggle('over', over);
    }
    const save = document.getElementById('ts-save');
    if (save) save.textContent = `(${fmtSpent(ms)})`;
  };
  update();
  if (!paused) {
    timerTick = setInterval(update, 250);
    timerArmed = false;
    setTimeout(() => { timerArmed = true; }, 800);
  } else {
    // Keep the buttons from catching the same tap that paused the timer.
    const actions = $timer.querySelector('.ts-actions');
    actions.style.pointerEvents = 'none';
    setTimeout(() => { actions.style.pointerEvents = ''; }, 450);
  }
}

function pauseTimer(reason = 'touch') {
  const t = loadTimer();
  if (!t || !t.runStart) return;
  saveTimer({ ...t, acc: timerElapsed(t), runStart: null, reason });
  vibrate(30);
  renderTimer();
}

function stopTimer(save) {
  const t = loadTimer();
  saveTimer(null);
  clearInterval(timerTick);
  $timer.innerHTML = '';
  document.body.classList.remove('noscroll');
  const h = t && S.habit(t.habitId);
  if (!h || !save) { if (h) toast('Session discarded'); return; }

  const ms = timerElapsed(t);
  const prev = S.getEntry(h.id, t.day);
  const keep = { ...(prev?.n ? { n: prev.n } : {}) };
  let msg;
  if (h.type === 'check') {
    const m = Math.round(((prev?.m || 0) + ms / 60000) * 10) / 10;
    S.setEntry(h.id, t.day, { v: 1, m, ...keep });
    msg = `${h.emoji} ${fmtSpent(ms)} of ${h.name}. Marked done ✓`;
  } else {
    const base = prev?.s === 'skip' ? 0 : prev?.v || 0;
    const v = Math.round((base + L.msToUnit(h, ms)) * 100) / 100;
    const within = h.type === 'limit' && v <= h.target;
    S.setEntry(h.id, t.day, { v, ...keep, ...(within && prev?.ok ? { ok: 1 } : {}) });
    msg = h.type === 'limit' && v > h.target
      ? `${h.emoji} Added ${fmtSpent(ms)}. That's over your ${h.name} limit today.`
      : `${h.emoji} Added ${fmtSpent(ms)} to ${h.name}${h.type === 'count' && base < h.target && v >= h.target ? '. Goal reached! 🎉' : ''}`;
  }
  vibrate([20, 40, 20]);
  refresh();
  toast(msg, { label: 'Undo', fn: () => { S.setEntry(h.id, t.day, prev ? { ...prev } : null); refresh(); } });
}

// Any touch, click or key on the running timer pauses it.
['pointerdown', 'keydown'].forEach((type) => {
  $timer.addEventListener(type, (ev) => {
    const t = loadTimer();
    if (!t?.runStart || !timerArmed) return;
    ev.preventDefault();
    pauseTimer('touch');
  });
});

// Coming back to the app means the phone is being used again.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && loadTimer()?.runStart && $timer.innerHTML) pauseTimer('away');
});

// ---------- swipe right to complete ----------
const fmtHour = (h) => new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function hideSwipeHint() {
  if (!S.getState().settings.swipeHintSeen) S.setSetting('swipeHintSeen', true);
}

/** Swipe on a To Do / Improve / Reduce row: complete it for the viewed day. */
function swipeComplete(id) {
  const h = S.habit(id);
  if (!h) return;
  hideSwipeHint();
  if (h.type === 'quit') return nightCheckIn(h);

  const key = viewDate, prev = S.getEntry(id, key);
  const note = prev?.n ? { n: prev.n } : {};
  const when = key === L.dateKey() ? 'today' : fmtDate(key);
  let msg;
  if (h.type === 'limit') {
    const v = prev?.s === 'skip' ? 0 : prev?.v || 0;
    if (v > h.target) { toast(`You're over your ${h.name} limit ${when === 'today' ? 'today' : 'that day'}, so it can't be marked. Tomorrow is a fresh start.`); refresh(); return; }
    if (prev?.ok) { toast(`${h.emoji} Already marked within limit for ${when}.`); refresh(); return; }
    S.setEntry(id, key, { v, ok: 1, ...note });
    msg = `${h.emoji} Stayed within your ${h.name} limit ${when === 'today' ? 'today' : `on ${when}`} ✓`;
  } else {
    if (L.isDone(h, prev)) { toast(`${h.emoji} ${h.name} is already done for ${when}.`); refresh(); return; }
    S.setEntry(id, key, { v: h.type === 'count' ? Math.max(prev?.v || 0, h.target) : 1, ...note });
    msg = `${h.emoji} ${h.name} done for ${when}${withName(true)}!`;
  }
  vibrate(20);
  refresh();
  toast(msg, { label: 'Undo', fn: () => { S.setEntry(id, key, prev ? { ...prev } : null); refresh(); } });
}

/**
 * Not To Do: "I'm going to bed without doing it." Checked against the device clock:
 * only for tonight, only from bedtime until the early-morning cutoff, and not after a slip.
 */
function nightCheckIn(h) {
  const now = new Date(), today = L.dateKey(now), nk = L.nightKey(now);
  const bedtime = S.getState().settings.bedtime ?? 20;
  const done = (msg) => { toast(msg); refresh(); };

  if (viewDate !== today && viewDate !== nk) return done('Night check-ins only work for tonight. Past nights can\'t be changed.');
  if (!L.nightCheckInOpen(now, bedtime)) {
    return done(`🌙 Night check-in opens at ${fmtHour(bedtime)}. Stay strong until bedtime${withName(true)}!`);
  }
  if (L.dateKey(new Date(h.quitStart)) > nk) return done('This habit starts after tonight.');
  const info = L.quitInfo(h, S.getState().slips);
  if (info.slipDays.has(nk)) return done('You logged a slip today, so tonight can\'t count. Tomorrow is a fresh start. 💪');
  if (S.getEntry(h.id, nk)?.v) return done(`Already checked in for tonight. Sleep well${withName(true)}! 🌙`);

  S.setEntry(h.id, nk, { v: 1, ts: now.getTime() });
  const n = L.nightStreaks(h, ents(h), info.slipDays, nk).current;
  vibrate([20, 40, 20]);
  refresh();
  toast(`🌙 ${plural(n, 'clean night')} in a row. Sleep well${withName(true)}!`, {
    label: 'Undo', fn: () => { S.setEntry(h.id, nk, null); refresh(); },
  });
}

let swipe = null;
let justSwiped = false;
const swipeThreshold = (row) => Math.min(row.offsetWidth * 0.4, 110);

document.addEventListener('pointerdown', (ev) => {
  const row = ev.target.closest('.ri[data-swipe]');
  if (!row || ev.button > 0 || ev.target.closest('button')) return;
  swipe = { row, fg: row.querySelector('.ri-fg'), x: ev.clientX, y: ev.clientY, dx: 0, active: false, pid: ev.pointerId };
});

document.addEventListener('pointermove', (ev) => {
  if (!swipe || ev.pointerId !== swipe.pid) return;
  const dx = ev.clientX - swipe.x, dy = ev.clientY - swipe.y;
  if (!swipe.active) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { swipe = null; return; } // vertical scroll
    if (!(dx > 10 && dx > Math.abs(dy))) return;
    swipe.active = true;
    swipe.row.classList.add('swiping');
    try { swipe.row.setPointerCapture(ev.pointerId); } catch { /* pointer already gone; moves still reach document */ }
  }
  swipe.dx = Math.max(0, dx);
  swipe.fg.style.transform = `translateX(${swipe.dx}px)`;
  swipe.row.classList.toggle('armed', swipe.dx > swipeThreshold(swipe.row));
});

function endSwipe(ev) {
  if (!swipe || ev.pointerId !== swipe.pid) return;
  const s = swipe;
  swipe = null;
  if (!s.active) return;
  justSwiped = true; // swallow the click that follows the drag
  setTimeout(() => { justSwiped = false; }, 350);
  const commit = ev.type === 'pointerup' && s.dx > swipeThreshold(s.row);
  s.row.classList.remove('swiping', 'armed');
  s.fg.style.transform = '';
  if (commit) swipeComplete(s.row.dataset.swipe);
}
document.addEventListener('pointerup', endSwipe);
document.addEventListener('pointercancel', endSwipe);

document.addEventListener('click', (ev) => {
  if (justSwiped && ev.target.closest('.ri')) { ev.preventDefault(); ev.stopPropagation(); justSwiped = false; }
}, true);

document.addEventListener('click', (ev) => {
  const op = ev.target.closest('button[name="op"]');
  if (op) op.form.dataset.op = op.value; // fallback for browsers without SubmitEvent.submitter
  const el = ev.target.closest('[data-act]');
  if (el && actions[el.dataset.act]) {
    ev.preventDefault();
    actions[el.dataset.act](el, ev);
  }
});

document.addEventListener('submit', (ev) => {
  const form = ev.target;
  ev.preventDefault();
  const fd = new FormData(form);
  if (form.dataset.form === 'habit') return saveHabit(form);

  if (form.dataset.form === 'add-friend') {
    const payload = extractPayload(fd.get('link'));
    const card = payload && decodeCard(payload);
    if (!card) { toast("That doesn't look like a HabitFlow link. Ask your friend to share it again."); return; }
    if (card.id === S.profileId()) { toast("That's your own link 🙂"); return; }
    const res = S.upsertFriend(card);
    toast(res === 'added' ? `🎉 ${card.n} added as a friend!` : res === 'updated' ? `${card.n}'s progress is updated.` : `${card.n} is already up to date.`);
    render();
    return;
  }

  if (form.dataset.form === 'welcome' || form.dataset.form === 'profile') {
    const p = readProfile(form);
    if (!p) return;
    S.setProfile(p);
    $toast.classList.remove('show'); // drop any leftover validation message
    if (form.dataset.form === 'welcome') {
      vibrate([20, 40, 20]);
      const pending = pendingFriend();
      if (pending) { try { localStorage.removeItem(PENDING_FRIEND_KEY); } catch { /* ignore */ } }
      const next = pending ? `#/friend/${pending}` : '#/hello';
      // The invite link may already be the current address, which fires no hashchange.
      if (location.hash === next) render(); else location.hash = next;
    } else {
      toast(`Profile saved. Looking good${withName(true)}!`);
      render();
    }
    return;
  }

  if (form.dataset.form === 'day') {
    const { id, key } = form.dataset;
    const h = S.habit(id);
    const op = ev.submitter?.value || form.dataset.op || 'done';
    const n = (fd.get('n') || '').trim();
    const note = n ? { n } : {};
    if (op === 'clear') S.setEntry(id, key, null);
    else if (op === 'skip') S.setEntry(id, key, { s: 'skip', ...note });
    else if (h.type === 'count' || h.type === 'limit') {
      const raw = fd.get('v');
      const v = raw === '' ? (h.type === 'limit' ? 0 : h.target) : Math.max(0, parseFloat(raw) || 0);
      if (h.type === 'limit') S.setEntry(id, key, { v, ...note, ...(v <= h.target ? { ok: 1 } : {}) }); // saving the day confirms it
      else S.setEntry(id, key, v === 0 && !n ? null : { v, ...note });
    } else S.setEntry(id, key, { v: 1, ...note });
    closeSheet();
    vibrate();
    refresh();
  }

  if (form.dataset.form === 'slip') {
    const h = S.habit(form.dataset.id);
    const now = Date.now();
    let ts = new Date(fd.get('when')).getTime();
    if (Number.isNaN(ts) || ts > now) ts = now;
    if (ts < h.quitStart) { toast('That time is before you started tracking'); return; }
    S.addSlip({
      id: S.uid(),
      habitId: h.id,
      ts,
      trigger: fd.get('trigger') || '',
      intensity: Number(fd.get('intensity')) || 0,
      note: (fd.get('note') || '').trim(),
    });
    closeSheet();
    toast(`Logged. Every restart counts. You can do this${withName(true)}.`);
    refresh();
  }
});

document.addEventListener('change', (ev) => {
  const t = ev.target;
  const form = t.closest('form[data-form="habit"]');
  if (form && (t.name === 'category' || t.name === 'track')) {
    const cat = form.elements.category.value;
    form.dataset.cat = cat;
    form.dataset.type = typeFor(cat, form.elements.track.value);
    const chips = document.getElementById('tpl-chips');
    if (chips && t.name === 'category') chips.innerHTML = templateChips(cat);
  }
  if (form && t.name === 'kind') form.dataset.kind = t.value;
  if (t.name === 'theme') { S.setSetting('theme', t.value); applyTheme(); }
  if (t.id === 'currency') S.setSetting('currency', t.value.trim() || '$');
  if (t.id === 'bedtime') { S.setSetting('bedtime', Number(t.value)); toast(`Night check-in now opens at ${fmtHour(Number(t.value))}`); }
  if (t.id === 'import-file' && t.files[0]) {
    t.files[0].text().then((txt) => {
      try {
        S.importData(txt);
        applyTheme();
        toast('Backup restored');
        render();
      } catch (e) {
        toast(`Import failed: ${e.message}`);
      }
    });
  }
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && $sheet.innerHTML) closeSheet();
});

window.addEventListener('hashchange', () => {
  closeSheet();
  render();
  window.scrollTo(0, 0);
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e;
  if (currentPage === 'settings') refresh();
});

// Live timers + midnight rollover.
setInterval(() => {
  const now = Date.now();
  document.querySelectorAll('[data-since]').forEach((el) => {
    el.textContent = L.fmtDuration(now - Number(el.dataset.since), el.dataset.fmt || 'long');
  });
  const t = L.dateKey();
  if (t !== lastToday) {
    if (viewDate === lastToday) viewDate = t;
    lastToday = t;
    if (!$sheet.innerHTML) refresh();
  }
}, 1000);

// Re-sync when the app comes back to the foreground (common on phones).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !$sheet.innerHTML) refresh();
});

function applyTheme() {
  const t = S.getState().settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

applyTheme();
render();
// Reopen a timer left running (e.g. the phone closed the app). Opening the app
// again means the phone is in use, so it comes back paused.
if (loadTimer()) {
  if (loadTimer().runStart) pauseTimer('away');
  else renderTimer();
}
navigator.storage?.persist?.().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !window.HABITFLOW_STANDALONE) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW registration failed', e));
}
