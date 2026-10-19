'use strict';
/* =====================================================================
   BANQUE TYCOON — le temps réel
   Le temps avance tout seul (un jour toutes les quelques secondes). Il se
   met en pause quand une fenêtre est ouverte ou que l'onglet est caché.
   Les dossiers importants attendent sur votre bureau quelques jours :
   sans réponse, votre équipe tranche à votre place.
   ===================================================================== */

const DAY_MS = 15000; // une journée = 15 secondes
const clock = { acc: 0, last: 0 };
const hasStaff = s => s.branches.some(b => b.gs || b.bs);
function clockState(s) {
  if (!s || s.over) return 'stop';
  if (!hasStaff(s)) return 'staff';
  if (s.flags.paused) return 'pause';
  if (ui.modal || document.hidden) return 'wait';
  return 'run';
}
function clockLoop() {
  const ts = Date.now(), dt = clock.last ? Math.min(250, ts - clock.last) : 0; clock.last = ts;
  const s = S; if (!s || $('#game').hidden) return;
  if (clockState(s) === 'run') {
    agencyTick(s, dt / 1000);
    clock.acc += dt;
    if (clock.acc >= DAY_MS) { clock.acc -= DAY_MS; advanceDay(); }
  }
  clockUI(s);
  if (ts - (clock.statsAt || 0) > 400) { clock.statsAt = ts; liveStats(s); }
}
setInterval(clockLoop, 50);

function clockUI(s) {
  const b = $('#clockBtn'); if (!b) return;
  const st = clockState(s), key = st + (st === 'run' ? '' : '');
  if (b.dataset.st !== key) {
    b.dataset.st = key;
    b.classList.toggle('paused', st !== 'run');
    b.querySelector('span').textContent = st === 'run' ? '⏸ Pause' : st === 'staff' ? '⏳ Recrutez un guichetier' : st === 'pause' ? '▶ Reprendre' : '⏸ En pause';
  }
  b.querySelector('i').style.width = (st === 'run' || st === 'wait' ? clock.acc / DAY_MS * 100 : 0) + '%';
}

// ---------- Un nouveau jour ----------
function advanceDay() {
  const s = S;
  agencyDayEnd(s);
  tickDay();
  if (s.over) return;
  startDay(s);
  const t = s.today;
  s.flags.lostAvg = (s.flags.lostAvg || 0) * 0.8 + (t.lost || 0) * 0.2;
  if (s.day % 30 === 27) { const sc = $('.scene'); if (sc && ui.tab === 'dash') { const r = sc.getBoundingClientRect(); floatText(r.left + r.width / 2, r.top + r.height * 0.3, '💶 Jour de paie !', 'big'); } }
  if (s.day % 5 === 0) save();
  renderTop();
}
// Compteurs en direct sous l'agence
function liveStats(s) {
  const el = $('#liveStats'); if (!el || !s.today) return;
  const b = getBranch(s, ui.branch) || s.branches[0], A = b && ag(b), t = s.today;
  const q = A ? A.agents.filter(a => a.st === 'queue').length : 0;
  el.innerHTML = `<span>🚶 <b>${t.arrived}</b> aujourd’hui</span><span>✅ <b>${t.served || 0}</b> servis</span>${t.lost ? `<span class="neg">😤 <b>${t.lost}</b> partis</span>` : ''}${q ? `<span>⏳ <b>${q}</b> dans la file</span>` : ''}`;
}

// ---------- Le bureau : les dossiers attendent quelques jours ----------
const MAX_INBOX = 5;
function inboxMerge(s, t) {
  const old = (s.inbox || []).filter(c => !c.done);
  for (const c of old) if (c.exp <= s.day) expireCard(s, c);
  for (const c of t.cards) c.exp = s.day + (c.kind === 'pret' || c.kind === 'pro' ? 7 : 6);
  let all = old.filter(c => !c.done).concat(t.cards);
  while (all.length > MAX_INBOX) { expireCard(s, all[0]); all = all.filter(c => !c.done); }
  t.cards = s.inbox = all;
  t.total = all.length;
}
function expireCard(s, c) {
  ui.teamQ = teamQ(s, getBranch(s, c.branch) || s.branches[0]);
  if ((c.kind === 'pret' || c.kind === 'pro') && c.req) {
    c.done = true; s.stats.refused++;
    log(`⌛ ${c.name} attendait votre signature : sans réponse, il est allé voir un concurrent.`, 'bad');
    return;
  }
  const m = resolveCard(s, c, delegateChoice(s, c), false);
  log(`⌛ Sans décision de votre part, votre équipe a tranché${c.name ? ' pour ' + c.name : ''}${m ? ' : ' + m.replace(/<[^>]+>/g, '') : '.'}`);
}

