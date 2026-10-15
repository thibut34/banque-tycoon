'use strict';
/* =====================================================================
   BANQUE TYCOON — plan de l'agence (vue de dessus animée)
   La salle mesure 24 × 15 unités. Les clients entrent par la porte,
   vont aux guichets, aux bureaux ou aux distributeurs, puis repartent.
   ===================================================================== */

const FW = 24, FH = 15;
const GX = [3.2, 6.1, 9.0, 12, 15, 17.9, 20.8], GORDER = [3, 2, 4, 1, 5, 0, 6];
const SLOTS = {
  g: GORDER.map(i => ({ x: GX[i], y: 2.65, w: 2.3, h: 0.85, staff: [GX[i], 1.5], cli: [GX[i], 3.8] })),
  b: [[2.6, 6.6, -1], [21.4, 6.6, 1], [2.6, 9.8, -1], [21.4, 9.8, 1], [2.6, 12.6, -1]].map(([x, y, side]) => ({ x, y, w: 2.2, h: 1.2, side, staff: [x + side * 1.3, y], cli: [x - side * 1.65, y] })),
  dab: [8.3, 15.7, 6.5].map(x => ({ x, y: 14.35, w: 1.1, h: 0.7, cli: [x, 13.35] })),
  vig: [9.6, 14.4].map(x => ({ x, y: 13.6, w: 0.9, h: 0.9 })),
  deco: [[1.1, 3.9, 'plant'], [22.9, 3.9, 'plant'], [9, 8.2, 'sofa'], [15, 8.2, 'sofa'], [4.6, 14.1, 'plant'], [19.4, 14.1, 'plant']].map(([x, y, t]) => ({ x, y, t, w: t === 'sofa' ? 2.4 : 0.9, h: t === 'sofa' ? 0.9 : 0.9 })),
};
const SLOT_LABEL = { g: 'guichet', b: 'bureau de conseil', dab: 'distributeur', vig: 'vigile', deco: 'décoration' };
const DOOR = [12, 15.9], ENTRY = [12, 13.4];
const CLIENT_COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#64748b'];

const floor = { id: null, agents: [], queue: [], busy: {}, pops: [], spawnAcc: 0, hover: null, last: 0, raf: 0 };

function floorReset(id) {
  Object.assign(floor, { id, agents: [], queue: [], busy: {}, pops: [], spawnAcc: 0, hover: null });
}

// ---------- Construction / embauche ----------
function doBuild(k) {
  const b = getBranch(S, ui.branch); if (!b) return false;
  const lim = SIZES[b.size], c = cityOf(b);
  let cost = 0, ok = false, msg = '';
  if (k === 'size') { if (b.size >= 3) return false; cost = sizeUpCost(b); ok = true; msg = `${c.name} passe au niveau ${b.size + 1} : ${SIZES[b.size + 1].name}`; }
  else if (k === 'gs') { if (b.gs >= b.g) return toast('Construisez d’abord un guichet', 'bad'), false; cost = itemCost(b, 'gs'); ok = true; msg = 'Guichetier embauché'; }
  else if (k === 'bs') { if (b.bs >= b.b) return toast('Construisez d’abord un bureau', 'bad'), false; cost = itemCost(b, 'bs'); ok = true; msg = 'Conseiller embauché'; }
  else {
    if (b[k] >= lim[k]) return toast('Plus de place : agrandissez l’agence', 'bad'), false;
    cost = itemCost(b, k); ok = true; msg = `${ITEMS[k].name} ${k === 'vig' ? 'embauché' : 'installé'}`;
  }
  if (!ok) return false;
  if (S.cash < cost) return toast('Liquidités insuffisantes', 'bad'), false;
  S.cash -= cost;
  if (k === 'size') b.size++; else b[k]++;
  SFX.play('build');
  log(`${k === 'size' ? '🏗️' : ITEMS[k].icon} ${c.name} : ${msg.toLowerCase()} (${money(cost)}).`);
  toast(`${k === 'size' ? '🏗️' : ITEMS[k].icon} ${msg}`, 'good');
  ui.dirty = true;
  return true;
}

