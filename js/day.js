'use strict';
/* =====================================================================
   BANQUE TYCOON — la journée, tour par tour
   Chaque jour, des clients se présentent dans vos agences : chacun est une
   carte à traiter (ouvrir un compte, déposer, placer sur un livret,
   demander un prêt, réclamer…). S'il manque du personnel, une partie
   repart. Quand vous cliquez sur « Jour suivant », votre équipe traite ce
   qui reste (moins bien que vous), puis le monde avance d'un jour.
   ===================================================================== */

const AVG_BAL = 2500;
const loansOpen = s => s.chapter >= 1;
const lognorm = (mean, sd = 0.6) => Math.max(50, Math.round(mean * Math.exp(sd * gauss() - sd * sd / 2) / 10) * 10);
const nameP = () => pick(FIRST) + ' ' + pick(LAST);
const focusOn = (s, f) => s.flags.focus === f && s.flags.focusUntil > s.day;

// ---------- Fréquentation ----------
function dayArrivals(s, b) {
  if (!b.gs && !b.bs) return 0;
  let n = rnd(6, 10) * cityOf(b).traffic / 3 * (0.6 + s.reputation / 125);
  if (s.upgrades.marketing) n *= 1.15;
  if (b.rivalUntil > s.day) n *= 0.8;
  if (s.flags.sponsorUntil > s.day) n *= 1.15;
  n *= specOf(b).traffic || 1;
  return Math.max(1, Math.round(n));
}
function potentialClients(s) { return s.branches.reduce((a, b) => a + cityOf(b).cap / AVG_BAL * 0.4 * (specOf(b).cap || 1), 0); }

function pickKind(s, b) {
  const sat = clamp(1 - s.clients / Math.max(1, potentialClients(s)), 0.12, 1), c = Math.min(1, s.clients / 25);
  const w = {
    compte: b.gs ? 5 * sat : 0, depot: b.gs ? 1.6 * c : 0, retrait: 1.3 * c, livret: s.prod.liv.on && b.gs ? 2 * c : 0,
    pret: loansOpen(s) && b.bs ? 2.6 : 0, reclam: b.gs ? (0.5 + (s.prod.cc.fee > 7 ? 1 : 0) + (b.sat < 45 ? 1 : 0)) * c : 0,
    carte: s.prod.carte.on && b.gs ? 1 * c : 0, av: s.prod.av.on && b.bs ? 0.8 : 0, suspect: b.gs ? 0.35 : 0,
  };
  return weighted(w);
}
const NEEDS = { compte: 'g', depot: 'g', retrait: 'g', livret: 'g', reclam: 'g', carte: 'g', suspect: 'g', pret: 'b', av: 'b' };

// ---------- Fabrication des cartes ----------
const RECLAM = ['ses frais de tenue de compte', 'un prélèvement en double', 'une heure d’attente au guichet', 'une carte avalée par le distributeur', 'un conseiller qui ne rappelle jamais'];
const SUSPECT_CLUES = ['paie tout en billets de 500 €', 'présente une pièce d’identité floue', 'refuse de dire d’où vient l’argent', 'arrive avec une valise et des lunettes noires', 'veut ouvrir 12 comptes d’un coup'];
const COURRIER = [
  ['💌', 'Une cliente de 92 ans vous écrit pour remercier son guichetier, « si poli ».', 'rep', 1],
  ['🏫', 'L’école du quartier vous invite à présenter le métier de banquier.', 'rep', 2],
  ['📰', 'Le journal local veut une interview sur l’épargne des Français.', 'rep', 2],
  ['🎂', 'C’est l’anniversaire de votre plus ancien client. Il vous apporte un gâteau.', 'sat', 3],
];
function makeCard(s, b, kind) {
  const c = { id: ++ui.cardSeq, kind, branch: b.id, name: nameP() };
  if (kind === 'compte') c.amt = lognorm(AVG_BAL * (specOf(b).cap || 1));
  if (kind === 'depot') c.amt = lognorm(1500);
  if (kind === 'retrait') c.amt = lognorm(600);
  if (kind === 'livret') c.amt = lognorm(9000);
  if (kind === 'carte') c.gold = chance(0.35);
  if (kind === 'av') c.amt = lognorm(40000 * Math.sqrt(loanScale(s)));
  if (kind === 'reclam') { c.reason = pick(RECLAM); c.cost = rint(2, 8) * 10; }
  if (kind === 'suspect') { c.amt = lognorm(35000, 0.5); c.clue = pick(SUSPECT_CLUES); c.fraud = chance(0.8); }
  if (kind === 'pret') { c.req = makeRequest(s); c.req.branch = b.id; c.name = c.req.name; }
  return c;
}
function makeTask(s, kind) {
  const c = { id: ++ui.cardSeq, kind, task: true };
  if (kind === 'facture') { c.amt = Math.round(monthlyCosts(s) * rnd(0.03, 0.08) / 10) * 10; c.who = pick(['le fournisseur de café', 'l’entreprise de ménage', 'l’imprimeur des chéquiers', 'le dépanneur informatique', 'la société de transport de fonds']); }
  if (kind === 'impaye') { const L = pick(s.loans.filter(l => l.type !== 'souv')); c.loan = L.id; c.name = L.name; c.amt = Math.round(L.pmt); }
  if (kind === 'courrier') c.letter = rint(0, COURRIER.length - 1);
  return c;
}

