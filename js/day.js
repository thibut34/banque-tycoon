'use strict';
/* =====================================================================
   BANQUE TYCOON — la journée, tour par tour
   Le matin, des gens poussent la porte de vos agences (nouveaux clients,
   demandes de vos clients, rendez-vous de prêt…) et les alertes de la
   nuit arrivent (découverts, impayés, paiements suspects). Chaque
   situation est une carte à traiter. Ce que vous ne traitez pas, votre
   équipe s'en charge, moins bien que vous. Puis le monde avance d'un jour.
   ===================================================================== */

const loansOpen = s => s.chapter >= 1;
const lognorm = (mean, sd = 0.6) => Math.max(50, Math.round(mean * Math.exp(sd * gauss() - sd * sd / 2) / 10) * 10);
const nameP = () => pick(FIRST) + ' ' + pick(LAST);
const focusOn = (s, f) => s.flags.focus === f && s.flags.focusUntil > s.day;

// ---------- Fréquentation ----------
function dayArrivals(s, b) {
  if (!b.gs && !b.bs) return 0;
  let n = rnd(6, 10) * cityOf(b).traffic / 3 * (0.6 + s.reputation / 125);
  if (s.upgrades.marketing) n *= 1.15;
  n += perk(s, 'aimant');
  if (b.rivalUntil > s.day) n *= 0.8;
  if (s.flags.sponsorUntil > s.day) n *= 1.15;
  n *= specOf(b).traffic || 1;
  return Math.max(1, Math.round(n));
}
const potentialFor = (s, b) => cityOf(b).cap / 2500 * 0.4 * (specOf(b).cap || 1);
function pickKind(s, b, mine) {
  const sat = clamp(1 - mine / Math.max(1, potentialFor(s, b)), 0.1, 1), c = Math.min(1, mine / 20);
  const w = {
    compte: b.gs ? 5 * sat : 0, suspect: b.gs ? 0.3 : 0,
    demande: b.gs ? 2.2 * c : 0, reclam: b.gs ? 0.5 * c : 0,
    pret: loansOpen(s) && b.bs ? 2.4 * Math.max(0.15, c) : 0, pro: loansOpen(s) && b.bs ? 0.5 : 0,
    av: s.prod.av.on && b.bs ? 0.6 * c : 0,
  };
  return weighted(w);
}
const NEEDS = { compte: 'g', suspect: 'g', demande: 'g', reclam: 'g', pret: 'b', pro: 'b', av: 'b' };

