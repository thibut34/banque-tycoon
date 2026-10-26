'use strict';
/* =====================================================================
   BANQUE TYCOON — données du jeu
   ===================================================================== */

const SAVE_KEY = 'banqueTycoon.save.v4';
const BEST_KEY = 'banqueTycoon.best.v2';
let HQ = 'montpellier'; // la ville du siège : choisie en début de partie (S.hq)
const START = { cash: 1e6, deposits: 0 }; // 1 M€ de capital et une agence vide, pour tout le monde

const ECON = {
  croissance: { label: _t('Croissance'), color: '#34d399', pd: 0.7, drift: 0.0009, demand: 1.3, rival: 0.009, next: { stable: 5, recession: 3, crise: 1 } },
  stable: { label: _t('Stable'), color: '#60a5fa', pd: 1, drift: 0.0003, demand: 1, rival: 0.004, next: { croissance: 5, recession: 3, crise: 1 } },
  recession: { label: _t('Récession'), color: '#fbbf24', pd: 1.8, drift: -0.0007, demand: 0.75, rival: -0.004, next: { stable: 4, croissance: 2, crise: 2 } },
  crise: { label: _t('Crise'), color: '#f87171', pd: 3, drift: -0.0028, demand: 0.5, rival: -0.018, next: { recession: 5, stable: 2 } },
};

const LOAN_TYPES = {
  conso: { label: _t('Crédit conso'), icon: '🛒', amt: [3e3, 40e3], dur: [12, 60], spread: 4.5, usure: 17, pd: 1.2, rec: 0.15, w: 3, rw: 0.75, who: 'p',
    reasons: [_t('une télé 8K'), _t('un canapé en cuir'), _t('des vacances à Bali'), _t('une cuisine équipée'), _t('son mariage'), _t('un home cinéma'), _t('une PS7'), _t('un vélo électrique'), _t('un nouveau smartphone'), _t('une piscine hors-sol'), _t('les études de sa fille'), _t('un voyage au Japon'), _t('des meubles pour son nouvel appartement'), _t('son permis de conduire'), _t('des soins dentaires'), _t('un piano'), _t('une fête pour ses 50 ans')] },
  auto: { label: _t('Prêt auto'), icon: '🚗', amt: [8e3, 70e3], dur: [24, 72], spread: 2.8, usure: 8, pd: 1, rec: 0.4, w: 3, rw: 0.75, who: 'p',
    reasons: [_t('une citadine électrique'), _t('un SUV'), _t('un camping-car'), _t('une moto'), _t('une Twingo de 1996 « de collection »'), _t('une voiture familiale'), _t('une voiture d’occasion'), _t('un utilitaire pour son travail'), _t('une voiture hybride'), _t('un cabriolet'), _t('un scooter')] },
  immo: { label: _t('Prêt immobilier'), icon: '🏠', amt: [80e3, 600e3], dur: [120, 300], spread: 1.6, usure: 3.2, pd: 0.5, rec: 0.65, w: 3, rw: 0.35, who: 'p',
    reasons: [_t('un appartement en centre-ville'), _t('une maison avec jardin'), _t('un studio à louer'), _t('une longère en Bretagne'), _t('un loft'), _t('un chalet à la montagne'), _t('une maison de campagne'), _t('un appartement pour ses enfants étudiants'), _t('une maison à rénover'), _t('un pied-à-terre en ville'), _t('un petit immeuble à louer'), _t('une maison de plain-pied pour sa retraite')] },
  pro: { label: _t('Prêt professionnel'), icon: '🏭', amt: [50e3, 1.5e6], dur: [36, 120], spread: 3, usure: 9, pd: 1.3, rec: 0.3, w: 2, rw: 1, who: 'c',
    reasons: [_t('de nouvelles machines'), _t('un entrepôt'), _t('une flotte de camions'), _t('son expansion à l’export'), _t('une usine de croissants'), _t('un nouveau magasin'), _t('la reprise d’un concurrent'), _t('des panneaux solaires'), _t('un site de vente en ligne'), _t('un camion frigorifique'), _t('des robots pour son atelier'), _t('la rénovation de son restaurant'), _t('un deuxième atelier')] },
  startup: { label: _t('Start-up'), icon: '🦄', amt: [200e3, 3e6], dur: [36, 84], spread: 6, usure: 14, pd: 3, rec: 0.05, w: 1, rw: 1.5, who: 's',
    reasons: [_t('une IA qui écrit des poèmes pour chats'), _t('un Uber pour tondeuses'), _t('la blockchain du fromage'), _t('des chaussettes connectées'), _t('un métavers pour retraités'), _t('des drones livreurs de croissants'), _t('une appli de covoiturage pour chiens'), _t('des lunettes qui traduisent les chats'), _t('un frigo qui fait les courses tout seul'), _t('un réseau social pour plantes vertes')] },
  farfelu: { label: _t('Projet farfelu'), icon: '🤪', amt: [20e3, 400e3], dur: [12, 48], spread: 7, usure: 15, pd: 2.5, rec: 0.1, w: 1, rw: 1, who: 'p',
    reasons: [_t('un élevage d’escargots de course'), _t('un restaurant 100 % raclette à Dubaï'), _t('un parc d’attractions pour pigeons'), _t('un sous-marin en kit'), _t('une école de mimes'), _t('un musée de la chaussette perdue'), _t('une chaîne de karaokés sous-marins'), _t('un hôtel pour hamsters'), _t('un festival de la moustache')] },
  souv: { label: _t('Dette souveraine'), icon: '🏛️', spread: 0, usure: 30, pd: 1, rec: 0.45, w: 0, rw: 1, who: 'g', reasons: [] },
};

