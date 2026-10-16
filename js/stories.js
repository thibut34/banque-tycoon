'use strict';
/* =====================================================================
   BANQUE TYCOON — histoires de clients, vie du quartier, journées
   spéciales du calendrier et alertes de liquidités.
   Une histoire est une suite d'épisodes : chaque choix peut programmer
   l'épisode suivant quelques jours ou quelques mois plus tard.
   ===================================================================== */

const sat = (s, v) => { for (const b of s.branches) b.sat = clamp(b.sat + v, 0, 100); };
const rep = (s, v) => { s.reputation = clamp(s.reputation + v, 0, 100); };
const pay = (s, v) => { s.cash -= v; s.flags.mExtraCosts = (s.flags.mExtraCosts || 0) + v; };
const he = p => personFace(p).female ? 'elle' : 'il';
const He = p => personFace(p).female ? 'Elle' : 'Il';

// Programme l'épisode suivant
function storyNext(s, c, step, delay, data = {}) {
  (s.storyQ = s.storyQ || []).push({ day: s.day + delay, sid: c.sid, step, pid: c.pid, d: { ...c.d, ...data } });
}
function storyEnd(s, p) { if (p) delete p.saga; }

// Un prêt accordé au fil d'une histoire
function storyLoan(s, p, type, amount, rate, dur, name) {
  if (s.surveillance) return null;
  if (s.cash < amount) return null;
  const r = makeRequest(s, type);
  Object.assign(r, { name, amount, offer: rate, maxRate: rate + 2, dur, score: 700, fraud: false });
  delete r.pid;
  grantLoan(s, r);
  const L = s.loans[s.loans.length - 1]; L.pdA = 0.002; L.story = 1;
  return L;
}
function storyLoss(s, L, keep) {
  if (!L) return 0;
  const got = Math.round(L.out * keep);
  s.cash += got; s.flags.seizeLoss = (s.flags.seizeLoss || 0) + (L.out - got);
  s.loans = s.loans.filter(x => x !== L);
  return L.out - got;
}
const loanOf = (s, c) => s.loans.find(l => l.id === c.d.loan);
function newClients(s, n, p) {
  const b = getBranch(s, p ? p.br : HQ) || s.branches[0];
  for (let i = 0; i < n; i++) { const q = newPersonFor(s, b); openPersonAccount(s, q); }
}

