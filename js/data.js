'use strict';
/* =====================================================================
   BANQUE TYCOON — données du jeu
   ===================================================================== */

const SAVE_KEY = 'banqueTycoon.save.v2';
const BEST_KEY = 'banqueTycoon.best.v2';
const HQ = 'montpellier';
const START = { cash: 1e6, deposits: 0 }; // 1 M€ de capital et une agence vide, pour tout le monde

const ECON = {
  croissance: { label: 'Croissance', color: '#34d399', pd: 0.7, drift: 0.0009, demand: 1.3, rival: 0.009, next: { stable: 5, recession: 3, crise: 1 } },
  stable: { label: 'Stable', color: '#60a5fa', pd: 1, drift: 0.0003, demand: 1, rival: 0.004, next: { croissance: 5, recession: 3, crise: 1 } },
  recession: { label: 'Récession', color: '#fbbf24', pd: 1.8, drift: -0.0007, demand: 0.75, rival: -0.004, next: { stable: 4, croissance: 2, crise: 2 } },
  crise: { label: 'Crise', color: '#f87171', pd: 3, drift: -0.0028, demand: 0.5, rival: -0.018, next: { recession: 5, stable: 2 } },
};

const LOAN_TYPES = {
  conso: { label: 'Crédit conso', icon: '🛒', amt: [3e3, 30e3], dur: [6, 24], spread: 5, pd: 1.2, rec: 0.15, w: 3, rw: 0.75, who: 'p',
    reasons: ['une télé 8K', 'un canapé en cuir', 'des vacances à Bali', 'une cuisine équipée', 'son mariage', 'un home cinéma', 'une PS7'] },
  auto: { label: 'Prêt auto', icon: '🚗', amt: [8e3, 70e3], dur: [12, 48], spread: 3.5, pd: 1, rec: 0.4, w: 3, rw: 0.75, who: 'p',
    reasons: ['une citadine électrique', 'un SUV', 'un camping-car', 'une moto', 'une Twingo de 1996 « de collection »'] },
  immo: { label: 'Prêt immobilier', icon: '🏠', amt: [120e3, 900e3], dur: [36, 96], spread: 2, pd: 0.5, rec: 0.65, w: 3, rw: 0.35, who: 'p',
    reasons: ['un appartement en centre-ville', 'une maison avec jardin', 'un studio à louer', 'une longère en Bretagne', 'un loft', 'un chalet à la montagne'] },
  pro: { label: 'Prêt professionnel', icon: '🏭', amt: [50e3, 1.5e6], dur: [24, 72], spread: 3.8, pd: 1.3, rec: 0.3, w: 2, rw: 1, who: 'c',
    reasons: ['de nouvelles machines', 'un entrepôt', 'une flotte de camions', 'son expansion à l’export', 'une usine de croissants'] },
  startup: { label: 'Start-up', icon: '🦄', amt: [200e3, 3e6], dur: [24, 60], spread: 7, pd: 3, rec: 0.05, w: 1, rw: 1.5, who: 's',
    reasons: ['une IA qui écrit des poèmes pour chats', 'un Uber pour tondeuses', 'la blockchain du fromage', 'des chaussettes connectées', 'un métavers pour retraités', 'des drones livreurs de croissants'] },
  farfelu: { label: 'Projet farfelu', icon: '🤪', amt: [20e3, 400e3], dur: [12, 36], spread: 8, pd: 2.5, rec: 0.1, w: 1, rw: 1, who: 'p',
    reasons: ['un élevage d’escargots de course', 'un restaurant 100 % raclette à Dubaï', 'un parc d’attractions pour pigeons', 'un sous-marin en kit', 'une école de mimes', 'un musée de la chaussette perdue'] },
  souv: { label: 'Dette souveraine', icon: '🏛️', spread: 0, pd: 1, rec: 0.45, w: 0, rw: 1, who: 'g', reasons: [] },
};

