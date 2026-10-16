'use strict';
/* =====================================================================
   BANQUE TYCOON — écrans (2/2) : marchés, missions, classement, BCE,
   améliorations, patron, succès, graphiques et fil d'info
   ===================================================================== */

function vMarkets() {
  const s = S, sel = ui.market, A = ASSETS[sel], m = s.market[sel];
  const rows = Object.entries(ASSETS).map(([id, a]) => {
    const mk = s.market[id], h = mk.hist, ch = (mk.price / h[Math.max(0, h.length - 31)] - 1) * 100;
    const locked = a.need && !s.upgrades[a.need];
    return `<div class="asset ${sel === id ? 'sel' : ''} ${locked ? 'locked' : ''}" data-act="selAsset" data-id="${id}"><span class="ico">${a.icon}</span>
      <div class="nm"><b>${a.name}</b><small>${s.portfolio[id] ? 'Détenu : ' + money(holdingValue(s, id)) : locked ? 'Salle des marchés requise' : '—'}</small></div>
      <div class="px"><b>${money(mk.price)}</b><small class="${cls(ch)}">${ch >= 0 ? '+' : ''}${pct(ch)} /30 j</small></div></div>`;
  }).join('');
  const held = holdingValue(s, sel), cost = s.cost[sel] || 0, pnl = held - cost;
  const amts = [10e3, 100e3, 1e6, 10e6, 100e6];
  return `<div class="grid two">
    ${card('Marchés', rows)}
    ${card(`${A.icon} ${A.name} — <span class="gold-t">${money(m.price)}</span>`, `
      <canvas class="chart" data-chart="asset"></canvas>
      <p class="muted small">${A.desc} Pondération risque : ${A.rw * 100} %.</p>
      <p>Position : <b>${money(held)}</b> ${held ? `· Plus-value : <b class="${cls(pnl)}">${money(pnl)}</b>` : ''}</p>
      <div class="row wrap">Montant <div class="seg">${amts.map(a => `<button data-act="tradeAmt" data-v="${a}" class="${ui.tradeAmt === a ? 'on' : ''}">${money(a)}</button>`).join('')}</div></div>
      <div class="row" style="margin-top:10px"><button class="btn success grow" data-act="buy">Acheter ${money(ui.tradeAmt)}</button></div>
      <div class="row" style="margin-top:8px"><button class="btn danger grow" data-act="sell" data-f="0.25" ${held ? '' : 'disabled'}>Vendre 25 %</button><button class="btn danger grow" data-act="sell" data-f="0.5" ${held ? '' : 'disabled'}>50 %</button><button class="btn danger grow" data-act="sell" data-f="1" ${held ? '' : 'disabled'}>Tout</button></div>
      <p class="muted small">Frais de courtage : ${pct(tradeFee() * 100, 2)} par opération.</p>`)}
  </div>`;
}

// ---------- Missions ----------
function vMissions() {
  const s = S, c = s.challenge;
  const chal = c ? (() => {
    const T = CHALLENGES[c.tpl], cur = T.cur(s, c), f = T.fmt || (x => nf0.format(Math.floor(x))), left = c.until - s.day;
    return card(`${ic('clock')} Défi en cours`, `<div class="row"><b class="grow">${T.txt(c)}</b><span class="pill gold">${money(c.reward)}</span></div>
      <div class="row"><small class="muted grow">Progression</small><small>${f(Math.max(0, Math.min(cur, c.goal)))} / ${f(c.goal)}</small></div>${bar(cur / c.goal * 100, 'ok')}
      <div class="row"><small class="muted grow">Temps restant</small><small class="${left < 10 ? 'neg' : ''}">${left} jours</small></div>${bar(left / c.days * 100, 'time')}`, 'hl');
  })() : card('Défis', `<p class="muted">Aucun défi pour l’instant. Le prochain arrive dans environ ${Math.max(1, s.nextChallenge - s.day)} jours. Réussir un défi rapporte de l’argent et de la réputation.</p><p class="small">Défis réussis : <b>${s.stats.challenges}</b></p>`);
  const chs = CHAPTERS.map((ch, i) => {
    const done = i < s.chapter, cur = i === s.chapter;
    const unl = Object.values(REGIONS).filter(r => r.unlock === i + 1).map(r => r.name);
    return `<section class="card chapter ${done ? 'done' : cur ? 'current' : 'future'}">
      <div class="ch-num">${done ? ic('check') : i + 1}</div>
      <div class="grow"><div class="row"><h3 class="grow">${cur || done ? ch.name : 'Chapitre ' + (i + 1)}</h3>${ch.reward ? `<span class="pill ${done ? '' : 'gold'}">${money(ch.reward)}</span>` : ''}</div>
      ${cur || done ? `<p class="muted small">${ch.desc}</p>` : '<p class="muted small">Terminez le chapitre précédent pour le découvrir.</p>'}
      ${cur ? `<div class="goals">${ch.goals.map(g => goalRow(s, g)).join('')}</div>` : ''}
      ${unl.length && !done ? `<small class="muted">${ic('world')} Débloque : ${unl.join(', ')}${i === 4 ? ' + prêts aux États' : ''}</small>` : ''}
      ${i === 0 && !done ? `<small class="muted">${ic('spark')} Débloque : les prêts, le bureau de conseil et le livret</small>` : ''}
      ${i === 1 && !done ? `<small class="muted">${ic('spark')} Débloque : pilote automatique des prêts, carte et assurance-vie bientôt</small>` : ''}</div></section>`;
  }).join('');
  return `${chal}<h3 class="sec">Campagne — ${Math.min(s.chapter, CHAPTERS.length)}/${CHAPTERS.length} chapitres</h3>${chs}`;
}