// Notes des pays : probabilité de défaut annuelle, prime de risque, pondération réglementaire
const RATINGS = {
  AAA: { pd: 0.001, spread: 0.3, rw: 0 }, AA: { pd: 0.003, spread: 0.6, rw: 0.2 }, A: { pd: 0.007, spread: 1, rw: 0.5 },
  BBB: { pd: 0.015, spread: 1.8, rw: 1 }, BB: { pd: 0.035, spread: 3.5, rw: 1 }, B: { pd: 0.07, spread: 6, rw: 1.5 }, CCC: { pd: 0.15, spread: 10, rw: 1.5 },
};
const COUNTRIES = [
  [_t('Allemagne'), 'AAA', _t('ses ponts et ses autoroutes')], [_t('Pays-Bas'), 'AAA', _t('ses digues')], [_t('Suisse'), 'AAA', _t('ses tunnels alpins')],
  [_t('États-Unis'), 'AA', _t('ses parcs nationaux')], [_t('France'), 'AA', _t('ses TGV')], [_t('Canada'), 'AA', _t('ses routes du Grand Nord')],
  [_t('Japon'), 'A', _t('ses robots d’aide aux seniors')], [_t('Espagne'), 'A', _t('ses fermes solaires')], [_t('Chili'), 'A', _t('ses mines de cuivre')],
  [_t('Italie'), 'BBB', _t('la rénovation du Colisée')], [_t('Inde'), 'BBB', _t('son programme spatial')], [_t('Mexique'), 'BBB', _t('son métro')],
  [_t('Brésil'), 'BB', _t('la protection de l’Amazonie')], [_t('Grèce'), 'BB', _t('ses îles')], [_t('Afrique du Sud'), 'BB', _t('ses centrales électriques')],
  [_t('Turquie'), 'B', _t('son nouvel aéroport')], [_t('Égypte'), 'B', _t('l’élargissement du canal')], [_t('Principauté de Bananie'), 'B', _t('son parc d’attractions en or')],
  [_t('Argentine'), 'CCC', _t('ses barrages hydroélectriques')], [_t('République du Groland'), 'CCC', _t('la construction d’une statue géante de banane')],
];

const STARTUP = [_t('Bloop'), 'Fromagr.io', _t('Kwakk'), _t('Zyglo'), 'ChatGPTruc', _t('Licornia'), _t('Pivotly'), 'SnailX', _t('Blockchouette'), _t('Disruptr')];

const ASSETS = {
  oat: { name: _t('Obligations d’État'), icon: '🏛️', base: 100, vol: 0.0012, beta: 0, rw: 0.2, desc: _t('Sûr et ennuyeux. Verse un coupon mensuel (taux directeur + 0,4 %). Baisse quand les taux montent.') },
  cac: { name: _t('Indice CAC 40'), icon: '📈', base: 7500, vol: 0.011, beta: 1, rw: 1, desc: _t('Les 40 plus grosses entreprises françaises. Suit l’économie.') },
  tech: { name: _t('NéoTech SA'), icon: '💻', base: 180, vol: 0.024, beta: 1.6, rw: 1, desc: _t('Géant de la tech. Monte vite, chute fort.') },
  oil: { name: _t('PétroGaulois'), icon: '🛢️', base: 65, vol: 0.019, beta: 0.8, rw: 1, desc: _t('Pétrolier nerveux, sensible aux événements mondiaux.') },
  gold: { name: _t('Or'), icon: '🥇', base: 2400, vol: 0.008, beta: -0.5, rw: 0.5, desc: _t('Valeur refuge : monte souvent pendant les crises.') },
  snail: { name: _t('Escargots & Co'), icon: '🐌', base: 12, vol: 0.04, beta: 0.4, rw: 1, desc: _t('Action « mème » adorée des forums. Totalement imprévisible.') },
  crypto: { name: _t('BitBaguette'), icon: '🥖', base: 42000, vol: 0.055, beta: 2, rw: 1.5, need: 'trading', desc: _t('Cryptomonnaie adossée à… rien. Nécessite la salle des marchés.') },
};