// Notes des pays : probabilité de défaut annuelle, prime de risque, pondération réglementaire
const RATINGS = {
  AAA: { pd: 0.001, spread: 0.3, rw: 0 }, AA: { pd: 0.003, spread: 0.6, rw: 0.2 }, A: { pd: 0.007, spread: 1, rw: 0.5 },
  BBB: { pd: 0.015, spread: 1.8, rw: 1 }, BB: { pd: 0.035, spread: 3.5, rw: 1 }, B: { pd: 0.07, spread: 6, rw: 1.5 }, CCC: { pd: 0.15, spread: 10, rw: 1.5 },
};
const COUNTRIES = [
  ['Allemagne', 'AAA', 'ses ponts et ses autoroutes'], ['Pays-Bas', 'AAA', 'ses digues'], ['Suisse', 'AAA', 'ses tunnels alpins'],
  ['États-Unis', 'AA', 'son nouveau porte-avions'], ['France', 'AA', 'ses TGV'], ['Canada', 'AA', 'ses routes du Grand Nord'],
  ['Japon', 'A', 'ses robots d’aide aux seniors'], ['Espagne', 'A', 'ses fermes solaires'], ['Chili', 'A', 'ses mines de cuivre'],
  ['Italie', 'BBB', 'la rénovation du Colisée'], ['Inde', 'BBB', 'son programme spatial'], ['Mexique', 'BBB', 'son métro'],
  ['Brésil', 'BB', 'la protection de l’Amazonie'], ['Grèce', 'BB', 'ses îles'], ['Afrique du Sud', 'BB', 'ses centrales électriques'],
  ['Turquie', 'B', 'son nouvel aéroport'], ['Égypte', 'B', 'l’élargissement du canal'], ['Principauté de Bananie', 'B', 'son palais présidentiel en or'],
  ['Argentine', 'CCC', 'rembourser… ses autres dettes'], ['République du Groland', 'CCC', 'la construction d’une statue géante de son président'],
];

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

