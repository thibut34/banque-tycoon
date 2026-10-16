'use strict';
/* =====================================================================
   BANQUE TYCOON — plan de l'agence en vue isométrique (logique)
   La salle grandit avec le niveau de l'agence. Les clients arrivent du
   trottoir, entrent, font la queue, vont aux guichets, aux bureaux ou
   aux distributeurs, puis repartent. Le dessin est dans floorart.js.
   ===================================================================== */

const ROOMS = [null, { W: 10, D: 8 }, { W: 13, D: 10 }, { W: 17, D: 12 }];
const SLOT_LABEL = { g: 'guichet', b: 'bureau de conseil', dab: 'distributeur', vig: 'vigile', deco: 'décoration' };
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
    deco: [
      { t: 'plant', x: W - 0.6, y: 2.4 }, { t: 'sofa', x: W - 2.2, y: 4.2 }, { t: 'plant', x: mid - 2.6, y: D - 0.5 },
      { t: 'sofa', x: W - 3.3, y: 4.2 }, { t: 'plant', x: W - 0.6, y: D - 0.6 }, { t: 'plant', x: mid + 2.6, y: D - 0.5 },
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
    if (k !== 'vig' && b[k] >= b[k[0]]) return toast(`Construisez d’abord un ${k === 'gs' ? 'guichet' : 'bureau'}`, 'bad'), false;
    if (k === 'vig' && b.vig >= SIZES[b.size].vig) return toast('Plus de place : agrandissez l’agence', 'bad'), false;
    showCandidates(k); return false;
  }
  const lim = SIZES[b.size], c = cityOf(b);
  let cost = 0, msg = '';
  if (k === 'size') { if (b.size >= 3) return false; cost = sizeUpCost(b); msg = `${c.name} passe au niveau ${b.size + 1} : ${SIZES[b.size + 1].name}`; }
  else if (k === 'gs') { if (b.gs >= b.g) return toast('Construisez d’abord un guichet', 'bad'), false; cost = itemCost(b, 'gs'); msg = 'Guichetier embauché'; }
  else if (k === 'bs') { if (b.bs >= b.b) return toast('Construisez d’abord un bureau', 'bad'), false; cost = itemCost(b, 'bs'); msg = 'Conseiller embauché'; }
  else {
    if (b[k] >= lim[k]) return toast('Plus de place : agrandissez l’agence', 'bad'), false;
    cost = itemCost(b, k); msg = `${ITEMS[k].name} ${k === 'vig' ? 'embauché' : 'installé'}`;
  }
  if (cand) { cost = hireCost(b, cand); msg = `${cand.name} rejoint l’équipe`; }
  if (S.cash < cost) return toast('Liquidités insuffisantes', 'bad'), false;
  S.cash -= cost;
  if (k === 'size') b.size++; else b[k]++;
  if (cand) { syncStaff(S); const list = staffOf(b, k); const auto = list[list.length - 1]; delete cand.cand; Object.assign(auto, cand, { since: S.day }); }
  if (MOVABLE.includes(k)) autoPlace(b, k, b[k] - 1);
  SFX.play(k === 'size' ? 'level' : 'build');
  log(`${k === 'size' ? '🏗️' : ITEMS[k].icon} ${c.name} : ${msg.toLowerCase()} (${money(cost)}).`);
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
    if (i < staffed) { const e = staffOf(b, kind + 's')[i]; return e ? { emp: e.id, label: `${e.name} — ${empTitle(e)} (voir la fiche)` } : { label: 'Au travail' }; }
    if (i < built) return { k: kind + 's', label: `Embaucher un ${kind === 'g' ? 'guichetier' : 'conseiller'} — ${money(itemCost(b, kind + 's'))}` };
    return { k: kind, label: `Construire un ${SLOT_LABEL[kind]} — ${money(itemCost(b, kind))}` };
  }
  if (kind === 'vig' && i < b.vig) { const e = staffOf(b, 'vig')[i]; return e ? { emp: e.id, label: `${e.name} — ${empTitle(e)} (voir la fiche)` } : { label: 'Vigile' }; }
  if (i < b[kind]) return { label: ITEMS[kind].name };
  return { k: kind, label: `${kind === 'vig' ? 'Embaucher un vigile' : 'Installer : ' + SLOT_LABEL[kind]} — ${money(itemCost(b, kind))}` };
}
// Un emplacement est visible s'il est construit, ou si c'est le prochain à construire
const slotVisible = (b, kind, i) => i <= b[kind] && i < SIZES[b.size][kind] && itemUnlocked(kind);

