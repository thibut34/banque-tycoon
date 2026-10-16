'use strict';
/* =====================================================================
   BANQUE TYCOON — simulation (jour, mois, concurrents, missions, défis)
   ===================================================================== */

// ---------- Demandes de prêt ----------
function personName() { return pick(FIRST) + ' ' + pick(LAST); }
function loanScale(s) { return Math.pow(Math.max(1, equity(s) / 1e6), 0.75); } // la taille des dossiers suit la taille de la banque
function makeRequest(s, forcedType) {
  const types = {}; for (const t in LOAN_TYPES) if (LOAN_TYPES[t].w) types[t] = LOAN_TYPES[t].w;
  const type = forcedType || weighted(types);
  const T = LOAN_TYPES[type];
  const amount = Math.round(Math.min(Math.exp(rnd(Math.log(T.amt[0]), Math.log(T.amt[1]))) * loanScale(s), Math.max(30e3, equity(s) * 0.2)) / 1000) * 1000;
  const name = T.who === 'p' ? personName() : T.who === 'c' ? pick(COMPANY).replace('{L}', pick(LAST)) : pick(STARTUP);
  const score = clamp(Math.round(640 + gauss() * 110), 300, 850);
  const pd = annualPD(score, type);
  const el = pd * (1 - T.rec) * 100;
  const fair = s.policyRate + T.spread + el;
  return maybeFraud(s, {
    id: s.nextId++, type, name, reason: pick(T.reasons), amount,
    dur: rint(T.dur[0] / 6, T.dur[1] / 6) * 6, score, maxRate: s.policyRate + T.spread + el * 0.8 + rnd(-0.6, 1.6),
    offer: Math.round(clamp(fair, 0.5, 25) * 10) / 10, expires: s.day + rint(40, 70),
  });
}
function makeSovereign(s) {
  const [name, rating, reason] = pick(COUNTRIES), R = RATINGS[rating];
  const amount = Math.round(Math.max(5e6, equity(s) * rnd(0.05, 0.25)) / 1e6) * 1e6;
  return {
    id: s.nextId++, type: 'souv', name, rating, reason, amount, dur: rint(5, 10) * 12, score: 0,
    maxRate: s.policyRate + R.spread + rnd(-0.2, 0.8), offer: Math.round((s.policyRate + R.spread + 0.2) * 10) / 10, expires: s.day + rint(20, 30),
  };
}
const fairRate = (s, r) => r.type === 'souv' ? s.policyRate + RATINGS[r.rating].spread : s.policyRate + LOAN_TYPES[r.type].spread + reqPD(r) * (1 - LOAN_TYPES[r.type].rec) * 100;
const reqGrade = r => r.type === 'souv' ? r.rating : grade(r.score);

function grantLoan(s, r) {
  const T = LOAN_TYPES[r.type], souv = r.type === 'souv';
  let pdA = reqPD(r) * (1 + Math.max(0, r.offer - r.maxRate + 1) * 0.06);
  if (s.upgrades.ia && !souv) pdA *= 0.75;
  s.cash -= r.amount;
  const L = { id: r.id, type: r.type, name: r.name, out: r.amount, amount: r.amount, rate: r.offer, left: r.dur, dur: r.dur, pmt: payment(r.amount, r.offer, r.dur), pdA, grade: reqGrade(r), since: s.day };
  if (souv) { L.rw = RATINGS[r.rating].rw; s.stats.souv++; }
  if (r.fraud) L.fraud = true;
  s.loans.push(L);
  s.stats.granted++;
  log(`${T.icon} Prêt de ${money(r.amount)} accordé à ${r.name} à ${pct(r.offer)}.`, 'good');
}