// ---------- Le monde ----------
// unlock = index du chapitre à partir duquel la région est ouverte
const REGIONS = {
  france: { name: _t('France'), unlock: 0, cost: 1, wage: 1, box: [-5.5, 9.5, 41.5, 51.5] },
  europe: { name: _t('Europe'), unlock: 4, cost: 1.4, wage: 1.2, box: [-11, 26, 36, 61] },
  ameriques: { name: _t('Amériques'), unlock: 5, cost: 2, wage: 1.5, box: [-125, -35, -40, 50] },
  asie: { name: _t('Asie'), unlock: 6, cost: 2, wage: 1.3, box: [65, 145, -5, 42] },
  afrique: { name: _t('Afrique'), unlock: 7, cost: 0.9, wage: 0.6, box: [-20, 42, -36, 36] },
  moyenorient: { name: _t('Moyen-Orient'), unlock: 7, cost: 2.2, wage: 1.5, box: [25, 60, 20, 44] },
  oceanie: { name: _t('Océanie'), unlock: 7, cost: 1.8, wage: 1.4, box: [140, 180, -48, -25] },
  espace: { name: _t('Espace'), unlock: 8, cost: 1, wage: 8, box: null },
};
const TIERS = {
  s: { label: _t('Petite ville'), cost: 150e3, rent: 1500, cap: 4e6, loans: 0.5, traffic: 2 },
  m: { label: _t('Ville moyenne'), cost: 400e3, rent: 3000, cap: 8e6, loans: 0.8, traffic: 3 },
  l: { label: _t('Grande ville'), cost: 1.2e6, rent: 8000, cap: 20e6, loans: 1.3, traffic: 4 },
  xl: { label: _t('Métropole'), cost: 4e6, rent: 25000, cap: 60e6, loans: 2.2, traffic: 5 },
  w: { label: _t('Place financière mondiale'), cost: 12e6, rent: 70000, cap: 150e6, loans: 3.5, traffic: 6 },
};
const CITY_LIST = [
  // id, nom, code pays, région, taille, latitude, longitude
  ['montpellier', _t('Montpellier'), 'FR', 'france', 'm', 43.6, 3.9], ['nimes', _t('Nîmes'), 'FR', 'france', 's', 43.84, 4.36], ['toulouse', _t('Toulouse'), 'FR', 'france', 'm', 43.6, 1.44],
  ['marseille', _t('Marseille'), 'FR', 'france', 'l', 43.3, 5.37], ['nice', _t('Nice'), 'FR', 'france', 'm', 43.7, 7.26], ['bordeaux', _t('Bordeaux'), 'FR', 'france', 'm', 44.84, -0.58],
  ['nantes', _t('Nantes'), 'FR', 'france', 'm', 47.22, -1.55], ['rennes', _t('Rennes'), 'FR', 'france', 's', 48.11, -1.68], ['lille', _t('Lille'), 'FR', 'france', 'm', 50.63, 3.06],
  ['strasbourg', _t('Strasbourg'), 'FR', 'france', 'm', 48.57, 7.75], ['lyon', _t('Lyon'), 'FR', 'france', 'l', 45.76, 4.84], ['paris', _t('Paris'), 'FR', 'france', 'xl', 48.86, 2.35],
  ['bruxelles', _t('Bruxelles'), 'BE', 'europe', 'm', 50.85, 4.35], ['geneve', _t('Genève'), 'CH', 'europe', 'l', 46.2, 6.15], ['londres', _t('Londres'), 'GB', 'europe', 'xl', 51.5, -0.13],
  ['madrid', _t('Madrid'), 'ES', 'europe', 'l', 40.42, -3.7], ['lisbonne', _t('Lisbonne'), 'PT', 'europe', 'm', 38.72, -9.14], ['milan', _t('Milan'), 'IT', 'europe', 'l', 45.46, 9.19],
  ['rome', _t('Rome'), 'IT', 'europe', 'l', 41.9, 12.5], ['berlin', _t('Berlin'), 'DE', 'europe', 'l', 52.52, 13.4], ['amsterdam', _t('Amsterdam'), 'NL', 'europe', 'l', 52.37, 4.9],
  ['vienne', _t('Vienne'), 'AT', 'europe', 'm', 48.2, 16.37], ['stockholm', _t('Stockholm'), 'SE', 'europe', 'm', 59.33, 18.07], ['athenes', _t('Athènes'), 'GR', 'europe', 'm', 37.98, 23.73],
  ['montreal', _t('Montréal'), 'CA', 'ameriques', 'l', 45.5, -73.57], ['newyork', _t('New York'), 'US', 'ameriques', 'w', 40.71, -74], ['miami', _t('Miami'), 'US', 'ameriques', 'l', 25.76, -80.19],
  ['losangeles', _t('Los Angeles'), 'US', 'ameriques', 'xl', 34.05, -118.24], ['mexico', _t('Mexico'), 'MX', 'ameriques', 'l', 19.43, -99.13], ['saopaulo', _t('São Paulo'), 'BR', 'ameriques', 'xl', -23.55, -46.63],
  ['buenosaires', _t('Buenos Aires'), 'AR', 'ameriques', 'l', -34.6, -58.38],
  ['tokyo', _t('Tokyo'), 'JP', 'asie', 'w', 35.68, 139.69], ['seoul', _t('Séoul'), 'KR', 'asie', 'xl', 37.57, 126.98], ['shanghai', _t('Shanghai'), 'CN', 'asie', 'w', 31.23, 121.47],
  ['hongkong', _t('Hong Kong'), 'HK', 'asie', 'xl', 22.32, 114.17], ['singapour', _t('Singapour'), 'SG', 'asie', 'xl', 1.35, 103.82], ['mumbai', _t('Mumbai'), 'IN', 'asie', 'l', 19.08, 72.88],
  ['casablanca', _t('Casablanca'), 'MA', 'afrique', 'm', 33.57, -7.59], ['dakar', _t('Dakar'), 'SN', 'afrique', 'm', 14.72, -17.47], ['abidjan', _t('Abidjan'), 'CI', 'afrique', 'm', 5.36, -4.01],
  ['lagos', _t('Lagos'), 'NG', 'afrique', 'l', 6.52, 3.38], ['nairobi', _t('Nairobi'), 'KE', 'afrique', 'm', -1.29, 36.82], ['lecap', _t('Le Cap'), 'ZA', 'afrique', 'm', -33.92, 18.42],
  ['istanbul', _t('Istanbul'), 'TR', 'moyenorient', 'l', 41.01, 28.98], ['dubai', _t('Dubaï'), 'AE', 'moyenorient', 'xl', 25.2, 55.27], ['doha', _t('Doha'), 'QA', 'moyenorient', 'l', 25.29, 51.53],
  ['sydney', _t('Sydney'), 'AU', 'oceanie', 'xl', -33.87, 151.21], ['auckland', _t('Auckland'), 'NZ', 'oceanie', 'l', -36.85, 174.76],
  // Les autres villes des pays où l'on peut commencer
  ['anvers', _t('Anvers'), 'BE', 'europe', 'm', 51.22, 4.4], ['gand', _t('Gand'), 'BE', 'europe', 'm', 51.05, 3.72], ['liege', _t('Liège'), 'BE', 'europe', 'm', 50.63, 5.57],
  ['namur', _t('Namur'), 'BE', 'europe', 's', 50.47, 4.87], ['charleroi', _t('Charleroi'), 'BE', 'europe', 's', 50.41, 4.44], ['bruges', _t('Bruges'), 'BE', 'europe', 's', 51.21, 3.22],
  ['lausanne', _t('Lausanne'), 'CH', 'europe', 'm', 46.52, 6.63], ['zurich', _t('Zurich'), 'CH', 'europe', 'xl', 47.37, 8.54], ['berne', _t('Berne'), 'CH', 'europe', 'm', 46.95, 7.45],
  ['bale', _t('Bâle'), 'CH', 'europe', 'm', 47.56, 7.59], ['lugano', _t('Lugano'), 'CH', 'europe', 's', 46.0, 8.95], ['neuchatel', _t('Neuchâtel'), 'CH', 'europe', 's', 46.99, 6.93],
  ['quebec', _t('Québec'), 'CA', 'ameriques', 'm', 46.81, -71.21], ['toronto', _t('Toronto'), 'CA', 'ameriques', 'xl', 43.65, -79.38], ['vancouver', _t('Vancouver'), 'CA', 'ameriques', 'l', 49.28, -123.12],
  ['ottawa', _t('Ottawa'), 'CA', 'ameriques', 'm', 45.42, -75.7], ['halifax', _t('Halifax'), 'CA', 'ameriques', 's', 44.65, -63.58], ['winnipeg', _t('Winnipeg'), 'CA', 'ameriques', 'm', 49.9, -97.14],
  ['sherbrooke', _t('Sherbrooke'), 'CA', 'ameriques', 's', 45.4, -71.89],
  ['manchester', _t('Manchester'), 'GB', 'europe', 'l', 53.48, -2.24], ['birmingham', _t('Birmingham'), 'GB', 'europe', 'l', 52.49, -1.89], ['edimbourg', _t('Édimbourg'), 'GB', 'europe', 'm', 55.95, -3.19],
  ['liverpool', _t('Liverpool'), 'GB', 'europe', 'm', 53.41, -2.98], ['bristol', _t('Bristol'), 'GB', 'europe', 'm', 51.45, -2.59], ['leeds', _t('Leeds'), 'GB', 'europe', 'm', 53.8, -1.55],
  ['cardiff', _t('Cardiff'), 'GB', 'europe', 's', 51.48, -3.18],
  ['chicago', _t('Chicago'), 'US', 'ameriques', 'xl', 41.88, -87.63], ['sanfrancisco', _t('San Francisco'), 'US', 'ameriques', 'xl', 37.77, -122.42], ['houston', _t('Houston'), 'US', 'ameriques', 'l', 29.76, -95.37],
  ['boston', _t('Boston'), 'US', 'ameriques', 'l', 42.36, -71.06], ['seattle', _t('Seattle'), 'US', 'ameriques', 'l', 47.61, -122.33], ['lasvegas', _t('Las Vegas'), 'US', 'ameriques', 'm', 36.17, -115.14],
  ['nouvelleorleans', _t('La Nouvelle-Orléans'), 'US', 'ameriques', 'm', 29.95, -90.07], ['nashville', _t('Nashville'), 'US', 'ameriques', 's', 36.16, -86.78],
  ['barcelone', _t('Barcelone'), 'ES', 'europe', 'xl', 41.39, 2.17], ['valencia', _t('Valence (Espagne)'), 'ES', 'europe', 'm', 39.47, -0.38], ['seville', _t('Séville'), 'ES', 'europe', 'm', 37.39, -5.98],
  ['bilbao', _t('Bilbao'), 'ES', 'europe', 'm', 43.26, -2.93], ['malaga', _t('Malaga'), 'ES', 'europe', 'm', 36.72, -4.42], ['saragosse', _t('Saragosse'), 'ES', 'europe', 'm', 41.65, -0.88],
  ['grenade', _t('Grenade'), 'ES', 'europe', 's', 37.18, -3.6],
  ['naples', _t('Naples'), 'IT', 'europe', 'l', 40.85, 14.27], ['turin', _t('Turin'), 'IT', 'europe', 'm', 45.07, 7.69], ['florence', _t('Florence'), 'IT', 'europe', 'm', 43.77, 11.25],
  ['bologne', _t('Bologne'), 'IT', 'europe', 'm', 44.49, 11.34], ['venise', _t('Venise'), 'IT', 'europe', 'm', 45.44, 12.32], ['palerme', _t('Palerme'), 'IT', 'europe', 's', 38.12, 13.36],
  ['munich', _t('Munich'), 'DE', 'europe', 'xl', 48.14, 11.58], ['hambourg', _t('Hambourg'), 'DE', 'europe', 'l', 53.55, 9.99], ['cologne', _t('Cologne'), 'DE', 'europe', 'm', 50.94, 6.96],
  ['francfort', _t('Francfort'), 'DE', 'europe', 'xl', 50.11, 8.68], ['stuttgart', _t('Stuttgart'), 'DE', 'europe', 'm', 48.78, 9.18], ['dresde', _t('Dresde'), 'DE', 'europe', 's', 51.05, 13.74],
  ['leipzig', _t('Leipzig'), 'DE', 'europe', 'm', 51.34, 12.37],
  ['rabat', _t('Rabat'), 'MA', 'afrique', 'm', 34.02, -6.84], ['marrakech', _t('Marrakech'), 'MA', 'afrique', 'm', 31.63, -8.0], ['fes', _t('Fès'), 'MA', 'afrique', 'm', 34.03, -5.0],
  ['tanger', _t('Tanger'), 'MA', 'afrique', 'm', 35.76, -5.83], ['agadir', _t('Agadir'), 'MA', 'afrique', 's', 30.43, -9.6], ['meknes', _t('Meknès'), 'MA', 'afrique', 's', 33.9, -5.55],
  ['oujda', _t('Oujda'), 'MA', 'afrique', 's', 34.68, -1.91],
  ['thies', _t('Thiès'), 'SN', 'afrique', 's', 14.79, -16.93], ['saintlouis', _t('Saint-Louis'), 'SN', 'afrique', 's', 16.03, -16.49], ['kaolack', _t('Kaolack'), 'SN', 'afrique', 's', 14.15, -16.07],
  ['ziguinchor', _t('Ziguinchor'), 'SN', 'afrique', 's', 12.57, -16.27], ['touba', _t('Touba'), 'SN', 'afrique', 's', 14.86, -15.88], ['mbour', _t('Mbour'), 'SN', 'afrique', 's', 14.42, -16.96],
  ['osaka', _t('Osaka'), 'JP', 'asie', 'xl', 34.69, 135.5], ['kyoto', _t('Kyoto'), 'JP', 'asie', 'l', 35.01, 135.77], ['nagoya', _t('Nagoya'), 'JP', 'asie', 'l', 35.18, 136.91],
  ['yokohama', _t('Yokohama'), 'JP', 'asie', 'l', 35.44, 139.64], ['fukuoka', _t('Fukuoka'), 'JP', 'asie', 'l', 33.59, 130.4], ['hiroshima', _t('Hiroshima'), 'JP', 'asie', 'm', 34.39, 132.46],
  ['sendai', _t('Sendai'), 'JP', 'asie', 'm', 38.27, 140.87],
];
const CITIES = {};
for (const [id, name, cc, region, t, lat, lon] of CITY_LIST) {
  const T = TIERS[t], R = REGIONS[region];
  CITIES[id] = { id, name, cc, region, tier: t, lat, lon, cost: T.cost * R.cost, rent: T.rent * R.cost, cap: T.cap, loans: T.loans, traffic: T.traffic, build: T.cost * R.cost };
}
CITIES.lune = { id: 'lune', name: _t('Base lunaire'), cc: '☾', region: 'espace', tier: 'w', cost: 250e6, rent: 1e6, cap: 1.5e9, loans: 6, traffic: 4, build: 60e6, desc: _t('Les premiers colons ont besoin d’une banque. Et peut-être d’autres clients…') };
CITIES.mars = { id: 'mars', name: _t('Colonie martienne'), cc: '♂', region: 'espace', tier: 'w', cost: 1.5e9, rent: 5e6, cap: 6e9, loans: 10, traffic: 5, build: 300e6, desc: _t('Trois ans de voyage, mais zéro concurrent.') };

