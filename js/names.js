'use strict';
/* =====================================================================
   BANQUE TYCOON — les pays : où l'on peut commencer, et les noms des
   clients, des employés et des entreprises selon le pays de l'agence.
   Les noms propres ne se traduisent pas.
   ===================================================================== */

// Les pays où l'on peut ouvrir sa première agence
const START_COUNTRIES = [
  ['FR', _t('France')], ['BE', _t('Belgique')], ['CH', _t('Suisse')], ['CA', _t('Canada')], ['GB', _t('Royaume-Uni')], ['US', _t('États-Unis')],
  ['ES', _t('Espagne')], ['IT', _t('Italie')], ['DE', _t('Allemagne')], ['MA', _t('Maroc')], ['SN', _t('Sénégal')], ['JP', _t('Japon')],
];
const countryName = cc => (START_COUNTRIES.find(c => c[0] === cc) || [, cc])[1];
const flag = cc => /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : cc;
// Petits drapeaux dessinés (les drapeaux emoji ne s'affichent pas sous Windows)
const V3 = (a, b, c) => `<rect width="10" height="20" fill="${a}"/><rect x="10" width="10" height="20" fill="${b}"/><rect x="20" width="10" height="20" fill="${c}"/>`;
const H3 = (a, b, c, m = 6.67) => `<rect width="30" height="20" fill="${b}"/><rect width="30" height="${m}" fill="${a}"/><rect y="${20 - m}" width="30" height="${m}" fill="${c}"/>`;
const STAR = (x, y, r, fill, stroke) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.4 : r; d += (i ? 'L' : 'M') + (x + rr * Math.cos(a)).toFixed(2) + ' ' + (y + rr * Math.sin(a)).toFixed(2); } return `<path d="${d}Z" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="0.8"` : ''}/>`; };
const FLAGS = {
  FR: V3('#1f4fa3', '#fff', '#e5323b'), BE: V3('#1a1a1a', '#f7d117', '#e5323b'), IT: V3('#159447', '#fff', '#d8303a'),
  DE: H3('#1a1a1a', '#dd1f26', '#f7c600'), ES: H3('#c8102e', '#f6c400', '#c8102e', 5),
  SN: V3('#0a8a46', '#f7d117', '#e5323b') + STAR(15, 10, 3.6, '#0a8a46'),
  CH: '<rect width="30" height="20" fill="#e5323b"/><rect x="12.5" y="4" width="5" height="12" fill="#fff"/><rect x="9" y="7.5" width="12" height="5" fill="#fff"/>',
  CA: '<rect width="30" height="20" fill="#fff"/><rect width="7.5" height="20" fill="#e5323b"/><rect x="22.5" width="7.5" height="20" fill="#e5323b"/>' + STAR(15, 10.5, 5, '#e5323b'),
  JP: '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5.5" fill="#d0103a"/>',
  MA: '<rect width="30" height="20" fill="#c1272d"/>' + STAR(15, 10.5, 5.5, 'none', '#006233'),
  GB: '<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.5"/><path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6"/><path d="M15 0V20M0 10H30" stroke="#c8102e" stroke-width="3.5"/>',
  US: '<rect width="30" height="20" fill="#fff"/>' + [0, 2, 4, 6, 8, 10, 12].map(i => `<rect y="${i * 20 / 13}" width="30" height="${20 / 13}" fill="#b22234"/>`).join('') + '<rect width="12" height="10.8" fill="#3c3b6e"/>',
};
const flagSVG = (cc, w = 42) => FLAGS[cc] ? `<svg class="flag" width="${w}" height="${w * 2 / 3}" viewBox="0 0 30 20" aria-hidden="true">${FLAGS[cc]}</svg>` : flag(cc);
// Prix de l'installation du siège selon la taille de la ville : le reste du million de départ devient votre capital
const START_PRICE = { s: 0, m: 250e3, l: 500e3, xl: 750e3 };
const startCash = id => 1.25e6 - (START_PRICE[CITIES[id].tier] || 0);

const LIGHT = ['#f1c9a5', '#ffdbac', '#e0ac69'], DARK = ['#8d5524', '#c68642', '#8d5524', '#a0673a'], MID = ['#e0ac69', '#c68642', '#d9a47c', '#f1c9a5'];
const NAMES = {
  fr: { m: ['Gérard', 'Kevin', 'Mohamed', 'Jean-Michel', 'Patrick', 'Thierry', 'Rachid', 'Hugo', 'Yannick', 'Bernard', 'Lucas', 'Gaston', 'Théo', 'Nicolas', 'Mathis', 'Karim'],
    f: ['Sophie', 'Brigitte', 'Chloé', 'Léa', 'Inès', 'Manon', 'Camille', 'Josiane', 'Fatou', 'Clémence', 'Nadia', 'Emma', 'Jade', 'Sandrine', 'Monique', 'Yasmine'],
    l: ['Dupont', 'Martin', 'Lefèvre', 'Moreau', 'Bernard', 'Petit', 'Durand', 'Leroy', 'Roux', 'Fournier', 'Girard', 'Bonnet', 'Mercier', 'Blanc', 'Garcia', 'Benali', 'Nguyen', 'Lambert', 'Fontaine', 'Rousseau', 'Diallo', 'Muller'],
    co: [_t('SARL {L} & Fils'), _t('{L} Industries'), _t('Boulangeries {L}'), _t('Transports {L}'), _t('Garage {L}'), _t('Ets {L}'), _t('{L} BTP'), _t('Fromagerie {L}')] },
  be: { m: ['Jean-Luc', 'Pieter', 'Lucas', 'Arnaud', 'Thomas', 'Wouter', 'Mehdi', 'Benoît', 'Jef', 'Sébastien', 'Kobe', 'Olivier'],
    f: ['Marie', 'Lotte', 'Julie', 'Ann', 'Nathalie', 'Sarah', 'Elise', 'Fien', 'Laura', 'Amira', 'Charlotte', 'Véronique'],
    l: ['Peeters', 'Janssens', 'Maes', 'Jacobs', 'Mertens', 'Dubois', 'Lambert', 'Claes', 'Willems', 'Goossens', 'Lejeune', 'Wouters', 'De Smet', 'Leclercq', 'Van Damme', 'El Amrani', 'Renard'],
    co: ['SPRL {L}', 'Brasserie {L}', 'Chocolaterie {L}', '{L} Bouw', 'Frituur {L}', 'Ets {L} & Fils'] },
  ch: { m: ['Urs', 'Lukas', 'Jean-Daniel', 'Marco', 'Reto', 'Nicolas', 'Beat', 'Luca', 'Pascal', 'Yves', 'Samuel', 'Dario'],
    f: ['Heidi', 'Céline', 'Nadine', 'Mirjam', 'Sandra', 'Chiara', 'Laure', 'Anna', 'Corinne', 'Léonie', 'Martina', 'Valérie'],
    l: ['Müller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Favre', 'Rochat', 'Bonvin', 'Gerber', 'Huber', 'Brunner', 'Rossi', 'Baumann', 'Pittet', 'Steiner', 'Moser'],
    co: ['{L} AG', 'Horlogerie {L}', 'Fromagerie {L} SA', 'Chocolats {L}', '{L} Bau GmbH', 'Fiduciaire {L}'] },
  ca: { m: ['Jean-Guy', 'Gaétan', 'Mathieu', 'Réjean', 'Kevin', 'Liam', 'Étienne', 'Marc-André', 'Pierre-Luc', 'Noah', 'Ryan', 'Sylvain'],
    f: ['Ginette', 'Josée', 'Marie-Ève', 'Chantal', 'Émilie', 'Olivia', 'Annie', 'Geneviève', 'Sophie', 'Charlotte', 'Mélanie', 'Isabelle'],
    l: ['Tremblay', 'Gagnon', 'Roy', 'Côté', 'Bouchard', 'Gauthier', 'Morin', 'Lavoie', 'Fortin', 'Gagné', 'Pelletier', 'Bélanger', 'Smith', 'MacDonald', 'Wilson', 'Nguyen', 'Singh', 'Leblanc'],
    co: ['{L} Construction inc.', 'Érablière {L}', 'Dépanneur {L}', 'Garage {L} & Fils', 'Transport {L} ltée', 'Poutinerie {L}'] },
  es: { m: ['Javier', 'Pablo', 'Alejandro', 'Manuel', 'Sergio', 'Diego', 'Antonio', 'Hugo', 'Álvaro', 'Jorge', 'Iker', 'Rafael'],
    f: ['Lucía', 'Carmen', 'María', 'Paula', 'Laura', 'Elena', 'Marta', 'Sofía', 'Alba', 'Pilar', 'Nuria', 'Rocío'],
    l: ['García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Ruiz', 'Díaz', 'Moreno', 'Muñoz', 'Romero', 'Navarro', 'Torres', 'Ortega', 'Castillo'],
    co: ['{L} y Hermanos S.L.', 'Construcciones {L}', 'Panadería {L}', 'Bodegas {L}', 'Talleres {L}', 'Transportes {L} S.A.'] },
  hisp: { m: ['José', 'Juan', 'Luis', 'Carlos', 'Miguel', 'Santiago', 'Mateo', 'Diego', 'Fernando', 'Ricardo', 'Emiliano', 'Facundo'],
    f: ['Guadalupe', 'María', 'Valentina', 'Camila', 'Ximena', 'Daniela', 'Fernanda', 'Sofía', 'Lucía', 'Florencia', 'Mariana', 'Renata'],
    l: ['Hernández', 'García', 'Martínez', 'López', 'González', 'Rodríguez', 'Pérez', 'Sánchez', 'Ramírez', 'Flores', 'Gómez', 'Fernández', 'Díaz', 'Torres', 'Álvarez', 'Romero'],
    co: ['Taquería {L}', 'Constructora {L}', 'Grupo {L}', 'Transportes {L}', 'Panadería {L}', 'Café {L}'] },
  pt: { m: ['João', 'Tiago', 'Rui', 'Pedro', 'Miguel', 'Gonçalo', 'Rafael', 'Diogo', 'Bruno', 'Thiago', 'Gabriel', 'Caio'],
    f: ['Maria', 'Ana', 'Inês', 'Beatriz', 'Mariana', 'Joana', 'Rita', 'Camila', 'Larissa', 'Fernanda', 'Juliana', 'Leonor'],
    l: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Sousa', 'Almeida', 'Carvalho', 'Gomes', 'Lopes', 'Ribeiro', 'Souza', 'Lima'],
    co: ['{L} & Filhos Lda.', 'Construções {L}', 'Padaria {L}', 'Vinhos {L}', 'Transportes {L}', 'Pastelaria {L}'] },
  it: { m: ['Giuseppe', 'Marco', 'Luca', 'Francesco', 'Alessandro', 'Matteo', 'Lorenzo', 'Giovanni', 'Andrea', 'Paolo', 'Salvatore', 'Davide'],
    f: ['Giulia', 'Francesca', 'Chiara', 'Sofia', 'Martina', 'Elena', 'Valentina', 'Alessia', 'Federica', 'Rosa', 'Giorgia', 'Paola'],
    l: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa', 'Giordano', 'Mancini', 'Lombardi'],
    co: ['{L} & Figli S.r.l.', 'Pastificio {L}', 'Trattoria {L}', 'Costruzioni {L}', 'Officina {L}', 'Caseificio {L}'] },
  de: { m: ['Lukas', 'Jonas', 'Maximilian', 'Felix', 'Thomas', 'Stefan', 'Jürgen', 'Michael', 'Tobias', 'Florian', 'Klaus', 'Emre'],
    f: ['Anna', 'Laura', 'Lena', 'Sabine', 'Julia', 'Katharina', 'Ursula', 'Lea', 'Hannah', 'Petra', 'Mia', 'Leonie'],
    l: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter', 'Wolf', 'Schröder', 'Neumann', 'Braun', 'Yilmaz', 'Krüger'],
    co: ['{L} GmbH', '{L} & Söhne', 'Bäckerei {L}', '{L} Maschinenbau', 'Autohaus {L}', 'Brauerei {L}'] },
  nl: { m: ['Daan', 'Sem', 'Bram', 'Jeroen', 'Pieter', 'Thijs', 'Ruben', 'Joost', 'Mohammed', 'Lars'],
    f: ['Emma', 'Sanne', 'Lotte', 'Fleur', 'Anouk', 'Sophie', 'Eva', 'Femke', 'Iris', 'Noor'],
    l: ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'Bos', 'Vos', 'Peters'],
    co: ['{L} B.V.', 'Bakkerij {L}', '{L} Bouw', 'Transport {L}', 'Kaashandel {L}', 'Fietsen {L}'] },
  se: { m: ['Erik', 'Lars', 'Oskar', 'Anders', 'Johan', 'Nils', 'Gustav', 'Lucas', 'Björn', 'Karl'],
    f: ['Astrid', 'Elsa', 'Ingrid', 'Maja', 'Linnea', 'Sofia', 'Karin', 'Ebba', 'Freja', 'Alva'],
    l: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Lindberg', 'Berg'],
    co: ['{L} AB', '{L} Bygg', 'Bageri {L}', '{L} Möbler', 'Transport {L} AB', '{L} Design'] },
  gr: { m: ['Giorgos', 'Dimitris', 'Nikos', 'Kostas', 'Yannis', 'Panagiotis', 'Christos', 'Vasilis', 'Stavros', 'Alexandros'],
    f: ['Maria', 'Eleni', 'Katerina', 'Sofia', 'Georgia', 'Ioanna', 'Despina', 'Anna', 'Dimitra', 'Vasiliki'],
    l: ['Papadopoulos', 'Papadakis', 'Georgiou', 'Nikolaou', 'Ioannou', 'Konstantinou', 'Pappas', 'Vlachos', 'Christodoulou', 'Oikonomou', 'Karagiannis', 'Makris'],
    co: ['{L} A.E.', 'Taverna {L}', 'Huiles {L}', 'Ktima {L}', '{L} Shipping', 'Fournos {L}'] },
  en: { m: ['Oliver', 'Harry', 'George', 'Jack', 'James', 'William', 'Charlie', 'Thomas', 'Mohammed', 'Callum', 'Liam', 'Noah'],
    f: ['Olivia', 'Amelia', 'Isla', 'Emily', 'Sophie', 'Chloe', 'Grace', 'Lily', 'Jessica', 'Priya', 'Ruby', 'Charlotte'],
    l: ['Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Evans', 'Wilson', 'Thomas', 'Johnson', 'Roberts', 'Walker', 'Wright', 'Patel', 'Khan', 'Robinson', 'Thompson', 'Hughes'],
    co: ['{L} & Sons Ltd', '{L} Builders', '{L} Bakery', '{L} Haulage', '{L} Motors', 'The {L} Pub Company'] },
  us: { m: ['Michael', 'James', 'Tyler', 'Brandon', 'Jose', 'DeShawn', 'Ethan', 'Mason', 'Kevin', 'Wei', 'Carlos', 'Jake'],
    f: ['Ashley', 'Jessica', 'Madison', 'Emily', 'Brittany', 'Maria', 'Aaliyah', 'Hannah', 'Kayla', 'Taylor', 'Megan', 'Grace'],
    l: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Jackson', 'Lee', 'Washington'],
    co: ['{L} Inc.', '{L} Construction LLC', '{L}’s Diner', '{L} Trucking', '{L} Motors', '{L} Tech Corp'], skin: MID },
  ma: { m: ['Mohamed', 'Youssef', 'Hamza', 'Amine', 'Mehdi', 'Omar', 'Karim', 'Ayoub', 'Rachid', 'Saïd', 'Hicham', 'Anas'],
    f: ['Fatima', 'Khadija', 'Salma', 'Imane', 'Meryem', 'Aïcha', 'Nadia', 'Zineb', 'Hiba', 'Soukaina', 'Leïla', 'Samira'],
    l: ['Alaoui', 'Benjelloun', 'El Idrissi', 'Bennani', 'Tazi', 'Berrada', 'Chraibi', 'El Amrani', 'Ouazzani', 'Fassi', 'Lahlou', 'Benali', 'Saidi', 'Bouzid', 'Ziani'],
    co: ['Riad {L}', 'Ets {L} & Fils', 'Coopérative d’argan {L}', 'Transports {L}', 'Textiles {L}', 'Céramiques {L}'], skin: MID },
  waf: { m: ['Mamadou', 'Moussa', 'Ousmane', 'Abdoulaye', 'Cheikh', 'Ibrahima', 'Modou', 'Babacar', 'Kouassi', 'Yao', 'Serge', 'Aliou'],
    f: ['Fatou', 'Aminata', 'Awa', 'Mariama', 'Aïssatou', 'Ndeye', 'Khady', 'Adjoua', 'Aya', 'Rokhaya', 'Bintou', 'Astou'],
    l: ['Diop', 'Ndiaye', 'Fall', 'Sow', 'Diallo', 'Ba', 'Faye', 'Sarr', 'Gueye', 'Cissé', 'Mbaye', 'Koné', 'Kouamé', 'Traoré', 'Touré', 'Seck'],
    co: ['Ets {L} & Frères', 'Boulangerie {L}', 'Transports {L}', 'Agro {L} SARL', 'Pêcheries {L}', 'BTP {L}'], skin: DARK },
  ng: { m: ['Chinedu', 'Emeka', 'Tunde', 'Femi', 'Ibrahim', 'Musa', 'Obinna', 'Segun', 'Kelechi', 'David'],
    f: ['Ngozi', 'Chioma', 'Amaka', 'Funmilayo', 'Aisha', 'Blessing', 'Yetunde', 'Ifeoma', 'Zainab', 'Adaeze'],
    l: ['Okafor', 'Adeyemi', 'Okonkwo', 'Bello', 'Abubakar', 'Eze', 'Nwosu', 'Adebayo', 'Ogunleye', 'Balogun', 'Ibrahim', 'Obi'],
    co: ['{L} Enterprises', '{L} Holdings', '{L} Motors', '{L} Foods Ltd', '{L} Logistics', '{L} Studios'], skin: DARK },
  ke: { m: ['Brian', 'Otieno', 'Kamau', 'Mwangi', 'Kipchoge', 'Omondi', 'Juma', 'Peter', 'Collins', 'Dennis'],
    f: ['Wanjiru', 'Akinyi', 'Njeri', 'Faith', 'Mercy', 'Achieng', 'Wambui', 'Grace', 'Nyambura', 'Chebet'],
    l: ['Mwangi', 'Otieno', 'Kamau', 'Kiprono', 'Ochieng', 'Njoroge', 'Wanjala', 'Kariuki', 'Mutua', 'Odhiambo', 'Cheruiyot', 'Kimani'],
    co: ['{L} Enterprises', '{L} Tea Estates', '{L} Safaris', '{L} Matatu Co.', '{L} Hardware', '{L} Flowers Ltd'], skin: DARK },
  za: { m: ['Thabo', 'Sipho', 'Pieter', 'Johan', 'Lwazi', 'Bongani', 'Ruan', 'Themba', 'Kagiso', 'Mandla'],
    f: ['Nomvula', 'Thandi', 'Lerato', 'Anele', 'Zanele', 'Elna', 'Busisiwe', 'Palesa', 'Naledi', 'Marike'],
    l: ['Nkosi', 'Dlamini', 'Ndlovu', 'van der Merwe', 'Botha', 'Mokoena', 'Khumalo', 'Naidoo', 'Pretorius', 'Zulu', 'Molefe', 'Venter'],
    co: ['{L} (Pty) Ltd', '{L} Wines', '{L} Mining', '{L} Braai Supplies', '{L} Transport', '{L} Construction'], skin: MID },
  jp: { m: ['Haruto', 'Yuto', 'Sota', 'Takeshi', 'Hiroshi', 'Kenji', 'Daiki', 'Ren', 'Kaito', 'Shota', 'Akira', 'Takumi'],
    f: ['Yui', 'Sakura', 'Hana', 'Aoi', 'Yuki', 'Mei', 'Rin', 'Haruka', 'Keiko', 'Emi', 'Misaki', 'Naomi'],
    l: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Matsumoto', 'Inoue', 'Kimura'],
    co: ['{L} Shōji', '{L} Kōgyō', 'Ramen {L}', '{L} Seisakusho', '{L} Unyu', '{L} Denki'], skin: LIGHT },
  kr: { m: ['Min-jun', 'Seo-jun', 'Ji-ho', 'Hyun-woo', 'Dong-hyun', 'Jae-won', 'Sung-min', 'Tae-yang'],
    f: ['Ji-woo', 'Seo-yeon', 'Ha-eun', 'Min-ji', 'Soo-ah', 'Ye-jin', 'Da-eun', 'Eun-ji'],
    l: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim'],
    co: ['{L} Electronics', '{L} Heavy Industries', '{L} Food', '{L} Motors', '{L} Construction', '{L} Cosmetics'], skin: LIGHT },
  zh: { m: ['Wei', 'Jun', 'Hao', 'Lei', 'Yang', 'Ming', 'Jian', 'Tao', 'Kai', 'Zhi'],
    f: ['Li', 'Mei', 'Xin', 'Ying', 'Fang', 'Jing', 'Hui', 'Lan', 'Yan', 'Xiu'],
    l: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou', 'Tan', 'Lim', 'Wong', 'Chan'],
    co: ['{L} Trading Co.', '{L} Electronics', '{L} Dim Sum House', '{L} Logistics', '{L} Holdings', '{L} Textiles'], skin: LIGHT },
  in: { m: ['Rahul', 'Arjun', 'Vikram', 'Rohan', 'Amit', 'Sanjay', 'Aditya', 'Karan', 'Ravi', 'Suresh'],
    f: ['Priya', 'Ananya', 'Deepika', 'Pooja', 'Neha', 'Kavya', 'Sunita', 'Lakshmi', 'Isha', 'Meera'],
    l: ['Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Reddy', 'Iyer', 'Shah', 'Mehta', 'Joshi', 'Nair', 'Das'],
    co: ['{L} Textiles', '{L} & Sons', '{L} Spices', '{L} Infotech', '{L} Motors', '{L} Pharma'], skin: MID },
  tr: { m: ['Mehmet', 'Mustafa', 'Ahmet', 'Emre', 'Burak', 'Can', 'Murat', 'Yusuf', 'Kerem', 'Oğuz'],
    f: ['Ayşe', 'Fatma', 'Elif', 'Zeynep', 'Emine', 'Merve', 'Selin', 'Defne', 'Esra', 'Büşra'],
    l: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Öztürk', 'Aydın', 'Arslan', 'Doğan', 'Kılıç', 'Aslan'],
    co: ['{L} Tekstil', '{L} İnşaat', '{L} Lokantası', '{L} Nakliyat', '{L} Halı', '{L} Gıda'], skin: MID },
  gulf: { m: ['Ahmed', 'Khalid', 'Saeed', 'Rashid', 'Hamad', 'Abdullah', 'Sultan', 'Faisal', 'Majid', 'Omar'],
    f: ['Fatima', 'Mariam', 'Aisha', 'Noura', 'Hessa', 'Latifa', 'Shamma', 'Reem', 'Maitha', 'Sara'],
    l: ['Al Mansoori', 'Al Hashimi', 'Al Suwaidi', 'Al Marri', 'Al Kuwari', 'Al Mazrouei', 'Al Falasi', 'Al Ketbi', 'Al Shamsi', 'Al Nuaimi'],
    co: ['{L} Trading LLC', '{L} Holdings', '{L} Real Estate', '{L} Falcons Club', '{L} Gold Souk', '{L} Shipping'], skin: MID },
};
const POOL_OF = { FR: 'fr', BE: 'be', CH: 'ch', CA: 'ca', ES: 'es', MX: 'hisp', AR: 'hisp', PT: 'pt', BR: 'pt', IT: 'it', DE: 'de', AT: 'de', NL: 'nl', SE: 'se', GR: 'gr',
  GB: 'en', AU: 'en', NZ: 'en', US: 'us', MA: 'ma', SN: 'waf', CI: 'waf', NG: 'ng', KE: 'ke', ZA: 'za', JP: 'jp', KR: 'kr', CN: 'zh', HK: 'zh', SG: 'zh', IN: 'in', TR: 'tr', AE: 'gulf', QA: 'gulf' };
const POOL_KEYS = Object.keys(NAMES);
// Le jeu de noms d'une agence (dans l'espace, les colons viennent de partout : on mélange)
function namePool(brId, seed = rint(0, 999)) {
  const c = CITIES[brId] || CITIES[HQ];
  return NAMES[POOL_OF[c.cc] || POOL_KEYS[seed % POOL_KEYS.length]];
}
const poolName = (P, female) => pick(female ? P.f : P.m) + ' ' + pick(P.l);
function companyName(brId) { const P = namePool(brId); return pick(P.co).replace('{L}', pick(P.l)); }

// ---------- Les projets des emprunteurs : ceux de partout, et ceux du pays ----------
const LOCAL_REASONS = {
  FR: { immo: [_t('un mas en Provence'), _t('une longère en Bretagne'), _t('un appartement haussmannien')], pro: [_t('une boulangerie-pâtisserie'), _t('un food-truck de crêpes'), _t('un domaine viticole')], conso: [_t('un vélo électrique'), _t('un week-end à Disneyland')] },
  BE: { immo: [_t('une maison de maître'), _t('une fermette dans les Ardennes')], pro: [_t('une friterie'), _t('une micro-brasserie'), _t('une chocolaterie artisanale')], conso: [_t('un vélo cargo')] },
  CH: { immo: [_t('un chalet en Valais'), _t('un appartement avec vue sur le lac')], pro: [_t('un atelier d’horlogerie'), _t('une fromagerie d’alpage')], conso: [_t('une montre de luxe'), _t('un abonnement de ski')] },
  CA: { immo: [_t('un chalet au bord d’un lac'), _t('un condo au centre-ville')], pro: [_t('une érablière'), _t('une cabane à sucre'), _t('un camion de poutine')], conso: [_t('une motoneige')], auto: [_t('un gros pick-up')] },
  GB: { immo: [_t('un cottage à la campagne'), _t('une maison victorienne')], pro: [_t('un pub'), _t('un salon de thé'), _t('une boutique de fish and chips')], conso: [_t('un abonnement au stade de son club')] },
  US: { immo: [_t('un ranch au Texas'), _t('une maison avec piscine en Floride')], pro: [_t('un diner'), _t('un food-truck de tacos'), _t('une start-up dans son garage')], auto: [_t('un pick-up géant')], conso: [_t('un voyage à Disney World')] },
  ES: { immo: [_t('une finca en Andalousie'), _t('un appartement sur la plage')], pro: [_t('un bar à tapas'), _t('une oliveraie'), _t('un vignoble dans la Rioja')], conso: [_t('une grande fête pour la feria')] },
  IT: { immo: [_t('un trullo dans les Pouilles'), _t('une villa en Toscane')], pro: [_t('une pizzeria au feu de bois'), _t('un atelier de pâtes fraîches'), _t('un glacier artisanal')], auto: [_t('une Vespa')] },
  DE: { immo: [_t('une maison en Bavière')], pro: [_t('une brasserie'), _t('une boulangerie de bretzels'), _t('un garage automobile')], auto: [_t('une berline allemande')] },
  MA: { immo: [_t('un riad dans la médina'), _t('une villa près de la mer')], pro: [_t('une coopérative d’huile d’argan'), _t('un atelier de céramique'), _t('un hammam')], conso: [_t('un grand mariage')] },
  SN: { immo: [_t('une maison familiale avec cour')], pro: [_t('une pirogue de pêche'), _t('un atelier de couture'), _t('un commerce de bissap')], auto: [_t('un minibus de transport')], conso: [_t('un grand mariage')] },
  JP: { immo: [_t('une maison traditionnelle'), _t('un appartement près d’une gare')], pro: [_t('un restaurant de ramen'), _t('une auberge traditionnelle'), _t('un atelier de robots')], conso: [_t('un voyage à Hokkaido')] },
};
const IMMO_APPORT = [_t('acheter sa résidence principale'), _t('une maison pour sa famille qui s’agrandit'), _t('un appartement près de son travail'), _t('la maison de ses rêves'), _t('un duplex avec terrasse')];
const IMMO_SANS = [_t('acheter un appartement sans apport'), _t('un premier studio sans apport'), _t('quitter la location pour devenir propriétaire')];
const WORKS = [_t('des travaux dans sa maison'), _t('refaire sa toiture'), _t('isoler sa maison'), _t('agrandir sa cuisine'), _t('une véranda')];
function loanReason(type, br) {
  const L = LOCAL_REASONS[(CITIES[br] || CITIES[HQ]).cc], loc = L && L[type];
  return loc && chance(0.35) ? pick(loc) : pick(LOAN_TYPES[type].reasons);
}