// Pilote automatique : accepte les dossiers selon vos règles
function autopilot(s) {
  const A = s.auto; if (!A || !A.on || s.surveillance) return;
  const ok = 'ABCDE'.slice(0, 'ABCDE'.indexOf(A.min) + 1);
  for (const r of [...s.requests]) {
    if (r.type === 'souv' || !ok.includes(grade(r.score))) continue;
    if (r.flagged || r.amount > equity(s) * 0.2) continue; // pas de grand risque en pilote automatique
    if (!r.checked && r.amount > equity(s) * 0.05) { verifyRequest(r.id); if (!s.requests.includes(r)) continue; } // les gros dossiers sont vérifiés
    if (s.cash - r.amount < s.deposits * 0.1) break;
    if (equity(s) / (rwa(s) + r.amount * LOAN_TYPES[r.type].rw) * 100 < minRatio(s) + 4) break; // garde une marge de solvabilité
    r.offer = Math.round(clamp(fairRate(s, r) + A.margin, 0.5, 25) * 10) / 10;
    s.requests = s.requests.filter(x => x !== r);
    if (chance(acceptProb(r))) grantLoan(s, r); else s.stats.refused++;
  }
}

// ---------- Boucle quotidienne ----------
function tickDay() {
  const s = S;
  s.day++;
  syncStaff(s);
  updateMarket(s);
  serveDay(s);
  updateDeposits(s);
  if (s.flags.bigCrisisPending && !ui.modal) startBigCrisis(s);

  const retail = s.requests.filter(r => r.type !== 'souv').length;
  const maxReq = Math.min(10, 1 + 2 * staffTotal(s, 'bs'));
  // Le tout premier client arrive vite après l'embauche du premier conseiller
  const first = !s.flags.firstReq && staffTotal(s, 'bs') >= 1 && s.day - (s.flags.bsDay || (s.flags.bsDay = s.day)) >= 4;
  if (retail < maxReq && (first || chance(clamp(0.35 * loanDemand(s), 0, 0.6)))) {
    s.flags.firstReq = true;
    s.requests.push(makeRequest(s));
    if (ui.tab !== 'loans' && !(s.auto && s.auto.on)) toast('🤝 Un client vient demander un prêt', '', 'req');
  }
  if (s.chapter >= 4 && s.requests.filter(r => r.type === 'souv').length < 2 && chance(1 / 45)) {
    const r = makeSovereign(s); s.requests.push(r);
    toast(`🏛️ ${esc(r.name)} demande un prêt de <b>${money(r.amount)}</b>`, 'gold');
  }
  const before = s.requests.length;
  s.requests = s.requests.filter(r => r.expires > s.day);
  if (s.requests.length < before) s.stats.refused += before - s.requests.length;
  autopilot(s);

  // Liquidité négative → prêt d'urgence de la banque centrale
  if (s.cash < 0) {
    const need = -s.cash + 50e3;
    s.cbDebt += need; s.cash += need; s.flags.penalty = s.day + 30;
    s.reputation = clamp(s.reputation - 2, 0, 100);
    log(`🚨 Découvert ! La banque centrale vous prête ${money(need)} en urgence (taux pénalité).`, 'bad');
    toast(`🚨 Liquidités épuisées : prêt d’urgence de ${money(need)}`, 'bad', 'urg');
  }
  // Ruée bancaire
  if (s.deposits > 0 && s.cash / s.deposits < 0.05) {
    s.reputation = clamp(s.reputation - 0.25, 0, 100);
    if (s.reputation < 25 && chance(0.02)) bankRun(s, 0.25);
  }

  if (s.day > 90 && !ui.modal && chance(s.day < 720 ? 1 / 90 : 1 / 60)) triggerEvent();
  updateChallenge(s);
  if (s.day % 30 === 0) monthEnd(s);
  if (!s.over) { checkChapter(s); checkAchievements(s); checkUnlocks(s); }
  ui.dirty = true;
}

function bankRun(s, frac) {
  const out = s.deposits * frac;
  s.deposits -= out; s.cash -= out;
  s.reputation = clamp(s.reputation - 8, 0, 100);
  log(`🏃 Panique bancaire ! Les clients retirent ${money(out)}.`, 'bad');
  toast(`🏃 PANIQUE BANCAIRE ! ${money(out)} retirés`, 'bad');
}