// ---------- Fabrication des cartes ----------
const RECLAM = ['ses frais de tenue de compte', 'des agios trop élevés', 'une heure d’attente au guichet', 'une carte avalée par le distributeur', 'un conseiller qui ne rappelle jamais', 'un prélèvement rejeté'];
const SUSPECT_CLUES = ['paie tout en billets de 500 €', 'présente une pièce d’identité floue', 'refuse de dire d’où vient l’argent', 'donne une adresse qui n’existe pas', 'veut ouvrir 12 comptes d’un coup'];
const FRAUD_CB = [['une bijouterie de Bangkok', 'à 3 h du matin'], ['un casino en ligne maltais', 'en pleine nuit'], ['un magasin d’électronique de Lagos', 'cinq fois de suite'], ['une boutique de luxe à Dubaï', 'alors qu’il a payé son pain à Montpellier une heure avant']];
const COURRIER = [
  ['💌', 'Une cliente de 92 ans vous écrit pour remercier son guichetier, « si poli ».', 'rep', 1],
  ['🏫', 'L’école du quartier vous invite à présenter le métier de banquier.', 'rep', 2],
  ['📰', 'Le journal local veut une interview sur l’épargne des Français.', 'rep', 2],
  ['🎂', 'C’est l’anniversaire de votre plus ancien client. Il vous apporte un gâteau.', 'sat', 3],
];
// Ce que vos clients demandent au guichet
function pickDemande(s, p) {
  const w = {
    plafond: p.b < 0 || p.o < p.s * 0.5 ? 2 : 0.5,
    gold: s.prod.carte.on && p.c === 1 && p.s > 2500 ? 1.5 : 0,
    carte: s.prod.carte.on && !p.c ? 2.5 : 0,
    livret: s.prod.liv.on && p.l == null && p.b > p.s * 1.2 ? 3 : 0,
    virement: 1, chequier: 0.8, cloture: p.q < 55 ? 2 : 0.3,
  };
  return weighted(w);
}
function makeCard(s, b, kind, mine) {
  const c = { id: ++ui.cardSeq, kind, branch: b.id };
  if (kind === 'compte') { c.p = newPersonFor(s, b); c.name = pname(c.p); }
  if (kind === 'suspect') { c.name = nameP(); c.amt = lognorm(35000, 0.5); c.clue = pick(SUSPECT_CLUES); c.fraud = chance(0.8); }
  if (kind === 'demande' || kind === 'reclam' || kind === 'av' || kind === 'pret') {
    const p = pick(mine.length ? mine : s.people); if (!p) return null;
    c.pid = p.i; c.name = pname(p);
    if (kind === 'demande') { c.sub = pickDemande(s, p); if (c.sub === 'virement') c.amt = lognorm(2500); }
    if (kind === 'reclam') { c.reason = pick(RECLAM); c.cost = rint(2, 8) * 10; }
    if (kind === 'av') c.amt = Math.round(Math.max(5000, (p.l || p.b) * rnd(0.3, 0.8)) / 100) * 100;
    if (kind === 'pret') { c.req = personLoanRequest(s, p); if (!c.req) return null; }
  }
  if (kind === 'pro') { c.req = makeRequest(s, weighted({ pro: 4, startup: 1, farfelu: 1 })); c.name = c.req.name; }
  if (c.req) c.req.branch = b.id;
  return c;
}
// Une demande de prêt construite à partir de la vraie situation du client
function personLoanRequest(s, p) {
  const inc = pinc(p); if (p.u || inc < 900) return null;
  const type = !p.own && inc > 1900 && chance(0.55) ? 'immo' : weighted({ auto: 3, conso: 3 });
  const r = makeRequest(s, type);
  r.name = pname(p); r.pid = p.i; r.income = inc; r.debt = Math.round(personDebt(s, p)); r.score = personScore(s, p);
  if (type === 'immo') {
    r.dur = rint(15, 25) * 12;
    const price = Math.round(inc * 12 * rnd(3, 5.5) / 1000) * 1000;
    r.apport = clamp((p.l || 0) / price, 0, 0.3); r.amount = Math.round(price * (1 - r.apport) / 1000) * 1000;
    r.reason = p.l > price * 0.1 ? 'acheter sa résidence principale' : 'acheter un appartement sans apport';
  } else if (type === 'auto') r.amount = Math.round(rnd(6e3, Math.min(45e3, inc * 14)) / 1000) * 1000;
  else { r.amount = Math.round(rnd(2e3, Math.min(25e3, inc * 6)) / 500) * 500; if (p.own) r.reason = 'des travaux dans sa maison'; }
  r.amount = Math.min(r.amount, Math.max(30e3, equity(s) * 0.2));
  const T = LOAN_TYPES[type], base = s.policyRate + T.spread + reqPD(r, s.policyRate + T.spread) * (1 - T.rec) * 100;
  r.maxRate = Math.min(usure(r), base + rnd(-0.3, 1.2));
  r.offer = Math.round(clamp(base, 0.5, usure(r)) * 10) / 10;
  return r;
}
function makeTask(s, kind, extra = {}) {
  const c = { id: ++ui.cardSeq, kind, task: true, ...extra };
  if (kind === 'facture') { c.amt = Math.round(monthlyCosts(s) * rnd(0.03, 0.08) / 10) * 10; c.who = pick(['le fournisseur de café', 'l’entreprise de ménage', 'l’imprimeur des chéquiers', 'le dépanneur informatique', 'la société de transport de fonds']); }
  if (kind === 'courrier') c.letter = rint(0, COURRIER.length - 1);
  if (kind === 'fraudecb') { const [where, when] = pick(FRAUD_CB); c.where = where; c.when = when; c.amt = lognorm(1500); c.fraud = chance(0.85); }
  return c;
}

