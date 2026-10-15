'use strict';
/* =====================================================================
   BANQUE TYCOON — simulateur de banque
   1 seconde (vitesse normale) = 1 jour · 30 jours = 1 mois
   ===================================================================== */

// ---------- Utilitaires ----------
const $ = (s, r = document) => r.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const chance = p => Math.random() < p;
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function weighted(obj) { // {cle: poids}
  let t = 0; for (const k in obj) t += obj[k];
  let r = Math.random() * t;
  for (const k in obj) { r -= obj[k]; if (r <= 0) return k; }
  return Object.keys(obj)[0];
}
const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function money(n) {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e9) return s + nf2.format(a / 1e9) + ' Md€';
  if (a >= 1e6) return s + nf2.format(a / 1e6) + ' M€';
  if (a >= 1e4) return s + nf1.format(a / 1e3) + ' k€';
  return s + nf0.format(a) + ' €';
}
const pct = (x, d = 1) => (d === 2 ? nf2 : nf1).format(x) + ' %';
const sign = n => (n >= 0 ? '+' : '') ;
const cls = n => n >= 0 ? 'pos' : 'neg';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const START_YEAR = 2027;
function dateStr(d) { const m = Math.floor(d / 30); return `${d % 30 + 1} ${MONTHS[m % 12]} ${START_YEAR + Math.floor(m / 12)}`; }
function monthStr(d) { const m = Math.floor(d / 30); return `${MONTHS[m % 12]} ${START_YEAR + Math.floor(m / 12)}`; }

// ---------- Données du jeu ----------
const GOAL = 50e6;
const SAVE_KEY = 'banqueTycoon.save.v1';
const BEST_KEY = 'banqueTycoon.best.v1';

const DIFFS = {
  facile: { label: 'Héritier', icon: '👶', desc: 'Papa vous a prêté 2 M€. Clients sympas.', cash: 3.5e6, deposits: 1.5e6, pd: 0.8, ev: 0.7 },
  normal: { label: 'Entrepreneur', icon: '💼', desc: '1 M€ de capital. La vraie vie.', cash: 2.5e6, deposits: 1.5e6, pd: 1, ev: 1 },
  dur: { label: 'Banque de garage', icon: '🔧', desc: '400 k€ et beaucoup d’espoir.', cash: 1.2e6, deposits: 0.8e6, pd: 1.25, ev: 1.3 },
};

const ECON = {
  croissance: { label: 'Croissance', icon: '🚀', color: '#3ddc84', pd: 0.7, drift: 0.0009, demand: 1.3, next: { stable: 5, recession: 3, crise: 1 } },
  stable: { label: 'Stable', icon: '🌤️', color: '#5aa9ff', pd: 1, drift: 0.0003, demand: 1, next: { croissance: 5, recession: 3, crise: 1 } },
  recession: { label: 'Récession', icon: '🌧️', color: '#ffa94d', pd: 1.8, drift: -0.0007, demand: 0.75, next: { stable: 4, croissance: 2, crise: 2 } },
  crise: { label: 'Crise', icon: '🌪️', color: '#ff5d6c', pd: 3, drift: -0.0028, demand: 0.5, next: { recession: 5, stable: 2 } },
};

const LOAN_TYPES = {
  conso: { label: 'Crédit conso', icon: '🛒', amt: [3e3, 30e3], dur: [6, 24], spread: 4, pd: 1.2, rec: 0.15, w: 3, rw: 1, who: 'p',
    reasons: ['une télé 8K', 'un canapé en cuir de licorne', 'des vacances à Bali', 'une cuisine équipée', 'son mariage', 'un home cinéma', 'une PS7'] },
  auto: { label: 'Prêt auto', icon: '🚗', amt: [8e3, 70e3], dur: [12, 48], spread: 2.5, pd: 1, rec: 0.4, w: 3, rw: 1, who: 'p',
    reasons: ['une citadine électrique', 'un SUV', 'un camping-car', 'une moto', 'une Twingo de 1996 « de collection »'] },
  immo: { label: 'Prêt immobilier', icon: '🏠', amt: [120e3, 900e3], dur: [36, 96], spread: 1.2, pd: 0.5, rec: 0.65, w: 3, rw: 0.35, who: 'p',
    reasons: ['un appartement à Lyon', 'une maison avec jardin', 'un studio à louer', 'une longère en Bretagne', 'un loft à Paris', 'un chalet à Chamonix'] },
  pro: { label: 'Prêt professionnel', icon: '🏭', amt: [50e3, 1.5e6], dur: [24, 72], spread: 2.8, pd: 1.3, rec: 0.3, w: 2, rw: 1, who: 'c',
    reasons: ['de nouvelles machines', 'un entrepôt', 'une flotte de camions', 'son expansion à l’export', 'une usine de croissants'] },
  startup: { label: 'Start-up', icon: '🦄', amt: [200e3, 3e6], dur: [24, 60], spread: 6, pd: 3, rec: 0.05, w: 1, rw: 1.5, who: 's',
    reasons: ['une IA qui écrit des poèmes pour chats', 'un Uber pour tondeuses', 'la blockchain du fromage', 'des chaussettes connectées', 'un métavers pour retraités', 'des drones livreurs de croissants'] },
  farfelu: { label: 'Projet farfelu', icon: '🤪', amt: [20e3, 400e3], dur: [12, 36], spread: 7, pd: 2.5, rec: 0.1, w: 1, rw: 1, who: 'p',
    reasons: ['un élevage d’escargots de course', 'un restaurant 100 % raclette à Dubaï', 'un parc d’attractions pour pigeons', 'un sous-marin en kit', 'une école de mimes', 'un musée de la chaussette perdue'] },
};

const FIRST = ['Gérard', 'Sophie', 'Kevin', 'Brigitte', 'Mohamed', 'Chloé', 'Jean-Michel', 'Léa', 'Patrick', 'Inès', 'Thierry', 'Manon', 'Rachid', 'Camille', 'Dédé', 'Josiane', 'Hugo', 'Fatou', 'Yannick', 'Clémence', 'Bernard', 'Lucas', 'Nadia', 'Gaston'];
const LAST = ['Dupont', 'Martin', 'Lefèvre', 'Moreau', 'Bernard', 'Petit', 'Durand', 'Leroy', 'Roux', 'Fournier', 'Girard', 'Bonnet', 'Mercier', 'Blanc', 'Garcia', 'Benali', 'Nguyen', 'Lambert', 'Fontaine', 'Rousseau'];
const COMPANY = ['SARL {L} & Fils', '{L} Industries', 'Boulangeries {L}', 'Transports {L}', 'Garage {L}', 'Ets {L}', '{L} BTP', 'Fromagerie {L}'];
const STARTUP = ['Bloop', 'Fromagr.io', 'Kwakk', 'Zyglo', 'ChatGPTruc', 'Licornia', 'Pivotly', 'SnailX', 'Blockchouette', 'Disruptr'];

const ASSETS = {
  oat: { name: 'Obligations d’État', icon: '🏛️', base: 100, vol: 0.0012, beta: 0, rw: 0.2, desc: 'Sûr et ennuyeux. Verse un coupon mensuel (taux directeur + 0,4 %). Baisse quand les taux montent.' },
  cac: { name: 'Indice CAC 40', icon: '📈', base: 7500, vol: 0.011, beta: 1, rw: 1, desc: 'Les 40 plus grosses entreprises françaises. Suit l’économie.' },
  tech: { name: 'NéoTech SA', icon: '💻', base: 180, vol: 0.024, beta: 1.6, rw: 1, desc: 'Géant de la tech. Monte vite, chute fort.' },
  oil: { name: 'PétroGaulois', icon: '🛢️', base: 65, vol: 0.019, beta: 0.8, rw: 1, desc: 'Pétrolier nerveux, sensible aux événements mondiaux.' },
  gold: { name: 'Or', icon: '🥇', base: 2400, vol: 0.008, beta: -0.5, rw: 0.5, desc: 'Valeur refuge : monte souvent pendant les crises.' },
  snail: { name: 'Escargots & Co', icon: '🐌', base: 12, vol: 0.04, beta: 0.4, rw: 1, desc: 'Action « mème » adorée des forums. Totalement imprévisible.' },
  crypto: { name: 'BitBaguette', icon: '🥖', base: 42000, vol: 0.055, beta: 2, rw: 1.5, need: 'trading', desc: 'Cryptomonnaie adossée à… rien. Nécessite la salle des marchés.' },
};

const CITIES = {
  siege: { name: 'Siège social', icon: '🏦', cost: 0, rent: 5000, cap: 3e6, loans: 1 },
  montpellier: { name: 'Montpellier', icon: '☀️', cost: 200e3, rent: 2500, cap: 2.5e6, loans: 0.5 },
  nantes: { name: 'Nantes', icon: '🐘', cost: 250e3, rent: 3000, cap: 3e6, loans: 0.6 },
  lille: { name: 'Lille', icon: '🍟', cost: 300e3, rent: 3500, cap: 3.5e6, loans: 0.7 },
  bordeaux: { name: 'Bordeaux', icon: '🍷', cost: 350e3, rent: 4000, cap: 4e6, loans: 0.7 },
  toulouse: { name: 'Toulouse', icon: '🚀', cost: 400e3, rent: 4500, cap: 4.5e6, loans: 0.8 },
  marseille: { name: 'Marseille', icon: '⚓', cost: 600e3, rent: 6000, cap: 6e6, loans: 1 },
  lyon: { name: 'Lyon', icon: '🦁', cost: 800e3, rent: 8000, cap: 8e6, loans: 1.2 },
  paris: { name: 'Paris', icon: '🗼', cost: 2e6, rent: 18000, cap: 18e6, loans: 2 },
  geneve: { name: 'Genève', icon: '🇨🇭', cost: 4e6, rent: 35000, cap: 40e6, loans: 1, desc: 'Clients fortunés, gros dépôts.' },
  londres: { name: 'Londres', icon: '💂', cost: 8e6, rent: 60000, cap: 60e6, loans: 3 },
  tokyo: { name: 'Tokyo', icon: '🗾', cost: 12e6, rent: 95000, cap: 100e6, loans: 4 },
  newyork: { name: 'New York', icon: '🗽', cost: 15e6, rent: 110000, cap: 120e6, loans: 5 },
  lune: { name: 'Base lunaire', icon: '🌕', cost: 80e6, rent: 500000, cap: 600e6, loans: 8, desc: 'Les premiers colons ont besoin d’une banque. Et peut-être d’autres clients…' },
};

const UPGRADES = {
  analyste: { name: 'Analyste crédit', icon: '🔍', cost: 80e3, monthly: 4000, desc: 'Affiche le score exact et la probabilité de défaut des emprunteurs.' },
  coffre: { name: 'Coffre-fort blindé', icon: '🔐', cost: 60e3, monthly: 500, desc: 'Rend les braquages impossibles.' },
  marketing: { name: 'Campagne marketing', icon: '📣', cost: 150e3, monthly: 8000, desc: '+25 % de dépôts potentiels, +30 % de demandes de prêt.' },
  app: { name: 'Application mobile', icon: '📱', cost: 300e3, monthly: 6000, desc: '+20 % de dépôts potentiels et +1 réputation chaque mois.' },
  cyber: { name: 'Cybersécurité', icon: '🛡️', cost: 200e3, monthly: 5000, desc: 'Bloque les cyberattaques.' },
  recouvrement: { name: 'Service de recouvrement', icon: '⚖️', cost: 120e3, monthly: 5000, desc: '+20 % récupérés sur chaque prêt en défaut.' },
  dab: { name: 'Réseau de distributeurs', icon: '🏧', cost: 180e3, monthly: 3000, desc: 'Commissions : +0,25 %/an des dépôts.' },
  conformite: { name: 'Service conformité', icon: '📋', cost: 250e3, monthly: 10000, desc: 'Divise les amendes par 3 et protège des scandales.' },
  trading: { name: 'Salle des marchés', icon: '💹', cost: 500e3, monthly: 15000, desc: 'Frais de courtage divisés par 5 et accès aux cryptos.' },
  ia: { name: 'IA de scoring', icon: '🤖', cost: 1.2e6, monthly: 25000, req: 'analyste', desc: '-25 % de défauts sur les nouveaux prêts, demandes ×1,3.' },
  lobby: { name: 'Lobbyiste à Bruxelles', icon: '🕴️', cost: 2e6, monthly: 40000, req: 'conformite', desc: 'Ratio de solvabilité minimum abaissé de 8 % à 6 %.' },
  quantique: { name: 'Ordinateur quantique', icon: '⚛️', cost: 15e6, monthly: 150000, req: 'trading', desc: 'Prédit la prochaine phase économique et sa date.' },
};