function updateMarket(s) {
  const drift = ECON[s.economy].drift;
  for (const id in ASSETS) {
    const a = ASSETS[id], m = s.market[id];
    let r = drift * a.beta + a.vol * gauss();
    if (id === 'oat') r = 0.00005 + a.vol * gauss();
    if (id === 'snail' && s.flags.snailMania > s.day) r += 0.07;
    if (id === 'crypto' && chance(0.003)) r += pick([-0.35, 0.4]);
    m.price = Math.max(a.base * 0.01, m.price * Math.exp(r));
    m.hist.push(m.price);
    if (m.hist.length > 240) m.hist.shift();
  }
}

// ---------- Fin de mois ----------
function monthEnd(s) {
  const econ = ECON[s.economy];
  const pl = { interest: 0, fees: 0, coupons: 0, reserves: 0, depInt: 0, cbInt: 0, costs: 0, losses: 0, tax: 0 };
  let defaults = 0;
  const rec0 = s.upgrades.recouvrement ? 0.2 : 0;

  for (const L of s.loans) {
    if (L.fraud && s.day - L.since >= 60) { // l'escroc disparaît avec l'argent
      const got = L.out * 0.3; s.cash += got; pl.losses += L.out - got; L.dead = true; defaults++; s.stats.defaults++;
      log(`💸 Escroquerie : ${L.name} a disparu. La justice ne récupère que ${money(got)} sur ${money(L.out)}.`, 'bad');
      toast(`💸 <b>${esc(L.name)}</b> était un escroc : ${money(L.out - got)} perdus !`, 'bad');
      continue;
    }
    const m = L.type === 'souv' ? Math.pow(econ.pd, 0.6) : econ.pd;
    const pdm = 1 - Math.pow(1 - clamp(L.pdA * m, 0, 0.95), 1 / 12);
    if (chance(pdm)) {
      const got = L.out * Math.min(0.95, LOAN_TYPES[L.type].rec + rec0);
      s.cash += got; pl.losses += L.out - got;
      L.dead = true; defaults++; s.stats.defaults++;
      log(`💥 ${L.name} ne rembourse plus (${LOAN_TYPES[L.type].label}). Perte : ${money(L.out - got)}.`, 'bad');
      if (L.type === 'souv') toast(`💥 ${esc(L.name)} fait défaut sur sa dette !`, 'bad');
      continue;
    }
    const interest = L.out * L.rate / 1200;
    let pay = Math.min(L.pmt, L.out + interest);
    L.left--;
    if (L.left <= 0) pay = L.out + interest;
    L.out -= pay - interest;
    s.cash += pay; pl.interest += interest;
    if (L.left <= 0 || L.out < 1) { L.done = true; L.out = 0; }
  }
  s.loans = s.loans.filter(l => !l.dead && !l.done);
  if (defaults) toast(`💥 ${defaults} défaut${defaults > 1 ? 's' : ''} de paiement ce mois-ci`, 'bad');

  migrateProducts(s); reconcile(s);
  pl.depInt = s.depLiv * s.depositRate / 1200; s.depLiv += pl.depInt; s.deposits = s.depCC + s.depLiv;
  const penalty = s.flags.penalty > s.day ? 3 : 0;
  pl.cbInt = s.cbDebt * (cbRate(s) + penalty) / 1200; s.cash -= pl.cbInt;
  pl.costs = monthlyCosts(s); s.cash -= pl.costs;
  const pr = prodRevenue(s); pl.fees = pr.cc + pr.av + pr.carte; pl.prod = pr;
  for (const b of s.branches) pl.fees += dabIncome(b);
  s.cash += pl.fees;
  pl.coupons = holdingValue(s, 'oat') * (s.policyRate + 0.4) / 1200; s.cash += pl.coupons;
  pl.reserves = Math.max(0, s.cash) * Math.max(0, s.policyRate - 1) / 1200; s.cash += pl.reserves;

  const profit = pl.interest + pl.fees + pl.coupons + pl.reserves - pl.depInt - pl.cbInt - pl.costs - pl.losses;
  if (profit > 0) { pl.tax = profit * 0.15; s.cash -= pl.tax; }
  pl.net = profit - pl.tax;
  s.stats.interest += pl.interest;
  if (pl.net > 0) s.stats.profit += pl.net;
  s.lastPL = pl;

  // Satisfaction des agences et réputation
  staffMonth(s); serveMonth(s);
  for (const b of s.branches) b.sat += (satTarget(s, b) - b.sat) * 0.5;
  let dr = (50 - s.reputation) * 0.03 + feeRep(s) + (s.upgrades.app ? 1 : 0) + (avgSat(s) - 50) / 40;
  if (s.surveillance) dr -= 3;
  s.reputation = clamp(s.reputation + dr, 0, 100);

  // Mafia
  if (s.flags.mafia && chance(0.12)) {
    const fine = s.flags.mafia * 2.5 / (s.upgrades.conformite ? 3 : 1);
    s.cash -= fine; s.reputation = clamp(s.reputation - 35, 0, 100); s.flags.mafia = 0;
    log(`🚔 Scandale ! L’argent de la mafia a été découvert. Amende : ${money(fine)}.`, 'bad');
    eventModal('🚔', 'Le scandale éclate !', `<p>La presse a découvert l’argent sale de M. Corleone dans vos coffres. Amende de <b>${money(fine)}</b> et réputation en chute libre.</p>`, [{ label: 'Aïe.' }]);
  }

  // Économie
  s.econTimer--;
  if (!s.nextEcon) s.nextEcon = weighted(econ.next);
  if (s.econTimer <= 0) {
    const old = s.economy;
    s.economy = s.nextEcon; s.nextEcon = null;
    s.econTimer = s.economy === 'crise' ? rint(3, 7) : rint(6, 16);
    if (old === 'crise') { s.stats.crises++; if (s.flags.bigCrisis && !s.flags.bigCrisisDone) { s.flags.bigCrisisDone = true; toast('🌈 Vous avez traversé la Grande Crise !', 'good'); log('🌈 La Grande Crise est terminée. Votre banque a tenu bon.', 'good'); } }
    const E = ECON[s.economy], bad = s.economy === 'crise' || s.economy === 'recession';
    log(`L’économie entre en phase : ${E.label}.`, bad ? 'bad' : 'good');
    toast(`Nouvelle conjoncture : <b>${E.label}</b>`, s.economy === 'crise' ? 'bad' : 'gold');
    if (s.economy === 'crise') { for (const id of ['cac', 'tech', 'oil', 'snail', 'crypto']) s.market[id].price *= rnd(0.75, 0.88); }
  }
  // Taux directeur
  let dRate = 0;
  if (s.economy === 'croissance' && chance(0.4)) dRate = 0.25;
  if (s.economy === 'stable' && chance(0.15)) dRate = pick([-0.25, 0.25]);
  if (s.economy === 'recession' && chance(0.5)) dRate = -0.25;
  if (s.economy === 'crise' && chance(0.6)) dRate = -0.5;
  const newRate = clamp(s.policyRate + dRate, 0, 7);
  dRate = newRate - s.policyRate;
  if (dRate) {
    s.policyRate = newRate;
    s.market.oat.price *= 1 - 0.04 * dRate;
    log(`🏛️ La banque centrale ${dRate > 0 ? 'relève' : 'abaisse'} son taux directeur à ${pct(newRate, 2)}.`);
  }
  s.rateHist.push(s.policyRate); if (s.rateHist.length > 120) s.rateHist.shift();

  updateRivals(s);

  // Régulateur
  const eq = equity(s), ratio = capRatio(s);
  if (eq < 0) {
    if (s.flags.easy && s.day - (s.flags.bailout || -9999) > 1800) {
      const aid = -eq + 500e3; s.cash += aid; s.cbDebt += 0; s.flags.bailout = s.day; s.reputation = clamp(s.reputation - 30, 0, 100);
      s.flags.bailoutCost = (s.flags.bailoutCost || 0) + aid;
      log(`🛟 Mode détente : l’État vous renfloue de ${money(aid)}.`, 'bad');
      eventModal('🛟', 'Sauvé par l’État', `<p class="center">Vos fonds propres sont passés sous zéro, mais le mode détente est activé : l’État injecte <b>${money(aid)}</b>. Réputation -30. Ce sauvetage n’est possible qu’une fois tous les 5 ans.</p>`, [{ label: 'Plus jamais ça' }]);
    } else return gameOver('faillite');
  }
  if (ratio < minRatio(s)) {
    s.lowCap++;
    if (!s.surveillance) log(`⚠️ Ratio de solvabilité sous ${minRatio(s)} % : banque placée sous surveillance.`, 'bad');
    s.surveillance = true;
    toast(`⚠️ Sous surveillance du régulateur (${s.lowCap}/${s.flags.easy ? 12 : 6} mois)`, 'bad');
    if (s.lowCap >= (s.flags.easy ? 12 : 6)) return gameOver('licence');
  } else {
    if (s.surveillance) { log('✅ Le régulateur lève la surveillance.', 'good'); toast('✅ Surveillance levée', 'good'); }
    s.surveillance = false; s.lowCap = 0;
  }

  s.history.push({ d: s.day, eq, cash: s.cash, dep: s.deposits, loans: loansOut(s), net: pl.net });
  if (s.history.length > 360) s.history.shift();
  save();
}