// ---------- Début de journée ----------
function startDay(s) {
  reconcile(s); // intègre les dépôts modifiés par les événements
  const t = s.today = { day: s.day, cards: [], arrived: 0, lost: 0, done: 0, tally: { comptes: 0, depots: 0, prets: 0, ventes: 0, recl: 0, perdus: 0 }, m: { comptes: 0, prets: 0, ventes: 0 }, obj: null };
  for (const b of s.branches) {
    const A = dayArrivals(s, b); if (!A) continue;
    const capG = Math.round(staffEff(b, 'gs') * 6 * (focusOn(s, 'accueil') ? 1.2 : 1)), capB = Math.round(staffEff(b, 'bs') * 3 * (focusOn(s, 'accueil') ? 1.2 : 1));
    let dab = b.dab * 5, usedG = 0, usedB = 0, served = 0, lost = 0;
    for (let i = 0; i < A; i++) {
      const kind = pickKind(s, b);
      if (kind === 'retrait' && dab > 0) { dab--; served++; const amt = lognorm(400); s.depCC = Math.max(0, s.depCC - amt); s.cash -= amt; continue; } // le distributeur s'en charge
      const need = NEEDS[kind];
      if (need === 'g' ? usedG < capG : usedB < capB) { need === 'g' ? usedG++ : usedB++; served++; t.cards.push(makeCard(s, b, kind)); }
      else lost++;
    }
    b.svc = (b.svc == null ? 1 : b.svc) * 0.85 + 0.15 * (A ? served / A : 1);
    b.mServed = (b.mServed || 0) + served; b.mLost = (b.mLost || 0) + lost;
    t.arrived += A; t.lost += lost;
  }
  s.deposits = s.depCC + s.depLiv;
  // Tâches de bureau
  if (s.day % 7 === 1 && s.day > 1 && s.branches.some(b => b.gs || b.bs)) t.cards.unshift({ id: ++ui.cardSeq, kind: 'reunion', task: true });
  if (s.clients > 20 && chance(0.25)) t.cards.push(makeTask(s, 'facture'));
  if (s.loans.some(l => l.type !== 'souv') && chance(0.2)) t.cards.push(makeTask(s, 'impaye'));
  if (s.clients > 40 && chance(0.15)) t.cards.push(makeTask(s, 'courrier'));
  t.total = t.cards.length;
  t.obj = makeObjective(s, t);
  ui.dirty = true;
}

