'use strict';
/* =====================================================================
   BANQUE TYCOON — vous êtes le PDG
   Votre équipe traite le quotidien (comptes, petits prêts, réclamations…) :
   plus elle est compétente, meilleures sont ses décisions. Les dossiers
   importants et délicats remontent jusqu'à votre bureau.
   Chaque fin de mois, un bilan explique d'où vient (ou où part) l'argent.
   ===================================================================== */

// Compétence de l'équipe d'une agence : 0 (débutants) à 0,9 (experts)
function teamQ(s, b) {
  const st = (b && b.staff || []).filter(e => e.role === 'gs' || e.role === 'bs');
  if (!st.length) return 0;
  const lvl = st.reduce((a, e) => a + e.lvl, 0) / st.length;
  const trait = st.reduce((a, e) => a + (e.trait === 'rapide' || e.trait === 'ambitieux' ? 0.04 : e.trait === 'bavard' || e.trait === 'raleur' ? -0.03 : 0), 0) / st.length;
  return clamp((lvl - 1) / 4 * 0.75 + trait + (s.upgrades.rh ? 0.1 : 0), 0, 0.9);
}
const avgTeamQ = s => s.branches.length ? s.branches.reduce((a, b) => a + teamQ(s, b), 0) / s.branches.length : 0;
// Chances d'une décision : vous (manual) faites au mieux, l'équipe d'autant mieux qu'elle est compétente
const sk = (manual, a, b) => manual ? a : b + (a - b) * (ui.teamQ || 0);

const ROUTINE = ['compte', 'demande', 'reclam', 'decouvert', 'facture', 'courrier', 'reunion', 'fraudecb', 'suspect', 'av'];
// Au-delà de ce montant, un prêt doit être signé par vous
const seuil = s => Math.round(Math.max(60e3, equity(s) * 0.06) / 5e3) * 5e3;
// Les cas délicats remontent jusqu'à votre bureau
function escalate(s, c) {
  const p = c.pid && findPerson(s, c.pid);
  switch (c.kind) {
    case 'suspect': return c.amt > 60e3 && chance(0.6);
    case 'reclam': return chance(0.03);
    case 'demande': return c.sub === 'cloture' && p && p.b + (p.l || 0) > 40e3;
    case 'fraudecb': return c.amt > 6000;
    case 'decouvert': return p && -p.b > Math.max(6000, p.o * 4) && chance(0.3);
    default: return false;
  }
}
// Vos conseillers décident seuls des petits prêts, selon votre politique de crédit (onglet Prêts)
function advisorLoan(s, c, sum, q) {
  const r = c.req, A = s.auto || { min: 'B', margin: 0.5 };
  c.done = true;
  if (r.fraud && chance(0.35 + q * 0.55)) { sum.fraud++; log(_l`🕵️ Vos conseillers démasquent un faux dossier : ${r.name}.`, 'good'); return; }
  const ok = 'ABCDE'.slice(0, 'ABCDE'.indexOf(A.min) + 1);
  const big = r.amount > seuil(s); // trop gros pour l'équipe : elle reste très prudente
  if (s.surveillance || !ok.includes(grade(r.score)) || (big && ('AB'.indexOf(grade(r.score)) < 0 || r.amount > equity(s) * 0.1)) || endet(r) > 0.35 || s.cash - r.amount < s.deposits * 0.1) { sum.refus++; s.stats.refused++; return; }
  r.offer = Math.round(clamp(fairRate(s, r) + A.margin + 0.1 * ((ui.stLv || 1) - 1), 0.5, usure(r)) * 10) / 10; // un bureau de haut niveau négocie mieux
  if (chance(acceptProb(r))) { grantLoan(s, r); s.today.tally.prets++; sum.prets++; sum.pretAmt += r.amount; }
  else { sum.refus++; s.stats.refused++; }
}
// Chaque matin, votre équipe traite le quotidien ; vous ne gardez que les dossiers de PDG
function ceoDay(s, t) {
  const before = { ...t.tally }, sum = { n: 0, prets: 0, pretAmt: 0, refus: 0, fraud: 0, esc: 0 };
  let deskLoans = (s.inbox || []).filter(x => !x.done && (x.kind === 'pret' || x.kind === 'pro')).length;
  for (const c of t.cards) {
    if (c.done) continue;
    const q = ui.teamQ = teamQ(s, getBranch(s, c.branch) || s.branches[0]);
    if ((c.kind === 'pret' || c.kind === 'pro') && !c.back && c.req) {
      if (c.req.amount <= seuil(s) || deskLoans >= 1) { advisorLoan(s, c, sum, q); sum.n++; continue; }
      deskLoans++; continue; // un gros dossier pour vous
    }
    if (!ROUTINE.includes(c.kind)) continue;
    if (escalate(s, c)) { c.esc = 1; sum.esc++; continue; }
    const fraudBefore = s.stats.tracfin || 0;
    resolveCard(s, c, delegateChoice(s, c), false); sum.n++;
    if (c.kind === 'suspect' && (s.stats.tracfin || 0) > fraudBefore) sum.fraud++;
  }
  t.cards = t.cards.filter(c => !c.done); t.done = 0; t.total = t.cards.length;
  for (const k of ['comptes', 'ventes', 'recl']) sum[k] = t.tally[k] - before[k];
  t.auto = sum;
  const mi = Math.floor(s.day / 30);
  const mt = s.flags.mTeam && s.flags.mTeam.m === mi ? s.flags.mTeam : (s.flags.mTeam = { m: mi, comptes: 0, prets: 0, fraud: 0 });
  mt.comptes += sum.comptes; mt.prets += sum.prets; mt.fraud += sum.fraud;
}