// Ce que fait un clic sur un emplacement du plan
function slotAction(b, kind, i) {
  const lim = SIZES[b.size][kind];
  if (i >= lim) return { k: 'size', label: b.size < 3 ? `Agrandir l’agence — ${money(sizeUpCost(b))}` : 'Emplacement indisponible' };
  if (kind === 'g' || kind === 'b') {
    const built = b[kind], staffed = b[kind + 's'];
    if (i < staffed) return { label: kind === 'g' ? 'Guichet ouvert' : 'Conseiller au travail' };
    if (i < built) return { k: kind + 's', label: `Embaucher un ${kind === 'g' ? 'guichetier' : 'conseiller'} — ${money(itemCost(b, kind + 's'))}` };
    if (i === built) return { k: kind, label: `Construire un ${SLOT_LABEL[kind]} — ${money(itemCost(b, kind))}` };
    return { label: `Construisez d’abord le ${SLOT_LABEL[kind]} précédent` };
  }
  if (i < b[kind]) return { label: ITEMS[kind].name };
  if (i === b[kind]) return { k: kind, label: `${kind === 'vig' ? 'Embaucher un vigile' : 'Installer : ' + SLOT_LABEL[kind]} — ${money(itemCost(b, kind))}` };
  return { label: `Ajoutez d’abord l’emplacement précédent` };
}

// ---------- Simulation des clients (purement visuelle) ----------
function freeSlot(b, kind) {
  const n = kind === 'g' ? b.gs : kind === 'b' ? b.bs : b.dab;
  for (let i = 0; i < n; i++) if (!floor.busy[kind + i]) return i;
  return -1;
}
function sendTo(a, b) {
  const pref = weighted({ g: 6, b: b.bs ? 2.5 : 0.01, dab: b.dab ? 1.5 : 0.01 });
  for (const kind of [pref, 'g', 'b', 'dab']) {
    const i = freeSlot(b, kind);
    if (i >= 0) { floor.busy[kind + i] = a; a.slot = kind + i; a.kind = kind; a.path = [SLOTS[kind][i].cli.slice()]; a.st = 'go'; a.serve = rnd(2.5, 5.5) * (kind === 'b' ? 1.6 : kind === 'dab' ? 0.5 : 1); return true; }
  }
  return false;
}
function leave(a, angry) { a.st = 'out'; a.angry = angry; a.path = [ENTRY.slice(), DOOR.slice()]; }

function floorStep(dt, b) {
  // Arrivées
  const lam = (0.25 + 0.12 * cityOf(b).traffic) * (0.6 + S.reputation / 125);
  floor.spawnAcc += dt * lam;
  if (floor.spawnAcc >= 1) {
    floor.spawnAcc = 0;
    if (floor.agents.length < 16) floor.agents.push({ x: DOOR[0] + rnd(-0.4, 0.4), y: DOOR[1], path: [ENTRY.slice()], st: 'in', col: pick(CLIENT_COLORS), wait: 0, sp: rnd(2.6, 3.4) });
  }
  // Clients en attente : premier arrivé, premier servi
  floor.queue = floor.queue.filter(a => a.st === 'queue');
  floor.queue.forEach((a, k) => { a.wait += dt; a.path = [[12 + (k % 2 ? 0.5 : -0.5) * (k > 7 ? 1 : 0), 5.2 + Math.min(k, 7) * 0.8]]; });
  for (const a of floor.queue) { if (sendTo(a, b)) break; if (a.wait > 12) leave(a, true); }

  for (const a of floor.agents) {
    if (a.path.length) {
      const [tx, ty] = a.path[0], dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy), step = a.sp * dt;
      if (d <= step) { a.x = tx; a.y = ty; a.path.shift(); } else { a.x += dx / d * step; a.y += dy / d * step; }
      if (a.path.length) continue;
    }
    if (a.st === 'in') { if (!b.gs && !b.bs && !b.dab) leave(a, true); else if (!sendTo(a, b)) { a.st = 'queue'; floor.queue.push(a); } }
    else if (a.st === 'go') a.st = 'serve';
    else if (a.st === 'serve') {
      a.serve -= dt;
      if (a.serve <= 0) {
        delete floor.busy[a.slot];
        const s = SLOTS[a.kind][+a.slot.slice(a.kind.length)];
        floor.pops.push({ x: s.x, y: s.y - 0.8, t: 1, txt: a.kind === 'b' ? '✓' : '€' });
        leave(a, false);
      }
    } else if (a.st === 'out') a.gone = true;
  }
  floor.agents = floor.agents.filter(a => !a.gone);
  // Libère les emplacements dont l'agent a disparu (agence modifiée)
  for (const k in floor.busy) if (!floor.agents.includes(floor.busy[k])) delete floor.busy[k];
  floor.pops.forEach(p => { p.t -= dt * 0.9; p.y -= dt * 0.6; });
  floor.pops = floor.pops.filter(p => p.t > 0);
}