// ---------- Simulation des clients (purement visuelle) ----------
function freeSlot(b, kind) {
  const n = kind === 'g' ? b.gs : kind === 'b' ? b.bs : b.dab;
  for (let i = 0; i < n; i++) if (!floor.busy[kind + i]) return i;
  return -1;
}
function sendTo(a, b, lay) {
  const pref = weighted({ g: 6, b: b.bs ? 2.5 : 0.01, dab: b.dab ? 1.5 : 0.01 });
  for (const kind of [pref, 'g', 'b', 'dab']) {
    const i = freeSlot(b, kind);
    if (i >= 0) {
      const [tx, ty] = lay[kind][i].cli;
      floor.busy[kind + i] = a; a.slot = kind + i; a.kind = kind; a.idx = i;
      a.path = [[lay.mid, ty + (kind === 'b' ? 0 : 0.15)], [tx, ty]]; a.st = 'go';
      a.serve = rnd(2.5, 5.5) * (kind === 'b' ? 1.7 : kind === 'dab' ? 0.45 : 1);
      return true;
    }
  }
  return false;
}
function leave(a, lay, angry) {
  a.st = 'out'; a.angry = angry;
  if (angry) { a.emote = '💢'; a.emoteT = 2.5; }
  a.path = [[lay.mid, a.y], lay.entry.slice(), lay.porch.slice(), [chance(0.5) ? -2 : lay.W + 2, lay.D + 1.7]];
}
function newPerson(o) {
  return Object.assign({ col: pick(CLIENT_COLORS), skin: pick(SKINS), hair: pick(HAIRS), sp: rnd(1.7, 2.3), wait: 0, walk: rnd(0, 6), bag: chance(0.3) }, o);
}