// ---------- Bilan du mois ----------
function makeBilan(s, eq0) {
  const pl = s.lastPL, eq1 = equity(s);
  if (eq0 == null) eq0 = eq1 - pl.net; // première fois : pas de point de départ connu
  s.flags.eqM = eq1;
  toast(_l`📊 Bilan du mois : <b class="${pl.net >= 0 ? 'pos' : 'neg'}">${pl.net >= 0 ? '+' : '−'}${money(Math.abs(pl.net))}</b> — détails à droite de votre bureau`, pl.net >= 0 ? 'good' : 'bad');
  s.flags.bilan = { month: Math.floor((s.day - 1) / 30), pl: { ...pl }, eq0, eq1, other: (eq1 - eq0) - pl.net, out: s.flags.mOut || {}, cash: s.cash, deposits: s.deposits, seen: false };
  s.flags.mOut = {};
}
function bilanTip(s, B) {
  const p = B.pl, inc = p.interest + p.fees + p.coupons + (p.reserves || 0);
  if (p.losses > inc * 0.4) return _t('💥 Des prêts n’ont pas été remboursés. Vérifiez mieux les dossiers (🔎) et évitez les notes D et E.');
  if (p.costs > inc) return _l`👥 Vos salaires et loyers (${money(p.costs)}) coûtent plus que ce que vous gagnez. Accordez plus de prêts : ce sont eux qui rapportent le plus.`;
  if (p.depInt > p.interest * 0.5 && p.depInt > 500) return _t('🐷 Votre livret coûte cher. Baissez un peu son taux dans Produits.');
  if (B.cash > B.deposits * 0.35 && B.deposits > 5e4) return _l`💤 ${money(B.cash)} dorment dans vos caisses. Prêtez-les : un prêt rapporte bien plus.`;
  if (B.other < -Math.max(5000, Math.abs(p.net))) {
    const o = B.out || {};
    if ((o.dec || 0) < -Math.max(5000, Math.abs(p.net) * 0.5)) return _t('🧾 Les décisions de direction (campagnes, primes, mécénat…) sont facultatives : quand vos bénéfices sont faibles, n’hésitez pas à les refuser.');
    return _t('🧾 Vos achats et les événements du mois ont pesé lourd. C’est normal si vous investissez pour grandir.');
  }
  return p.net > 0 ? _t('🎉 Belle gestion ! Continuez à prêter prudemment et à fidéliser vos clients.') : _t('📉 Patience : une banque met plusieurs mois à devenir rentable.');
}
// Le détail de ce qui a fait bouger les fonds propres en dehors du résultat du mois
function outRows(B) {
  if (Math.abs(B.other) < 1) return '';
  const o = B.out || {}, sgn = v => `<b class="${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '+' : '−'}${money(Math.abs(v))}</b>`;
  const list = [[_t('👥 Recrutements, formations et promotions'), o.rh], [_t('🧾 Décisions de direction et publicité'), o.dec], [_t('⚡ Événements'), o.evt], [_t('🛠️ Améliorations'), o.amel], [_t('💰 Votre bonus'), o.bonus]].filter(([, v]) => Math.abs(v || 0) >= 1);
  const rest = B.other - list.reduce((a, [, v]) => a + v, 0);
  if (Math.abs(rest) >= 1) list.push([_t('📈 Bourse, récompenses et divers'), rest]);
  return _l`<small>En dehors du résultat du mois : ${sgn(B.other)}</small><div class="bl-out">${list.map(([l, v]) => `<div><span>${l}</span>${sgn(v)}</div>`).join('')}</div>`;
}
function showBilan() {
  const s = S, B = s.flags.bilan, p = B.pl; B.seen = true;
  let max = 1;
  const rows = (list, sign) => {
    return list.filter(([, v]) => Math.abs(v) >= 1).map(([l, v, h]) => `<div class="bl-row"><span class="bl-l">${l}${h ? `<small>${h}</small>` : ''}</span><span class="bl-bar"><i class="${sign}" style="width:${Math.max(3, Math.abs(v) / max * 100)}%"></i></span><b class="${sign === 'in' ? 'pos' : 'neg'}">${sign === 'in' ? '+' : '−'}${money(Math.abs(v))}</b></div>`).join('') || _t('<p class="muted small">Rien ce mois-ci.</p>');
  };
  const ins = [[_t('Intérêts des prêts'), p.interest, _t('Ce que vos emprunteurs vous paient')], [_t('Frais, cartes et agios'), p.fees, _t('Payés par les clients')], [_t('Placements'), p.coupons + (p.reserves || 0), _t('Obligations et réserves')]];
  const outs = [[_t('Salaires et loyers'), p.costs, _t('Votre équipe et vos agences')], [_t('Intérêts des livrets'), p.depInt, _t('Versés à vos épargnants')], [_t('Banque centrale'), p.cbInt], [_t('Prêts non remboursés'), p.losses], [_t('Amortissements'), p.amort || 0, _t('Vos équipements, étalés sur 5 ans')], [_t('Impôts'), p.tax]];
  max = Math.max(1, ...ins.concat(outs).map(([, v]) => Math.abs(v)));
  ui.modal = true;
  showModal(_l`<div class="bilan"><small class="eyebrow">Bilan de ${MONTHS[B.month % 12]}</small>
    <div class="bl-net ${p.net >= 0 ? 'pos' : 'neg'}">${p.net >= 0 ? '+' : '−'}${money(Math.abs(p.net))}</div>
    <p class="center muted">Résultat net du mois</p>
    <h3 class="sec">💰 Ce que vous avez gagné</h3>${rows(ins, 'in')}
    <h3 class="sec">💸 Ce que vous avez dépensé</h3>${rows(outs, 'out')}
    <div class="bl-eq"><span>Vos fonds propres</span><b>${money(B.eq0)} → ${money(B.eq1)}</b>${outRows(B)}</div>
    <div class="bl-tip">${bilanTip(s, B)}</div>
    <div class="choices"><button class="btn primary" data-act="closeModal">Continuer</button></div></div>`);
  $('#modal .modal-box').classList.add('wide');
}

Object.assign(actions, {
  bilan: () => { if (S.flags.bilan) showBilan(); },
});