// ---------- Plan de l'agence ----------
const ITEMS = {
  g: { name: _t('Guichet'), icon: '🧾', cost: 25e3, desc: _t('Accueille les épargnants. Sans guichetier, il reste fermé.') },
  gs: { name: _t('Guichetier'), icon: '🧑‍💼', hire: 4e3, wage: 2300, desc: _t('+ dépôts potentiels de l’agence.') },
  b: { name: _t('Bureau de conseil'), icon: '🪑', cost: 35e3, desc: _t('Un bureau pour recevoir les emprunteurs.') },
  bs: { name: _t('Conseiller'), icon: '👩‍💼', hire: 6e3, wage: 3200, desc: _t('+ demandes de prêt.') },
  dab: { name: _t('Distributeur'), icon: '🏧', cost: 45e3, maint: 600, desc: _t('Commissions mensuelles et clients plus satisfaits.') },
  vig: { name: _t('Vigile'), icon: '💂', hire: 2e3, wage: 2000, desc: _t('Empêche les braquages dans cette agence.') },
  deco: { name: _t('Décoration'), icon: '🪴', cost: 10e3, desc: _t('Plantes et canapés : + satisfaction des clients.') },
  cof: { name: _t('Salle des coffres'), icon: '🔐', cost: 60e3, maint: 600, desc: _t('Des coffres-forts à louer : chaque client qui en loue un paie sa location.') },
  ent: { name: _t('Espace entreprises'), icon: '🏢', cost: 90e3, maint: 3800, desc: _t('Un chargé d’affaires reçoit les dirigeants : comptes pros, commissions et gros prêts.') },
  vip: { name: _t('Salon VIP'), icon: '🥂', cost: 150e3, maint: 4500, desc: _t('Un banquier privé reçoit les clients fortunés : gros placements et honoraires.') },
};
const SIZES = [null,
  { name: _t('Petite agence'), g: 3, b: 2, dab: 1, vig: 1, deco: 2, cof: 1, ent: 1, vip: 0 },
  { name: _t('Agence'), g: 5, b: 4, dab: 2, vig: 2, deco: 4, cof: 1, ent: 1, vip: 1, cost: 0.6 },
  { name: _t('Grande agence'), g: 7, b: 5, dab: 3, vig: 2, deco: 6, cof: 1, ent: 2, vip: 1, cost: 1.2 },
];