// ---------- Concurrents ----------
function updateRivals(s) {
  const e = ECON[s.economy];
  s.rivals.forEach((r, i) => {
    if (r.gone) return;
    r.eq = Math.max(5e5, r.eq * Math.exp(RIVALS[i].g + e.rival + 0.015 * gauss()));
    r.hist.push(r.eq); if (r.hist.length > 120) r.hist.shift();
  });
  const rk = rankOf(s);
  if (s.flags.lastRank && rk < s.flags.lastRank) {
    const passed = s.rivals.filter(r => !r.gone && r.eq < equity(s)).sort((a, b) => b.eq - a.eq)[0];
    if (passed) { toast(`📊 Vous dépassez <b>${RIVALS.find(x => x.id === passed.id).name}</b> : ${rk}ᵉ du classement !`, 'good'); log(`📊 Vous passez ${rk}ᵉ du classement.`, 'good'); }
  }
  s.flags.lastRank = rk;
}

// ---------- Campagne ----------
function chapterDone(s, ch) { return ch.goals.every(g => g.cur(s) >= g.goal); }
function checkChapter(s) {
  const ch = CHAPTERS[s.chapter];
  if (!ch || !chapterDone(s, ch)) return;
  s.chapter++;
  if (s.chapter === 7 && !s.flags.bigCrisis) s.flags.bigCrisisPending = true;
  s.cash += ch.reward;
  log(`🏁 Chapitre terminé : ${ch.name} (+${money(ch.reward)})`, 'good');
  const unl = Object.values(REGIONS).filter(r => r.unlock === s.chapter).map(r => r.name);
  const next = CHAPTERS[s.chapter];
  SFX.play('level'); confetti(140);
  eventModal('🏁', `Chapitre ${s.chapter} terminé !`, `<p class="center"><b>${ch.name}</b> : mission accomplie.</p>
    ${ch.reward ? `<div class="reward">Récompense <b>+${money(ch.reward)}</b></div>` : ''}
    ${unl.length ? `<p class="center">🌍 Nouvelle${unl.length > 1 ? 's' : ''} région${unl.length > 1 ? 's' : ''} ouverte${unl.length > 1 ? 's' : ''} : <b>${unl.join(', ')}</b></p>` : ''}
    ${s.chapter === 4 ? '<p class="center">🏛️ Les <b>États</b> peuvent maintenant vous demander des prêts.</p>' : ''}
    ${next ? `<p class="center muted">Prochain chapitre : <b>${next.name}</b></p>` : '<p class="center">🏆 Vous avez terminé la campagne. Vous êtes une légende de la finance !</p>'}`, [{ label: 'Continuer' }]);
}