const LUXURY = {
  montre: { name: 'Montre en or', icon: '⌚', cost: 50e3 },
  ferrari: { name: 'Ferrari rouge', icon: '🏎️', cost: 300e3 },
  villa: { name: 'Villa à Saint-Tropez', icon: '🏖️', cost: 2e6 },
  tableau: { name: 'Un vrai Monet', icon: '🖼️', cost: 5e6 },
  chateau: { name: 'Château dans le Bordelais', icon: '🏰', cost: 8e6 },
  yacht: { name: 'Yacht de 80 m', icon: '🛥️', cost: 15e6 },
  club: { name: 'Club de foot', icon: '⚽', cost: 30e6 },
  jet: { name: 'Jet privé', icon: '🛩️', cost: 40e6 },
  ile: { name: 'Île privée', icon: '🏝️', cost: 100e6 },
  fusee: { name: 'Fusée personnelle', icon: '🚀', cost: 500e6 },
};

const ACHS = {
  first_loan: { name: 'Premier prêt', icon: '🤝', desc: 'Accorder un premier prêt.', t: s => s.stats.granted >= 1 },
  loans50: { name: 'Machine à crédit', icon: '🏭', desc: 'Accorder 50 prêts.', t: s => s.stats.granted >= 50 },
  loans200: { name: 'Distributeur de crédit', icon: '🌊', desc: 'Accorder 200 prêts.', t: s => s.stats.granted >= 200 },
  m5: { name: 'Cinq millions', icon: '💵', desc: 'Fonds propres ≥ 5 M€.', t: s => equity(s) >= 5e6 },
  m20: { name: 'Banque régionale', icon: '🏙️', desc: 'Fonds propres ≥ 20 M€.', t: s => equity(s) >= 20e6 },
  goal: { name: 'Objectif atteint', icon: '🏆', desc: 'Fonds propres ≥ 50 M€.', t: s => equity(s) >= GOAL },
  m250: { name: 'Too big to fail', icon: '🐘', desc: 'Fonds propres ≥ 250 M€.', t: s => equity(s) >= 250e6 },
  b1: { name: 'Milliard', icon: '👑', desc: 'Fonds propres ≥ 1 Md€.', t: s => equity(s) >= 1e9 },
  br5: { name: 'Réseau national', icon: '🗺️', desc: 'Posséder 5 agences.', t: s => s.branches.length >= 5 },
  intl: { name: 'À l’international', icon: '✈️', desc: 'Ouvrir une agence à l’étranger.', t: s => s.branches.some(b => ['geneve', 'londres', 'tokyo', 'newyork'].includes(b)) },
  moon: { name: 'Banque lunaire', icon: '🌕', desc: 'Ouvrir la base lunaire.', t: s => s.branches.includes('lune') },
  crisis: { name: 'Survivant', icon: '🧯', desc: 'Traverser une crise économique.', t: s => s.stats.crises >= 1 },
  honest: { name: 'Incorruptible', icon: '😇', desc: 'Dénoncer la mafia.', t: s => s.flags.honest },
  crypto: { name: 'HODL', icon: '💎', desc: 'Détenir 1 M€ de BitBaguette.', t: s => (s.portfolio.crypto || 0) * s.market.crypto.price >= 1e6 },
  snail: { name: 'Baveux', icon: '🐌', desc: 'Détenir 100 k€ d’Escargots & Co.', t: s => (s.portfolio.snail || 0) * s.market.snail.price >= 1e5 },
  rep90: { name: 'Banque préférée', icon: '❤️', desc: 'Réputation ≥ 90.', t: s => s.reputation >= 90 },
  yacht: { name: 'Capitaine', icon: '🛥️', desc: 'S’offrir un yacht.', t: s => s.owned.includes('yacht') },
  unicorn: { name: 'Chasseur de licornes', icon: '🦄', desc: 'Toucher le jackpot avec une start-up.', t: s => s.flags.unicorn },
  allup: { name: 'Banque du futur', icon: '🧠', desc: 'Acheter toutes les améliorations.', t: s => Object.keys(UPGRADES).every(u => s.upgrades[u]) },
  survive5: { name: 'Vétéran', icon: '🎖️', desc: 'Tenir 5 ans.', t: s => s.day >= 30 * 12 * 5 },
};

const NEWS = [
  'Le prix de la baguette franchit 1,50 € : les économistes s’inquiètent.',
  'Un pigeon élu meilleur trader de l’année à Wall Street.',
  'Sondage : 68 % des Français ne savent pas ce qu’est un taux directeur. Les 32 % restants mentent.',
  'Un retraité de Limoges trouve 3 000 € en Francs dans son matelas.',
  'Les ventes de tirelires cochon en hausse de 12 %.',
  'Elon Musc annonce vouloir racheter la Lune. La Lune n’a pas répondu.',
  'Un député propose de remplacer l’euro par des Carambars.',
  'Record : une file d’attente de 3 heures pour le nouveau croissant au sel de Guérande.',
  'Les escargots de course deviennent sport olympique en 2032.',
  'Un hamster bat le CAC 40 en choisissant ses actions au hasard.',
  'La Banque centrale recrute un stagiaire pour « appuyer sur le bouton imprimer ».',
  'Une étude révèle que les banquiers dorment mieux sur un matelas de billets.',
  'Un influenceur conseille d’investir tout son PEL dans des NFT de raclette.',
  'Météo des marchés : averses de volatilité en fin de journée.',
  'Une grand-mère bretonne devient millionnaire grâce aux obligations d’État. « C’est la patience, mon petit. »',
];

// ---------- État ----------
let S = null;
const ui = { tab: 'dash', speed: 1, prevSpeed: 1, market: 'cac', tradeAmt: 100000, pointerDown: false, modal: false, dirty: true, diff: 'normal', event: null, acc: 0, toastKeys: {}, seen: new Set() };
const SPEEDS = [0, 1, 3, 8]; // jours par seconde

function newState(name, diff) {
  const d = DIFFS[diff];
  const market = {};
  for (const id in ASSETS) {
    const a = ASSETS[id]; const hist = [];
    let p = a.base;
    for (let i = 0; i < 90; i++) { p *= Math.exp(a.vol * gauss() + 0.0002 * a.beta); hist.push(p); }
    market[id] = { price: p, hist };
  }
  return {
    v: 1, name, diff, day: 0,
    cash: d.cash, deposits: d.deposits, depositRate: 1.5, fees: 'normal',
    loans: [], requests: [], nextId: 1,
    cbDebt: 0, policyRate: 3, rateHist: [3],
    economy: 'stable', econTimer: rint(8, 14), nextEcon: null,
    reputation: 50, surveillance: false, lowCap: 0,
    portfolio: {}, cost: {}, market,
    branches: ['siege'], upgrades: {},
    fortune: 0, owned: [],
    history: [], lastPL: null, log: [],
    achievements: {}, flags: {},
    stats: { granted: 0, defaults: 0, refused: 0, crises: 0, interest: 0, bonus: 0, events: 0 },
    over: false, won: false,
  };
}

// ---------- Calculs financiers ----------
const loansOut = s => s.loans.reduce((a, l) => a + l.out, 0);
function holdingValue(s, id) { return (s.portfolio[id] || 0) * s.market[id].price; }
function portfolioValue(s) { let v = 0; for (const id in s.portfolio) v += holdingValue(s, id); return v; }
const equity = s => s.cash + loansOut(s) + portfolioValue(s) - s.deposits - s.cbDebt;
function rwa(s) {
  let r = 0;
  for (const l of s.loans) r += l.out * LOAN_TYPES[l.type].rw;
  for (const id in s.portfolio) r += holdingValue(s, id) * ASSETS[id].rw;
  return r;
}
function capRatio(s) { const r = rwa(s); return r < 1 ? Infinity : equity(s) / r * 100; }
const minRatio = s => s.upgrades.lobby ? 6 : 8;
const cbRate = s => s.policyRate + 0.25;
const marketDepRate = s => Math.max(0.1, s.policyRate - 1.2);
function depositCap(s) {
  let c = 0; for (const b of s.branches) c += CITIES[b].cap;
  if (s.upgrades.marketing) c *= 1.25;
  if (s.upgrades.app) c *= 1.2;
  return c;
}
const FEES = { bas: { label: 'Bas', rate: 0.2, att: 1.15, rep: 1 }, normal: { label: 'Normaux', rate: 0.6, att: 1, rep: 0 }, eleve: { label: 'Élevés', rate: 1.5, att: 0.8, rep: -2 } };
function depositTarget(s) {
  const att = clamp(Math.exp(0.6 * (s.depositRate - marketDepRate(s))), 0.2, 4);
  const rep = 0.4 + s.reputation / 80;
  return depositCap(s) * att * rep * FEES[s.fees].att;
}
function loanDemand(s) {
  let f = 0; for (const b of s.branches) f += CITIES[b].loans;
  f *= ECON[s.economy].demand;
  if (s.upgrades.marketing) f *= 1.3;
  if (s.upgrades.ia) f *= 1.3;
  f *= 0.6 + s.reputation / 125;
  if (s.flags.strikeUntil > s.day) f *= 0.2;
  return f;
}
function annualPD(score, type) {
  return clamp(0.35 * Math.exp(-(score - 300) / 105) * LOAN_TYPES[type].pd * DIFFS[S.diff].pd, 0.001, 0.85);
}
function grade(score) { return score >= 750 ? 'A' : score >= 670 ? 'B' : score >= 580 ? 'C' : score >= 500 ? 'D' : 'E'; }
function payment(P, rateAnnual, n) { const i = rateAnnual / 1200; return i === 0 ? P / n : P * i / (1 - Math.pow(1 + i, -n)); }
function acceptProb(r) { return 1 / (1 + Math.exp((r.offer - r.maxRate) * 1.8)); }
function cbLimit(s) { return 1e6 + 0.5 * loansOut(s) + 0.9 * holdingValue(s, 'oat'); }
function monthlyCosts(s) {
  let c = 0; for (const b of s.branches) c += CITIES[b].rent;
  for (const u in s.upgrades) c += UPGRADES[u].monthly;
  if (s.flags.cats) c += 2000;
  return c;
}

// ---------- Journal / notifications ----------
function log(msg, type = '') {
  S.log.unshift({ d: S.day, msg, type });
  if (S.log.length > 80) S.log.pop();
}
function toast(msg, type = '', key) {
  if (key) { if (ui.toastKeys[key] > Date.now()) return; ui.toastKeys[key] = Date.now() + 8000; }
  const el = document.createElement('div');
  el.className = 'toast ' + type; el.innerHTML = msg;
  $('#toasts').appendChild(el);
  while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 4500);
}
function floatMoney(amount, x, y) {
  const el = document.createElement('div');
  el.className = 'float-money ' + cls(amount);
  el.textContent = (amount >= 0 ? '+' : '') + money(amount);
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 1200);
}

// ---------- Génération des demandes de prêt ----------
function personName() { return pick(FIRST) + ' ' + pick(LAST); }
function makeRequest(s, forcedType) {
  const types = {}; for (const t in LOAN_TYPES) types[t] = LOAN_TYPES[t].w;
  const type = forcedType || weighted(types);
  const T = LOAN_TYPES[type];
  const scale = 1 + 0.12 * (s.branches.length - 1);
  const amount = Math.round(Math.exp(rnd(Math.log(T.amt[0]), Math.log(T.amt[1]))) * scale / 1000) * 1000;
  const name = T.who === 'p' ? personName() : T.who === 'c' ? pick(COMPANY).replace('{L}', pick(LAST)) : pick(STARTUP);
  const score = clamp(Math.round(640 + gauss() * 110), 300, 850);
  const pd = annualPD(score, type);
  const el = pd * (1 - T.rec) * 100;
  const fair = s.policyRate + T.spread + el;
  const maxRate = s.policyRate + T.spread + el * 0.8 + rnd(-0.6, 1.6);
  return {
    id: s.nextId++, type, name, reason: pick(T.reasons), amount,
    dur: rint(T.dur[0] / 6, T.dur[1] / 6) * 6, score, maxRate,
    offer: Math.round(clamp(fair, 0.5, 25) * 10) / 10, expires: s.day + rint(12, 20),
  };
}