const UPGRADES = {
  analyste: { name: _t('Analyste crédit'), icon: '🔍', cost: 80e3, monthly: 4000, desc: _t('Affiche le score exact et la probabilité de défaut des emprunteurs.') },
  coffre: { name: _t('Coffres blindés'), icon: '🔐', cost: 60e3, monthly: 500, desc: _t('Divise par deux les pertes en cas de braquage.') },
  marketing: { name: _t('Campagne marketing'), icon: '📣', cost: 150e3, monthly: 8000, desc: _t('+25 % de dépôts potentiels, +30 % de demandes de prêt.') },
  app: { name: _t('Application mobile'), icon: '📱', cost: 300e3, monthly: 6000, desc: _t('+20 % de dépôts potentiels et +1 réputation chaque mois.') },
  cyber: { name: _t('Cybersécurité'), icon: '🛡️', cost: 200e3, monthly: 5000, desc: _t('Bloque les cyberattaques.') },
  recouvrement: { name: _t('Service de recouvrement'), icon: '⚖️', cost: 120e3, monthly: 5000, desc: _t('+20 % récupérés sur chaque prêt en défaut.') },
  rh: { name: _t('Académie interne'), icon: '🎓', cost: 400e3, monthly: 6000, desc: _t('Agents mieux formés : salaires -15 %, satisfaction +10.') },
  conformite: { name: _t('Service conformité'), icon: '📋', cost: 250e3, monthly: 10000, desc: _t('Divise les amendes par 3 et protège des scandales.') },
  trading: { name: _t('Salle des marchés'), icon: '💹', cost: 500e3, monthly: 15000, desc: _t('Frais de courtage divisés par 5 et accès aux cryptos.') },
  ia: { name: _t('IA de scoring'), icon: '🤖', cost: 1.2e6, monthly: 25000, req: 'analyste', desc: _t('-25 % de défauts sur les nouveaux prêts, demandes ×1,3.') },
  lobby: { name: _t('Lobbyiste à Bruxelles'), icon: '🕴️', cost: 2e6, monthly: 40000, req: 'conformite', desc: _t('Ratio de solvabilité minimum abaissé de 8 % à 6 %.') },
  quantique: { name: _t('Ordinateur quantique'), icon: '⚛️', cost: 15e6, monthly: 150000, req: 'trading', desc: _t('Prédit la prochaine phase économique et sa date.') },
};

const LUXURY = {
  montre: { name: _t('Montre en or'), icon: '⌚', cost: 50e3 },
  ferrari: { name: _t('Ferrari rouge'), icon: '🏎️', cost: 300e3 },
  villa: { name: _t('Villa à Saint-Tropez'), icon: '🏖️', cost: 2e6 },
  tableau: { name: _t('Un vrai Monet'), icon: '🖼️', cost: 5e6 },
  chateau: { name: _t('Château dans le Bordelais'), icon: '🏰', cost: 8e6 },
  yacht: { name: _t('Yacht de 80 m'), icon: '🛥️', cost: 15e6 },
  club: { name: _t('Club de foot'), icon: '⚽', cost: 30e6 },
  jet: { name: _t('Jet privé'), icon: '🛩️', cost: 40e6 },
  ile: { name: _t('Île privée'), icon: '🏝️', cost: 100e6 },
  fusee: { name: _t('Fusée personnelle'), icon: '🚀', cost: 500e6 },
};

// ---------- Concurrents ----------
const RIVALS = [
  { id: 'boncoin', name: _t('Caisse du Bon Coin'), eq: 1.5e6, g: 0.012, color: '#a78bfa' },
  { id: 'pognon', name: _t('Banque Pognon'), eq: 5e6, g: 0.01, color: '#f472b6' },
  { id: 'mutsud', name: _t('Crédit Mutualiste du Sud'), eq: 15e6, g: 0.008, color: '#fb923c' },
  { id: 'generique', name: _t('Société Générique'), eq: 80e6, g: 0.006, color: '#f87171' },
  { id: 'parapluie', name: _t('BNP Parapluie'), eq: 400e6, g: 0.004, color: '#34d399' },
  { id: 'bankrott', name: _t('Deutsche Bankrott'), eq: 1e9, g: 0.003, color: '#60a5fa' },
  { id: 'sachets', name: _t('Goldman Sachets'), eq: 2.5e9, g: 0.0028, color: '#fbbf24' },
  { id: 'morgane', name: _t('JP Morgane'), eq: 5e9, g: 0.0025, color: '#2dd4bf' },
];

