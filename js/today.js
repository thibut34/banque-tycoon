'use strict';
/* =====================================================================
   BANQUE TYCOON — écran « Aujourd'hui » : les clients du jour
   ===================================================================== */

const CARD_META = {
  compte: ['🙋', 'Ouverture de compte'], depot: ['💶', 'Dépôt'], retrait: ['🏧', 'Retrait'], livret: ['🐷', 'Épargne'],
  pret: ['🤝', 'Demande de prêt'], reclam: ['😠', 'Réclamation'], carte: ['💳', 'Carte bancaire'], av: ['☂️', 'Assurance-vie'],
  suspect: ['🕶️', 'Ouverture de compte'], reunion: ['☕', 'Réunion du lundi'], facture: ['🧾', 'Facture'], impaye: ['📞', 'Mensualité impayée'], courrier: ['✉️', 'Courrier'],
};
const btn = (id, c, label, cls = '', sub = '', dis = false) => `<button class="btn ${cls}" data-act="card" data-id="${id}" data-c="${c}" ${dis ? 'disabled' : ''}>${label}${sub ? `<small>${sub}</small>` : ''}</button>`;

function cardBody(s, c) {
  const id = c.id, up = upsellChance(s, true);
  switch (c.kind) {
    case 'compte': return [`<p><b>${esc(c.name)}</b> veut ouvrir un compte et dépose <b>${money(c.amt)}</b>.</p>`,
      btn(id, 'ouvre', 'Ouvrir le compte', 'success') + (s.prod.carte.on ? btn(id, 'carte', '+ Proposer une carte', '', `${Math.round(Math.min(1, up * 1.3) * 100)} % de chances`) : '') + (s.prod.liv.on ? btn(id, 'livret', '+ Proposer un livret', '', `${Math.round(Math.min(1, up * livChance(s) * 2) * 100)} % de chances`) : '') + btn(id, 'refuse', 'Refuser', 'ghost')];
    case 'suspect': {
      const clue = focusOn(s, 'prudence') || s.upgrades.conformite || chance(0) ? `<div class="fraud">${ic('alert')} Il ${c.clue}.</div>` : `<p class="small muted">Il ${c.clue}…</p>`;
      return [`<p><b>${esc(c.name)}</b> veut ouvrir un compte et déposer <b>${money(c.amt)}</b> en liquide.</p>${clue}`,
        btn(id, 'ouvre', 'Ouvrir le compte', '') + btn(id, 'signale', 'Signaler à TRACFIN', 'danger', 'Soupçon de blanchiment') + btn(id, 'refuse', 'Refuser', 'ghost')];
    }
    case 'depot': return [`<p><b>${esc(c.name)}</b> dépose <b>${money(c.amt)}</b> sur son compte.</p>`,
      btn(id, 'ok', 'Enregistrer', 'success') + (s.prod.liv.on ? btn(id, 'livret', 'Lui conseiller le livret', '', `${Math.round(livChance(s) * 80)} % de chances`) : '')];
    case 'retrait': return [`<p><b>${esc(c.name)}</b> veut retirer <b>${money(c.amt)}</b> en espèces.${staffTotal(s, 'dab') ? '' : ' <span class="muted small">Un distributeur s’en chargerait tout seul.</span>'}</p>`,
      btn(id, 'ok', 'Lui remettre l’argent', 'success', '', false)];
    case 'livret': return [`<p><b>${esc(c.name)}</b> hésite à placer <b>${money(c.amt)}</b> sur un livret à ${pct(s.depositRate, 2)} (concurrents : ${pct(marketDepRate(s), 2)}).</p>`,
      btn(id, 'ok', 'Lui proposer votre livret', 'success', `${Math.round(livChance(s) * 100)} % de chances`) + btn(id, 'prime', `Offrir une prime de ${money(Math.round(c.amt * 0.005))}`, '', 'Presque sûr') + btn(id, 'refuse', 'Ne pas insister', 'ghost')];
    case 'carte': return [`<p><b>${esc(c.name)}</b> voudrait une carte bancaire.</p>`,
      btn(id, 'vend', `Carte classique (${nf0.format(s.prod.carte.fee)} €/an)`, 'success') + btn(id, 'gold', `Proposer la Gold (${nf0.format(s.prod.carte.fee * 2.5)} €/an)`, '', '55 % de chances') + btn(id, 'refuse', 'Refuser', 'ghost')];
    case 'av': return [`<p><b>${esc(c.name)}</b> veut placer <b>${money(c.amt)}</b> pour sa retraite.</p>`,
      btn(id, 'ok', 'Ouvrir une assurance-vie', 'success', `Frais ${pct(s.prod.av.fee)}/an`) + btn(id, 'refuse', 'Refuser', 'ghost')];
    case 'reclam': return [`<p><b>${esc(c.name)}</b> est furieux à cause d’<b>${c.reason}</b>.</p>`,
      btn(id, 'rembourse', `Geste commercial (${money(c.cost)})`, 'success', 'Calme assuré') + btn(id, 'excuse', 'S’excuser', '', '60 % de chances') + btn(id, 'ignore', 'L’ignorer', 'ghost', 'Il risque de partir')];
    case 'pret': {
      const r = c.req;
      return [`<div class="req inline" data-req="${r.id}">${reqInner(s, r)}</div>`,
        `<button class="btn success" data-act="cardLoan" data-id="${id}">Proposer</button>${!r.checked ? `<button class="btn" data-act="cardVerify" data-id="${id}">🔎 Vérifier · ${money(verifyCost(r))}</button>` : ''}<button class="btn" data-act="cardDefer" data-id="${id}">Étudier plus tard</button>${btn(id, 'refuse', 'Refuser', 'ghost')}`];
    }
    case 'reunion': return ['<p>Toute l’équipe est réunie avec les croissants. Quelle est la priorité de la semaine ?</p>',
      btn(id, 'accueil', '😊 Accueil', '', '+20 % de clients servis') + btn(id, 'ventes', '💼 Ventes', '', '+35 % de ventes') + btn(id, 'prudence', '🕵️ Prudence', '', 'Fraudes repérées')];
    case 'facture': return [`<p>Facture de <b>${c.who}</b> : <b>${money(c.amt)}</b>.</p>`,
      btn(id, 'paye', 'Payer', 'success') + btn(id, 'negocie', 'Négocier', '', 'Une chance sur deux')];
    case 'impaye': return [`<p><b>${esc(c.name)}</b> n’a pas payé sa mensualité de <b>${money(c.amt)}</b>.</p>`,
      btn(id, 'appel', 'L’appeler', 'success', '70 % de chances qu’il paie') + btn(id, 'etale', 'Rallonger son prêt d’un an', '', 'Risque de défaut en baisse') + btn(id, 'saisie', 'Saisir ses garanties', 'danger', 'Vous récupérez une partie tout de suite')];
    case 'courrier': return [`<p>${COURRIER[c.letter][1]}</p>`, btn(id, 'ok', 'Répondre gentiment', 'success')];
  }
  return ['', ''];
}

