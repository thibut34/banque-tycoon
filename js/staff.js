'use strict';
/* =====================================================================
   BANQUE TYCOON — employés : nom, portrait, niveau, expérience, traits
   Les compteurs b.gs / b.bs / b.vig restent la référence ; b.staff
   contient le détail de chaque personne et est tenu synchronisé.
   ===================================================================== */

const STAFF_KEYS = ['gs', 'bs', 'vig'];
const AV_BG = ['#c7d2fe', '#fde68a', '#bbf7d0', '#fecdd3', '#bae6fd', '#ddd6fe', '#fed7aa'];

function makeEmployee(role, lvl = 1, trait) {
  const female = chance(0.5);
  return {
    id: S.nextEmp = (S.nextEmp || 0) + 1, role, lvl, xp: 0,
    name: pick(female ? ['Sophie', 'Chloé', 'Léa', 'Inès', 'Manon', 'Camille', 'Fatou', 'Nadia', 'Clémence', 'Josiane', 'Brigitte', 'Aïcha', 'Emma', 'Lina', 'Yasmine', 'Mei'] : ['Gérard', 'Kevin', 'Mohamed', 'Jean-Michel', 'Patrick', 'Thierry', 'Rachid', 'Hugo', 'Yannick', 'Bernard', 'Lucas', 'Gaston', 'Karim', 'Théo', 'Paolo', 'Kenji']) + ' ' + pick(LAST),
    trait: trait || weighted({ souriant: 3, rapide: 3, ambitieux: 3, fidele: 2, bavard: 2, raleur: 1.5 }),
    face: { female, skin: pick(SKINS), hair: pick(HAIRS), style: rint(0, 3), bg: pick(AV_BG) },
    since: S.day, ready: 0, trained: -99,
  };
}
const staffOf = (b, role) => (b.staff || []).filter(e => e.role === role);
function syncStaff(s) {
  for (const b of s.branches) {
    if (!b.staff) b.staff = [];
    for (const r of STAFF_KEYS) {
      let list = staffOf(b, r);
      while (list.length < (b[r] || 0)) { b.staff.push(makeEmployee(r)); list = staffOf(b, r); }
      while (list.length > (b[r] || 0)) { const e = list.pop(); b.staff = b.staff.filter(x => x !== e); }
    }
  }
}
const empTitle = e => STAFF_TITLES[e.role][e.lvl - 1];
function empEff(e) { return (1 + 0.15 * (e.lvl - 1)) * (e.trait === 'rapide' ? 1.15 : e.trait === 'bavard' ? 0.9 : 1); }
function staffEff(b, role) { return b.staff ? staffOf(b, role).reduce((a, e) => a + empEff(e), 0) : (b[role] || 0); }
function staffSat(b) { return (b.staff || []).reduce((a, e) => a + (e.trait === 'souriant' ? 4 : e.trait === 'raleur' ? -4 : e.trait === 'bavard' ? 2 : 0), 0); }
const empWage = (s, b, e) => ITEMS[e.role].wage * wageMult(s, b) * (1 + 0.2 * (e.lvl - 1));
const promoCost = (s, b, e) => Math.round(ITEMS[e.role].wage * wageMult(s, b) * (1 + 0.2 * e.lvl) * 3 / 100) * 100;
const trainCost = (s, b, e) => Math.round(1500 * e.lvl * wageMult(s, b) / 100) * 100;
const canTrain = (s, e) => e.lvl < MAX_LVL && s.day - e.trained >= 30 && e.xp < xpNeed(e.lvl);

// Fin de mois : expérience, promotions possibles, démissions
function staffMonth(s) {
  for (const b of s.branches) for (const e of [...(b.staff || [])]) {
    if (e.lvl >= MAX_LVL) continue;
    e.xp = Math.min(xpNeed(e.lvl), e.xp + Math.round(rint(12, 20) * (e.trait === 'ambitieux' ? 1.5 : 1) * (s.upgrades.rh ? 1.3 : 1)));
    if (e.xp >= xpNeed(e.lvl)) {
      if (!e.ready) { e.ready = s.day; toast(`⭐ <b>${esc(e.name)}</b> (${CITIES[b.id].name}) mérite une promotion !`, 'gold', 'promo' + e.id); }
      else if (s.day - e.ready > 55 && !e.warned && e.trait !== 'fidele') { e.warned = true; toast(`😠 <b>${esc(e.name)}</b> (${CITIES[b.id].name}) menace de démissionner sans promotion !`, 'bad'); }
      else if (s.day - e.ready > 90 && e.trait !== 'fidele' && chance(0.25)) {
        b.staff = b.staff.filter(x => x !== e); b[e.role]--;
        log(`🚪 ${e.name} démissionne : promotion refusée trop longtemps (${CITIES[b.id].name}).`, 'bad');
        toast(`🚪 <b>${esc(e.name)}</b> démissionne, faute de promotion !`, 'bad');
      }
    }
  }
}