// ---------- Les histoires de vos clients ----------
const STORIES = {
  boulangerie: {
    pick: p => !p.u && p.j !== 6 && p.j !== 0 && p.s >= 1500 && p.s <= 4000 && (p.l || 0) + p.b < p.s * 8,
    steps: [
      { ico: '🥖', title: 'Un rêve de boulangerie', txt: (s, c, p) => `${who(p)} rêve d’ouvrir sa propre boulangerie. ${He(p)} vous demande conseil : ${he(p)} n’a que <b>${money((p.l || 0) + Math.max(0, p.b))}</b> de côté.`,
        ch: [
          ['L’aider à épargner d’abord', 'Il reviendra plus solide', 'success', (s, c, p) => { p.sv = Math.min(0.9, p.sv + 0.25); p.q += 6; storyNext(s, c, 1, rint(25, 40)); return `${pname(p)} va mettre de côté chaque mois. Rendez-vous dans quelques semaines !`; }],
          ['Financer tout de suite (60 k€)', 'Sans apport : risqué', '', (s, c, p) => { const L = storyLoan(s, p, 'pro', 60e3, 5.5, 84, `Boulangerie ${p.i % 2 ? 'du Marché' : 'des Arceaux'} (${pname(p)})`); if (!L) return 'Pas assez de liquidités pour ce prêt.'; storyNext(s, c, 2, rint(45, 70), { loan: L.id, ok: chance(0.45) }); return `Prêt accordé : ${pname(p)} signe le bail du local !`; }],
          ['Le décourager', 'Il sera déçu', 'ghost', (s, c, p) => { p.q -= 10; storyEnd(s, p); return `${pname(p)} range ses rêves dans un tiroir…`; }],
        ], auto: 2 },
      { ico: '🥖', title: 'La boulangerie, le retour', txt: (s, c, p) => `${who(p)} revient avec un sourire jusqu’aux oreilles : ${he(p)} a économisé et trouvé un local. ${He(p)} demande un prêt de <b>${money(45e3)}</b> sur 7 ans.`,
        ch: [
          ['Accorder le prêt à 4,5 %', 'Un dossier solide', 'success', (s, c, p) => { const L = storyLoan(s, p, 'pro', 45e3, 4.5, 84, `Boulangerie de ${pname(p)}`); if (!L) return 'Pas assez de liquidités pour ce prêt.'; storyNext(s, c, 2, rint(50, 80), { loan: L.id, ok: chance(0.82) }); s.today.tally.prets++; return `${pname(p)} vous serre la main : « Vous ne le regretterez pas ! »`; }],
          ['Refuser', 'Il ira voir un concurrent', 'ghost', (s, c, p) => { p.q -= 25; storyEnd(s, p); if (p.b >= 0 && !personLoans(s, p).length && chance(0.5)) { closePerson(s, p); return `Vexé, ${pname(p)} ferme son compte et part chez un concurrent.`; } return `${pname(p)} est très déçu.`; }],
        ], auto: 0 },
      { txt: (s, c, p) => c.d.ok ? `🥐 La boulangerie de ${who(p)} cartonne ! La file d’attente déborde sur le trottoir et ${he(p)} parle de votre banque à tous ses clients.` : `😢 La boulangerie de ${who(p)} n’a pas tenu : trop de concurrence, un four en panne… ${He(p)} ne peut plus rembourser.`,
        ico: (s, c) => c.d.ok ? '🥐' : '😢', title: (s, c) => c.d.ok ? 'Un succès croustillant' : 'Rideau baissé',
        ch: [
          [(s, c) => c.d.ok ? 'Commander les croissants de l’équipe chez lui' : 'Saisir le fonds de commerce', (s, c) => c.d.ok ? '+ satisfaction, nouveaux clients' : 'Vous récupérez 35 %', 'success', (s, c, p) => {
            storyEnd(s, p);
            if (c.d.ok) { sat(s, 6); rep(s, 2); newClients(s, 3, p); return `Croissants pour tout le monde ! 3 commerçants du quartier ouvrent un compte chez vous.`; }
            const lost = storyLoss(s, loanOf(s, c), 0.35); p.k = (p.k || 0) + 1; return `Fonds de commerce vendu. Perte : ${money(lost)}.`; }],
          [(s, c) => c.d.ok ? 'Le féliciter' : 'Lui laisser une chance (étaler la dette)', (s, c) => c.d.ok ? '' : 'Vous récupérez 55 %, il reste client', '', (s, c, p) => {
            storyEnd(s, p);
            if (c.d.ok) { p.q += 10; rep(s, 1); return `${pname(p)} est touché par vos mots.`; }
            const lost = storyLoss(s, loanOf(s, c), 0.55); p.q += 25; rep(s, 2); return `${pname(p)} retrouve un emploi et rembourse ce qu’il peut. Perte : ${money(lost)}. Le quartier salue votre humanité.`; }],
        ], auto: 0 },
    ],
  },
  loto: {
    pick: p => p.j !== 0 && !p.u,
    steps: [
      { ico: '🎰', title: 'Le gros lot !', txt: (s, c, p) => `${who(p)} entre en tremblant : ${he(p)} vient de gagner <b>${money(c.d.amt)}</b> au Loto ! ${He(p)} ne sait pas quoi en faire.`,
        init: (s, c) => { c.d.amt = rint(2, 8) * 1e5; },
        ch: [
          ['Tout placer sur un livret', (s) => s.prod.liv.on ? 'L’argent reste chez vous' : 'Livret non lancé', 'success', (s, c, p) => { if (!s.prod.liv.on) return 'Vous n’avez pas encore de livret à proposer !'; p.l = (p.l || 0) + c.d.amt; s.cash += c.d.amt; p.q += 10; storyNext(s, c, 1, rint(30, 60)); return `${money(c.d.amt)} de plus sur vos livrets !`; }, s => !s.prod.liv.on],
          ['Le garder sur son compte', 'Sans conseil', '', (s, c, p) => { p.b += c.d.amt; s.cash += c.d.amt; storyNext(s, c, 1, rint(20, 45)); return `${pname(p)} dépose son chèque géant.`; }],
          ['Lui conseiller de tout dépenser', 'Mauvaise idée…', 'ghost', (s, c, p) => { p.b += c.d.amt * 0.2; s.cash += c.d.amt * 0.2; p.q -= 5; storyEnd(s, p); return `${pname(p)} part en Ferrari. Il ne reste presque rien sur son compte.`; }],
        ], auto: 1 },
      { ico: '🛥️', title: 'Le gagnant du Loto revient', txt: (s, c, p) => `${who(p)} veut acheter <b>un yacht à ${money(c.d.amt * 0.7)}</b> et prêter de l’argent à toute sa famille.`,
        ch: [
          ['Le raisonner', '70 % de chances', 'success', (s, c, p) => { storyEnd(s, p); if (chance(0.7)) { p.q += 15; rep(s, 1); return `${pname(p)} achète un petit voilier à la place et garde le reste chez vous. Merci du conseil !`; } const out = Math.min(c.d.amt * 0.6, (p.l || 0) + Math.max(0, p.b)); const fl = Math.min(p.l || 0, out); if (p.l) p.l -= fl; p.b -= out - fl; s.cash -= out; return `${pname(p)} n’écoute rien et retire ${money(out)}.`; }],
          ['Le laisser faire', 'C’est son argent', '', (s, c, p) => { storyEnd(s, p); const out = Math.min(c.d.amt * 0.7, (p.l || 0) + Math.max(0, p.b)); const fl = Math.min(p.l || 0, out); if (p.l) p.l -= fl; p.b -= out - fl; s.cash -= out; return `${money(out)} quittent votre banque… direction le port de Sète.`; }],
        ], auto: 1 },
    ],
  },
  etudiant: {
    pick: p => p.j === 0,
    steps: [
      { ico: '🎓', title: 'Fin du mois difficile', txt: (s, c, p) => `${who(p)}, étudiant, n’arrive plus à payer son loyer et ses livres. Il vous demande un coup de pouce pour finir sa dernière année.`,
        ch: [
          ['Prêt étudiant de 10 k€ à 1 %', 'Peu rentable, mais…', 'success', (s, c, p) => { const L = storyLoan(s, p, 'conso', 10e3, 1, 72, `Prêt étudiant (${pname(p)})`); if (!L) return 'Pas assez de liquidités.'; p.q += 20; storyNext(s, c, 1, rint(60, 100), { loan: L.id }); return `${pname(p)} peut finir ses études sereinement.`; }],
          ['Lui faire un budget', 'Gratuit', '', (s, c, p) => { p.sp = Math.round(p.sp * 0.85); p.q += 4; storyNext(s, c, 1, rint(80, 120), { tough: 1 }); return `Vous passez une heure avec ${pname(p)} sur un tableur.`; }],
          ['Refuser', '', 'ghost', (s, c, p) => { p.q -= 10; storyEnd(s, p); return `${pname(p)} repart tête basse.`; }],
        ], auto: 1 },
      { ico: '💼', title: 'Diplômé !', txt: (s, c, p) => `${who(p)} a eu son diplôme ${c.d.tough ? 'de justesse ' : 'avec mention '}et vient d’être embauché comme <b>ingénieur</b> ! ${c.d.loan ? '« Sans votre prêt, je n’y serais pas arrivé. »' : ''}`,
        init: (s, c, p) => { p.j = 4; p.s = rint(30, 40) * 100; p.sp = Math.round(p.s * 0.5); p.r = Math.round(p.s * 0.25 / 10) * 10; p.u = 0; },
        ch: [
          ['Lui proposer la carte Gold', '85 % de chances', 'success', (s, c, p) => { if (chance(0.85)) { p.c = 2; s.today.tally.ventes++; } p.q += 8; storyNext(s, c, 2, rint(90, 160)); return `${pname(p)} passe à la Gold ✨`; }],
          ['Le féliciter', '', '', (s, c, p) => { p.q += 12; storyNext(s, c, 2, rint(90, 160)); return `${pname(p)} est aux anges.`; }],
        ], auto: 1 },
      { pret: true }, // il revient acheter son premier appartement : vrai rendez-vous crédit
    ],
  },
  mariage: {
    pick: p => !p.u && p.j !== 0 && p.j !== 6,
    steps: [
      { ico: '💍', title: 'Un mariage !', txt: (s, c, p) => `${who(p)} se marie le mois prochain ! ${He(p)} veut ouvrir un <b>compte joint</b> et a besoin de ${money(12e3)} pour la fête.`,
        ch: [
          ['Compte joint + prêt mariage', '+1 client, crédit conso', 'success', (s, c, p) => { newClients(s, 1, p); const L = storyLoan(s, p, 'conso', 12e3, 4.9, 48, `Mariage de ${pname(p)}`); p.q += 15; storyNext(s, c, 1, rint(60, 100)); s.today.tally.comptes++; return L ? `Félicitations ! Compte joint ouvert et prêt accordé. Vous êtes invité au vin d’honneur 🥂` : 'Compte joint ouvert (pas assez de liquidités pour le prêt).'; }],
          ['Juste le compte joint', '+1 client', '', (s, c, p) => { newClients(s, 1, p); p.q += 6; storyNext(s, c, 1, rint(60, 100)); s.today.tally.comptes++; return 'Compte joint ouvert. Vive les mariés !'; }],
        ], auto: 1 },
      { ico: '👶', title: 'Un bébé arrive', txt: (s, c, p) => `${who(p)} attend un bébé ! L’appartement devient trop petit. ${He(p)} veut ouvrir un <b>livret pour l’enfant</b>.`,
        ch: [
          ['Ouvrir un livret bébé', (s) => s.prod.liv.on ? '' : 'Livret non lancé', 'success', (s, c, p) => { if (!s.prod.liv.on) return 'Lancez d’abord le livret dans Produits.'; const m = Math.min(Math.max(0, p.b) * 0.3, 3000); p.b -= m; p.l = (p.l || 0) + m; s.today.tally.ventes++; p.q += 8; storyNext(s, c, 2, rint(20, 40)); return `Premier dépôt de ${money(m)} pour le futur bébé 🍼`; }, s => !s.prod.liv.on],
          ['Le féliciter', '', '', (s, c, p) => { p.q += 5; storyNext(s, c, 2, rint(20, 40)); return 'Toute l’agence signe une carte.'; }],
        ], auto: 1 },
      { pret: true },
    ],
  },
  arnaque: {
    pick: p => p.j === 6 && p.b + (p.l || 0) > 4000,
    steps: [
      { ico: '📞', title: 'Un appel étrange', txt: (s, c, p) => `${who(p)}, 81 ans, veut virer <b>${money(c.d.amt)}</b> en urgence à son « petit-fils », coincé à l’étranger. Il a appelé d’un numéro inconnu…`,
        init: (s, c, p) => { c.d.amt = Math.round(Math.min(15e3, (p.b + (p.l || 0)) * 0.6) / 100) * 100; },
        ch: [
          ['Lui conseiller d’appeler sa famille', 'Prudence', 'success', (s, c, p) => { storyEnd(s, p); p.q += 25; rep(s, 2); return `C’était une arnaque ! Son vrai petit-fils était à Montpellier. ${pname(p)} vous apporte des chocolats.`; }],
          ['Signaler à la police', 'Et bloquer le virement', 'danger', (s, c, p) => { storyEnd(s, p); p.q += 15; rep(s, 3); return 'La police démantèle un réseau d’arnaqueurs. Le Midi Libre parle de votre agence !'; }],
          ['Faire le virement', 'C’est son argent', 'ghost', (s, c, p) => { const a = c.d.amt, fl = Math.min(p.l || 0, a); if (p.l) p.l -= fl; p.b -= a - fl; s.cash -= a; storyNext(s, c, 1, rint(2, 4)); return 'Virement envoyé…'; }],
        ], auto: 2 },
      { ico: '😢', title: 'Victime d’une arnaque', txt: (s, c, p) => `${who(p)} revient en larmes : c’était une arnaque. Les <b>${money(c.d.amt)}</b> ont disparu. Sa fille vous reproche de ne pas l’avoir protégé.`,
        ch: [
          ['Rembourser la moitié', 'Geste commercial', 'success', (s, c, p) => { storyEnd(s, p); const g = Math.round(c.d.amt / 2); p.b += g; s.cash -= g; s.flags.mGifts = (s.flags.mGifts || 0) + g; p.q += 20; rep(s, 2); return `Vous remboursez ${money(g)}. La famille est reconnaissante.`; }],
          ['Rien à faire', 'Il risque de partir', 'ghost', (s, c, p) => { storyEnd(s, p); p.q -= 30; rep(s, -2); return 'La famille raconte l’histoire à tout le quartier…'; }],
        ], auto: 1 },
    ],
  },
};

