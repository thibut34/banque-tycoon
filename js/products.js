'use strict';
/* =====================================================================
   BANQUE TYCOON — produits bancaires
   Compte courant (frais mensuels), livret d'épargne (taux), assurance-vie
   (frais de gestion, hors bilan) et carte bancaire (cotisation annuelle).
   s.depCC + s.depLiv = s.deposits (argent prêtable)
   ===================================================================== */

const PRODUCTS = {
  cc: { name: _t('Compte courant'), icon: '💳', need: _t('Un guichetier'), desc: _t('Les clients y gardent leur argent au quotidien. Vous ne le rémunérez pas, mais vous pouvez le prêter. Vous facturez des frais de tenue de compte.') },
  liv: { name: _t('Livret d’épargne'), icon: '🐷', need: _t('Chapitre 2'), desc: _t('Les épargnants placent leurs économies contre des intérêts. C’est beaucoup d’argent à prêter, mais il coûte.') },
  av: { name: _t('Assurance-vie'), icon: '☂️', need: _t('Chapitre 3 et 2 conseillers'), desc: _t('Vos conseillers placent l’argent des clients. Il ne finance pas vos prêts, mais rapporte des frais de gestion chaque mois.') },
  carte: { name: _t('Carte bancaire'), icon: '💠', need: _t('Un distributeur'), desc: _t('Une cotisation annuelle pour chaque carte. Plus vous avez de distributeurs, plus vos clients en veulent.') },
};
const PROD_UNLOCK = {
  cc: s => staffTotal(s, 'gs') >= 1,
  liv: s => s.chapter >= 1,
  av: s => s.chapter >= 2 && staffTotal(s, 'bs') >= 2,
  carte: s => staffTotal(s, 'dab') >= 1,
};
const AVG_BALANCE = 2000; // solde moyen d'un compte courant

function migrateProducts(s) {
  if (!s.people) { s.people = []; s.depX = s.deposits || 0; }
  if (s.prod && s.prod.cc.od == null) { s.prod.cc.od = 0.25; s.prod.cc.agio = 14; }
  if (!s.prod) {
    const old = s.deposits || 0;
    s.prod = { cc: { on: old > 0, fee: 3 }, liv: { on: old > 0 }, av: { on: false, fee: 1, aum: 0 }, carte: { on: false, fee: 45 } };
    s.depCC = old * 0.5; s.depLiv = old * 0.5;
  }
}
const ccAtt = fee => clamp(Math.exp(-0.18 * (fee - 5)), 0.3, 1.8);
const repAtt = s => 0.4 + s.reputation / 80;
function ccTarget(s) { return s.prod.cc.on ? depositCap(s) * 0.4 * ccAtt(s.prod.cc.fee) * repAtt(s) : 0; }
function livTarget(s) { return s.prod.liv.on ? depositCap(s) * 0.6 * clamp(Math.exp(0.6 * (s.depositRate - marketDepRate(s))), 0.15, 4) * repAtt(s) * (s.flags.priceWar > s.day ? 0.7 : 1) * (s.flags.greenUntil > s.day ? 1.15 : 1) : 0; }
const clientsOf = s => s.clients || 0;
function avTarget(s) {
  if (!s.prod.av.on) return 0;
  let t = 0; for (const b of s.branches) t += cityOf(b).cap * 0.25 * staffEff(b, 'bs') * (specOf(b).av || 1);
  return t * clamp(Math.exp(-0.8 * (s.prod.av.fee - 1.2)), 0.2, 2) * repAtt(s);
}
function cardHolders(s) { return (s.cards || 0) + (s.cardsGold || 0); }
function prodRevenue(s) {
  return { cc: clientsOf(s) * s.prod.cc.fee, av: s.prod.av.aum * s.prod.av.fee / 1200, carte: ((s.cards || 0) + (s.cardsGold || 0) * 2.5) * s.prod.carte.fee / 12 };
}
function feeRep(s) { if (!s.prod.cc.on) return 0; const f = s.prod.cc.fee; return f > 8 ? -2 : f > 6.5 ? -0.5 : f < 3 ? 0.7 : 0; }

function updateDeposits(s) {
  migrateProducts(s); reconcile(s);
  const step = (cur, tgt) => { let d = (tgt - cur) * 0.015 + cur * 0.003 * gauss(); if (cur + d < 0) d = -cur; return d; };
  const dC = step(s.depCC, ccTarget(s)), dL = step(s.depLiv, livTarget(s));
  s.depCC += dC; s.depLiv += dL; s.deposits = s.depCC + s.depLiv; s.cash += dC + dL;
  if (s.prod.av.on) s.prod.av.aum += (avTarget(s) - s.prod.av.aum) * 0.01;
}

