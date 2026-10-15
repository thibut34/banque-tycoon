'use strict';
/* =====================================================================
   BANQUE TYCOON — écrans (1/2) : accueil, ma banque, prêts, dépôts, monde
   ===================================================================== */

const TAB_ICON = { dash: 'dash', plan: 'bank', loans: 'loans', deposits: 'deposits', world: 'world', markets: 'markets', missions: 'missions', ranking: 'ranking', cb: 'cb', upgrades: 'upgrades', me: 'me', achs: 'achs' };
const kpi = (label, val, sub = '', c = '') => `<div class="kpi"><small>${label}</small><b class="${c}">${val}</b>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
const bar = (p, c = '') => `<div class="bar ${c}"><i style="width:${clamp(p, 0, 100)}%"></i></div>`;
const card = (title, body, extra = '') => `<section class="card ${extra}">${title ? `<header class="card-h"><h3>${title}</h3></header>` : ''}${body}</section>`;
function goalRow(s, g) {
  const cur = g.cur(s), done = cur >= g.goal, f = g.fmt || (x => nf0.format(Math.floor(x)));
  return `<div class="goal ${done ? 'done' : ''}"><span class="gchk">${done ? ic('check') : ''}</span><div class="grow"><div class="row"><span class="grow">${g.txt}</span><small class="muted">${f(Math.min(cur, g.goal))} / ${f(g.goal)}</small></div>${bar(cur / g.goal * 100, done ? 'ok' : '')}</div></div>`;
}

function tabsKeyOf(s) { return [s.requests.length, !!s.challenge, ui.coachTab, (s.unlocked || []).length, (s.newTabs || []).join()].join('|'); }
function renderTabs() {
  const s = S;
  $('#tabs').innerHTML = TABS.filter(([id]) => tabUnlocked(id)).map(([id, lb]) => {
    let badge = '';
    if (id === 'loans' && s.requests.length) badge = `<span class="badge">${s.requests.length}</span>`;
    if (id === 'missions' && s.challenge) badge = '<span class="dot"></span>';
    if ((s.newTabs || []).includes(id)) badge = '<span class="badge new">Nouveau</span>';
    const pulse = ui.coachTab === id ? 'pulse' : '';
    return `<button class="nav-btn ${ui.tab === id ? 'on' : ''} ${pulse}" data-act="tab" data-tab="${id}">${ic(TAB_ICON[id])}<span class="lbl">${lb}</span>${badge}</button>`;
  }).join('');
  ui.tabsKey = tabsKeyOf(s);
}

function renderTop() {
  const s = S, eq = equity(s), r = capRatio(s), E = ECON[s.economy];
  $('#tbName').textContent = s.name;
  $('#tbDate').textContent = dateStr(s.day);
  const ep = $('#tbEcon'); ep.textContent = E.label; ep.style.setProperty('--c', E.color);
  $('#tbCash').textContent = money(s.cash); $('#tbCash').className = s.cash < s.deposits * 0.08 ? 'neg' : '';
  $('#tbEq').textContent = money(eq); $('#tbEq').className = eq < 0 ? 'neg' : '';
  $('#tbRatio').textContent = r === Infinity ? '∞' : pct(r); $('#tbRatio').className = r < minRatio(s) ? 'neg' : r < minRatio(s) + 3 ? 'warn' : 'pos';
  $('#tbRep').textContent = Math.round(s.reputation) + '/100'; $('#tbRep').className = s.reputation < 30 ? 'neg' : s.reputation > 70 ? 'pos' : '';
  $('#tbRank').textContent = rankOf(s) + 'ᵉ / ' + (s.rivals.length + 1);
  $('#chapterPill').textContent = s.chapter < CHAPTERS.length ? `Chapitre ${s.chapter + 1} · ${CHAPTERS[s.chapter].name}` : 'Campagne terminée';
  $('#tbRatio').parentNode.hidden = !(s.chapter >= 1 || s.surveillance);
  $('#tbRank').parentNode.hidden = !tabUnlocked('ranking');
  if (ui.tabsKey !== tabsKeyOf(s)) renderTabs();
}

function canRender() {
  if (ui.pointerDown) return false;
  const a = document.activeElement;
  return !(a && $('#panel').contains(a) && a.matches('input[type=number],input[type=text]'));
}
function renderPanel(force) {
  if (!S) return;
  if (!force && !canRender()) return;
  if (ui.tab === 'plan' && !force && $('#floor')) { renderPlanSide(); ui.dirty = false; return; }
  const views = { dash: vDash, plan: vPlan, loans: vLoans, deposits: vDeposits, world: vWorld, markets: vMarkets, missions: vMissions, ranking: vRanking, cb: vCB, upgrades: vUpgrades, me: vMe, achs: vAchs };
  const st = $('#panel').scrollTop;
  const alert = S.surveillance ? `<div class="alert red">${ic('alert')}<div><b>Banque sous surveillance</b> : ratio de solvabilité sous ${minRatio(S)} % (${S.lowCap}/6 mois avant retrait de licence). Nouveaux prêts, achats d’actifs et bonus interdits.</div></div>` : '';
  $('#panel').innerHTML = `<div class="page">${alert}${views[ui.tab]()}</div>`;
  $('#panel').scrollTop = st;
  drawCharts();
  if (ui.tab === 'plan') { renderPlanSide(); floorStart(); }
  ui.dirty = false;
}

// ---------- Accueil ----------
function vDash() {
  const s = S, eq = equity(s), E = ECON[s.economy], pl = s.lastPL, lo = loansOut(s), pv = portfolioValue(s), ch = CHAPTERS[s.chapter];
  const nextE = s.upgrades.quantique && s.nextEcon ? `<p>⚛️ Prédiction quantique : <b>${ECON[s.nextEcon].label}</b> dans ${s.econTimer} mois.</p>` : '';
  const plRows = pl ? [
    ['Intérêts des prêts', pl.interest], ['Frais et distributeurs', pl.fees], ['Coupons obligataires', pl.coupons], ['Rémunération des réserves', pl.reserves || 0],
    ['Intérêts versés aux épargnants', -pl.depInt], ['Intérêts banque centrale', -pl.cbInt], ['Loyers & salaires', -pl.costs],
    ['Pertes sur défauts', -pl.losses], ['Impôt sur les sociétés', -pl.tax],
  ].filter(([, v]) => v).map(([l, v]) => `<tr><td>${l}</td><td class="r ${cls(v)}">${money(v)}</td></tr>`).join('') + `<tr class="total"><td>Résultat net</td><td class="r ${cls(pl.net)}">${money(pl.net)}</td></tr>` : '<tr><td class="muted">Disponible à la fin du premier mois.</td></tr>';
  const mission = ch ? `<section class="card mission-card">
      <div class="mc-head"><div><small class="eyebrow">Chapitre ${s.chapter + 1} sur ${CHAPTERS.length}</small><h2>${ch.name}</h2><p class="muted">${ch.desc}</p></div>
      ${ch.reward ? `<div class="mc-reward"><small>Récompense</small><b>${money(ch.reward)}</b></div>` : ''}</div>
      <div class="goals">${ch.goals.map(g => goalRow(s, g)).join('')}</div></section>`
    : card('', '<h2>🏆 Campagne terminée</h2><p class="muted">Vous êtes une légende. Continuez à grandir, ou prenez votre retraite pour enregistrer votre score.</p>', 'mission-card');
  const c = s.challenge, chal = c ? `<div class="alert indigo">${ic('clock')}<div class="grow"><b>Défi : ${CHALLENGES[c.tpl].txt(c)}</b> · encore ${c.until - s.day} j · récompense ${money(c.reward)}${bar(CHALLENGES[c.tpl].cur(s, c) / c.goal * 100)}</div></div>` : '';
  return `${mission}${chal}
  <div class="grid kpis four">
    ${kpi('Fonds propres', money(eq), 'Ce que vaut votre banque', eq < 0 ? 'neg' : '')}
    ${kpi('Liquidités', money(s.cash), `${pct(s.deposits ? s.cash / s.deposits * 100 : 100)} des dépôts`)}
    ${kpi('Résultat du mois', pl ? money(pl.net) : '—', 'Après impôts', pl ? cls(pl.net) : '')}
    ${kpi('Clients satisfaits', Math.round(avgSat(s)) + '/100', `${s.branches.length} agence${s.branches.length > 1 ? 's' : ''}`, avgSat(s) < 40 ? 'neg' : avgSat(s) > 65 ? 'pos' : '')}
  </div>
  <div class="grid two">
    ${card('Évolution des fonds propres', '<canvas class="chart" data-chart="equity"></canvas>')}
    ${card('Journal', `<ul class="log">${s.log.slice(0, 30).map(l => `<li class="${l.type}"><small>${dateStr(l.d)}</small>${esc(l.msg)}</li>`).join('') || '<li class="muted">Rien pour l’instant.</li>'}</ul>`)}
  </div>
  <details class="card more"${ui.openMore ? ' open' : ''}><summary data-act="toggleMore">Comptes détaillés et conjoncture</summary>
    <div class="grid kpis">
      ${kpi('Dépôts clients', money(s.deposits), `Rémunérés à ${pct(s.depositRate, 2)}`)}
      ${kpi('Encours de prêts', money(lo), `${s.loans.length} prêts actifs`)}
      ${kpi('Titres financiers', money(pv))}
      ${kpi('Ratio de solvabilité', capRatio(s) === Infinity ? '∞' : pct(capRatio(s)), `Minimum ${minRatio(s)} %`, capRatio(s) < minRatio(s) ? 'neg' : 'pos')}
    </div>
    <div class="grid two">
      <div><h3 class="sec">Conjoncture : <span style="color:${E.color}">${E.label}</span></h3><p class="small muted">Taux directeur <b>${pct(s.policyRate, 2)}</b> · Défauts ×${E.pd} · Demande de crédit ×${E.demand}</p>${nextE}<canvas class="chart sm" data-chart="rate"></canvas></div>
      <div><h3 class="sec">Compte de résultat du mois</h3><table>${plRows}</table></div>
    </div>
  </details>`;
}

// ---------- Ma banque (plan de l'agence) ----------
function vPlan() {
  const s = S;
  if (!getBranch(s, ui.branch)) ui.branch = HQ;
  const b = getBranch(s, ui.branch), c = cityOf(b);
  const chips = s.branches.length > 1 ? `<div class="chips">${s.branches.map(x => `<button class="chip ${x.id === ui.branch ? 'on' : ''}" data-act="selBranch" data-id="${x.id}"><span class="cc">${CITIES[x.id].cc}</span>${CITIES[x.id].name}</button>`).join('')}</div>` : '';
  return `${chips}
  <section class="card floor-card">
    <header class="floor-h"><div><h2>${c.name} ${b.id === HQ ? '<span class="pill">Siège</span>' : ''}</h2><small class="muted">${SIZES[b.size].name} · niveau ${b.size}/3</small></div><div id="planStats"></div></header>
    <div id="floorWrap"><canvas id="floor"></canvas></div>
    <div id="planSide"></div>
  </section>`;
}
function renderPlanSide() {
  const s = S, b = getBranch(s, ui.branch), el = $('#planSide'); if (!el || !b) return;
  const sat = Math.round(b.sat), need = branchNeed(b);
  $('#planStats').innerHTML = `<div class="stat"><small>Satisfaction</small><b class="${sat < 40 ? 'neg' : sat > 65 ? 'pos' : ''}">${sat}/100</b></div>
    <div class="stat"><small>Épargne possible</small><b>${money(branchCap(b))}</b></div>
    <div class="stat"><small>Charges</small><b class="neg">${money(branchCosts(s, b))}/mois</b></div>`;
  const lim = SIZES[b.size], w = wageMult(s, b);
  const tools = [
    ['g', b.g, lim.g, b.g >= lim.g, 'Accueille l’épargne'],
    ['gs', b.gs, b.g, b.gs >= b.g, `${money(ITEMS.gs.wage * w)}/mois`],
    ['b', b.b, lim.b, b.b >= lim.b, 'Reçoit les emprunteurs'],
    ['bs', b.bs, b.b, b.bs >= b.b, `${money(ITEMS.bs.wage * w)}/mois`],
    ['dab', b.dab, lim.dab, b.dab >= lim.dab, `+${money(cityOf(b).traffic * 1500)}/mois`],
    ['vig', b.vig, lim.vig, b.vig >= lim.vig, 'Anti-braquage'],
    ['deco', b.deco, lim.deco, b.deco >= lim.deco, '+ satisfaction'],
  ].filter(([k]) => itemUnlocked(k)).map(([k, n, max, full, sub]) => {
    const cost = itemCost(b, k), dis = full || s.cash < cost;
    const staffFull = (k === 'gs' || k === 'bs') && full && n >= SIZES[b.size][k[0]];
    return `<button class="tool ${full ? 'full' : ''}" data-act="build" data-k="${k}" ${dis ? 'disabled' : ''} title="${esc(ITEMS[k].desc)}">
      <span class="t-ico">${ITEMS[k].icon}</span><span class="t-name">${ITEMS[k].name}</span><span class="t-sub">${full ? ((k === 'gs' || k === 'bs') && !staffFull ? 'Construisez un poste' : 'Complet') : sub}</span>
      <span class="t-foot"><span class="t-count">${n}/${max}</span><b>${full ? '—' : money(cost)}</b></span></button>`;
  }).join('');
  const up = itemUnlocked('size') && SIZES[b.size + 1] ? `<button class="tool gold" data-act="build" data-k="size" ${s.cash < sizeUpCost(b) ? 'disabled' : ''}><span class="t-ico">🏗️</span><span class="t-name">Agrandir</span><span class="t-sub">${SIZES[b.size + 1].name}</span><span class="t-foot"><span class="t-count">niv. ${b.size + 1}</span><b>${money(sizeUpCost(b))}</b></span></button>` : '';
  const tip = b.gs < need ? `<p class="hint">${ic('alert')} Les clients attendent : il faudrait <b>${need} guichetiers</b> ici.</p>` : '';
  const team = (b.staff || []).slice().sort((x, y) => STAFF_KEYS.indexOf(x.role) - STAFF_KEYS.indexOf(y.role)).map(e => {
    const T = TRAITS[e.trait], max = e.lvl >= MAX_LVL, ready = !max && e.xp >= xpNeed(e.lvl), sel = ui.emp == e.id;
    const tc = trainCost(s, b, e), pc = promoCost(s, b, e);
    return `<div class="emp ${sel ? 'sel' : ''} ${ready ? 'ready' : ''}" data-emp="${e.id}">
      <div class="emp-h" data-act="selEmp" data-id="${e.id}">${avatar(e, 46)}<div class="grow"><b>${esc(e.name)}</b><small>${empTitle(e)}</small><span class="stars">${stars(e.lvl)}</span></div>${ready ? '<span class="pill gold">Promotion !</span>' : ''}</div>
      <div class="row"><small class="muted grow">${max ? 'Niveau maximum' : `Expérience ${Math.floor(e.xp)}/${xpNeed(e.lvl)}`}</small><span class="trait" title="${esc(T.desc)}">${T.icon} ${T.name}</span></div>
      ${max ? '' : bar(e.xp / xpNeed(e.lvl) * 100, ready ? 'ok' : '')}
      ${sel ? `<p class="small muted">${T.desc} · efficacité ×${nf2.format(empEff(e))} · salaire ${money(empWage(s, b, e))}/mois · ${Math.max(0, Math.floor((s.day - e.since) / 30))} mois d’ancienneté</p>
      <div class="row wrap">${ready ? `<button class="btn sm gold" data-act="promote" data-id="${e.id}" ${s.cash < pc ? 'disabled' : ''}>Promouvoir — ${money(pc)}</button>` : ''}
      ${!max ? `<button class="btn sm" data-act="train" data-id="${e.id}" ${!canTrain(s, e) || s.cash < tc ? 'disabled' : ''}>${canTrain(s, e) ? `Former — ${money(tc)}` : 'Formé ce mois-ci'}</button>` : ''}
      <button class="btn sm ghost" data-act="fire" data-id="${e.id}">Licencier</button></div>` : '<small class="muted tap">Cliquez pour former ou promouvoir</small>'}
    </div>`;
  }).join('');
  const readyN = (b.staff || []).filter(e => e.lvl < MAX_LVL && e.xp >= xpNeed(e.lvl)).length;
  el.innerHTML = `<div class="tools">${tools}${up}</div>${tip}
    ${team ? `<h3 class="sec">Équipe (${b.staff.length})${readyN ? ` <span class="pill gold">${readyN} promotion${readyN > 1 ? 's' : ''} possible${readyN > 1 ? 's' : ''}</span>` : ''}</h3><div class="team">${team}</div>` : ''}${b.id !== HQ ? `<button class="btn ghost sm" data-act="closeBranch" data-id="${b.id}">Fermer cette agence</button>` : ''}`;
}

// ---------- Prêts ----------
function reqCard(s, r) {
  const T = LOAN_TYPES[r.type], souv = r.type === 'souv', g = reqGrade(r), p = acceptProb(r), left = r.expires - s.day;
  const pd = reqPD(r) * (s.upgrades.ia && !souv ? 0.75 : 1);
  const isNew = !ui.seen.has(r.id); ui.seen.add(r.id);
  const gcls = souv ? 'g-' + (g.startsWith('A') ? 'A' : g === 'BBB' ? 'C' : g === 'BB' ? 'D' : 'E') : 'g-' + g;
  const info = souv ? `Note <b>${g}</b> · Défaut <b>${pct(pd * 100)}/an</b> · Récupération 45 %`
    : s.upgrades.analyste ? `Score <b>${r.score}</b> · Défaut <b>${pct(pd * 100)}/an</b> · Récupération ${Math.round(T.rec * 100)} %` : '🔍 Embauchez un analyste pour voir le score exact.';
  return `<div class="req ${isNew ? 'new' : ''} ${souv ? 'souv' : ''}">
    <div class="req-h"><span class="ico">${T.icon}</span><div><b>${esc(r.name)}</b><small>${souv ? 'Emprunt d’État pour ' : T.label + ' pour '}${esc(r.reason)}</small></div><span class="grade ${gcls}" title="Note de crédit">${g}</span></div>
    <div class="req-info">Montant <b>${money(r.amount)}</b> · Durée <b>${r.dur} mois</b></div>
    <div class="req-info">${info}</div>
    <div class="row"><span class="grow">Taux proposé</span><b data-o="rate" class="big-num">${pct(r.offer)}</b></div>
    <input type="range" min="0.5" max="25" step="0.1" value="${r.offer}" data-input="rate" data-id="${r.id}">
    <div class="req-info">Chance d’acceptation <b data-o="p" class="${p > 0.6 ? 'pos' : p < 0.3 ? 'neg' : 'warn'}">${Math.round(p * 100)} %</b> · Mensualité <b data-o="pmt">${money(payment(r.amount, r.offer, r.dur))}</b></div>
    <div class="bar"><i data-o="bar" style="width:${p * 100}%"></i></div>
    <div class="row"><button class="btn success grow" data-act="offer" data-id="${r.id}">Proposer</button><button class="btn ghost" data-act="reject" data-id="${r.id}">Refuser</button><span class="expire ${left < 5 ? 'neg' : 'muted'}">${ic('clock')} ${left} j</span></div>
  </div>`;
}
function vLoans() {
  const s = S, A = s.auto;
  const souv = s.requests.filter(r => r.type === 'souv'), retail = s.requests.filter(r => r.type !== 'souv');
  const lo = loansOut(s);
  const avg = lo ? s.loans.reduce((a, l) => a + l.rate * l.out, 0) / lo : 0;
  const expLoss = s.loans.reduce((a, l) => a + l.out * l.pdA * ECON[s.economy].pd * (1 - LOAN_TYPES[l.type].rec), 0);
  const list = [...s.loans].sort((a, b) => b.out - a.out).slice(0, 60).map(l => `<tr><td>${LOAN_TYPES[l.type].icon} ${esc(l.name)}</td><td><span class="grade sm">${l.grade}</span></td><td class="r">${money(l.out)}</td><td class="r">${pct(l.rate)}</td><td class="r">${l.left} m</td></tr>`).join('');
  const auto = s.chapter >= 2 ? card('Pilote automatique', `<p class="muted small">Vos conseillers acceptent seuls les dossiers, au taux juste + votre marge, tant qu’il reste au moins 10 % des dépôts en liquidités et que le ratio de solvabilité reste au-dessus du minimum + 4 points.</p>
    <div class="row wrap"><div class="seg"><button data-act="auto" data-v="off" class="${!A.on ? 'on' : ''}">Désactivé</button><button data-act="auto" data-v="on" class="${A.on ? 'on' : ''}">Activé</button></div>
    <span class="muted small">Notes acceptées</span><div class="seg">${'ABCD'.split('').map(g => `<button data-act="autoMin" data-v="${g}" class="${A.min === g ? 'on' : ''}">≥ ${g}</button>`).join('')}</div>
    <span class="muted small">Marge</span><div class="seg">${[0, 0.5, 1, 2].map(m => `<button data-act="autoMargin" data-v="${m}" class="${A.margin === m ? 'on' : ''}">+${nf1.format(m)}</button>`).join('')}</div></div>`)
    : `<div class="alert indigo">${ic('lock')}<div>Le <b>pilote automatique</b> se débloque au chapitre 3.</div></div>`;
  return `<div class="alert blue">${ic('spark')}<div>Plus le taux est élevé, plus vous gagnez… mais moins le client accepte, et plus il risque de faire défaut. La note (A → E) indique la fiabilité de l’emprunteur.</div></div>
  ${auto}
  ${souv.length ? `<h3 class="sec">Demandes des États (${souv.length})</h3><div class="grid cards">${souv.map(r => reqCard(s, r)).join('')}</div>` : ''}
  <h3 class="sec">Demandes en attente (${retail.length})</h3>
  ${retail.length ? `<div class="grid cards">${retail.map(r => reqCard(s, r)).join('')}</div>` : '<div class="card muted">Aucune demande pour l’instant. Embauchez des conseillers, ouvrez des agences ou soignez votre réputation pour en recevoir plus.</div>'}
  <div class="grid kpis">
    ${kpi('Encours total', money(lo), `${s.loans.length} prêts`)}
    ${kpi('Taux moyen', pct(avg, 2))}
    ${kpi('Pertes attendues / an', money(expLoss), 'Selon la conjoncture', 'neg')}
    ${kpi('Défauts historiques', s.stats.defaults, `sur ${s.stats.granted} prêts`)}
  </div>
  ${card('Portefeuille de prêts', `<div class="scroll"><table><tr><th>Client</th><th>Note</th><th class="r">Restant dû</th><th class="r">Taux</th><th class="r">Reste</th></tr>${list || '<tr><td class="muted" colspan="5">Aucun prêt actif.</td></tr>'}</table></div>`)}`;
}

// ---------- Dépôts ----------
function vDeposits() {
  const s = S, target = depositTarget(s), mr = marketDepRate(s);
  return `<div class="alert blue">${ic('spark')}<div>Les dépôts sont l’argent que vos clients vous confient. Vous les rémunérez, puis vous les prêtez plus cher : c’est la <b>marge d’intérêt</b>. Plus vous avez de guichetiers, plus vos agences peuvent en attirer.</div></div>
  <div class="grid kpis">
    ${kpi('Dépôts actuels', money(s.deposits))}
    ${kpi('Dépôts visés', money(target), 'Vers où vos dépôts évoluent', target > s.deposits ? 'pos' : 'neg')}
    ${kpi('Capacité du réseau', money(depositCap(s)), `${s.branches.length} agence(s), ${staffTotal(s, 'gs')} guichetiers`)}
    ${kpi('Coût mensuel', money(s.deposits * s.depositRate / 1200), 'Intérêts versés')}
  </div>
  <div class="grid two">
    ${card('Taux de rémunération des dépôts', `
      <div class="row"><span class="grow">Votre taux</span><b data-o="drate" class="big-num">${pct(s.depositRate, 2)}</b></div>
      <input type="range" min="0" max="8" step="0.05" value="${s.depositRate}" data-input="drate">
      <p class="muted small">Taux moyen des concurrents : <b>${pct(mr, 2)}</b>. Au-dessus, les épargnants affluent ; en dessous, ils partent.</p>
      <h3 class="sec">Frais bancaires</h3>
      <div class="seg">${Object.entries(FEES).map(([k, f]) => `<button data-act="fees" data-v="${k}" class="${s.fees === k ? 'on' : ''}">${f.label} (${pct(f.rate)}/an)</button>`).join('')}</div>
      <p class="muted small">Des frais élevés rapportent plus mais font fuir les clients et baissent votre réputation chaque mois.</p>`)}
    ${card('Dépôts, liquidités et prêts', '<canvas class="chart" data-chart="deposits"></canvas>')}
  </div>`;
}

// ---------- Monde ----------
// Contours simplifiés des continents (longitude, latitude)
const LAND = [
  [[-168,65],[-140,70],[-95,72],[-80,63],[-60,55],[-55,48],[-66,44],[-70,42],[-76,35],[-81,30],[-80,25],[-83,29],[-90,29],[-97,26],[-97,20],[-90,16],[-83,9],[-78,8],[-85,12],[-95,16],[-105,20],[-110,24],[-112,30],[-118,34],[-124,40],[-124,48],[-135,58],[-150,60],[-165,60]],
  [[-50,60],[-42,60],[-20,70],[-20,80],[-60,82],[-70,77],[-55,68]],
  [[-78,8],[-60,10],[-50,0],[-35,-6],[-40,-22],[-48,-28],[-58,-38],[-65,-42],[-68,-55],[-75,-50],[-73,-38],[-71,-18],[-81,-5],[-80,2]],
  [[-9.5,37],[-9,43],[-1.8,43.4],[-1.2,46],[-2.5,47.3],[-4.7,48.4],[-1.6,48.7],[-1.4,49.7],[1.6,50.9],[3,51.3],[5,53],[8,54],[8.5,57],[10.5,57.7],[10.5,54.5],[14,54],[22,55],[21,57],[24,59.5],[30,60],[31,66],[40,68],[40,55],[30,46],[29,41],[26,40.5],[24,38],[22,36.5],[21,39],[19.5,41.5],[16,43.5],[13.5,45.5],[12.4,44.5],[14,42],[16,41],[18.5,40],[16,38],[15.6,38.2],[12.5,41.5],[10.5,43],[8.8,44.4],[7.5,43.8],[6,43.1],[4.5,43.4],[3.1,43.1],[3.2,42],[0.5,40.6],[-0.3,39.5],[0.2,38.7],[-2,36.8],[-5.5,36],[-6.3,36.8],[-7.5,37.2]],
  [[5,58],[10.5,59],[11,58.5],[12.5,56],[14,55.5],[16,56.3],[18.5,60],[17.5,62.5],[21.5,65],[24,66],[25,70],[30,70],[28,71],[20,70],[15,68.5],[12,65],[5,62]],
  [[-5.7,50],[1.4,51.1],[1.7,52.7],[0,53.5],[-1.6,55.5],[-2,57.5],[-3.4,58.6],[-5,58.6],[-6.2,56.5],[-4.8,55],[-3,54],[-4.5,53.3],[-4.2,52.2],[-5.2,51.7],[-3,51.4]],
  [[-6,52],[-6,54.5],[-8,55],[-10,54],[-10,51.6]],
  [[9.4,43],[9.5,41.4],[8.6,41.6],[8.6,42.6]], [[12.4,38],[15.6,38.3],[15,36.7]],
  [[-17,21],[-10,30],[-6,36],[10,37],[20,32],[32,31],[35,28],[43,12],[51,12],[40,-2],[40,-15],[33,-26],[20,-35],[17,-30],[12,-17],[13,-5],[9,4],[-8,4],[-17,14]],
  [[44,-25],[50,-15],[49,-12],[44,-17]],
  [[28,41],[36,36],[35,30],[43,13],[52,16],[58,23],[62,25],[67,24],[73,20],[77,8],[80,13],[88,22],[92,22],[98,16],[100,4],[104,1],[104,10],[109,12],[108,21],[117,24],[122,30],[121,38],[127,38],[129,35],[130,42],[140,48],[142,53],[155,58],[160,62],[180,66],[180,72],[140,73],[110,77],[80,73],[60,70],[40,68],[40,55],[30,46]],
  [[130,31],[136,34],[140,36],[142,40],[141,45],[139,42],[135,35]],
  [[114,-22],[122,-18],[131,-12],[137,-12],[142,-11],[146,-19],[153,-26],[150,-37],[141,-38],[131,-31],[115,-34]],
  [[172,-34],[178,-38],[174,-41],[168,-46],[167,-44],[173,-40]],
];
function worldMap(s, rid) {
  const R = REGIONS[rid], box = rid === 'all' ? [-130, 180, -50, 65] : R.box;
  const ids = Object.keys(CITIES).filter(id => CITIES[id].lat != null && (rid === 'all' || CITIES[id].region === rid));
  const mid = (box[2] + box[3]) / 2 * Math.PI / 180, W = 800;
  const H = clamp(W * (box[3] - box[2]) / ((box[1] - box[0]) * Math.cos(mid)), 280, 560);
  const px = lon => 30 + (lon - box[0]) / (box[1] - box[0]) * (W - 60), py = lat => 24 + (box[3] - lat) / (box[3] - box[2]) * (H - 48);
  let grid = '';
  const step = rid === 'all' ? 30 : (box[1] - box[0]) > 40 ? 10 : 2;
  for (let lo = Math.ceil(box[0] / step) * step; lo <= box[1]; lo += step) grid += `<line x1="${px(lo)}" y1="0" x2="${px(lo)}" y2="${H}"/>`;
  for (let la = Math.ceil(box[2] / step) * step; la <= box[3]; la += step) grid += `<line x1="0" y1="${py(la)}" x2="${W}" y2="${py(la)}"/>`;
  const land = LAND.map(poly => `<path d="M${poly.map(([lo, la]) => `${px(lo).toFixed(1)},${py(la).toFixed(1)}`).join('L')}Z"/>`).join('');
  const owned = ids.filter(id => getBranch(s, id));
  const hub = owned.includes(HQ) ? HQ : owned[0];
  const arcs = hub ? owned.filter(id => id !== hub).map(id => {
    const a = CITIES[hub], b = CITIES[id], x1 = px(a.lon), y1 = py(a.lat), x2 = px(b.lon), y2 = py(b.lat);
    return `<path d="M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - Math.hypot(x2 - x1, y2 - y1) * 0.25} ${x2},${y2}"/>`;
  }).join('') : '';
  const dots = ids.map(id => {
    const c = CITIES[id], own = !!getBranch(s, id), open = regionUnlocked(s, c.region), sel = ui.city === id;
    const r = { s: 4, m: 5, l: 6, xl: 7, w: 8 }[c.tier];
    return `<g class="city ${own ? 'own' : open ? 'open' : 'locked'} ${sel ? 'sel' : ''}" data-act="selCity" data-id="${id}" transform="translate(${px(c.lon)},${py(c.lat)})">
      ${own ? `<circle r="${r + 7}" class="halo"/>` : ''}<circle r="${r}"/>${rid !== 'all' || (own && 'xlw'.includes(c.tier) && c.tier !== 'l') ? `<text y="${-r - 6}">${c.name}</text>` : ''}</g>`;
  }).join('');
  return `<svg class="map" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><g class="grat">${grid}</g><g class="land">${land}</g><g class="arcs">${arcs}</g>${dots}</svg>`;
}
function cityCard(s, id) {
  const c = CITIES[id], own = getBranch(s, id), open = regionUnlocked(s, c.region);
  const T = TIERS[c.tier];
  return `<div class="item ${own ? 'owned' : ''} ${ui.city === id ? 'sel' : ''}"><div class="row"><span class="cc big">${c.cc}</span><div class="grow"><b>${c.name}</b><br><small class="muted">${c.desc || (T ? T.label : '')}</small></div></div>
    <div class="meta">Dépôts potentiels : <b>jusqu’à ${money(c.cap * 1.5)}</b><br>Demandes de prêt : <b>×${c.loans}</b><br>Loyer : <b>${money(c.rent)}/mois</b></div>
    ${own ? `<button class="btn sm" data-act="goBranch" data-id="${id}">Voir l’agence ${ic('arrow')}</button>`
      : !open ? `<button class="btn" disabled>${ic('lock')} Chapitre ${REGIONS[c.region].unlock + 1}</button>`
        : `<button class="btn gold" data-act="branch" data-id="${id}" ${s.cash < c.cost ? 'disabled' : ''}>Ouvrir — ${money(c.cost)}</button>`}</div>`;
}
function vWorld() {
  const s = S, rid = ui.region;
  const tabs = [['all', 'Monde'], ...Object.entries(REGIONS).map(([k, r]) => [k, r.name])].map(([k, n]) => {
    const lock = k !== 'all' && !regionUnlocked(s, k), cnt = k === 'all' ? s.branches.length : regionCount(s, k);
    return `<button class="chip ${rid === k ? 'on' : ''} ${lock ? 'locked' : ''}" data-act="region" data-v="${k}">${lock ? ic('lock') : ''}${n}${cnt ? ` <small>${cnt}</small>` : ''}</button>`;
  }).join('');
  const total = Object.keys(CITIES).length;
  const list = Object.keys(CITIES).filter(id => rid === 'all' ? getBranch(s, id) : CITIES[id].region === rid);
  const R = REGIONS[rid];
  const lockMsg = rid !== 'all' && !regionUnlocked(s, rid) ? `<div class="alert indigo">${ic('lock')}<div>Région verrouillée : terminez le <b>chapitre ${R.unlock}</b> (« ${CHAPTERS[R.unlock - 1].name} ») pour obtenir la licence.</div></div>` : '';
  return `<div class="chips">${tabs}</div>
  ${lockMsg}
  ${rid === 'espace' ? '' : card(`${rid === 'all' ? 'Votre réseau mondial' : R.name} <small class="muted">· ${s.branches.length}/${total} agences dans le monde</small>`, worldMap(s, rid), 'map-card')}
  <h3 class="sec">${rid === 'all' ? 'Vos agences' : 'Villes'}</h3>
  <div class="grid cards">${list.map(id => cityCard(s, id)).join('') || '<div class="card muted">Aucune agence.</div>'}</div>`;
}