// ---------- La vie du quartier (un seul épisode) ----------
const QUARTIER = [
  { id: 'croissants', ico: '🥐', title: 'Partenariat gourmand', txt: () => 'La boulangerie d’en face propose d’offrir des croissants à vos clients le samedi, pour <b>300 €</b>.',
    ch: [['Accepter', '+ satisfaction', 'success', s => { pay(s, 300); sat(s, 6); return 'Les clients adorent les samedis !'; }], ['Refuser', '', 'ghost', () => null]], auto: 1 },
  { id: 'journal', ico: '📰', title: 'Interview au Midi Libre', txt: () => 'Un journaliste local veut faire le portrait de votre agence.',
    ch: [['Accepter l’interview', '70 % de bonne presse', 'success', s => { if (chance(0.7)) { rep(s, 4); return 'Superbe article : « La banque qui a du cœur ».'; } rep(s, -2); return 'Le journaliste retient surtout votre blague sur les impôts…'; }], ['Décliner', '', 'ghost', () => null]], auto: 1 },
  { id: 'dab', need: s => s.branches.some(b => b.dab), ico: '🏧', title: 'Distributeur en panne', txt: () => 'Le distributeur a avalé trois cartes et affiche un écran bleu. La file s’allonge…',
    ch: [['Dépannage express (1 500 €)', 'Réparé dans l’heure', 'success', s => { pay(s, 1500); return 'Réparé ! Les clients repartent avec leurs billets.'; }], ['Attendre le technicien', 'Clients mécontents', 'ghost', s => { sat(s, -6); rep(s, -1); return 'Les clients râlent toute la journée.'; }]], auto: 1 },
  { id: 'foot', ico: '⚽', title: 'Le club de foot du quartier', txt: () => 'Les poussins du FC Montpellier-Antigone cherchent un sponsor pour leurs maillots : <b>5 000 €</b>.',
    ch: [['Sponsoriser', '+3 réputation, + de visiteurs 2 mois', 'success', s => { pay(s, 5000); rep(s, 3); s.flags.sponsorUntil = Math.max(s.flags.sponsorUntil || 0, s.day + 60); return 'Votre logo sur 22 petits maillots ! Ils gagnent 12-0.'; }, s => s.cash < 5000], ['Refuser', '', 'ghost', () => null]], auto: 1 },
  { id: 'fuite', ico: '💧', title: 'Dégât des eaux', txt: () => 'Une fuite d’eau inonde l’accueil !',
    ch: [['Plombier en urgence (2 000 €)', 'Sûr', 'success', s => { pay(s, 2000); return 'Réparé en une heure.'; }], ['Bricoler vous-même', 'Une chance sur deux', '', s => { if (chance(0.5)) return 'Un peu de scotch et le tour est joué !'; pay(s, 4500); sat(s, -4); return 'Raté : le plafond s’effondre. 4 500 € de travaux.'; }]], auto: 0 },
  { id: 'influenceur', ico: '🤳', title: 'Un influenceur débarque', txt: () => 'Un influenceur aux 2 millions d’abonnés veut tourner un « challenge » dans votre agence.',
    ch: [['Accepter', '70 % de buzz positif', 'success', s => { if (chance(0.7)) { rep(s, 5); newClients(s, 2); return 'La vidéo cartonne : 2 jeunes ouvrent un compte dès le lendemain !'; } rep(s, -3); return 'Il renverse un café sur le serveur informatique. Bad buzz.'; }], ['Refuser', '', 'ghost', () => null]], auto: 1 },
  { id: 'marche', ico: '🧺', title: 'Les commerçants du marché', txt: () => 'Les commerçants du marché du dimanche cherchent une banque pour déposer leur recette chaque semaine.',
    ch: [['Ouvrir le dimanche matin (800 €)', 'Heures sup’ de l’équipe', 'success', s => { pay(s, 800); const a = rint(3, 8) * 1e4; s.depX = (s.depX || 0) + a; s.cash += a; recomputeAgg(s); return `Les maraîchers déposent ${money(a)} chez vous !`; }], ['Refuser', '', 'ghost', () => null]], auto: 1 },
  { id: 'stagiaire', ico: '🧑‍🎓', title: 'Demande de stage', txt: () => 'Un étudiant en école de commerce, très motivé, demande un stage de 3 mois.',
    ch: [['Le prendre (1 800 €)', 'Votre équipe gagne de l’expérience', 'success', s => { pay(s, 1800); for (const b of s.branches) for (const e of b.staff || []) if (e.lvl < MAX_LVL) e.xp = Math.min(xpNeed(e.lvl), e.xp + 15); return 'Il fait des photocopies… et des tableaux Excel magnifiques.'; }], ['Refuser', '', 'ghost', () => null]], auto: 1 },
  { id: 'chat', ico: '🐈', title: 'Un chat dans l’agence', txt: () => 'Un chat roux s’est installé sur le fauteuil de l’accueil. Les clients l’adorent.',
    ch: [['L’adopter', 'Mascotte officielle', 'success', s => { sat(s, 4); rep(s, 1); return 'Il s’appelle désormais « Taux Zéro ».'; }], ['Appeler la SPA', '', 'ghost', s => { sat(s, -2); return 'Les clients sont tristes.'; }]], auto: 0 },
  { id: 'braderie', ico: '🎪', title: 'Braderie du quartier', txt: () => 'La braderie annuelle a lieu ce week-end. Tenir un stand coûte <b>1 200 €</b>.',
    ch: [['Tenir un stand', 'Trouver de nouveaux clients', 'success', s => { pay(s, 1200); const n = rint(2, 4); newClients(s, n); return `${n} visiteurs du stand ouvrent un compte !`; }], ['Ne pas y aller', '', 'ghost', () => null]], auto: 1 },
];

