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

// Le visage du client quand c'est une personne, sinon une icône
function cardFace(s, c, size) {
  const p = c.kind === 'compte' ? c.p : c.pid && findPerson(s, c.pid);
  return p && p.i ? avatar({ face: personFace(p), role: 'client', trait: p.q < 40 ? 'raleur' : '' }, size) : `<span class="cc-ico" style="width:${size}px;height:${size}px">${CARD_META[c.kind][0]}</span>`;
}
function cardWho(s, c) {
  const p = c.kind === 'compte' ? c.p : c.pid && findPerson(s, c.pid);
  return p && p.i ? pname(p) : c.name || CARD_META[c.kind][1];
}

function clientCard(s, c, n, tot) {
  const [, title] = CARD_META[c.kind], b = c.branch && CITIES[c.branch];
  const [body, actions] = cardBody(s, c);
  return `<article class="ccard focus-card ${c.task ? 'task' : ''} k-${c.kind}">
    <header>${cardFace(s, c, 52)}<div class="grow"><small class="eyebrow">${title}${b && S.branches.length > 1 ? ' · ' + b.name : ''}</small><h2>${esc(cardWho(s, c))}</h2></div><span class="cc-count">${n} / ${tot}</span></header>
    <div class="cc-body">${body}</div><div class="cc-actions">${actions}</div></article>`;
}

function vToday() {
  const s = S;
  if (!s.today) startDay(s);
  const t = s.today, left = t.cards.filter(c => !c.done), y = s.yesterday, tot = t.cards.length;
  const noStaff = !s.branches.some(b => b.gs || b.bs);
  let cur = left.find(c => c.id === ui.focusCard) || left[0];
  const n = t.cards.filter(c => c.done).length + 1;

  // Colonne principale : un seul client à la fois
  let main;
  if (noStaff) main = `<div class="empty-desk"><div class="ed-ico">🏦</div><h2>Votre agence est encore fermée</h2><p class="muted">Construisez un guichet et recrutez un guichetier dans <b>Ma banque</b> pour ouvrir vos portes.</p><button class="btn primary big" data-act="tab" data-tab="plan">Aller dans Ma banque</button></div>`;
  else if (cur) main = clientCard(s, cur, n, tot) + `<p class="hint">Touches <kbd>1</kbd> à <kbd>5</kbd> pour répondre · enchaînez vite pour faire des combos</p>`;
  else if (!tot && !y) main = `<div class="empty-desk"><div class="ed-ico">🚪</div><h2>Tout est prêt !</h2><p class="muted">Vos portes ouvrent demain matin. Passez au jour suivant pour accueillir vos premiers clients.</p><button class="btn primary big big-next pulse" data-act="nextDay">Jour suivant ▶</button></div>`;
  else main = `<div class="empty-desk"><div class="ed-ico">✅</div><h2>Journée terminée</h2><p class="muted">${tot ? `Vous avez reçu ${tot} personne${tot > 1 ? 's' : ''}.` : 'Personne n’est venu aujourd’hui.'}${t.lost ? ` <span class="neg">${t.lost} sont repartis faute de personnel.</span>` : ''}</p><button class="btn primary big big-next pulse" data-act="nextDay">Jour suivant ▶</button></div>`;

  // Colonne de droite : objectif, étoiles, file d'attente, chiffres
  const o = t.obj, rules = tot ? starRules(s, t) : [];
  const goal = (o || rules.length) ? `<section class="side-box">
      ${o ? `<div class="sb-goal ${o.done ? 'done' : ''}"><small>Objectif du jour</small><b>${OBJECTIVES[o.k].txt(o.n)}</b><span>${o.done ? '✓ Réussi' : '+' + money(o.reward)}</span></div>` : ''}
      ${rules.length ? `<ul class="sb-stars">${rules.map(([txt, ok]) => `<li class="${ok ? 'on' : ''}"><span>★</span>${txt}</li>`).join('')}</ul>` : ''}</section>` : '';
  const queue = left.length > 1 || (left.length && cur !== left[0]) ? `<section class="side-box"><h3>En attente <span class="muted">${left.length - 1}</span></h3><div class="queue">${left.filter(c => c !== cur).map(c => `<button class="q-item" data-act="focusCard" data-id="${c.id}">${cardFace(s, c, 28)}<span class="grow"><b>${esc(cardWho(s, c))}</b><small>${CARD_META[c.kind][1]}</small></span></button>`).join('')}</div>
      <button class="btn ghost full small-btn" data-act="delegate">Laisser l’équipe gérer le reste</button></section>` : '';
  const dom = s.day % 30 + 1, cal = dom === 28 ? '💶 Jour de paie : les salaires arrivent.' : dom === 5 ? '🏠 Les loyers sont prélevés.' : dom === 10 ? '📄 Prélèvement des factures.' : dom === 1 && s.day > 1 ? '📆 Nouveau mois : mensualités, frais et intérêts.' : '';
  const figures = s.people.length ? `<section class="side-box"><h3>Vos clients</h3><dl class="figs">
      <div><dt>Clients</dt><dd>${nf0.format(s.clients)}</dd></div><div><dt>Sur les comptes</dt><dd>${money(s.depCC)}</dd></div>
      <div><dt>Livrets</dt><dd>${money(s.depLiv)}</dd></div><div><dt>Découverts</dt><dd class="${s.ovd ? 'neg' : ''}">${money(s.ovd)}</dd></div></dl>
      ${cal ? `<p class="sb-note">${cal}</p>` : ''}${y ? `<p class="sb-note muted">Hier : ${y.comptes} compte${y.comptes > 1 ? 's' : ''}, ${y.prets} prêt${y.prets > 1 ? 's' : ''}, ${y.ventes} vente${y.ventes > 1 ? 's' : ''}${y.lost ? `, <span class="neg">${y.lost} non reçu${y.lost > 1 ? 's' : ''}</span>` : ''}</p>` : ''}</section>` : '';
  const ch = CHAPTERS[s.chapter];
  const chap = ch ? `<button class="side-box chap" data-act="tab" data-tab="missions"><small>Chapitre ${s.chapter + 1} · objectif de la campagne</small><b>${ch.name}</b><span class="muted">${ch.desc}</span></button>` : '';

  const sb = getBranch(s, ui.branch) || s.branches[0];
  const scene = sb ? `<div class="scene"><div class="scene-tag"><b>${CITIES[sb.id].name}</b><span class="pill">${dateStr(s.day)}</span></div>
    <button class="btn sm scene-go" data-act="tab" data-tab="plan">Aménager l’agence</button>
    <canvas id="floor" data-mini="1" data-maxh="${innerWidth < 700 ? 200 : 280}" role="img" aria-label="Votre agence, vue en 3D"></canvas>
    ${t.arrived ? `<div class="scene-stats"><span>🚶 ${t.arrived} visiteur${t.arrived > 1 ? 's' : ''} aujourd’hui</span>${t.lost ? `<span class="neg">😤 ${t.lost} reparti${t.lost > 1 ? 's' : ''}</span>` : ''}</div>` : ''}</div>` : '';
  return scene + `<div class="desk"><div class="desk-main">${main}</div><aside class="desk-side">${goal}${queue}${figures}${chap}</aside></div>
    <details class="more dash-more"><summary>Votre banque en détail</summary>${vDash()}</details>`;
}
