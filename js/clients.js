'use strict';
/* =====================================================================
   BANQUE TYCOON — onglet Clients et fiche client
   ===================================================================== */

const CL_FILTERS = [['tous', _t('Tous')], ['decouvert', _t('À découvert')], ['pret', _t('Avec un prêt')], ['epargne', _t('Épargnants')], ['vip', _t('Hauts revenus')], ['fache', _t('Mécontents')], ['chomage', _t('Au chômage')]];
function clientFilter(s, k) {
  const withLoan = new Set(s.loans.filter(l => l.pid).map(l => l.pid));
  return {
    tous: () => true, decouvert: p => p.b < 0, pret: p => withLoan.has(p.i), epargne: p => (p.l || 0) + (p.a || 0) > p.s * 3,
    vip: p => p.s >= 4000, fache: p => p.q < 45, chomage: p => p.u,
  }[k] || (() => true);
}
function vClients() {
  const s = S, f = ui.clFilter || 'tous', sort = ui.clSort || 'b', page = ui.clPage || 0, PER = 40;
  let list = s.people.filter(clientFilter(s, f));
  const q = (ui.clSearch || '').toLowerCase();
  if (q) list = list.filter(p => pname(p).toLowerCase().includes(q) || pjob(p).toLowerCase().includes(q));
  const key = { b: p => p.b, s: p => p.s, l: p => p.l || 0, q: p => p.q, t: p => -p.t }[sort];
  list.sort((a, b) => key(sort === 'b' && f === 'decouvert' ? b : a) - key(sort === 'b' && f === 'decouvert' ? a : b));
  if (!(sort === 'b' && f === 'decouvert')) list.reverse();
  const pages = Math.max(1, Math.ceil(list.length / PER)), pg = Math.min(page, pages - 1);
  const loansBy = {}; for (const l of s.loans) if (l.pid) (loansBy[l.pid] = loansBy[l.pid] || []).push(l);
  const rows = list.slice(pg * PER, pg * PER + PER).map(p => `<tr class="clrow" data-act="fiche" data-id="${p.i}">
    <td><div class="row">${avatar({ face: personFace(p), role: 'client', trait: p.q < 40 ? 'raleur' : '' }, 30)}<div><b>${esc(pname(p))}</b>${pw(p) > 1 ? ` <small class="muted">×${pw(p)}</small>` : ''}<small class="muted block">${pjob(p)}${p.u ? _t(' · chômage') : ''}</small></div></div></td>
    <td class="r">${money(pinc(p))}</td><td class="r ${p.b < 0 ? 'neg' : ''}">${money(p.b)}</td><td class="r">${p.l != null ? money(p.l) : _t('<span class="muted">—</span>')}</td>
    <td class="r">${loansBy[p.i] ? loansBy[p.i].length : _t('<span class="muted">—</span>')}</td><td class="r">${p.c === 2 ? _t('Gold') : p.c ? _t('Classique') : _t('<span class="muted">—</span>')}</td>
    <td class="r"><span class="${p.q < 40 ? 'neg' : p.q > 70 ? 'pos' : ''}">${Math.round(p.q)}</span></td></tr>`).join('');
  const sortBtn = (k, l) => `<button class="${sort === k ? 'on' : ''}" data-act="clSort" data-v="${k}">${l}</button>`;
  const totals = { dec: s.people.filter(p => p.b < 0).length, chom: s.people.filter(p => p.u).length };
  return `<div class="grid kpis">
      ${kpi(_t('Clients'), nf0.format(s.clients), `${s.monthGone ? _l`${s.monthGone} départs le mois dernier` : _t('Aucun départ le mois dernier')}`)}
      ${kpi(_t('Argent sur les comptes'), money(s.depCC), _t('Prêtable, mais sans intérêts à verser'))}
      ${kpi(_t('Découverts'), money(s.ovd), _l`${totals.dec} client${totals.dec > 1 ? 's' : ''} à découvert`, s.ovd ? 'neg' : '')}
      ${kpi(_t('Au chômage'), nf0.format(totals.chom), _t('Risque d’impayés'), totals.chom ? 'warn' : '')}
    </div>
    <section class="card">
      <div class="row wrap cl-tools"><div class="chips">${CL_FILTERS.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="clFilter" data-v="${k}">${l}</button>`).join('')}</div>
        <input type="text" placeholder="Rechercher un nom ou un métier…" value="${esc(ui.clSearch || '')}" data-input="clSearch" class="grow"></div>
      <div class="row small muted" style="margin:6px 0 10px">Trier par <div class="seg">${sortBtn('b', _t('Solde'))}${sortBtn('s', _t('Salaire'))}${sortBtn('l', _t('Livret'))}${sortBtn('q', _t('Satisfaction'))}${sortBtn('t', _t('Plus récents'))}</div></div>
      <div class="scroll"><table class="cltable"><tr><th>Client</th><th class="r">Revenus</th><th class="r">Solde</th><th class="r">Livret</th><th class="r">Prêts</th><th class="r">Carte</th><th class="r">Humeur</th></tr>
      ${rows || _t('<tr><td colspan="7" class="muted">Aucun client ici.</td></tr>')}</table></div>
      ${pages > 1 ? `<div class="row" style="justify-content:center;margin-top:10px"><button class="btn sm" data-act="clPage" data-v="${pg - 1}" ${pg ? '' : 'disabled'}>‹</button><span class="small muted">Page ${pg + 1} / ${pages} · ${nf0.format(list.length)} clients</span><button class="btn sm" data-act="clPage" data-v="${pg + 1}" ${pg < pages - 1 ? '' : 'disabled'}>›</button></div>` : ''}
    </section>`;
}

// ---------- Fiche client ----------
function releve(s, p) {
  // Opérations du mois en cours, reconstituées à partir de son budget
  const dom = s.day % 30, ops = [];
  if (dom >= 0 && s.day >= 30) ops.push([1, _t('Frais de tenue de compte'), -s.prod.cc.fee]);
  for (const l of personLoans(s, p)) if (s.day >= 30) ops.push([1, _l`Mensualité ${LOAN_TYPES[l.type].label.toLowerCase()}`, -l.pmt]);
  if (dom >= 4 && p.r) ops.push([5, _t('Prélèvement loyer'), -p.r]);
  if (dom >= 9) ops.push([10, _t('Électricité, téléphone, assurances'), -p.f]);
  if (dom >= p.pd && p.pd > 0) ops.push([p.pd + 1, p.u ? _t('Allocation chômage') : _l`Salaire (${pjob(p).toLowerCase()})`, pinc(p)]);
  ops.push([dom + 1, _l`Paiements par carte et retraits (${dom + 1} jours)`, -Math.round(p.sp / 30 * (dom + 1))]);
  return ops.sort((a, b) => a[0] - b[0]);
}
function ficheHTML(s, p) {
  const loans = personLoans(s, p), debt = personDebt(s, p), score = personScore(s, p), g = grade(score);
  const ops = releve(s, p).map(([d, l, a]) => `<tr><td class="muted">${d}</td><td>${l}</td><td class="r ${a < 0 ? 'neg' : 'pos'}">${a > 0 ? '+' : ''}${money(a)}</td></tr>`).join('');
  const lrows = loans.map(l => _l`<tr><td>${LOAN_TYPES[l.type].icon} ${LOAN_TYPES[l.type].label}</td><td class="r">${money(l.out)}</td><td class="r">${money(l.pmt)}/mois</td><td class="r ${l.miss ? 'neg' : ''}">${l.miss ? _l`${l.miss} impayé${l.miss > 1 ? 's' : ''}` : _t('à jour')}</td></tr>`).join('');
  const left = pinc(p) - p.r - p.f - p.sp - debt;
  const act = (k, label, cls = '', dis = false) => `<button class="btn sm ${cls}" data-act="clAct" data-id="${p.i}" data-k="${k}" ${dis ? 'disabled' : ''}>${label}</button>`;
  return _l`<div class="fiche-h">${avatar({ face: personFace(p), role: 'client', trait: p.q < 40 ? 'raleur' : '' }, 64)}<div class="grow"><h2>${esc(pname(p))}</h2>
      <p class="muted">${pjob(p)}${p.u ? _t(' · <b class="neg">au chômage</b>') : ''} · client depuis ${dateStr(p.t)}${pw(p) > 1 ? _l` · représente ${pw(p)} clients semblables` : ''}</p></div>
      <span class="grade g-${g}" title="Note de crédit">${g}</span></div>
    <div class="grid kpis fk">
      ${kpi(_t('Compte courant'), money(p.b), _l`Découvert autorisé ${money(p.o)}`, p.b < 0 ? 'neg' : '')}
      ${kpi(_t('Livret'), p.l != null ? money(p.l) : '—', p.l != null ? _l`${pct(s.depositRate, 2)} par an` : _t('Pas de livret'))}
      ${kpi(_t('Assurance-vie'), p.a ? money(p.a) : '—')}
      ${kpi(_t('Humeur'), Math.round(p.q) + '/100', p.q < 40 ? _t('Pense à partir') : p.q > 70 ? _t('Fidèle') : _t('Correct'), p.q < 40 ? 'neg' : p.q > 70 ? 'pos' : '')}
    </div>
    <h3 class="sec">Son budget chaque mois</h3>
    <table class="mini"><tr><td>${p.u ? _t('Allocation chômage') : _t('Salaire')} (le ${p.pd + 1})</td><td class="r pos">+${money(pinc(p))}</td></tr>
      ${p.r ? _l`<tr><td>Loyer (le 5)</td><td class="r neg">-${money(p.r)}</td></tr>` : _t('<tr><td>Propriétaire de son logement</td><td class="r muted">0 €</td></tr>')}
      <tr><td>Factures (le 10)</td><td class="r neg">-${money(p.f)}</td></tr>
      <tr><td>Dépenses courantes (carte, courses…)</td><td class="r neg">-${money(p.sp)}</td></tr>
      ${debt ? _l`<tr><td>Mensualités de prêt</td><td class="r neg">-${money(debt)}</td></tr>` : ''}
      <tr class="total"><td>Reste à vivre / à épargner</td><td class="r ${left < 0 ? 'neg' : 'pos'}">${money(left)}</td></tr></table>
    <h3 class="sec">Relevé du mois</h3><table class="mini">${ops}</table>
    ${loans.length ? _l`<h3 class="sec">Ses prêts</h3><table class="mini">${lrows}</table>` : ''}
    <h3 class="sec">Actions</h3>
    <div class="row wrap">${s.prod.liv.on && p.l == null ? act('livret', _t('Proposer un livret')) : ''}
      ${act('od+', _t('Augmenter le découvert'))}${act('od-', _t('Réduire le découvert'), '', p.o <= 0)}
      ${s.prod.carte.on ? (p.c === 0 ? act('carte', _t('Proposer une carte')) : p.c === 1 ? act('gold', _t('Proposer la Gold')) : '') : ''}
      ${p.blk > s.day ? act('unblock', _t('Débloquer sa carte')) : ''}${act('call', _t('L’appeler pour prendre des nouvelles'))}</div>
    <div class="choices"><button class="btn primary" data-act="closeModal">Fermer</button></div>`;
}
function openFiche(id) {
  const p = findPerson(S, id); if (!p) return toast(_t('Ce client n’est plus chez vous'), 'bad');
  ui.modal = true; ui.fiche = p.i; showModal(ficheHTML(S, p)); $('#modal .modal-box').classList.add('wide');
}
function clientAction(id, k) {
  const s = S, p = findPerson(s, id); if (!p) return;
  reconcile(s);
  let msg = '';
  if (k === 'livret') { if (chance(livChance(s) * 0.9) && p.b > 300) { const m = Math.round(Math.max(0, p.b - p.s * 0.5) * rnd(0.4, 0.8)); p.b -= m; p.l = m; msg = _l`${pname(p)} ouvre un livret avec ${money(m)}.`; } else { p.l = p.l ?? null; msg = _l`${pname(p)} n’est pas intéressé pour l’instant.`; p.q -= 1; } }
  if (k === 'od+') { p.o += Math.round(p.s * 0.25 / 50) * 50; p.q += 2; msg = _l`Découvert autorisé porté à ${money(p.o)}.`; }
  if (k === 'od-') { p.o = Math.max(0, p.o - Math.round(p.s * 0.25 / 50) * 50); p.q -= 6; msg = _l`Découvert autorisé réduit à ${money(p.o)}.`; }
  if (k === 'carte') { if (chance(0.6)) { p.c = 1; msg = _l`${pname(p)} accepte une carte.`; } else msg = _l`${pname(p)} paie en liquide, merci.`; }
  if (k === 'gold') { if (p.s > 2500 && chance(0.7)) { p.c = 2; msg = _l`${pname(p)} passe à la Gold ✨`; } else { msg = _l`${pname(p)} trouve la Gold trop chère.`; p.q -= 1; } }
  if (k === 'unblock') { p.blk = 0; p.q += 4; msg = _t('Carte débloquée.'); }
  if (k === 'call') { if (p.calledDay === s.day) msg = _t('Vous l’avez déjà appelé aujourd’hui.'); else { p.calledDay = s.day; p.q += 3; msg = _l`${pname(p)} est touché par votre appel.`; } }
  if (p.l === null) delete p.l;
  p.q = clamp(p.q, 0, 100);
  recomputeAgg(s);
  if (msg) toast(msg, 'gold');
  showModal(ficheHTML(s, p)); $('#modal .modal-box').classList.add('wide');
}