// ---------- Le monde ----------
// unlock = index du chapitre à partir duquel la région est ouverte
const REGIONS = {
  france: { name: 'France', unlock: 0, cost: 1, wage: 1, box: [-5.5, 9.5, 41.5, 51.5] },
  europe: { name: 'Europe', unlock: 3, cost: 1.4, wage: 1.2, box: [-11, 26, 36, 61] },
  ameriques: { name: 'Amériques', unlock: 4, cost: 2, wage: 1.5, box: [-125, -35, -40, 50] },
  asie: { name: 'Asie', unlock: 5, cost: 2, wage: 1.3, box: [65, 145, -5, 42] },
  afrique: { name: 'Afrique', unlock: 6, cost: 0.9, wage: 0.6, box: [-20, 42, -36, 36] },
  moyenorient: { name: 'Moyen-Orient', unlock: 6, cost: 2.2, wage: 1.5, box: [25, 60, 20, 44] },
  oceanie: { name: 'Océanie', unlock: 6, cost: 1.8, wage: 1.4, box: [140, 180, -48, -25] },
  espace: { name: 'Espace', unlock: 7, cost: 1, wage: 8, box: null },
};
const TIERS = {
  s: { label: 'Petite ville', cost: 150e3, rent: 1500, cap: 4e6, loans: 0.5, traffic: 2 },
  m: { label: 'Ville moyenne', cost: 400e3, rent: 3000, cap: 8e6, loans: 0.8, traffic: 3 },
  l: { label: 'Grande ville', cost: 1.2e6, rent: 8000, cap: 20e6, loans: 1.3, traffic: 4 },
  xl: { label: 'Métropole', cost: 4e6, rent: 25000, cap: 60e6, loans: 2.2, traffic: 5 },
  w: { label: 'Place financière mondiale', cost: 12e6, rent: 70000, cap: 150e6, loans: 3.5, traffic: 6 },
};
const CITY_LIST = [
  // id, nom, code pays, région, taille, latitude, longitude
  ['montpellier', 'Montpellier', 'FR', 'france', 'm', 43.6, 3.9], ['nimes', 'Nîmes', 'FR', 'france', 's', 43.84, 4.36], ['toulouse', 'Toulouse', 'FR', 'france', 'm', 43.6, 1.44],
  ['marseille', 'Marseille', 'FR', 'france', 'l', 43.3, 5.37], ['nice', 'Nice', 'FR', 'france', 'm', 43.7, 7.26], ['bordeaux', 'Bordeaux', 'FR', 'france', 'm', 44.84, -0.58],
  ['nantes', 'Nantes', 'FR', 'france', 'm', 47.22, -1.55], ['rennes', 'Rennes', 'FR', 'france', 's', 48.11, -1.68], ['lille', 'Lille', 'FR', 'france', 'm', 50.63, 3.06],
  ['strasbourg', 'Strasbourg', 'FR', 'france', 'm', 48.57, 7.75], ['lyon', 'Lyon', 'FR', 'france', 'l', 45.76, 4.84], ['paris', 'Paris', 'FR', 'france', 'xl', 48.86, 2.35],
  ['bruxelles', 'Bruxelles', 'BE', 'europe', 'm', 50.85, 4.35], ['geneve', 'Genève', 'CH', 'europe', 'l', 46.2, 6.15], ['londres', 'Londres', 'GB', 'europe', 'xl', 51.5, -0.13],
  ['madrid', 'Madrid', 'ES', 'europe', 'l', 40.42, -3.7], ['lisbonne', 'Lisbonne', 'PT', 'europe', 'm', 38.72, -9.14], ['milan', 'Milan', 'IT', 'europe', 'l', 45.46, 9.19],
  ['rome', 'Rome', 'IT', 'europe', 'l', 41.9, 12.5], ['berlin', 'Berlin', 'DE', 'europe', 'l', 52.52, 13.4], ['amsterdam', 'Amsterdam', 'NL', 'europe', 'l', 52.37, 4.9],
  ['vienne', 'Vienne', 'AT', 'europe', 'm', 48.2, 16.37], ['stockholm', 'Stockholm', 'SE', 'europe', 'm', 59.33, 18.07], ['athenes', 'Athènes', 'GR', 'europe', 'm', 37.98, 23.73],
  ['montreal', 'Montréal', 'CA', 'ameriques', 'l', 45.5, -73.57], ['newyork', 'New York', 'US', 'ameriques', 'w', 40.71, -74], ['miami', 'Miami', 'US', 'ameriques', 'l', 25.76, -80.19],
  ['losangeles', 'Los Angeles', 'US', 'ameriques', 'xl', 34.05, -118.24], ['mexico', 'Mexico', 'MX', 'ameriques', 'l', 19.43, -99.13], ['saopaulo', 'São Paulo', 'BR', 'ameriques', 'xl', -23.55, -46.63],
  ['buenosaires', 'Buenos Aires', 'AR', 'ameriques', 'l', -34.6, -58.38],
  ['tokyo', 'Tokyo', 'JP', 'asie', 'w', 35.68, 139.69], ['seoul', 'Séoul', 'KR', 'asie', 'xl', 37.57, 126.98], ['shanghai', 'Shanghai', 'CN', 'asie', 'w', 31.23, 121.47],
  ['hongkong', 'Hong Kong', 'HK', 'asie', 'xl', 22.32, 114.17], ['singapour', 'Singapour', 'SG', 'asie', 'xl', 1.35, 103.82], ['mumbai', 'Mumbai', 'IN', 'asie', 'l', 19.08, 72.88],
  ['casablanca', 'Casablanca', 'MA', 'afrique', 'm', 33.57, -7.59], ['dakar', 'Dakar', 'SN', 'afrique', 's', 14.72, -17.47], ['abidjan', 'Abidjan', 'CI', 'afrique', 'm', 5.36, -4.01],
  ['lagos', 'Lagos', 'NG', 'afrique', 'l', 6.52, 3.38], ['nairobi', 'Nairobi', 'KE', 'afrique', 'm', -1.29, 36.82], ['lecap', 'Le Cap', 'ZA', 'afrique', 'm', -33.92, 18.42],
  ['istanbul', 'Istanbul', 'TR', 'moyenorient', 'l', 41.01, 28.98], ['dubai', 'Dubaï', 'AE', 'moyenorient', 'xl', 25.2, 55.27], ['doha', 'Doha', 'QA', 'moyenorient', 'l', 25.29, 51.53],
  ['sydney', 'Sydney', 'AU', 'oceanie', 'xl', -33.87, 151.21], ['auckland', 'Auckland', 'NZ', 'oceanie', 'l', -36.85, 174.76],
];
const CITIES = {};
for (const [id, name, cc, region, t, lat, lon] of CITY_LIST) {
  const T = TIERS[t], R = REGIONS[region];
  CITIES[id] = { id, name, cc, region, tier: t, lat, lon, cost: id === HQ ? 0 : T.cost * R.cost, rent: T.rent * R.cost, cap: T.cap, loans: T.loans, traffic: T.traffic, build: T.cost * R.cost };
}
CITIES.lune = { id: 'lune', name: 'Base lunaire', cc: '☾', region: 'espace', tier: 'w', cost: 250e6, rent: 1e6, cap: 1.5e9, loans: 6, traffic: 4, build: 60e6, desc: 'Les premiers colons ont besoin d’une banque. Et peut-être d’autres clients…' };
CITIES.mars = { id: 'mars', name: 'Colonie martienne', cc: '♂', region: 'espace', tier: 'w', cost: 1.5e9, rent: 5e6, cap: 6e9, loans: 10, traffic: 5, build: 300e6, desc: 'Trois ans de voyage, mais zéro concurrent.' };