function floorStep(dt, b, lay) {
  floor.t += dt;
  // Passants sur le trottoir
  floor.walkAcc += dt * 0.35;
  if (floor.walkAcc >= 1) {
    floor.walkAcc = 0;
    const l = chance(0.5);
    if (floor.walkers.length < 6) floor.walkers.push(newPerson({ x: l ? -2 : lay.W + 2, y: lay.D + rnd(1.9, 2.5), path: [[l ? lay.W + 2 : -2, lay.D + rnd(1.9, 2.5)]], st: 'pass' }));
  }
  // Clients
  const T = branchTraffic(S, b), lam = clamp((T.acc + T.loan) / 22, 0.15, 1.3);
  floor.spawnAcc += dt * lam * (b.gs || b.bs || b.dab ? 1 : 0);
  if (floor.spawnAcc >= 1) {
    floor.spawnAcc = 0;
    if (floor.agents.length < 18) {
      const l = chance(0.5);
      floor.agents.push(newPerson({ x: l ? -1.5 : lay.W + 1.5, y: lay.D + 1.8, path: [lay.porch.slice(), lay.entry.slice()], st: 'in' }));
    }
  }
  // File d'attente : premier arrivé, premier servi
  const queue = floor.agents.filter(a => a.st === 'queue');
  queue.forEach((a, k) => { a.wait += dt; a.path = [lay.queue[Math.min(k, lay.queue.length - 1)].slice()]; if (a.wait > 6 && !a.emote) { a.emote = '…'; a.emoteT = 99; } });
  for (const a of queue) { if (sendTo(a, b, lay)) { if (a.emote === '…') a.emote = null; break; } if (a.wait > 14) leave(a, lay, true); }

  const move = a => {
    if (!a.path.length) return true;
    const [tx, ty] = a.path[0], dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy), step = a.sp * dt;
    a.walk += step * 2.2;
    if (d <= step) { a.x = tx; a.y = ty; a.path.shift(); } else { a.x += dx / d * step; a.y += dy / d * step; }
    return !a.path.length;
  };
  for (const a of floor.walkers) if (move(a)) a.gone = true;
  floor.walkers = floor.walkers.filter(a => !a.gone);

  for (const a of floor.agents) {
    if (a.emoteT) { a.emoteT -= dt; if (a.emoteT <= 0) { a.emote = null; a.emoteT = 0; } }
    if (!move(a)) continue;
    if (a.st === 'in') { if (!b.gs && !b.bs && !b.dab) leave(a, lay, true); else if (!sendTo(a, b, lay)) { a.st = 'queue'; a.wait = 0; } }
    else if (a.st === 'go') a.st = 'serve';
    else if (a.st === 'serve') {
      a.serve -= dt;
      if (a.serve <= 0) {
        delete floor.busy[a.slot];
        const s = lay[a.kind][a.idx];
        floor.pops.push({ x: s.x, y: s.y, z: 1.9, t: 1.2, txt: a.kind === 'b' ? '✓' : '+€' });
        if (chance(0.25 + b.deco * 0.08)) { a.emote = '❤'; a.emoteT = 1.6; }
        leave(a, lay, false);
      }
    } else if (a.st === 'out') a.gone = true;
  }
  floor.agents = floor.agents.filter(a => !a.gone);
  for (const k in floor.busy) if (!floor.agents.includes(floor.busy[k])) delete floor.busy[k];
  floor.pops.forEach(p => { p.t -= dt; p.z += dt * 0.8; });
  floor.pops = floor.pops.filter(p => p.t > 0);
}

// ---------- Interaction ----------
function slotAt(px, py) {
  const v = floor.view, b = getBranch(S, ui.branch); if (!v || !b || ui.editPlan) return null;
  const [x, y] = isoUnproject(v, px, py), lay = blay(b);
  let best = null, bd = 0.9;
  for (const kind of ['g', 'b', 'dab', 'vig', 'deco']) {
    lay[kind].forEach((s, i) => {
      if (!slotVisible(b, kind, i)) return;
      const d = Math.hypot(x - s.x, y - s.y);
      if (d < bd) { bd = d; best = { kind, i }; }
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
    const r = cv.getBoundingClientRect(), h = slotAt(e.clientX - r.left, e.clientY - r.top);
    floor.hover = h ? { ...h, px: e.clientX - r.left, py: e.clientY - r.top } : null;
    const sa = h && slotAction(getBranch(S, ui.branch), h.kind, h.i);
    cv.style.cursor = sa && (sa.k || sa.emp) ? 'pointer' : 'default';
  });
  cv.addEventListener('pointerleave', () => { floor.hover = null; });
  cv.addEventListener('click', e => {
    if (ui.editPlan) return;
    const r = cv.getBoundingClientRect(), h = slotAt(e.clientX - r.left, e.clientY - r.top);
    if (!h) return;
    const act = slotAction(getBranch(S, ui.branch), h.kind, h.i);
    if (act.emp) { ui.emp = act.emp; renderPlanSide(); const el = $(`[data-emp="${act.emp}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (act.k && doBuild(act.k)) { renderTop(); renderPlanSide(); }
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
  if (!ui.modal) floorStep(dt, b, lay);
  drawFloor(cv, b, lay);
  floor.raf = requestAnimationFrame(floorLoop);
}
function floorStart() { floorMount(); if (!floor.raf) { floor.last = 0; floor.raf = requestAnimationFrame(floorLoop); } }