function grantLoan(s, r) {
  const T = LOAN_TYPES[r.type];
  let pdA = annualPD(r.score, r.type) * (1 + Math.max(0, r.offer - r.maxRate + 1) * 0.06);
  if (s.upgrades.ia) pdA *= 0.75;
  s.cash -= r.amount;
  s.loans.push({ id: r.id, type: r.type, name: r.name, out: r.amount, amount: r.amount, rate: r.offer, left: r.dur, dur: r.dur, pmt: payment(r.amount, r.offer, r.dur), pdA, grade: grade(r.score), since: s.day });
  s.stats.granted++;
  log(`${T.icon} Prêt de ${money(r.amount)} accordé à ${r.name} à ${pct(r.offer)}.`, 'good');
}

// ---------- Boucle quotidienne ----------
function tickDay() {
  const s = S;
  s.day++;
  updateMarket(s);
  updateDeposits(s);

  // Demandes de prêt
  const p = clamp(0.12 * loanDemand(s), 0, 0.9);
  if (s.requests.length < 8 && chance(p)) {
    s.requests.push(makeRequest(s));
    if (ui.tab !== 'loans') toast('🤝 Nouvelle demande de prêt', '', 'req');
  }
  const before = s.requests.length;
  s.requests = s.requests.filter(r => r.expires > s.day);
  if (s.requests.length < before) s.stats.refused += before - s.requests.length;

  // Liquidité négative → prêt d'urgence de la banque centrale
  if (s.cash < 0) {
    const need = -s.cash + 50e3;
    s.cbDebt += need; s.cash += need; s.flags.penalty = s.day + 30;
    s.reputation = clamp(s.reputation - 2, 0, 100);
    log(`🚨 Découvert ! La banque centrale vous prête ${money(need)} en urgence (taux pénalité).`, 'bad');
    toast(`🚨 Liquidités épuisées : prêt d’urgence de ${money(need)}`, 'bad', 'urg');
  }

  // Ruée bancaire
  if (s.deposits > 0 && s.cash / s.deposits < 0.05) {
    s.reputation = clamp(s.reputation - 0.25, 0, 100);
    if (s.reputation < 25 && chance(0.02)) bankRun(s, 0.25);
  }

  // Événements
  if (s.day > 25 && !ui.modal && chance(DIFFS[s.diff].ev / 38)) triggerEvent();

  if (s.day % 30 === 0) monthEnd(s);
  checkAchievements(s);
  ui.dirty = true;
}

function bankRun(s, frac) {
  const out = s.deposits * frac;
  s.deposits -= out; s.cash -= out;
  s.reputation = clamp(s.reputation - 8, 0, 100);
  log(`🏃 Panique bancaire ! Les clients retirent ${money(out)}.`, 'bad');
  toast(`🏃‍♂️ PANIQUE BANCAIRE ! ${money(out)} retirés`, 'bad');
}

function updateMarket(s) {
  const drift = ECON[s.economy].drift;
  for (const id in ASSETS) {
    const a = ASSETS[id], m = s.market[id];
    let r = drift * a.beta + a.vol * gauss();
    if (id === 'oat') r = 0.00005 + a.vol * gauss();
    if (id === 'snail' && s.flags.snailMania > s.day) r += 0.07;
    if (id === 'crypto' && chance(0.003)) r += pick([-0.35, 0.4]); // coups de folie
    m.price = Math.max(a.base * 0.01, m.price * Math.exp(r));
    m.hist.push(m.price);
    if (m.hist.length > 240) m.hist.shift();
  }
}

function updateDeposits(s) {
  const target = depositTarget(s);
  let delta = (target - s.deposits) * 0.015 + s.deposits * 0.003 * gauss();
  if (s.deposits + delta < 0) delta = -s.deposits;
  s.deposits += delta; s.cash += delta;
}

// ---------- Fin de mois ----------
function monthEnd(s) {
  const econ = ECON[s.economy];
  const pl = { interest: 0, fees: 0, coupons: 0, depInt: 0, cbInt: 0, costs: 0, losses: 0, tax: 0 };
  let defaults = 0;
  const rec0 = s.upgrades.recouvrement ? 0.2 : 0;

  for (const L of s.loans) {
    const pdm = 1 - Math.pow(1 - clamp(L.pdA * econ.pd, 0, 0.95), 1 / 12);
    if (chance(pdm)) {
      const rec = Math.min(0.95, LOAN_TYPES[L.type].rec + rec0);
      const got = L.out * rec;
      s.cash += got; pl.losses += L.out - got;
      L.dead = true; defaults++; s.stats.defaults++;
      log(`💥 ${L.name} ne rembourse plus (${LOAN_TYPES[L.type].label}). Perte : ${money(L.out - got)}.`, 'bad');
      continue;
    }
    const interest = L.out * L.rate / 1200;
    let pay = Math.min(L.pmt, L.out + interest);
    L.left--;
    if (L.left <= 0) pay = L.out + interest;
    L.out -= pay - interest;
    s.cash += pay; pl.interest += interest;
    if (L.left <= 0 || L.out < 1) { L.done = true; L.out = 0; }
  }
  s.loans = s.loans.filter(l => !l.dead && !l.done);
  if (defaults) toast(`💥 ${defaults} défaut${defaults > 1 ? 's' : ''} de paiement ce mois-ci`, 'bad');

  pl.depInt = s.deposits * s.depositRate / 1200; s.deposits += pl.depInt;
  const penalty = s.flags.penalty > s.day ? 3 : 0;
  pl.cbInt = s.cbDebt * (cbRate(s) + penalty) / 1200; s.cash -= pl.cbInt;
  pl.costs = monthlyCosts(s); s.cash -= pl.costs;
  pl.fees = s.deposits * FEES[s.fees].rate / 1200;
  if (s.upgrades.dab) pl.fees += s.deposits * 0.25 / 1200;
  s.cash += pl.fees;
  pl.coupons = holdingValue(s, 'oat') * (s.policyRate + 0.4) / 1200; s.cash += pl.coupons;

  const profit = pl.interest + pl.fees + pl.coupons - pl.depInt - pl.cbInt - pl.costs - pl.losses;
  if (profit > 0) { pl.tax = profit * 0.25; s.cash -= pl.tax; }
  pl.net = profit - pl.tax;
  s.stats.interest += pl.interest;
  s.lastPL = pl;

  // Réputation
  let dr = (50 - s.reputation) * 0.03 + FEES[s.fees].rep + (s.upgrades.app ? 1 : 0);
  if (s.surveillance) dr -= 3;
  s.reputation = clamp(s.reputation + dr, 0, 100);

  // Mafia
  if (s.flags.mafia && chance(0.12)) {
    const fine = s.flags.mafia * 2.5 / (s.upgrades.conformite ? 3 : 1);
    s.cash -= fine; s.reputation = clamp(s.reputation - 35, 0, 100); s.flags.mafia = 0;
    log(`🚔 Scandale ! L’argent de la mafia a été découvert. Amende : ${money(fine)}.`, 'bad');
    eventModal('🚔', 'Le scandale éclate !', `La presse a découvert l’argent sale de M. Corleone dans vos coffres. Amende de <b>${money(fine)}</b> et réputation en chute libre.`, [{ label: 'Aïe.' }]);
  }

  // Économie
  s.econTimer--;
  if (!s.nextEcon) s.nextEcon = weighted(econ.next);
  if (s.econTimer <= 0) {
    const old = s.economy;
    s.economy = s.nextEcon; s.nextEcon = null;
    s.econTimer = s.economy === 'crise' ? rint(3, 7) : rint(6, 16);
    if (old === 'crise') s.stats.crises++;
    const E = ECON[s.economy];
    log(`${E.icon} L’économie entre en phase : ${E.label}.`, s.economy === 'crise' || s.economy === 'recession' ? 'bad' : 'good');
    toast(`${E.icon} Nouvelle conjoncture : <b>${E.label}</b>`, s.economy === 'crise' ? 'bad' : 'gold');
    if (s.economy === 'crise') { for (const id of ['cac', 'tech', 'oil', 'snail', 'crypto']) s.market[id].price *= rnd(0.75, 0.88); }
  }
  // Taux directeur
  let dRate = 0;
  if (s.economy === 'croissance' && chance(0.4)) dRate = 0.25;
  if (s.economy === 'stable' && chance(0.15)) dRate = pick([-0.25, 0.25]);
  if (s.economy === 'recession' && chance(0.5)) dRate = -0.25;
  if (s.economy === 'crise' && chance(0.6)) dRate = -0.5;
  const newRate = clamp(s.policyRate + dRate, 0, 7);
  dRate = newRate - s.policyRate;
  if (dRate) {
    s.policyRate = newRate;
    s.market.oat.price *= 1 - 0.04 * dRate;
    log(`🏛️ La banque centrale ${dRate > 0 ? 'relève' : 'abaisse'} son taux directeur à ${pct(newRate, 2)}.`);
    toast(`🏛️ Taux directeur : ${pct(newRate, 2)} (${dRate > 0 ? '+' : ''}${nf2.format(dRate)})`, 'gold');
  }
  s.rateHist.push(s.policyRate); if (s.rateHist.length > 120) s.rateHist.shift();

  // Régulateur
  const eq = equity(s), ratio = capRatio(s);
  if (eq < 0) return gameOver('faillite');
  if (ratio < minRatio(s)) {
    s.lowCap++;
    if (!s.surveillance) log(`⚠️ Ratio de solvabilité sous ${minRatio(s)} % : banque placée sous surveillance.`, 'bad');
    s.surveillance = true;
    toast(`⚠️ Sous surveillance du régulateur (${s.lowCap}/6 mois)`, 'bad');
    if (s.lowCap >= 6) return gameOver('licence');
  } else {
    if (s.surveillance) { log('✅ Le régulateur lève la surveillance.', 'good'); toast('✅ Surveillance levée', 'good'); }
    s.surveillance = false; s.lowCap = 0;
  }

  s.history.push({ d: s.day, eq, cash: s.cash, dep: s.deposits, loans: loansOut(s), net: pl.net });
  if (s.history.length > 240) s.history.shift();

  if (!s.won && eq >= GOAL) {
    s.won = true;
    eventModal('🏆', 'Objectif atteint !', `<p><b>${esc(s.name)}</b> dépasse les <b>${money(GOAL)}</b> de fonds propres en ${Math.round(s.day / 30)} mois. Vous êtes désormais une banque qui compte !</p><p class="muted">Vous pouvez continuer à jouer : la Lune vous attend… 🌕</p>`, [{ label: 'Continuer l’aventure 🚀' }]);
  }
  save();
}

