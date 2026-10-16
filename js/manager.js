'use strict';
/* =====================================================================
   BANQUE TYCOON — mode gérant et bilan de fin de mois
   En mode gérant, l'équipe traite les affaires courantes : plus elle est
   compétente (niveau, caractère, formation), meilleures sont ses décisions.
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

const ROUTINE = ['compte', 'demande', 'reclam', 'decouvert', 'facture', 'courrier', 'reunion', 'fraudecb'];
const gerantOpen = s => s.chapter >= 1;
// Mode gérant : l'équipe traite d'abord les affaires courantes
function gerantDay(s, t) {
  if (!s.flags.gerant || !gerantOpen(s)) return;
  const before = { ...t.tally }, sum = { n: 0, msgs: [] };
  for (const c of t.cards) {
    if (c.done || !ROUTINE.includes(c.kind)) continue;
    ui.teamQ = teamQ(s, getBranch(s, c.branch) || s.branches[0]);
    const m = resolveCard(s, c, delegateChoice(s, c), false); sum.n++;
    if (m && sum.msgs.length < 4) sum.msgs.push(m);
  }
  t.cards = t.cards.filter(c => !c.done); t.done = 0; t.total = t.cards.length;
  for (const k of ['comptes', 'ventes', 'recl']) sum[k] = t.tally[k] - before[k];
  t.auto = sum;
}

// ---------- Bilan du mois ----------
function makeBilan(s, eq0) {
  const pl = s.lastPL, eq1 = equity(s);
  if (eq0 == null) eq0 = eq1 - pl.net; // première fois : pas de point de départ connu
  s.flags.eqM = eq1;
  s.flags.bilan = { month: Math.floor((s.day - 1) / 30), pl: { ...pl }, eq0, eq1, other: (eq1 - eq0) - pl.net, cash: s.cash, deposits: s.deposits, seen: false };
}
function bilanTip(s, B) {
  const p = B.pl, inc = p.interest + p.fees + p.coupons + (p.reserves || 0);
  if (p.losses > inc * 0.4) return '💥 Des prêts n’ont pas été remboursés. Vérifiez mieux les dossiers (🔎) et évitez les notes D et E.';
  if (p.costs > inc) return `👥 Vos salaires et loyers (${money(p.costs)}) coûtent plus que ce que vous gagnez. Accordez plus de prêts : ce sont eux qui rapportent le plus.`;
  if (p.depInt > p.interest * 0.5 && p.depInt > 500) return '🐷 Votre livret coûte cher. Baissez un peu son taux dans Produits.';
  if (B.cash > B.deposits * 0.35 && B.deposits > 5e4) return `💤 ${money(B.cash)} dorment dans vos caisses. Prêtez-les : un prêt rapporte bien plus.`;
  if (B.other < -Math.max(5000, Math.abs(p.net))) return '🧾 Vos achats et les événements du mois ont pesé lourd. C’est normal si vous investissez pour grandir.';
  return p.net > 0 ? '🎉 Belle gestion ! Continuez à prêter prudemment et à fidéliser vos clients.' : '📉 Patience : une banque met plusieurs mois à devenir rentable.';
}
function showBilan() {
  const s = S, B = s.flags.bilan, p = B.pl; B.seen = true;
  let max = 1;
  const rows = (list, sign) => {
    return list.filter(([, v]) => Math.abs(v) >= 1).map(([l, v, h]) => `<div class="bl-row"><span class="bl-l">${l}${h ? `<small>${h}</small>` : ''}</span><span class="bl-bar"><i class="${sign}" style="width:${Math.max(3, Math.abs(v) / max * 100)}%"></i></span><b class="${sign === 'in' ? 'pos' : 'neg'}">${sign === 'in' ? '+' : '−'}${money(Math.abs(v))}</b></div>`).join('') || '<p class="muted small">Rien ce mois-ci.</p>';
  };
  const ins = [['Intérêts des prêts', p.interest, 'Ce que vos emprunteurs vous paient'], ['Frais, cartes et agios', p.fees, 'Payés par les clients'], ['Placements', p.coupons + (p.reserves || 0), 'Obligations et réserves']];
  const outs = [['Salaires et loyers', p.costs, 'Votre équipe et vos agences'], ['Intérêts des livrets', p.depInt, 'Versés à vos épargnants'], ['Banque centrale', p.cbInt], ['Prêts non remboursés', p.losses], ['Impôts', p.tax]];
  max = Math.max(1, ...ins.concat(outs).map(([, v]) => Math.abs(v)));
  ui.modal = true;
  showModal(`<div class="bilan"><small class="eyebrow">Bilan de ${MONTHS[B.month % 12]}</small>
    <div class="bl-net ${p.net >= 0 ? 'pos' : 'neg'}">${p.net >= 0 ? '+' : '−'}${money(Math.abs(p.net))}</div>
    <p class="center muted">Résultat net du mois</p>
    <h3 class="sec">💰 Ce que vous avez gagné</h3>${rows(ins, 'in')}
    <h3 class="sec">💸 Ce que vous avez dépensé</h3>${rows(outs, 'out')}
    <div class="bl-eq"><span>Vos fonds propres</span><b>${money(B.eq0)} → ${money(B.eq1)}</b>${Math.abs(B.other) >= 1 ? `<small>dont ${B.other >= 0 ? '+' : '−'}${money(Math.abs(B.other))} d’achats, d’événements, de récompenses et de variations des marchés</small>` : ''}</div>
    <div class="bl-tip">${bilanTip(s, B)}</div>
    <div class="choices"><button class="btn primary" data-act="closeModal">Continuer</button></div></div>`);
  $('#modal .modal-box').classList.add('wide');
}

Object.assign(actions, {
  gerant: () => { S.flags.gerant = !S.flags.gerant; if (S.flags.gerant && S.today) gerantDay(S, S.today); toast(S.flags.gerant ? '🧑‍💼 Mode gérant activé : votre équipe s’occupe des affaires courantes.' : 'Mode gérant désactivé : vous recevez tous les clients.', 'gold'); renderPanel(true); },
  bilan: () => { if (S.flags.bilan) showBilan(); },
});