// ---------- Classement ----------
function vRanking() {
  const s = S, eq = equity(s);
  const all = [...aliveRivals(s).map(r => { const R = RIVALS.find(x => x.id === r.id); return { id: r.id, r, name: R.name, eq: r.eq, color: R.color, hist: r.hist }; }), { name: s.name, eq, me: true, color: '#818cf8' }].sort((a, b) => b.eq - a.eq);
  const max = all[0].eq;
  const rows = all.map((r, i) => {
    const h = r.hist, ch = h && h.length > 12 ? (r.eq / h[h.length - 13] - 1) * 100 : null;
    return `<div class="rank ${r.me ? 'me' : ''}"><span class="rk">${i + 1}</span><span class="rdot" style="background:${r.color}"></span>
      <div class="grow"><div class="row"><b class="grow">${esc(r.name)}${r.me ? ' <span class="pill">Vous</span>' : ''}</b><b>${money(r.eq)}</b></div>
      <div class="rbar"><i style="width:${Math.max(1, Math.sqrt(r.eq / max) * 100)}%;background:${r.color}"></i></div>
      ${ch != null ? `<small class="${cls(ch)}">${ch >= 0 ? '+' : ''}${pct(ch)} sur un an</small>` : r.me ? '<small class="muted">Votre banque</small>' : ''}</div>
      ${r.r && canBuyout(s, r.r) ? `<button class="btn sm gold" data-act="buyout" data-id="${r.id}" ${s.cash < buyoutPrice(r.r) ? 'disabled' : ''}>🦈 Racheter ${money(buyoutPrice(r.r))}</button>` : ''}</div>`;
  }).join('');
  return `<div class="alert blue">${ic('ranking')}<div>Les fonds propres des grandes banques. Elles grandissent en période de croissance et souffrent pendant les crises. Objectif ultime : <b>devenir numéro 1 mondial</b>.</div></div>
  ${s.chapter >= 4 ? '' : `<div class="alert indigo">${ic('lock')}<div>À partir du chapitre 5, vous pourrez <b>racheter</b> les concurrents deux fois plus petits que vous.</div></div>`}
  ${card(`Classement mondial · vous êtes <span class="gold-t">${rankOf(s)}ᵉ</span>`, rows)}
  ${s.rivals.some(r => r.gone) ? `<p class="muted small">Absorbées par vous : ${s.rivals.filter(r => r.gone).map(r => RIVALS.find(x => x.id === r.id).name).join(', ')}</p>` : ''}`;
}

// ---------- Banque centrale ----------
function vCB() {
  const s = S, lim = cbLimit(s), pen = s.flags.penalty > s.day;
  const big = Math.max(10e6, Math.pow(10, Math.floor(Math.log10(Math.max(1, lim)))));
  return `<div class="alert blue">${ic('spark')}<div>La banque centrale prête aux banques au <b>taux directeur + 0,25 %</b>, contre des garanties (vos prêts et obligations). Pratique pour financer des prêts quand les dépôts manquent.</div></div>
  ${pen ? `<div class="alert red">${ic('alert')}<div>Taux pénalité (+3 %) actif suite à un découvert. Gardez toujours des liquidités !</div></div>` : ''}
  <div class="grid kpis">
    ${kpi('Taux directeur', pct(s.policyRate, 2))}
    ${kpi('Votre taux d’emprunt', pct(cbRate(s) + (pen ? 3 : 0), 2), '', pen ? 'neg' : '')}
    ${kpi('Dette actuelle', money(s.cbDebt), `Intérêts : ${money(s.cbDebt * (cbRate(s) + (pen ? 3 : 0)) / 1200)}/mois`)}
    ${kpi('Plafond d’emprunt', money(lim), 'Selon vos garanties')}
  </div>
  <div class="grid two">
    ${card('Emprunter / rembourser', `<div class="row">${[100e3, 1e6, big].map(v => `<button class="btn success grow" data-act="borrow" data-v="${v}">+ ${money(v)}</button>`).join('')}</div>
      <div class="row" style="margin-top:8px">${[100e3, 1e6].map(v => `<button class="btn danger grow" data-act="repay" data-v="${v}">− ${money(v)}</button>`).join('')}<button class="btn danger grow" data-act="repay" data-v="all">Tout rembourser</button></div>`)}
    ${card('Historique du taux directeur', '<canvas class="chart sm" data-chart="rate"></canvas>')}
  </div>`;
}