// ---------- Journées spéciales ----------
function specialDay(s) {
  const dom = s.day % 30 + 1, m = Math.floor(s.day / 30) % 12;
  if ((m === 0 || m === 6) && dom <= 7) return { ico: '🛍️', name: m ? 'Soldes d’été' : 'Soldes d’hiver', desc: 'Vos clients dépensent beaucoup : attention aux découverts !', vis: 1.1, spend: 1.4 };
  if (m === 8 && dom <= 6) return { ico: '🎒', name: 'La rentrée', desc: 'Étudiants et nouveaux arrivants : beaucoup d’ouvertures de comptes.', vis: 1.3, compte: 1.8 };
  if (m === 10 && dom >= 24 && dom <= 28) return { ico: '🖤', name: 'Black Friday', desc: 'Achats en folie : les paiements suspects explosent.', fraud: 3, spend: 1.3 };
  if (m === 11 && dom >= 15 && dom <= 24) return { ico: '🎄', name: 'Marché de Noël', desc: 'Le quartier est bondé : plus de visiteurs.', vis: 1.25, spend: 1.2 };
  if (m === 1 && dom === 14) return { ico: '💘', name: 'Saint-Valentin', desc: 'L’amour est dans l’air… et les projets de mariage aussi.', vis: 1.05 };
  if (s.flags.greve === s.day) return { ico: '🚇', name: 'Grève des transports', desc: 'Peu de clients arrivent jusqu’à l’agence aujourd’hui.', vis: 0.55 };
  return null;
}
const sdMod = (s, k) => (s.today && s.today.sd && s.today.sd[k]) || 1;

