'use strict';
/* =====================================================================
   BANQUE TYCOON — actions du joueur, tutoriel et démarrage
   ===================================================================== */

// ---------- Modales ----------
function showModal(html, noClose) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-box">${html}</div>`;
  m.hidden = false;
  m.dataset.noclose = noClose ? '1' : '';
}
function closeModal(force) {
  if (S && S.over && !force) return;
  $('#modal').hidden = true; ui.modal = false;
}
const confirmBox = (icon, title, text, act, label, id = '') => { ui.modal = true; showModal(`<div class="m-ico">${icon}</div><h2>${title}</h2><p class="center">${text}</p><div class="choices"><button class="btn danger" data-act="${act}" data-id="${id}">${label}</button><button class="btn" data-act="closeModal">Annuler</button></div>`); };

// ---------- Actions ----------
const actions = {
  tab: el => { ui.tab = el.dataset.tab; if (S.newTabs) S.newTabs = S.newTabs.filter(t => t !== ui.tab); renderTabs(); renderPanel(true); $('#panel').scrollTop = 0; },
  offer: (el, ev) => {
    const r = S.requests.find(x => x.id == el.dataset.id); if (!r) return;
    if (S.surveillance) return toast('⚠️ Sous surveillance : prêts interdits', 'bad');
    if (S.cash < r.amount) return toast('Liquidités insuffisantes ! Empruntez à la banque centrale ou attirez des dépôts.', 'bad');
    S.requests = S.requests.filter(x => x !== r); S.flags.offered = true;
    if (chance(acceptProb(r))) { grantLoan(S, r); toast(`✅ ${esc(r.name)} accepte votre offre à ${pct(r.offer)} !`, 'good'); floatMoney(-r.amount, ev.clientX, ev.clientY); }
    else { S.stats.refused++; toast(`❌ ${esc(r.name)} trouve votre taux trop élevé et part chez le concurrent.`, 'bad'); log(`❌ ${r.name} refuse votre offre à ${pct(r.offer)}.`); }
    renderPanel(true);
  },
  reject: el => { S.requests = S.requests.filter(x => x.id != el.dataset.id); S.stats.refused++; renderPanel(true); },
  fees: el => { S.fees = el.dataset.v; renderPanel(true); },
  auto: el => { S.auto.on = el.dataset.v === 'on'; renderPanel(true); },
  autoMin: el => { S.auto.min = el.dataset.v; renderPanel(true); },
  autoMargin: el => { S.auto.margin = +el.dataset.v; renderPanel(true); },
  selAsset: el => { ui.market = el.dataset.id; renderPanel(true); },
  tradeAmt: el => { ui.tradeAmt = +el.dataset.v; renderPanel(true); },
  buy: (el, ev) => {
    const id = ui.market, a = ASSETS[id];
    if (a.need && !S.upgrades[a.need]) return toast('Nécessite la salle des marchés', 'bad');
    if (S.surveillance) return toast('⚠️ Sous surveillance : achats interdits', 'bad');
    const amt = ui.tradeAmt, fee = amt * tradeFee();
    if (S.cash < amt + fee) return toast('Liquidités insuffisantes', 'bad');
    S.cost[id] = (S.cost[id] || 0) + amt + fee;
    S.portfolio[id] = (S.portfolio[id] || 0) + amt / S.market[id].price;
    S.cash -= amt + fee; SFX.play('coin');
    floatMoney(-(amt + fee), ev.clientX, ev.clientY);
    renderPanel(true);
  },
  sell: (el, ev) => {
    const id = ui.market, frac = +el.dataset.f;
    const q = (S.portfolio[id] || 0) * frac; if (q <= 0) return;
    const val = q * S.market[id].price, fee = val * tradeFee();
    S.cost[id] = (S.cost[id] || 0) * (1 - frac);
    S.portfolio[id] -= q; if (S.portfolio[id] < 1e-9) { delete S.portfolio[id]; delete S.cost[id]; }
    S.cash += val - fee; SFX.play('coin');
    floatMoney(val - fee, ev.clientX, ev.clientY);
    renderPanel(true);
  },
  region: el => { ui.region = el.dataset.v; ui.city = null; renderPanel(true); },
  selCity: el => { ui.city = el.dataset.id; renderPanel(true); const c = $('.item.sel'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); },
  branch: el => {
    const id = el.dataset.id, c = CITIES[id];
    if (getBranch(S, id) || !regionUnlocked(S, c.region)) return;
    if (S.cash < c.cost) return toast('Liquidités insuffisantes', 'bad');
    S.cash -= c.cost; S.branches.push(newBranch(id));
    SFX.play('level'); confetti();
    log(`🏢 Nouvelle agence ouverte : ${c.name} !`, 'good'); toast(`🏢 Agence de ${c.name} inaugurée ! Équipez-la dans « Ma banque ».`, 'good');
    renderPanel(true);
  },
  goBranch: el => { ui.branch = el.dataset.id; ui.tab = 'plan'; renderTabs(); renderPanel(true); },
  selBranch: el => { ui.branch = el.dataset.id; renderPanel(true); },
  build: el => { if (doBuild(el.dataset.k)) renderPlanSide(); },
  closeBranch: el => confirmBox('🔒', `Fermer ${CITIES[el.dataset.id].name} ?`, 'Les clients partiront chez vos concurrents (-3 réputation) et l’aménagement sera perdu.', 'doCloseBranch', 'Fermer l’agence', el.dataset.id),
  doCloseBranch: el => {
    const id = el.dataset.id; S.branches = S.branches.filter(b => b.id !== id);
    S.reputation = clamp(S.reputation - 3, 0, 100); ui.branch = HQ;
    log(`🔒 Agence de ${CITIES[id].name} fermée.`); closeModal(); renderPanel(true);
  },
  upgrade: el => {
    const u = UPGRADES[el.dataset.id];
    if (S.cash < u.cost) return toast('Liquidités insuffisantes', 'bad');
    S.cash -= u.cost; S.upgrades[el.dataset.id] = true; SFX.play('build');
    log(`${u.icon} ${u.name} installé(e).`, 'good'); toast(`${u.icon} ${u.name} : c’est parti !`, 'good');
    renderPanel(true);
  },
  cancelUp: el => { delete S.upgrades[el.dataset.id]; log(`${UPGRADES[el.dataset.id].icon} ${UPGRADES[el.dataset.id].name} résilié(e).`); renderPanel(true); },
  borrow: el => {
    const amt = Math.min(+el.dataset.v, cbLimit(S) - S.cbDebt);
    if (amt <= 0) return toast('Plafond de garanties atteint', 'bad');
    S.cbDebt += amt; S.cash += amt; SFX.play('coin'); renderPanel(true);
  },
  repay: el => {
    let amt = el.dataset.v === 'all' ? S.cbDebt : +el.dataset.v;
    amt = Math.min(amt, S.cbDebt, S.cash); if (amt <= 0) return;
    S.cbDebt -= amt; S.cash -= amt; if (S.cbDebt < 1) S.cbDebt = 0; renderPanel(true);
  },
  bonus: el => {
    const amt = equity(S) * +el.dataset.f;
    if (S.surveillance) return toast('⚠️ Interdit sous surveillance du régulateur', 'bad');
    if (amt <= 0 || S.cash < amt) return toast('Liquidités insuffisantes', 'bad');
    S.cash -= amt; S.fortune += amt * 0.7; S.stats.bonus += amt; SFX.play('coin');
    if (+el.dataset.f >= 0.05) { S.reputation = clamp(S.reputation - 8, 0, 100); toast('📰 « Scandale des bonus ! » titre la presse. Réputation -8', 'bad'); }
    log(`😎 Vous vous versez un bonus de ${money(amt)} (${money(amt * 0.7)} après impôts).`);
    renderPanel(true);
  },
  lux: el => {
    const l = LUXURY[el.dataset.id];
    if (S.fortune < l.cost) return toast('Fortune personnelle insuffisante', 'bad');
    S.fortune -= l.cost; S.owned.push(el.dataset.id);
    toast(`${l.icon} Vous possédez maintenant : ${l.name} !`, 'gold'); log(`${l.icon} Achat perso : ${l.name}.`);
    renderPanel(true);
  },
  retire: () => { closeModal(); gameOver('retraite'); },
  confirmRetire: () => confirmBox('🎣', 'Prendre sa retraite ?', 'La partie se termine et votre score est enregistré (fonds propres + fortune personnelle).', 'retire', 'Oui, je raccroche'),
  choice: el => {
    const c = ui.event.choices[+el.dataset.i];
    closeModal();
    const res = c.fn ? c.fn(S) : null;
    S.reputation = clamp(S.reputation, 0, 100);
    if (res) { toast(res, 'gold'); log(res); }
    ui.dirty = true; renderPanel(true);
  },
  closeModal: () => closeModal(),
  toggleMore: el => { ui.openMore = !el.parentNode.open; },
  menu: () => {
    ui.modal = true;
    showModal(`<div class="m-ico">☰</div><h2>Pause</h2><p class="center muted">Le temps est arrêté tant que ce menu est ouvert.</p><div class="choices">
      <button class="btn primary" data-act="closeModal">Reprendre</button>
      <button class="btn" data-act="help">Comment jouer</button>
      <button class="btn" data-act="saveNow">Sauvegarder</button>
      <button class="btn" data-act="tutRestart">Revoir le tutoriel</button>
      <button class="btn" data-act="confirmRetire">Prendre sa retraite (terminer)</button>
      <button class="btn ghost" data-act="toStart">Retour à l’accueil</button></div>`);
  },
  saveNow: () => { save(); closeModal(); toast('💾 Partie sauvegardée', 'good'); },
  toStart: () => { save(); closeModal(true); S = null; showStart(); },
  help: () => { ui.modal = true; showModal(HELP); },
  mute: () => { prefs.mute = !prefs.mute; savePrefs(); $('#muteBtn').innerHTML = ic(prefs.mute ? 'mute' : 'vol'); if (!prefs.mute) SFX.play('click'); },
  continue: () => { const s = loadSave(); if (s) startGame(s); },
  newGame: () => {
    if (loadSave()) return confirmBox('⚠️', 'Écraser la partie en cours ?', 'Votre partie sauvegardée sera perdue.', 'newGameForce', 'Nouvelle partie');
    actions.newGameForce();
  },
  newGameForce: () => {
    closeModal(true);
    const name = $('#bankName').value.trim() || randomBankName();
    S = null; const s = newState(name); S = s;
    s.requests.push(makeRequest(s, 'auto'));
    startGame(s);
    setTimeout(() => { ui.modal = true; showModal(WELCOME()); }, 200);
  },
  randName: () => { $('#bankName').value = randomBankName(); },
  tutNext: () => { S.tut++; updateCoach(true); },
  tutSkip: () => { S.tut = -1; updateCoach(true); },
  tutRestart: () => { S.tut = 0; closeModal(); updateCoach(true); },
};