// ---------- Défis chronométrés ----------
function updateChallenge(s) {
  const c = s.challenge;
  if (c) {
    const T = CHALLENGES[c.tpl];
    if (T.cur(s, c) >= c.goal) {
      s.cash += c.reward; s.reputation = clamp(s.reputation + 3, 0, 100); s.stats.challenges++;
      log(`⏱️ Défi réussi : ${T.txt(c)} (+${money(c.reward)})`, 'good');
      toast(`⏱️ Défi réussi ! <b>+${money(c.reward)}</b>`, 'good');
      s.challenge = null; s.nextChallenge = s.day + rint(60, 120);
    } else if (s.day >= c.until) {
      log(`⏱️ Défi raté : ${T.txt(c)}`, 'bad'); toast('⏱️ Temps écoulé : défi raté', 'bad');
      s.challenge = null; s.nextChallenge = s.day + rint(60, 120);
    }
  } else if (s.day >= s.nextChallenge) {
    const pool = Object.keys(CHALLENGES).filter(k => !CHALLENGES[k].cond || CHALLENGES[k].cond(s));
    const tpl = pick(pool), m = CHALLENGES[tpl].make(s);
    s.challenge = { tpl, goal: m.goal, base: m.base, until: s.day + m.days, days: m.days, reward: Math.round(Math.max(50e3, equity(s) * 0.04) / 1e3) * 1e3 };
    toast(`⏱️ Nouveau défi : <b>${CHALLENGES[tpl].txt(s.challenge)}</b> en ${m.days} jours`, 'gold');
  }
}

