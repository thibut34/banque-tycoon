'use strict';
/* =====================================================================
   BANQUE TYCOON — utilitaires, sons et icônes
   ===================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const chance = p => Math.random() < p;
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function weighted(obj) { // {cle: poids}
  let t = 0; for (const k in obj) t += obj[k];
  let r = Math.random() * t;
  for (const k in obj) { r -= obj[k]; if (r <= 0) return k; }
  return Object.keys(obj)[0];
}

const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function money(n) {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e9) return s + nf2.format(a / 1e9) + ' Md€';
  if (a >= 1e6) return s + nf2.format(a / 1e6) + ' M€';
  if (a >= 1e4) return s + nf1.format(a / 1e3) + ' k€';
  return s + nf0.format(a) + ' €';
}
const pct = (x, d = 1) => (d === 2 ? nf2 : nf1).format(x) + ' %';
const cls = n => n >= 0 ? 'pos' : 'neg';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const START_YEAR = 2027;
function dateStr(d) { const m = Math.floor(d / 30); return `${d % 30 + 1} ${MONTHS[m % 12]} ${START_YEAR + Math.floor(m / 12)}`; }
function monthStr(d) { const m = Math.floor(d / 30); return `${MONTHS[m % 12]} ${START_YEAR + Math.floor(m / 12)}`; }

// ---------- Préférences ----------
const PREFS_KEY = 'banqueTycoon.prefs';
const prefs = (() => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (e) { return {}; } })();
function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { } }

// ---------- Sons (synthétisés, aucun fichier) ----------
const SFX = (() => {
  let ctx = null;
  function ac() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(f, t0, dur, type = 'sine', vol = 0.12, f2) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const sounds = {
    click: () => tone(660, 0, 0.05, 'triangle', 0.05),
    coin: () => { tone(988, 0, 0.08, 'square', 0.05); tone(1319, 0.07, 0.22, 'square', 0.05); },
    good: () => { tone(523, 0, 0.12, 'triangle'); tone(659, 0.09, 0.12, 'triangle'); tone(784, 0.18, 0.25, 'triangle'); },
    bad: () => { tone(330, 0, 0.18, 'sawtooth', 0.06, 220); tone(220, 0.15, 0.3, 'sawtooth', 0.06, 140); },
    notify: () => { tone(880, 0, 0.09, 'sine', 0.08); tone(1175, 0.08, 0.14, 'sine', 0.07); },
    build: () => { tone(180, 0, 0.12, 'square', 0.06, 90); tone(420, 0.08, 0.1, 'triangle', 0.06); },
    combo: n => { const f = 440 * Math.pow(2, Math.min(n, 12) / 12); tone(f, 0, 0.07, 'square', 0.04); tone(f * 1.5, 0.06, 0.12, 'triangle', 0.06); },
    star: i => { const f = [784, 988, 1175, 1568][i || 0]; tone(f, 0, 0.18, 'triangle', 0.1); tone(f * 2, 0.04, 0.25, 'sine', 0.04); },
    chest: () => { [0, 0.12, 0.24, 0.36, 0.48].forEach((t, i) => tone(200 + i * 40, t, 0.08, 'square', 0.05)); tone(523, 0.75, 0.15, 'triangle', 0.1); tone(1047, 0.85, 0.5, 'sine', 0.1); },
    level: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.1)); tone(1319, 0.5, 0.6, 'sine', 0.08); },
  };
  return { play(n, a) { if (prefs.mute || !sounds[n] || (window.CG && (CG.muted || CG.adOn))) return; try { sounds[n](a); } catch (e) { } } };
})();

// ---------- Icônes (SVG au trait) ----------
const ICONS = {
  dash: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  bank: '<path d="M3 21h18M5 21V10M9.5 21V10M14.5 21V10M19 21V10M2.5 10 12 3.5 21.5 10z"/>',
  loans: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
  deposits: '<path d="M19 7V5.5A2.5 2.5 0 0 0 16.5 3h-11A2.5 2.5 0 0 0 3 5.5v13A2.5 2.5 0 0 0 5.5 21h11a2.5 2.5 0 0 0 2.5-2.5V17"/><path d="M21 8h-4.5a3.5 3.5 0 0 0 0 7H21z"/>',
  world: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
  markets: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  missions: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  ranking: '<path d="M6 20V11M12 20V4M18 20v-6"/>',
  cb: '<circle cx="9" cy="9" r="6"/><path d="M15.4 10.2a6 6 0 1 1-5.2 5.2"/>',
  upgrades: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 14h5M9.5 8h5M17.5 16h5"/>',
  me: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  achs: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  vol: '<path d="M11 5 6 9H2.5v6H6l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9.5 9.5 0 0 1 0 13"/>',
  mute: '<path d="M11 5 6 9H2.5v6H6l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>',
  lock: '<rect x="4.5" y="11" width="15" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  flag: '<path d="M5 21V4M5 4h12l-2.5 4.5L17 13H5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
};
function ic(name, extra = '') {
  return `<svg class="i ${extra}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