function randomBankName() {
  return pick(['Banque', 'Crédit', 'Caisse', 'Comptoir', 'Société Financière']) + ' ' +
    pick(['du Lapin d’Or', 'des Escargots Réunis', 'de la Baguette', 'Mutuel du Camembert', 'des Pigeons Voyageurs', 'Galactique', 'du Petit Cochon', 'de la Lune', 'des Licornes', 'du Croissant']);
}

// ---------- Confettis ----------
function confetti(n = 90) {
  const cols = ['#6366f1', '#818cf8', '#f4c25b', '#34d399', '#f472b6', '#60a5fa'];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i');
    el.className = 'confetti';
    el.style.cssText = `left:${rnd(0, 100)}vw;background:${pick(cols)};--dx:${rnd(-120, 120)}px;--r:${rint(-720, 720)}deg;animation-duration:${rnd(1.6, 3)}s;animation-delay:${rnd(0, 0.4)}s;width:${rint(6, 10)}px;height:${rint(8, 14)}px`;
    document.body.appendChild(el); setTimeout(() => el.remove(), 3600);
  }
}

// ---------- Tutoriel ----------
const TUTO = [
  { tab: 'plan', txt: 'Bienvenue, PDG ! Votre siège est à <b>Montpellier</b>. Ouvrez <b>Ma banque</b> pour voir le plan de votre agence.', done: () => ui.tab === 'plan' },
  { tab: 'plan', txt: 'Un guichet est <b>fermé</b> faute de personnel. Cliquez dessus pour <b>embaucher un guichetier</b> : plus de guichetiers = plus de dépôts.', done: s => getBranch(s, HQ).gs >= 2 },
  { tab: 'loans', txt: 'Parfait ! Les dépôts servent à prêter. Ouvrez l’onglet <b>Prêts</b> : un client vous attend.', done: () => ui.tab === 'loans' },
  { tab: 'loans', txt: 'Réglez le <b>taux</b> avec le curseur puis cliquez sur <b>Proposer</b>. Taux élevé = plus de gains, mais le client peut refuser.', done: s => s.flags.offered },
  { tab: 'missions', txt: 'Bravo ! Vos objectifs sont dans <b>Missions</b>. Terminez les chapitres pour ouvrir des agences en France, puis dans le monde entier.', done: () => ui.tab === 'missions' },
  { tab: null, txt: 'Dernier conseil : gardez toujours des <b>liquidités</b> et surveillez votre <b>ratio de solvabilité</b> (8 % minimum). Bonne chance !', btn: 'C’est parti' },
];
function updateCoach(force) {
  const s = S, el = $('#coach');
  if (!s || s.tut < 0 || s.tut >= TUTO.length) { el.hidden = true; if (ui.coachTab) { ui.coachTab = null; renderTabs(); } return; }
  const st = TUTO[s.tut];
  if (st.done && st.done(s)) { s.tut++; SFX.play('click'); if (s.tut === 3 && !s.requests.some(r => r.type !== 'souv')) s.requests.push(makeRequest(s, 'auto')); return updateCoach(true); }
  if (ui.coachTab !== st.tab) { ui.coachTab = st.tab; renderTabs(); }
  if (!force && el.dataset.step == s.tut && !el.hidden) return;
  el.dataset.step = s.tut; el.hidden = false;
  el.innerHTML = `<div class="coach-h"><span class="coach-av">🧑‍💼</span><div><b>Gisèle, votre directrice adjointe</b><small>Étape ${s.tut + 1} / ${TUTO.length}</small></div></div>
    <p>${st.txt}</p><div class="row">${st.btn ? `<button class="btn sm primary" data-act="tutNext">${st.btn}</button>` : ''}<button class="btn sm ghost" data-act="tutSkip">Passer le tutoriel</button></div>`;
}