// ---------- Objectif du jour ----------
const OBJECTIVES = {
  comptes: { txt: n => `Ouvrir ${n} comptes`, cur: t => t.m.comptes, ok: t => t.cards.filter(c => c.kind === 'compte').length >= 2, n: t => Math.max(2, Math.ceil(t.cards.filter(c => c.kind === 'compte').length * 0.7)) },
  ventes: { txt: n => `Réussir ${n} vente${n > 1 ? 's' : ''} (carte, livret, assurance-vie)`, cur: t => t.m.ventes, ok: (t, s) => s.prod.liv.on || s.prod.carte.on, n: () => rint(1, 2) },
  pret: { txt: () => 'Accorder un prêt', cur: t => t.m.prets, ok: t => t.cards.some(c => c.kind === 'pret'), n: () => 1 },
  recl: { txt: () => 'Calmer tous les clients mécontents', cur: t => t.cards.filter(c => c.kind === 'reclam' && !c.done).length ? 0 : 1, ok: t => t.cards.some(c => c.kind === 'reclam'), n: () => 1 },
  zero: { txt: () => 'Ne perdre aucun client aujourd’hui', cur: t => t.lost ? 0 : 1, ok: t => t.arrived > 0, n: () => 1 },
};
function makeObjective(s, t) {
  const pool = Object.keys(OBJECTIVES).filter(k => OBJECTIVES[k].ok(t, s));
  if (!pool.length) return null;
  const k = pick(pool);
  return { k, n: OBJECTIVES[k].n(t), reward: Math.round(Math.max(500, equity(s) * 0.0015) / 100) * 100, done: false };
}
function checkObjective(s) {
  const t = s.today, o = t && t.obj; if (!o || o.done) return;
  if (OBJECTIVES[o.k].cur(t) >= o.n) {
    o.done = true; s.cash += o.reward; s.reputation = clamp(s.reputation + 0.5, 0, 100);
    SFX.play('good'); toast(`🎯 Objectif du jour réussi : +${money(o.reward)}`, 'good');
  }
}

// ---------- Traitement d'une carte ----------
function openAccount(s, c) { s.clients++; s.depCC += c.amt; s.cash += c.amt; s.today.tally.comptes++; }
function upsellChance(s, manual) { return 0.35 * (focusOn(s, 'ventes') ? 1.35 : 1) * (manual ? 1 : 0.5) * (0.7 + s.reputation / 170); }
function livChance(s) { return clamp(0.5 + (s.depositRate - marketDepRate(s)) * 0.45, 0.1, 0.95); }
function sell(s, what, amt) {
  s.today.tally.ventes++;
  if (what === 'carte') s.cards++;
  if (what === 'gold') s.cardsGold++;
  if (what === 'livret') { s.depLiv += amt; s.cash += amt; }
  if (what === 'av') s.prod.av.aum += amt;
}