// ---------- Campagne : chapitres et objectifs ----------
const G = (txt, cur, goal, fmt) => ({ txt, cur, goal, fmt });
const GD = (txt, cur, goal, fmt) => ({ get txt() { return txt(); }, cur, goal, fmt }); // un objectif dont le texte dépend de la partie
// L'ordre des conquêtes dépend du pays de départ : d'abord sa région, puis les autres
const REGION_ORDER = ['france', 'europe', 'ameriques', 'asie', 'afrique', 'moyenorient', 'oceanie'];
const NEXT_REGIONS = { france: ['europe', 'ameriques', 'asie'], europe: ['france', 'ameriques', 'asie'], ameriques: ['europe', 'france', 'asie'], asie: ['ameriques', 'europe', 'france'], afrique: ['france', 'europe', 'ameriques'] };
function regionOrder(s) { const home = CITIES[(s && s.hq) || HQ].region, next = NEXT_REGIONS[home] || []; return [home, ...next, ...REGION_ORDER.filter(r => r !== home && !next.includes(r))]; }
function regionUnlock(s, r) { if (r === 'espace') return 8; const i = regionOrder(s).indexOf(r); return i <= 0 ? 0 : i <= 3 ? 3 + i : 7; }
const homeCC = s => CITIES[(s && s.hq) || HQ].cc;
const countryCount = s => s.branches.filter(b => CITIES[b.id].cc === homeCC(s)).length;
const hqName = () => CITIES[HQ].name;
const targetRegion = n => regionOrder(S)[n];
const REGION_CH = {
  france: [_t('Cap sur la France'), _t('Paris, Lyon, Marseille… La France vous ouvre ses portes.')],
  europe: [_t('Cap sur l’Europe'), _t('Londres, Genève, Berlin… L’Europe vous ouvre ses portes.')],
  ameriques: [_t('Le Nouveau Monde'), _t('Traversez l’Atlantique. Les États vous demandent maintenant de l’argent.')],
  asie: [_t('Le dragon asiatique'), _t('Tokyo, Shanghai, Singapour : le centre du monde se déplace.')],
};
const conquest = (n, reward, goals) => ({ get name() { return REGION_CH[targetRegion(n)][0]; }, get desc() { return REGION_CH[targetRegion(n)][1]; }, reward, goals });
const regionGoal = (n, k) => GD(() => _l`Agences : ${REGIONS[targetRegion(n)].name}`, s => regionCount(s, regionOrder(s)[n]), k);
const countryGoal = k => GD(() => _l`Agences : ${countryName(homeCC(S))}`, countryCount, k);
const CHAPTERS = [
  { name: _t('L’ouverture'), get desc() { return _l`Votre agence de ${hqName()} est vide. Installez un guichet, recrutez, et ouvrez vos premiers comptes.`; }, reward: 20e3, goals: [
    G(_t('Recruter un guichetier'), s => staffTotal(s, 'gs'), 1), G(_t('Clients avec un compte'), s => s.clients, 15), G(_t('Argent déposé par les clients'), s => s.deposits, 20e3, money)] }, // atteint en 2 à 3 minutes, sans attendre le jour de paie
  { name: _t('Les premiers crédits'), desc: _t('Vous avez l’argent des clients : il est temps de prêter. Installez un bureau et recrutez un conseiller.'), reward: 60e3, goals: [
    G(_t('Recruter un conseiller'), s => staffTotal(s, 'bs'), 1), G(_t('Prêts accordés'), s => s.stats.granted, 10), G(_t('Clients avec un compte'), s => s.clients, 120), G(_t('Épargne sur les livrets'), s => s.depLiv, 50e3, money)] },
  { name: _t('Banque de quartier'), get desc() { return _l`${hqName()} vous fait confiance. Distributeurs, cartes, et une deuxième agence.`; }, reward: 200e3, goals: [
    G(_t('Clients avec un compte'), s => s.clients, 450), G(_t('Prêts accordés'), s => s.stats.granted, 30), G(_t('Installer un distributeur'), s => staffTotal(s, 'dab'), 1), G(_t('Posséder 2 agences'), s => s.branches.length, 2), G(_t('Bénéfices cumulés'), s => s.stats.profit, 150e3, money)] },
  { name: _t('Le réseau régional'), desc: _t('Couvrez tout le pays et devenez une banque qui compte. À la clé : votre licence pour l’étranger.'), reward: 600e3, goals: [
    countryGoal(4), G(_t('Conseillers embauchés'), s => staffTotal(s, 'bs'), 5), G(_t('Réputation'), s => s.reputation, 60), G(_t('Bénéfices cumulés'), s => s.stats.profit, 500e3, money)] },
  conquest(1, 2e6, [
    regionGoal(1, 3), countryGoal(6), G(_t('Grande agence (niveau 3)'), s => s.branches.filter(b => b.size >= 3).length, 1), G(_t('Fonds propres'), s => equity(s), 4e6, money)]),
  conquest(2, 6e6, [
    regionGoal(2, 3), G(_t('Prêter à un pays'), s => s.stats.souv, 1), G(_t('Classement (top 5)'), s => rankOf(s) <= 5 ? 1 : 0, 1), G(_t('Fonds propres'), s => equity(s), 12e6, money)]),
  conquest(3, 15e6, [
    regionGoal(3, 3), G(_t('Prêts accordés'), s => s.stats.granted, 500), G(_t('Défis réussis'), s => s.stats.challenges, 5), G(_t('Fonds propres'), s => equity(s), 40e6, money)]),
  { name: _t('Partout sur Terre'), desc: _t('Une agence sur chaque continent. Plus aucun pays ne vous échappe.'), reward: 60e6, goals: [
    G(_t('Régions couvertes'), s => Object.keys(REGIONS).filter(r => r !== 'espace' && regionCount(s, r) > 0).length, 7), G(_t('Agences'), s => s.branches.length, 30), G(_t('Classement (top 3)'), s => rankOf(s) <= 3 ? 1 : 0, 1), G(_t('Fonds propres'), s => equity(s), 150e6, money)] },
  { name: _t('Au-delà du ciel'), desc: _t('La Terre est trop petite. Devenez la première banque interplanétaire.'), reward: 0, goals: [
    G(_t('Traverser la Grande Crise'), s => s.flags.bigCrisisDone ? 1 : 0, 1), G(_t('Base lunaire'), s => s.branches.some(b => b.id === 'lune') ? 1 : 0, 1), G(_t('Colonie martienne'), s => s.branches.some(b => b.id === 'mars') ? 1 : 0, 1), G(_t('Numéro 1 mondial'), s => rankOf(s) === 1 ? 1 : 0, 1), G(_t('Fonds propres'), s => equity(s), 2e9, money)] },
];

// ---------- Défis chronométrés ----------
const CHALLENGES = {
  loans: { make: s => ({ goal: clamp(3 + Math.floor(s.branches.length / 2), 3, 15), base: s.stats.granted, days: 60 }), txt: c => _l`Accorder ${c.goal} prêts`, cur: (s, c) => s.stats.granted - c.base },
  deposits: { make: s => ({ goal: Math.max(2e5, Math.round(s.deposits * 0.2 / 1e4) * 1e4), base: s.deposits, days: 90 }), txt: c => _l`Gagner ${money(c.goal)} de dépôts`, cur: (s, c) => s.deposits - c.base, fmt: money },
  branch: { make: s => ({ goal: 1, base: s.branches.length, days: 120 }), txt: () => _t('Ouvrir une nouvelle agence'), cur: (s, c) => s.branches.length - c.base },
  staff: { make: s => ({ goal: 3, base: staffTotal(s, 'gs') + staffTotal(s, 'bs'), days: 60 }), txt: c => _l`Embaucher ${c.goal} agents`, cur: (s, c) => staffTotal(s, 'gs') + staffTotal(s, 'bs') - c.base },
  rep: { cond: s => s.reputation < 82, make: s => ({ goal: Math.round(Math.min(95, s.reputation + 10)), base: 0, days: 90 }), txt: c => _l`Atteindre ${c.goal} de réputation`, cur: s => Math.round(s.reputation) },
  profit: { make: s => ({ goal: Math.max(50e3, Math.round(equity(s) * 0.03 / 1e3) * 1e3), base: s.stats.profit, days: 90 }), txt: c => _l`Réaliser ${money(c.goal)} de bénéfices`, cur: (s, c) => s.stats.profit - c.base, fmt: money },
  souv: { cond: s => chapterIdx(s) >= 5, make: s => ({ goal: 1, base: s.stats.souv, days: 120 }), txt: () => _t('Prêter à un pays'), cur: (s, c) => s.stats.souv - c.base },
};