// ---------- Début de journée ----------
function startDay(s) {
  reconcile(s);
  const t = s.today = { day: s.day, cards: [], arrived: 0, lost: 0, done: 0, tally: { comptes: 0, prets: 0, ventes: 0, recl: 0 }, m: { comptes: 0, prets: 0, ventes: 0 }, obj: null };
  // Alertes de la nuit
  const alerts = (s.alerts || []).splice(0);
  for (const id of alerts.slice(0, 5)) { const p = findPerson(s, id); if (p && p.b < -p.o) t.cards.push(makeTask(s, 'decouvert', { pid: p.i, name: pname(p) })); }
  for (const id of alerts.slice(5)) { const p = findPerson(s, id); if (p) autoOverdraft(s, p); }
  for (const L of s.loans.filter(l => l.missNew)) { L.missNew = false; t.cards.push(makeTask(s, 'impaye', { loan: L.id, name: L.name, amt: Math.round(L.pmt), miss: L.miss })); }
  const holders = s.cards + s.cardsGold;
  if (holders && chance(Math.min(0.6, holders * 0.0015))) { const p = pick(s.people.filter(p => p.c)); if (p) t.cards.push(makeTask(s, 'fraudecb', { pid: p.i, name: pname(p) })); }
  // Les visiteurs du jour
  for (const b of s.branches) {
    const A = dayArrivals(s, b); if (!A) continue;
    const mine = branchPeople(s, b.id);
    const capG = Math.round(staffEff(b, 'gs') * 6 * (focusOn(s, 'accueil') ? 1.2 : 1)), capB = Math.round(staffEff(b, 'bs') * 3 * (focusOn(s, 'accueil') ? 1.2 : 1));
    let usedG = 0, usedB = 0, served = 0, lost = 0;
    for (let i = 0; i < A; i++) {
      const kind = pickKind(s, b, mine.length), need = NEEDS[kind];
      if (need === 'g' ? usedG < capG : usedB < capB) {
        const c = makeCard(s, b, kind, mine); if (!c) continue;
        need === 'g' ? usedG++ : usedB++; served++; t.cards.push(c);
      } else lost++;
    }
    b.svc = (b.svc == null ? 1 : b.svc) * 0.85 + 0.15 * (A ? served / A : 1);
    b.mServed = (b.mServed || 0) + served; b.mLost = (b.mLost || 0) + lost;
    t.arrived += A; t.lost += lost;
  }
  // Tâches de bureau
  if (s.day % 7 === 1 && s.day > 1 && s.branches.some(b => b.gs || b.bs)) t.cards.unshift({ id: ++ui.cardSeq, kind: 'reunion', task: true });
  if (s.clients > 20 && chance(0.2)) t.cards.push(makeTask(s, 'facture'));
  if (s.clients > 40 && chance(0.12)) t.cards.push(makeTask(s, 'courrier'));
  t.total = t.cards.length;
  t.obj = makeObjective(s, t);
  ui.dirty = true;
}

// ---------- Objectif du jour ----------
const OBJECTIVES = {
  comptes: { txt: n => `Ouvrir ${n} comptes`, cur: t => t.m.comptes, ok: t => t.cards.filter(c => c.kind === 'compte').length >= 2, n: t => Math.max(2, Math.ceil(t.cards.filter(c => c.kind === 'compte').length * 0.7)) },
  ventes: { txt: n => `Réussir ${n} vente${n > 1 ? 's' : ''} (carte, livret, assurance-vie)`, cur: t => t.m.ventes, ok: (t, s) => s.prod.liv.on || s.prod.carte.on, n: () => rint(1, 2) },
  pret: { txt: () => 'Accorder un prêt', cur: t => t.m.prets, ok: t => t.cards.some(c => c.kind === 'pret' || c.kind === 'pro'), n: () => 1 },
  recl: { txt: () => 'Calmer tous les clients mécontents', cur: t => t.cards.filter(c => c.kind === 'reclam' && !c.done).length ? 0 : 1, ok: t => t.cards.some(c => c.kind === 'reclam'), n: () => 1 },
  zero: { txt: () => 'Ne perdre aucun visiteur aujourd’hui', cur: t => t.lost ? 0 : 1, ok: t => t.arrived > 0, n: () => 1 },
};
function makeObjective(s, t) {
  const pool = Object.keys(OBJECTIVES).filter(k => OBJECTIVES[k].ok(t, s));
  if (!pool.length) return null;
  const k = pick(pool);
  return { k, n: OBJECTIVES[k].n(t), reward: Math.round(Math.max(500, equity(s) * 0.0015) * (1 + 0.5 * perk(s, 'chasseur')) / 100) * 100, done: false };
}
function checkObjective(s) {
  const t = s.today, o = t && t.obj; if (!o || o.done) return;
  if (OBJECTIVES[o.k].cur(t) >= o.n) {
    o.done = true; s.cash += o.reward; s.reputation = clamp(s.reputation + 0.5, 0, 100);
    SFX.play('good'); toast(`🎯 Objectif du jour réussi : +${money(o.reward)}`, 'good');
  }
}

