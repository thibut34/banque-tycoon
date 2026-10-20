'use strict';
/* =====================================================================
   BANQUE TYCOON — plan de l'agence en vue isométrique (logique)
   La salle grandit avec le niveau de l'agence. Les clients arrivent du
   trottoir, entrent, font la queue, vont aux guichets, aux bureaux ou
   aux distributeurs, puis repartent. Le dessin est dans floorart.js.
   ===================================================================== */

const ROOMS = [null, { W: 10, D: 8 }, { W: 13, D: 10 }, { W: 17, D: 12 }];
const SLOT_LABEL = { g: 'guichet', b: _t('bureau de conseil'), dab: 'distributeur', vig: 'vigile', deco: _t('décoration'), cof: _t('salle des coffres'), ent: _t('espace entreprises'), vip: _t('salon VIP') };
const ROOM_KINDS = ['cof', 'ent', 'vip'];
const ALL_KINDS = ['g', 'b', 'dab', 'vig', 'deco', 'cof', 'ent', 'vip'];
const CLIENT_COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#64748b', '#e11d48', '#0ea5e9'];
const SKINS = ['#f1c9a5', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#d9a47c'];
const HAIRS = ['#2b1d14', '#4a3222', '#a0522d', '#d4a017', '#111827', '#9ca3af', '#7c2d12'];

// Disposition de la salle pour un niveau donné (coordonnées en cases)
const layoutCache = {};
function layout(size) {
  if (layoutCache[size]) return layoutCache[size];
  const { W, D } = ROOMS[size], L = SIZES[size];
  const gEnd = 1.8 + (L.g - 1) * 1.75 + 0.75;
  const mid = W / 2;
  const lay = {
    W, D, mid,
    door: [mid, D], entry: [mid, D - 0.6], porch: [mid, D + 1.1],
    g: Array.from({ length: L.g }, (_, i) => { const x = 1.8 + i * 1.75; return { x, y: 1.25, w: 1.5, d: 0.6, staff: [x, 0.55], cli: [x, 2.3] }; }),
    b: Array.from({ length: L.b }, (_, j) => { const y = 3.7 + j * 1.75; return { x: 1.25, y, w: 0.75, d: 1.3, staff: [0.5, y], cli: [2.25, y] }; }),
    dab: Array.from({ length: L.dab }, (_, k) => { const x = gEnd + 0.9 + k * 1.15; return { x, y: 0.45, w: 0.65, d: 0.5, cli: [x, 1.45] }; }),
    vig: [{ x: mid - 1.5, y: D - 0.7, w: 0.6, d: 0.6 }, { x: mid + 1.5, y: D - 0.7, w: 0.6, d: 0.6 }],
    // salles spéciales, alignées le long de la façade vitrée de droite
    cof: [{ x: W - 0.75, y: 2.6, w: 0.9, d: 1.1, cli: [W - 1.8, 2.6] }],
    ent: Array.from({ length: L.ent }, (_, j) => { const y = 2.6 + (j + 1) * 1.85; return { x: W - 1.0, y, w: 0.75, d: 1.3, staff: [W - 0.38, y], cli: [W - 1.9, y] }; }),
    vip: Array.from({ length: L.vip }, (_, j) => { const y = 2.6 + (L.ent + 1 + j) * 1.85; return { x: W - 1.0, y, w: 0.8, d: 1.4, staff: [W - 0.38, y], cli: [W - 1.95, y] }; }),
    deco: [
      { t: 'plant', x: W - 0.6, y: 1.4 }, { t: 'sofa', x: W - 2.9, y: D - 2.3 }, { t: 'plant', x: mid - 2.6, y: D - 0.5 },
      { t: 'sofa', x: W - 4.0, y: D - 2.3 }, { t: 'plant', x: W - 0.6, y: D - 0.6 }, { t: 'plant', x: mid + 2.6, y: D - 0.5 },
    ].map(o => ({ ...o, w: o.t === 'sofa' ? 0.8 : 0.6, d: o.t === 'sofa' ? 1.6 : 0.6 })),
    queue: [],
  };
  for (let y = 3.4; y < D - 1.4; y += 0.62) lay.queue.push([mid + (lay.queue.length % 2 ? 0.28 : -0.28), y]);
  return (layoutCache[size] = lay);
}

const floor = { id: null, size: 0, agents: [], walkers: [], busy: {}, pops: [], spawnAcc: 0, walkAcc: 0, hover: null, last: 0, raf: 0, t: 0, view: null };
function floorReset(id) { Object.assign(floor, { id, size: 0, agents: [], walkers: [], busy: {}, pops: [], spawnAcc: 0, walkAcc: 0, hover: null }); }

// ---------- Construction / embauche ----------
function doBuild(k, cand) {
  const b = getBranch(S, ui.branch); if (!b) return false;
  if (STAFF_KEYS.includes(k) && !cand) {
    if (k !== 'vig' && b[k] >= b[k[0]]) return toast(_l`Construisez d’abord un ${k === 'gs' ? 'guichet' : 'bureau'}`, 'bad'), false;
    if (k === 'vig' && b.vig >= SIZES[b.size].vig) return toast(_t('Plus de place : agrandissez l’agence'), 'bad'), false;
    showCandidates(k); return false;
  }
  const lim = SIZES[b.size], c = cityOf(b);
  let cost = 0, msg = '';
  if (k === 'size') { if (b.size >= 3) return false; cost = sizeUpCost(b); msg = _l`${c.name} passe au niveau ${b.size + 1} : ${SIZES[b.size + 1].name}`; }
  else if (k === 'gs') { if (b.gs >= b.g) return toast(_t('Construisez d’abord un guichet'), 'bad'), false; cost = itemCost(b, 'gs'); msg = _t('Guichetier embauché'); }
  else if (k === 'bs') { if (b.bs >= b.b) return toast(_t('Construisez d’abord un bureau'), 'bad'), false; cost = itemCost(b, 'bs'); msg = _t('Conseiller embauché'); }
  else {
    if ((b[k] || 0) >= (lim[k] || 0)) return toast(_t('Plus de place : agrandissez l’agence'), 'bad'), false;
    cost = itemCost(b, k); msg = `${ITEMS[k].name} ${k === 'vig' ? _t('embauché') : _t('installé')}`;
  }
  if (cand) { cost = hireCost(b, cand); msg = _l`${cand.name} rejoint l’équipe`; }
  if (S.cash < cost) return toast(_t('Liquidités insuffisantes'), 'bad'), false;
  S.cash -= cost;
  if (!cand && !STAFF_KEYS.includes(k)) S.fixed = (S.fixed || 0) + cost; // un équipement : il garde sa valeur (amortie)
  else outlay(S, 'rh', -cost);
  if (k === 'size') b.size++; else b[k] = (b[k] || 0) + 1;
  if (cand) { syncStaff(S); const list = staffOf(b, k); const auto = list[list.length - 1]; delete cand.cand; Object.assign(auto, cand, { since: S.day }); }
  if (MOVABLE.includes(k)) autoPlace(b, k, b[k] - 1);
  SFX.play(k === 'size' ? 'level' : 'build');
  log(`${k === 'size' ? '🏗️' : ITEMS[k].icon} ${c.name} : ${cand || k === 'size' ? msg : msg.charAt(0).toLowerCase() + msg.slice(1)} (${money(cost)}).`);
  toast(`${k === 'size' ? '🏗️' : ITEMS[k].icon} ${msg}`, 'good');
  // Petite animation de pose sur le plan
  const lay = blay(b), key = k === 'gs' ? 'g' : k === 'bs' ? 'b' : k, arr = lay[key];
  const idx = k === 'gs' ? b.gs - 1 : k === 'bs' ? b.bs - 1 : b[k] - 1;
  if (arr && arr[idx]) floor.pops.push({ x: arr[idx].x, y: arr[idx].y, z: 1.6, t: 1.4, txt: '✨', big: true });
  ui.dirty = true;
  return true;
}

// Ce que fait un clic sur un emplacement du plan
function slotAction(b, kind, i) {
  if (kind === 'g' || kind === 'b') {
    const built = b[kind], staffed = b[kind + 's'];
    if (i < staffed) { const e = staffOf(b, kind + 's')[i]; return e ? { emp: e.id, label: _l`${e.name} — ${empTitle(e)} (voir la fiche)` } : { label: _t('Au travail') }; }
    if (i < built) return { k: kind + 's', label: _l`Embaucher un ${kind === 'g' ? 'guichetier' : 'conseiller'} — ${money(itemCost(b, kind + 's'))}` };
    return { k: kind, label: _l`Construire un ${SLOT_LABEL[kind]} — ${money(itemCost(b, kind))}` };
  }
  if (kind === 'vig' && i < b.vig) { const e = staffOf(b, 'vig')[i]; return e ? { emp: e.id, label: _l`${e.name} — ${empTitle(e)} (voir la fiche)` } : { label: _t('Vigile') }; }
  if (i < (b[kind] || 0)) return { label: ITEMS[kind].name };
  return { k: kind, label: `${kind === 'vig' ? _t('Embaucher un vigile') : _t('Installer : ') + SLOT_LABEL[kind]} — ${money(itemCost(b, kind))}` };
}
// Un emplacement est visible s'il est construit, ou si c'est le prochain à construire
const slotVisible = (b, kind, i) => i <= (b[kind] || 0) && i < (SIZES[b.size][kind] || 0) && itemUnlocked(kind);

function newPerson(o) {
  return Object.assign({ col: pick(CLIENT_COLORS), skin: pick(SKINS), hair: pick(HAIRS), sp: rnd(1.7, 2.3), wait: 0, walk: rnd(0, 6), bag: chance(0.3) }, o);
}

// Ce qui est purement décoratif : les passants sur le trottoir. Les clients, eux, viennent de agency.js
function visualStep(dt, b, lay) {
  floor.t += dt;
  floor.walkAcc += dt * 0.35;
  if (floor.walkAcc >= 1) {
    floor.walkAcc = 0;
    const l = chance(0.5);
    if (floor.walkers.length < 6) floor.walkers.push(newPerson({ x: l ? -2 : lay.W + 2, y: lay.D + rnd(1.9, 2.5), path: [[l ? lay.W + 2 : -2, lay.D + rnd(1.9, 2.5)]], st: 'pass' }));
  }
  for (const a of floor.walkers) {
    const [tx, ty] = a.path[0], dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy), step = a.sp * dt;
    a.walk += step * 2.2;
    if (d <= step) a.gone = true; else { a.x += dx / d * step; a.y += dy / d * step; }
  }
  floor.walkers = floor.walkers.filter(a => !a.gone);
  const A = ag(b); floor.agents = A.agents; floor.busy = A.busy; floor.pops = A.pops; floor.coins = A.coins;
}