// ---------- Succès ----------
const ACHS = {
  first_loan: { name: _t('Premier prêt'), icon: '🤝', desc: _t('Accorder un premier prêt.'), t: s => s.stats.granted >= 1 },
  loans100: { name: _t('Machine à crédit'), icon: '🏭', desc: _t('Accorder 100 prêts.'), t: s => s.stats.granted >= 100 },
  loans1000: { name: _t('Distributeur de crédit'), icon: '🌊', desc: _t('Accorder 1 000 prêts.'), t: s => s.stats.granted >= 1000 },
  staff10: { name: _t('Employeur'), icon: '👔', desc: _t('Avoir 10 agents.'), t: s => staffTotal(s, 'gs') + staffTotal(s, 'bs') + staffTotal(s, 'vig') >= 10 },
  staff100: { name: _t('Grande entreprise'), icon: '🏢', desc: _t('Avoir 100 agents.'), t: s => staffTotal(s, 'gs') + staffTotal(s, 'bs') + staffTotal(s, 'vig') >= 100 },
  full: { name: _t('Agence modèle'), icon: '✨', desc: _t('Équiper entièrement une grande agence.'), t: s => s.branches.some(b => b.size === 3 && b.gs === 7 && b.bs === 5 && b.dab === 3 && b.deco === 6) },
  br10: { name: _t('Réseau national'), icon: '🗺️', desc: _t('Posséder 10 agences.'), t: s => s.branches.length >= 10 },
  br25: { name: _t('Multinationale'), icon: '🌍', desc: _t('Posséder 25 agences.'), t: s => s.branches.length >= 25 },
  brall: { name: _t('Partout'), icon: '🌐', desc: _t('Ouvrir toutes les agences du jeu.'), t: s => s.branches.length >= Object.keys(CITIES).length },
  m10: { name: _t('Dix millions'), icon: '💵', desc: _t('Fonds propres ≥ 10 M€.'), t: s => equity(s) >= 10e6 },
  m100: { name: _t('Banque régionale'), icon: '🏙️', desc: _t('Fonds propres ≥ 100 M€.'), t: s => equity(s) >= 100e6 },
  b1: { name: _t('Milliard'), icon: '👑', desc: _t('Fonds propres ≥ 1 Md€.'), t: s => equity(s) >= 1e9 },
  b10: { name: _t('Too big to fail'), icon: '🐘', desc: _t('Fonds propres ≥ 10 Md€.'), t: s => equity(s) >= 10e9 },
  rank1: { name: _t('Numéro 1'), icon: '🥇', desc: _t('Prendre la tête du classement.'), t: s => rankOf(s) === 1 },
  souv: { name: _t('Banquier des nations'), icon: '🏛️', desc: _t('Prêter à un pays.'), t: s => s.stats.souv >= 1 },
  moon: { name: _t('Banque lunaire'), icon: '🌕', desc: _t('Ouvrir la base lunaire.'), t: s => s.branches.some(b => b.id === 'lune') },
  mars: { name: _t('Martien'), icon: '🔴', desc: _t('Ouvrir la colonie martienne.'), t: s => s.branches.some(b => b.id === 'mars') },
  crisis: { name: _t('Survivant'), icon: '🧯', desc: _t('Traverser une crise économique.'), t: s => s.stats.crises >= 1 },
  chal10: { name: _t('Compétiteur'), icon: '⏱️', desc: _t('Réussir 10 défis.'), t: s => s.stats.challenges >= 10 },
  honest: { name: _t('Incorruptible'), icon: '😇', desc: _t('Dénoncer la mafia.'), t: s => s.flags.honest },
  crypto: { name: _t('HODL'), icon: '💎', desc: _t('Détenir 1 M€ de BitBaguette.'), t: s => (s.portfolio.crypto || 0) * s.market.crypto.price >= 1e6 },
  rep90: { name: _t('Banque préférée'), icon: '❤️', desc: _t('Réputation ≥ 90.'), t: s => s.reputation >= 90 },
  yacht: { name: _t('Capitaine'), icon: '🛥️', desc: _t('S’offrir un yacht.'), t: s => s.owned.includes('yacht') },
  unicorn: { name: _t('Chasseur de licornes'), icon: '🦄', desc: _t('Toucher le jackpot avec une start-up.'), t: s => s.flags.unicorn },
  allup: { name: _t('Banque du futur'), icon: '🧠', desc: _t('Acheter toutes les améliorations.'), t: s => Object.keys(UPGRADES).every(u => s.upgrades[u]) },
  y10: { name: _t('Vétéran'), icon: '🎖️', desc: _t('Tenir 10 ans.'), t: s => s.day >= 30 * 12 * 10 },
  legend: { name: _t('Légende'), icon: '🏆', desc: _t('Terminer la campagne.'), t: s => chapterIdx(s) >= CHAPTERS.length },
};

const NEWS = [
  _t('Le prix de la baguette franchit 1,50 € : les économistes s’inquiètent.'),
  _t('Un pigeon élu meilleur trader de l’année à Wall Street.'),
  _t('Sondage : 68 % des Français ne savent pas ce qu’est un taux directeur. Les 32 % restants mentent.'),
  _t('Un retraité de Limoges trouve 3 000 € en francs dans son matelas.'),
  _t('Les ventes de tirelires cochon en hausse de 12 %.'),
  _t('Elon Musc annonce vouloir racheter la Lune. La Lune n’a pas répondu.'),
  _t('Un député propose de remplacer l’euro par des Carambars.'),
  _t('Les escargots de course deviennent sport olympique en 2032.'),
  _t('Un hamster bat le CAC 40 en choisissant ses actions au hasard.'),
  _t('La Banque centrale recrute un stagiaire pour « appuyer sur le bouton imprimer ».'),
  _t('Un influenceur conseille d’investir tout son PEL dans des NFT de raclette.'),
  _t('Météo des marchés : averses de volatilité en fin de journée.'),
  _t('Une grand-mère bretonne devient millionnaire grâce aux obligations d’État. « C’est la patience, mon petit. »'),
  _t('JP Morgane annonce un bénéfice record et une nouvelle machine à café en or.'),
  _t('La République du Groland émet une obligation remboursable « un jour, promis ».'),
  _t('Mars : la NASA confirme la présence d’eau, mais pas encore de distributeur de billets.'),
];