// ---------- Événements aléatoires ----------
const EVENTS = [
  { id: 'hack', w: 3, make: s => {
    if (s.upgrades.cyber) return { icon: '🛡️', title: 'Cyberattaque repoussée', text: 'Des hackers ont tenté de pirater vos serveurs… votre équipe cybersécurité les a renvoyés jouer à Minecraft.', choices: [{ label: 'Bien joué l’équipe ! (+3 réputation)', fn: s => { s.reputation += 3; } }] };
    const loss = Math.max(20e3, s.cash * rnd(0.04, 0.1));
    return { icon: '💻', title: 'Cyberattaque !', text: `Des hackers ont siphonné <b>${money(loss)}</b> de vos comptes ! Ils réclament une rançon pour en rendre la moitié.`, choices: [
      { label: `Payer la rançon (${money(loss * 0.15)})`, sub: 'Vous récupérez la moitié, mais ça se saura peut-être…', fn: s => { s.cash -= loss * 0.15 + loss * 0.5; if (chance(0.4)) { s.reputation -= 10; return 'La presse l’a appris. Réputation -10.'; } return 'Discret. Vous récupérez la moitié.'; } },
      { label: 'Refuser et porter plainte', sub: 'Perte totale, mais réputation intacte.', fn: s => { s.cash -= loss; s.reputation += 2; return 'La police enquête. Vous perdez tout, mais votre honnêteté plaît.'; } },
    ] };
  } },
  { id: 'braquage', w: 2, make: s => {
    if (s.upgrades.coffre) return { icon: '🔐', title: 'Braquage raté', text: 'Trois malfrats déguisés en Daft Punk ont tenté de forcer votre coffre. Il n’a même pas une rayure.', choices: [{ label: 'Merci le coffre ! (+2 réputation)', fn: s => { s.reputation += 2; } }] };
    const loss = Math.min(s.cash * 0.3, rnd(80e3, 400e3));
    return { icon: '🦹', title: 'Braquage !', text: `Des braqueurs déguisés en Daft Punk sont repartis avec <b>${money(loss)}</b>.`, choices: [{ label: 'Acheter un coffre-fort la prochaine fois…', fn: s => { s.cash -= loss; } }] };
  } },
  { id: 'mafia', w: 1.2, cond: s => !s.flags.mafia && !s.flags.honest, make: s => {
    const amt = Math.round(Math.max(2e6, depositCap(s) * 0.3) / 1e5) * 1e5;
    return { icon: '🕶️', title: 'Une offre qu’on ne peut pas refuser', text: `Un certain <b>M. Corleone</b> souhaite déposer <b>${money(amt)}</b> en liquide dans votre banque. « Sans poser de questions », précise-t-il en caressant un chat.`, choices: [
      { label: 'Accepter les valises', sub: 'Énorme dépôt gratuit… tant que personne ne sait.', fn: s => { s.cash += amt; s.flags.mafia = amt; s.flags.mafiaDep = true; return 'Les valises sont dans le coffre. Croisons les doigts.'; } },
      { label: 'Refuser poliment', fn: () => 'M. Corleone repart. Il n’a pas l’air content.' },
      { label: 'Dénoncer à la police', sub: '+15 réputation', fn: s => { s.reputation += 15; s.flags.honest = true; return 'Coup de filet ! Vous faites la une des journaux en héros.'; } },
    ] };
  } },
  { id: 'star', w: 2, make: s => {
    const star = pick(['le footballeur Kylian M.', 'la chanteuse Aya N.', 'l’acteur Omar S.', 'le youtubeur Squeezy', 'la tenniswoman Caro G.']);
    const amt = Math.round(depositCap(s) * rnd(0.05, 0.15) / 1e4) * 1e4;
    return { icon: '⭐', title: 'Une star chez vous !', text: `<b>${star}</b> veut ouvrir un compte et y placer <b>${money(amt)}</b>. Elle exige un taux de 4 % garanti… sur ce compte seulement.`, choices: [
      { label: 'Accepter (+réputation, coûteux)', fn: s => { s.cash += amt; s.deposits += amt; s.reputation += 6; s.cash -= amt * 0.04 * 0.5; return 'Selfie avec la star ! Réputation +6.'; } },
      { label: 'Refuser', fn: () => 'La star va chez le concurrent.' },
    ] };
  } },
  { id: 'viral', w: 2, make: s => {
    if (chance(0.6)) return { icon: '📱', title: 'Buzz sur TikTok !', text: 'La vidéo de votre conseiller qui danse la macarena en expliquant les taux d’intérêt fait 12 millions de vues.', choices: [{ label: 'Lui offrir une prime (20 k€) — +12 réputation', fn: s => { s.cash -= 20e3; s.reputation += 12; } }, { label: 'Ne rien faire — +7 réputation', fn: s => { s.reputation += 7; } }] };
    return { icon: '🤬', title: 'Bad buzz !', text: 'Un client filme un guichetier qui lui répond « revenez demain » pour la 14ᵉ fois. La vidéo devient virale.', choices: [
      { label: 'Excuses publiques + geste commercial (50 k€)', sub: '-3 réputation', fn: s => { s.cash -= 50e3; s.reputation -= 3; } },
      { label: 'Ignorer', sub: '-12 réputation', fn: s => { s.reputation -= 12; } },
    ] };
  } },
  { id: 'bug', w: 1.5, make: s => ({ icon: '🐛', title: 'Bug informatique', text: 'Un bug a crédité <b>1 milliard d’euros</b> sur le compte de Gérard, retraité à Limoges. Il a déjà commandé trois tracteurs et un flamant rose gonflable.', choices: [
    { label: 'Annuler l’opération (30 k€ de frais)', sub: '-3 réputation', fn: s => { s.cash -= 30e3; s.reputation -= 3; return 'Gérard est triste. Le flamant est remboursé.'; } },
    { label: 'Annuler mais lui offrir 10 k€', sub: '+8 réputation, la France adore Gérard', fn: s => { s.cash -= 40e3; s.reputation += 8; return 'Gérard passe au JT de 20 h. Tout le monde vous aime.'; } },
  ] }) },
  { id: 'greve', w: 1.5, make: s => {
    const cost = monthlyCosts(s) * 2;
    return { icon: '✊', title: 'Grève du personnel', text: 'Vos employés réclament une hausse de salaire et des croissants le vendredi.', choices: [
      { label: `Accepter (${money(cost)})`, fn: s => { s.cash -= cost; s.reputation += 2; return 'Le travail reprend, avec des croissants.'; } },
      { label: 'Refuser', sub: 'Les demandes de prêt chutent pendant 20 jours, -6 réputation', fn: s => { s.flags.strikeUntil = s.day + 20; s.reputation -= 6; return 'Les agences tournent au ralenti…'; } },
    ] };
  } },
  { id: 'inspection', w: 2, make: s => {
    const ok = capRatio(s) >= minRatio(s) + 2;
    const base = Math.max(50e3, equity(s) * 0.03);
    const fine = s.upgrades.conformite ? base / 3 : base;
    if (ok && (s.upgrades.conformite || chance(0.5))) return { icon: '🧐', title: 'Inspection du régulateur', text: 'Les inspecteurs ont épluché vos comptes pendant 3 semaines. Verdict : rien à signaler.', choices: [{ label: 'Ouf ! (+3 réputation)', fn: s => { s.reputation += 3; } }] };
    return { icon: '🧐', title: 'Inspection du régulateur', text: `Les inspecteurs ont trouvé des « irrégularités » (un tableur Excel nommé « vrais_comptes_FINAL_v3.xlsx »). Amende : <b>${money(fine)}</b>.`, choices: [{ label: 'Payer', fn: s => { s.cash -= fine; s.reputation -= 4; } }] };
  } },
  { id: 'stade', w: 1, make: s => {
    const amt = Math.round(Math.max(1e6, equity(s) * 0.4) / 1e5) * 1e5;
    return { icon: '🏟️', title: 'Le maire a une idée', text: `La mairie veut emprunter <b>${money(amt)}</b> sur 48 mois à <b>${pct(s.policyRate + 0.5)}</b> pour construire un stade de pétanque olympique. Taux faible, mais quasi aucun risque.`, choices: [
      { label: 'Financer le stade', sub: 'Prêt sûr, +5 réputation', disabled: s => s.cash < amt || s.surveillance, fn: s => { grantLoan(s, { id: s.nextId++, type: 'pro', name: 'Mairie (stade de pétanque)', amount: amt, offer: s.policyRate + 0.5, maxRate: 99, dur: 48, score: 850 }); s.reputation += 5; return 'Le stade portera le nom de votre banque !'; } },
      { label: 'Refuser', sub: '-4 réputation', fn: s => { s.reputation -= 4; } },
    ] };
  } },
  { id: 'licorne', w: 1.5, make: s => {
    const amt = Math.round(Math.max(200e3, equity(s) * 0.1) / 1e4) * 1e4;
    const idea = pick(['une appli qui traduit les miaulements', 'des baskets qui lacent toutes seules', 'un réseau social pour plantes vertes', 'une IA qui choisit votre fromage du jour']);
    return { icon: '🦄', title: 'Deux étudiants en sweat à capuche', text: `Ils veulent <b>${money(amt)}</b> pour lancer <b>${idea}</b>, contre 20 % de leur entreprise. 6 chances sur 10 de tout perdre… mais qui sait ?`, choices: [
      { label: `Investir ${money(amt)}`, disabled: s => s.cash < amt, fn: s => {
        s.cash -= amt; const r = Math.random();
        if (r < 0.6) return 'Faillite au bout de 8 mois. Ils ont tout dépensé en baby-foot.';
        if (r < 0.9) { s.cash += amt * 2.5; return `Rachetés par un géant ! Vous touchez ${money(amt * 2.5)}.`; }
        s.cash += amt * 30; s.flags.unicorn = true; return `🦄 C’EST UNE LICORNE ! Vous touchez ${money(amt * 30)} !`;
      } },
      { label: 'Non merci', fn: () => 'Ils partent pitcher chez votre concurrent.' },
    ] };
  } },
  { id: 'snail', w: 1, make: s => ({ icon: '🐌', title: 'Folie sur les forums', text: 'Des milliers d’internautes appellent à acheter des actions <b>Escargots & Co</b> « pour aller sur la Lune ». Le cours risque de s’envoler… pendant quelques jours.', choices: [{ label: 'Intéressant… (voir les marchés)', fn: s => { s.flags.snailMania = s.day + rint(5, 10); ui.market = 'snail'; } }] }) },
  { id: 'krach', w: 1, make: s => ({ icon: '📉', title: 'Krach éclair', text: 'Un algorithme de trading a confondu « vendre » et « vendre TOUT ». Les marchés actions plongent de 15 % en une matinée.', choices: [{ label: 'Respirer profondément', fn: s => { for (const id of ['cac', 'tech', 'oil', 'snail', 'crypto']) s.market[id].price *= 0.85; s.market.gold.price *= 1.05; } }] }) },
  { id: 'heritage', w: 1, make: s => {
    const amt = rint(2, 10) * 1e5;
    return { icon: '👵', title: 'Un héritage inattendu', text: `Mme Jeanne, cliente de 104 ans, vous lègue <b>${money(amt)}</b>… à condition de prendre soin de ses 14 chats.`, choices: [
      { label: 'Accepter les chats 🐈', sub: 'Les chats coûtent 2 000 €/mois… pour toujours', fn: s => { s.cash += amt; s.flags.cats = true; return 'Les 14 chats s’installent dans votre bureau.'; } },
      { label: 'Donner l’héritage à la SPA', sub: '+10 réputation', fn: s => { s.reputation += 10; return 'Les chats sont heureux. La France aussi.'; } },
    ] };
  } },
  { id: 'don', w: 1.2, make: s => {
    const amt = Math.max(30e3, Math.round(equity(s) * 0.01 / 1e3) * 1e3);
    return { icon: '❤️', title: 'Appel aux dons', text: `Une association caritative vous demande un don de <b>${money(amt)}</b> pour l’hiver.`, choices: [
      { label: 'Donner', sub: '+7 réputation', fn: s => { s.cash -= amt; s.reputation += 7; } },
      { label: 'Refuser', sub: '-2 réputation', fn: s => { s.reputation -= 2; } },
    ] };
  } },
  { id: 'rachat', w: 1.2, make: s => {
    const n = rint(4, 8), reqs = []; for (let i = 0; i < n; i++) reqs.push(makeRequest(s, pick(['auto', 'immo', 'pro', 'conso'])));
    const face = reqs.reduce((a, r) => a + r.amount, 0), price = face * 0.82;
    return { icon: '🏚️', title: 'Un concurrent fait faillite', text: `La Banque Populiste vend son portefeuille de <b>${n} prêts</b> (valeur <b>${money(face)}</b>) pour seulement <b>${money(price)}</b>. Attention : leurs clients sont un peu plus risqués.`, choices: [
      { label: `Racheter pour ${money(price)}`, disabled: s => s.cash < price || s.surveillance, fn: s => {
        for (const r of reqs) { r.score = Math.max(300, r.score - 60); r.offer = r.maxRate; grantLoan(s, r); s.stats.granted--; }
        s.cash += face - price; return `${n} prêts ajoutés à votre portefeuille avec une décote de ${money(face - price)}.`;
      } },
      { label: 'Passer', fn: () => 'Un fonds vautour rachète tout.' },
    ] };
  } },
  { id: 'rumeur', w: 1, cond: s => s.deposits > 1e6, make: s => ({ icon: '😱', title: 'Rumeur de faillite', text: 'Un message WhatsApp affirme que votre banque va fermer demain. Les clients commencent à faire la queue devant les agences.', choices: [
    { label: `Campagne de communication (${money(Math.max(50e3, s.deposits * 0.005))})`, sub: 'Limite les retraits à 5 %', fn: s => { s.cash -= Math.max(50e3, s.deposits * 0.005); bankRun(s, 0.05); s.reputation += 5; } },
    { label: 'Ne rien dire', sub: s.cash / Math.max(1, s.deposits) > 0.2 ? 'Vos réserves sont solides : retraits modérés' : 'Vos réserves sont faibles : risque élevé !', fn: s => { bankRun(s, s.cash / s.deposits > 0.2 ? 0.08 : 0.25); } },
  ] }) },
  { id: 'fusion', w: 1, cond: s => equity(s) > 15e6 && s.day - (s.flags.lastFusion || 0) > 360, make: s => {
    const offer = equity(s) * rnd(1.4, 2.2);
    s.flags.lastFusion = s.day;
    return { icon: '🤵', title: 'Offre de rachat', text: `<b>MégaBanque International</b> propose de racheter ${esc(s.name)} pour <b>${money(offer)}</b>. Vous partiriez à la retraite avec ce chèque (fin de partie).`, choices: [
      { label: 'Vendre et partir aux Bahamas 🏝️', sub: 'Termine la partie', fn: s => { s.fortune += offer; setTimeout(() => gameOver('vente'), 50); } },
      { label: 'Jamais ! Ma banque n’est pas à vendre', fn: s => { s.reputation += 3; } },
    ] };
  } },
  { id: 'aliens', w: 2, cond: s => s.branches.includes('lune'), make: s => {
    const amt = depositCap(s) * 0.2;
    return { icon: '👽', title: 'Clients d’un autre monde', text: `Des extraterrestres ont atterri près de votre base lunaire. Ils veulent déposer l’équivalent de <b>${money(amt)}</b> en cristaux de plutonium.`, choices: [
      { label: 'Bienvenue, chers clients !', fn: s => { s.cash += amt; s.deposits += amt; s.reputation += 10; return 'Premier compte intergalactique de l’histoire !'; } },
      { label: 'Refuser (on ne sait jamais)', fn: () => 'Ils repartent vers Mars. Il paraît qu’il y a une banque là-bas.' },
    ] };
  } },
  { id: 'pandemie', w: 0.5, cond: s => s.economy !== 'crise' && s.day > 360, make: s => ({ icon: '🦠', title: 'Épidémie mondiale', text: 'Un nouveau virus provoque un confinement mondial. Les économistes prévoient une crise imminente.', choices: [{ label: 'Sortir les masques', fn: s => { s.nextEcon = 'crise'; s.econTimer = 1; } }] }) },
  { id: 'trader', w: 1, cond: s => portfolioValue(s) > 200e3, make: s => {
    const id = pick(Object.keys(s.portfolio).filter(k => s.portfolio[k] > 0)) || 'cac';
    return { icon: '🕵️', title: 'Tuyau d’initié', text: `Un « ami » vous glisse que <b>${ASSETS[id].name}</b> va exploser demain. C’est illégal d’utiliser ce genre d’info…`, choices: [
      { label: 'Acheter massivement', sub: 'Risque d’amende', fn: s => { if (chance(0.5)) { s.market[id].price *= 1.25; if (chance(0.5)) { const f = 300e3 / (s.upgrades.conformite ? 3 : 1); s.cash -= f; s.reputation -= 10; return `Le cours monte… mais l’AMF vous attrape. Amende ${money(f)} !`; } return 'Le cours bondit de 25 % !'; } s.market[id].price *= 0.85; return 'Le tuyau était percé : -15 %.'; } },
      { label: 'Refuser', sub: '+2 réputation', fn: s => { s.reputation += 2; } },
    ] };
  } },
];