// ---------- Ajout des épisodes du jour ----------
function storyCard(s, sid, step, pid, d = {}) {
  const c = { id: ++ui.cardSeq, kind: 'story', sid, step, pid, d: { ...d } };
  const p = pid && findPerson(s, pid), St = storyStep({ sid, step, d });
  if (St.init) St.init(s, c, p);
  c.name = p ? pname(p) : '';
  if (!p) c.task = true;
  if (p) c.branch = p.br;
  return c;
}
function addStoryCards(s, t) {
  // Épisodes programmés
  const due = (s.storyQ || []).filter(e => e.day <= s.day);
  s.storyQ = (s.storyQ || []).filter(e => e.day > s.day);
  for (const e of due) {
    const p = findPerson(s, e.pid); if (!p) continue;
    const St = STORIES[e.sid].steps[e.step];
    if (St.pret) { storyEnd(s, p); const r = personLoanRequest(s, p); if (r) { r.reason = e.sid === 'mariage' ? 'un plus grand appartement pour la famille' : 'son premier appartement'; t.cards.push({ id: ++ui.cardSeq, kind: 'pret', branch: p.br, pid: p.i, name: pname(p), req: r, back: 1 }); } continue; }
    t.cards.push(storyCard(s, e.sid, e.step, e.pid, e.d));
  }
  // Une nouvelle histoire commence
  const active = s.people.filter(p => p.saga).length;
  if (s.people.length >= 15 && active < 4 && chance(0.15 * (sdMod(s, 'vis') > 1 ? 1.2 : 1))) {
    const sid = s.today.sd && s.today.sd.name === 'Saint-Valentin' ? 'mariage' : pick(Object.keys(STORIES));
    const cands = s.people.filter(p => !p.saga && pw(p) === 1 && STORIES[sid].pick(p));
    if (cands.length) { const p = pick(cands); p.saga = sid; t.cards.push(storyCard(s, sid, 0, p.i)); }
  }
  // La vie du quartier
  if (s.clients >= 10 && chance(0.1)) {
    s.flags.qSeen = s.flags.qSeen || [];
    const pool = QUARTIER.filter(q => (!q.need || q.need(s)) && !s.flags.qSeen.includes(q.id));
    if (!pool.length) s.flags.qSeen = [];
    const q = pick(pool.length ? pool : QUARTIER); s.flags.qSeen.push(q.id);
    t.cards.push(storyCard(s, 'quartier', 0, null, { q: q.id }));
  }
  // Une décision de direction (presque chaque jour au début, pour que le bureau ne soit jamais vide)
  if (chance(s.chapter === 0 ? 0.55 : 0.35)) addDirectionCard(s, t);
  // Alerte de liquidités
  if (s.deposits > 1e5 && s.cash < s.deposits * 0.1 && !(s.flags.liqAlert > s.day - 15)) {
    s.flags.liqAlert = s.day;
    t.cards.unshift(storyCard(s, 'liquidite', 0, null, {}));
  }
}
const LIQ = { ico: '🚨', title: 'Caisses presque vides', txt: s => `Il ne reste que <b>${money(s.cash)}</b> en caisse pour <b>${money(s.deposits)}</b> déposés par vos clients (${pct(s.cash / s.deposits * 100, 0)}). Si plusieurs clients retirent leur argent en même temps, c’est la panique bancaire.`,
  ch: [
    ['Emprunter à la banque centrale', s => `${money(Math.round(s.deposits * 0.1 / 1e4) * 1e4)} au taux directeur`, 'success', s => { const a = Math.round(s.deposits * 0.1 / 1e4) * 1e4; s.cbDebt += a; s.cash += a; return `${money(a)} empruntés : vos caisses respirent.`; }],
    ['Remonter le taux du livret (+0,5 pt)', 'Attire l’épargne, coûte plus cher', '', s => { s.depositRate = Math.round((s.depositRate + 0.5) * 100) / 100; return `Taux du livret porté à ${pct(s.depositRate, 2)}.`; }],
    ['Ne rien faire', 'Risqué', 'ghost', () => null],
  ], auto: 2 };