// ---------- Interaction ----------
function slotAt(px, py) {
  const v = floor.view, b = getBranch(S, ui.branch); if (!v || !b || ui.editPlan) return null;
  const lay = blay(b);
  // On teste le sol, le meuble, le bouton « + » et l'étiquette « Embaucher » : tout est cliquable
  let best = null, bd = v.s * 0.75;
  for (const kind of ALL_KINDS) {
    lay[kind].forEach((s, i) => {
      if (!slotVisible(b, kind, i)) return;
      for (const z of [0, 0.5, 1.1, 1.6, 1.9]) {
        const [sx, sy] = isoP(v, s.x, s.y, z), d = Math.hypot(px - sx, py - sy);
        if (d < bd) { bd = d; best = { kind, i }; }
      }
    });
  }
  return best;
}
function floorMount() {
  const cv = $('#floor'); if (!cv || cv.dataset.on) return;
  cv.dataset.on = '1';
  if (cv.dataset.mini) { cv.addEventListener('click', () => actions.tab({ dataset: { tab: 'plan' } })); return; }
  dragMount(cv);
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    if (!ui.editPlan && coinAt(getBranch(S, ui.branch), e.clientX - r.left, e.clientY - r.top)) { floor.hover = null; cv.style.cursor = 'pointer'; return; }
    const h = slotAt(e.clientX - r.left, e.clientY - r.top);
    floor.hover = h ? { ...h, px: e.clientX - r.left, py: e.clientY - r.top } : null;
    const sa = h && slotAction(getBranch(S, ui.branch), h.kind, h.i);
    cv.style.cursor = sa && (sa.k || sa.emp) ? 'pointer' : 'default';
  });
  cv.addEventListener('pointerleave', () => { floor.hover = null; });
  cv.addEventListener('click', e => {
    if (ui.editPlan) return;
    const r = cv.getBoundingClientRect(), cb = getBranch(S, ui.branch), coin = coinAt(cb, e.clientX - r.left, e.clientY - r.top);
    if (coin) return collectCoin(S, cb, coin, e.clientX, e.clientY);
    const h = slotAt(e.clientX - r.left, e.clientY - r.top);
    if (!h) return;
    const bb = getBranch(S, ui.branch), act = slotAction(bb, h.kind, h.i);
    if (['g', 'b', 'dab', ...ROOM_KINDS].includes(h.kind) && h.i < (bb[h.kind] || 0)) { showStPop(bb, h.kind, h.i, e.clientX, e.clientY); if (act.emp && ui.tab === 'plan') { ui.emp = act.emp; renderPlanSide(); } return; }
    if (act.emp && ui.tab === 'plan') { ui.emp = act.emp; renderPlanSide(); const el = $(`[data-emp="${act.emp}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (act.k && doBuild(act.k)) { renderTop(); if (ui.tab === 'plan') renderPlanSide(); else ui.dirty = true; }
  });
}
function floorLoop(ts) {
  floor.raf = 0;
  const cv = $('#floor');
  if (!S || !(ui.tab === 'plan' || ui.tab === 'dash') || !cv) return;
  const b = getBranch(S, ui.branch); if (!b) return;
  if (floor.id !== b.id) floorReset(b.id);
  if (floor.size !== b.size) { floor.size = b.size; floor.agents = []; floor.busy = {}; }
  const lay = blay(b, floor.drag);
  cv.style.touchAction = ui.editPlan ? 'none' : 'manipulation';
  const dt = Math.min(0.25, (ts - (floor.last || ts)) / 1000); floor.last = ts;
  visualStep(ui.modal ? 0 : dt, b, lay);
  drawFloor(cv, b, lay);
  floor.raf = requestAnimationFrame(floorLoop);
}
function floorStart() { floorMount(); if (!floor.raf) { floor.last = 0; floor.raf = requestAnimationFrame(floorLoop); } }
