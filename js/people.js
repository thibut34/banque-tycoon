'use strict';
/* =====================================================================
   BANQUE TYCOON — les clients, de vraies personnes
   Chaque client a un métier, un salaire, un loyer, des factures et des
   dépenses. Son compte vit tout seul : le salaire arrive, les
   prélèvements partent, il dépense avec sa carte, met de côté sur son
   livret, rembourse ses prêts… et passe parfois à découvert.
   La banque gagne sa vie avec les frais, les cotisations, les agios et
   les intérêts des prêts.
   ===================================================================== */

// [métier, salaire net min, max, stabilité de l'emploi]
const JOBS = [
  [_t('Étudiant'), 550, 900, 0.75], [_t('Caissier'), 1400, 1600, 0.9], [_t('Infirmière'), 1900, 2500, 0.99], [_t('Professeur'), 2000, 2800, 0.995],
  [_t('Ingénieur'), 3000, 5000, 0.97], [_t('Artisan'), 1600, 3500, 0.88], [_t('Retraité'), 1100, 2600, 1], [_t('Commercial'), 2000, 4200, 0.9],
  [_t('Médecin'), 5000, 9500, 0.995], [_t('Chauffeur'), 1700, 2200, 0.9], [_t('Développeur'), 2800, 4800, 0.94], [_t('Serveur'), 1400, 1800, 0.82],
  [_t('Chef d’entreprise'), 2500, 9000, 0.85], [_t('Agriculteur'), 1200, 2400, 0.9], [_t('Fonctionnaire'), 1800, 3000, 1], [_t('Intérimaire'), 1300, 1900, 0.75],
];
const JOB_W = [6, 8, 6, 6, 5, 5, 10, 5, 1.5, 5, 4, 5, 2, 2, 7, 4];
const MAX_PEOPLE = 6000; // au-delà, chaque fiche représente plusieurs clients semblables

const pname = p => FIRST[(p.i * 7 + 3) % FIRST.length] + ' ' + LAST[(p.i * 13 + 5) % LAST.length];
const pjob = p => JOBS[p.j][0];
const pinc = p => Math.round(p.u ? p.s * 0.57 : p.s); // au chômage : allocation
const pw = p => p.w || 1;
const findPerson = (s, id) => s.people.find(p => p.i == id);
const branchPeople = (s, id) => s.people.filter(p => p.br === id);
function personFace(p) { const k = (p.i * 7 + 3) % FIRST.length; return { female: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 22].includes(k), skin: SKINS[p.i % SKINS.length], hair: HAIRS[(p.i * 3) % HAIRS.length], style: p.i % 4, bg: AV_BG[p.i % AV_BG.length] }; }
function personLoans(s, p) { return s.loans.filter(l => l.pid === p.i); }
const personDebt = (s, p) => personLoans(s, p).reduce((a, l) => a + l.pmt, 0);

// ---------- Création d'un client ----------
function newPersonFor(s, b) {
  const j = +weighted(Object.fromEntries(JOB_W.map((w, i) => [i, w])));
  const [, lo, hi] = JOBS[j];
  const rich = specOf(b).cap || 1;
  const sal = Math.round(rnd(lo, hi) * (cityOf(b).tier === 'w' || cityOf(b).tier === 'xl' ? 1.15 : 1) * (rich > 1 ? 1.1 : 1) / 10) * 10;
  const own = j === 6 ? chance(0.7) : chance(0.3);
  const rent = own ? 0 : Math.round(sal * rnd(0.22, 0.38) / 10) * 10;
  const bills = Math.round((80 + sal * rnd(0.04, 0.08)) / 10) * 10;
  const spend = Math.round(Math.max(200, (sal - rent - bills) * rnd(0.55, 0.92)) / 10) * 10;
  const p = {
    i: s.nextPid = (s.nextPid || 0) + 1, br: b.id, j, s: sal, r: rent, f: bills, sp: spend, own: own ? 1 : 0,
    b: Math.round(sal * rnd(0.2, 1.3)), o: 0, c: 0, sv: Math.round(rnd(0.15, 0.6) * 100) / 100,
    pd: j === 6 ? 8 : chance(0.85) ? 27 : rint(0, 4), q: 70, t: s.day, k: 0,
  };
  if (s.people.length >= MAX_PEOPLE) p.w = Math.max(2, Math.round(s.clients / MAX_PEOPLE));
  p.save0 = Math.round(sal * rnd(0, 6)); // économies qu'il pourrait placer sur un livret
  return p;
}
// Note de crédit calculée à partir de la vraie situation du client
function personScore(s, p) {
  const stab = JOBS[p.j][3], left = (pinc(p) - p.r - p.f - p.sp) / Math.max(1, pinc(p));
  let sc = 600 + (stab - 0.85) * 900 + left * 250 + Math.min(120, ((p.l || 0) / Math.max(1, p.s)) * 12) - (p.k || 0) * 45 - (p.u ? 120 : 0);
  if (p.b < 0) sc -= 40;
  return clamp(Math.round(sc), 300, 850);
}

// ---------- Ouverture du compte ----------
function openPersonAccount(s, p, opts = {}) {
  p.o = Math.round(p.s * (s.prod.cc.od || 0.25) / 50) * 50;
  s.people.push(p);
  s.cash += p.b * pw(p);
  if (opts.card) p.c = 1;
  if (opts.livret) { p.l = p.save0; s.cash += p.l * pw(p); }
  delete p.save0;
  recomputeAgg(s);
}