function clientCard(s, c) {
  const [ico, title] = CARD_META[c.kind], b = c.branch && CITIES[c.branch];
  const [body, actions] = cardBody(s, c);
  return `<article class="ccard ${c.task ? 'task' : ''} k-${c.kind}">
    <header><span class="cc-ico">${ico}</span><div class="grow"><b>${title}</b>${b && S.branches.length > 1 ? `<small>${b.name}</small>` : ''}</div></header>
    <div class="cc-body">${body}</div><div class="cc-actions">${actions}</div></article>`;
}

function vToday() {
  const s = S, t = s.today;
  if (!t) startDay(s);
  const left = t.cards.filter(c => !c.done), y = s.yesterday;
  const noStaff = !s.branches.some(b => b.gs || b.bs);
  const o = t.obj, ob = o ? `<div class="dobj ${o.done ? 'done' : ''}"><span>🎯</span><div class="grow"><small>Objectif du jour</small><b>${OBJECTIVES[o.k].txt(o.n)}</b></div><span class="pill ${o.done ? '' : 'gold'}">${o.done ? '✓ Réussi' : '+' + money(o.reward)}</span></div>` : '';
  const yest = y ? `<div class="yest">Hier : <b>${y.comptes}</b> compte${y.comptes > 1 ? 's' : ''} ouvert${y.comptes > 1 ? 's' : ''} · <b>${y.prets}</b> prêt${y.prets > 1 ? 's' : ''} · <b>${y.ventes}</b> vente${y.ventes > 1 ? 's' : ''} · ${y.lost ? `<span class="neg">${y.lost} client${y.lost > 1 ? 's' : ''} perdu${y.lost > 1 ? 's' : ''}</span>` : '<span class="pos">aucun client perdu</span>'}${y.auto ? ` · ${y.auto} traité${y.auto > 1 ? 's' : ''} par l’équipe` : ''}</div>` : '';
  const head = `<section class="card day-head">
    <div class="dh-top"><div><small class="eyebrow">${dateStr(s.day)}</small><h2>${noStaff ? 'Votre agence est encore fermée' : left.length ? `${left.length} client${left.length > 1 ? 's' : ''} à recevoir` : 'Journée terminée !'}</h2>
      <p class="muted small">${noStaff ? 'Construisez un guichet et recrutez un guichetier dans « Ma banque » pour ouvrir vos portes.' : `${t.arrived} visiteurs aujourd’hui${t.lost ? ` · <span class="neg">${t.lost} repartis faute de personnel</span>` : ''}`}</p></div>
      <div class="dh-btns">${left.length ? '<button class="btn" data-act="delegate">Laisser l’équipe gérer</button>' : ''}<button class="btn primary big-next" data-act="nextDay">Jour suivant ▶</button></div></div>
    ${ob}${yest}</section>`;
  const cards = left.length ? `<div class="ccards">${left.map(c => clientCard(s, c)).join('')}</div>` : (noStaff ? '' : '<div class="card muted center">Tout le monde a été reçu. Profitez-en pour aménager vos agences, régler vos produits… puis passez au jour suivant.</div>');
  return head + cards + `<h3 class="sec">Votre banque</h3>` + vDash();
}