// ---------- Affichage et choix ----------
function storyStep(c) { return c.sid === 'quartier' ? QUARTIER.find(q => q.id === c.d.q) : c.sid === 'direction' ? DIRECTION.find(q => q.id === c.d.q) : c.sid === 'liquidite' ? LIQ : STORIES[c.sid].steps[c.step]; }
const val = (v, s, c, p) => typeof v === 'function' ? v(s, c, p) : v;
function storyMeta(s, c) { const St = storyStep(c); return [val(St.ico, s, c), val(St.title, s, c)]; }
function storyBody(s, c) {
  const St = storyStep(c), p = c.pid && findPerson(s, c.pid);
  if (c.pid && !p) return ['<p class="muted">Ce client est parti.</p>', btn(c.id, 'end', 'OK')];
  const txt = St.txt(s, c, p);
  return [`<p>${txt}</p>${p ? profileLine(p) : ''}`, St.ch.map(([l, sub, cls, , dis], i) => btn(c.id, String(i), val(l, s, c, p), cls, val(sub, s, c, p), dis && dis(s))).join('')];
}
function resolveStory(s, c, choice, manual) {
  const St = storyStep(c), p = c.pid && findPerson(s, c.pid);
  let msg = null;
  if (!(c.pid && !p) && choice !== 'end') {
    const i = clamp(+choice || 0, 0, St.ch.length - 1), ch = St.ch[i];
    if (ch[4] && ch[4](s)) return null;
    msg = ch[3](s, c, p);
  }
  if (p) p.q = clamp(p.q, 0, 100);
  c.done = true; s.today.done++;
  recomputeAgg(s);
  if (manual) checkObjective(s);
  return msg;
}
const storyAuto = c => String(storyStep(c).auto || 0);