// ---------- Traitement d'une carte ----------
function upsellChance(s, manual) { return 0.35 * (1 + 0.12 * perk(s, 'vendeur')) * (focusOn(s, 'ventes') ? 1.35 : 1) * (manual ? 1 : 0.5) * (0.7 + s.reputation / 170); }
function livChance(s) { return clamp(0.5 + (s.depositRate - marketDepRate(s)) * 0.45, 0.1, 0.95); }
const sale = s => { s.today.tally.ventes++; };
// Découvert au-delà de l'autorisation : ce que fait l'équipe par défaut
function autoOverdraft(s, p) { p.q -= 4; p.k = (p.k || 0) + 0.3; }

function resolveCard(s, c, choice, manual = true) {
  const b = c.branch && getBranch(s, c.branch), p = c.pid && findPerson(s, c.pid);
  let msg = null;
  const before = { ...s.today.tally };
  reconcile(s);
  switch (c.kind) {
    case 'compte': {
      if (choice === 'refuse') break;
      const card = choice === 'carte' && s.prod.carte.on && chance(Math.min(1, upsellChance(s, manual) * 1.6));
      const liv = choice === 'livret' && s.prod.liv.on && c.p.save0 > 300 && chance(Math.min(1, upsellChance(s, manual) * livChance(s) * 2));
      openPersonAccount(s, c.p, { card, livret: liv });
      s.today.tally.comptes++;
      if (card) { sale(s); msg = `${c.name} prend aussi une carte bancaire 💳`; }
      if (liv) { sale(s); msg = `${c.name} place ${money(c.p.l)} sur un livret 🐷`; }
      if (choice === 'carte' && !card && s.prod.carte.on) msg = `${c.name} ouvre son compte, sans carte pour l’instant.`;
      if (choice === 'livret' && !liv && s.prod.liv.on) msg = `${c.name} ouvre son compte, mais garde ses économies ailleurs.`;
      break;
    }
    case 'suspect':
      if (choice === 'signale') { s.reputation = clamp(s.reputation + (c.fraud ? 1.5 : -1), 0, 100); s.stats.tracfin = (s.stats.tracfin || 0) + (c.fraud ? 1 : 0); msg = c.fraud ? '🕵️ Bien vu : TRACFIN ouvre une enquête pour blanchiment.' : '😬 Fausse alerte : c’était un honnête collectionneur. Réputation -1'; }
      else if (choice === 'ouvre') { s.depX = (s.depX || 0) + c.amt; s.cash += c.amt; if (c.fraud) s.flags.dirty = (s.flags.dirty || 0) + c.amt; s.today.tally.comptes++; }
      break;
    case 'demande': {
      if (!p) break;
      const ok = choice !== 'refuse';
      switch (c.sub) {
        case 'plafond': if (ok) { p.o += Math.round(p.s * 0.25 / 50) * 50; p.q += 3; msg = `Découvert autorisé de ${c.name} porté à ${money(p.o)}.`; } else p.q -= 4; break;
        case 'carte': if (ok) { p.c = 1; sale(s); p.q += 2; } break;
        case 'gold': if (ok) { if (chance(manual ? 0.85 : 0.6)) { p.c = 2; sale(s); msg = `${c.name} passe à la carte Gold ✨`; } } else p.q -= 2; break;
        case 'livret': if (ok && chance(livChance(s) * (manual ? 1.1 : 0.7))) { const m = Math.round(p.b * rnd(0.4, 0.7)); p.b -= m; p.l = (p.l || 0) + m; sale(s); msg = `${c.name} place ${money(m)} sur un livret 🐷`; } else if (ok) msg = `${c.name} trouve votre taux trop bas.`; break;
        case 'virement': if (ok) { const fee = 15; p.b -= c.amt + fee; s.cash -= c.amt; s.flags.mExtraFees = (s.flags.mExtraFees || 0) + fee; } else p.q -= 3; break;
        case 'chequier': if (ok) p.q += 1; break;
        case 'cloture':
          if (choice === 'geste') { p.q += 20; s.flags.mGifts = (s.flags.mGifts || 0) + s.prod.cc.fee * 3; p.b += s.prod.cc.fee * 3; if (chance(manual ? 0.75 : 0.5)) msg = `${c.name} reste chez vous grâce à votre geste.`; else { closePerson(s, p); msg = `${c.name} part quand même.`; } }
          else if (ok) { closePerson(s, p); msg = `${c.name} clôture son compte.`; }
          break;
      }
      break;
    }
    case 'av':
      if (choice === 'refuse' || !p) break;
      if (chance(manual ? 0.85 : 0.6)) { const take = Math.min(c.amt, Math.max(0, (p.l || 0) + p.b - 500)); const fromL = Math.min(p.l || 0, take); if (p.l) p.l -= fromL; p.b -= take - fromL; s.cash -= take; p.a = (p.a || 0) + take; sale(s); msg = `${c.name} confie ${money(take)} à votre assurance-vie.`; }
      else msg = `${c.name} veut réfléchir encore.`;
      break;
    case 'reclam':
      s.today.tally.recl++;
      if (choice === 'rembourse') { p && (p.b += c.cost, p.q += 15); s.flags.mGifts = (s.flags.mGifts || 0) + c.cost; if (b) b.sat = clamp(b.sat + 1, 0, 100); msg = `${c.name} repart calmé.`; }
      else if (choice === 'excuse') { if (chance(manual ? 0.6 : 0.45)) { p && (p.q += 6); msg = `${c.name} accepte vos excuses.`; } else { p && (p.q -= 8); s.reputation = clamp(s.reputation - 0.5, 0, 100); msg = `${c.name} repart en râlant.`; } }
      else { s.reputation = clamp(s.reputation - 1, 0, 100); if (p) { p.q -= 20; if (chance(0.4) && p.b >= 0 && !personLoans(s, p).length) { closePerson(s, p); msg = `${c.name} ferme son compte !`; } } }
      break;
    case 'decouvert':
      if (!p) break;
      if (choice === 'tolere') { p.q -= 2; p.k = (p.k || 0) + 0.3; msg = `Paiement accepté : ${c.name} paiera des agios.`; }
      else if (choice === 'rejette') { const fee = 20, back = Math.max(0, Math.min(-p.b - p.o, Math.max(p.f, p.r))); p.b += back; s.cash += back; p.b -= fee; s.flags.mExtraFees = (s.flags.mExtraFees || 0) + fee; p.q -= 12; p.k = (p.k || 0) + 0.5; msg = `Prélèvement rejeté (+${fee} € de frais). ${c.name} est furieux.`; }
      else if (choice === 'bloque') { p.blk = s.day + 15; p.q -= 6; msg = `Carte de ${c.name} limitée pendant 15 jours.`; }
      else if (choice === 'appel') {
        if (p.l > 0 && chance(manual ? 0.75 : 0.5)) { const m = Math.min(p.l, -p.b + 100); p.l -= m; p.b += m; p.q += 2; msg = `${c.name} vire ${money(m)} depuis son livret.`; }
        else if (chance(0.4)) { p.sp = Math.round(p.sp * 0.85); p.q += 1; msg = `${c.name} promet de réduire ses dépenses.`; }
        else msg = `${c.name} ne répond pas.`;
      }
      break;
    case 'fraudecb':
      if (choice === 'bloque') { if (c.fraud) { p && (p.q += 8); s.reputation = clamp(s.reputation + 0.5, 0, 100); s.flags.mGifts = (s.flags.mGifts || 0) + 10; msg = '🛡️ Bien vu : la carte était piratée. Nouvelle carte envoyée.'; } else { p && (p.q -= 10); msg = `😬 C’était vraiment ${c.name}, en vacances. Il est agacé.`; } }
      else { if (c.fraud) { s.cash -= c.amt; s.flags.mGifts = (s.flags.mGifts || 0) + c.amt; p && (p.q -= 15); s.reputation = clamp(s.reputation - 1, 0, 100); msg = `💸 C’était une fraude : vous remboursez ${money(c.amt)} à ${c.name}.`; } }
      break;
    case 'reunion':
      s.flags.focus = choice; s.flags.focusUntil = s.day + 7;
      msg = { accueil: 'Cette semaine : priorité à l’accueil (+20 % de visiteurs servis).', ventes: 'Cette semaine : priorité aux ventes (+35 % de chances de vendre).', prudence: 'Cette semaine : priorité à la prudence (fraudes repérées).' }[choice];
      break;
    case 'facture':
      if (choice === 'negocie') { if (chance(0.5)) { s.cash -= Math.round(c.amt * 0.7); msg = `Négociation réussie avec ${c.who} : -30 %.`; } else { s.cash -= Math.round(c.amt * 1.1); msg = `${c.who} refuse et ajoute des frais de retard.`; } }
      else s.cash -= c.amt;
      break;
    case 'impaye': {
      const L = s.loans.find(l => l.id === c.loan); if (!L) break;
      const q = L.pid && findPerson(s, L.pid);
      if (choice === 'appel') { if (q && (q.l || 0) + q.b + q.o > L.pmt && chance(manual ? 0.7 : 0.5)) { const fromL = Math.min(q.l || 0, L.pmt); if (q.l) q.l -= fromL; q.b += fromL; msg = `${c.name} régularise : il alimente son compte.`; } else msg = `${c.name} ne décroche pas…`; }
      else if (choice === 'etale') { L.left += 24; L.pmt = payment(L.out, L.rate, L.left); L.miss = Math.max(0, (L.miss || 0) - 1); msg = `Prêt de ${c.name} rallongé de 2 ans : mensualités plus douces.`; }
      else if (choice === 'saisie') { const got = L.out * Math.min(0.95, LOAN_TYPES[L.type].rec + (L.recB || 0) + 0.1); s.cash += got; s.flags.seizeLoss = (s.flags.seizeLoss || 0) + (L.out - got); s.loans = s.loans.filter(x => x !== L); if (q) { q.k = (q.k || 0) + 2; q.q -= 30; } msg = `Garanties saisies : vous récupérez ${money(got)} sur ${money(L.out)}.`; }
      break;
    }
    case 'courrier': {
      const [, , k, v] = COURRIER[c.letter];
      if (k === 'rep') s.reputation = clamp(s.reputation + v, 0, 100); else for (const x of s.branches) x.sat = clamp(x.sat + v, 0, 100);
      break;
    }
  }
  if (p) p.q = clamp(p.q, 0, 100);
  c.done = true; s.today.done++;
  recomputeAgg(s);
  if (manual) { for (const k of ['comptes', 'ventes']) s.today.m[k] += s.today.tally[k] - before[k]; checkObjective(s); }
  return msg;
}
function closePerson(s, p) {
  if (p.b < 0) return; // il doit d'abord rembourser son découvert
  s.cash -= (Math.max(0, p.b) + (p.l || 0)) * pw(p);
  s.people = s.people.filter(x => x !== p);
  recomputeAgg(s);
}