function triggerEvent() {
  const pool = EVENTS.filter(e => !e.cond || e.cond(S));
  const w = {}; pool.forEach((e, i) => w[i] = e.w);
  const e = pool[weighted(w)];
  const m = e.make(S);
  S.stats.events++;
  eventModal(m.icon, m.title, `<p>${m.text}</p>`, m.choices);
}

function eventModal(icon, title, html, choices) {
  ui.event = { choices };
  ui.modal = true;
  const btns = choices.map((c, i) => {
    const dis = c.disabled && c.disabled(S);
    return `<button data-act="choice" data-i="${i}" ${dis ? 'disabled' : ''}>${c.label}${c.sub ? `<small>${c.sub}</small>` : ''}${dis ? '<small>Impossible : fonds insuffisants ou surveillance</small>' : ''}</button>`;
  }).join('');
  showModal(`<div class="m-ico">${icon}</div><h2>${title}</h2>${html}<div class="choices">${btns}</div>`, true);
}

// ---------- Succès ----------
function checkAchievements(s) {
  for (const id in ACHS) {
    if (!s.achievements[id] && ACHS[id].t(s)) {
      s.achievements[id] = s.day;
      toast(`🏆 Succès débloqué : <b>${ACHS[id].icon} ${ACHS[id].name}</b>`, 'gold');
      log(`🏆 Succès : ${ACHS[id].name}`, 'good');
    }
  }
}

// ---------- Fin de partie ----------
function score(s) { return Math.max(0, equity(s)) + s.fortune; }
function gameOver(reason) {
  const s = S; s.over = true;
  const msgs = {
    faillite: ['💀', 'Faillite !', 'Vos fonds propres sont passés sous zéro. Les huissiers saisissent même la plante verte de l’accueil.'],
    licence: ['🚫', 'Licence retirée', 'Après 6 mois sous le ratio minimum, le régulateur vous retire votre licence bancaire.'],
    vente: ['🏝️', 'Vendu !', 'Vous avez vendu votre banque et sirotez un cocktail aux Bahamas. Bien joué.'],
    retraite: ['🎣', 'Retraite', 'Vous transmettez la banque et partez pêcher la truite en Ardèche.'],
  };
  const [icon, title, text] = msgs[reason];
  const sc = score(s);
  const best = loadBest();
  best.push({ name: s.name, score: sc, months: Math.floor(s.day / 30), reason: title, diff: s.diff, date: new Date().toLocaleDateString('fr-FR') });
  best.sort((a, b) => b.score - a.score);
  try { localStorage.setItem(BEST_KEY, JSON.stringify(best.slice(0, 8))); localStorage.removeItem(SAVE_KEY); } catch (e) { }
  const nAch = Object.keys(s.achievements).length;
  ui.modal = true;
  showModal(`<div class="m-ico">${icon}</div><h2>${title}</h2><p>${text}</p>
    <table>
      <tr><td>Durée</td><td class="r">${Math.floor(s.day / 30)} mois</td></tr>
      <tr><td>Fonds propres finaux</td><td class="r">${money(equity(s))}</td></tr>
      <tr><td>Fortune personnelle</td><td class="r">${money(s.fortune)}</td></tr>
      <tr><td>Prêts accordés / défauts</td><td class="r">${s.stats.granted} / ${s.stats.defaults}</td></tr>
      <tr><td>Succès</td><td class="r">${nAch} / ${Object.keys(ACHS).length}</td></tr>
      <tr class="total"><td>Score</td><td class="r gold-t">${money(sc)}</td></tr>
    </table>
    <div class="choices"><button class="gold" data-act="toStart">Nouvelle partie</button></div>`);
}

// ---------- Sauvegarde ----------
function save() { if (!S || S.over) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function loadSave() { try { const j = localStorage.getItem(SAVE_KEY); return j ? JSON.parse(j) : null; } catch (e) { return null; } }
function loadBest() { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || []; } catch (e) { return []; } }

// ---------- Actions du joueur ----------
const actions = {
  speed: el => setSpeed(+el.dataset.v),
  tab: el => { ui.tab = el.dataset.tab; renderTabs(); renderPanel(true); $('#panel').scrollTop = 0; },
  offer: (el, ev) => {
    const r = S.requests.find(x => x.id == el.dataset.id); if (!r) return;
    if (S.surveillance) return toast('⚠️ Sous surveillance : prêts interdits', 'bad');
    if (S.cash < r.amount) return toast('Liquidités insuffisantes ! Empruntez à la banque centrale ou attirez des dépôts.', 'bad');
    S.requests = S.requests.filter(x => x !== r);
    if (chance(acceptProb(r))) { grantLoan(S, r); toast(`✅ ${esc(r.name)} accepte votre offre à ${pct(r.offer)} !`, 'good'); floatMoney(-r.amount, ev.clientX, ev.clientY); }
    else { S.stats.refused++; toast(`❌ ${esc(r.name)} trouve votre taux trop élevé et part chez le concurrent.`, 'bad'); log(`❌ ${r.name} refuse votre offre à ${pct(r.offer)}.`); }
    renderPanel(true);
  },
  reject: el => { S.requests = S.requests.filter(x => x.id != el.dataset.id); S.stats.refused++; renderPanel(true); },
  fees: el => { S.fees = el.dataset.v; renderPanel(true); },
  selAsset: el => { ui.market = el.dataset.id; renderPanel(true); },
  tradeAmt: el => { ui.tradeAmt = +el.dataset.v; renderPanel(true); },
  buy: (el, ev) => {
    const id = ui.market, a = ASSETS[id];
    if (a.need && !S.upgrades[a.need]) return toast('Nécessite la salle des marchés', 'bad');
    if (S.surveillance) return toast('⚠️ Sous surveillance : achats interdits', 'bad');
    const amt = ui.tradeAmt, fee = amt * tradeFee();
    if (S.cash < amt + fee) return toast('Liquidités insuffisantes', 'bad');
    const qty = amt / S.market[id].price;
    S.cost[id] = (S.cost[id] || 0) + amt + fee;
    S.portfolio[id] = (S.portfolio[id] || 0) + qty;
    S.cash -= amt + fee;
    floatMoney(-(amt + fee), ev.clientX, ev.clientY);
    renderPanel(true);
  },
  sell: (el, ev) => {
    const id = ui.market, frac = +el.dataset.f;
    const q = (S.portfolio[id] || 0) * frac; if (q <= 0) return;
    const val = q * S.market[id].price, fee = val * tradeFee();
    S.cost[id] = (S.cost[id] || 0) * (1 - frac);
    S.portfolio[id] -= q; if (S.portfolio[id] < 1e-9) { delete S.portfolio[id]; delete S.cost[id]; }
    S.cash += val - fee;
    floatMoney(val - fee, ev.clientX, ev.clientY);
    renderPanel(true);
  },
  branch: el => {
    const c = CITIES[el.dataset.id];
    if (S.cash < c.cost) return toast('Liquidités insuffisantes', 'bad');
    S.cash -= c.cost; S.branches.push(el.dataset.id);
    log(`${c.icon} Nouvelle agence ouverte : ${c.name} !`, 'good'); toast(`${c.icon} Agence de ${c.name} inaugurée !`, 'good');
    renderPanel(true);
  },
  closeBranch: el => {
    const id = el.dataset.id; S.branches = S.branches.filter(b => b !== id);
    S.reputation = clamp(S.reputation - 3, 0, 100);
    log(`🔒 Agence de ${CITIES[id].name} fermée.`); renderPanel(true);
  },
  upgrade: el => {
    const u = UPGRADES[el.dataset.id];
    if (S.cash < u.cost) return toast('Liquidités insuffisantes', 'bad');
    S.cash -= u.cost; S.upgrades[el.dataset.id] = true;
    log(`${u.icon} ${u.name} installé(e).`, 'good'); toast(`${u.icon} ${u.name} : c’est parti !`, 'good');
    renderPanel(true);
  },
  cancelUp: el => { delete S.upgrades[el.dataset.id]; log(`${UPGRADES[el.dataset.id].icon} ${UPGRADES[el.dataset.id].name} résilié(e).`); renderPanel(true); },
  borrow: el => {
    let amt = +el.dataset.v; amt = Math.min(amt, cbLimit(S) - S.cbDebt);
    if (amt <= 0) return toast('Plafond de collatéral atteint', 'bad');
    S.cbDebt += amt; S.cash += amt; renderPanel(true);
  },
  repay: el => {
    let amt = el.dataset.v === 'all' ? S.cbDebt : +el.dataset.v;
    amt = Math.min(amt, S.cbDebt, S.cash); if (amt <= 0) return;
    S.cbDebt -= amt; S.cash -= amt; if (S.cbDebt < 1) S.cbDebt = 0; renderPanel(true);
  },
  bonus: el => {
    const eq = equity(S), amt = eq * +el.dataset.f;
    if (S.surveillance) return toast('⚠️ Interdit sous surveillance du régulateur', 'bad');
    if (amt <= 0 || S.cash < amt) return toast('Liquidités insuffisantes', 'bad');
    S.cash -= amt; S.fortune += amt * 0.7; S.stats.bonus += amt;
    if (+el.dataset.f >= 0.05) { S.reputation = clamp(S.reputation - 8, 0, 100); toast('📰 « Scandale des bonus ! » titre la presse. Réputation -8', 'bad'); }
    log(`😎 Vous vous versez un bonus de ${money(amt)} (${money(amt * 0.7)} après impôts).`);
    renderPanel(true);
  },
  lux: el => {
    const l = LUXURY[el.dataset.id];
    if (S.fortune < l.cost) return toast('Fortune personnelle insuffisante', 'bad');
    S.fortune -= l.cost; S.owned.push(el.dataset.id);
    toast(`${l.icon} Vous possédez maintenant : ${l.name} !`, 'gold'); log(`${l.icon} Achat perso : ${l.name}.`);
    renderPanel(true);
  },
  retire: () => { closeModal(); gameOver('retraite'); },
  confirmRetire: () => { ui.modal = true; showModal(`<div class="m-ico">🎣</div><h2>Prendre sa retraite ?</h2><p>La partie se termine et votre score est enregistré (fonds propres + fortune personnelle).</p><div class="choices"><button class="red" data-act="retire">Oui, je raccroche</button><button data-act="closeModal">Non, je continue</button></div>`); },
  choice: el => {
    const c = ui.event.choices[+el.dataset.i];
    closeModal();
    const res = c.fn ? c.fn(S) : null;
    S.reputation = clamp(S.reputation, 0, 100);
    if (res) { toast(res, 'gold'); log(res); }
    ui.dirty = true; renderPanel(true);
  },
  closeModal: () => closeModal(),
  menu: () => {
    ui.modal = true;
    showModal(`<div class="m-ico">☰</div><h2>Menu</h2><div class="choices">
      <button data-act="closeModal">▶ Reprendre</button>
      <button data-act="help">❓ Comment jouer</button>
      <button data-act="saveNow">💾 Sauvegarder</button>
      <button data-act="confirmRetire">🎣 Prendre sa retraite (terminer)</button>
      <button data-act="toStart">🏠 Retour à l’accueil</button></div>`);
  },
  saveNow: () => { save(); closeModal(); toast('💾 Partie sauvegardée', 'good'); },
  toStart: () => { save(); closeModal(true); S = null; showStart(); },
  help: () => { ui.modal = true; showModal(HELP); },
  continue: () => { const s = loadSave(); if (s) startGame(s); },
  newGame: () => {
    const name = $('#bankName').value.trim() || randomBankName();
    if (loadSave() && !confirm('Une partie est en cours. L’écraser ?')) return;
    startGame(newState(name, ui.diff));
    setTimeout(() => { ui.modal = true; showModal(WELCOME()); }, 200);
  },
  randName: () => { $('#bankName').value = randomBankName(); },
  diff: el => { ui.diff = el.dataset.v; renderDiffs(); },
};
const tradeFee = () => S.upgrades.trading ? 0.001 : 0.005;

