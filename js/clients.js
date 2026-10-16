'use strict';
/* =====================================================================
   BANQUE TYCOON — onglet Clients et fiche client
   ===================================================================== */

const CL_FILTERS = [['tous', 'Tous'], ['decouvert', 'À découvert'], ['pret', 'Avec un prêt'], ['epargne', 'Épargnants'], ['vip', 'Hauts revenus'], ['fache', 'Mécontents'], ['chomage', 'Au chômage']];
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
    <td><div class="row">${avatar({ face: personFace(p), role: 'client', trait: p.q < 40 ? 'raleur' : '' }, 30)}<div><b>${esc(pname(p))}</b>${pw(p) > 1 ? ` <small class="muted">×${pw(p)}</small>` : ''}<small class="muted block">${pjob(p)}${p.u ? ' · chômage' : ''}</small></div></div></td>
    <td class="r">${money(pinc(p))}</td><td class="r ${p.b < 0 ? 'neg' : ''}">${money(p.b)}</td><td class="r">${p.l != null ? money(p.l) : '<span class="muted">—</span>'}</td>
    <td class="r">${loansBy[p.i] ? loansBy[p.i].length : '<span class="muted">—</span>'}</td><td class="r">${p.c === 2 ? 'Gold' : p.c ? 'Classique' : '<span class="muted">—</span>'}</td>
    <td class="r"><span class="${p.q < 40 ? 'neg' : p.q > 70 ? 'pos' : ''}">${Math.round(p.q)}</span></td></tr>`).join('');
  const sortBtn = (k, l) => `<button class="${sort === k ? 'on' : ''}" data-act="clSort" data-v="${k}">${l}</button>`;
  const totals = { dec: s.people.filter(p => p.b < 0).length, chom: s.people.filter(p => p.u).length };
  return `<div class="grid kpis">
      ${kpi('Clients', nf0.format(s.clients), `${s.monthGone ? `${s.monthGone} départs le mois dernier` : 'Aucun départ le mois dernier'}`)}
      ${kpi('Argent sur les comptes', money(s.depCC), 'Prêtable, mais sans intérêts à verser')}
      ${kpi('Découverts', money(s.ovd), `${totals.dec} client${totals.dec > 1 ? 's' : ''} à découvert`, s.ovd ? 'neg' : '')}
      ${kpi('Au chômage', nf0.format(totals.chom), 'Risque d’impayés', totals.chom ? 'warn' : '')}
    </div>
    <section class="card">
      <div class="row wrap cl-tools"><div class="chips">${CL_FILTERS.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="clFilter" data-v="${k}">${l}</button>`).join('')}</div>
        <input type="text" placeholder="Rechercher un nom ou un métier…" value="${esc(ui.clSearch || '')}" data-input="clSearch" class="grow"></div>
      <div class="row small muted" style="margin:6px 0 10px">Trier par <div class="seg">${sortBtn('b', 'Solde')}${sortBtn('s', 'Salaire')}${sortBtn('l', 'Livret')}${sortBtn('q', 'Satisfaction')}${sortBtn('t', 'Plus récents')}</div></div>
      <div class="scroll"><table class="cltable"><tr><th>Client</th><th class="r">Revenus</th><th class="r">Solde</th><th class="r">Livret</th><th class="r">Prêts</th><th class="r">Carte</th><th class="r">Humeur</th></tr>
      ${rows || '<tr><td colspan="7" class="muted">Aucun client ici.</td></tr>'}</table></div>
      ${pages > 1 ? `<div class="row" style="justify-content:center;margin-top:10px"><button class="btn sm" data-act="clPage" data-v="${pg - 1}" ${pg ? '' : 'disabled'}>‹</button><span class="small muted">Page ${pg + 1} / ${pages} · ${nf0.format(list.length)} clients</span><button class="btn sm" data-act="clPage" data-v="${pg + 1}" ${pg < pages - 1 ? '' : 'disabled'}>›</button></div>` : ''}
    </section>`;
}

