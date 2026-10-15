'use strict';
/* =====================================================================
   BANQUE TYCOON — personnalisation des agences
   Thème (sol, murs, tapis, mobilier) et disposition libre des meubles.
   b.theme = { floor, wall, carpet, accent }
   b.pos[niveau][clé] = [dx, dy] : décalage par rapport à la place d'origine
   ===================================================================== */

const THEMES = {
  floor: {
    marbre: { name: 'Marbre', c: ['#ebe5da', '#ddd5c6'] },
    damier: { name: 'Damier', c: ['#f1f5f9', '#334155'] },
    parquet: { name: 'Parquet', c: ['#c08a5a', '#ad7848'], stripes: true },
    moquette: { name: 'Moquette', c: ['#4b5563', '#465060'] },
    beton: { name: 'Béton ciré', c: ['#cbd5e1', '#c2ccd8'] },
    terrazzo: { name: 'Terrazzo', c: ['#f5f0e8', '#ece4d6'], dots: true },
    or: { name: 'Marbre doré', c: ['#f7e7b4', '#ead38a'], lock: 3 },
  },
  wall: { creme: '#f1ebe0', blanc: '#f8fafc', bleu: '#bfdbfe', vert: '#bbf7d0', rose: '#fecdd3', lavande: '#ddd6fe', gris: '#cbd5e1', nuit: '#334155' },
  carpet: { rouge: '#9f1239', bleu: '#1d4ed8', vert: '#15803d', violet: '#6d28d9', noir: '#111827', aucun: null },
  accent: { indigo: '#4f46e5', rouge: '#be123c', vert: '#15803d', moutarde: '#ca8a04', noir: '#1f2937', rose: '#db2777' },
};
const THEME_DEFAULT = { floor: 'marbre', wall: 'creme', carpet: 'rouge', accent: 'indigo' };
const themeOf = b => Object.assign({}, THEME_DEFAULT, b.theme || {});
const MOVABLE = ['g', 'b', 'dab', 'vig', 'deco'];

// Disposition propre à l'agence (décalages appliqués aux places d'origine)
const blayCache = new Map();
function shiftSlot(sl, dx, dy) {
  const o = { ...sl, x: sl.x + dx, y: sl.y + dy, moved: !!(dx || dy) };
  if (sl.staff) o.staff = [sl.staff[0] + dx, sl.staff[1] + dy];
  if (sl.cli) o.cli = [sl.cli[0] + dx, sl.cli[1] + dy];
  return o;
}
function blay(b, drag) {
  const pos = (b.pos && b.pos[b.size]) || {};
  const key = b.id + '|' + b.size + '|' + JSON.stringify(pos);
  let lay = !drag && blayCache.get(key);
  if (!lay) {
    const base = layout(b.size);
    lay = { ...base };
    for (const k of MOVABLE) lay[k] = base[k].map((sl, i) => { const d = pos[k + i]; return d ? shiftSlot(sl, d[0], d[1]) : sl; });
    if (!drag) { blayCache.set(key, lay); if (blayCache.size > 200) blayCache.clear(); }
  }
  if (drag) {
    lay = { ...lay, [drag.kind]: lay[drag.kind].slice() };
    const sl = lay[drag.kind][drag.i];
    lay[drag.kind][drag.i] = shiftSlot(sl, drag.x - sl.x, drag.y - sl.y);
  }
  return lay;
}
const builtCount = (b, k) => b[k];

// Un meuble est bien placé s'il reste dans la salle et ne chevauche aucun autre
function placeOk(b, lay, kind, i, x, y) {
  const sl = lay[kind][i], hw = sl.w / 2 + 0.05, hd = sl.d / 2 + 0.05;
  const m = 0.15, { W, D } = lay;
  if (x - hw < m || x + hw > W - m || y - hd < m || y + hd > D - m) return false;
  const moved = shiftSlot(sl, x - sl.x, y - sl.y);
  for (const p of [moved.staff, moved.cli]) if (p && (p[0] < 0.2 || p[0] > W - 0.2 || p[1] < 0.2 || p[1] > D - 0.2)) return false;
  for (const k of MOVABLE) for (let j = 0; j < builtCount(b, k); j++) {
    if (k === kind && j === i) continue;
    const o = lay[k][j];
    if (Math.abs(o.x - x) < o.w / 2 + hw && Math.abs(o.y - y) < o.d / 2 + hd) return false;
  }
  // garder libre le passage devant la porte
  if (Math.abs(x - lay.mid) < hw + 0.7 && y + hd > D - 1.3) return false;
  return true;
}
function setPos(b, kind, i, x, y) {
  const def = layout(b.size)[kind][i];
  b.pos = b.pos || {}; b.pos[b.size] = b.pos[b.size] || {};
  const dx = Math.round((x - def.x) * 4) / 4, dy = Math.round((y - def.y) * 4) / 4;
  if (!dx && !dy) delete b.pos[b.size][kind + i]; else b.pos[b.size][kind + i] = [dx, dy];
}
// Après une construction : si la place d'origine est occupée, on cherche la plus proche libre
function autoPlace(b, kind, i) {
  const lay = blay(b), sl = lay[kind][i];
  if (placeOk(b, lay, kind, i, sl.x, sl.y)) return;
  for (let r = 0.5; r <= 8; r += 0.5) for (let a = 0; a < 16; a++) {
    const x = sl.x + Math.cos(a * Math.PI / 8) * r, y = sl.y + Math.sin(a * Math.PI / 8) * r;
    const sx = Math.round(x * 4) / 4, sy = Math.round(y * 4) / 4;
    if (placeOk(b, lay, kind, i, sx, sy)) { setPos(b, kind, i, sx, sy); return; }
  }
}