function randomBankName() {
  return pick(['Banque', 'Crédit', 'Caisse', 'Société Générale', 'Comptoir', 'Banque Populaire']) + ' ' +
    pick(['du Lapin d’Or', 'des Escargots Réunis', 'de la Baguette', 'Mutuel du Camembert', 'des Pigeons Voyageurs', 'Galactique', 'du Petit Cochon', 'Agricole de la Lune', 'des Licornes', 'du Croissant']);
}

function setSpeed(v) {
  ui.speed = v; if (v) ui.prevSpeed = v;
  document.querySelectorAll('#speeds button').forEach(b => b.classList.toggle('on', +b.dataset.v === v));
}

// ---------- Interface ----------
function showModal(html, noClose) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-box">${html}</div>`;
  m.hidden = false;
  m.dataset.noclose = noClose ? '1' : '';
}
function closeModal(force) {
  if (S && S.over && !force) return;
  $('#modal').hidden = true; ui.modal = false;
}

const TABS = [
  ['dash', '📊', 'Tableau de bord'], ['loans', '🤝', 'Prêts'], ['deposits', '💰', 'Dépôts'], ['markets', '📈', 'Marchés'],
  ['branches', '🏢', 'Agences'], ['upgrades', '⚙️', 'Améliorations'], ['cb', '🏛️', 'Banque centrale'], ['me', '😎', 'Vous'], ['achs', '🏆', 'Succès'],
];
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([id, ic, lb]) => {
    const badge = id === 'loans' && S.requests.length ? `<span class="badge">${S.requests.length}</span>` : '';
    return `<button data-act="tab" data-tab="${id}" class="${ui.tab === id ? 'on' : ''}">${ic} ${lb}${badge}</button>`;
  }).join('');
  ui.tabsKey = S.requests.length;
}

function renderTop() {
  const s = S, eq = equity(s), r = capRatio(s), E = ECON[s.economy];
  $('#tbName').textContent = s.name;
  $('#tbDate').textContent = dateStr(s.day);
  const ep = $('#tbEcon'); ep.textContent = `${E.icon} ${E.label}`; ep.style.background = E.color + '33'; ep.style.color = E.color;
  $('#tbCash').textContent = money(s.cash); $('#tbCash').className = s.cash < s.deposits * 0.08 ? 'neg' : '';
  $('#tbEq').textContent = money(eq); $('#tbEq').className = eq < 0 ? 'neg' : '';
  $('#tbRatio').textContent = r === Infinity ? '∞' : pct(r); $('#tbRatio').className = r < minRatio(s) ? 'neg' : r < minRatio(s) + 3 ? 'gold-t' : 'pos';
  $('#tbRep').textContent = Math.round(s.reputation) + '/100'; $('#tbRep').className = s.reputation < 30 ? 'neg' : s.reputation > 70 ? 'pos' : '';
  if (ui.tabsKey !== s.requests.length) renderTabs();
}

function canRender() {
  if (ui.pointerDown) return false;
  const a = document.activeElement;
  return !(a && $('#panel').contains(a) && a.matches('input[type=number],input[type=text]'));
}
function renderPanel(force) {
  if (!S) return;
  if (!force && !canRender()) return;
  const views = { dash: vDash, loans: vLoans, deposits: vDeposits, markets: vMarkets, branches: vBranches, upgrades: vUpgrades, cb: vCB, me: vMe, achs: vAchs };
  const st = $('#panel').scrollTop;
  $('#panel').innerHTML = (S.surveillance ? `<div class="alert red">⚠️ <b>Banque sous surveillance</b> : ratio de solvabilité sous ${minRatio(S)} % (${S.lowCap}/6 mois avant retrait de licence). Nouveaux prêts, achats d’actifs et bonus interdits. Remboursez des dettes, vendez des actifs risqués ou attendez que les prêts soient remboursés.</div>` : '') + views[ui.tab]();
  $('#panel').scrollTop = st;
  drawCharts();
  ui.dirty = false;
}