// ---------- Écran Produits ----------
function vProducts() {
  const s = S; migrateProducts(s);
  const rev = prodRevenue(s);
  const card = (k, body) => {
    const P = PRODUCTS[k], p = s.prod[k], open = PROD_UNLOCK[k](s);
    const head = `<header class="prod-h"><span class="prod-ico">${P.icon}</span><div class="grow"><h3>${P.name}</h3><small class="muted">${P.desc}</small></div>${p.on ? _t('<span class="pill">Actif</span>') : ''}</header>`;
    if (!p.on) return `<section class="card prod ${open ? '' : 'locked'}">${head}
      ${open ? _l`<button class="btn primary" data-act="launch" data-p="${k}">Lancer le produit</button>` : _l`<p class="muted small">${ic('lock')} Nécessite : ${P.need}</p>`}</section>`;
    return `<section class="card prod">${head}${body}</section>`;
  };
  const slider = (k, f, min, max, step, val, fmt) => `<div class="row"><span class="grow">${f === 'rate' ? _t('Taux versé') : f === 'fee' && k === 'av' ? _t('Frais de gestion') : f === 'fee' && k === 'carte' ? _t('Cotisation') : _t('Frais mensuels')}</span><b class="big-num" data-o="${k}-${f}">${fmt(val)}</b></div>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-input="prod" data-p="${k}" data-f="${f}">`;
  const stat = (l, v, c = '') => `<div class="stat"><small>${l}</small><b class="${c}">${v}</b></div>`;
  return _l`<div class="alert blue">${ic('spark')}<div>Vos produits attirent l’argent des clients. Les <b>comptes courants</b> et les <b>livrets</b> remplissent vos caisses : cet argent finance vos prêts. Les frais rapportent, mais trop de frais font fuir les clients.</div></div>
  ${s.prod.liv.on && s.deposits > 0 && s.cash > s.deposits * 0.35 ? _l`<div class="alert indigo">${ic('alert')}<div>${pct(s.cash / s.deposits * 100, 0)} de l’argent des clients dort dans vos caisses. Il vous coûte des intérêts sans rien rapporter : <b>baissez le taux du livret</b> ou <b>prêtez davantage</b>.</div></div>` : ''}
  <div class="grid two">
    ${card('cc', _l`${slider('cc', 'fee', 0, 12, 0.5, s.prod.cc.fee, v => nf1.format(v) + ' €/mois')}
      <div class="row"><span class="grow">Découvert autorisé des nouveaux clients</span><b class="big-num" data-o="cc-od">${Math.round((s.prod.cc.od || 0) * 100)} % du salaire</b></div>
      <input type="range" min="0" max="1" step="0.05" value="${s.prod.cc.od || 0}" data-input="prod" data-p="cc" data-f="od">
      <div class="row"><span class="grow">Taux des agios (découverts)</span><b class="big-num" data-o="cc-agio">${pct(s.prod.cc.agio || 14)}</b></div>
      <input type="range" min="6" max="21" step="0.5" value="${s.prod.cc.agio || 14}" data-input="prod" data-p="cc" data-f="agio">
      <p class="small muted">Prix moyen : 5 €/mois. Au-dessus, plus de clients partent. Un découvert généreux rapporte des agios… mais certains clients ne remontent jamais.</p>
      <div class="stats">${stat(_t('Clients'), nf0.format(clientsOf(s)))}${stat(_t('Sur les comptes'), money(s.depCC))}${stat(_t('Découverts'), money(s.ovd || 0), s.ovd ? 'neg' : '')}${stat(_t('Frais'), money(rev.cc) + '/mois', 'pos')}${s.lastPL && s.lastPL.prod ? stat(_t('Agios le mois dernier'), money(s.lastPL.prod.agios || 0), 'pos') : ''}</div>`)}
    ${card('liv', _l`${slider('liv', 'rate', 0, 8, 0.05, s.depositRate, v => pct(v, 2))}
      <p class="small muted">Au-dessus des concurrents, l’épargne afflue et vos clients acceptent plus souvent le livret ; en dessous, elle s’en va.</p>
      <div class="stats">${stat(_t('Épargne'), money(s.depLiv))}${stat(_t('Taux des concurrents'), pct(marketDepRate(s), 2))}${stat(_t('Intérêts versés'), money(s.depLiv * s.depositRate / 1200) + '/mois', 'neg')}</div>`)}
    ${card('av', _l`${slider('av', 'fee', 0.5, 3, 0.1, s.prod.av.fee, v => pct(v) + '/an')}
      <p class="small muted">Vos conseillers reçoivent des clients qui veulent placer leur argent pour la retraite.</p>
      <div class="stats">${stat(_t('Encours géré'), money(s.prod.av.aum))}${stat(_t('Conseillers'), staffTotal(s, 'bs'))}${stat(_t('Frais encaissés'), money(rev.av) + '/mois', 'pos')}</div>`)}
    ${card('carte', _l`${slider('carte', 'fee', 0, 150, 5, s.prod.carte.fee, v => nf0.format(v) + ' €/an')}
      <p class="small muted">Prix moyen : 45 €/an. La carte Gold rapporte 2,5 fois plus.</p>
      <div class="stats">${stat(_t('Cartes'), nf0.format(cardHolders(s)))}${stat(_t('Dont Gold'), nf0.format(s.cardsGold || 0))}${stat(_t('Cotisations'), money(rev.carte) + '/mois', 'pos')}</div>`)}
  </div>
  <section class="card"><header class="card-h"><h3>Argent des clients, liquidités et prêts</h3></header><canvas class="chart" data-chart="deposits"></canvas></section>`;
}