// Retourne un petit texte de résultat (ou null)
function resolveCard(s, c, choice, manual = true) {
  const b = c.branch && getBranch(s, c.branch);
  let msg = null;
  const before = { ...s.today.tally };
  reconcile(s);
  switch (c.kind) {
    case 'compte':
      if (choice === 'refuse') break;
      openAccount(s, c);
      if (choice === 'carte' && s.prod.carte.on) { if (chance(upsellChance(s, manual) * 1.3)) { sell(s, 'carte'); msg = `${c.name} prend aussi une carte bancaire 💠`; } else msg = `${c.name} ouvre son compte, mais ne veut pas de carte.`; }
      if (choice === 'livret' && s.prod.liv.on) { if (chance(upsellChance(s, manual) * livChance(s) * 2)) { const x = lognorm(6000); sell(s, 'livret', x); msg = `${c.name} place aussi ${money(x)} sur un livret 🐷`; } else msg = `${c.name} ouvre son compte, mais le livret ne l’intéresse pas.`; }
      break;
    case 'depot':
      s.depCC += c.amt; s.cash += c.amt; s.today.tally.depots++;
      if (choice === 'livret' && s.prod.liv.on && chance(livChance(s) * (manual ? 0.8 : 0.4))) { s.depCC -= c.amt; s.depLiv += c.amt; s.today.tally.ventes++; msg = `${c.name} met finalement ses ${money(c.amt)} sur son livret.`; }
      break;
    case 'retrait':
      if (s.cash < c.amt) { s.reputation = clamp(s.reputation - 2, 0, 100); msg = `😱 Pas assez de liquidités pour ${c.name} ! Réputation -2`; break; }
      s.depCC = Math.max(0, s.depCC - c.amt); s.cash -= c.amt;
      break;
    case 'livret': {
      if (choice === 'refuse') break;
      let p = livChance(s) * (manual ? 1 : 0.8);
      if (choice === 'prime') { s.cash -= Math.round(c.amt * 0.005); p = Math.min(0.97, p + 0.35); }
      if (chance(p)) { sell(s, 'livret', c.amt); msg = `${c.name} place ${money(c.amt)} sur son livret.`; }
      else msg = `${c.name} trouve votre taux trop bas et part chez le concurrent.`;
      break;
    }
    case 'carte':
      if (choice === 'refuse') break;
      if (choice === 'gold' && chance(manual ? 0.55 : 0.3)) { sell(s, 'gold'); msg = `${c.name} repart avec une carte Gold ✨`; }
      else { sell(s, 'carte'); if (choice === 'gold') msg = `${c.name} préfère la carte classique.`; }
      break;
    case 'av':
      if (choice === 'refuse') break;
      if (chance(manual ? 0.85 : 0.6)) { sell(s, 'av', c.amt); msg = `${c.name} confie ${money(c.amt)} à votre assurance-vie.`; } else msg = `${c.name} veut réfléchir encore.`;
      break;
    case 'reclam':
      s.today.tally.recl++;
      if (choice === 'rembourse') { s.cash -= c.cost; if (b) b.sat = clamp(b.sat + 1.5, 0, 100); msg = `${c.name} repart calmé.`; }
      else if (choice === 'excuse') { if (chance(manual ? 0.6 : 0.45)) msg = `${c.name} accepte vos excuses.`; else { s.reputation = clamp(s.reputation - 0.5, 0, 100); msg = `${c.name} repart en râlant.`; } }
      else { s.reputation = clamp(s.reputation - 1, 0, 100); if (chance(0.4)) { s.clients = Math.max(0, s.clients - 1); const out = Math.min(s.depCC, AVG_BAL); s.depCC -= out; s.cash -= out; msg = `${c.name} ferme son compte !`; } }
      break;
    case 'suspect':
      if (choice === 'signale') { s.reputation = clamp(s.reputation + (c.fraud ? 1.5 : -1), 0, 100); s.stats.tracfin = (s.stats.tracfin || 0) + (c.fraud ? 1 : 0); msg = c.fraud ? '🕵️ Bien vu : TRACFIN ouvre une enquête sur ce blanchiment.' : '😬 Fausse alerte : c’était un honnête collectionneur. Réputation -1'; }
      else if (choice === 'ouvre') {
        openAccount(s, c);
        if (c.fraud) s.flags.dirty = (s.flags.dirty || 0) + c.amt;
      }
      break;
    case 'pret':
      // géré par offerLoan / deferLoan
      break;
    case 'reunion':
      s.flags.focus = choice; s.flags.focusUntil = s.day + 7;
      msg = { accueil: 'Cette semaine : priorité à l’accueil (+20 % de clients servis).', ventes: 'Cette semaine : priorité aux ventes (+35 % de chances de vendre).', prudence: 'Cette semaine : priorité à la prudence (les fraudes sautent aux yeux).' }[choice];
      break;
    case 'facture':
      if (choice === 'negocie') { if (chance(0.5)) { s.cash -= Math.round(c.amt * 0.7); msg = `Négociation réussie avec ${c.who} : -30 %.`; } else { s.cash -= Math.round(c.amt * 1.1); msg = `${c.who} refuse et ajoute des frais de retard.`; } }
      else s.cash -= c.amt;
      break;
    case 'impaye': {
      const L = s.loans.find(l => l.id === c.loan); if (!L) break;
      if (choice === 'appel') { if (chance(manual ? 0.7 : 0.55)) msg = `${c.name} s’excuse et paie sa mensualité.`; else { L.pdA *= 1.5; msg = `${c.name} ne décroche pas… le risque de défaut augmente.`; } }
      else if (choice === 'etale') { L.left += 12; L.pmt = payment(L.out, L.rate, L.left); L.pdA *= 0.7; msg = `Prêt de ${c.name} rallongé d’un an : mensualités plus douces.`; }
      else if (choice === 'saisie') { const got = L.out * Math.min(0.95, LOAN_TYPES[L.type].rec + (L.recB || 0) + 0.1); s.cash += got; L.dead = true; s.loans = s.loans.filter(x => x !== L); s.flags.seizeLoss = (s.flags.seizeLoss || 0) + (L.out - got); msg = `Garanties saisies : vous récupérez ${money(got)} sur ${money(L.out)}.`; }
      break;
    }
    case 'courrier': {
      const [, , k, v] = COURRIER[c.letter];
      if (k === 'rep') s.reputation = clamp(s.reputation + v, 0, 100); else for (const x of s.branches) x.sat = clamp(x.sat + v, 0, 100);
      break;
    }
  }
  c.done = true; s.today.done++;
  s.deposits = s.depCC + s.depLiv;
  if (manual) { for (const k of ['comptes', 'ventes']) s.today.m[k] += s.today.tally[k] - before[k]; checkObjective(s); }
  return msg;
}