// ---------- Dessin ----------
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
function person(c, x, y, u, body, head = '#f1c9a5', ring) {
  c.save(); c.shadowColor = 'rgba(15,23,42,.25)'; c.shadowBlur = u * 0.25; c.shadowOffsetY = u * 0.08;
  c.fillStyle = body; c.beginPath(); c.ellipse(x * u, y * u, u * 0.44, u * 0.32, 0, 0, Math.PI * 2); c.fill(); c.restore();
  c.fillStyle = head; c.beginPath(); c.arc(x * u, y * u, u * 0.21, 0, Math.PI * 2); c.fill();
  if (ring) { c.strokeStyle = ring; c.lineWidth = u * 0.07; c.beginPath(); c.arc(x * u, y * u, u * 0.45, 0, Math.PI * 2); c.stroke(); }
}
function ghost(c, s, u, locked, hover) {
  c.save(); c.setLineDash([u * 0.18, u * 0.14]); c.lineWidth = Math.max(1, u * 0.05);
  c.strokeStyle = hover ? '#6366f1' : locked ? 'rgba(100,116,139,.35)' : 'rgba(99,102,241,.55)';
  c.fillStyle = hover ? 'rgba(99,102,241,.14)' : 'rgba(255,255,255,.35)';
  rr(c, (s.x - s.w / 2) * u, (s.y - s.h / 2) * u, s.w * u, s.h * u, u * 0.18); c.fill(); c.stroke(); c.restore();
  c.fillStyle = locked ? 'rgba(100,116,139,.6)' : '#6366f1'; c.font = `600 ${u * 0.55}px Inter, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(locked ? '🔒' : '+', s.x * u, s.y * u + (locked ? 0 : u * 0.02));
}

function drawFloor(cv, b) {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = W * FH / FW;
  if (!W) return;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px'; }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const u = W / FW, lim = SIZES[b.size], hv = floor.hover;
  c.clearRect(0, 0, W, H);
  // Sol
  c.fillStyle = '#ece7de'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(120,100,70,.07)'; c.lineWidth = 1;
  for (let x = 0; x <= FW; x++) { c.beginPath(); c.moveTo(x * u, 0); c.lineTo(x * u, H); c.stroke(); }
  for (let y = 0; y <= FH; y++) { c.beginPath(); c.moveTo(0, y * u); c.lineTo(W, y * u); c.stroke(); }
  c.fillStyle = '#ddd5c7'; c.fillRect(0, 0, W, 2.2 * u); // espace du personnel
  c.fillStyle = 'rgba(99,102,241,.06)'; rr(c, 7 * u, 4.6 * u, 10 * u, 7.4 * u, u * 0.6); c.fill(); // tapis
  // Arrière-boutique : coffre-fort et armoires
  c.fillStyle = '#64748b'; rr(c, 0.7 * u, 0.55 * u, 1.5 * u, 1.3 * u, u * 0.15); c.fill();
  c.strokeStyle = '#cbd5e1'; c.lineWidth = u * 0.08; c.beginPath(); c.arc(1.45 * u, 1.2 * u, u * 0.35, 0, 7); c.stroke();
  c.fillStyle = '#b8ad9a'; for (const x of [21.2, 22.4]) { rr(c, x * u, 0.55 * u, 1.05 * u, 1.2 * u, u * 0.1); c.fill(); }
  // Murs
  c.fillStyle = '#1e293b'; const t = 0.32 * u;
  c.fillRect(0, 0, W, t); c.fillRect(0, 0, t, H); c.fillRect(W - t, 0, t, H);
  c.fillRect(0, H - t, 10.6 * u, t); c.fillRect(13.4 * u, H - t, W - 13.4 * u, t);
  c.fillStyle = '#a5b4fc'; c.fillRect(10.6 * u, H - t * 0.5, 2.8 * u, t * 0.5); // porte vitrée

  // Déco
  SLOTS.deco.forEach((s, i) => {
    if (i < b.deco) {
      if (s.t === 'plant') { c.fillStyle = '#a16207'; c.beginPath(); c.arc(s.x * u, s.y * u, u * 0.32, 0, 7); c.fill(); c.fillStyle = '#16a34a'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc((s.x + Math.cos(k * 1.26) * 0.22) * u, (s.y + Math.sin(k * 1.26) * 0.22) * u, u * 0.22, 0, 7); c.fill(); } }
      else { c.fillStyle = '#6366f1'; rr(c, (s.x - s.w / 2) * u, (s.y - s.h / 2) * u, s.w * u, s.h * u, u * 0.3); c.fill(); c.fillStyle = '#818cf8'; rr(c, (s.x - s.w / 2 + 0.15) * u, (s.y - s.h / 2 + 0.15) * u, (s.w - 0.3) * u, (s.h - 0.45) * u, u * 0.2); c.fill(); }
    } else if (i === b.deco && i < lim.deco) ghost(c, s, u, false, hv && hv.kind === 'deco' && hv.i === i);
  });
  // Guichets
  SLOTS.g.forEach((s, i) => {
    if (i < b.g) {
      if (i < b.gs) person(c, s.staff[0], s.staff[1], u, '#1e3a8a', '#e8b98f');
      c.save(); c.shadowColor = 'rgba(15,23,42,.18)'; c.shadowBlur = u * 0.3; c.shadowOffsetY = u * 0.1;
      c.fillStyle = '#ffffff'; rr(c, (s.x - s.w / 2) * u, (s.y - s.h / 2) * u, s.w * u, s.h * u, u * 0.16); c.fill(); c.restore();
      c.fillStyle = i < b.gs ? '#6366f1' : '#cbd5e1'; rr(c, (s.x - 0.35) * u, (s.y - 0.3) * u, 0.7 * u, 0.32 * u, u * 0.06); c.fill();
      if (i >= b.gs) { c.fillStyle = '#f59e0b'; c.font = `700 ${u * 0.42}px Inter, system-ui`; c.textAlign = 'center'; c.fillText('Fermé', s.x * u, (s.y + 0.32) * u); }
    } else if (i === b.g && i < lim.g) ghost(c, s, u, false, hv && hv.kind === 'g' && hv.i === i);
  });
  // Bureaux
  SLOTS.b.forEach((s, i) => {
    if (i < b.b) {
      if (i < b.bs) person(c, s.staff[0], s.staff[1], u, '#0f766e', '#d9a47c');
      else { c.fillStyle = '#94a3b8'; c.beginPath(); c.arc(s.staff[0] * u, s.staff[1] * u, u * 0.28, 0, 7); c.fill(); }
      c.save(); c.shadowColor = 'rgba(15,23,42,.18)'; c.shadowBlur = u * 0.3; c.shadowOffsetY = u * 0.1;
      c.fillStyle = '#c08457'; rr(c, (s.x - s.w / 2) * u, (s.y - s.h / 2) * u, s.w * u, s.h * u, u * 0.14); c.fill(); c.restore();
      c.fillStyle = '#e2e8f0'; rr(c, (s.x - 0.3) * u, (s.y - 0.35) * u, 0.6 * u, 0.4 * u, u * 0.05); c.fill();
      c.fillStyle = '#ffffff'; c.fillRect((s.x + 0.35) * u, (s.y + 0.05) * u, 0.4 * u, 0.3 * u);
    } else if (i === b.b && i < lim.b) ghost(c, s, u, false, hv && hv.kind === 'b' && hv.i === i);
  });
  // Distributeurs
  SLOTS.dab.forEach((s, i) => {
    if (i < b.dab) { c.fillStyle = '#334155'; rr(c, (s.x - s.w / 2) * u, (s.y - s.h / 2) * u, s.w * u, s.h * u, u * 0.1); c.fill(); c.fillStyle = '#22d3ee'; c.fillRect((s.x - 0.3) * u, (s.y - 0.25) * u, 0.6 * u, 0.22 * u); }
    else if (i === b.dab && i < lim.dab) ghost(c, s, u, false, hv && hv.kind === 'dab' && hv.i === i);
  });
  // Vigiles
  SLOTS.vig.forEach((s, i) => {
    if (i < b.vig) person(c, s.x, s.y, u, '#111827', '#c68c5e', '#fbbf24');
    else if (i === b.vig && i < lim.vig) ghost(c, s, u, false, hv && hv.kind === 'vig' && hv.i === i);
  });
  // Clients
  for (const a of floor.agents) {
    person(c, a.x, a.y, u, a.col, '#f1c9a5', a.angry ? '#ef4444' : null);
    if (a.st === 'serve' && a.kind === 'g') { c.fillStyle = '#fbbf24'; c.beginPath(); c.arc((a.x + 0.3) * u, (a.y - 0.35) * u, u * 0.1, 0, 7); c.fill(); }
  }
  for (const p of floor.pops) { c.globalAlpha = clamp(p.t, 0, 1); c.fillStyle = p.txt === '€' ? '#ca8a04' : '#059669'; c.font = `800 ${u * 0.55}px Inter, system-ui`; c.textAlign = 'center'; c.fillText(p.txt, p.x * u, p.y * u); c.globalAlpha = 1; }

  // Infobulle
  if (hv) {
    const txt = slotAction(b, hv.kind, hv.i).label;
    c.font = `600 ${Math.max(11, u * 0.42)}px Inter, system-ui`; const tw = c.measureText(txt).width + 16, th = Math.max(22, u * 0.8);
    let x = clamp(hv.px - tw / 2, 4, W - tw - 4), y = hv.py - th - 10; if (y < 4) y = hv.py + 14;
    c.fillStyle = 'rgba(15,23,42,.92)'; rr(c, x, y, tw, th, 8); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, x + 8, y + th / 2);
  }
}

// ---------- Interaction ----------
function slotAt(px, py, W) {
  const u = W / FW, x = px / u, y = py / u, b = getBranch(S, ui.branch);
  for (const kind in SLOTS) {
    const arr = SLOTS[kind];
    for (let i = 0; i < arr.length; i++) { const s = arr[i]; if (i <= b[kind] && i < SIZES[b.size][kind] && Math.abs(x - s.x) <= s.w / 2 + 0.15 && Math.abs(y - s.y) <= s.h / 2 + 0.15) return { kind, i }; }
  }
  return null;
}
function floorMount() {
  const cv = $('#floor'); if (!cv || cv.dataset.on) return;
  cv.dataset.on = '1';
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect(), h = slotAt(e.clientX - r.left, e.clientY - r.top, r.width);
    floor.hover = h ? { ...h, px: e.clientX - r.left, py: e.clientY - r.top } : null;
    cv.style.cursor = h && slotAction(getBranch(S, ui.branch), h.kind, h.i).k ? 'pointer' : 'default';
  });
  cv.addEventListener('pointerleave', () => { floor.hover = null; });
  cv.addEventListener('click', e => {
    const r = cv.getBoundingClientRect(), h = slotAt(e.clientX - r.left, e.clientY - r.top, r.width);
    if (!h) return;
    const act = slotAction(getBranch(S, ui.branch), h.kind, h.i);
    if (act.k && doBuild(act.k)) { renderTop(); renderPlanSide(); }
  });
}
function floorLoop(ts) {
  floor.raf = 0;
  const cv = $('#floor');
  if (!S || ui.tab !== 'plan' || !cv) return;
  const b = getBranch(S, ui.branch); if (!b) return;
  if (floor.id !== b.id) floorReset(b.id);
  const dt = Math.min(0.25, (ts - (floor.last || ts)) / 1000); floor.last = ts;
  if (!ui.modal) floorStep(dt, b);
  drawFloor(cv, b);
  floor.raf = requestAnimationFrame(floorLoop);
}
function floorStart() { floorMount(); if (!floor.raf) { floor.last = 0; floor.raf = requestAnimationFrame(floorLoop); } }