// ---------- Améliorations ----------
function vUpgrades() {
  const s = S;
  return `<div class="grid cards">${Object.entries(UPGRADES).map(([id, u]) => {
    const own = s.upgrades[id], lock = u.req && !s.upgrades[u.req];
    return `<div class="item ${own ? 'owned' : ''}"><div class="ico">${u.icon}</div><b>${u.name}</b><p>${u.desc}</p>
      <div class="meta">Coût mensuel : <b>${money(u.monthly)}</b>${lock ? `<br><span class="neg">Nécessite : ${UPGRADES[u.req].name}</span>` : ''}</div>
      ${own ? `<button class="btn sm ghost" data-act="cancelUp" data-id="${id}">${ic('check')} Actif — résilier</button>` : `<button class="btn gold" data-act="upgrade" data-id="${id}" ${s.cash < u.cost || lock ? 'disabled' : ''}>Acheter — ${money(u.cost)}</button>`}
    </div>`;
  }).join('')}</div>`;
}

// ---------- Patron ----------
function vMe() {
  const s = S, eq = equity(s), best = loadBest();
  return `<div class="grid kpis">${kpi('Fortune personnelle', money(s.fortune), 'Votre argent à vous', 'gold-t')}${kpi('Bonus cumulés', money(s.stats.bonus))}${kpi('Score actuel', money(score(s)), 'Fonds propres + fortune')}${kpi('Collection', `${s.owned.length} / ${Object.keys(LUXURY).length}`)}</div>
  <div class="grid two">
    ${card('Se verser un bonus', `<p class="muted small">L’argent sort de la banque vers votre poche, après 30 % d’impôts. Au-delà de 5 % des fonds propres, la presse s’en mêle…</p>
      <div class="row">${[0.01, 0.05, 0.1].map(f => `<button class="btn gold grow" data-act="bonus" data-f="${f}" ${eq <= 0 ? 'disabled' : ''}>${f * 100} % (${money(Math.max(0, eq * f))})</button>`).join('')}</div>
      <button class="btn ghost" style="margin-top:14px" data-act="confirmRetire">🎣 Prendre sa retraite et terminer la partie</button>`)}
    ${card('Meilleurs scores', bestTable(best))}
  </div>
  <h3 class="sec">Boutique de luxe</h3>
  <div class="grid cards">${Object.entries(LUXURY).map(([id, l]) => {
    const own = s.owned.includes(id);
    return `<div class="item ${own ? 'owned' : ''}"><div class="ico">${l.icon}</div><b>${l.name}</b>${own ? '<span class="pos">✅ À vous !</span>' : `<button class="btn gold" data-act="lux" data-id="${id}" ${s.fortune < l.cost ? 'disabled' : ''}>${money(l.cost)}</button>`}</div>`;
  }).join('')}</div>`;
}
function bestTable(best) {
  if (!best.length) return '<p class="muted">Aucune partie terminée.</p>';
  return `<table><tr><th>#</th><th>Banque</th><th class="r">Score</th><th class="r">Mois</th></tr>${best.map((b, i) => `<tr><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td><td>${esc(b.name)}<br><small class="muted">${esc(b.reason)} · chapitre ${(b.chapter || 0) + 1}</small></td><td class="r">${money(b.score)}</td><td class="r">${b.months}</td></tr>`).join('')}</table>`;
}

// ---------- Succès ----------
function vAchs() {
  const s = S, n = Object.keys(s.achievements).length;
  return `<h3 class="sec">Succès (${n}/${Object.keys(ACHS).length})</h3>
  <div class="grid cards">${Object.entries(ACHS).map(([id, a]) => `<div class="item ach ${s.achievements[id] != null ? 'got' : ''}"><div class="ico">${a.icon}</div><b>${a.name}</b><p>${a.desc}</p>${s.achievements[id] != null ? `<small class="gold-t">Obtenu le ${dateStr(s.achievements[id])}</small>` : ''}</div>`).join('')}</div>
  ${card('Statistiques', `<table>
    <tr><td>Jours d’existence</td><td class="r">${s.day}</td></tr>
    <tr><td>Prêts accordés</td><td class="r">${s.stats.granted}</td></tr>
    <tr><td>Prêts aux États</td><td class="r">${s.stats.souv}</td></tr>
    <tr><td>Défauts de paiement</td><td class="r">${s.stats.defaults}</td></tr>
    <tr><td>Demandes refusées ou expirées</td><td class="r">${s.stats.refused}</td></tr>
    <tr><td>Intérêts perçus (total)</td><td class="r">${money(s.stats.interest)}</td></tr>
    <tr><td>Défis réussis</td><td class="r">${s.stats.challenges}</td></tr>
    <tr><td>Crises traversées</td><td class="r">${s.stats.crises}</td></tr>
    <tr><td>Événements vécus</td><td class="r">${s.stats.events}</td></tr></table>`)}`;
}

