'use strict';
/* =====================================================================
   BANQUE TYCOON — produits bancaires
   Compte courant (frais mensuels), livret d'épargne (taux), assurance-vie
   (frais de gestion, hors bilan) et carte bancaire (cotisation annuelle).
   s.depCC + s.depLiv = s.deposits (argent prêtable)
   ===================================================================== */

const PRODUCTS = {
  cc: { name: 'Compte courant', icon: '💳', need: 'Un guichetier', desc: 'Les clients y gardent leur argent au quotidien. Vous ne le rémunérez pas, mais vous pouvez le prêter. Vous facturez des frais de tenue de compte.' },
  liv: { name: 'Livret d’épargne', icon: '🐷', need: 'Chapitre 2', desc: 'Les épargnants placent leurs économies contre des intérêts. C’est beaucoup d’argent à prêter, mais il coûte.' },
  av: { name: 'Assurance-vie', icon: '☂️', need: 'Chapitre 3 et 2 conseillers', desc: 'Vos conseillers placent l’argent des clients. Il ne finance pas vos prêts, mais rapporte des frais de gestion chaque mois.' },
  carte: { name: 'Carte bancaire', icon: '💠', need: 'Un distributeur', desc: 'Une cotisation annuelle pour chaque carte. Plus vous avez de distributeurs, plus vos clients en veulent.' },
};
const PROD_UNLOCK = {
  cc: s => staffTotal(s, 'gs') >= 1,
  liv: s => s.chapter >= 1,
  av: s => s.chapter >= 2 && staffTotal(s, 'bs') >= 2,
  carte: s => staffTotal(s, 'dab') >= 1,
};
const AVG_BALANCE = 2000; // solde moyen d'un compte courant

