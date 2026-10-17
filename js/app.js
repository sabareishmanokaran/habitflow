import * as S from './store.js';
import * as L from './logic.js';

const $app = document.getElementById('app');
const $sheet = document.getElementById('sheet-root');
const $toast = document.getElementById('toast');

let viewDate = L.dateKey();
let lastToday = viewDate;
let currentPage = 'today';
let sheetTimers = [];
let installEvt = null;

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6'];
const EMOJIS = ['✅', '💧', '🏃', '💪', '🚶', '📖', '🧘', '😴', '🥗', '✍️', '💊', '🎸', '🧹', '🚭', '🍺', '📵', '🍬', '🎮'];
const TRIGGERS = ['Stress', 'Boredom', 'Craving', 'Social', 'Tired', 'Lonely', 'Anger', 'Celebrating', 'Other'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TEMPLATES = [
  { name: 'Drink water', emoji: '💧', type: 'count', target: 8, unit: 'glasses', step: 1, color: '#06b6d4' },
  { name: 'Workout', emoji: '💪', type: 'check', color: '#22c55e', schedule: { kind: 'weekly', times: 3 } },
  { name: 'Walk', emoji: '🚶', type: 'count', target: 10000, unit: 'steps', step: 1000, color: '#14b8a6' },
  { name: 'Read', emoji: '📖', type: 'count', target: 20, unit: 'min', step: 5, color: '#8b5cf6' },
  { name: 'Meditate', emoji: '🧘', type: 'check', color: '#6366f1' },
  { name: 'Sleep by 11pm', emoji: '😴', type: 'check', color: '#06b6d4' },
  { name: 'Quit smoking', emoji: '🚭', type: 'quit', color: '#ef4444', cost: 10 },
  { name: 'No alcohol', emoji: '🍺', type: 'quit', color: '#f59e0b' },
  { name: 'Less social media', emoji: '📵', type: 'quit', color: '#ec4899' },
  { name: 'No sugar', emoji: '🍬', type: 'quit', color: '#8b5cf6' },
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

function toast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $toast.classList.remove('show'), 2400);
}

function ring(p, size = 64, stroke = 7) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, m = size / 2;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${stroke}"/>
    <circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="var(--c, var(--accent))" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamp(p, 0, 1))}" transform="rotate(-90 ${m} ${m})"/></svg>`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
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
  const { page, id } = parseRoute();
  currentPage = page;
  document.body.dataset.page = page;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === page));
  switch (page) {
    case 'habit': return renderDetail(id);
    case 'new': return renderForm(null, id);
    case 'edit': return renderForm(id);
    case 'stats': return renderStats();
    case 'settings': return renderSettings();
    default: return renderToday();
  }
}

/** Re-render after a data change (forms are left alone so typing isn't lost). */
function refresh() {
  if (currentPage !== 'new' && currentPage !== 'edit') render();
}

// ---------- Today ----------
function habitCard(h, key) {
  const e = ents(h), entry = e[key];
  const done = L.isDone(h, entry), skipped = entry?.s === 'skip';
  const st = L.streaks(h, e, L.dateKey());
  const sub = [];
  if (h.type === 'count') sub.push(`${fmtNum(skipped ? 0 : entry?.v || 0)} / ${fmtNum(h.target)} ${esc(h.unit)}`);
  if (h.schedule?.kind === 'weekly') sub.push(`${L.weekCount(h, e, key)}/${h.schedule.times} this week`);
  if (st.current) sub.push(`🔥 ${plural(st.current, st.unit)}`);
  if (skipped) sub.push('Skipped');
  if (!sub.length) sub.push(scheduleLabel(h));

  const control = h.type === 'count'
    ? `<div class="stepper">
         <button class="step" data-act="dec" data-id="${h.id}" aria-label="Decrease">−</button>
         <button class="step plus" data-act="inc" data-id="${h.id}" aria-label="Increase by ${fmtNum(h.step || 1)}">+</button>
       </div>`
    : `<button class="check ${done ? 'on' : ''}" data-act="toggle" data-id="${h.id}" aria-pressed="${done}" aria-label="Mark ${esc(h.name)} done">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
       </button>`;

  return `<article class="card habit ${done ? 'done' : ''} ${skipped ? 'skipped' : ''}" style="--c:${safeColor(h.color)}">
    <a class="habit-main" href="#/habit/${h.id}">
      <span class="emoji">${esc(h.emoji)}</span>
      <span class="htext"><span class="hname">${esc(h.name)}</span><span class="hsub">${sub.join(' · ')}</span></span>
    </a>
    <button class="icon-btn more" data-act="day" data-id="${h.id}" data-key="${key}" aria-label="Log details">⋯</button>
    ${control}
    ${h.type === 'count' ? `<div class="bar"><i style="width:${L.progress(h, entry) * 100}%"></i></div>` : ''}
  </article>`;
}

