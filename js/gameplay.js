'use strict';
/* =====================================================================
   BANQUE TYCOON — fréquentation réelle, fraudes, concurrents qui agissent,
   rachats et Grande Crise finale
   ===================================================================== */

// ---------- Fréquentation : chaque jour, des clients viennent en agence ----------
// Les clients « comptes » ont besoin d'un guichet ou d'un distributeur,
// les emprunteurs d'un conseiller. Ceux qu'on ne peut pas servir repartent.
function branchTraffic(s, b) {
  let t = cityOf(b).traffic * 6 * (0.6 + s.reputation / 125);
  if (s.upgrades.marketing) t *= 1.15;
  if (b.rivalUntil > s.day) t *= 0.8;
  if (s.flags.sponsorUntil > s.day) t *= 1.15;
  t *= specOf(b).traffic || 1;
  return { acc: b.gs || b.dab ? t * 0.75 : 0, loan: b.bs ? t * 0.25 : 0 };
}
function branchCapacity(b) { return { acc: staffEff(b, 'gs') * 8 + b.dab * 5, loan: staffEff(b, 'bs') * 4 }; }
function serveDay(s) {
  for (const b of s.branches) {
    const A = branchTraffic(s, b), C = branchCapacity(b), tot = A.acc + A.loan;
    if (!tot) { b.svc = 1; continue; }
    const served = Math.min(A.acc, C.acc) + Math.min(A.loan, C.loan);
    b.svc = (b.svc == null ? 1 : b.svc) * 0.9 + 0.1 * served / tot;
    b.mServed = (b.mServed || 0) + served; b.mLost = (b.mLost || 0) + (tot - served);
  }
}
function serveMonth(s) {
  let lost = 0;
  for (const b of s.branches) { b.lastServed = Math.round(b.mServed || 0); b.lastLost = Math.round(b.mLost || 0); lost += b.lastLost; b.mServed = b.mLost = 0; }
  if (lost > 30) toast(`🚶 ${nf0.format(lost)} clients sont repartis sans être servis ce mois-ci`, 'bad', 'lost');
}
const lostShare = b => { const t = (b.lastServed || 0) + (b.lastLost || 0); return t ? b.lastLost / t : 0; };

// ---------- Fraudes ----------
const FRAUD_CLUES = ['Adresse introuvable sur la carte', 'Fiches de paie floues', 'Société créée il y a 3 jours', 'Le téléphone ne répond jamais', 'Signature différente sur chaque page', 'Pressé de recevoir l’argent… aujourd’hui'];
function maybeFraud(s, r) {
  r.fraud = chance(r.score < 560 ? 0.12 : 0.05);
  if (r.fraud) { r.maxRate += 4; r.clue = pick(FRAUD_CLUES); if (s.upgrades.analyste && chance(0.7)) r.flagged = true; }
  return r;
}
const verifyCost = r => Math.round(clamp(r.amount * 0.0015, 100, 30e3) / 10) * 10;
function verifyRequest(id) {
  const r = S.requests.find(x => x.id == id); if (!r || r.checked) return;
  const cost = verifyCost(r); if (S.cash < cost) return toast('Liquidités insuffisantes', 'bad');
  S.cash -= cost; r.checked = true;
  if (r.fraud) {
    S.requests = S.requests.filter(x => x !== r); S.stats.frauds = (S.stats.frauds || 0) + 1;
    SFX.play('good'); toast(`🕵️ Fraude démasquée ! ${esc(r.name)} : ${r.clue.toLowerCase()}.`, 'good');
    log(`🕵️ Tentative d’escroquerie déjouée (${r.name}).`, 'good');
  } else { r.verified = true; toast(`✅ Dossier de ${esc(r.name)} vérifié : tout est en règle`, 'good'); }
}

// ---------- Rachat d'un concurrent ----------
const aliveRivals = s => s.rivals.filter(r => !r.gone);
function randomRival(s) { const r = pick(aliveRivals(s)); return RIVALS.find(x => x.id === r.id); }
const buyoutPrice = r => Math.round(r.eq * 1.4 / 1e4) * 1e4;
const canBuyout = (s, r) => s.chapter >= 3 && !r.gone && r.eq < equity(s) * 0.6;
function buyoutRival(id) {
  const s = S, r = s.rivals.find(x => x.id === id); if (!r || !canBuyout(s, r)) return;
  const price = buyoutPrice(r), R = RIVALS.find(x => x.id === id);
  if (s.cash < price) return toast('Liquidités insuffisantes', 'bad');
  const dep = r.eq * 4;
  s.cash += r.eq + dep - price; s.deposits += dep; reconcile(s);
  const got = [];
  for (let k = 0; k < 2; k++) { const c = freeCity(s); if (c) { s.branches.push(newBranch(c, { g: 2, gs: 2, b: 1, bs: 1 })); got.push(CITIES[c].name); } }
  syncStaff(s);
  r.gone = true; s.stats.buyouts = (s.stats.buyouts || 0) + 1; s.reputation = clamp(s.reputation + 3, 0, 100);
  SFX.play('level'); confetti(120);
  log(`🦈 Vous rachetez ${R.name} pour ${money(price)}${got.length ? ` (agences : ${got.join(', ')})` : ''}.`, 'good');
  eventModal('🦈', `${R.name} est à vous !`, `<p class="center">Vous absorbez <b>${R.name}</b> pour <b>${money(price)}</b>.</p><p class="center">Ses clients vous confient <b>${money(dep)}</b>${got.length ? ` et vous récupérez ses agences de <b>${got.join(' et ')}</b>` : ''}.</p>`, [{ label: 'Magnifique' }]);
}

// ---------- La Grande Crise (début du dernier chapitre) ----------
function startBigCrisis(s) {
  s.flags.bigCrisisPending = false; s.flags.bigCrisis = s.day;
  s.economy = 'crise'; s.econTimer = 10; s.nextEcon = 'recession';
  for (const id of ['cac', 'tech', 'oil', 'snail', 'crypto']) s.market[id].price *= 0.6;
  s.market.gold.price *= 1.3;
  for (const r of aliveRivals(s)) r.eq *= rnd(0.6, 0.85);
  SFX.play('bad');
  eventModal('🌋', 'La Grande Crise', `<p class="center">Un géant de l’assurance s’effondre et entraîne la planète dans <b>la pire crise financière du siècle</b>. Les bourses perdent 40 %, les défauts vont tripler pendant de longs mois.</p>
    <p class="center">Vos concurrents vacillent eux aussi : c’est le moment de prouver que votre banque est la plus solide… et peut-être d’en racheter.</p>
    <p class="center muted">Objectif : traverser la crise sans faire faillite.</p>`, [{ label: 'Accrochez-vous !' }]);
}