// ---------- Textes ----------
const HELP = `<div class="m-ico">📘</div><h2>Comment jouer</h2>
<ul>
<li>🎯 <b>But</b> : terminer les 8 chapitres de la campagne, d’une petite agence à Montpellier jusqu’à une banque interplanétaire.</li>
<li>🏦 <b>Ma banque</b> : construisez des guichets, embauchez des guichetiers et des conseillers, installez des distributeurs. C’est ce qui attire les dépôts et les demandes de prêt.</li>
<li>💰 <b>Dépôts</b> : rémunérez vos clients assez pour les attirer.</li>
<li>🤝 <b>Prêts</b> : prêtez plus cher que vous n’empruntez. Les mauvais payeurs (D/E) font souvent défaut.</li>
<li>🌍 <b>Monde</b> : ouvrez des agences. Chaque chapitre terminé débloque de nouvelles régions.</li>
<li>⏱️ <b>Défis</b> : des objectifs chronométrés apparaissent régulièrement, avec une récompense.</li>
<li>📊 <b>Classement</b> : dépassez les géants de la finance.</li>
<li>⚖️ <b>Ratio de solvabilité</b> : fonds propres ÷ actifs risqués. Sous 8 %, le régulateur vous surveille ; 6 mois d’affilée et c’est la fin.</li>
<li>⏸️ <b>Échap</b> ouvre le menu et met le jeu en pause. Sauvegarde automatique chaque mois.</li>
</ul><div class="choices"><button class="btn primary" data-act="closeModal">Compris</button></div>`;
const WELCOME = () => `<div class="m-ico">🎉</div><h2>Bienvenue, PDG !</h2>
<p class="center"><b>${esc(S.name)}</b> ouvre ses portes à <b>Montpellier</b> avec <b>${money(equity(S))}</b> de capital et <b>${money(S.deposits)}</b> de dépôts.</p>
<p class="center muted">Votre directrice adjointe va vous montrer les bases. Votre objectif : ouvrir des agences partout dans le monde… et au-delà.</p>
<div class="choices"><button class="btn primary" data-act="closeModal">Ouvrir les portes</button></div>`;