function quitCard(h) {
  const info = L.quitInfo(h, S.getState().slips);
  const next = L.nextMilestone(info.elapsed);
  return `<a class="card quit" href="#/habit/${h.id}" style="--c:${safeColor(h.color)}">
    <span class="emoji">${esc(h.emoji)}</span>
    <span class="htext">
      <span class="hname">${esc(h.name)}</span>
      <span class="timer" data-since="${info.last}">${L.fmtDuration(info.elapsed)}</span>
      <span class="hsub">${next ? `Next: ${next.label} · ${Math.round(next.progress * 100)}%` : 'All milestones reached 🏆'}</span>
    </span>
    <span class="ring-wrap small">${ring(next ? next.progress : 1, 44, 5)}</span>
  </a>`;
}

function emptyState() {
  return `<section class="empty">
    <div class="empty-art">🌱</div>
    <h1>Start small. Stay consistent.</h1>
    <p class="muted">Track habits you want to build, goals you want to measure, or things you want to quit.</p>
    <div class="template-grid">
      ${TEMPLATES.map((t, i) => `<a class="card template" href="#/new/t${i}" style="--c:${t.color}"><span class="emoji">${t.emoji}</span><span>${t.name}</span></a>`).join('')}
    </div>
    <a class="btn primary block" href="#/new">Create your own habit</a>
  </section>`;
}