const kpi = (label, val, sub = '', c = '') => `<div class="kpi"><small>${label}</small><b class="${c}">${val}</b>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;

function vDash() {
  const s = S, eq = equity(s), r = capRatio(s), E = ECON[s.economy], pl = s.lastPL, lo = loansOut(s), pv = portfolioValue(s);
  const prog = clamp(eq / GOAL * 100, 0, 100);
  const nextE = s.upgrades.quantique && s.nextEcon ? `<p>⚛️ Prédiction quantique : <b>${ECON[s.nextEcon].icon} ${ECON[s.nextEcon].label}</b> dans ${s.econTimer} mois.</p>` : '';
  const plRows = pl ? [
    ['Intérêts des prêts', pl.interest], ['Frais bancaires', pl.fees], ['Coupons obligataires', pl.coupons],
    ['Intérêts versés aux épargnants', -pl.depInt], ['Intérêts banque centrale', -pl.cbInt], ['Loyers & salaires', -pl.costs],
    ['Pertes sur défauts', -pl.losses], ['Impôt sur les sociétés', -pl.tax],
  ].map(([l, v]) => `<tr><td>${l}</td><td class="r ${v ? cls(v) : 'muted'}">${money(v)}</td></tr>`).join('') + `<tr class="total"><td>Résultat net</td><td class="r ${cls(pl.net)}">${money(pl.net)}</td></tr>` : '<tr><td class="muted">Disponible à la fin du premier mois.</td></tr>';
  return `
  ${!s.won ? `<div class="card hl"><div class="row"><b class="grow">🎯 Objectif : ${money(GOAL)} de fonds propres</b><span class="muted">${pct(prog)}</span></div><div class="pbar" style="margin-top:8px"><i style="width:${prog}%"></i></div></div>` : ''}
  <div class="grid kpis">
    ${kpi('Fonds propres', money(eq), 'Ce que vaut votre banque', eq < 0 ? 'neg' : '')}
    ${kpi('Liquidités', money(s.cash), `${pct(s.deposits ? s.cash / s.deposits * 100 : 100)} des dépôts`)}
    ${kpi('Dépôts clients', money(s.deposits), `Rémunérés à ${pct(s.depositRate, 2)}`)}
    ${kpi('Encours de prêts', money(lo), `${s.loans.length} prêts actifs`)}
    ${kpi('Portefeuille', money(pv), 'Actions, obligations…')}
    ${kpi('Ratio de solvabilité', r === Infinity ? '∞' : pct(r), `Minimum ${minRatio(s)} %`, r < minRatio(s) ? 'neg' : 'pos')}
    ${kpi('Résultat du mois', pl ? money(pl.net) : '—', 'Après impôts', pl ? cls(pl.net) : '')}
    ${kpi('Réputation', Math.round(s.reputation) + '/100', s.reputation > 70 ? 'Adorée' : s.reputation > 40 ? 'Correcte' : 'Mal vue', s.reputation < 30 ? 'neg' : '')}
  </div>
  <div class="grid two">
    <section class="card"><h3>📈 Évolution des fonds propres</h3><canvas class="chart" data-chart="equity"></canvas></section>
    <section class="card"><h3>${E.icon} Conjoncture : <span style="color:${E.color}">${E.label}</span></h3>
      <p>Taux directeur : <b>${pct(s.policyRate, 2)}</b> · Taux de défaut ×${E.pd} · Demande de crédit ×${E.demand}</p>
      ${nextE}
      <p class="muted small">Croissance → les marchés montent et les clients remboursent. Crise → défauts ×3, bourse en chute, l’or brille.</p>
      <canvas class="chart sm" data-chart="rate"></canvas>
    </section>
  </div>
  <div class="grid two">
    <section class="card"><h3>⚖️ Bilan</h3><table>
      <tr><th>Actif (ce que vous possédez)</th><th class="r"></th></tr>
      <tr><td>Liquidités</td><td class="r">${money(s.cash)}</td></tr>
      <tr><td>Prêts aux clients</td><td class="r">${money(lo)}</td></tr>
      <tr><td>Titres financiers</td><td class="r">${money(pv)}</td></tr>
      <tr class="total"><td>Total actif</td><td class="r">${money(s.cash + lo + pv)}</td></tr>
      <tr><th>Passif (ce que vous devez)</th><th></th></tr>
      <tr><td>Dépôts des clients</td><td class="r">${money(s.deposits)}</td></tr>
      <tr><td>Dette banque centrale</td><td class="r">${money(s.cbDebt)}</td></tr>
      <tr><td>Fonds propres</td><td class="r ${cls(eq)}">${money(eq)}</td></tr>
      <tr class="total"><td>Total passif</td><td class="r">${money(s.deposits + s.cbDebt + eq)}</td></tr>
    </table></section>
    <section class="card"><h3>🧾 Compte de résultat — mois dernier</h3><table>${plRows}</table></section>
  </div>
  <section class="card"><h3>📰 Journal</h3><ul class="log">${s.log.slice(0, 40).map(l => `<li class="${l.type}"><small>${dateStr(l.d)}</small>${esc(l.msg)}</li>`).join('') || '<li class="muted">Rien pour l’instant.</li>'}</ul></section>`;
}

function vLoans() {
  const s = S, an = s.upgrades.analyste;
  const reqs = s.requests.map(r => {
    const T = LOAN_TYPES[r.type], g = grade(r.score), p = acceptProb(r), left = r.expires - s.day;
    const pd = annualPD(r.score, r.type) * (s.upgrades.ia ? 0.75 : 1);
    const isNew = !ui.seen.has(r.id); ui.seen.add(r.id);
    return `<div class="req ${isNew ? 'new' : ''}" data-req="${r.id}">
      <div class="req-h"><span class="ico">${T.icon}</span><div><b>${esc(r.name)}</b><small>${T.label} pour ${esc(r.reason)}</small></div><span class="grade g-${g}" title="Note de crédit">${g}</span></div>
      <div class="req-info">Montant <b>${money(r.amount)}</b> · Durée <b>${r.dur} mois</b></div>
      <div class="req-info">${an ? `Score <b>${r.score}</b> · Défaut <b>${pct(pd * 100)}/an</b> · Récupération ${Math.round(T.rec * 100)} %` : '🔍 Embauchez un analyste pour voir le score exact.'}</div>
      <div class="row"><span class="grow">Taux proposé</span><b data-o="rate">${pct(r.offer)}</b></div>
      <input type="range" min="0.5" max="25" step="0.1" value="${r.offer}" data-input="rate" data-id="${r.id}">
      <div class="req-info">Chance d’acceptation <b data-o="p" class="${p > 0.6 ? 'pos' : p < 0.3 ? 'neg' : 'gold-t'}">${Math.round(p * 100)} %</b> · Mensualité <b data-o="pmt">${money(payment(r.amount, r.offer, r.dur))}</b></div>
      <div class="pbar"><i data-o="bar" style="width:${p * 100}%"></i></div>
      <div class="row"><button class="green grow" data-act="offer" data-id="${r.id}">Proposer</button><button class="ghost" data-act="reject" data-id="${r.id}">Refuser</button><span class="expire ${left < 5 ? 'soon' : 'muted'}">⏳ ${left} j</span></div>
    </div>`;
  }).join('');
  const lo = loansOut(s);
  const avg = lo ? s.loans.reduce((a, l) => a + l.rate * l.out, 0) / lo : 0;
  const expLoss = s.loans.reduce((a, l) => a + l.out * l.pdA * ECON[s.economy].pd * (1 - LOAN_TYPES[l.type].rec), 0);
  const list = [...s.loans].sort((a, b) => b.out - a.out).slice(0, 60).map(l => `<tr><td>${LOAN_TYPES[l.type].icon} ${esc(l.name)}</td><td><span class="grade g-${l.grade}">${l.grade}</span></td><td class="r">${money(l.out)}</td><td class="r">${pct(l.rate)}</td><td class="r">${l.left} m</td></tr>`).join('');
  return `
  <div class="alert blue">💡 Plus le taux est élevé, plus vous gagnez… mais moins le client accepte, et plus il risque de faire défaut. La note (A → E) indique la fiabilité de l’emprunteur.</div>
  <h3>📥 Demandes en attente (${s.requests.length})</h3>
  ${reqs ? `<div class="grid cards">${reqs}</div>` : '<div class="card muted">Aucune demande pour l’instant. Ouvrez des agences, faites du marketing ou soignez votre réputation pour en recevoir plus.</div>'}
  <div class="grid kpis">
    ${kpi('Encours total', money(lo), `${s.loans.length} prêts`)}
    ${kpi('Taux moyen', pct(avg, 2))}
    ${kpi('Pertes attendues / an', money(expLoss), 'Selon la conjoncture', 'neg')}
    ${kpi('Défauts historiques', s.stats.defaults, `sur ${s.stats.granted} prêts`)}
  </div>
  <section class="card"><h3>📂 Portefeuille de prêts</h3><div class="scroll"><table><tr><th>Client</th><th>Note</th><th class="r">Restant dû</th><th class="r">Taux</th><th class="r">Reste</th></tr>${list || '<tr><td class="muted" colspan="5">Aucun prêt actif.</td></tr>'}</table></div></section>`;
}

function vDeposits() {
  const s = S, target = depositTarget(s), mr = marketDepRate(s);
  return `
  <div class="alert blue">💡 Les dépôts sont l’argent que vos clients vous confient. Vous les rémunérez, puis vous les prêtez plus cher : c’est la <b>marge d’intérêt</b>, le cœur du métier de banquier.</div>
  <div class="grid kpis">
    ${kpi('Dépôts actuels', money(s.deposits))}
    ${kpi('Dépôts visés', money(target), 'Vers où vos dépôts évoluent', target > s.deposits ? 'pos' : 'neg')}
    ${kpi('Capacité du réseau', money(depositCap(s)), `${s.branches.length} agence(s)`)}
    ${kpi('Coût mensuel', money(s.deposits * s.depositRate / 1200), 'Intérêts versés')}
  </div>
  <div class="grid two">
    <section class="card"><h3>💶 Taux de rémunération des dépôts</h3>
      <div class="row"><span class="grow">Votre taux</span><b data-o="drate" style="font-size:22px">${pct(s.depositRate, 2)}</b></div>
      <input type="range" min="0" max="8" step="0.05" value="${s.depositRate}" data-input="drate">
      <p class="muted small">Taux moyen des concurrents : <b>${pct(mr, 2)}</b>. Au-dessus, les épargnants affluent ; en dessous, ils partent.</p>
      <h3 style="margin-top:16px">🧾 Frais bancaires</h3>
      <div class="seg">${Object.entries(FEES).map(([k, f]) => `<button data-act="fees" data-v="${k}" class="${s.fees === k ? 'on' : ''}">${f.label} (${pct(f.rate)}/an)</button>`).join('')}</div>
      <p class="muted small">Des frais élevés rapportent plus mais font fuir les clients et baissent votre réputation chaque mois.</p>
    </section>
    <section class="card"><h3>📊 Dépôts vs liquidités</h3><canvas class="chart" data-chart="deposits"></canvas></section>
  </div>`;
}

function vMarkets() {
  const s = S, sel = ui.market, A = ASSETS[sel], m = s.market[sel];
  const rows = Object.entries(ASSETS).map(([id, a]) => {
    const mk = s.market[id], h = mk.hist, ch = (mk.price / h[Math.max(0, h.length - 31)] - 1) * 100;
    const locked = a.need && !s.upgrades[a.need];
    return `<div class="asset ${sel === id ? 'sel' : ''} ${locked ? 'locked' : ''}" data-act="selAsset" data-id="${id}"><span class="ico">${a.icon}</span>
      <div class="nm"><b>${a.name}</b><small>${s.portfolio[id] ? 'Détenu : ' + money(holdingValue(s, id)) : locked ? '🔒 Salle des marchés requise' : '—'}</small></div>
      <div class="px"><b>${money(mk.price)}</b><small class="${cls(ch)}">${sign(ch)}${pct(ch)} /30 j</small></div></div>`;
  }).join('');
  const held = holdingValue(s, sel), cost = s.cost[sel] || 0, pnl = held - cost;
  const amts = [10e3, 100e3, 1e6, 10e6];
  return `
  <div class="grid two">
    <section class="card"><h3>💹 Marchés</h3>${rows}</section>
    <section class="card"><h3>${A.icon} ${A.name} — <span class="gold-t">${money(m.price)}</span></h3>
      <canvas class="chart" data-chart="asset"></canvas>
      <p class="muted small">${A.desc} Pondération risque : ${A.rw * 100} %.</p>
      <p>Position : <b>${money(held)}</b> ${held ? `· Plus-value : <b class="${cls(pnl)}">${money(pnl)}</b>` : ''}</p>
      <div class="row">Montant : <div class="seg">${amts.map(a => `<button data-act="tradeAmt" data-v="${a}" class="${ui.tradeAmt === a ? 'on' : ''}">${money(a)}</button>`).join('')}</div></div>
      <div class="row" style="margin-top:10px"><button class="green grow" data-act="buy">Acheter ${money(ui.tradeAmt)}</button></div>
      <div class="row" style="margin-top:8px"><button class="red grow" data-act="sell" data-f="0.25" ${held ? '' : 'disabled'}>Vendre 25 %</button><button class="red grow" data-act="sell" data-f="0.5" ${held ? '' : 'disabled'}>50 %</button><button class="red grow" data-act="sell" data-f="1" ${held ? '' : 'disabled'}>Tout</button></div>
      <p class="muted small">Frais de courtage : ${pct(tradeFee() * 100, 2)} par opération.</p>
    </section>
  </div>`;
}

function vBranches() {
  const s = S;
  return `<div class="alert blue">💡 Chaque agence augmente vos dépôts potentiels et le nombre de demandes de prêt. Mais attention aux loyers !</div>
  <div class="grid cards">${Object.entries(CITIES).map(([id, c]) => {
    const own = s.branches.includes(id);
    return `<div class="item ${own ? 'owned' : ''}"><div class="ico">${c.icon}</div><b>${c.name}</b><p>${c.desc || ''}</p>
      <div class="meta">Dépôts potentiels : <b>${money(c.cap)}</b><br>Demandes de prêt : <b>×${c.loans}</b><br>Loyer : <b>${money(c.rent)}/mois</b></div>
      ${own ? (id === 'siege' ? '<span class="pos">✅ Votre QG</span>' : `<button class="sm ghost" data-act="closeBranch" data-id="${id}">Fermer l’agence</button>`) : `<button class="gold" data-act="branch" data-id="${id}" ${s.cash < c.cost ? 'disabled' : ''}>Ouvrir — ${money(c.cost)}</button>`}
    </div>`;
  }).join('')}</div>`;
}

function vUpgrades() {
  const s = S;
  return `<div class="grid cards">${Object.entries(UPGRADES).map(([id, u]) => {
    const own = s.upgrades[id], lock = u.req && !s.upgrades[u.req];
    return `<div class="item ${own ? 'owned' : ''}"><div class="ico">${u.icon}</div><b>${u.name}</b><p>${u.desc}</p>
      <div class="meta">Coût mensuel : <b>${money(u.monthly)}</b>${lock ? `<br><span class="neg">Nécessite : ${UPGRADES[u.req].name}</span>` : ''}</div>
      ${own ? `<button class="sm ghost" data-act="cancelUp" data-id="${id}">✅ Actif — résilier</button>` : `<button class="gold" data-act="upgrade" data-id="${id}" ${s.cash < u.cost || lock ? 'disabled' : ''}>Acheter — ${money(u.cost)}</button>`}
    </div>`;
  }).join('')}</div>`;
}

function vCB() {
  const s = S, lim = cbLimit(s), pen = s.flags.penalty > s.day;
  return `<div class="alert blue">💡 La banque centrale prête aux banques au <b>taux directeur + 0,25 %</b>, contre des garanties (vos prêts et obligations). Pratique pour financer des prêts quand les dépôts manquent.</div>
  ${pen ? '<div class="alert red">🚨 Taux pénalité (+3 %) actif suite à un découvert. Gardez toujours des liquidités !</div>' : ''}
  <div class="grid kpis">
    ${kpi('Taux directeur', pct(s.policyRate, 2))}
    ${kpi('Votre taux d’emprunt', pct(cbRate(s) + (pen ? 3 : 0), 2), '', pen ? 'neg' : '')}
    ${kpi('Dette actuelle', money(s.cbDebt), `Intérêts : ${money(s.cbDebt * (cbRate(s) + (pen ? 3 : 0)) / 1200)}/mois`)}
    ${kpi('Plafond d’emprunt', money(lim), 'Selon vos garanties')}
  </div>
  <div class="grid two">
    <section class="card"><h3>🏦 Emprunter / rembourser</h3>
      <div class="row">${[100e3, 1e6, 10e6].map(v => `<button class="green grow" data-act="borrow" data-v="${v}">+ ${money(v)}</button>`).join('')}</div>
      <div class="row" style="margin-top:8px">${[100e3, 1e6].map(v => `<button class="red grow" data-act="repay" data-v="${v}">− ${money(v)}</button>`).join('')}<button class="red grow" data-act="repay" data-v="all">Tout rembourser</button></div>
    </section>
    <section class="card"><h3>📉 Historique du taux directeur</h3><canvas class="chart sm" data-chart="rate"></canvas></section>
  </div>`;
}

function vMe() {
  const s = S, eq = equity(s), best = loadBest();
  return `<div class="grid kpis">${kpi('Fortune personnelle', money(s.fortune), 'Votre argent à vous', 'gold-t')}${kpi('Bonus cumulés', money(s.stats.bonus))}${kpi('Score actuel', money(score(s)), 'Fonds propres + fortune')}${kpi('Collection', `${s.owned.length} / ${Object.keys(LUXURY).length}`)}</div>
  <div class="grid two">
    <section class="card"><h3>😎 Se verser un bonus</h3><p class="muted small">L’argent sort de la banque (liquidités) vers votre poche, après 30 % d’impôts. Au-delà de 5 % des fonds propres, la presse s’en mêle…</p>
      <div class="row">${[0.01, 0.05, 0.1].map(f => `<button class="gold grow" data-act="bonus" data-f="${f}" ${eq <= 0 ? 'disabled' : ''}>${f * 100} % (${money(Math.max(0, eq * f))})</button>`).join('')}</div>
      <button class="ghost" style="margin-top:14px" data-act="confirmRetire">🎣 Prendre sa retraite et terminer la partie</button>
    </section>
    <section class="card"><h3>🏅 Meilleurs scores</h3>${bestTable(best)}</section>
  </div>
  <h3>🛍️ Boutique de luxe</h3>
  <div class="grid cards">${Object.entries(LUXURY).map(([id, l]) => {
    const own = s.owned.includes(id);
    return `<div class="item ${own ? 'owned' : ''}"><div class="ico">${l.icon}</div><b>${l.name}</b>${own ? '<span class="pos">✅ À vous !</span>' : `<button class="gold" data-act="lux" data-id="${id}" ${s.fortune < l.cost ? 'disabled' : ''}>${money(l.cost)}</button>`}</div>`;
  }).join('')}</div>`;
}
function bestTable(best) {
  if (!best.length) return '<p class="muted">Aucune partie terminée.</p>';
  return `<table><tr><th>#</th><th>Banque</th><th class="r">Score</th><th class="r">Mois</th></tr>${best.map((b, i) => `<tr><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td><td>${esc(b.name)}<br><small class="muted">${esc(b.reason)} · ${DIFFS[b.diff]?.label || ''}</small></td><td class="r">${money(b.score)}</td><td class="r">${b.months}</td></tr>`).join('')}</table>`;
}

