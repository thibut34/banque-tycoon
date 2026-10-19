'use strict';
/* =====================================================================
   BANQUE TYCOON — écran « Aujourd'hui » : les clients et les alertes du jour
   ===================================================================== */

const CARD_META = {
  compte: ['🙋', _t('Nouveau client')], suspect: ['🕶️', _t('Nouveau client')], demande: ['🗣️', _t('Demande d’un client')], reclam: ['😠', _t('Réclamation')],
  pret: ['🤝', _t('Rendez-vous crédit')], pro: ['🏭', _t('Rendez-vous entreprise')], av: ['☂️', _t('Rendez-vous épargne')],
  decouvert: ['🔴', _t('Découvert dépassé')], impaye: ['📞', _t('Mensualité impayée')], fraudecb: ['🚨', _t('Paiement suspect')],
  reunion: ['☕', _t('Réunion du lundi')], facture: ['🧾', _t('Facture')], courrier: ['✉️', _t('Courrier')],
};
const btn = (id, c, label, cls = '', sub = '', dis = false) => `<button class="btn ${cls}" data-act="card" data-id="${id}" data-c="${c}" ${dis ? 'disabled' : ''}>${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
const who = p => `<button class="linkbtn" data-act="fiche" data-id="${p.i}">${esc(pname(p))}</button>`;
function profileLine(p) {
  return _l`<div class="profile"><span>${pjob(p)}${p.u ? _t(' <b class="neg">(au chômage)</b>') : ''}</span><span>Salaire <b>${money(pinc(p))}</b>/mois</span><span>${p.own ? _t('Propriétaire') : _l`Loyer <b>${money(p.r)}</b>`}</span></div>`;
}

const cmeta = (s, c) => c.kind === 'story' ? storyMeta(s, c) : CARD_META[c.kind];
function cardBody(s, c) {
  if (c.kind === 'story') return storyBody(s, c);
  const id = c.id, up = upsellChance(s, true), p = c.pid && findPerson(s, c.pid);
  switch (c.kind) {
    case 'compte': {
      const q = c.p;
      return [_l`<p><b>${esc(c.name)}</b> veut ouvrir un compte chez vous et y faire verser son salaire.</p>${profileLine(q)}<p class="small muted">Il apporte <b>${money(q.b)}</b>${q.save0 > 300 ? _l` et a <b>${money(q.save0)}</b> d’économies` : ''}.</p>`,
        btn(id, 'ouvre', _t('Ouvrir le compte'), 'success') + (s.prod.carte.on ? btn(id, 'carte', _t('+ Proposer une carte'), '', _l`${Math.round(Math.min(1, up * 1.6) * 100)} % de chances`) : '') + (s.prod.liv.on && q.save0 > 300 ? btn(id, 'livret', _t('+ Proposer un livret'), '', _l`${Math.round(Math.min(1, up * livChance(s) * 2) * 100)} % de chances`) : '') + btn(id, 'refuse', _t('Refuser'), 'ghost')];
    }
    case 'suspect': {
      const clue = focusOn(s, 'prudence') || s.upgrades.conformite ? _l`<div class="fraud">${ic('alert')} Il ${c.clue}.</div>` : _l`<p class="small muted">Il ${c.clue}…</p>`;
      return [_l`<p><b>${esc(c.name)}</b> veut ouvrir un compte et déposer <b>${money(c.amt)}</b> en liquide.</p>${clue}`,
        btn(id, 'ouvre', _t('Ouvrir le compte')) + btn(id, 'signale', _t('Signaler à TRACFIN'), 'danger', _t('Soupçon de blanchiment')) + btn(id, 'refuse', _t('Refuser'), 'ghost')];
    }
    case 'demande': {
      if (!p) return [_t('<p class="muted">Ce client est parti.</p>'), btn(id, 'ok', 'OK')];
      const st = _l`<p class="small muted">Solde ${money(p.b)} · découvert autorisé ${money(p.o)}${p.l != null ? _l` · livret ${money(p.l)}` : ''}</p>`;
      const D = {
        plafond: [_l`${who(p)} demande d’augmenter son <b>découvert autorisé</b> (aujourd’hui ${money(p.o)}).`, btn(id, 'ok', _l`Accepter (+${money(Math.round(p.s * 0.25 / 50) * 50)})`, 'success', _t('Plus d’agios, plus de risque')) + btn(id, 'refuse', _t('Refuser'), 'ghost')],
        carte: [_l`${who(p)} voudrait une <b>carte bancaire</b> (${nf0.format(s.prod.carte.fee)} €/an).`, btn(id, 'ok', _t('Lui donner une carte'), 'success') + btn(id, 'refuse', _t('Refuser'), 'ghost')],
        gold: [_l`${who(p)} gagne bien sa vie. Lui proposer la <b>carte Gold</b> (${nf0.format(s.prod.carte.fee * 2.5)} €/an) ?`, btn(id, 'ok', _t('Proposer la Gold'), 'success', _t('85 % de chances')) + btn(id, 'refuse', _t('Pas maintenant'), 'ghost')],
        livret: [_l`${who(p)} a <b>${money(p.b)}</b> qui dorment sur son compte courant.`, btn(id, 'ok', _t('Lui conseiller un livret'), 'success', _l`${Math.round(livChance(s) * 110)} % de chances`) + btn(id, 'refuse', _t('Ne rien dire'), 'ghost')],
        virement: [_l`${who(p)} veut envoyer <b>${money(c.amt)}</b> à sa famille à l’étranger.`, btn(id, 'ok', _t('Faire le virement'), 'success', _t('15 € de frais')) + btn(id, 'refuse', _t('Refuser'), 'ghost')],
        chequier: [_l`${who(p)} demande un nouveau chéquier.`, btn(id, 'ok', _t('Commander'), 'success')],
        cloture: [_l`${who(p)} veut <b>fermer son compte</b> et partir chez un concurrent.`, (p.b < 0 ? '' : btn(id, 'geste', _l`Geste commercial (${money(s.prod.cc.fee * 3)})`, 'success', _t('Trois mois de frais offerts'))) + btn(id, p.b < 0 ? 'refuse' : 'ok', p.b < 0 ? _t('Impossible : il est à découvert') : _t('Accepter son départ'), 'ghost')],
      }[c.sub];
      return [`<p>${D[0]}</p>${st}`, D[1]];
    }
    case 'reclam': return [_l`<p>${p ? who(p) : esc(c.name)} est furieux à cause d’<b>${c.reason}</b>.${c.esc ? _t(' Il menace d’aller raconter son histoire au journal !') : ''}</p>`,
      btn(id, 'rembourse', _l`Geste commercial (${money(c.cost)})`, 'success', _t('Calme assuré')) + btn(id, 'excuse', _t('S’excuser'), '', _t('60 % de chances')) + btn(id, 'ignore', _t('L’ignorer'), 'ghost', _t('Il risque de partir'))];
    case 'av': return [_l`<p>${p ? who(p) : esc(c.name)} veut placer <b>${money(c.amt)}</b> pour sa retraite.</p>`,
      btn(id, 'ok', _t('Ouvrir une assurance-vie'), 'success', _l`Frais ${pct(s.prod.av.fee)}/an`) + btn(id, 'refuse', _t('Refuser'), 'ghost')];
    case 'pret': case 'pro': {
      const r = c.req;
      const extra = p ? `${profileLine(p)}${r.debt ? _l`<p class="small">Il rembourse déjà <b>${money(r.debt)}</b>/mois.</p>` : ''}` : '';
      return [`${extra}<div class="req inline" data-req="${r.id}">${reqInner(s, r)}</div>`,
        _l`<button class="btn success" data-act="cardLoan" data-id="${id}">Proposer</button>${!r.checked ? _l`<button class="btn" data-act="cardVerify" data-id="${id}">🔎 Vérifier · ${money(verifyCost(r))}</button>` : ''}<button class="btn" data-act="cardDefer" data-id="${id}">Étudier plus tard</button>${btn(id, 'refuse', _t('Refuser'), 'ghost')}`];
    }
    case 'decouvert': {
      if (!p) return [_t('<p class="muted">Situation réglée.</p>'), btn(id, 'ok', 'OK')];
      return [_l`<p>${who(p)} est à <b class="neg">${money(p.b)}</b> alors que son découvert autorisé est de ${money(p.o)}.</p>${profileLine(p)}<p class="small muted">Prochain salaire le ${p.pd + 1} du mois${p.l ? _l` · livret ${money(p.l)}` : ''}</p>`,
        btn(id, 'tolere', _t('Laisser passer'), '', _t('Il paiera des agios')) + btn(id, 'appel', _t('L’appeler'), 'success', p.l ? _t('Il peut vider son livret') : _t('Il peut réduire ses dépenses')) + btn(id, 'bloque', _t('Limiter sa carte'), '', _t('15 jours')) + btn(id, 'rejette', _t('Rejeter le prélèvement'), 'danger', _t('20 € de frais, client furieux'))];
    }
    case 'impaye': return [_l`<p><b>${esc(c.name)}</b> n’a pas pu payer sa mensualité de <b>${money(c.amt)}</b>${c.miss > 1 ? _l` (<b class="neg">${c.miss}ᵉ impayé</b> : à 3, c’est le contentieux)` : ''}.</p>`,
      btn(id, 'appel', _t('L’appeler'), 'success', _t('Il peut alimenter son compte')) + btn(id, 'etale', _t('Rallonger son prêt de 2 ans'), '', _t('Mensualités plus douces')) + btn(id, 'saisie', _t('Saisir ses garanties'), 'danger', _t('Vous récupérez une partie'))];
    case 'fraudecb': return [_l`<p>La carte de ${p ? who(p) : esc(c.name)} vient de payer <b>${money(c.amt)}</b> dans ${c.where}, ${c.when}.</p>`,
      btn(id, 'bloque', _t('Bloquer la carte'), 'danger', _t('Une nouvelle carte sera envoyée')) + btn(id, 'laisse', _t('Laisser passer'), '', _t('C’est peut-être vraiment lui'))];
    case 'reunion': return [_t('<p>Toute l’équipe est réunie avec les croissants. Quelle est la priorité de la semaine ?</p>'),
      btn(id, 'accueil', _t('😊 Accueil'), '', _t('+20 % de visiteurs servis')) + btn(id, 'ventes', _t('💼 Ventes'), '', _t('+35 % de ventes')) + btn(id, 'prudence', _t('🕵️ Prudence'), '', _t('Fraudes repérées'))];
    case 'facture': return [_l`<p>Facture de <b>${c.who}</b> : <b>${money(c.amt)}</b>.</p>`,
      btn(id, 'paye', _t('Payer'), 'success') + btn(id, 'negocie', _t('Négocier'), '', _t('Une chance sur deux'))];
    case 'courrier': return [`<p>${COURRIER[c.letter][1]}</p>`, btn(id, 'ok', _t('Répondre gentiment'), 'success')];
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
  const title = (c.esc ? _t('Remonté par l’équipe · ') : '') + (c.kind === 'story' && c.pid ? cmeta(s, c)[1] : c.sid === 'liquidite' ? _t('Alerte de la direction') : c.sid === 'direction' ? _t('Décision de direction') : c.kind === 'story' ? _t('Vie du quartier') : c.back ? _t('Un client fidèle revient') : CARD_META[c.kind][1]), b = c.branch && CITIES[c.branch];
  const [body, actions] = cardBody(s, c);
  return `<article class="ccard focus-card ${c.task ? 'task' : ''} k-${c.kind}">
    <header>${cardFace(s, c, 52)}<div class="grow"><small class="eyebrow">${title}${b && S.branches.length > 1 ? ' · ' + b.name : ''}</small><h2>${esc(cardWho(s, c))}</h2></div>${c.exp ? `<span class="cc-count" title="Sans décision, votre équipe tranchera">⏳ ${Math.max(0, c.exp - s.day)} j</span>` : ''}</header>
    <div class="cc-body">${body}</div><div class="cc-actions">${actions}</div></article>`;
}

// Hauteur de l'agence : elle doit tenir dans l'écran (iframe 16:9 de CrazyGames)
const dashSceneH = () => innerWidth < 1000 ? (innerWidth < 700 ? 280 : 360) : Math.max(320, Math.min(620, innerHeight - 150));
function vToday() {
  const s = S;
  if (!s.today) startDay(s);
  const t = s.today, left = t.cards.filter(c => !c.done);
  const noStaff = !hasStaff(s);
  if (!getBranch(s, ui.branch)) ui.branch = HQ;
  const sb = getBranch(s, ui.branch) || s.branches[0];

  // L'agence, en grand : c'est ici que tout se passe
  const chips = s.branches.length > 1 ? `<div class="scene-br">${s.branches.map(b => `<button class="chip ${b.id === sb.id ? 'on' : ''}" data-act="sceneBr" data-id="${b.id}">${CITIES[b.id].name}</button>`).join('')}</div>` : '';
  const scene = _l`<div class="scene live"><div class="scene-tag"><b>${CITIES[sb.id].name}</b><span class="pill">${dateStr(s.day)}</span></div>${chips}${t.sd ? `<div class="scene-sd"><b>${t.sd.ico} ${t.sd.name}</b><small>${t.sd.desc}</small></div>` : ''}
    <button class="btn sm scene-go" data-act="tab" data-tab="plan">⚙ Équipe et décor</button>
    <canvas id="floor" data-keep="1" data-zoom="1.12" data-maxh="${dashSceneH()}" role="img" aria-label="Votre agence en direct : clients, guichets et bureaux"></canvas>
    ${noStaff && !tutStep(s) ? _l`<div class="scene-help">👆 Cliquez sur le <b>＋</b> pour construire votre premier guichet, puis sur <b>Embaucher</b>.</div>` : `<div class="scene-stats" id="liveStats"></div>${s.day < 20 ? _l`<div class="scene-legend"><span>🙋 compte</span><span>💬 opération</span><span>🏠 crédit</span><span>🏧 retrait</span><span>…/🔴 attend trop</span></div>` : _l`<div class="scene-tip">Cliquez sur un guichet ou un bureau pour l’améliorer</div>`}`}</div>`;

  // Les dossiers du PDG
  const dossiers = left.length ? _l`<section class="inbox"><h3>📥 Dossiers du PDG <span class="badge">${left.length}</span></h3>${left.map(c => {
    const [ico, title] = cmeta(s, c), d = Math.max(0, c.exp - s.day);
    return `<button class="ib-item ${c.esc ? 'esc' : ''}" data-act="openCard" data-id="${c.id}">${cardFace(s, c, 40)}<span class="grow"><small>${c.esc ? _t('Remonté par l’équipe · ') : ''}${c.kind === 'story' ? (c.sid === 'direction' ? _t('Décision de direction') : c.pid ? _t('Histoire de client') : c.sid === 'liquidite' ? _t('Alerte') : _t('Vie du quartier')) : title}</small><b>${esc(cardWho(s, c))}</b>${c.req ? `<em>${money(c.req.amount)} · ${LOAN_TYPES[c.req.type].label}</em>` : ''}</span><span class="ib-exp ${d <= 1 ? 'neg' : ''}">⏳ ${d} j</span></button>`;
  }).join('')}</section>` : (noStaff ? '' : _l`<section class="inbox calm"><h3>📥 Dossiers du PDG</h3><p class="muted small">Rien pour l’instant. Les gros prêts, les cas délicats et les décisions importantes arriveront ici, sans arrêter le jeu.</p></section>`);

  // Le résultat, en direct
  const E = dailyEstimate(s), dom = s.day % 30 + 1;
  const profit = !noStaff ? _l`<section class="side-box profit ${E.net >= 0 ? 'up' : 'down'}"><h3>💰 Votre résultat</h3>
      <div class="pf-big ${E.net >= 0 ? 'pos' : 'neg'}">${E.net >= 0 ? '+' : '−'}${money(Math.abs(E.net))}<small> / jour</small></div>
      <div class="pf-rows">
        <span>Intérêts des prêts</span><b class="pos">+${money(E.interest)}</b>
        <span>Frais, cartes et dossiers</span><b class="pos">+${money(E.fees)}</b>
        ${E.other >= 1 ? _l`<span>Placements et distributeurs</span><b class="pos">+${money(E.other)}</b>` : ''}
        ${E.livret >= 1 ? _l`<span>Intérêts des livrets</span><b class="neg">−${money(E.livret)}</b>` : ''}
        <span>Salaires, loyers, équipements</span><b class="neg">−${money(E.costs)}</b>
        ${E.net > 0 ? _l`<span>Impôt sur les bénéfices</span><b class="neg">−${money(E.net / 3)}</b>` : ''}
      </div>
      <small class="muted">${E.net >= 0 ? _t('Vous gagnez de l’argent ! Plus de prêts = plus d’intérêts.') : (loansOpen(s) ? _t('Les prêts sont votre première source de revenus : recrutez des conseillers.') : _t('Ouvrez des comptes : bientôt, vous pourrez prêter cet argent.'))} Bilan dans ${30 - dom + 1} j.</small></section>` : '';

  const ch = CHAPTERS[s.chapter];
  const chap = ch ? _l`<button class="side-box chap" data-act="tab" data-tab="missions"><small>Chapitre ${s.chapter + 1} · ${ch.name}</small><span>${ch.goals.map(g => { const v = g.cur(s); return `${v >= g.goal ? '✅' : '▫️'} ${g.txt} : ${g.fmt ? g.fmt(Math.min(v, g.goal)) : nf0.format(Math.min(v, g.goal))} / ${g.fmt ? g.fmt(g.goal) : nf0.format(g.goal)}`; }).join('<br>')}</span>${ch.reward ? _l`<em>Récompense : ${money(ch.reward)}</em>` : ''}</button>` : '';
  const tq = avgTeamQ(s), stars = Math.round(tq / 0.9 * 4) + 1;
  const team = s.people.length ? _l`<section class="side-box gerant"><h3>🧑‍💼 Votre équipe</h3>
      <div class="gr-q"><span>Compétence</span><b><span class="gold-t">${'★'.repeat(stars)}</span><span class="st-off">${'★'.repeat(5 - stars)}</span></b></div>
      <p class="small muted">Elle ouvre les comptes, vend et signe seule les prêts jusqu’à <b>${money(seuil(s))}</b>. Formez-la pour qu’elle décide mieux.</p>
      ${s.flags.mTeam ? _l`<p class="small">Ce mois-ci : <b>${s.flags.mTeam.comptes || 0}</b> comptes · <b>${s.flags.mTeam.prets || 0}</b> prêts${s.flags.mTeam.fraud ? _l` · <b>${s.flags.mTeam.fraud}</b> fraudes déjouées` : ''}</p>` : ''}</section>` : '';
  const figures = s.people.length ? _l`<section class="side-box"><h3>Votre banque</h3><dl class="figs">
      <div><dt>Clients</dt><dd>${nf0.format(s.clients)}</dd></div><div><dt>Dépôts</dt><dd>${money(s.deposits)}</dd></div>
      <div><dt>Prêts en cours</dt><dd>${money(loansOut(s))}</dd></div><div><dt>Peut prêter</dt><dd>${money(Math.max(0, s.cash - s.deposits * 0.1))}</dd></div></dl></section>` : '';
  const bil = s.flags.bilan ? _l`<button class="side-box chap bil" data-act="bilan"><small>Dernier bilan mensuel</small><b class="${s.flags.bilan.pl.net >= 0 ? 'pos' : 'neg'}">${s.flags.bilan.pl.net >= 0 ? '+' : '−'}${money(Math.abs(s.flags.bilan.pl.net))}</b><span class="muted">Voir d’où vient l’argent</span></button>` : '';

  return _l`<div class="dash-grid"><div class="dash-left">${scene}</div><aside class="dash-right">${dossiers}${profit}${noStaff ? '' : growthHTML(s)}${chap}${team}${figures}${bil}</aside></div>
    <details class="more dash-more"><summary>Votre banque en détail</summary>${vDash()}</details>`;
}