function migrateProducts(s) {
  if (!s.prod) {
    const old = s.deposits || 0;
    s.prod = { cc: { on: old > 0, fee: 3 }, liv: { on: old > 0 }, av: { on: false, fee: 1, aum: 0 }, carte: { on: false, fee: 45 } };
    s.depCC = old * 0.5; s.depLiv = old * 0.5;
  }
}
// Les événements et paniques modifient s.deposits : on répartit l'écart entre les deux poches
function reconcile(s) {
  const diff = s.deposits - (s.depCC + s.depLiv);
  if (Math.abs(diff) < 1) return;
  const tot = s.depCC + s.depLiv;
  if (tot > 0) { s.depCC += diff * s.depCC / tot; s.depLiv += diff * s.depLiv / tot; }
  else if (s.prod.liv.on) s.depLiv += diff; else s.depCC += diff;
  s.depCC = Math.max(0, s.depCC); s.depLiv = Math.max(0, s.depLiv); s.deposits = s.depCC + s.depLiv;
}
const ccAtt = fee => clamp(Math.exp(-0.18 * (fee - 3)), 0.3, 1.8);
const repAtt = s => 0.4 + s.reputation / 80;
function ccTarget(s) { return s.prod.cc.on ? depositCap(s) * 0.4 * ccAtt(s.prod.cc.fee) * repAtt(s) : 0; }
function livTarget(s) { return s.prod.liv.on ? depositCap(s) * 0.6 * clamp(Math.exp(0.6 * (s.depositRate - marketDepRate(s))), 0.15, 4) * repAtt(s) * (s.flags.priceWar > s.day ? 0.7 : 1) * (s.flags.greenUntil > s.day ? 1.15 : 1) : 0; }
const clientsOf = s => Math.round(s.depCC / AVG_BALANCE);
function avTarget(s) {
  if (!s.prod.av.on) return 0;
  let t = 0; for (const b of s.branches) t += cityOf(b).cap * 0.25 * staffEff(b, 'bs') * (specOf(b).av || 1);
  return t * clamp(Math.exp(-0.8 * (s.prod.av.fee - 1.2)), 0.2, 2) * repAtt(s);
}
function cardHolders(s) {
  if (!s.prod.carte.on) return 0;
  const dabs = staffTotal(s, 'dab'), cover = clamp(0.25 + 0.6 * dabs / Math.max(1, s.branches.length * 2), 0.25, 0.85);
  return Math.round(clientsOf(s) * cover * clamp(Math.exp(-0.015 * (s.prod.carte.fee - 45)), 0.2, 1.4));
}
function prodRevenue(s) {
  return { cc: s.prod.cc.on ? clientsOf(s) * s.prod.cc.fee : 0, av: s.prod.av.aum * s.prod.av.fee / 1200, carte: cardHolders(s) * s.prod.carte.fee / 12 };
}
function feeRep(s) { if (!s.prod.cc.on) return 0; const f = s.prod.cc.fee; return f > 6 ? -2 : f > 4.5 ? -0.5 : f < 2 ? 0.7 : 0; }

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
    const head = `<header class="prod-h"><span class="prod-ico">${P.icon}</span><div class="grow"><h3>${P.name}</h3><small class="muted">${P.desc}</small></div>${p.on ? '<span class="pill">Actif</span>' : ''}</header>`;
    if (!p.on) return `<section class="card prod ${open ? '' : 'locked'}">${head}
      ${open ? `<button class="btn primary" data-act="launch" data-p="${k}">Lancer le produit</button>` : `<p class="muted small">${ic('lock')} Nécessite : ${P.need}</p>`}</section>`;
    return `<section class="card prod">${head}${body}</section>`;
  };
  const slider = (k, f, min, max, step, val, fmt) => `<div class="row"><span class="grow">${f === 'rate' ? 'Taux versé' : f === 'fee' && k === 'av' ? 'Frais de gestion' : f === 'fee' && k === 'carte' ? 'Cotisation' : 'Frais mensuels'}</span><b class="big-num" data-o="${k}-${f}">${fmt(val)}</b></div>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-input="prod" data-p="${k}" data-f="${f}">`;
  const stat = (l, v, c = '') => `<div class="stat"><small>${l}</small><b class="${c}">${v}</b></div>`;
  return `<div class="alert blue">${ic('spark')}<div>Vos produits attirent l’argent des clients. Les <b>comptes courants</b> et les <b>livrets</b> remplissent vos caisses : cet argent finance vos prêts. Les frais rapportent, mais trop de frais font fuir les clients.</div></div>
  ${s.prod.liv.on && s.deposits > 0 && s.cash > s.deposits * 0.35 ? `<div class="alert indigo">${ic('alert')}<div>${pct(s.cash / s.deposits * 100, 0)} de l’argent des clients dort dans vos caisses. Il vous coûte des intérêts sans rien rapporter : <b>baissez le taux du livret</b> ou <b>prêtez davantage</b>.</div></div>` : ''}
  <div class="grid two">
    ${card('cc', `${slider('cc', 'fee', 0, 10, 0.5, s.prod.cc.fee, v => nf1.format(v) + ' €/mois')}
      <p class="small muted">Prix moyen chez les concurrents : 3 €/mois.</p>
      <div class="stats">${stat('Clients', nf0.format(clientsOf(s)))}${stat('Argent sur les comptes', money(s.depCC))}${stat('Frais encaissés', money(rev.cc) + '/mois', 'pos')}</div>`)}
    ${card('liv', `${slider('liv', 'rate', 0, 8, 0.05, s.depositRate, v => pct(v, 2))}
      <p class="small muted">Taux des concurrents : ${pct(marketDepRate(s), 2)}. Au-dessus, l’épargne afflue.</p>
      <div class="stats">${stat('Épargne', money(s.depLiv))}${stat('Visée', money(livTarget(s)))}${stat('Intérêts versés', money(s.depLiv * s.depositRate / 1200) + '/mois', 'neg')}</div>`)}
    ${card('av', `${slider('av', 'fee', 0.5, 3, 0.1, s.prod.av.fee, v => pct(v) + '/an')}
      <p class="small muted">Plus vous avez de conseillers (et plus ils sont expérimentés), plus l’encours grandit.</p>
      <div class="stats">${stat('Encours géré', money(s.prod.av.aum))}${stat('Visé', money(avTarget(s)))}${stat('Frais encaissés', money(rev.av) + '/mois', 'pos')}</div>`)}
    ${card('carte', `${slider('carte', 'fee', 0, 150, 5, s.prod.carte.fee, v => nf0.format(v) + ' €/an')}
      <p class="small muted">Prix moyen : 45 €/an. Chaque distributeur donne envie d’avoir une carte.</p>
      <div class="stats">${stat('Cartes', nf0.format(cardHolders(s)))}${stat('Distributeurs', staffTotal(s, 'dab'))}${stat('Cotisations', money(rev.carte) + '/mois', 'pos')}</div>`)}
  </div>
  <section class="card"><header class="card-h"><h3>Argent des clients, liquidités et prêts</h3></header><canvas class="chart" data-chart="deposits"></canvas></section>`;
}