// Ce que ferait votre équipe à votre place
function delegateChoice(s, c) {
  switch (c.kind) {
    case 'compte': return s.prod.carte.on ? 'carte' : s.prod.liv.on ? 'livret' : 'ouvre';
    case 'suspect': return s.upgrades.conformite || focusOn(s, 'prudence') ? 'signale' : 'refuse';
    case 'demande': return c.sub === 'cloture' ? (findPerson(s, c.pid) && findPerson(s, c.pid).b < 0 ? 'refuse' : 'ok') : c.sub === 'plafond' ? 'refuse' : 'ok';
    case 'reclam': return 'excuse';
    case 'decouvert': return 'tolere';
    case 'fraudecb': return chance(0.5) ? 'bloque' : 'laisse';
    case 'reunion': return s.flags.focus || 'accueil';
    case 'facture': return 'paye';
    case 'impaye': return 'appel';
    default: return 'ok';
  }
}
function delegateRest(s) {
  const t = s.today; if (!t) return 0;
  let n = 0;
  for (const c of t.cards) {
    if (c.done) continue;
    if (c.req) { c.req.expires = s.day + 15; s.requests.push(c.req); c.done = true; t.done++; n++; continue; } // le pilote automatique ou vous déciderez
    resolveCard(s, c, delegateChoice(s, c), false); n++;
  }
  return n;
}