// Ce que ferait votre équipe à votre place
function delegateChoice(s, c) {
  switch (c.kind) {
    case 'compte': return s.prod.carte.on ? 'carte' : s.prod.liv.on ? 'livret' : 'ouvre';
    case 'depot': return 'ok';
    case 'livret': return 'ok';
    case 'carte': return 'vend';
    case 'av': return 'ok';
    case 'reclam': return 'excuse';
    case 'suspect': return s.upgrades.conformite || focusOn(s, 'prudence') ? 'signale' : 'ouvre';
    case 'reunion': return s.flags.focus || 'accueil';
    case 'facture': return 'paye';
    case 'impaye': return 'appel';
    default: return 'ok';
  }
}
function delegateLoan(s, c) {
  const r = c.req;
  if (s.auto && s.auto.on) { s.requests.push(r); return; } // le pilote automatique décidera
  r.expires = s.day + 15; s.requests.push(r); // mis de côté dans l'onglet Prêts
}
function delegateRest(s) {
  const t = s.today; if (!t) return 0;
  let n = 0;
  for (const c of t.cards) {
    if (c.done) continue;
    if (c.kind === 'pret') { delegateLoan(s, c); c.done = true; t.done++; n++; continue; }
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
  const auto = delegateRest(s);
  if (t) {
    s.yesterday = { day: t.day, ...t.tally, arrived: t.arrived, lost: t.lost, auto, obj: t.obj ? { txt: OBJECTIVES[t.obj.k].txt(t.obj.n), done: t.obj.done } : null };
    if (t.lost) log(`🚶 ${t.lost} client${t.lost > 1 ? 's sont repartis' : ' est reparti'} sans être servi${t.lost > 1 ? 's' : ''}.`, 'bad');
  }
  tickDay();
  if (!s.over) startDay(s);
  SFX.play('click');
  renderTop(); renderPanel(true);
}

// ---------- Fin de mois : vie des comptes ----------
function clientMonth(s) {
  reconcile(s);
  const fee = s.prod.cc.fee;
  // Départs de clients : frais élevés, mauvais service, concurrence
  const churn = clamp(0.006 + Math.max(0, fee - 6) * 0.008 + Math.max(0, 50 - avgSat(s)) / 2500 + (s.branches.some(b => b.rivalUntil > s.day) ? 0.004 : 0), 0, 0.1);
  const gone = Math.round(s.clients * churn), bal = s.clients ? s.depCC / s.clients : 0;
  s.clients -= gone; s.depCC -= gone * bal; s.cash -= gone * bal;
  s.monthGone = gone;
  // Les comptes vivent : salaires versés, dépenses…
  const g = s.depCC * 0.004; s.depCC += g; s.cash += g;
  // Le livret suit l'attractivité de votre taux
  const gap = s.depositRate - marketDepRate(s) - (s.flags.priceWar > s.day ? 1 : 0);
  const flow = s.depLiv * clamp(gap * 0.02, -0.06, 0.02);
  s.depLiv = Math.max(0, s.depLiv + flow); s.cash += flow;
  if (s.prod.av.on) s.prod.av.aum *= 1.003;
  // Argent sale accepté : le régulateur finit par le découvrir
  if (s.flags.dirty && chance(0.25)) {
    const fine = s.flags.dirty * 2 / (s.upgrades.conformite ? 3 : 1);
    s.cash -= fine; s.reputation = clamp(s.reputation - 12, 0, 100); s.flags.dirty = 0;
    log(`🚔 TRACFIN découvre de l’argent sale dans vos comptes. Amende : ${money(fine)}.`, 'bad');
    toast(`🚔 Blanchiment découvert : amende de ${money(fine)} !`, 'bad');
  }
  s.deposits = s.depCC + s.depLiv;
}