function renderToday() {
  const st = S.getState(), today = L.dateKey();
  if (viewDate > today) viewDate = today;
  const active = st.habits.filter((h) => !h.archived);
  if (!active.length) { $app.innerHTML = emptyState(); return; }

  const quits = active.filter((h) => h.type === 'quit');
  const builds = active.filter((h) => h.type !== 'quit' && h.createdAt <= viewDate);
  const due = builds.filter((h) => L.isDue(h, viewDate));
  const later = builds.filter((h) => !L.isDue(h, viewDate));
  const counted = due.filter((h) => L.countsToday(h, ents(h), viewDate));
  const doneN = counted.filter((h) => L.isDone(h, ents(h)[viewDate])).length;
  const p = counted.length ? doneN / counted.length : 0;
  const isToday = viewDate === today;

  $app.innerHTML = `
    <header class="today-head">
      <div>
        <p class="eyebrow">${greeting()}</p>
        <div class="datenav">
          <button class="icon-btn" data-act="prev-day" aria-label="Previous day">‹</button>
          <h1>${isToday ? 'Today' : fmtDate(viewDate)}</h1>
          <button class="icon-btn" data-act="next-day" aria-label="Next day" ${isToday ? 'disabled' : ''}>›</button>
        </div>
        <p class="muted small">${isToday ? fmtDate(viewDate, { weekday: 'long', month: 'long', day: 'numeric' }) : '<button class="link" data-act="go-today">Back to today</button>'}</p>
      </div>
      <div class="ring-wrap">${ring(p, 76, 8)}<span>${counted.length ? `${doneN}/${counted.length}` : '—'}</span></div>
    </header>
    ${p === 1 && counted.length ? `<p class="celebrate">🎉 Everything done${isToday ? ' today' : ''}. Great work!</p>` : ''}
    ${quits.length ? `<h2 class="sec">Staying strong</h2>${quits.map(quitCard).join('')}` : ''}
    ${due.length ? `<h2 class="sec">Habits</h2>${due.map((h) => habitCard(h, viewDate)).join('')}` : ''}
    ${later.length ? `<h2 class="sec">Not scheduled ${isToday ? 'today' : 'this day'}</h2>${later.map((h) => habitCard(h, viewDate)).join('')}` : ''}
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
      const cls = k < quitStartKey ? 'pre' : quit.slipDays.has(k) ? 'slip' : 'l4';
      cells += `<span class="cell ${cls}" title="${label}"></span>`;
      continue;
    }
    const entry = e[k];
    let cls;
    if (entry?.s === 'skip') cls = 'skip';
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
  return `
    <p class="muted center">${scheduleLabel(h)}${h.type === 'count' ? ` · goal ${fmtNum(h.target)} ${esc(h.unit)}` : ''}</p>
    <div class="tiles">
      <div class="card tile"><b>🔥 ${st.current}</b><span>Current streak (${st.unit}s)</span></div>
      <div class="card tile"><b>🏆 ${st.best}</b><span>Best streak (${st.unit}s)</span></div>
      <div class="card tile"><b>${pct(L.completionRate(h, e, today, 30))}</b><span>Last 30 days</span></div>
      <div class="card tile"><b>${h.type === 'count' ? fmtNum(tot.amount) : tot.done}</b><span>${h.type === 'count' ? `Total ${esc(h.unit)}` : 'Times done'}</span></div>
    </div>
    <section class="card pad">
      <div class="row"><h2 class="h2">History</h2><span class="muted small">Tap a day to edit</span></div>
      ${heatmap(h)}
      <div class="legend"><span><i class="cell miss"></i>Missed</span><span><i class="cell skip"></i>Skipped</span><span><i class="cell l4"></i>Done</span></div>
    </section>
    <button class="btn block" data-act="day" data-id="${h.id}" data-key="${today}">Log today with a note</button>
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

  return `
    <section class="card hero">
      <p class="eyebrow">Clean for</p>
      <div class="timer-big" data-since="${info.last}">${L.fmtDuration(info.elapsed)}</div>
      ${next ? `<div class="bar big"><i style="width:${next.progress * 100}%"></i></div>
        <p class="muted small">Next milestone: <b>${next.label}</b></p>` : '<p>🏆 Every milestone reached. Incredible.</p>'}
      <div class="row-btns">
        <button class="btn sos" data-act="sos" data-id="${h.id}">🆘 I have an urge</button>
        <button class="btn" data-act="slip" data-id="${h.id}">I slipped</button>
      </div>
    </section>
    <div class="tiles">
      <div class="card tile"><b>🏆 ${L.fmtDuration(info.best, 'short')}</b><span>Longest streak</span></div>
      <div class="card tile"><b>💪 ${h.urges || 0}</b><span>Urges beaten</span></div>
      <div class="card tile"><b>${info.cleanDays}</b><span>Clean days total</span></div>
      ${h.cost ? `<div class="card tile"><b>${money(info.saved)}</b><span>Money saved</span></div>` : `<div class="card tile"><b>${info.count}</b><span>Slips logged</span></div>`}
    </div>
    ${h.reasons?.length ? `<section class="card pad"><h2 class="h2">Why I'm doing this</h2><ul class="reasons">${h.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></section>` : ''}
    <section class="card pad">
      <h2 class="h2">Milestones</h2>
      <div class="badges">${L.MILESTONES.map((m) => `<span class="badge ${info.best >= m.days * L.DAY_MS ? 'got' : ''}">${info.best >= m.days * L.DAY_MS ? '🏅' : '🔒'} ${m.label}</span>`).join('')}</div>
    </section>
    <section class="card pad">
      <h2 class="h2">Clean days</h2>
      ${heatmap(h)}
      <div class="legend"><span><i class="cell l4"></i>Clean</span><span><i class="cell slip"></i>Slip</span></div>
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
function renderForm(id, tplId) {
  const editing = id ? S.habit(id) : null;
  if (id && !editing) { location.hash = '#/today'; return; }
  const tpl = tplId && /^t\d+$/.test(tplId) ? TEMPLATES[Number(tplId.slice(1))] : null;
  const base = { name: '', emoji: '✅', color: COLORS[0], type: 'check', target: 1, unit: '', step: 1, cost: '', reasons: [], quitStart: Date.now(), schedule: { kind: 'daily', days: [1, 2, 3, 4, 5], times: 3 } };
  const src = editing || tpl || {};
  const h = { ...base, ...src, schedule: { ...base.schedule, ...(src.schedule || {}) } };
  const radio = (name, value, label, cur) => `<label><input type="radio" name="${name}" value="${value}" ${value === cur ? 'checked' : ''}><span>${label}</span></label>`;

  $app.innerHTML = `
    ${topbar(editing ? 'Edit habit' : 'New habit', editing ? `#/habit/${editing.id}` : '#/today')}
    ${editing ? '' : `<p class="muted small">Quick start</p><div class="templates">${TEMPLATES.map((t, i) => `<a class="chip" href="#/new/t${i}">${t.emoji} ${t.name}</a>`).join('')}</div>`}
    <form class="form" data-form="habit" data-id="${editing?.id || ''}" data-type="${h.type}" data-kind="${h.schedule.kind}" novalidate>
      <div class="seg" role="radiogroup" aria-label="Habit type">
        ${radio('type', 'check', '✓ Build', h.type)}${radio('type', 'count', '🔢 Measure', h.type)}${radio('type', 'quit', '🚫 Quit', h.type)}
      </div>
      <p class="hint only-check">A yes/no habit, like meditating or going to the gym.</p>
      <p class="hint only-count">Track an amount toward a daily goal: water, steps, minutes, pages.</p>
      <p class="hint only-quit">Break a bad habit or addiction. A live timer counts your clean time.</p>

      <label class="field"><span>Name</span><input name="name" maxlength="40" value="${esc(h.name)}" placeholder="e.g. Morning run" autocomplete="off"></label>

      <div class="field"><span>Icon</span>
        <div class="emoji-row"><input name="emoji" class="emoji-input" maxlength="8" value="${esc(h.emoji)}" aria-label="Emoji">
        <div class="emoji-picks">${EMOJIS.map((e) => `<button type="button" class="pick" data-act="pick-emoji" data-v="${e}">${e}</button>`).join('')}</div></div>
      </div>

      <div class="field"><span>Color</span><div class="swatches">
        ${COLORS.map((c) => `<label class="swatch" style="--c:${c}"><input type="radio" name="color" value="${c}" ${c === h.color ? 'checked' : ''} aria-label="${c}"><i></i></label>`).join('')}
      </div></div>

      <fieldset class="only-count">
        <div class="grid3">
          <label class="field"><span>Daily goal</span><input name="target" type="number" inputmode="decimal" min="0" step="any" value="${esc(h.target)}"></label>
          <label class="field"><span>Unit</span><input name="unit" maxlength="16" value="${esc(h.unit)}" placeholder="glasses"></label>
          <label class="field"><span>+ button adds</span><input name="step" type="number" inputmode="decimal" min="0" step="any" value="${esc(h.step)}"></label>
        </div>
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
        <label class="field"><span>Quit since</span><input name="quitStart" type="datetime-local" value="${toLocalInput(h.quitStart)}" max="${toLocalInput(Date.now())}"></label>
        <label class="field"><span>Money spent per day on it (optional)</span><input name="cost" type="number" inputmode="decimal" min="0" step="any" value="${esc(h.cost)}" placeholder="0"></label>
        <label class="field"><span>Why are you quitting? (one reason per line)</span><textarea name="reasons" rows="3" maxlength="600" placeholder="Breathe easier on runs&#10;Save money for a trip&#10;Be there for my kids">${esc((h.reasons || []).join('\n'))}</textarea></label>
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
  const type = fd.get('type');
  const name = (fd.get('name') || '').trim();
  if (!name) { toast('Give your habit a name'); form.elements.name.focus(); return; }
  const h = { name, emoji: (fd.get('emoji') || '').trim() || '✅', color: safeColor(fd.get('color')), type };

  if (type === 'count') {
    const t = parseFloat(fd.get('target'));
    if (!(t > 0)) { toast('Set a daily goal above 0'); return; }
    const step = parseFloat(fd.get('step'));
    Object.assign(h, { target: t, unit: (fd.get('unit') || '').trim(), step: step > 0 ? step : 1 });
  }
  if (type !== 'quit') {
    let kind = fd.get('kind') || 'daily';
    const days = fd.getAll('days').map(Number);
    if (kind === 'weekdays' && !days.length) kind = 'daily';
    h.schedule = { kind, days: days.length ? days : [1, 2, 3, 4, 5], times: clamp(parseInt(fd.get('times'), 10) || 3, 1, 7) };
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
    toast(`${h.emoji} ${name} added`);
    viewDate = L.dateKey();
    location.hash = '#/today';
  }
}

// ---------- stats ----------
function renderStats() {
  const st = S.getState(), today = L.dateKey();
  const active = st.habits.filter((h) => !h.archived);
  if (!active.length) {
    $app.innerHTML = `<header class="topbar plain"><h1>Stats</h1></header><p class="muted center">Add a habit and your progress will show up here.</p>`;
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
    <header class="topbar plain"><h1>Stats</h1></header>
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

// ---------- settings ----------
function renderSettings() {
  const st = S.getState();
  const archived = st.habits.filter((h) => h.archived);
  const theme = st.settings.theme || 'system';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  $app.innerHTML = `
    <header class="topbar plain"><h1>Settings</h1></header>
    <section class="card pad">
      <h2 class="h2">Appearance</h2>
      <div class="seg">${['system', 'light', 'dark'].map((t) => `<label><input type="radio" name="theme" value="${t}" ${t === theme ? 'checked' : ''}><span>${t[0].toUpperCase() + t.slice(1)}</span></label>`).join('')}</div>
      <label class="field"><span>Currency symbol</span><input id="currency" maxlength="4" value="${esc(st.settings.currency)}"></label>
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
    ${h.type === 'count' ? `<label class="field"><span>Amount (${esc(h.unit) || 'total'}) · goal ${fmtNum(h.target)}</span>
      <input type="number" name="v" inputmode="decimal" min="0" step="any" value="${e.s === 'skip' ? '' : esc(e.v ?? '')}" placeholder="${fmtNum(h.target)}"></label>` : ''}
    <label class="field"><span>Note</span><textarea name="n" rows="2" maxlength="280" placeholder="How did it go?">${esc(e.n || '')}</textarea></label>
    <div class="row-btns three">
      <button class="btn primary" name="op" value="done">${h.type === 'count' ? 'Save' : '✓ Done'}</button>
      <button class="btn" name="op" value="skip" title="Rest day: doesn't break your streak">⏸ Skip</button>
      <button class="btn ghost" name="op" value="clear">Clear</button>
    </div>
    <p class="hint">Skip is a rest day: it won't break your streak.</p>
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
    <h2>You've got this.</h2>
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
  inc(el) { bump(el.dataset.id, +1); },
  dec(el) { bump(el.dataset.id, -1); },
  day(el) { openDaySheet(el.dataset.id, el.dataset.key); },
  slip(el) { openSlipSheet(el.dataset.id); },
  sos(el) { openSOS(el.dataset.id); },
  'start-delay': startDelay,
  'urge-won'(el) {
    const h = S.habit(el.dataset.id);
    S.updateHabit(h.id, { urges: (h.urges || 0) + 1 });
    closeSheet();
    vibrate([30, 40, 30]);
    toast('Urge beaten! That makes you stronger. 💪');
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

function bump(id, dir) {
  const h = S.habit(id);
  const e = S.getEntry(id, viewDate);
  const cur = e?.s === 'skip' ? 0 : e?.v || 0;
  const v = Math.max(0, Math.round((cur + dir * (h.step || 1)) * 100) / 100);
  const wasDone = L.isDone(h, e);
  S.setEntry(id, viewDate, v === 0 && !e?.n ? null : { v, ...(e?.n ? { n: e.n } : {}) });
  vibrate();
  refresh();
  if (!wasDone && v >= h.target) toast(`${h.emoji} Goal reached!`);
}

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

  if (form.dataset.form === 'day') {
    const { id, key } = form.dataset;
    const h = S.habit(id);
    const op = ev.submitter?.value || form.dataset.op || 'done';
    const n = (fd.get('n') || '').trim();
    const note = n ? { n } : {};
    if (op === 'clear') S.setEntry(id, key, null);
    else if (op === 'skip') S.setEntry(id, key, { s: 'skip', ...note });
    else if (h.type === 'count') {
      const raw = fd.get('v');
      const v = raw === '' ? h.target : Math.max(0, parseFloat(raw) || 0);
      S.setEntry(id, key, v === 0 && !n ? null : { v, ...note });
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
    toast('Logged. Every restart counts. You can do this.');
    refresh();
  }
});

document.addEventListener('change', (ev) => {
  const t = ev.target;
  const form = t.closest('form[data-form="habit"]');
  if (form && t.name === 'type') form.dataset.type = t.value;
  if (form && t.name === 'kind') form.dataset.kind = t.value;
  if (t.name === 'theme') { S.setSetting('theme', t.value); applyTheme(); }
  if (t.id === 'currency') S.setSetting('currency', t.value.trim() || '$');
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
navigator.storage?.persist?.().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW registration failed', e));
}