// ---------- Plan de l'agence ----------
const ITEMS = {
  g: { name: 'Guichet', icon: '🧾', cost: 25e3, desc: 'Accueille les épargnants. Sans guichetier, il reste fermé.' },
  gs: { name: 'Guichetier', icon: '🧑‍💼', hire: 4e3, wage: 1800, desc: '+ dépôts potentiels de l’agence.' },
  b: { name: 'Bureau de conseil', icon: '🪑', cost: 35e3, desc: 'Un bureau pour recevoir les emprunteurs.' },
  bs: { name: 'Conseiller', icon: '👩‍💼', hire: 6e3, wage: 2500, desc: '+ demandes de prêt.' },
  dab: { name: 'Distributeur', icon: '🏧', cost: 45e3, maint: 600, desc: 'Commissions mensuelles et clients plus satisfaits.' },
  vig: { name: 'Vigile', icon: '💂', hire: 2e3, wage: 1600, desc: 'Empêche les braquages dans cette agence.' },
  deco: { name: 'Décoration', icon: '🪴', cost: 10e3, desc: 'Plantes et canapés : + satisfaction des clients.' },
};
const SIZES = [null,
  { name: 'Petite agence', g: 3, b: 2, dab: 1, vig: 1, deco: 2 },
  { name: 'Agence', g: 5, b: 4, dab: 2, vig: 2, deco: 4, cost: 0.6 },
  { name: 'Grande agence', g: 7, b: 5, dab: 3, vig: 2, deco: 6, cost: 1.2 },
];

