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

const cmeta = (s, c) => c.kind === 'story' ? storyMeta(s, c) : CARD_META[c.kind];
function cardBody(s, c) {
  if (c.kind === 'story') return storyBody(s, c);
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
    case 'reclam': return [`<p>${p ? who(p) : esc(c.name)} est furieux à cause d’<b>${c.reason}</b>.${c.esc ? ' Il menace d’aller raconter son histoire au journal !' : ''}</p>`,
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
  return p && p.i ? avatar({ face: personFace(p), role: 'client', trait: p.q < 40 ? 'raleur' : '' }, size) : `<span class="cc-ico" style="width:${size}px;height:${size}px">${cmeta(s, c)[0]}</span>`;
}
function cardWho(s, c) {
  const p = c.kind === 'compte' ? c.p : c.pid && findPerson(s, c.pid);
  return p && p.i ? pname(p) : c.kind === 'story' ? cmeta(s, c)[1] : c.name || CARD_META[c.kind][1];
}

function clientCard(s, c, n, tot) {
  const title = (c.esc ? 'Remonté par l’équipe · ' : '') + (c.kind === 'story' && c.pid ? cmeta(s, c)[1] : c.sid === 'liquidite' ? 'Alerte de la direction' : c.sid === 'direction' ? 'Décision de direction' : c.kind === 'story' ? 'Vie du quartier' : c.back ? 'Un client fidèle revient' : CARD_META[c.kind][1]), b = c.branch && CITIES[c.branch];
  const [body, actions] = cardBody(s, c);
  return `<article class="ccard focus-card ${c.task ? 'task' : ''} k-${c.kind}">
    <header>${cardFace(s, c, 52)}<div class="grow"><small class="eyebrow">${title}${b && S.branches.length > 1 ? ' · ' + b.name : ''}</small><h2>${esc(cardWho(s, c))}</h2></div>${c.exp ? `<span class="cc-count" title="Sans décision, votre équipe tranchera">⏳ ${Math.max(0, c.exp - s.day)} j</span>` : ''}</header>
    <div class="cc-body">${body}</div><div class="cc-actions">${actions}</div></article>`;
}

function vToday() {
  const s = S;
  if (!s.today) startDay(s);
  const t = s.today, left = t.cards.filter(c => !c.done);
  const noStaff = !hasStaff(s);
  const cur = left.find(c => c.id === ui.focusCard) || left[0];

  // La scène : votre agence qui vit
  const sb = getBranch(s, ui.branch) || s.branches[0];
  const lost = Math.round(s.flags.lostAvg || 0);
  const scene = sb ? `<div class="scene"><div class="scene-tag"><b>${CITIES[sb.id].name}</b><span class="pill">${dateStr(s.day)}</span></div>${t.sd ? `<div class="scene-sd"><b>${t.sd.ico} ${t.sd.name}</b><small>${t.sd.desc}</small></div>` : ''}
    <button class="btn sm scene-go" data-act="tab" data-tab="plan">Aménager l’agence</button>
    <canvas id="floor" data-mini="1" data-maxh="${innerWidth < 700 ? 200 : 280}" role="img" aria-label="Votre agence, vue en 3D"></canvas>
    ${t.arrived ? `<div class="scene-stats"><span>🚶 ${t.arrived} visiteurs par jour</span>${lost ? `<span class="neg">😤 ${lost} repartent faute de place</span>` : ''}</div>` : ''}</div>` : '';

  // Le résultat, en direct
  const E = dailyEstimate(s), dom = s.day % 30 + 1;
  const profit = !noStaff ? `<section class="side-box profit ${E.net >= 0 ? 'up' : 'down'}"><h3>💰 Votre résultat</h3>
      <div class="pf-big ${E.net >= 0 ? 'pos' : 'neg'}">${E.net >= 0 ? '+' : '−'}${money(Math.abs(E.net))}<small> / jour</small></div>
      <div class="pf-rows">
        <span>Intérêts des prêts</span><b class="pos">+${money(E.interest)}</b>
        <span>Frais, cartes et dossiers</span><b class="pos">+${money(E.fees)}</b>
        ${E.other >= 1 ? `<span>Placements et distributeurs</span><b class="pos">+${money(E.other)}</b>` : ''}
        ${E.livret >= 1 ? `<span>Intérêts des livrets</span><b class="neg">−${money(E.livret)}</b>` : ''}
        <span>Salaires et loyers</span><b class="neg">−${money(E.costs)}</b>
        ${E.net > 0 ? `<span>Impôt sur les bénéfices</span><b class="neg">−${money(E.net / 3)}</b>` : ''}
      </div>
      <small class="muted">${E.net >= 0 ? 'Vous gagnez de l’argent ! ' : 'Vous perdez de l’argent : '}${E.net >= 0 ? 'Prêtez davantage pour gagner plus.' : (loansOpen(s) ? 'les prêts sont votre première source de revenus.' : 'ouvrez des comptes pour pouvoir prêter bientôt.')} Bilan complet dans ${30 - dom + 1} jour${30 - dom + 1 > 1 ? 's' : ''}.</small></section>` : '';

  // Le bureau
  let main;
  if (noStaff) main = `<div class="empty-desk"><div class="ed-ico">🏦</div><h2>Votre agence est encore fermée</h2><p class="muted">Construisez un guichet et recrutez un guichetier : le temps démarrera et vos premiers clients arriveront tout seuls.</p><button class="btn primary big" data-act="tab" data-tab="plan">Aller dans Ma banque</button></div>`;
  else if (cur) main = clientCard(s, cur) + `<p class="hint">Touches <kbd>1</kbd> à <kbd>5</kbd> pour répondre · <kbd>Espace</kbd> pour mettre en pause</p>`;
  else main = `<div class="empty-desk calm-desk"><div class="ed-ico">☕</div><h2>Aucun dossier sur votre bureau</h2><p class="muted">Votre banque tourne toute seule. Investissez pour la faire grandir : les dossiers importants apparaîtront ici.</p></div>`;

  const queue = left.length > 1 ? `<section class="side-box"><h3>Sur votre bureau <span class="muted">${left.length}</span></h3><div class="queue">${left.filter(c => c !== cur).map(c => `<button class="q-item" data-act="focusCard" data-id="${c.id}">${cardFace(s, c, 28)}<span class="grow"><b>${esc(cardWho(s, c))}</b><small>${c.kind === 'story' ? cmeta(s, c)[1] : CARD_META[c.kind][1]} · ⏳ ${Math.max(0, c.exp - s.day)} j</small></span></button>`).join('')}</div>
      <button class="btn ghost full small-btn" data-act="delegate">Tout confier à l’équipe</button></section>` : '';
  const tq = avgTeamQ(s), stars = Math.round(tq / 0.9 * 4) + 1;
  const team = s.people.length ? `<section class="side-box gerant"><h3>🧑‍💼 Votre équipe</h3>
      <div class="gr-q"><span>Compétence</span><b><span class="gold-t">${'★'.repeat(stars)}</span><span class="st-off">${'★'.repeat(5 - stars)}</span></b></div>
      <p class="small muted">Elle ouvre les comptes, vend, gère les découverts${loansOpen(s) ? ` et signe seule les prêts jusqu’à <b>${money(seuil(s))}</b>` : ''}. Plus elle est formée, mieux elle décide.</p>
      ${s.flags.mTeam ? `<p class="small">Ce mois-ci : <b>${s.flags.mTeam.comptes || 0}</b> comptes ouverts · <b>${s.flags.mTeam.prets || 0}</b> prêts signés${s.flags.mTeam.fraud ? ` · <b>${s.flags.mTeam.fraud}</b> fraudes déjouées` : ''}</p>` : ''}</section>` : '';
  const figures = s.people.length ? `<section class="side-box"><h3>Vos clients</h3><dl class="figs">
      <div><dt>Clients</dt><dd>${nf0.format(s.clients)}</dd></div><div><dt>Sur les comptes</dt><dd>${money(s.depCC)}</dd></div>
      <div><dt>Livrets</dt><dd>${money(s.depLiv)}</dd></div><div><dt>Prêts en cours</dt><dd>${money(loansOut(s))}</dd></div></dl></section>` : '';
  const bil = s.flags.bilan ? `<button class="side-box chap bil" data-act="bilan"><small>Dernier bilan mensuel</small><b class="${s.flags.bilan.pl.net >= 0 ? 'pos' : 'neg'}">${s.flags.bilan.pl.net >= 0 ? '+' : '−'}${money(Math.abs(s.flags.bilan.pl.net))}</b><span class="muted">Voir d’où vient l’argent</span></button>` : '';
  const ch = CHAPTERS[s.chapter];
  const chap = ch ? `<button class="side-box chap" data-act="tab" data-tab="missions"><small>Chapitre ${s.chapter + 1} · objectif de la campagne</small><b>${ch.name}</b><span class="muted">${ch.goals.map(g => { const v = g.cur(s); return `${v >= g.goal ? '✅' : '▫️'} ${g.txt} : ${g.fmt ? g.fmt(Math.min(v, g.goal)) : nf0.format(Math.min(v, g.goal))} / ${g.fmt ? g.fmt(g.goal) : nf0.format(g.goal)}`; }).join('<br>')}</span></button>` : '';

  return scene + `<div class="desk"><div class="desk-main">${main}${noStaff ? '' : growthHTML(s)}</div><aside class="desk-side">${profit}${chap}${queue}${team}${figures}${bil}</aside></div>
    <details class="more dash-more"><summary>Votre banque en détail</summary>${vDash()}</details>`;
}