const TABS = [
  ['dash', _t('Aujourd’hui')], ['plan', _t('Ma banque')], ['clients', _t('Clients')], ['loans', _t('Prêts')], ['deposits', _t('Produits')], ['world', _t('Monde')], ['markets', _t('Marchés')],
  ['missions', _t('Missions')], ['ranking', _t('Classement')], ['cb', _t('Banque centrale')], ['upgrades', _t('Améliorations')], ['me', _t('Patron')], ['achs', _t('Succès')],
];

// ---------- Déblocage progressif de l'interface ----------
// Au début, seuls l'essentiel est visible ; le reste apparaît avec la progression.
const TAB_UNLOCK = {
  dash: () => true, plan: () => true, missions: () => true,
  clients: s => (s.people || []).length > 0,
  loans: s => s.chapter >= 1,
  deposits: s => staffTotal(s, 'gs') >= 1 || s.chapter >= 1,
  world: s => s.chapter >= 2,
  upgrades: s => s.chapter >= 1,
  cb: s => s.chapter >= 1 || s.cbDebt > 0,
  markets: s => s.chapter >= 3,
  ranking: s => s.chapter >= 3,
  me: s => s.chapter >= 3,
  achs: s => Object.keys(s.achievements).length >= 3,
};
const TAB_HINT = {
  deposits: _t('Comptes, livrets, assurance-vie, cartes : réglez vos produits et vos frais.'),
  clients: _t('La fiche de chacun de vos clients : salaire, solde, découvert, prêts.'),
  world: _t('Ouvrez de nouvelles agences sur la carte.'),
  upgrades: _t('Achetez des améliorations pour toute la banque.'),
  cb: _t('Empruntez à la banque centrale si vous manquez de liquidités.'),
  markets: _t('Placez votre argent en bourse.'),
  ranking: _t('Comparez-vous aux géants de la finance.'),
  me: _t('Versez-vous des bonus et achetez des objets de luxe.'),
  achs: _t('Retrouvez vos succès et vos statistiques.'),
};
const ITEM_UNLOCK = {
  g: () => true, gs: () => true,
  b: s => s.chapter >= 1, bs: s => s.chapter >= 1,
  deco: s => s.clients >= 30 || s.chapter >= 1,
  dab: s => s.chapter >= 1,
  vig: s => s.chapter >= 1 || !!s.flags.robbed,
  size: s => s.chapter >= 2,
  cof: s => s.chapter >= 1,
  ent: s => s.chapter >= 2,
  vip: s => s.chapter >= 3 || (s.chapter >= 2 && s.reputation >= 60),
};

// ---------- Employés ----------
const STAFF_ROLES = { gs: _t('Guichetier'), bs: _t('Conseiller'), vig: _t('Vigile') };
const STAFF_TITLES = {
  gs: [_t('Guichetier stagiaire'), _t('Guichetier'), _t('Guichetier confirmé'), _t('Chef de guichet'), _t('Responsable d’accueil')],
  bs: [_t('Conseiller junior'), _t('Conseiller'), _t('Conseiller senior'), _t('Expert crédit'), _t('Directeur commercial')],
  vig: [_t('Vigile stagiaire'), _t('Vigile'), _t('Agent de sécurité'), _t('Chef de la sécurité'), _t('Garde du corps d’élite')],
};
const TRAITS = {
  souriant: { name: _t('Souriant'), icon: '😊', desc: _t('+4 satisfaction dans l’agence') },
  rapide: { name: _t('Rapide'), icon: '⚡', desc: _t('+15 % d’efficacité') },
  ambitieux: { name: _t('Ambitieux'), icon: '🚀', desc: _t('Apprend 50 % plus vite') },
  fidele: { name: _t('Fidèle'), icon: '🤝', desc: _t('Ne démissionne jamais') },
  bavard: { name: _t('Bavard'), icon: '💬', desc: _t('-10 % d’efficacité, mais +2 satisfaction') },
  raleur: { name: _t('Râleur'), icon: '😤', desc: _t('-4 satisfaction dans l’agence') },
};
const MAX_LVL = 5;
const xpNeed = lvl => 80 * lvl;
Object.assign(ACHS, {
  sherlock: { name: _t('Sherlock'), icon: '🕵️', desc: _t('Démasquer 5 escrocs.'), t: s => (s.stats.frauds || 0) >= 5 },
  ogre: { name: _t('Requin de la finance'), icon: '🦈', desc: _t('Racheter un concurrent.'), t: s => (s.stats.buyouts || 0) >= 1 },
  storm: { name: _t('Insubmersible'), icon: '🌋', desc: _t('Traverser la Grande Crise.'), t: s => !!s.flags.bigCrisisDone },
  service: { name: _t('Zéro file d’attente'), icon: '⏱️', desc: _t('5 agences qui servent tous leurs clients.'), t: s => s.branches.filter(b => b.lastServed > 0 && !b.lastLost).length >= 5 },
  promo: { name: _t('Promotion !'), icon: '⭐', desc: _t('Promouvoir un employé.'), t: s => s.stats.promos >= 1 },
  lvl5: { name: _t('La perle rare'), icon: '💎', desc: _t('Avoir un employé au niveau 5.'), t: s => s.branches.some(b => (b.staff || []).some(e => e.lvl >= 5)) },
});

// ---------- Spécialités d'agence (à partir du niveau 2) ----------
const SPECS = {
  aucune: { name: _t('Généraliste'), icon: '🏦', desc: _t('Un peu de tout, pour tout le monde.') },
  particuliers: { name: _t('Particuliers'), icon: '👪', desc: _t('+25 % d’épargne possible.'), cap: 1.25 },
  entreprises: { name: _t('Entreprises'), icon: '🏭', desc: _t('+40 % de demandes de prêt, mais -15 % d’épargne.'), loans: 1.4, cap: 0.85 },
  patrimoine: { name: _t('Gestion de patrimoine'), icon: '💎', desc: _t('Assurance-vie ×2, mais 20 % de visiteurs en moins.'), av: 2, traffic: 0.8 },
  jeunes: { name: _t('Jeunes'), icon: '🎓', desc: _t('+30 % de visiteurs et +10 réputation par an, mais -15 % d’épargne.'), traffic: 1.3, cap: 0.85 },
};
const specOf = b => SPECS[b.spec] || SPECS.aucune;
const specUnlocked = (s, b) => b.size >= 2 && s.chapter >= 2;