// ---------- Les décisions de direction (vous êtes le PDG) ----------
const DIRECTION = [
  { id: 'frais', ico: '🏷️', title: 'Le prix du compte', txt: s => `Vos guichetiers vous demandent quels frais de tenue de compte appliquer. Aujourd’hui : <b>${nf1.format(s.prod.cc.fee)} €/mois</b> (la concurrence : 5 €).`,
    ch: [['2 € : attirer du monde', 'Plus de clients, moins de revenus', '', s => { s.prod.cc.fee = 2; return 'Frais à 2 € : le bouche-à-oreille va tourner.'; }], ['5 € : prix du marché', '', 'success', s => { s.prod.cc.fee = 5; return 'Frais alignés sur le marché.'; }], ['8 € : rentabilité', 'Plus de revenus, plus de départs', 'danger', s => { s.prod.cc.fee = 8; return 'Frais à 8 € : surveillez les départs.'; }]], auto: 1 },
  { id: 'pub', ico: '🚋', title: 'Campagne dans le tram', txt: () => 'Une régie propose une campagne d’affichage sur les trams de la ville : <b>8 000 €</b> pour un mois.',
    ch: [['Lancer la campagne', '+15 % de visiteurs pendant 30 jours', 'success', s => { pay(s, 8000); s.flags.sponsorUntil = Math.max(s.flags.sponsorUntil || 0, s.day + 30); rep(s, 1); return 'Votre logo roule dans toute la ville !'; }, s => s.cash < 8000], ['Pas maintenant', '', 'ghost', () => null]], auto: 1 },
  { id: 'samedi', once: true, ico: '📅', title: 'Ouvrir le samedi ?', txt: () => 'Vos clients réclament une ouverture le <b>samedi matin</b>. Cela coûte 1 500 €/mois d’heures supplémentaires.',
    ch: [['Ouvrir le samedi', '+12 % de visiteurs, 1 500 €/mois', 'success', s => { s.flags.samedi = true; sat(s, 3); return 'Les samedis matins, la file d’attente déborde !'; }], ['Rester fermé', 'L’équipe est soulagée', 'ghost', s => { sat(s, -2); return null; }]], auto: 1 },
  { id: 'inspection', ico: '🔍', title: 'Inspection de l’ACPR', txt: () => 'Le gendarme des banques annonce une <b>inspection</b> la semaine prochaine.',
    ch: [['Préparer un dossier impeccable', '6 000 € de consultants', 'success', s => { pay(s, 6000); rep(s, 1); return 'Inspection parfaite : « une banque exemplaire ».'; }, s => s.cash < 6000], ['Improviser', '40 % de risque d’amende', 'ghost', s => { if (chance(0.4)) { pay(s, 15000); rep(s, -3); return 'Des papiers manquants : 15 000 € d’amende.'; } return 'Ouf, l’inspecteur n’a rien vu.'; }]], auto: 1 },
  { id: 'concurrent', ico: '⚔️', title: 'Un concurrent s’installe', txt: (s, c) => `<b>${c.d.r}</b> ouvre une agence juste en face et propose des frais à 1 €/mois.`,
    init: (s, c) => { c.d.r = pick(RIVALS).name; },
    ch: [['Baisser vos frais à 3 €', 'Garder vos clients', '', s => { s.prod.cc.fee = Math.min(s.prod.cc.fee, 3); return 'Frais baissés : vos clients restent.'; }], ['Contre-campagne (10 000 €)', 'Visiteurs en hausse', 'success', s => { pay(s, 10000); s.flags.sponsorUntil = Math.max(s.flags.sponsorUntil || 0, s.day + 45); return '« La vraie banque du quartier, c’est nous ! »'; }, s => s.cash < 10000], ['Miser sur la qualité', 'Ils perdront des clients', 'ghost', s => { for (const b of s.branches) b.rivalUntil = s.day + 60; return 'Le concurrent vous prendra quelques clients pendant deux mois.'; }]], auto: 2 },
  { id: 'prime', need: s => staffTotal(s, 'gs') + staffTotal(s, 'bs') >= 2, ico: '💶', title: 'Votre équipe demande une prime', txt: () => 'Après une bonne période, vos employés espèrent une petite prime.',
    ch: [['Prime de 300 € chacun', 'Équipe motivée', 'success', s => { const n = staffTotal(s, 'gs') + staffTotal(s, 'bs'); pay(s, n * 300); sat(s, 5); for (const b of s.branches) for (const e of b.staff || []) if (e.lvl < MAX_LVL) e.xp = Math.min(xpNeed(e.lvl), e.xp + 10); return `${n} employés ravis.`; }], ['Un restaurant d’équipe (800 €)', '', '', s => { pay(s, 800); sat(s, 3); return 'Soirée réussie !'; }], ['Refuser', 'Ambiance tendue', 'ghost', s => { sat(s, -6); return 'Les sourires se font rares au guichet…'; }]], auto: 2 },
  { id: 'vert', once: true, ico: '🌱', title: 'Le label « Banque verte »', txt: () => 'Un organisme propose de vous labelliser « Banque verte » après un audit à <b>12 000 €</b>.',
    ch: [['Obtenir le label', '+4 réputation, épargne attirée 6 mois', 'success', s => { pay(s, 12000); rep(s, 4); s.flags.greenUntil = s.day + 180; return 'Label obtenu : les épargnants adorent.'; }, s => s.cash < 12000], ['Non merci', '', 'ghost', () => null]], auto: 1 },
  { id: 'vip', need: s => s.chapter >= 1, ico: '🤵', title: 'Un très gros client', txt: (s, c) => `Un chef d’entreprise veut déposer <b>${money(c.d.amt)}</b> chez vous… si vous lui offrez <b>3 %</b> la première année.`,
    init: (s, c) => { c.d.amt = Math.round(Math.max(3e5, equity(s) * rnd(0.3, 0.8)) / 1e5) * 1e5; },
    ch: [['Accepter à 3 %', 'Vous lui versez la différence', 'success', (s, c) => { const extra = Math.round(c.d.amt * Math.max(0, 3 - s.depositRate) / 100); vipDeposit(s, c.d.amt); pay(s, extra); return `${money(c.d.amt)} arrivent ! Prime de bienvenue versée : ${money(extra)}.`; }], ['Négocier à 2 %', '55 % de chances', '', (s, c) => { if (!chance(0.55)) return 'Il part chez un concurrent.'; const extra = Math.round(c.d.amt * Math.max(0, 2 - s.depositRate) / 100); vipDeposit(s, c.d.amt); pay(s, extra); return `Marché conclu à 2 % : ${money(c.d.amt)} déposés.`; }], ['Refuser', '', 'ghost', () => null]], auto: 2 },
  { id: 'presse', need: s => (s.prod.cc.agio || 14) >= 13, ico: '📺', title: 'Enquête sur les frais bancaires', txt: s => `Un journaliste de France 3 enquête sur les agios. Les vôtres sont à <b>${pct(s.prod.cc.agio || 14)}</b>.`,
    ch: [['Baisser les agios à 10 %', '+3 réputation', 'success', s => { s.prod.cc.agio = 10; rep(s, 3); return '« Une banque qui écoute ses clients. »'; }], ['Défendre vos tarifs', 'Mauvaise presse', 'ghost', s => { rep(s, -3); return 'Le reportage n’est pas tendre avec vous…'; }]], auto: 1 },
  { id: 'mecenat', ico: '🎭', title: 'Mécénat culturel', txt: () => 'Le festival Montpellier Danse cherche un mécène : <b>15 000 €</b>.',
    ch: [['Devenir mécène', '+5 réputation', 'success', s => { pay(s, 15000); rep(s, 5); return 'Votre nom en grand sur l’affiche du festival !'; }, s => s.cash < 15000], ['Décliner', '', 'ghost', () => null]], auto: 1 },
  { id: 'informatique', ico: '💻', title: 'Informatique vieillissante', txt: () => 'Votre logiciel bancaire date de 2009 et plante deux fois par semaine.',
    ch: [['Moderniser (20 000 €)', 'Équipe plus efficace', 'success', s => { pay(s, 20000); sat(s, 5); rep(s, 1); for (const b of s.branches) for (const e of b.staff || []) if (e.lvl < MAX_LVL) e.xp = Math.min(xpNeed(e.lvl), e.xp + 15); return 'Nouveau système installé : tout va plus vite.'; }, s => s.cash < 20000], ['Encore un an', 'Clients agacés', 'ghost', s => { sat(s, -3); return 'Écran bleu au guichet… encore.'; }]], auto: 1 },
  { id: 'jeunes', once: true, ico: '🧑‍🎓', title: 'Une offre pour les jeunes', txt: () => 'Votre équipe propose une offre « compte jeune » : carte gratuite pour les 18-25 ans.',
    ch: [['Lancer l’offre (5 000 €)', '+ de visiteurs, + réputation', 'success', s => { pay(s, 5000); s.flags.jeunes = true; rep(s, 2); return 'Les étudiants affluent !'; }, s => s.cash < 5000], ['Non', '', 'ghost', () => null]], auto: 1 },
];
function vipDeposit(s, amt) {
  const b = s.branches[0], p = newPersonFor(s, b);
  p.j = 12; p.s = rint(12, 25) * 1000; p.sp = Math.round(p.s * 0.4); p.b = Math.round(amt * 0.1); p.save0 = Math.round(amt * 0.9); p.q = 85;
  const sv = p.save0;
  openPersonAccount(s, p, { livret: s.prod.liv.on, card: true });
  if (!s.prod.liv.on) { p.b += sv; s.cash += sv; }
  p.c = 2; recomputeAgg(s);
}
function addDirectionCard(s, t) {
  const seen = s.flags.dSeen = s.flags.dSeen || [], once = s.flags.dOnce = s.flags.dOnce || [];
  let pool = DIRECTION.filter(d => (!d.need || d.need(s)) && !once.includes(d.id) && !seen.includes(d.id));
  if (!pool.length) { s.flags.dSeen = []; pool = DIRECTION.filter(d => (!d.need || d.need(s)) && !once.includes(d.id)); }
  if (!pool.length) return;
  const d = pick(pool); s.flags.dSeen.push(d.id); if (d.once) once.push(d.id);
  t.cards.push(storyCard(s, 'direction', 0, null, { q: d.id }));
}