// ---------- Glisser-déposer ----------
function builtAt(b, px, py) {
  const v = floor.view; if (!v) return null;
  const lay = blay(b), [x, y] = isoUnproject(v, px, py);
  let best = null, bd = 1;
  for (const k of MOVABLE) for (let i = 0; i < b[k]; i++) {
    const s = lay[k][i], d = Math.hypot(x - s.x, y - s.y);
    if (d < bd) { bd = d; best = { kind: k, i, ox: s.x - x, oy: s.y - y }; }
  }
  return best;
}
function dragMount(cv) {
  cv.addEventListener('pointerdown', e => {
    if (!ui.editPlan) return;
    const b = getBranch(S, ui.branch), r = cv.getBoundingClientRect(), h = builtAt(b, e.clientX - r.left, e.clientY - r.top);
    if (!h) return;
    const sl = blay(b)[h.kind][h.i];
    floor.drag = { ...h, x: sl.x, y: sl.y, ok: true };
    cv.setPointerCapture(e.pointerId); e.preventDefault();
  });
  cv.addEventListener('pointermove', e => {
    if (!ui.editPlan) return;
    const b = getBranch(S, ui.branch), r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    if (!floor.drag) { const h = builtAt(b, px, py); floor.editHover = h; cv.style.cursor = h ? 'grab' : 'default'; return; }
    const [x, y] = isoUnproject(floor.view, px, py);
    const d = floor.drag;
    d.x = Math.round((x + d.ox) * 4) / 4; d.y = Math.round((y + d.oy) * 4) / 4;
    d.ok = placeOk(b, blay(b), d.kind, d.i, d.x, d.y);
    cv.style.cursor = 'grabbing';
  });
  const end = () => {
    const d = floor.drag; if (!d) return;
    floor.drag = null;
    const b = getBranch(S, ui.branch);
    if (d.ok) { setPos(b, d.kind, d.i, d.x, d.y); floor.agents = []; floor.busy = {}; SFX.play('click'); }
    else SFX.play('bad');
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', () => { floor.drag = null; });
}

// ---------- Panneau de personnalisation ----------
function customHTML(b) {
  const t = themeOf(b);
  const sw = (group, key, col, label, locked) => `<button class="swatch ${t[group] === key ? 'on' : ''}" data-act="theme" data-g="${group}" data-v="${key}" title="${label}" ${locked ? 'disabled' : ''}>
    <i style="background:${col || 'repeating-linear-gradient(45deg,#334155 0 4px,#1f2937 4px 8px)'}"></i><small>${label}${locked ? ' 🔒' : ''}</small></button>`;
  const floors = Object.entries(THEMES.floor).map(([k, f]) => sw('floor', k, `linear-gradient(135deg, ${f.c[0]} 50%, ${f.c[1]} 50%)`, f.name, f.lock && S.chapter < f.lock)).join('');
  const walls = Object.entries(THEMES.wall).map(([k, c]) => sw('wall', k, c, k[0].toUpperCase() + k.slice(1))).join('');
  const carpets = Object.entries(THEMES.carpet).map(([k, c]) => sw('carpet', k, c, k[0].toUpperCase() + k.slice(1))).join('');
  const accents = Object.entries(THEMES.accent).map(([k, c]) => sw('accent', k, c, k[0].toUpperCase() + k.slice(1))).join('');
  return `<div class="custom">
    <p class="hint">${ic('spark')} <span><b>Glissez un meuble</b> sur le plan pour le déplacer. Contour vert : la place est libre ; rouge : impossible.</span></p>
    <div class="cgroup"><h4>Sol</h4><div class="swatches">${floors}</div></div>
    <div class="cgroup"><h4>Murs</h4><div class="swatches">${walls}</div></div>
    <div class="cgroup"><h4>Tapis</h4><div class="swatches">${carpets}</div></div>
    <div class="cgroup"><h4>Canapés et auvent</h4><div class="swatches">${accents}</div></div>
    <div class="row wrap"><button class="btn primary" data-act="editPlan">Terminer</button>
      <button class="btn" data-act="themeAll">Appliquer ce style à toutes les agences</button>
      <button class="btn ghost" data-act="resetLayout">Disposition d’origine</button></div>
  </div>`;
}
