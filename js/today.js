'use strict';
/* =====================================================================
   BANQUE TYCOON — écran « Aujourd'hui » : les clients et les alertes du jour
   ===================================================================== */

const CARD_META = {
  compte: ['🙋', 'Nouveau client'], suspect: ['🕶️', 'Nouveau client'], demande: ['🗣️', 'Demande d’un client'], reclam: ['😠', 'Réclamation'],
  pret: ['🤝', 'Rendez-vous crédit'], pro: ['🏭', 'Rendez-vous entreprise'], av: ['☂️', 'Rendez-vous épargne'],
  decouvert: ['🔴', 'Découvert dépassé'], impaye: ['📞', 'Mensualité impayée'], fraudecb: ['🚨', 'Paiement suspect'],
  reunion: ['☕', 'Réunion du lundi'], facture: ['🧾', 'Facture'], courrier: ['✉️', 'Courrier'],
};
const btn = (id, c, label, cls = '', sub = '', dis = false) => `<button class="btn ${cls}" data-act="card" data-id="${id}" data-c="${c}" ${dis ? 'disabled' : ''}>${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
const who = p => `<button class="linkbtn" data-act="fiche" data-id="${p.i}">${esc(pname(p))}</button>`;
function profileLine(p) {
  return `<div class="profile"><span>${pjob(p)}${p.u ? ' <b class="neg">(au chômage)</b>' : ''}</span><span>Salaire <b>${money(pinc(p))}</b>/mois</span><span>${p.own ? 'Propriétaire' : `Loyer <b>${money(p.r)}</b>`}</span></div>`;
}

function cardBody(s, c) {
  const id = c.id, up = upsellChance(s, true), p = c.pid && findPerson(s, c.pid);
  switch (c.kind) {
    case 'compte': {
      const q = c.p;
      return [`<p><b>${esc(c.name)}</b> veut ouvrir un compte chez vous et y faire verser son salaire.</p>${profileLine(q)}<p class="small muted">Il apporte <b>${money(q.b)}</b>${q.save0 > 300 ? ` et a <b>${money(q.save0)}</b> d’économies` : ''}.</p>`,
        btn(id, 'ouvre', 'Ouvrir le compte', 'success') + (s.prod.carte.on ? btn(id, 'carte', '+ Proposer une carte', '', `${Math.round(Math.min(1, up * 1.6) * 100)} % de chances`) : '') + (s.prod.liv.on && q.save0 > 300 ? btn(id, 'livret', '+ Proposer un livret', '', `${Math.round(Math.min(1, up * livChance(s) * 2) * 100)} % de chances`) : '') + btn(id, 'refuse', 'Refuser', 'ghost')];
    }
    case 'suspect': {
      const clue = focusOn(s, 'prudence') || s.upgrades.conformite ? `<div class="fraud">${ic('alert')} Il ${c.clue}.</div>` : `<p class="small muted">Il ${c.clue}…</p>`;
      return [`<p><b>${esc(c.name)}</b> veut ouvrir un compte et déposer <b>${money(c.amt)}</b> en liquide.</p>${clue}`,
        btn(id, 'ouvre', 'Ouvrir le compte') + btn(id, 'signale', 'Signaler à TRACFIN', 'danger', 'Soupçon de blanchiment') + btn(id, 'refuse', 'Refuser', 'ghost')];
    }
    case 'demande': {
      if (!p) return ['<p class="muted">Ce client est parti.</p>', btn(id, 'ok', 'OK')];
      const st = `<p class="small muted">Solde ${money(p.b)} · découvert autorisé ${money(p.o)}${p.l != null ? ` · livret ${money(p.l)}` : ''}</p>`;
      const D = {
        plafond: [`${who(p)} demande d’augmenter son <b>découvert autorisé</b> (aujourd’hui ${money(p.o)}).`, btn(id, 'ok', `Accepter (+${money(Math.round(p.s * 0.25 / 50) * 50)})`, 'success', 'Plus d’agios, plus de risque') + btn(id, 'refuse', 'Refuser', 'ghost')],
        carte: [`${who(p)} voudrait une <b>carte bancaire</b> (${nf0.format(s.prod.carte.fee)} €/an).`, btn(id, 'ok', 'Lui donner une carte', 'success') + btn(id, 'refuse', 'Refuser', 'ghost')],
        gold: [`${who(p)} gagne bien sa vie. Lui proposer la <b>carte Gold</b> (${nf0.format(s.prod.carte.fee * 2.5)} €/an) ?`, btn(id, 'ok', 'Proposer la Gold', 'success', '85 % de chances') + btn(id, 'refuse', 'Pas maintenant', 'ghost')],
        livret: [`${who(p)} a <b>${money(p.b)}</b> qui dorment sur son compte courant.`, btn(id, 'ok', 'Lui conseiller un livret', 'success', `${Math.round(livChance(s) * 110)} % de chances`) + btn(id, 'refuse', 'Ne rien dire', 'ghost')],
        virement: [`${who(p)} veut envoyer <b>${money(c.amt)}</b> à sa famille à l’étranger.`, btn(id, 'ok', 'Faire le virement', 'success', '15 € de frais') + btn(id, 'refuse', 'Refuser', 'ghost')],
        chequier: [`${who(p)} demande un nouveau chéquier.`, btn(id, 'ok', 'Commander', 'success')],
        cloture: [`${who(p)} veut <b>fermer son compte</b> et partir chez un concurrent.`, (p.b < 0 ? '' : btn(id, 'geste', `Geste commercial (${money(s.prod.cc.fee * 3)})`, 'success', 'Trois mois de frais offerts')) + btn(id, p.b < 0 ? 'refuse' : 'ok', p.b < 0 ? 'Impossible : il est à découvert' : 'Accepter son départ', 'ghost')],
      }[c.sub];
      return [`<p>${D[0]}</p>${st}`, D[1]];
    }
    case 'reclam': return [`<p>${p ? who(p) : esc(c.name)} est furieux à cause d’<b>${c.reason}</b>.</p>`,
      btn(id, 'rembourse', `Geste commercial (${money(c.cost)})`, 'success', 'Calme assuré') + btn(id, 'excuse', 'S’excuser', '', '60 % de chances') + btn(id, 'ignore', 'L’ignorer', 'ghost', 'Il risque de partir')];
    case 'av': return [`<p>${p ? who(p) : esc(c.name)} veut placer <b>${money(c.amt)}</b> pour sa retraite.</p>`,
      btn(id, 'ok', 'Ouvrir une assurance-vie', 'success', `Frais ${pct(s.prod.av.fee)}/an`) + btn(id, 'refuse', 'Refuser', 'ghost')];
    case 'pret': case 'pro': {
      const r = c.req;
      const extra = p ? `${profileLine(p)}${r.debt ? `<p class="small">Il rembourse déjà <b>${money(r.debt)}</b>/mois.</p>` : ''}` : '';
      return [`${extra}<div class="req inline" data-req="${r.id}">${reqInner(s, r)}</div>`,
        `<button class="btn success" data-act="cardLoan" data-id="${id}">Proposer</button>${!r.checked ? `<button class="btn" data-act="cardVerify" data-id="${id}">🔎 Vérifier · ${money(verifyCost(r))}</button>` : ''}<button class="btn" data-act="cardDefer" data-id="${id}">Étudier plus tard</button>${btn(id, 'refuse', 'Refuser', 'ghost')}`];
    }
    case 'decouvert': {
      if (!p) return ['<p class="muted">Situation réglée.</p>', btn(id, 'ok', 'OK')];
      return [`<p>${who(p)} est à <b class="neg">${money(p.b)}</b> alors que son découvert autorisé est de ${money(p.o)}.</p>${profileLine(p)}<p class="small muted">Prochain salaire le ${p.pd + 1} du mois${p.l ? ` · livret ${money(p.l)}` : ''}</p>`,
        btn(id, 'tolere', 'Laisser passer', '', 'Il paiera des agios') + btn(id, 'appel', 'L’appeler', 'success', p.l ? 'Il peut vider son livret' : 'Il peut réduire ses dépenses') + btn(id, 'bloque', 'Limiter sa carte', '', '15 jours') + btn(id, 'rejette', 'Rejeter le prélèvement', 'danger', '20 € de frais, client furieux')];
    }
    case 'impaye': return [`<p><b>${esc(c.name)}</b> n’a pas pu payer sa mensualité de <b>${money(c.amt)}</b>${c.miss > 1 ? ` (<b class="neg">${c.miss}ᵉ impayé</b> : à 3, c’est le contentieux)` : ''}.</p>`,
      btn(id, 'appel', 'L’appeler', 'success', 'Il peut alimenter son compte') + btn(id, 'etale', 'Rallonger son prêt de 2 ans', '', 'Mensualités plus douces') + btn(id, 'saisie', 'Saisir ses garanties', 'danger', 'Vous récupérez une partie')];
    case 'fraudecb': return [`<p>La carte de ${p ? who(p) : esc(c.name)} vient de payer <b>${money(c.amt)}</b> dans ${c.where}, ${c.when}.</p>`,
      btn(id, 'bloque', 'Bloquer la carte', 'danger', 'Une nouvelle carte sera envoyée') + btn(id, 'laisse', 'Laisser passer', '', 'C’est peut-être vraiment lui')];
    case 'reunion': return ['<p>Toute l’équipe est réunie avec les croissants. Quelle est la priorité de la semaine ?</p>',
      btn(id, 'accueil', '😊 Accueil', '', '+20 % de visiteurs servis') + btn(id, 'ventes', '💼 Ventes', '', '+35 % de ventes') + btn(id, 'prudence', '🕵️ Prudence', '', 'Fraudes repérées')];
    case 'facture': return [`<p>Facture de <b>${c.who}</b> : <b>${money(c.amt)}</b>.</p>`,
      btn(id, 'paye', 'Payer', 'success') + btn(id, 'negocie', 'Négocier', '', 'Une chance sur deux')];
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

function starsLine(s, t) {
  if (!(t.total || t.cards.length)) return '';
  const r = starRules(s, t), nx = r.find(x => !x[1]);
  return `<div class="dstars"><span class="st-lbl">Étoiles du jour</span>${r.map(([txt, ok]) => `<span class="st ${ok ? 'on' : ''}" title="${txt}">★</span>`).join('')}<small class="muted">${nx ? 'Prochaine : ' + nx[0].toLowerCase() : 'Les 3 étoiles sont à vous !'} · touches <kbd>1</kbd> à <kbd>5</kbd> pour répondre vite</small></div>`;
}
function vToday() {
  const s = S;
  if (!s.today) startDay(s);
  const t = s.today, left = t.cards.filter(c => !c.done), y = s.yesterday;
  const noStaff = !s.branches.some(b => b.gs || b.bs);
  const o = t.obj, ob = o ? `<div class="dobj ${o.done ? 'done' : ''}"><span>🎯</span><div class="grow"><small>Objectif du jour</small><b>${OBJECTIVES[o.k].txt(o.n)}</b></div><span class="pill ${o.done ? '' : 'gold'}">${o.done ? '✓ Réussi' : '+' + money(o.reward)}</span></div>` : '';
  const yest = y ? `<div class="yest">Hier : <b>${y.comptes}</b> compte${y.comptes > 1 ? 's' : ''} ouvert${y.comptes > 1 ? 's' : ''} · <b>${y.prets}</b> prêt${y.prets > 1 ? 's' : ''} · <b>${y.ventes}</b> vente${y.ventes > 1 ? 's' : ''} · ${y.lost ? `<span class="neg">${y.lost} visiteur${y.lost > 1 ? 's' : ''} non reçu${y.lost > 1 ? 's' : ''}</span>` : '<span class="pos">tout le monde reçu</span>'}${y.auto ? ` · ${y.auto} traité${y.auto > 1 ? 's' : ''} par l’équipe` : ''}</div>` : '';
  const dom = s.day % 30 + 1, cal = dom === 28 ? '💶 Jour de paie : les salaires arrivent sur les comptes.' : dom === 5 ? '🏠 Les loyers sont prélevés aujourd’hui.' : dom === 10 ? '📄 Prélèvement des factures (électricité, téléphone, assurances).' : dom === 1 && s.day > 1 ? '📆 Nouveau mois : mensualités de prêt prélevées, frais, cotisations, agios et intérêts du livret.' : '';
  const flows = s.people.length ? `<div class="flows"><span>👥 <b>${nf0.format(s.clients)}</b> clients</span><span>💳 Sur les comptes <b>${money(s.depCC)}</b></span><span>🐷 Livrets <b>${money(s.depLiv)}</b></span><span class="${s.ovd ? 'neg' : ''}">🔴 Découverts <b>${money(s.ovd)}</b></span></div>` : '';
  const head = `<section class="card day-head">
    <div class="dh-top"><div><small class="eyebrow">${dateStr(s.day)}</small><h2>${noStaff ? 'Votre agence est encore fermée' : left.length ? `${left.length} situation${left.length > 1 ? 's' : ''} à traiter` : 'Journée terminée !'}</h2>
      <p class="muted small">${noStaff ? 'Construisez un guichet et recrutez un guichetier dans « Ma banque » pour ouvrir vos portes.' : `${t.arrived} visiteurs aujourd’hui${t.lost ? ` · <span class="neg">${t.lost} repartis faute de personnel</span>` : ''}`}</p></div>
      <div class="dh-btns">${left.length ? '<button class="btn" data-act="delegate">Laisser l’équipe gérer</button>' : ''}<button class="btn primary big-next ${left.length ? '' : 'pulse'}" data-act="nextDay">Jour suivant ▶</button></div></div>
    ${cal ? `<div class="cal">${cal}</div>` : ''}${flows}${ob}${starsLine(s, t)}${yest}</section>`;
  const cards = left.length ? `<div class="ccards">${left.map(c => clientCard(s, c)).join('')}</div>` : (noStaff ? '' : '<div class="card muted center">Tout est traité. Profitez-en pour aménager vos agences ou consulter vos clients… puis passez au jour suivant.</div>');
  return head + cards + `<h3 class="sec">Votre banque</h3>` + vDash();
}