// ---------- Succès ----------
function checkAchievements(s) {
  for (const id in ACHS) {
    if (!s.achievements[id] && ACHS[id].t(s)) {
      s.achievements[id] = s.day || 1;
      toast(`🏆 Succès débloqué : <b>${ACHS[id].icon} ${ACHS[id].name}</b>`, 'gold');
      log(`🏆 Succès : ${ACHS[id].name}`, 'good');
    }
  }
}

// ---------- Fin de partie ----------
function score(s) { return Math.max(0, equity(s)) + s.fortune; }
function gameOver(reason) {
  const s = S; s.over = true;
  const msgs = {
    faillite: ['💀', 'Faillite !', 'Vos fonds propres sont passés sous zéro. Les huissiers saisissent même la plante verte de l’accueil.'],
    licence: ['🚫', 'Licence retirée', 'Après 6 mois sous le ratio minimum, le régulateur vous retire votre licence bancaire.'],
    vente: ['🏝️', 'Vendu !', 'Vous avez vendu votre banque et sirotez un cocktail aux Bahamas. Bien joué.'],
    retraite: ['🎣', 'Retraite', 'Vous transmettez la banque et partez pêcher la truite en Ardèche.'],
  };
  const [icon, title, text] = msgs[reason];
  const sc = score(s);
  const best = loadBest();
  best.push({ name: s.name, score: sc, months: Math.floor(s.day / 30), reason: title, chapter: s.chapter, date: new Date().toLocaleDateString('fr-FR') });
  best.sort((a, b) => b.score - a.score);
  try { localStorage.setItem(BEST_KEY, JSON.stringify(best.slice(0, 8))); localStorage.removeItem(SAVE_KEY); } catch (e) { }
  ui.modal = true;
  SFX.play(reason === 'faillite' || reason === 'licence' ? 'bad' : 'level');
  showModal(`<div class="m-ico">${icon}</div><h2>${title}</h2><p class="center">${text}</p>
    <table>
      <tr><td>Durée</td><td class="r">${Math.floor(s.day / 30)} mois</td></tr>
      <tr><td>Chapitre atteint</td><td class="r">${Math.min(s.chapter + 1, CHAPTERS.length)} / ${CHAPTERS.length}</td></tr>
      <tr><td>Agences</td><td class="r">${s.branches.length}</td></tr>
      <tr><td>Fonds propres finaux</td><td class="r">${money(equity(s))}</td></tr>
      <tr><td>Fortune personnelle</td><td class="r">${money(s.fortune)}</td></tr>
      <tr><td>Succès</td><td class="r">${Object.keys(s.achievements).length} / ${Object.keys(ACHS).length}</td></tr>
      <tr class="total"><td>Score</td><td class="r gold-t">${money(sc)}</td></tr>
    </table>
    <div class="choices"><button class="btn primary" data-act="toStart">Nouvelle partie</button></div>`);
}