// ---------- Résultat en direct ----------
function dailyEstimate(s) {
  const interest = s.loans.reduce((a, L) => a + L.out * L.rate / 1200, 0);
  const fees = (s.clients || 0) * s.prod.cc.fee + (s.flags.entAcc || 0) * 35 + ((s.cards || 0) * s.prod.carte.fee + (s.cardsGold || 0) * s.prod.carte.fee * 2.5) / 12 + (s.prod.av.aum || 0) * s.prod.av.fee / 1200 + (s.ovd || 0) * (s.prod.cc.agio || 14) / 1200;
  // frais de dossier encaissés depuis le début du mois, distributeurs, réserves placées et obligations
  const dom = s.day % 30 + 1, dossier = (s.flags.mExtraFees || 0) / dom * 30;
  let other = Math.max(0, s.cash) * Math.max(0, s.policyRate - 1) / 1200 + holdingValue(s, 'oat') * (s.policyRate + 0.4) / 1200;
  for (const b of s.branches) other += dabIncome(b);
  const livret = (s.depLiv || 0) * s.depositRate / 1200;
  const costs = monthlyCosts(s) + s.cbDebt * cbRate(s) / 1200 + (s.fixed || 0) / 60;
  const f = fees + dossier;
  return { interest: interest / 30, fees: f / 30, other: other / 30, livret: livret / 30, costs: costs / 30, net: (n => n > 0 ? n * 0.75 : n)((interest + f + other - livret - costs) / 30) }; // après impôt (25 %)
}