// ---------- Démarrage ----------
function showStart() {
  $('#game').hidden = true; $('#start').hidden = false; $('#coach').hidden = true;
  const sv = loadSave();
  $('#continueBox').hidden = !sv;
  if (sv) $('#continueInfo').textContent = `${sv.name} — ${dateStr(sv.day)} · chapitre ${sv.chapter + 1}`;
  if (!$('#bankName').value) $('#bankName').value = randomBankName();
  const best = loadBest();
  $('#leaderboard').innerHTML = best.length ? `<div class="card"><header class="card-h"><h3>Meilleurs scores</h3></header>${bestTable(best)}</div>` : '';
}
function startGame(state) {
  S = state; ui.acc = 0; ui.tab = 'dash'; ui.branch = HQ; ui.region = 'france'; ui.seen = new Set();
  floorReset(null);
  $('#start').hidden = true; $('#game').hidden = false;
  $('#muteBtn').innerHTML = ic(prefs.mute ? 'mute' : 'vol');
  checkUnlocks(S, true);
  renderTabs(); renderTop(); renderPanel(true); nextNews(); updateCoach(true);
}

// ---------- Événements du navigateur ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && !el.disabled && actions[el.dataset.act]) { actions[el.dataset.act](el, e); if (S && !$('#game').hidden) renderTop(); return; }
  if (e.target.id === 'modal' && !$('#modal').dataset.noclose) closeModal();
});
document.addEventListener('input', e => {
  const el = e.target; if (!S) return;
  if (el.dataset.input === 'rate') {
    const r = S.requests.find(x => x.id == el.dataset.id); if (!r) return;
    r.offer = +el.value;
    const card = el.closest('.req'), p = acceptProb(r);
    card.querySelector('[data-o=rate]').textContent = pct(r.offer);
    const pe = card.querySelector('[data-o=p]'); pe.textContent = Math.round(p * 100) + ' %'; pe.className = p > 0.6 ? 'pos' : p < 0.3 ? 'neg' : 'warn';
    card.querySelector('[data-o=pmt]').textContent = money(payment(r.amount, r.offer, r.dur));
    card.querySelector('[data-o=bar]').style.width = p * 100 + '%';
  }
  if (el.dataset.input === 'drate') { S.depositRate = +el.value; $('[data-o=drate]').textContent = pct(S.depositRate, 2); }
});
document.addEventListener('pointerdown', () => { ui.pointerDown = true; });
document.addEventListener('pointerup', () => { ui.pointerDown = false; });
document.addEventListener('pointercancel', () => { ui.pointerDown = false; });
document.addEventListener('keydown', e => {
  if (!S || e.target.matches('input')) return;
  if (e.key === 'Escape') { if (ui.modal && !$('#modal').dataset.noclose) closeModal(); else if (!ui.modal) actions.menu(); }
});
$('#tickerText').addEventListener('animationiteration', nextNews);
window.addEventListener('beforeunload', save);
window.addEventListener('resize', () => S && drawCharts());

// Boucle principale : 10 fois par seconde, 1 jour par seconde (vitesse unique)
let lastRender = 0;
setInterval(() => {
  if (!S || S.over) return;
  if (!ui.modal && !document.hidden) {
    ui.acc += 0.1;
    while (ui.acc >= 1 && !S.over && !ui.modal) { ui.acc--; tickDay(); }
  }
  if (S.over) return;
  renderTop();
  updateCoach();
  const now = Date.now();
  if (ui.dirty && now - lastRender > 500) { lastRender = now; renderPanel(); }
}, 100);

showStart();