// ---------- Graphiques (canvas) ----------
function drawCharts() {
  $$('#panel canvas[data-chart]').forEach(cv => {
    const t = cv.dataset.chart, s = S;
    if (t === 'equity') drawChart(cv, [{ data: s.history.map(h => h.eq), color: '#818cf8' }], { fmt: money });
    if (t === 'deposits') drawChart(cv, [{ data: s.history.map(h => h.dep), color: '#60a5fa', label: 'Dépôts' }, { data: s.history.map(h => h.cash), color: '#34d399', label: 'Liquidités' }, { data: s.history.map(h => h.loans), color: '#f472b6', label: 'Prêts' }], { fmt: money });
    if (t === 'rate') drawChart(cv, [{ data: s.rateHist, color: '#fbbf24' }], { fmt: v => pct(v, 2), zero: true });
    if (t === 'asset') { const h = s.market[ui.market].hist; drawChart(cv, [{ data: h, color: h[h.length - 1] >= h[0] ? '#34d399' : '#f87171' }], { fmt: money }); }
  });
}
function drawChart(cv, series, opts = {}) {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  cv.width = w * dpr; cv.height = h * dpr;
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const all = series.flatMap(s => s.data);
  c.font = '11px Inter, system-ui, sans-serif';
  if (all.length < 2) { c.fillStyle = '#7c8599'; c.fillText('Les données apparaîtront à la fin du premier mois…', 10, h / 2); return; }
  let mn = Math.min(...all), mx = Math.max(...all);
  if (opts.zero) mn = Math.min(mn, 0);
  if (mx - mn < 1e-9) { mx += Math.abs(mx) * 0.1 + 1; mn -= Math.abs(mn) * 0.1 + 1; }
  const pad = (mx - mn) * 0.1; mn -= pad; mx += pad;
  const L = 4, R = w - 72, T = 8, B = h - 6;
  const y = v => B - (v - mn) / (mx - mn) * (B - T);
  c.strokeStyle = 'rgba(148,163,184,.12)'; c.fillStyle = '#7c8599'; c.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const v = mn + (mx - mn) * i / 3, yy = Math.round(y(v)) + 0.5;
    c.beginPath(); c.moveTo(L, yy); c.lineTo(R, yy); c.stroke();
    c.fillText(opts.fmt ? opts.fmt(v) : v.toFixed(1), R + 8, yy + 4);
  }
  series.forEach((s, si) => {
    const n = s.data.length; if (n < 2) return;
    const x = i => L + i / (n - 1) * (R - L);
    c.beginPath(); s.data.forEach((v, i) => i ? c.lineTo(x(i), y(v)) : c.moveTo(x(i), y(v)));
    c.strokeStyle = s.color; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke();
    if (si === 0) {
      c.lineTo(x(n - 1), B); c.lineTo(x(0), B); c.closePath();
      const g = c.createLinearGradient(0, T, 0, B); g.addColorStop(0, s.color + '40'); g.addColorStop(1, s.color + '00');
      c.fillStyle = g; c.fill();
    }
    if (s.label) { c.fillStyle = s.color; c.fillText('● ' + s.label, L + 4 + si * 90, T + 10); }
  });
}

// ---------- Fil d'actualités ----------
function nextNews() {
  const s = S; if (!s) return;
  const dyn = [
    `Conjoncture : ${ECON[s.economy].label.toLowerCase()} — taux directeur à ${pct(s.policyRate, 2)}.`,
    `CAC 40 : ${nf0.format(s.market.cac.price)} pts · BitBaguette : ${money(s.market.crypto.price)} · Or : ${money(s.market.gold.price)}`,
    `${s.name} : ${s.branches.length} agence${s.branches.length > 1 ? 's' : ''}, ${s.loans.length} prêts en cours, ${rankOf(s)}ᵉ banque du classement.`,
  ];
  if (s.economy === 'crise') dyn.push('Les Français se ruent sur les lingots et les boîtes de conserve.');
  if (s.economy === 'croissance') dyn.push('Euphorie : même les escargots courent plus vite.');
  $('#tickerText').textContent = [pick(NEWS), pick(dyn), pick(NEWS)].join('     •     ');
}