// ---------- Développer ma banque : quoi acheter maintenant ----------
function growthOptions(s) {
  const b = getBranch(s, HQ) || s.branches[0]; if (!b) return [];
  const lim = SIZES[b.size], out = [], lost = s.flags.lostAvg || 0;
  if (b.g > b.gs) out.push({ k: 'gs', ico: '🧑‍💼', name: 'Embaucher un guichetier', fx: '+6 clients servis par jour', cost: itemCost(b, 'gs'), hot: true });
  else if (b.g < lim.g) out.push({ k: 'g', ico: '🪟', name: 'Nouveau guichet', fx: lost > 0.5 ? `${Math.round(lost)} clients repartent chaque jour faute de place` : 'Accueillir plus de clients', cost: itemCost(b, 'g'), hot: lost > 0.5 });
  if (loansOpen(s) || staffTotal(s, 'gs') >= 1) {
    if (b.b > b.bs) out.push({ k: 'bs', ico: '👔', name: 'Recruter un conseiller', fx: '+3 dossiers de prêt par jour', cost: itemCost(b, 'bs'), hot: true });
    else if (b.b < lim.b && itemUnlocked('b')) out.push({ k: 'b', ico: '🗂️', name: 'Bureau de conseil', fx: 'Pour recevoir les demandes de prêt', cost: itemCost(b, 'b') });
  }
  for (const k of ROOM_KINDS) if (itemUnlocked(k) && (b[k] || 0) < (lim[k] || 0)) out.push({ k, ico: ITEMS[k].icon, name: (b[k] ? 'Un 2ᵉ ' : 'Ouvrir : ') + ITEMS[k].name.charAt(0).toLowerCase() + ITEMS[k].name.slice(1), fx: { cof: 'Des coffres à louer à vos clients', ent: 'Les entreprises : trésorerie, commissions, gros prêts', vip: 'Les clients fortunés : gros placements, honoraires' }[k], cost: itemCost(b, k), hot: !b[k] });
  for (const k of ['liv', 'carte', 'av']) if (!s.prod[k].on && PROD_UNLOCK[k](s)) out.push({ launch: k, ico: PRODUCTS[k].icon, name: `Lancer : ${PRODUCTS[k].name}`, fx: PRODUCTS[k].desc.split('.')[0], cost: 0, hot: true });
  // les améliorations de postes les moins chères
  const ups = [];
  for (const k of ['g', 'b', 'dab', ...ROOM_KINDS]) for (let i = 0; i < stCount(b, k); i++) { const lv = stLv(b, k, i); if (lv < ST_MAX) ups.push({ st: [k, i], ico: '⬆️', name: `${ST_NAME[k]}${stCount(b, k) > 1 || k === 'g' || k === 'b' ? ' ' + (i + 1) : ''} : niveau ${lv + 1}`, fx: k === 'g' ? 'Plus rapide, vend plus' : k === 'b' ? 'Plus rapide, meilleure marge' : k === 'dab' ? 'Plus rapide' : 'Plus rapide, rapporte plus', cost: stCost(b, k, lv), hot: lost > 0.5 }); }
  ups.sort((x, y) => x.cost - y.cost).slice(0, 2).forEach(u => out.push(u));
  if (!(s.flags.sponsorUntil > s.day) && s.clients >= 5) out.push({ pub: 1, ico: '📣', name: 'Campagne de publicité', fx: '+15 % de visiteurs pendant 30 jours', cost: 8000 });
  const emp = s.branches.flatMap(x => (x.staff || []).map(e => [x, e])).filter(([, e]) => canTrain(s, e)).sort((a, c) => a[1].lvl - c[1].lvl)[0];
  if (emp) out.push({ train: emp[1].id, ico: '🎓', name: `Former ${emp[1].name.split(' ')[0]}`, fx: 'Votre équipe décidera mieux à votre place', cost: trainCost(s, emp[0], emp[1]) });
  if (itemUnlocked('dab') && b.dab < lim.dab) out.push({ k: 'dab', ico: '🏧', name: 'Distributeur de billets', fx: 'Des revenus chaque mois', cost: itemCost(b, 'dab') });
  if (b.g >= lim.g && b.b >= lim.b && b.size < 3) out.push({ k: 'size', ico: '🏗️', name: 'Agrandir l’agence', fx: 'Plus de guichets et de bureaux', cost: sizeUpCost(b) });
  if (tabUnlocked('world')) out.push({ world: 1, ico: '🌍', name: 'Ouvrir une nouvelle agence', fx: 'Conquérir d’autres villes', cost: null });
  return out.slice(0, 6);
}
function growthHTML(s) {
  const o = growthOptions(s); if (!o.length) return '';
  return `<section class="grow-box"><h3>🚀 Développer ma banque</h3><div class="grow-list">${o.map((g, i) => {
    const poor = g.cost && s.cash < g.cost;
    return `<button class="grow-item ${g.hot ? 'hot' : ''}" data-act="grow" data-i="${i}" ${poor ? 'disabled' : ''}><span class="gi-ico">${g.ico}</span><span class="grow"><b>${g.name}</b><small>${g.fx}</small></span><span class="gi-cost">${g.cost === null ? '→' : g.cost ? money(g.cost) : 'Gratuit'}</span></button>`;
  }).join('')}</div></section>`;
}

Object.assign(actions, {
  pause: () => { if (!S) return; S.flags.paused = !S.flags.paused; clock.acc = Math.min(clock.acc, DAY_MS * 0.5); SFX.play('click'); clockUI(S); },
  grow: el => {
    const g = growthOptions(S)[+el.dataset.i]; if (!g) return;
    ui.branch = HQ;
    if (g.k) { if (doBuild(g.k)) { renderTop(); SFX.play('build'); } }
    else if (g.launch) actions.launch({ dataset: { p: g.launch } });
    else if (g.pub) { if (S.cash < 8000) return; S.cash -= 8000; S.flags.sponsorUntil = S.day + 30; toast('📣 Campagne lancée : plus de visiteurs pendant 30 jours !', 'good'); }
    else if (g.train) trainEmp(g.train);
    else if (g.st) upgradeStation(getBranch(S, HQ), g.st[0], g.st[1]);
    else if (g.world) return actions.tab({ dataset: { tab: 'world' } });
    renderTop(); renderPanel(true);
  },
});
// Espace : pause / reprise
document.addEventListener('keydown', e => {
  if (!S || ui.modal || e.code !== 'Space' || e.target.matches('input,textarea,select,button')) return;
  e.preventDefault(); e.stopImmediatePropagation(); actions.pause();
}, true);