function findEmp(id) { for (const b of S.branches) { const e = (b.staff || []).find(x => x.id == id); if (e) return [b, e]; } return []; }
function promoteEmp(id) {
  const [b, e] = findEmp(id); if (!e || e.xp < xpNeed(e.lvl) || e.lvl >= MAX_LVL) return;
  const cost = promoCost(S, b, e);
  if (S.cash < cost) return toast('Liquidités insuffisantes', 'bad');
  S.cash -= cost; e.lvl++; e.xp = 0; e.ready = 0; e.warned = false; S.stats.promos = (S.stats.promos || 0) + 1;
  SFX.play('level'); confetti(50);
  log(`⭐ ${e.name} est promu(e) ${empTitle(e)} (${CITIES[b.id].name}).`, 'good');
  toast(`⭐ <b>${esc(e.name)}</b> devient <b>${empTitle(e)}</b> !`, 'good');
}
function trainEmp(id) {
  const [b, e] = findEmp(id); if (!e || !canTrain(S, e)) return;
  const cost = trainCost(S, b, e);
  if (S.cash < cost) return toast('Liquidités insuffisantes', 'bad');
  S.cash -= cost; e.trained = S.day; e.xp = Math.min(xpNeed(e.lvl), e.xp + 40 * (e.trait === 'ambitieux' ? 1.5 : 1));
  if (e.xp >= xpNeed(e.lvl) && !e.ready) e.ready = S.day;
  SFX.play('coin'); toast(`🎓 ${esc(e.name)} suit une formation (+XP)`, 'good');
}
function fireEmp(id) {
  const [b, e] = findEmp(id); if (!e) return;
  b.staff = b.staff.filter(x => x !== e); b[e.role]--;
  S.reputation = clamp(S.reputation - 1, 0, 100);
  log(`📦 ${e.name} quitte la banque (${CITIES[b.id].name}).`);
}

// Trois candidats à chaque recrutement
function makeCandidates(role) {
  return [makeEmployee(role, 1), makeEmployee(role, 1, pick(['souriant', 'rapide', 'ambitieux', 'fidele'])), makeEmployee(role, 2)]
    .map((e, i) => { e.cand = i; return e; });
}
const hireCost = (b, e) => itemCost(b, e.role) * (e.lvl >= 2 ? 3 : e.cand === 1 ? 1.6 : 1);

// ---------- Portrait généré (SVG) ----------
function avatar(e, size = 48) {
  const f = e.face, shirt = e.role === 'gs' ? '#1e3a8a' : e.role === 'bs' ? '#0f766e' : '#111827';
  const hair = [
    `<path d="M19 27c0-9 6-14 13-14s13 5 13 14c-3-4-7-6-13-6s-10 2-13 6z" fill="${f.hair}"/>`,
    `<path d="M18 30c0-11 6-17 14-17s14 6 14 17v12c-2-6-3-12-3-15-3-3-7-4-11-4s-8 1-11 4c0 3-1 9-3 15z" fill="${f.hair}"/>`,
    `<circle cx="32" cy="12" r="5" fill="${f.hair}"/><path d="M19 27c0-9 6-13 13-13s13 4 13 13c-3-3-7-5-13-5s-10 2-13 5z" fill="${f.hair}"/>`,
    `<path d="M20 24c1-7 6-10 12-10s11 3 12 10c-3-2-7-3-12-3s-9 1-12 3z" fill="${f.hair}" opacity=".7"/>`,
  ][f.female ? [1, 2, 0][f.style % 3] : [0, 3, 0, 3][f.style]];
  const cap = e.role === 'vig' ? `<path d="M19 22c1-6 6-9 13-9s12 3 13 9z" fill="#111827"/><rect x="17" y="21" width="30" height="3" rx="1.5" fill="#111827"/><circle cx="32" cy="17" r="2" fill="#fbbf24"/>` : '';
  return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="32" fill="${f.bg}"/>
    ${f.female && f.style % 3 === 0 ? `<ellipse cx="32" cy="34" rx="15" ry="16" fill="${f.hair}"/>` : ''}
    <path d="M9 64c0-13 10-19 23-19s23 6 23 19z" fill="${shirt}"/>
    <path d="M26 45l6 7 6-7z" fill="#f8fafc"/><rect x="31" y="49" width="2.4" height="10" fill="${e.role === 'vig' ? '#fbbf24' : '#dc2626'}"/>
    <rect x="28" y="38" width="8" height="8" fill="${f.skin}"/>
    <ellipse cx="32" cy="29" rx="12" ry="14" fill="${f.skin}"/>
    ${hair}${cap}
    <circle cx="27" cy="30" r="1.7" fill="#1f2937"/><circle cx="37" cy="30" r="1.7" fill="#1f2937"/>
    <path d="M24.5 26.5h4.5M35 26.5h4.5" stroke="#1f2937" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>
    <path d="M27.5 35.5q4.5 ${e.trait === 'raleur' ? '-2' : '4'} 9 0" stroke="#7c2d12" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  </svg>`;
}
const stars = lvl => '★'.repeat(lvl) + '<span class="off">' + '★'.repeat(MAX_LVL - lvl) + '</span>';
