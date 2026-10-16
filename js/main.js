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
    if (endet(r) > 0.35) return toast('🚫 Endettement au-delà de 35 % : la règle du HCSF vous interdit ce prêt. Baissez le taux ou refusez le dossier.', 'bad');
    S.requests = S.requests.filter(x => x !== r); S.flags.offered = true;
    if (chance(acceptProb(r))) { grantLoan(S, r); toast(`✅ ${esc(r.name)} accepte votre offre à ${pct(r.offer)} !`, 'good'); floatMoney(-r.amount, ev.clientX, ev.clientY); }
    else { S.stats.refused++; toast(`❌ ${esc(r.name)} trouve votre taux trop élevé et part chez le concurrent.`, 'bad'); log(`❌ ${r.name} refuse votre offre à ${pct(r.offer)}.`); }
    renderPanel(true);
  },
  reject: el => { S.requests = S.requests.filter(x => x.id != el.dataset.id); S.stats.refused++; renderPanel(true); },
  launch: el => {
    const k = el.dataset.p; migrateProducts(S); S.prod[k].on = true;
    SFX.play('level'); confetti(40); toast(`${PRODUCTS[k].icon} <b>${PRODUCTS[k].name}</b> lancé !`, 'good'); log(`${PRODUCTS[k].icon} Lancement : ${PRODUCTS[k].name}.`, 'good');
    renderPanel(true);
  },
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
  selBranch: el => { ui.branch = el.dataset.id; floor.drag = null; renderPanel(true); },
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
  fiche: el => openFiche(el.dataset.id),
  clAct: el => clientAction(el.dataset.id, el.dataset.k),
  clFilter: el => { ui.clFilter = el.dataset.v; ui.clPage = 0; renderPanel(true); },
  clSort: el => { ui.clSort = el.dataset.v; renderPanel(true); },
  clPage: el => { ui.clPage = +el.dataset.v; renderPanel(true); $('#panel').scrollTop = 0; },
  nextDay: () => nextDay(),
  delegate: () => { const n = delegateRest(S); if (n) toast(`👥 Votre équipe a reçu ${n} client${n > 1 ? 's' : ''}`, 'good'); renderTop(); renderPanel(true); },
  card: el => {
    const c = S.today && S.today.cards.find(x => x.id == el.dataset.id); if (!c || c.done) return;
    const before = { ...S.today.tally }, art = el.closest('.ccard');
    const res = resolveCard(S, c, el.dataset.c, true);
    const bad = res && (res.startsWith('😱') || res.startsWith('😬'));
    if (res) toast(res, bad ? 'bad' : 'gold');
    if (bad) shake();
    funCard(S, c, before, el);
    SFX.play('click'); renderTop();
    if (art && !reduceMotion()) { art.classList.add('gone'); setTimeout(() => renderPanel(true), 230); } else renderPanel(true);
  },
  cardLoan: el => { const c = S.today.cards.find(x => x.id == el.dataset.id); const before = c && { ...S.today.tally }; if (c && offerLoanCard(S, c)) { funCard(S, c, before, el); renderTop(); renderPanel(true); } },
  cardVerify: el => { const c = S.today.cards.find(x => x.id == el.dataset.id); if (!c) return; verifyRequest(c.req.id, c.req); if (c.req.fraud && c.req.checked) { c.done = true; S.today.done++; } renderPanel(true); },
  cardDefer: el => { const c = S.today.cards.find(x => x.id == el.dataset.id); if (!c) return; c.req.expires = S.day + 20; S.requests.push(c.req); c.done = true; S.today.done++; toast('📁 Dossier rangé dans l’onglet Prêts (20 jours pour décider)', 'gold'); renderPanel(true); },
  spec: el => {
    const b = getBranch(S, ui.branch), v = el.dataset.v; if ((b.spec || 'aucune') === v) return;
    const cost = Math.round(cityOf(b).build * 0.2 / 1e3) * 1e3;
    if (S.cash < cost) return toast('Liquidités insuffisantes', 'bad');
    S.cash -= cost; b.spec = v; SFX.play('build');
    toast(`${SPECS[v].icon} ${CITIES[b.id].name} devient une agence « ${SPECS[v].name} »`, 'good'); log(`${SPECS[v].icon} ${CITIES[b.id].name} se spécialise : ${SPECS[v].name}.`);
    renderPlanSide();
  },
  tip: el => showTip(el.dataset.k),
  settings: () => openSettings(),
  setPref: el => setPref(el.dataset.k, el.dataset.v),
  verify: el => { verifyRequest(el.dataset.id); renderPanel(true); },
  buyout: el => { const R = RIVALS.find(x => x.id === el.dataset.id), r = S.rivals.find(x => x.id === el.dataset.id); confirmBox('🦈', `Racheter ${R.name} ?`, `Prix : <b>${money(buyoutPrice(r))}</b>. Vous récupérez ses clients et jusqu’à deux de ses agences.`, 'doBuyout', 'Racheter', el.dataset.id); },
  doBuyout: el => { closeModal(); buyoutRival(el.dataset.id); renderPanel(true); },
  editPlan: () => { ui.editPlan = !ui.editPlan; floor.drag = null; floor.editHover = null; renderPanel(true); },
  theme: el => {
    const b = getBranch(S, ui.branch); b.theme = { ...themeOf(b), [el.dataset.g]: el.dataset.v };
    SFX.play('click'); renderPlanSide();
  },
  themeAll: () => { const t = themeOf(getBranch(S, ui.branch)); for (const x of S.branches) x.theme = { ...t }; toast('🎨 Style appliqué à toutes vos agences', 'good'); },
  resetLayout: () => { const b = getBranch(S, ui.branch); if (b.pos) delete b.pos[b.size]; floor.agents = []; floor.busy = {}; toast('Disposition d’origine rétablie', 'good'); },
  pickCand: el => {
    const c = ui.cands && ui.cands[+el.dataset.i]; if (!c) return;
    closeModal();
    if (doBuild(c.role, c)) { ui.emp = c.id; renderPlanSide(); }
  },
  promote: el => { promoteEmp(el.dataset.id); renderPlanSide(); },
  train: el => { trainEmp(el.dataset.id); renderPlanSide(); },
  selEmp: el => { ui.emp = ui.emp == el.dataset.id ? null : +el.dataset.id; renderPlanSide(); },
  fire: el => { const [, e] = findEmp(el.dataset.id); if (e) confirmBox('📦', `Licencier ${esc(e.name)} ?`, 'Ses clients regretteront son départ (-1 réputation).', 'doFire', 'Licencier', e.id); },
  doFire: el => { fireEmp(el.dataset.id); closeModal(); renderPlanSide(); },
  toggleMore: el => { ui.openMore = !el.parentNode.open; },
  menu: () => {
    ui.modal = true;
    showModal(`<div class="m-ico">☰</div><h2>Pause</h2><p class="center muted">Le temps est arrêté tant que ce menu est ouvert.</p><div class="choices">
      <button class="btn primary" data-act="closeModal">Reprendre</button>
      <button class="btn" data-act="help">Comment jouer</button>
      <button class="btn" data-act="settings">Options et accessibilité</button>
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
    startDay(s);
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

// ---------- Recrutement ----------
function showCandidates(role) {
  const b = getBranch(S, ui.branch);
  ui.cands = makeCandidates(role); ui.modal = true;
  const cards = ui.cands.map((e, i) => {
    const cost = hireCost(b, e), T = TRAITS[e.trait];
    return `<button class="cand" data-act="pickCand" data-i="${i}" ${S.cash < cost ? 'disabled' : ''}>
      ${avatar(e, 64)}<b>${esc(e.name)}</b><small>${empTitle(e)}</small><span class="stars">${stars(e.lvl)}</span>
      <span class="trait" title="${esc(T.desc)}">${T.icon} ${T.name}</span><small class="muted">${T.desc}</small>
      <span class="cand-foot"><small>Salaire ${money(empWage(S, b, e))}/mois</small><b>${money(cost)}</b></span></button>`;
  }).join('');
  showModal(`<h2>Recruter : ${STAFF_ROLES[role].toLowerCase()}</h2><p class="center muted">Trois candidats se présentent à ${CITIES[b.id].name}. Les plus expérimentés coûtent plus cher, mais travaillent mieux.</p>
    <div class="cands">${cards}</div><div class="choices"><button class="btn ghost" data-act="closeModal">Annuler</button></div>`);
  $('#modal .modal-box').classList.add('wide');
}

// ---------- Confettis ----------
function confetti(n = 90) {
  if (reduceMotion()) return;
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
  { tab: 'plan', txt: 'Bienvenue, PDG ! Votre agence de <b>Montpellier</b> est vide. Ouvrez <b>Ma banque</b> et construisez un <b>guichet</b>.', done: s => getBranch(s, HQ).g >= 1 },
  { tab: 'plan', txt: 'Recrutez maintenant un <b>guichetier</b> : c’est lui qui accueillera vos clients. Choisissez bien parmi les candidats.', done: s => getBranch(s, HQ).gs >= 1 },
  { tab: 'dash', txt: 'Tout est prêt ! Ouvrez <b>Aujourd’hui</b> et cliquez sur <b>Jour suivant</b> pour ouvrir vos portes.', done: s => s.today && s.today.cards.length > 0 },
  { tab: 'dash', txt: 'Vos premiers clients sont là ! Ouvrez-leur un <b>compte</b> : leur argent rejoint vos caisses. Attention aux clients louches…', done: s => s.clients >= 3 },
  { tab: 'dash', txt: 'Quand tout le monde est reçu, cliquez sur <b>Jour suivant</b>. Les clients que vous ne recevez pas seront traités par votre équipe, moins bien que vous.', done: s => s.day >= 3 },
  { tab: 'missions', txt: 'Objectif : <b>50 comptes</b> et <b>200 000 €</b> déposés. Ensuite, vous pourrez prêter cet argent : c’est là que la banque gagne vraiment sa vie.', btn: 'C’est parti' },
];
function updateCoach(force) {
  const s = S, el = $('#coach');
  if (!s || s.tut < 0 || s.tut >= TUTO.length) { el.hidden = true; if (ui.coachTab) { ui.coachTab = null; renderTabs(); } return; }
  const st = TUTO[s.tut];
  if (st.done && st.done(s)) { s.tut++; SFX.play('click'); return updateCoach(true); }
  if (ui.coachTab !== st.tab) { ui.coachTab = st.tab; renderTabs(); }
  if (!force && el.dataset.step == s.tut && !el.hidden) return;
  el.dataset.step = s.tut; el.hidden = false;
  el.innerHTML = `<div class="coach-h"><span class="coach-av">🧑‍💼</span><div><b>Gisèle, votre directrice adjointe</b><small>Étape ${s.tut + 1} / ${TUTO.length}</small></div></div>
    <p>${st.txt}</p><div class="row">${st.btn ? `<button class="btn sm primary" data-act="tutNext">${st.btn}</button>` : ''}<button class="btn sm ghost" data-act="tutSkip">Passer le tutoriel</button></div>`;
}

// ---------- Textes ----------
const HELP = `<div class="m-ico">📘</div><h2>Comment jouer</h2>
<ul>
<li>🎯 <b>But</b> : terminer les 8 chapitres, d’une agence vide à Montpellier jusqu’à la première banque interplanétaire.</li>
<li>🏦 <b>Ma banque</b> : installez des bureaux, des guichets et des distributeurs, recrutez et formez votre équipe. Chaque jour, des clients viennent : s’il n’y a pas assez de monde pour les servir, ils repartent et vous perdez de l’argent.</li>
<li>🤝 <b>Prêts</b> : vos conseillers reçoivent les demandes. Choisissez le taux, et faites vérifier (🔎) les dossiers douteux : certains sont des escrocs.</li>
<li>💳 <b>Produits</b> : comptes courants, livrets, assurance-vie et cartes attirent l’argent des clients et rapportent des frais.</li>
<li>🌍 <b>Monde</b> : chaque chapitre terminé ouvre de nouvelles régions.</li>
<li>📊 <b>Classement</b> : les concurrents s’installent près de vous, lancent des guerres des taux, débauchent vos employés… et vous pouvez les racheter.</li>
<li>⚖️ <b>Ratio de solvabilité</b> : gardez au moins 8 % de fonds propres face à vos risques, sinon le régulateur intervient.</li>
<li>❓ Les petits <b>?</b> expliquent chaque terme. <b>⚙️ Options</b> : taille du texte, animations réduites, contraste, mode daltonien et mode détente.</li>
<li>⏸️ <b>Échap</b> ouvre le menu et met le jeu en pause. Sauvegarde automatique chaque mois.</li>
</ul><div class="choices"><button class="btn primary" data-act="closeModal">Compris</button></div>`;
const WELCOME = () => `<div class="m-ico">🎉</div><h2>Bienvenue, PDG !</h2>
<p class="center"><b>${esc(S.name)}</b> s’installe à <b>Montpellier</b> avec <b>${money(equity(S))}</b> de capital. Le temps avance quand vous le décidez : <b>un clic = une journée</b>.</p>
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
  migrateProducts(S); syncStaff(S); checkUnlocks(S, true); if (!S.today) startDay(S);
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
    const en = card.querySelector('[data-o=endet]');
    if (en) { const e = endet(r); en.textContent = pct(e * 100, 0); en.className = e > 0.35 ? 'neg' : e > 0.3 ? 'warn' : 'pos'; card.querySelector('[data-o=hcsf]').textContent = e > 0.35 ? ' au-delà de 35 % : interdit' : ''; card.querySelector('[data-o=hcsf]').className = 'neg small'; }
  }
  if (el.dataset.input === 'clSearch') { ui.clSearch = el.value; ui.clPage = 0; clearTimeout(ui.clT); ui.clT = setTimeout(() => { const pos = el.selectionStart; renderPanel(true); const n = $('[data-input=clSearch]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 250); }
  if (el.dataset.input === 'prod') {
    const k = el.dataset.p, f = el.dataset.f, v = +el.value;
    if (f === 'rate') S.depositRate = v; else if (f === 'od') S.prod.cc.od = v; else S.prod[k][f] = v;
    const o = $(`[data-o="${k}-${f}"]`);
    if (o) o.textContent = f === 'od' ? Math.round(v * 100) + ' % du salaire' : f === 'agio' ? pct(v) : f === 'rate' ? pct(v, 2) : k === 'av' ? pct(v) + '/an' : k === 'carte' ? nf0.format(v) + ' €/an' : nf1.format(v) + ' €/mois';
  }
});
document.addEventListener('pointerdown', () => { ui.pointerDown = true; });
document.addEventListener('pointerup', () => { ui.pointerDown = false; });
document.addEventListener('pointercancel', () => { ui.pointerDown = false; });
document.addEventListener('keydown', e => {
  if (!S || e.target.matches('input')) return;
  if ((e.key === 'Enter' || e.code === 'Space') && !ui.modal && !e.target.closest('button')) { e.preventDefault(); nextDay(); return; }
  if (e.key === 'Escape') { if (ui.modal && !$('#modal').dataset.noclose) closeModal(); else if (!ui.modal) actions.menu(); }
});
$('#tickerText').addEventListener('animationiteration', nextNews);
window.addEventListener('beforeunload', save);
window.addEventListener('resize', () => S && drawCharts());

// Boucle d'affichage : le temps n'avance que lorsque le joueur passe au jour suivant
let lastRender = 0;
setInterval(() => {
  if (!S || S.over) return;
  if (S.over) return;
  checkUnlocks(S);
  renderTop();
  updateCoach();
  const now = Date.now();
  if (ui.dirty && now - lastRender > 500) { lastRender = now; renderPanel(); }
}, 100);

showStart();