function vAchs() {
  const s = S, n = Object.keys(s.achievements).length;
  return `<h3>🏆 Succès (${n}/${Object.keys(ACHS).length})</h3>
  <div class="grid cards">${Object.entries(ACHS).map(([id, a]) => `<div class="item ach ${s.achievements[id] != null ? 'got' : ''}"><div class="ico">${a.icon}</div><b>${a.name}</b><p>${a.desc}</p>${s.achievements[id] != null ? `<small class="gold-t">Obtenu le ${dateStr(s.achievements[id])}</small>` : ''}</div>`).join('')}</div>
  <section class="card"><h3>📊 Statistiques</h3><table>
    <tr><td>Jours d’existence</td><td class="r">${s.day}</td></tr>
    <tr><td>Prêts accordés</td><td class="r">${s.stats.granted}</td></tr>
    <tr><td>Défauts de paiement</td><td class="r">${s.stats.defaults}</td></tr>
    <tr><td>Demandes refusées ou expirées</td><td class="r">${s.stats.refused}</td></tr>
    <tr><td>Intérêts perçus (total)</td><td class="r">${money(s.stats.interest)}</td></tr>
    <tr><td>Crises traversées</td><td class="r">${s.stats.crises}</td></tr>
    <tr><td>Événements vécus</td><td class="r">${s.stats.events}</td></tr>
  </table></section>`;
}

// ---------- Graphiques (canvas) ----------
function drawCharts() {
  document.querySelectorAll('#panel canvas[data-chart]').forEach(cv => {
    const t = cv.dataset.chart, s = S;
    if (t === 'equity') drawChart(cv, [{ data: s.history.map(h => h.eq), color: '#f5c542' }], { fmt: money });
    if (t === 'deposits') drawChart(cv, [{ data: s.history.map(h => h.dep), color: '#5aa9ff', label: 'Dépôts' }, { data: s.history.map(h => h.cash), color: '#3ddc84', label: 'Liquidités' }, { data: s.history.map(h => h.loans), color: '#b48cff', label: 'Prêts' }], { fmt: money });
    if (t === 'rate') drawChart(cv, [{ data: s.rateHist, color: '#ffa94d' }], { fmt: v => pct(v, 2), zero: true });
    if (t === 'asset') { const h = s.market[ui.market].hist; drawChart(cv, [{ data: h, color: h[h.length - 1] >= h[0] ? '#3ddc84' : '#ff5d6c' }], { fmt: money }); }
  });
}
function drawChart(cv, series, opts = {}) {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  cv.width = w * dpr; cv.height = h * dpr;
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const all = series.flatMap(s => s.data);
  c.font = '11px system-ui, sans-serif';
  if (all.length < 2) { c.fillStyle = '#8fa0bf'; c.fillText('Les données apparaîtront à la fin du premier mois…', 10, h / 2); return; }
  let mn = Math.min(...all), mx = Math.max(...all);
  if (opts.zero) mn = Math.min(mn, 0);
  if (mx - mn < 1e-9) { mx += Math.abs(mx) * 0.1 + 1; mn -= Math.abs(mn) * 0.1 + 1; }
  const pad = (mx - mn) * 0.1; mn -= pad; mx += pad;
  const L = 6, R = w - 70, T = 8, B = h - 8;
  const y = v => B - (v - mn) / (mx - mn) * (B - T);
  c.strokeStyle = '#24365c'; c.fillStyle = '#8fa0bf'; c.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const v = mn + (mx - mn) * i / 3, yy = y(v);
    c.beginPath(); c.moveTo(L, yy); c.lineTo(R, yy); c.stroke();
    c.fillText(opts.fmt ? opts.fmt(v) : v.toFixed(1), R + 6, yy + 4);
  }
  series.forEach((s, si) => {
    const n = s.data.length; if (n < 2) return;
    const x = i => L + i / (n - 1) * (R - L);
    c.beginPath(); s.data.forEach((v, i) => i ? c.lineTo(x(i), y(v)) : c.moveTo(x(i), y(v)));
    c.strokeStyle = s.color; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke();
    if (si === 0) {
      c.lineTo(x(n - 1), B); c.lineTo(x(0), B); c.closePath();
      const g = c.createLinearGradient(0, T, 0, B); g.addColorStop(0, s.color + '55'); g.addColorStop(1, s.color + '00');
      c.fillStyle = g; c.fill();
    }
    if (s.label) { c.fillStyle = s.color; c.fillText('● ' + s.label, L + 4 + si * 90, T + 10); }
  });
}

// ---------- Fil d'actualités ----------
function nextNews() {
  const s = S; if (!s) return;
  const dyn = [
    `${ECON[s.economy].icon} Conjoncture : ${ECON[s.economy].label.toLowerCase()} — taux directeur à ${pct(s.policyRate, 2)}.`,
    `📈 CAC 40 : ${nf0.format(s.market.cac.price)} pts · 🥖 BitBaguette : ${money(s.market.crypto.price)} · 🥇 Or : ${money(s.market.gold.price)}`,
    `🏦 ${s.name} : ${s.loans.length} prêts en cours, ${money(s.deposits)} de dépôts.`,
  ];
  if (s.economy === 'crise') dyn.push('🌪️ Les Français se ruent sur les lingots et les boîtes de conserve.');
  if (s.economy === 'croissance') dyn.push('🚀 Euphorie : même les escargots courent plus vite.');
  $('#tickerText').textContent = [pick(NEWS), pick(dyn), pick(NEWS)].join('     •     ');
}

// ---------- Textes ----------
const HELP = `<div class="m-ico">📘</div><h2>Comment jouer</h2>
<ul>
<li>🎯 <b>But</b> : atteindre <b>50 M€ de fonds propres</b> (et plus si affinités) sans faire faillite.</li>
<li>💰 <b>Dépôts</b> : vos clients vous confient leur argent. Rémunérez-les assez pour les attirer.</li>
<li>🤝 <b>Prêts</b> : prêtez cet argent plus cher. Choisissez le taux : trop haut, le client refuse ; trop bas, vous ne gagnez rien. Les mauvais payeurs (note D/E) font souvent défaut.</li>
<li>🏛️ <b>Banque centrale</b> : empruntez au taux directeur si vous manquez de liquidités.</li>
<li>⚖️ <b>Ratio de solvabilité</b> : fonds propres ÷ actifs risqués. Sous 8 %, le régulateur vous surveille ; 6 mois d’affilée et c’est la fin.</li>
<li>💧 <b>Liquidités</b> : ne tombez jamais à zéro, sinon prêt d’urgence à taux pénalité et risque de panique bancaire.</li>
<li>🌪️ <b>Conjoncture</b> : en crise, les défauts triplent et la bourse s’effondre. Prévoyez !</li>
<li>🏢 Ouvrez des agences, ⚙️ achetez des améliorations, 📈 spéculez sur les marchés, 😎 versez-vous des bonus pour la boutique de luxe.</li>
<li>⌨️ <b>Espace</b> = pause. La partie est sauvegardée automatiquement chaque mois.</li>
</ul><div class="choices"><button class="gold" data-act="closeModal">C’est parti !</button></div>`;
const WELCOME = () => `<div class="m-ico">🎉</div><h2>Bienvenue, PDG !</h2>
<p><b>${esc(S.name)}</b> ouvre ses portes avec <b>${money(equity(S))}</b> de capital et <b>${money(S.deposits)}</b> de dépôts.</p>
<p>Premiers conseils :</p><ul>
<li>Allez dans <b>🤝 Prêts</b> pour accepter vos premières demandes.</li>
<li>Gardez toujours une partie de vos dépôts en liquidités.</li>
<li>Un <b>🔍 analyste</b> (Améliorations) vous aidera à repérer les mauvais payeurs.</li></ul>
<div class="choices"><button class="gold" data-act="closeModal">Ouvrir les portes 🏦</button></div>`;

// ---------- Démarrage ----------
function renderDiffs() {
  $('#diffs').innerHTML = Object.entries(DIFFS).map(([k, d]) => `<button class="diff ${ui.diff === k ? 'sel' : ''}" data-act="diff" data-v="${k}"><b>${d.icon} ${d.label}</b><small>${d.desc}</small></button>`).join('');
}
function showStart() {
  $('#game').hidden = true; $('#start').hidden = false;
  const sv = loadSave();
  $('#continueBox').hidden = !sv;
  if (sv) $('#continueInfo').textContent = `${sv.name} — ${dateStr(sv.day)}`;
  if (!$('#bankName').value) $('#bankName').value = randomBankName();
  renderDiffs();
  const best = loadBest();
  $('#leaderboard').innerHTML = best.length ? `<div class="card"><h3>🏅 Meilleurs scores</h3>${bestTable(best)}</div>` : '';
}
function startGame(state) {
  S = state; ui.acc = 0;
  $('#start').hidden = true; $('#game').hidden = false;
  ui.tab = 'dash'; renderTabs(); renderTop(); renderPanel(true); setSpeed(1); nextNews();
}

// Délégation des événements
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && !el.disabled && actions[el.dataset.act]) { actions[el.dataset.act](el, e); if (S) renderTop(); return; }
  if (e.target.id === 'modal' && !$('#modal').dataset.noclose) closeModal();
});
document.addEventListener('input', e => {
  const el = e.target; if (!S) return;
  if (el.dataset.input === 'rate') {
    const r = S.requests.find(x => x.id == el.dataset.id); if (!r) return;
    r.offer = +el.value;
    const card = el.closest('.req'), p = acceptProb(r);
    card.querySelector('[data-o=rate]').textContent = pct(r.offer);
    const pe = card.querySelector('[data-o=p]'); pe.textContent = Math.round(p * 100) + ' %'; pe.className = p > 0.6 ? 'pos' : p < 0.3 ? 'neg' : 'gold-t';
    card.querySelector('[data-o=pmt]').textContent = money(payment(r.amount, r.offer, r.dur));
    card.querySelector('[data-o=bar]').style.width = p * 100 + '%';
  }
  if (el.dataset.input === 'drate') { S.depositRate = +el.value; $('[data-o=drate]').textContent = pct(S.depositRate, 2); }
});
document.addEventListener('pointerdown', () => { ui.pointerDown = true; });
document.addEventListener('pointerup', () => { ui.pointerDown = false; });
document.addEventListener('pointercancel', () => { ui.pointerDown = false; });
document.addEventListener('keydown', e => {
  if (!S || e.target.matches('input')) return;
  if (e.code === 'Space') { e.preventDefault(); setSpeed(ui.speed ? 0 : ui.prevSpeed || 1); }
  if (e.key === 'Escape' && !ui.modal) actions.menu();
});
$('#tickerText').addEventListener('animationiteration', nextNews);
window.addEventListener('beforeunload', save);
window.addEventListener('resize', () => S && drawCharts());

// Boucle principale (10 fois par seconde)
let lastRender = 0;
setInterval(() => {
  if (!S || S.over) return;
  if (!ui.modal && ui.speed) {
    ui.acc += SPEEDS[ui.speed] * 0.1;
    while (ui.acc >= 1 && !S.over && !ui.modal) { ui.acc--; tickDay(); }
  }
  if (S.over) return;
  renderTop();
  const now = Date.now();
  if (ui.dirty && now - lastRender > 400) { lastRender = now; renderPanel(); }
}, 100);

showStart();