// ---------- Prêts proposés depuis la journée ----------
function offerLoanCard(s, c) {
  const r = c.req;
  if (s.surveillance) return toast('⚠️ Sous surveillance : prêts interdits', 'bad'), false;
  if (s.cash < r.amount) return toast('Liquidités insuffisantes ! Empruntez à la banque centrale ou attirez des dépôts.', 'bad'), false;
  if (endet(r) > 0.35) return toast('🚫 Endettement au-delà de 35 % : la règle du HCSF vous interdit ce prêt. Baissez le taux ou refusez.', 'bad'), false;
  s.flags.offered = true;
  if (chance(acceptProb(r))) { grantLoan(s, r); s.today.tally.prets++; s.today.m.prets++; toast(`✅ ${esc(r.name)} accepte votre offre à ${pct(r.offer)} !`, 'good'); }
  else { s.stats.refused++; toast(`❌ ${esc(r.name)} trouve votre taux trop élevé.`, 'bad'); }
  c.done = true; s.today.done++; checkObjective(s);
  return true;
}

// ---------- Fin de journée ----------
function nextDay() {
  const s = S; if (!s || s.over || ui.modal) return;
  const t = s.today;
  funEndDay(s, t);
  const auto = delegateRest(s);
  if (t) {
    s.yesterday = { day: t.day, ...t.tally, arrived: t.arrived, lost: t.lost, auto, obj: t.obj ? { txt: OBJECTIVES[t.obj.k].txt(t.obj.n), done: t.obj.done } : null };
    if (t.lost) log(`🚶 ${t.lost} visiteur${t.lost > 1 ? 's sont repartis' : ' est reparti'} sans être reçu${t.lost > 1 ? 's' : ''}.`, 'bad');
  }
  tickDay();
  if (!s.over) startDay(s);
  SFX.play('click');
  const d = $('#tbDate'); if (d) { d.classList.remove('flip'); void d.offsetWidth; d.classList.add('flip'); }
  if (s.day % 30 === 27) { toast('💶 Jour de paie : les salaires tombent sur les comptes de vos clients !', 'good'); const r = d && d.getBoundingClientRect(); if (r) coinBurst(r.left + 40, r.bottom + 10, 10, '#tbCash'); }
  renderTop(); renderPanel(true);
}

// ---------- Fin de mois ----------
function clientMonth(s) {
  reconcile(s);
  const r = peopleMonth(s);
  s.monthGone = r.gone;
  // Argent sale accepté : TRACFIN finit par le découvrir
  if (s.flags.dirty && chance(0.25)) {
    const dirty = s.flags.dirty, fine = dirty * 0.5 / (s.upgrades.conformite ? 3 : 1);
    s.cash -= dirty + fine; s.depX = Math.max(0, (s.depX || 0) - dirty); recomputeAgg(s); // l'argent sale est saisi
    s.reputation = clamp(s.reputation - 12, 0, 100); s.flags.dirty = 0;
    log(`🚔 TRACFIN découvre ${money(dirty)} d’argent sale dans vos comptes : saisie et amende de ${money(fine)}.`, 'bad');
    toast(`🚔 Blanchiment découvert : amende de ${money(fine)} !`, 'bad');
  }
  return r;
}
