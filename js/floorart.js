'use strict';
/* =====================================================================
   BANQUE TYCOON — dessin isométrique de l'agence
   Projection : x va vers la droite-bas, y vers la gauche-bas, z monte.
   Une case fait 2s de large et s de haut à l'écran.
   ===================================================================== */

const WALL_H = 2.6;
function isoP(v, x, y, z = 0) { return [v.ox + (x - y) * v.s, v.oy + (x + y) * v.s * 0.5 - z * v.s]; }
function isoUnproject(v, px, py) { const X = (px - v.ox) / v.s, Y = 2 * (py - v.oy) / v.s; return [(X + Y) / 2, (Y - X) / 2]; }
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const m = c => Math.round(clamp(f < 0 ? c * (1 + f) : c + (255 - c) * f, 0, 255));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
function poly(c, v, pts, fill, stroke, lw = 1) {
  c.beginPath(); pts.forEach(([x, y, z], i) => { const [px, py] = isoP(v, x, y, z || 0); i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
// Pavé : coin (x, y), largeur w (axe x), profondeur d (axe y), du sol z0 à z0 + h
function box(c, v, x, y, w, d, z0, h, col, alpha = 1) {
  const z1 = z0 + h;
  c.globalAlpha = alpha;
  poly(c, v, [[x, y + d, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x, y + d, z1]], shade(col, -0.12));
  poly(c, v, [[x + w, y, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x + w, y, z1]], shade(col, -0.28));
  poly(c, v, [[x, y, z1], [x + w, y, z1], [x + w, y + d, z1], [x, y + d, z1]], col);
  c.globalAlpha = 1;
}
const boxC = (c, v, cx, cy, w, d, z0, h, col, a) => box(c, v, cx - w / 2, cy - d / 2, w, d, z0, h, col, a);

// ---------- Personnages ----------
function drawPerson(c, v, a, role) {
  const s = v.s, moving = a.path && a.path.length;
  const [fx, fy0] = isoP(v, a.x, a.y, 0), bob = moving ? Math.abs(Math.sin(a.walk)) * s * 0.05 : 0, fy = fy0 - bob;
  c.fillStyle = 'rgba(15,23,42,.22)'; c.beginPath(); c.ellipse(fx, fy0, s * 0.3, s * 0.15, 0, 0, 7); c.fill();
  const body = role === 'g' ? '#1e3a8a' : role === 'b' ? '#0f766e' : role === 'vig' ? '#111827' : a.col;
  // jambes
  const sw = moving ? Math.sin(a.walk) * s * 0.07 : 0;
  c.fillStyle = role ? '#1f2937' : shade(a.col, -0.55);
  c.fillRect(fx - s * 0.13 + sw, fy - s * 0.38, s * 0.1, s * 0.36);
  c.fillRect(fx + s * 0.03 - sw, fy - s * 0.38, s * 0.1, s * 0.36);
  // corps
  c.fillStyle = body; c.beginPath();
  c.roundRect ? c.roundRect(fx - s * 0.21, fy - s * 0.98, s * 0.42, s * 0.64, s * 0.14) : c.rect(fx - s * 0.21, fy - s * 0.98, s * 0.42, s * 0.64);
  c.fill();
  if (role === 'g' || role === 'b' || role === 'vig') { // col de chemise et cravate
    c.fillStyle = '#f8fafc'; c.beginPath(); c.moveTo(fx - s * 0.1, fy - s * 0.97); c.lineTo(fx + s * 0.1, fy - s * 0.97); c.lineTo(fx, fy - s * 0.8); c.fill();
    c.fillStyle = role === 'vig' ? '#fbbf24' : '#dc2626'; c.fillRect(fx - s * 0.025, fy - s * 0.86, s * 0.05, s * 0.2);
  }
  if (a.bag) { c.fillStyle = '#78350f'; c.fillRect(fx + s * 0.2, fy - s * 0.6, s * 0.16, s * 0.2); }
  // tête
  c.fillStyle = a.skin || '#f1c9a5'; c.beginPath(); c.arc(fx, fy - s * 1.15, s * 0.19, 0, 7); c.fill();
  c.fillStyle = a.hair || '#2b1d14'; c.beginPath(); c.arc(fx, fy - s * 1.18, s * 0.19, Math.PI * 1.05, Math.PI * 1.95); c.fill();
  if (role === 'vig') { c.fillStyle = '#111827'; c.fillRect(fx - s * 0.22, fy - s * 1.36, s * 0.44, s * 0.1); c.fillRect(fx - s * 0.15, fy - s * 1.46, s * 0.3, s * 0.12); }
  if (a.angry) { c.strokeStyle = '#ef4444'; c.lineWidth = 2; c.beginPath(); c.ellipse(fx, fy0, s * 0.36, s * 0.18, 0, 0, 7); c.stroke(); }
  if (a.emote) {
    const ex = fx + s * 0.25, ey = fy - s * 1.7;
    c.fillStyle = '#fff'; c.beginPath(); c.roundRect ? c.roundRect(ex - s * 0.28, ey - s * 0.24, s * 0.56, s * 0.42, s * 0.12) : c.rect(ex - s * 0.28, ey - s * 0.24, s * 0.56, s * 0.42); c.fill();
    c.font = `700 ${s * 0.3}px Inter, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = a.emote === '❤' ? '#e11d48' : '#0f172a'; c.fillText(a.emote, ex, ey - s * 0.02);
  }
}

// ---------- Mobilier ----------
function drawCounter(c, v, s, open) {
  boxC(c, v, s.x, s.y, s.w, s.d, 0, 0.85, '#8b5a3c');
  boxC(c, v, s.x, s.y, s.w + 0.1, s.d + 0.1, 0.85, 0.07, '#f1f5f9');
  boxC(c, v, s.x - 0.35, s.y - 0.12, 0.4, 0.08, 0.92, 0.28, '#1f2937');
  poly(c, v, [[s.x - 0.53, s.y - 0.07, 0.96], [s.x - 0.17, s.y - 0.07, 0.96], [s.x - 0.17, s.y - 0.07, 1.16], [s.x - 0.53, s.y - 0.07, 1.16]], open ? '#60a5fa' : '#475569');
  boxC(c, v, s.x, s.y + 0.27, s.w, 0.04, 0.92, 0.62, '#bae6fd', 0.28); // vitre
  if (!open) { boxC(c, v, s.x + 0.35, s.y + 0.1, 0.5, 0.06, 0.92, 0.22, '#dc2626'); }
}
function drawDesk(c, v, s, staffed) {
  boxC(c, v, s.cli[0], s.cli[1], 0.42, 0.42, 0, 0.42, '#334155');
  boxC(c, v, s.cli[0] + 0.16, s.cli[1], 0.1, 0.42, 0.42, 0.4, '#334155');
  boxC(c, v, s.x, s.y, s.w, s.d, 0, 0.72, '#b7834f');
  boxC(c, v, s.x, s.y, s.w + 0.06, s.d + 0.06, 0.72, 0.05, '#7c4a24');
  boxC(c, v, s.x - 0.05, s.y - 0.25, 0.32, 0.4, 0.77, 0.03, '#cbd5e1');
  boxC(c, v, s.x - 0.2, s.y - 0.25, 0.03, 0.4, 0.8, 0.26, staffed ? '#93c5fd' : '#64748b');
  boxC(c, v, s.x + 0.1, s.y + 0.4, 0.14, 0.14, 0.77, 0.32, '#fbbf24'); // lampe
}
function drawDab(c, v, s) {
  boxC(c, v, s.x, s.y, s.w, s.d, 0, 1.55, '#334155');
  const yf = s.y + s.d / 2 + 0.001;
  poly(c, v, [[s.x - 0.22, yf, 0.95], [s.x + 0.22, yf, 0.95], [s.x + 0.22, yf, 1.32], [s.x - 0.22, yf, 1.32]], '#22d3ee');
  poly(c, v, [[s.x - 0.18, yf, 0.55], [s.x + 0.18, yf, 0.55], [s.x + 0.18, yf, 0.82], [s.x - 0.18, yf, 0.82]], '#94a3b8');
  boxC(c, v, s.x, s.y, s.w, s.d, 1.55, 0.12, '#16a34a');
}
function drawPlant(c, v, s) {
  boxC(c, v, s.x, s.y, 0.42, 0.42, 0, 0.42, '#c2410c');
  const [px, py] = isoP(v, s.x, s.y, 0.95), r = v.s * 0.36;
  [['#166534', 0, 0.1, 1], ['#15803d', -0.35, 0, 0.8], ['#16a34a', 0.35, 0.05, 0.8], ['#22c55e', 0, -0.35, 0.75]].forEach(([col, dx, dy, k]) => {
    c.fillStyle = col; c.beginPath(); c.arc(px + dx * r, py + dy * r, r * k, 0, 7); c.fill();
  });
}
function drawSofa(c, v, s) {
  boxC(c, v, s.x, s.y, 0.8, 1.6, 0, 0.38, '#4338ca');
  boxC(c, v, s.x + 0.32, s.y, 0.16, 1.6, 0.38, 0.45, '#4f46e5');
  boxC(c, v, s.x - 0.05, s.y - 0.4, 0.55, 0.7, 0.38, 0.1, '#818cf8');
  boxC(c, v, s.x - 0.05, s.y + 0.4, 0.55, 0.7, 0.38, 0.1, '#818cf8');
}
function drawPost(c, v, x, y) { boxC(c, v, x, y, 0.08, 0.08, 0, 0.8, '#d4a017'); boxC(c, v, x, y, 0.16, 0.16, 0.8, 0.06, '#fde68a'); }

// ---------- Plan complet ----------
function drawFloor(cv, b, lay) {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth;
  if (!W) return;
  const { W: RW, D: RD, mid } = lay;
  // Mise à l'échelle pour que toute la scène tienne dans le cadre
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const x of [-0.8, RW + 0.8]) for (const y of [-0.3, RD + 2.4]) for (const z of [0, WALL_H + 0.3]) {
    const px = x - y, py = (x + y) * 0.5 - z;
    minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
  }
  let s = (W - 16) / (maxX - minX);
  const maxH = Math.min(620, Math.max(320, W * 0.72));
  if ((maxY - minY) * s + 16 > maxH) s = (maxH - 16) / (maxY - minY);
  const H = Math.round((maxY - minY) * s + 16);
  const v = floor.view = { s, ox: 8 - minX * s + (W - 16 - (maxX - minX) * s) / 2, oy: 8 - minY * s };
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px'; }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W, H);
  c.lineJoin = 'round';

  // Trottoir
  poly(c, v, [[-1.5, RD + 0.2], [RW + 1.5, RD + 0.2], [RW + 1.5, RD + 3], [-1.5, RD + 3]], '#cbd5e1');
  poly(c, v, [[RW + 0.2, -0.3], [RW + 1.5, -0.3], [RW + 1.5, RD + 0.2], [RW + 0.2, RD + 0.2]], '#b6c2d1');
  for (let x = -1; x <= RW + 1; x += 1) poly(c, v, [[x, RD + 0.2], [x, RD + 3]], null, 'rgba(100,116,139,.25)');
  poly(c, v, [[-1.5, RD + 3], [RW + 1.5, RD + 3], [RW + 1.5, RD + 3.12], [-1.5, RD + 3.12]], '#64748b');
  poly(c, v, [[mid - 0.9, RD], [mid + 0.9, RD], [mid + 0.9, RD + 0.9], [mid - 0.9, RD + 0.9]], '#475569'); // paillasson

  // Sol : marbre en damier, parquet derrière les guichets, tapis rouge
  for (let x = 0; x < RW; x++) for (let y = 0; y < RD; y++) {
    const back = y < 1;
    poly(c, v, [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], back ? ((x % 2) ? '#a87d52' : '#b88b5e') : ((x + y) % 2 ? '#ebe5da' : '#ddd5c6'));
  }
  poly(c, v, [[mid - 0.65, 1.9], [mid + 0.65, 1.9], [mid + 0.65, RD], [mid - 0.65, RD]], '#d4a017');
  poly(c, v, [[mid - 0.55, 2.0], [mid + 0.55, 2.0], [mid + 0.55, RD], [mid - 0.55, RD]], '#9f1239');

  // Murs du fond
  poly(c, v, [[0, 0, 0], [RW, 0, 0], [RW, 0, WALL_H], [0, 0, WALL_H]], '#f1ebe0');
  poly(c, v, [[0, 0, 0], [RW, 0, 0], [RW, 0, 0.75], [0, 0, 0.75]], '#6b4226');
  poly(c, v, [[0, 0, 0], [0, RD, 0], [0, RD, WALL_H], [0, 0, WALL_H]], '#e4dccd');
  poly(c, v, [[0, 0, 0], [0, RD, 0], [0, RD, 0.75], [0, 0, 0.75]], '#5c3820');
  poly(c, v, [[-0.2, -0.2, WALL_H], [RW, -0.2, WALL_H], [RW, 0, WALL_H], [0, 0, WALL_H], [0, RD, WALL_H], [-0.2, RD, WALL_H]], '#334155');
  // Fenêtres sur le mur de gauche
  for (let y = 1.2; y < RD - 0.8; y += 2.4) {
    if (y < 2.6) continue;
    poly(c, v, [[0.01, y - 0.6, 1.25], [0.01, y + 0.6, 1.25], [0.01, y + 0.6, 2.25], [0.01, y - 0.6, 2.25]], '#93c5fd', '#f8fafc', 3);
    poly(c, v, [[0.01, y - 0.6, 1.75], [0.01, y + 0.6, 1.75]], null, '#f8fafc', 2);
  }
  // Porte du coffre-fort
  const [vx, vy] = isoP(v, 0.01, 1.5, 1.45);
  c.save(); c.translate(vx, vy); c.transform(-1, 0.5, 0, 1, 0, 0);
  c.fillStyle = '#94a3b8'; c.beginPath(); c.arc(0, 0, s * 0.85, 0, 7); c.fill();
  c.fillStyle = '#cbd5e1'; c.beginPath(); c.arc(0, 0, s * 0.68, 0, 7); c.fill();
  c.strokeStyle = '#475569'; c.lineWidth = s * 0.08; for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3 + floor.t * 0.15; c.beginPath(); c.moveTo(Math.cos(a) * s * 0.45, Math.sin(a) * s * 0.45); c.lineTo(-Math.cos(a) * s * 0.45, -Math.sin(a) * s * 0.45); c.stroke(); }
  c.fillStyle = '#475569'; c.beginPath(); c.arc(0, 0, s * 0.14, 0, 7); c.fill();
  c.restore();
  // Enseigne au nom de la banque
  const signW = Math.min(RW - 2, 7.5), sx0 = (RW - signW) / 2;
  poly(c, v, [[sx0, 0.01, 1.62], [sx0 + signW, 0.01, 1.62], [sx0 + signW, 0.01, 2.32], [sx0, 0.01, 2.32]], '#0f172a', '#d4a017', 2);
  const [tx, ty] = isoP(v, sx0, 0.01, 2.32);
  c.save(); c.translate(tx, ty); c.transform(1, 0.5, 0, 1, 0, 0);
  c.fillStyle = '#fbbf24'; c.font = `800 ${s * 0.36}px Inter, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
  let name = S.name.toUpperCase(); while (c.measureText(name).width > signW * s * 0.92 && name.length > 4) name = name.slice(0, -2) + '…';
  c.fillText(name, signW * s / 2, 0.35 * s); c.restore();

  // Emplacements libres (fantômes) et survol
  const hv = floor.hover;
  for (const kind of ['g', 'b', 'dab', 'vig', 'deco']) lay[kind].forEach((sl, i) => {
    if (!slotVisible(b, kind, i)) return;
    const built = i < b[kind], isH = hv && hv.kind === kind && hv.i === i;
    if (built && !isH) return;
    const pts = [[sl.x - sl.w / 2 - 0.1, sl.y - sl.d / 2 - 0.1], [sl.x + sl.w / 2 + 0.1, sl.y - sl.d / 2 - 0.1], [sl.x + sl.w / 2 + 0.1, sl.y + sl.d / 2 + 0.1], [sl.x - sl.w / 2 - 0.1, sl.y + sl.d / 2 + 0.1]];
    c.setLineDash(built ? [] : [5, 4]);
    poly(c, v, pts, isH ? 'rgba(99,102,241,.3)' : 'rgba(99,102,241,.12)', '#6366f1', 1.5);
    c.setLineDash([]);
  });

  // Objets et personnages triés par profondeur
  const items = [];
  const add = (d, f) => items.push([d, f]);
  lay.g.forEach((sl, i) => { if (i < b.g) { add(sl.x + sl.y, () => drawCounter(c, v, sl, i < b.gs)); if (i < b.gs) add(sl.staff[0] + sl.staff[1], () => drawPerson(c, v, { x: sl.staff[0], y: sl.staff[1], skin: SKINS[i % 6], hair: HAIRS[i % 7] }, 'g')); } });
  lay.b.forEach((sl, i) => { if (i < b.b) { add(sl.x + sl.y, () => drawDesk(c, v, sl, i < b.bs)); if (i < b.bs) add(sl.staff[0] + sl.staff[1], () => drawPerson(c, v, { x: sl.staff[0], y: sl.staff[1], skin: SKINS[(i + 3) % 6], hair: HAIRS[(i + 2) % 7] }, 'b')); } });
  lay.dab.forEach((sl, i) => { if (i < b.dab) add(sl.x + sl.y, () => drawDab(c, v, sl)); });
  lay.vig.forEach((sl, i) => { if (i < b.vig) add(sl.x + sl.y, () => drawPerson(c, v, { x: sl.x, y: sl.y, skin: SKINS[(i + 2) % 6], hair: '#111827' }, 'vig')); });
  lay.deco.forEach((sl, i) => { if (i < b.deco) add(sl.x + sl.y, () => sl.t === 'plant' ? drawPlant(c, v, sl) : drawSofa(c, v, sl)); });
  for (let y = 3.2; y < RD - 1.2; y += 1.3) for (const x of [mid - 0.85, mid + 0.85]) add(x + y, () => drawPost(c, v, x, y));
  for (const a of floor.agents) add(a.x + a.y + 0.05, () => drawPerson(c, v, a));
  for (const a of floor.walkers) add(a.x + a.y + 0.05, () => drawPerson(c, v, a));
  items.sort((p, q) => p[0] - q[0]).forEach(([, f]) => f());

  // Façade vitrée (devant et côté droit), dessinée par-dessus en transparence
  c.globalAlpha = 0.16;
  poly(c, v, [[RW, 0, 0], [RW, RD, 0], [RW, RD, 2.3], [RW, 0, 2.3]], '#bae6fd');
  poly(c, v, [[0, RD, 0], [mid - 0.9, RD, 0], [mid - 0.9, RD, 2.3], [0, RD, 2.3]], '#bae6fd');
  poly(c, v, [[mid + 0.9, RD, 0], [RW, RD, 0], [RW, RD, 2.3], [mid + 0.9, RD, 2.3]], '#bae6fd');
  c.globalAlpha = 1;
  const frame = '#334155';
  poly(c, v, [[RW, 0, 2.3], [RW, RD, 2.3], [0, RD, 2.3]], null, frame, 2.5);
  poly(c, v, [[RW, 0, 0], [RW, RD, 0], [0, RD, 0]], null, frame, 2.5);
  for (const [x, y] of [[RW, RD], [mid - 0.9, RD], [mid + 0.9, RD], [0, RD]]) poly(c, v, [[x, y, 0], [x, y, 2.3]], null, frame, 2.5);
  for (let y = 2.5; y < RD; y += 2.5) poly(c, v, [[RW, y, 0], [RW, y, 2.3]], null, frame, 1.5);
  // Auvent au-dessus de la porte
  box(c, v, mid - 1.15, RD, 2.3, 0.7, 2.3, 0.08, '#be123c');
  for (let k = 0; k < 5; k++) box(c, v, mid - 1.15 + k * 0.46, RD + 0.62, 0.23, 0.08, 2.18, 0.2, '#fff1f2');

  // Bulles d'argent et de satisfaction
  for (const p of floor.pops) {
    const [px, py] = isoP(v, p.x, p.y, p.z);
    c.globalAlpha = clamp(p.t, 0, 1);
    c.font = `800 ${s * (p.big ? 0.75 : 0.5)}px Inter, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 3; c.strokeStyle = 'rgba(15,23,42,.6)'; c.strokeText(p.txt, px, py);
    c.fillStyle = p.txt === '✓' ? '#34d399' : '#fbbf24'; c.fillText(p.txt, px, py);
    c.globalAlpha = 1;
  }
  // Boutons « + » flottants sur les emplacements libres
  for (const kind of ['g', 'b', 'dab', 'vig', 'deco']) lay[kind].forEach((sl, i) => {
    if (!slotVisible(b, kind, i) || i < b[kind]) return;
    const [px, py] = isoP(v, sl.x, sl.y, 1.1 + Math.sin(floor.t * 3 + i) * 0.08);
    c.fillStyle = '#6366f1'; c.beginPath(); c.arc(px, py, s * 0.32, 0, 7); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = Math.max(2, s * 0.08); c.beginPath(); c.moveTo(px - s * 0.14, py); c.lineTo(px + s * 0.14, py); c.moveTo(px, py - s * 0.14); c.lineTo(px, py + s * 0.14); c.stroke();
  });
  // Guichets fermés : petit panneau « embaucher »
  lay.g.forEach((sl, i) => { if (i < b.g && i >= b.gs) { const [px, py] = isoP(v, sl.x, sl.y, 1.9 + Math.sin(floor.t * 3) * 0.06); c.font = `700 ${Math.max(10, s * 0.32)}px Inter, system-ui`; c.textAlign = 'center'; const t = 'Embaucher'; const tw = c.measureText(t).width + 12; c.fillStyle = '#f59e0b'; c.beginPath(); c.roundRect ? c.roundRect(px - tw / 2, py - s * 0.28, tw, s * 0.5, 6) : c.rect(px - tw / 2, py - s * 0.28, tw, s * 0.5); c.fill(); c.fillStyle = '#1f1300'; c.textBaseline = 'middle'; c.fillText(t, px, py - s * 0.03); } });
  lay.b.forEach((sl, i) => { if (i < b.b && i >= b.bs) { const [px, py] = isoP(v, sl.x, sl.y, 1.6 + Math.sin(floor.t * 3) * 0.06); c.font = `700 ${Math.max(10, s * 0.32)}px Inter, system-ui`; c.textAlign = 'center'; const t = 'Embaucher'; const tw = c.measureText(t).width + 12; c.fillStyle = '#f59e0b'; c.beginPath(); c.roundRect ? c.roundRect(px - tw / 2, py - s * 0.28, tw, s * 0.5, 6) : c.rect(px - tw / 2, py - s * 0.28, tw, s * 0.5); c.fill(); c.fillStyle = '#1f1300'; c.textBaseline = 'middle'; c.fillText(t, px, py - s * 0.03); } });

  // Infobulle
  if (hv) {
    const txt = slotAction(b, hv.kind, hv.i).label;
    c.font = `600 13px Inter, system-ui`; const tw = c.measureText(txt).width + 18, th = 28;
    const x = clamp(hv.px - tw / 2, 4, W - tw - 4); let y = hv.py - th - 14; if (y < 4) y = hv.py + 16;
    c.fillStyle = 'rgba(15,23,42,.94)'; c.beginPath(); c.roundRect ? c.roundRect(x, y, tw, th, 8) : c.rect(x, y, tw, th); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, x + 9, y + th / 2);
  }
}
