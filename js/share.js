// Shareable day cards: a small snapshot of someone's day carried inside a link,
// after the "#", so it never reaches a server. Totals only, never habit names.
//
// Card v1: { v, id, n: first name, d: 'YYYY-MM-DD', j: days on HabitFlow,
//            t: [done, total], s: { todo|avoid|improve|reduce: [done, total] },
//            k: best current streak, w: last 7 days completion % (-1 = nothing due), ts }

const SECTIONS = ['todo', 'avoid', 'improve', 'reduce'];

function b64urlEncode(str) {
  let bin = '';
  new TextEncoder().encode(str).forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s) {
  let b = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4) b += '=';
  return new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0)));
}

const int = (v, lo, hi) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};

export const encodeCard = (card) => b64urlEncode(JSON.stringify(card));

/** Parses and validates a card from a link payload. Returns null if it isn't a valid card. */
export function decodeCard(payload) {
  try {
    const raw = JSON.parse(b64urlDecode(String(payload).trim()));
    if (!raw || raw.v !== 1 || typeof raw.id !== 'string' || typeof raw.n !== 'string') return null;
    const id = raw.id.replace(/[^a-z0-9]/gi, '').slice(0, 40);
    if (!id) return null;
    const pair = (p) => {
      const d = Array.isArray(p) ? int(p[1], 0, 999) : 0;
      return [Array.isArray(p) ? int(p[0], 0, d) : 0, d];
    };
    const s = {};
    for (const k of SECTIONS) s[k] = pair(raw.s?.[k]);
    return {
      v: 1,
      id,
      n: raw.n.trim().slice(0, 30) || 'Friend',
      d: /^\d{4}-\d{2}-\d{2}$/.test(raw.d) ? raw.d : '',
      j: int(raw.j, 1, 100000),
      t: pair(raw.t),
      s,
      k: int(raw.k, 0, 100000),
      w: Array.isArray(raw.w) ? raw.w.slice(0, 7).map((x) => (x == null || x < 0 ? -1 : int(x, 0, 100))) : [],
      ts: int(raw.ts, 0, Date.now() + 86400000),
    };
  } catch {
    return null;
  }
}

/** Finds a card payload in pasted text: a full HabitFlow link or just the code. */
export function extractPayload(text) {
  const t = String(text || '').trim();
  const m = t.match(/#\/friend\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{20,}$/.test(t) ? t : null;
}

/**
 * Draws the day card as a 1080×1350 JPEG (good for chats and stories).
 * `sections` maps section key → { label, color }.
 */
export function cardImage(card, sections, dateLabel) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const font = (w, s) => `${w} ${s}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#6366f1'); bg.addColorStop(0.5, '#4f46e5'); bg.addColorStop(1, '#0d9488');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  g.fillStyle = '#fff';
  g.globalAlpha = 0.85; g.font = font(700, 40); g.fillText('🌱 HabitFlow', 80, 120);
  g.globalAlpha = 1; g.font = font(800, 92);
  let name = card.n;
  while (g.measureText(name).width > W - 160 && name.length > 1) name = name.slice(0, -1);
  g.fillText(name === card.n ? name : `${name}…`, 80, 250);
  g.globalAlpha = 0.85; g.font = font(500, 40); g.fillText(`${dateLabel} · Day ${card.j} on HabitFlow`, 80, 315);
  g.globalAlpha = 1;

  // Today's score ring
  const [done, total] = card.t;
  const p = total ? done / total : 0;
  const cx = W / 2, cy = 590, r = 180;
  g.lineWidth = 34; g.lineCap = 'round';
  g.strokeStyle = 'rgba(255,255,255,.2)';
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  if (p > 0) {
    g.strokeStyle = '#fff';
    g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); g.stroke();
  }
  g.textAlign = 'center';
  g.font = font(800, 120); g.fillText(total ? `${done}/${total}` : '—', cx, cy + 35);
  g.font = font(600, 40); g.globalAlpha = 0.9; g.fillText(p === 1 ? 'all done! 🎉' : 'done today', cx, cy + 100);
  g.globalAlpha = 1; g.textAlign = 'left';

  // Section bars
  let y = 860;
  for (const key of SECTIONS) {
    const [n, d] = card.s[key];
    if (!d) continue;
    const meta = sections[key];
    g.font = font(700, 38); g.fillStyle = '#fff'; g.fillText(meta.label, 80, y);
    g.textAlign = 'right'; g.fillText(`${n}/${d}`, W - 80, y); g.textAlign = 'left';
    g.fillStyle = 'rgba(255,255,255,.2)'; roundRect(g, 80, y + 18, W - 160, 22, 11); g.fill();
    if (n) { g.fillStyle = meta.color; roundRect(g, 80, y + 18, (W - 160) * (n / d), 22, 11); g.fill(); }
    y += 88;
  }

  g.fillStyle = '#fff'; g.font = font(700, 40);
  g.textAlign = 'center';
  g.fillText(card.k ? `🔥 ${card.k}-day streak` : '🌱 Building better habits', cx, H - 105);
  g.globalAlpha = 0.75; g.font = font(500, 34); g.fillText('Add me as a friend on HabitFlow', cx, H - 52);
  g.globalAlpha = 1;

  return new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', 0.9));
}

function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}