// ---------- Fiche client ----------
function releve(s, p) {
  // Opérations du mois en cours, reconstituées à partir de son budget
  const dom = s.day % 30, ops = [];
  if (dom >= 0 && s.day >= 30) ops.push([1, 'Frais de tenue de compte', -s.prod.cc.fee]);
  for (const l of personLoans(s, p)) if (s.day >= 30) ops.push([1, `Mensualité ${LOAN_TYPES[l.type].label.toLowerCase()}`, -l.pmt]);
  if (dom >= 4 && p.r) ops.push([5, 'Prélèvement loyer', -p.r]);
  if (dom >= 9) ops.push([10, 'Électricité, téléphone, assurances', -p.f]);
  if (dom >= p.pd && p.pd > 0) ops.push([p.pd + 1, p.u ? 'Allocation chômage' : `Salaire (${pjob(p).toLowerCase()})`, pinc(p)]);
  ops.push([dom + 1, `Paiements par carte et retraits (${dom + 1} jours)`, -Math.round(p.sp / 30 * (dom + 1))]);
  return ops.sort((a, b) => a[0] - b[0]);
}
function ficheHTML(s, p) {
  const loans = personLoans(s, p), debt = personDebt(s, p), score = personScore(s, p), g = grade(score);
  const ops = releve(s, p).map(([d, l, a]) => `<tr><td class="muted">${d}</td><td>${l}</td><td class="r ${a < 0 ? 'neg' : 'pos'}">${a > 0 ? '+' : ''}${money(a)}</td></tr>`).join('');
  const lrows = loans.map(l => `<tr><td>${LOAN_TYPES[l.type].icon} ${LOAN_TYPES[l.type].label}</td><td class="r">${money(l.out)}</td><td class="r">${money(l.pmt)}/mois</td><td class="r ${l.miss ? 'neg' : ''}">${l.miss ? `${l.miss} impayé${l.miss > 1 ? 's' : ''}` : 'à jour'}</td></tr>`).join('');
  const left = pinc(p) - p.r - p.f - p.sp - debt;
  const act = (k, label, cls = '', dis = false) => `<button class="btn sm ${cls}" data-act="clAct" data-id="${p.i}" data-k="${k}" ${dis ? 'disabled' : ''}>${label}</button>`;
  return `<div class="fiche-h">${avatar({ face: personFace(p), role: 'client', trait: p.q < 40 ? 'raleur' : '' }, 64)}<div class="grow"><h2>${esc(pname(p))}</h2>
      <p class="muted">${pjob(p)}${p.u ? ' · <b class="neg">au chômage</b>' : ''} · client depuis ${dateStr(p.t)}${pw(p) > 1 ? ` · représente ${pw(p)} clients semblables` : ''}</p></div>
      <span class="grade g-${g}" title="Note de crédit">${g}</span></div>
    <div class="grid kpis fk">
      ${kpi('Compte courant', money(p.b), `Découvert autorisé ${money(p.o)}`, p.b < 0 ? 'neg' : '')}
      ${kpi('Livret', p.l != null ? money(p.l) : '—', p.l != null ? `${pct(s.depositRate, 2)} par an` : 'Pas de livret')}
      ${kpi('Assurance-vie', p.a ? money(p.a) : '—')}
      ${kpi('Humeur', Math.round(p.q) + '/100', p.q < 40 ? 'Pense à partir' : p.q > 70 ? 'Fidèle' : 'Correct', p.q < 40 ? 'neg' : p.q > 70 ? 'pos' : '')}
    </div>
    <h3 class="sec">Son budget chaque mois</h3>
    <table class="mini"><tr><td>${p.u ? 'Allocation chômage' : 'Salaire'} (le ${p.pd + 1})</td><td class="r pos">+${money(pinc(p))}</td></tr>
      ${p.r ? `<tr><td>Loyer (le 5)</td><td class="r neg">-${money(p.r)}</td></tr>` : '<tr><td>Propriétaire de son logement</td><td class="r muted">0 €</td></tr>'}
      <tr><td>Factures (le 10)</td><td class="r neg">-${money(p.f)}</td></tr>
      <tr><td>Dépenses courantes (carte, courses…)</td><td class="r neg">-${money(p.sp)}</td></tr>
      ${debt ? `<tr><td>Mensualités de prêt</td><td class="r neg">-${money(debt)}</td></tr>` : ''}
      <tr class="total"><td>Reste à vivre / à épargner</td><td class="r ${left < 0 ? 'neg' : 'pos'}">${money(left)}</td></tr></table>
    <h3 class="sec">Relevé du mois</h3><table class="mini">${ops}</table>
    ${loans.length ? `<h3 class="sec">Ses prêts</h3><table class="mini">${lrows}</table>` : ''}
    <h3 class="sec">Actions</h3>
    <div class="row wrap">${s.prod.liv.on && p.l == null ? act('livret', 'Proposer un livret') : ''}
      ${act('od+', 'Augmenter le découvert')}${act('od-', 'Réduire le découvert', '', p.o <= 0)}
      ${s.prod.carte.on ? (p.c === 0 ? act('carte', 'Proposer une carte') : p.c === 1 ? act('gold', 'Proposer la Gold') : '') : ''}
      ${p.blk > s.day ? act('unblock', 'Débloquer sa carte') : ''}${act('call', 'L’appeler pour prendre des nouvelles')}</div>
    <div class="choices"><button class="btn primary" data-act="closeModal">Fermer</button></div>`;
}
function openFiche(id) {
  const p = findPerson(S, id); if (!p) return toast('Ce client n’est plus chez vous', 'bad');
  ui.modal = true; ui.fiche = p.i; showModal(ficheHTML(S, p)); $('#modal .modal-box').classList.add('wide');
}
function clientAction(id, k) {
  const s = S, p = findPerson(s, id); if (!p) return;
  reconcile(s);
  let msg = '';
  if (k === 'livret') { if (chance(livChance(s) * 0.9) && p.b > 300) { const m = Math.round(Math.max(0, p.b - p.s * 0.5) * rnd(0.4, 0.8)); p.b -= m; p.l = m; msg = `${pname(p)} ouvre un livret avec ${money(m)}.`; } else { p.l = p.l ?? null; msg = `${pname(p)} n’est pas intéressé pour l’instant.`; p.q -= 1; } }
  if (k === 'od+') { p.o += Math.round(p.s * 0.25 / 50) * 50; p.q += 2; msg = `Découvert autorisé porté à ${money(p.o)}.`; }
  if (k === 'od-') { p.o = Math.max(0, p.o - Math.round(p.s * 0.25 / 50) * 50); p.q -= 6; msg = `Découvert autorisé réduit à ${money(p.o)}.`; }
  if (k === 'carte') { if (chance(0.6)) { p.c = 1; msg = `${pname(p)} accepte une carte.`; } else msg = `${pname(p)} paie en liquide, merci.`; }
  if (k === 'gold') { if (p.s > 2500 && chance(0.7)) { p.c = 2; msg = `${pname(p)} passe à la Gold ✨`; } else { msg = `${pname(p)} trouve la Gold trop chère.`; p.q -= 1; } }
  if (k === 'unblock') { p.blk = 0; p.q += 4; msg = 'Carte débloquée.'; }
  if (k === 'call') { if (p.calledDay === s.day) msg = 'Vous l’avez déjà appelé aujourd’hui.'; else { p.calledDay = s.day; p.q += 3; msg = `${pname(p)} est touché par votre appel.`; } }
  if (p.l === null) delete p.l;
  p.q = clamp(p.q, 0, 100);
  recomputeAgg(s);
  if (msg) toast(msg, 'gold');
  showModal(ficheHTML(s, p)); $('#modal .modal-box').classList.add('wide');
}