const UPGRADES = {
  analyste: { name: 'Analyste crédit', icon: '🔍', cost: 80e3, monthly: 4000, desc: 'Affiche le score exact et la probabilité de défaut des emprunteurs.' },
  coffre: { name: 'Coffres blindés', icon: '🔐', cost: 60e3, monthly: 500, desc: 'Divise par deux les pertes en cas de braquage.' },
  marketing: { name: 'Campagne marketing', icon: '📣', cost: 150e3, monthly: 8000, desc: '+25 % de dépôts potentiels, +30 % de demandes de prêt.' },
  app: { name: 'Application mobile', icon: '📱', cost: 300e3, monthly: 6000, desc: '+20 % de dépôts potentiels et +1 réputation chaque mois.' },
  cyber: { name: 'Cybersécurité', icon: '🛡️', cost: 200e3, monthly: 5000, desc: 'Bloque les cyberattaques.' },
  recouvrement: { name: 'Service de recouvrement', icon: '⚖️', cost: 120e3, monthly: 5000, desc: '+20 % récupérés sur chaque prêt en défaut.' },
  rh: { name: 'Académie interne', icon: '🎓', cost: 400e3, monthly: 6000, desc: 'Agents mieux formés : salaires -15 %, satisfaction +10.' },
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

// ---------- Concurrents ----------
const RIVALS = [
  { id: 'boncoin', name: 'Caisse du Bon Coin', eq: 1.5e6, g: 0.012, color: '#a78bfa' },
  { id: 'pognon', name: 'Banque Pognon', eq: 5e6, g: 0.01, color: '#f472b6' },
  { id: 'mutsud', name: 'Crédit Mutualiste du Sud', eq: 15e6, g: 0.008, color: '#fb923c' },
  { id: 'generique', name: 'Société Générique', eq: 80e6, g: 0.006, color: '#f87171' },
  { id: 'parapluie', name: 'BNP Parapluie', eq: 400e6, g: 0.004, color: '#34d399' },
  { id: 'bankrott', name: 'Deutsche Bankrott', eq: 1e9, g: 0.003, color: '#60a5fa' },
  { id: 'sachets', name: 'Goldman Sachets', eq: 2.5e9, g: 0.0028, color: '#fbbf24' },
  { id: 'morgane', name: 'JP Morgane', eq: 5e9, g: 0.0025, color: '#2dd4bf' },
];

// ---------- Campagne : chapitres et objectifs ----------
const G = (txt, cur, goal, fmt) => ({ txt, cur, goal, fmt });
const CHAPTERS = [
  { name: 'Les premiers clients', desc: 'Votre agence de Montpellier est vide. Installez un conseiller, prêtez, puis ouvrez des comptes.', reward: 400e3, goals: [
    G('Recruter un conseiller', s => staffTotal(s, 'bs'), 1), G('Accorder 3 prêts', s => s.stats.granted, 3), G('Recruter un guichetier', s => staffTotal(s, 'gs'), 1), G('Clients avec un compte', s => s.depCC / AVG_BALANCE, 200)] },
  { name: 'Banque de quartier', desc: 'Les Montpelliérains vous font confiance. Lancez le livret, les cartes, et une deuxième agence.', reward: 1e6, goals: [
    G('Accorder 15 prêts', s => s.stats.granted, 15), G('Épargne sur les livrets', s => s.depLiv || 0, 1e6, money), G('Installer un distributeur', s => staffTotal(s, 'dab'), 1), G('Posséder 2 agences', s => s.branches.length, 2), G('Fonds propres', s => equity(s), 1.4e6, money)] },
  { name: 'Le réseau régional', desc: 'Couvrez la France et devenez une banque qui compte. À la clé : la licence européenne.', reward: 1.5e6, goals: [
    G('Agences en France', s => regionCount(s, 'france'), 6), G('Conseillers embauchés', s => staffTotal(s, 'bs'), 8), G('Réputation', s => s.reputation, 60), G('Fonds propres', s => equity(s), 8e6, money)] },
  { name: 'Cap sur l’Europe', desc: 'Londres, Genève, Berlin… L’Europe vous ouvre ses portes.', reward: 5e6, goals: [
    G('Agences en Europe', s => regionCount(s, 'europe'), 3), G('Agences en France', s => regionCount(s, 'france'), 10), G('Grande agence (niveau 3)', s => s.branches.filter(b => b.size >= 3).length, 1), G('Fonds propres', s => equity(s), 25e6, money)] },
  { name: 'Le Nouveau Monde', desc: 'Traversez l’Atlantique. Les États vous demandent maintenant de l’argent.', reward: 15e6, goals: [
    G('Agences aux Amériques', s => regionCount(s, 'ameriques'), 3), G('Prêter à un pays', s => s.stats.souv, 1), G('Classement (top 5)', s => rankOf(s) <= 5 ? 1 : 0, 1), G('Fonds propres', s => equity(s), 80e6, money)] },
  { name: 'Le dragon asiatique', desc: 'Tokyo, Shanghai, Singapour : le centre du monde se déplace.', reward: 40e6, goals: [
    G('Agences en Asie', s => regionCount(s, 'asie'), 3), G('Prêts accordés', s => s.stats.granted, 300), G('Défis réussis', s => s.stats.challenges, 5), G('Fonds propres', s => equity(s), 250e6, money)] },
  { name: 'Partout sur Terre', desc: 'Une agence sur chaque continent. Plus aucun pays ne vous échappe.', reward: 150e6, goals: [
    G('Régions couvertes', s => Object.keys(REGIONS).filter(r => r !== 'espace' && regionCount(s, r) > 0).length, 7), G('Agences', s => s.branches.length, 35), G('Classement (top 3)', s => rankOf(s) <= 3 ? 1 : 0, 1), G('Fonds propres', s => equity(s), 1e9, money)] },
  { name: 'Au-delà du ciel', desc: 'La Terre est trop petite. Devenez la première banque interplanétaire.', reward: 0, goals: [
    G('Traverser la Grande Crise', s => s.flags.bigCrisisDone ? 1 : 0, 1), G('Base lunaire', s => s.branches.some(b => b.id === 'lune') ? 1 : 0, 1), G('Colonie martienne', s => s.branches.some(b => b.id === 'mars') ? 1 : 0, 1), G('Numéro 1 mondial', s => rankOf(s) === 1 ? 1 : 0, 1), G('Fonds propres', s => equity(s), 20e9, money)] },
];

// ---------- Défis chronométrés ----------
const CHALLENGES = {
  loans: { make: s => ({ goal: clamp(3 + Math.floor(s.branches.length / 2), 3, 15), base: s.stats.granted, days: 60 }), txt: c => `Accorder ${c.goal} prêts`, cur: (s, c) => s.stats.granted - c.base },
  deposits: { make: s => ({ goal: Math.max(2e5, Math.round(s.deposits * 0.2 / 1e4) * 1e4), base: s.deposits, days: 90 }), txt: c => `Gagner ${money(c.goal)} de dépôts`, cur: (s, c) => s.deposits - c.base, fmt: money },
  branch: { make: s => ({ goal: 1, base: s.branches.length, days: 120 }), txt: () => 'Ouvrir une nouvelle agence', cur: (s, c) => s.branches.length - c.base },
  staff: { make: s => ({ goal: 3, base: staffTotal(s, 'gs') + staffTotal(s, 'bs'), days: 60 }), txt: c => `Embaucher ${c.goal} agents`, cur: (s, c) => staffTotal(s, 'gs') + staffTotal(s, 'bs') - c.base },
  rep: { cond: s => s.reputation < 82, make: s => ({ goal: Math.round(Math.min(95, s.reputation + 10)), base: 0, days: 90 }), txt: c => `Atteindre ${c.goal} de réputation`, cur: s => Math.round(s.reputation) },
  profit: { make: s => ({ goal: Math.max(50e3, Math.round(equity(s) * 0.03 / 1e3) * 1e3), base: s.stats.profit, days: 90 }), txt: c => `Réaliser ${money(c.goal)} de bénéfices`, cur: (s, c) => s.stats.profit - c.base, fmt: money },
  souv: { cond: s => chapterIdx(s) >= 4, make: s => ({ goal: 1, base: s.stats.souv, days: 120 }), txt: () => 'Prêter à un pays', cur: (s, c) => s.stats.souv - c.base },
};

// ---------- Succès ----------
const ACHS = {
  first_loan: { name: 'Premier prêt', icon: '🤝', desc: 'Accorder un premier prêt.', t: s => s.stats.granted >= 1 },
  loans100: { name: 'Machine à crédit', icon: '🏭', desc: 'Accorder 100 prêts.', t: s => s.stats.granted >= 100 },
  loans1000: { name: 'Distributeur de crédit', icon: '🌊', desc: 'Accorder 1 000 prêts.', t: s => s.stats.granted >= 1000 },
  staff10: { name: 'Employeur', icon: '👔', desc: 'Avoir 10 agents.', t: s => staffTotal(s, 'gs') + staffTotal(s, 'bs') + staffTotal(s, 'vig') >= 10 },
  staff100: { name: 'Grande entreprise', icon: '🏢', desc: 'Avoir 100 agents.', t: s => staffTotal(s, 'gs') + staffTotal(s, 'bs') + staffTotal(s, 'vig') >= 100 },
  full: { name: 'Agence modèle', icon: '✨', desc: 'Équiper entièrement une grande agence.', t: s => s.branches.some(b => b.size === 3 && b.gs === 7 && b.bs === 5 && b.dab === 3 && b.deco === 6) },
  br10: { name: 'Réseau national', icon: '🗺️', desc: 'Posséder 10 agences.', t: s => s.branches.length >= 10 },
  br25: { name: 'Multinationale', icon: '🌍', desc: 'Posséder 25 agences.', t: s => s.branches.length >= 25 },
  brall: { name: 'Partout', icon: '🌐', desc: 'Ouvrir toutes les agences du jeu.', t: s => s.branches.length >= Object.keys(CITIES).length },
  m10: { name: 'Dix millions', icon: '💵', desc: 'Fonds propres ≥ 10 M€.', t: s => equity(s) >= 10e6 },
  m100: { name: 'Banque régionale', icon: '🏙️', desc: 'Fonds propres ≥ 100 M€.', t: s => equity(s) >= 100e6 },
  b1: { name: 'Milliard', icon: '👑', desc: 'Fonds propres ≥ 1 Md€.', t: s => equity(s) >= 1e9 },
  b10: { name: 'Too big to fail', icon: '🐘', desc: 'Fonds propres ≥ 10 Md€.', t: s => equity(s) >= 10e9 },
  rank1: { name: 'Numéro 1', icon: '🥇', desc: 'Prendre la tête du classement.', t: s => rankOf(s) === 1 },
  souv: { name: 'Banquier des nations', icon: '🏛️', desc: 'Prêter à un pays.', t: s => s.stats.souv >= 1 },
  moon: { name: 'Banque lunaire', icon: '🌕', desc: 'Ouvrir la base lunaire.', t: s => s.branches.some(b => b.id === 'lune') },
  mars: { name: 'Martien', icon: '🔴', desc: 'Ouvrir la colonie martienne.', t: s => s.branches.some(b => b.id === 'mars') },
  crisis: { name: 'Survivant', icon: '🧯', desc: 'Traverser une crise économique.', t: s => s.stats.crises >= 1 },
  chal10: { name: 'Compétiteur', icon: '⏱️', desc: 'Réussir 10 défis.', t: s => s.stats.challenges >= 10 },
  honest: { name: 'Incorruptible', icon: '😇', desc: 'Dénoncer la mafia.', t: s => s.flags.honest },
  crypto: { name: 'HODL', icon: '💎', desc: 'Détenir 1 M€ de BitBaguette.', t: s => (s.portfolio.crypto || 0) * s.market.crypto.price >= 1e6 },
  rep90: { name: 'Banque préférée', icon: '❤️', desc: 'Réputation ≥ 90.', t: s => s.reputation >= 90 },
  yacht: { name: 'Capitaine', icon: '🛥️', desc: 'S’offrir un yacht.', t: s => s.owned.includes('yacht') },
  unicorn: { name: 'Chasseur de licornes', icon: '🦄', desc: 'Toucher le jackpot avec une start-up.', t: s => s.flags.unicorn },
  allup: { name: 'Banque du futur', icon: '🧠', desc: 'Acheter toutes les améliorations.', t: s => Object.keys(UPGRADES).every(u => s.upgrades[u]) },
  y10: { name: 'Vétéran', icon: '🎖️', desc: 'Tenir 10 ans.', t: s => s.day >= 30 * 12 * 10 },
  legend: { name: 'Légende', icon: '🏆', desc: 'Terminer la campagne.', t: s => chapterIdx(s) >= CHAPTERS.length },
};

const NEWS = [
  'Le prix de la baguette franchit 1,50 € : les économistes s’inquiètent.',
  'Un pigeon élu meilleur trader de l’année à Wall Street.',
  'Sondage : 68 % des Français ne savent pas ce qu’est un taux directeur. Les 32 % restants mentent.',
  'Un retraité de Limoges trouve 3 000 € en francs dans son matelas.',
  'Les ventes de tirelires cochon en hausse de 12 %.',
  'Elon Musc annonce vouloir racheter la Lune. La Lune n’a pas répondu.',
  'Un député propose de remplacer l’euro par des Carambars.',
  'Les escargots de course deviennent sport olympique en 2032.',
  'Un hamster bat le CAC 40 en choisissant ses actions au hasard.',
  'La Banque centrale recrute un stagiaire pour « appuyer sur le bouton imprimer ».',
  'Un influenceur conseille d’investir tout son PEL dans des NFT de raclette.',
  'Météo des marchés : averses de volatilité en fin de journée.',
  'Une grand-mère bretonne devient millionnaire grâce aux obligations d’État. « C’est la patience, mon petit. »',
  'JP Morgane annonce un bénéfice record et une nouvelle machine à café en or.',
  'La République du Groland émet une obligation remboursable « un jour, promis ».',
  'Mars : la NASA confirme la présence d’eau, mais pas encore de distributeur de billets.',
];

const TABS = [
  ['dash', 'Accueil'], ['plan', 'Ma banque'], ['loans', 'Prêts'], ['deposits', 'Produits'], ['world', 'Monde'], ['markets', 'Marchés'],
  ['missions', 'Missions'], ['ranking', 'Classement'], ['cb', 'Banque centrale'], ['upgrades', 'Améliorations'], ['me', 'Patron'], ['achs', 'Succès'],
];

// ---------- Déblocage progressif de l'interface ----------
// Au début, seuls l'essentiel est visible ; le reste apparaît avec la progression.
const TAB_UNLOCK = {
  dash: () => true, plan: () => true, loans: () => true, missions: () => true,
  deposits: s => staffTotal(s, 'gs') >= 1 || s.chapter >= 1,
  world: s => s.chapter >= 1,
  upgrades: s => s.chapter >= 1,
  cb: s => s.chapter >= 1 || s.cbDebt > 0,
  markets: s => s.chapter >= 2,
  ranking: s => s.chapter >= 2,
  me: s => s.chapter >= 2,
  achs: s => Object.keys(s.achievements).length >= 3,
};
const TAB_HINT = {
  deposits: 'Comptes, livrets, assurance-vie, cartes : réglez vos produits et vos frais.',
  world: 'Ouvrez de nouvelles agences sur la carte.',
  upgrades: 'Achetez des améliorations pour toute la banque.',
  cb: 'Empruntez à la banque centrale si vous manquez de liquidités.',
  markets: 'Placez votre argent en bourse.',
  ranking: 'Comparez-vous aux géants de la finance.',
  me: 'Versez-vous des bonus et achetez des objets de luxe.',
  achs: 'Retrouvez vos succès et vos statistiques.',
};
const ITEM_UNLOCK = {
  b: () => true, bs: () => true,
  g: s => s.stats.granted >= 1 || !!s.flags.offered || s.chapter >= 1, gs: s => s.stats.granted >= 1 || !!s.flags.offered || s.chapter >= 1,
  deco: s => s.stats.granted >= 3 || s.chapter >= 1,
  dab: s => s.chapter >= 1,
  vig: s => s.chapter >= 1 || !!s.flags.robbed,
  size: s => s.chapter >= 1,
};

// ---------- Employés ----------
const STAFF_ROLES = { gs: 'Guichetier', bs: 'Conseiller', vig: 'Vigile' };
const STAFF_TITLES = {
  gs: ['Guichetier stagiaire', 'Guichetier', 'Guichetier confirmé', 'Chef de guichet', 'Responsable d’accueil'],
  bs: ['Conseiller junior', 'Conseiller', 'Conseiller senior', 'Expert crédit', 'Directeur commercial'],
  vig: ['Vigile stagiaire', 'Vigile', 'Agent de sécurité', 'Chef de la sécurité', 'Garde du corps d’élite'],
};
const TRAITS = {
  souriant: { name: 'Souriant', icon: '😊', desc: '+4 satisfaction dans l’agence' },
  rapide: { name: 'Rapide', icon: '⚡', desc: '+15 % d’efficacité' },
  ambitieux: { name: 'Ambitieux', icon: '🚀', desc: 'Apprend 50 % plus vite' },
  fidele: { name: 'Fidèle', icon: '🤝', desc: 'Ne démissionne jamais' },
  bavard: { name: 'Bavard', icon: '💬', desc: '-10 % d’efficacité, mais +2 satisfaction' },
  raleur: { name: 'Râleur', icon: '😤', desc: '-4 satisfaction dans l’agence' },
};
const MAX_LVL = 5;
const xpNeed = lvl => 80 * lvl;
Object.assign(ACHS, {
  sherlock: { name: 'Sherlock', icon: '🕵️', desc: 'Démasquer 5 escrocs.', t: s => (s.stats.frauds || 0) >= 5 },
  ogre: { name: 'Requin de la finance', icon: '🦈', desc: 'Racheter un concurrent.', t: s => (s.stats.buyouts || 0) >= 1 },
  storm: { name: 'Insubmersible', icon: '🌋', desc: 'Traverser la Grande Crise.', t: s => !!s.flags.bigCrisisDone },
  service: { name: 'Zéro file d’attente', icon: '⏱️', desc: '5 agences qui servent tous leurs clients.', t: s => s.branches.filter(b => b.lastServed > 0 && !b.lastLost).length >= 5 },
  promo: { name: 'Promotion !', icon: '⭐', desc: 'Promouvoir un employé.', t: s => s.stats.promos >= 1 },
  lvl5: { name: 'La perle rare', icon: '💎', desc: 'Avoir un employé au niveau 5.', t: s => s.branches.some(b => (b.staff || []).some(e => e.lvl >= 5)) },
});