// ---------- Agrégats de la banque ----------
function recomputeAgg(s) {
  let cc = 0, liv = 0, ovd = 0, n = 0, cards = 0, gold = 0, av = 0;
  for (const p of s.people) {
    const w = pw(p);
    if (p.b >= 0) cc += p.b * w; else ovd -= p.b * w;
    liv += (p.l || 0) * w; n += w; av += (p.a || 0) * w;
    if (p.c === 1) cards += w; else if (p.c === 2) gold += w;
  }
  s.depCC = cc + (s.depX || 0); s.depLiv = liv; s.ovd = ovd; s.clients = n; s.cards = cards; s.cardsGold = gold;
  s.prod.av.aum = av + (s.avX || 0);
  s.deposits = s.depCC + s.depLiv;
}
// Les événements et paniques modifient s.deposits : on répercute l'écart
function reconcile(s) {
  if (!s.people) return;
  const tot = s.depCC + s.depLiv, diff = s.deposits - tot;
  if (Math.abs(diff) < 1) return;
  if (diff > 0) s.depX = (s.depX || 0) + diff;
  else {
    let need = -diff; const x = Math.min(s.depX || 0, need); s.depX = (s.depX || 0) - x; need -= x;
    if (need > 0 && tot > 0) { // retraits massifs : tous les clients retirent une part
      const k = Math.max(0, 1 - need / Math.max(1, s.deposits - diff - (s.depX || 0)));
      for (const p of s.people) { if (p.b > 0) p.b *= k; if (p.l) p.l *= k; }
    }
  }
  recomputeAgg(s);
}

// ---------- La vie des comptes, chaque jour ----------
function peopleDay(s) {
  const dom = s.day % 30, agioRate = (s.prod.cc.agio || 14) / 100 / 360, sd = specialDay(s), spMul = (sd && sd.spend) || 1;
  let cashIn = 0, cashOut = 0;
  s.alerts = s.alerts || [];
  for (const p of s.people) {
    const w = pw(p), inc = pinc(p);
    if (dom === p.pd) { p.b += inc; cashIn += inc * w; }                 // salaire
    if (dom === 4 && p.r) { p.b -= p.r; cashOut += p.r * w; }            // loyer
    if (dom === 9) { p.b -= p.f; cashOut += p.f * w; }                   // électricité, téléphone, assurances
    const sp = p.sp / 30 * spMul * (0.4 + Math.random() * 1.2) * (p.blk > s.day ? 0.35 : 1) * (p.u ? 0.8 : 1);
    p.b -= sp; cashOut += sp * w;                                         // dépenses (carte, retraits)
    if (p.l != null && dom === (p.pd + 2) % 30) {                         // épargne du mois
      const extra = p.b - inc * 0.4;
      if (extra > 0) { const m = extra * p.sv * livChance(s); p.b -= m; p.l += m; } // l'épargne suit l'attrait de votre taux
    }
    if (p.b < 0) {
      p.ag = (p.ag || 0) + -p.b * agioRate;                              // agios
      if (p.b < -p.o - 30 && !(p.al > s.day - 12)) { p.al = s.day; s.alerts.push(p.i); }
    }
  }
  s.cash += cashIn - cashOut;
  recomputeAgg(s);
}

// ---------- Fin de mois : frais, agios, intérêts, départs, coups durs ----------
function peopleMonth(s) {
  const fee = s.prod.cc.fee, cfee = s.prod.carte.fee, rate = s.depositRate / 1200;
  const r = { fees: 0, agios: 0, cards: 0, depInt: 0, gone: 0, newUnemp: 0 };
  const rival = s.branches.some(b => b.rivalUntil > s.day) ? 0.004 : 0;
  const keep = [];
  for (const p of s.people) {
    const w = pw(p);
    p.b -= fee; r.fees += fee * w;                                        // tenue de compte
    if (p.c) { const cf = cfee * (p.c === 2 ? 2.5 : 1) / 12; p.b -= cf; r.cards += cf * w; }
    if (p.ag) { p.b -= p.ag; r.agios += p.ag * w; p.ag = 0; }
    if (p.l) { const i = p.l * rate; p.l += i; r.depInt += i * w; }
    if (p.a) p.a *= 1.003;
    // coups durs et retours à l'emploi
    if (!p.u && chance((1 - JOBS[p.j][3]) / 60 * ECON[s.economy].pd)) { p.u = 1; r.newUnemp += w; p.q -= 5; }
    else if (p.u && chance(0.2)) p.u = 0;
    if (s.day % 360 === 0) { p.s = Math.round(p.s * 1.02); p.sp = Math.round(p.sp * 1.02); p.r = Math.round(p.r * 1.015); }
    // satisfaction personnelle : revient doucement vers celle de l'agence
    const b = getBranch(s, p.br); p.q += ((b ? b.sat : 50) - p.q) * 0.1;
    // départ ?
    const leave = (0.003 + Math.max(0, fee - 6) * 0.006 + (p.q < 30 ? 0.06 : p.q < 45 ? 0.015 : 0) + rival) * (1 - 0.15 * perk(s, 'fidelite'));
    if (p.b >= 0 && !personLoans(s, p).length && chance(leave)) { s.cash -= (p.b + (p.l || 0)) * w; r.gone += w; continue; }
    keep.push(p);
  }
  s.people = keep;
  recomputeAgg(s);
  return r;
}
