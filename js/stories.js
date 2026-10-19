'use strict';
/* =====================================================================
   BANQUE TYCOON — histoires de clients, vie du quartier, journées
   spéciales du calendrier et alertes de liquidités.
   Une histoire est une suite d'épisodes : chaque choix peut programmer
   l'épisode suivant quelques jours ou quelques mois plus tard.
   ===================================================================== */

const sat = (s, v) => { for (const b of s.branches) b.sat = clamp(b.sat + v, 0, 100); };
const rep = (s, v) => { s.reputation = clamp(s.reputation + v, 0, 100); };
const pay = (s, v) => { s.cash -= v; outlay(s, 'dec', -v); };
const he = p => personFace(p).female ? _t('elle') : _t('il');
const He = p => personFace(p).female ? _t('Elle') : _t('Il');

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
      { ico: '🥖', title: _t('Un rêve de boulangerie'), txt: (s, c, p) => _l`${who(p)} rêve d’ouvrir sa propre boulangerie. ${He(p)} vous demande conseil : ${he(p)} n’a que <b>${money((p.l || 0) + Math.max(0, p.b))}</b> de côté.`,
        ch: [
          [_t('L’aider à épargner d’abord'), _t('Il reviendra plus solide'), 'success', (s, c, p) => { p.sv = Math.min(0.9, p.sv + 0.25); p.q += 6; storyNext(s, c, 1, rint(25, 40)); return _l`${pname(p)} va mettre de côté chaque mois. Rendez-vous dans quelques semaines !`; }],
          [_t('Financer tout de suite (60 k€)'), _t('Sans apport : risqué'), '', (s, c, p) => { const L = storyLoan(s, p, 'pro', 60e3, 5.5, 84, _l`Boulangerie ${p.i % 2 ? _t('du Marché') : _t('des Arceaux')} (${pname(p)})`); if (!L) return _t('Pas assez de liquidités pour ce prêt.'); storyNext(s, c, 2, rint(45, 70), { loan: L.id, ok: chance(0.45) }); return _l`Prêt accordé : ${pname(p)} signe le bail du local !`; }],
          [_t('Le décourager'), _t('Il sera déçu'), 'ghost', (s, c, p) => { p.q -= 10; storyEnd(s, p); return _l`${pname(p)} range ses rêves dans un tiroir…`; }],
        ], auto: 2 },
      { ico: '🥖', title: _t('La boulangerie, le retour'), txt: (s, c, p) => _l`${who(p)} revient avec un sourire jusqu’aux oreilles : ${he(p)} a économisé et trouvé un local. ${He(p)} demande un prêt de <b>${money(45e3)}</b> sur 7 ans.`,
        ch: [
          [_t('Accorder le prêt à 4,5 %'), _t('Un dossier solide'), 'success', (s, c, p) => { const L = storyLoan(s, p, 'pro', 45e3, 4.5, 84, _l`Boulangerie de ${pname(p)}`); if (!L) return _t('Pas assez de liquidités pour ce prêt.'); storyNext(s, c, 2, rint(50, 80), { loan: L.id, ok: chance(0.82) }); s.today.tally.prets++; return _l`${pname(p)} vous serre la main : « Vous ne le regretterez pas ! »`; }],
          [_t('Refuser'), _t('Il ira voir un concurrent'), 'ghost', (s, c, p) => { p.q -= 25; storyEnd(s, p); if (p.b >= 0 && !personLoans(s, p).length && chance(0.5)) { closePerson(s, p); return _l`Vexé, ${pname(p)} ferme son compte et part chez un concurrent.`; } return _l`${pname(p)} est très déçu.`; }],
        ], auto: 0 },
      { txt: (s, c, p) => c.d.ok ? _l`🥐 La boulangerie de ${who(p)} cartonne ! La file d’attente déborde sur le trottoir et ${he(p)} parle de votre banque à tous ses clients.` : _l`😢 La boulangerie de ${who(p)} n’a pas tenu : trop de concurrence, un four en panne… ${He(p)} ne peut plus rembourser.`,
        ico: (s, c) => c.d.ok ? '🥐' : '😢', title: (s, c) => c.d.ok ? _t('Un succès croustillant') : _t('Rideau baissé'),
        ch: [
          [(s, c) => c.d.ok ? _t('Commander les croissants de l’équipe chez lui') : _t('Saisir le fonds de commerce'), (s, c) => c.d.ok ? _t('+ satisfaction, nouveaux clients') : _t('Vous récupérez 35 %'), 'success', (s, c, p) => {
            storyEnd(s, p);
            if (c.d.ok) { sat(s, 6); rep(s, 2); newClients(s, 3, p); return _l`Croissants pour tout le monde ! 3 commerçants du quartier ouvrent un compte chez vous.`; }
            const lost = storyLoss(s, loanOf(s, c), 0.35); p.k = (p.k || 0) + 1; return _l`Fonds de commerce vendu. Perte : ${money(lost)}.`; }],
          [(s, c) => c.d.ok ? _t('Le féliciter') : _t('Lui laisser une chance (étaler la dette)'), (s, c) => c.d.ok ? '' : _t('Vous récupérez 55 %, il reste client'), '', (s, c, p) => {
            storyEnd(s, p);
            if (c.d.ok) { p.q += 10; rep(s, 1); return _l`${pname(p)} est touché par vos mots.`; }
            const lost = storyLoss(s, loanOf(s, c), 0.55); p.q += 25; rep(s, 2); return _l`${pname(p)} retrouve un emploi et rembourse ce qu’il peut. Perte : ${money(lost)}. Le quartier salue votre humanité.`; }],
        ], auto: 0 },
    ],
  },
  loto: {
    pick: p => p.j !== 0 && !p.u,
    steps: [
      { ico: '🎰', title: _t('Le gros lot !'), txt: (s, c, p) => _l`${who(p)} entre en tremblant : ${he(p)} vient de gagner <b>${money(c.d.amt)}</b> au Loto ! ${He(p)} ne sait pas quoi en faire.`,
        init: (s, c) => { c.d.amt = rint(2, 8) * 1e5; },
        ch: [
          [_t('Tout placer sur un livret'), (s) => s.prod.liv.on ? _t('L’argent reste chez vous') : _t('Livret non lancé'), 'success', (s, c, p) => { if (!s.prod.liv.on) return _t('Vous n’avez pas encore de livret à proposer !'); p.l = (p.l || 0) + c.d.amt; s.cash += c.d.amt; p.q += 10; storyNext(s, c, 1, rint(30, 60)); return _l`${money(c.d.amt)} de plus sur vos livrets !`; }, s => !s.prod.liv.on],
          [_t('Le garder sur son compte'), _t('Sans conseil'), '', (s, c, p) => { p.b += c.d.amt; s.cash += c.d.amt; storyNext(s, c, 1, rint(20, 45)); return _l`${pname(p)} dépose son chèque géant.`; }],
          [_t('Lui conseiller de tout dépenser'), _t('Mauvaise idée…'), 'ghost', (s, c, p) => { p.b += c.d.amt * 0.2; s.cash += c.d.amt * 0.2; p.q -= 5; storyEnd(s, p); return _l`${pname(p)} part en Ferrari. Il ne reste presque rien sur son compte.`; }],
        ], auto: 1 },
      { ico: '🛥️', title: _t('Le gagnant du Loto revient'), txt: (s, c, p) => _l`${who(p)} veut acheter <b>un yacht à ${money(c.d.amt * 0.7)}</b> et prêter de l’argent à toute sa famille.`,
        ch: [
          [_t('Le raisonner'), _t('70 % de chances'), 'success', (s, c, p) => { storyEnd(s, p); if (chance(0.7)) { p.q += 15; rep(s, 1); return _l`${pname(p)} achète un petit voilier à la place et garde le reste chez vous. Merci du conseil !`; } const out = Math.min(c.d.amt * 0.6, (p.l || 0) + Math.max(0, p.b)); const fl = Math.min(p.l || 0, out); if (p.l) p.l -= fl; p.b -= out - fl; s.cash -= out; return _l`${pname(p)} n’écoute rien et retire ${money(out)}.`; }],
          [_t('Le laisser faire'), _t('C’est son argent'), '', (s, c, p) => { storyEnd(s, p); const out = Math.min(c.d.amt * 0.7, (p.l || 0) + Math.max(0, p.b)); const fl = Math.min(p.l || 0, out); if (p.l) p.l -= fl; p.b -= out - fl; s.cash -= out; return _l`${money(out)} quittent votre banque… direction le port de Sète.`; }],
        ], auto: 1 },
    ],
  },
  etudiant: {
    pick: p => p.j === 0,
    steps: [
      { ico: '🎓', title: _t('Fin du mois difficile'), txt: (s, c, p) => _l`${who(p)}, étudiant, n’arrive plus à payer son loyer et ses livres. Il vous demande un coup de pouce pour finir sa dernière année.`,
        ch: [
          [_t('Prêt étudiant de 10 k€ à 1 %'), _t('Peu rentable, mais…'), 'success', (s, c, p) => { const L = storyLoan(s, p, 'conso', 10e3, 1, 72, _l`Prêt étudiant (${pname(p)})`); if (!L) return _t('Pas assez de liquidités.'); p.q += 20; storyNext(s, c, 1, rint(60, 100), { loan: L.id }); return _l`${pname(p)} peut finir ses études sereinement.`; }],
          [_t('Lui faire un budget'), _t('Gratuit'), '', (s, c, p) => { p.sp = Math.round(p.sp * 0.85); p.q += 4; storyNext(s, c, 1, rint(80, 120), { tough: 1 }); return _l`Vous passez une heure avec ${pname(p)} sur un tableur.`; }],
          [_t('Refuser'), '', 'ghost', (s, c, p) => { p.q -= 10; storyEnd(s, p); return _l`${pname(p)} repart tête basse.`; }],
        ], auto: 1 },
      { ico: '💼', title: _t('Diplômé !'), txt: (s, c, p) => _l`${who(p)} a eu son diplôme ${c.d.tough ? _t('de justesse ') : _t('avec mention ')}et vient d’être embauché comme <b>ingénieur</b> ! ${c.d.loan ? _t('« Sans votre prêt, je n’y serais pas arrivé. »') : ''}`,
        init: (s, c, p) => { p.j = 4; p.s = rint(30, 40) * 100; p.sp = Math.round(p.s * 0.5); p.r = Math.round(p.s * 0.25 / 10) * 10; p.u = 0; },
        ch: [
          [_t('Lui proposer la carte Gold'), _t('85 % de chances'), 'success', (s, c, p) => { if (chance(0.85)) { p.c = 2; s.today.tally.ventes++; } p.q += 8; storyNext(s, c, 2, rint(90, 160)); return _l`${pname(p)} passe à la Gold ✨`; }],
          [_t('Le féliciter'), '', '', (s, c, p) => { p.q += 12; storyNext(s, c, 2, rint(90, 160)); return _l`${pname(p)} est aux anges.`; }],
        ], auto: 1 },
      { pret: true }, // il revient acheter son premier appartement : vrai rendez-vous crédit
    ],
  },
  mariage: {
    pick: p => !p.u && p.j !== 0 && p.j !== 6,
    steps: [
      { ico: '💍', title: _t('Un mariage !'), txt: (s, c, p) => _l`${who(p)} se marie le mois prochain ! ${He(p)} veut ouvrir un <b>compte joint</b> et a besoin de ${money(12e3)} pour la fête.`,
        ch: [
          [_t('Compte joint + prêt mariage'), _t('+1 client, crédit conso'), 'success', (s, c, p) => { newClients(s, 1, p); const L = storyLoan(s, p, 'conso', 12e3, 4.9, 48, _l`Mariage de ${pname(p)}`); p.q += 15; storyNext(s, c, 1, rint(60, 100)); s.today.tally.comptes++; return L ? _l`Félicitations ! Compte joint ouvert et prêt accordé. Vous êtes invité au vin d’honneur 🥂` : _t('Compte joint ouvert (pas assez de liquidités pour le prêt).'); }],
          [_t('Juste le compte joint'), _t('+1 client'), '', (s, c, p) => { newClients(s, 1, p); p.q += 6; storyNext(s, c, 1, rint(60, 100)); s.today.tally.comptes++; return _t('Compte joint ouvert. Vive les mariés !'); }],
        ], auto: 1 },
      { ico: '👶', title: _t('Un bébé arrive'), txt: (s, c, p) => _l`${who(p)} attend un bébé ! L’appartement devient trop petit. ${He(p)} veut ouvrir un <b>livret pour l’enfant</b>.`,
        ch: [
          [_t('Ouvrir un livret bébé'), (s) => s.prod.liv.on ? '' : _t('Livret non lancé'), 'success', (s, c, p) => { if (!s.prod.liv.on) return _t('Lancez d’abord le livret dans Produits.'); const m = Math.min(Math.max(0, p.b) * 0.3, 3000); p.b -= m; p.l = (p.l || 0) + m; s.today.tally.ventes++; p.q += 8; storyNext(s, c, 2, rint(20, 40)); return _l`Premier dépôt de ${money(m)} pour le futur bébé 🍼`; }, s => !s.prod.liv.on],
          [_t('Le féliciter'), '', '', (s, c, p) => { p.q += 5; storyNext(s, c, 2, rint(20, 40)); return _t('Toute l’agence signe une carte.'); }],
        ], auto: 1 },
      { pret: true },
    ],
  },
  arnaque: {
    pick: p => p.j === 6 && p.b + (p.l || 0) > 4000,
    steps: [
      { ico: '📞', title: _t('Un appel étrange'), txt: (s, c, p) => _l`${who(p)}, 81 ans, veut virer <b>${money(c.d.amt)}</b> en urgence à son « petit-fils », coincé à l’étranger. Il a appelé d’un numéro inconnu…`,
        init: (s, c, p) => { c.d.amt = Math.round(Math.min(15e3, (p.b + (p.l || 0)) * 0.6) / 100) * 100; },
        ch: [
          [_t('Lui conseiller d’appeler sa famille'), _t('Prudence'), 'success', (s, c, p) => { storyEnd(s, p); p.q += 25; rep(s, 2); return _l`C’était une arnaque ! Son vrai petit-fils était à Montpellier. ${pname(p)} vous apporte des chocolats.`; }],
          [_t('Signaler à la police'), _t('Et bloquer le virement'), 'danger', (s, c, p) => { storyEnd(s, p); p.q += 15; rep(s, 3); return _t('La police démantèle un réseau d’arnaqueurs. Le Midi Libre parle de votre agence !'); }],
          [_t('Faire le virement'), _t('C’est son argent'), 'ghost', (s, c, p) => { const a = c.d.amt, fl = Math.min(p.l || 0, a); if (p.l) p.l -= fl; p.b -= a - fl; s.cash -= a; storyNext(s, c, 1, rint(2, 4)); return _t('Virement envoyé…'); }],
        ], auto: 2 },
      { ico: '😢', title: _t('Victime d’une arnaque'), txt: (s, c, p) => _l`${who(p)} revient en larmes : c’était une arnaque. Les <b>${money(c.d.amt)}</b> ont disparu. Sa fille vous reproche de ne pas l’avoir protégé.`,
        ch: [
          [_t('Rembourser la moitié'), _t('Geste commercial'), 'success', (s, c, p) => { storyEnd(s, p); const g = Math.round(c.d.amt / 2); p.b += g; s.cash -= g; s.flags.mGifts = (s.flags.mGifts || 0) + g; p.q += 20; rep(s, 2); return _l`Vous remboursez ${money(g)}. La famille est reconnaissante.`; }],
          [_t('Rien à faire'), _t('Il risque de partir'), 'ghost', (s, c, p) => { storyEnd(s, p); p.q -= 30; rep(s, -2); return _t('La famille raconte l’histoire à tout le quartier…'); }],
        ], auto: 1 },
    ],
  },
};

// ---------- La vie du quartier (un seul épisode) ----------
const QUARTIER = [
  { id: 'croissants', ico: '🥐', title: _t('Partenariat gourmand'), txt: () => _t('La boulangerie d’en face propose d’offrir des croissants à vos clients le samedi, pour <b>300 €</b>.'),
    ch: [[_t('Accepter'), _t('+ satisfaction'), 'success', s => { pay(s, 300); sat(s, 6); return _t('Les clients adorent les samedis !'); }], [_t('Refuser'), '', 'ghost', () => null]], auto: 1 },
  { id: 'journal', ico: '📰', title: _t('Interview au Midi Libre'), txt: () => _t('Un journaliste local veut faire le portrait de votre agence.'),
    ch: [[_t('Accepter l’interview'), _t('70 % de bonne presse'), 'success', s => { if (chance(0.7)) { rep(s, 4); return _t('Superbe article : « La banque qui a du cœur ».'); } rep(s, -2); return _t('Le journaliste retient surtout votre blague sur les impôts…'); }], [_t('Décliner'), '', 'ghost', () => null]], auto: 1 },
  { id: 'dab', need: s => s.branches.some(b => b.dab), ico: '🏧', title: _t('Distributeur en panne'), txt: () => _t('Le distributeur a avalé trois cartes et affiche un écran bleu. La file s’allonge…'),
    ch: [[_t('Dépannage express (1 500 €)'), _t('Réparé dans l’heure'), 'success', s => { pay(s, 1500); return _t('Réparé ! Les clients repartent avec leurs billets.'); }], [_t('Attendre le technicien'), _t('Clients mécontents'), 'ghost', s => { sat(s, -6); rep(s, -1); return _t('Les clients râlent toute la journée.'); }]], auto: 1 },
  { id: 'foot', ico: '⚽', title: _t('Le club de foot du quartier'), txt: () => _t('Les poussins du FC Montpellier-Antigone cherchent un sponsor pour leurs maillots : <b>5 000 €</b>.'),
    ch: [[_t('Sponsoriser'), _t('+3 réputation, + de visiteurs 2 mois'), 'success', s => { pay(s, 5000); rep(s, 3); s.flags.sponsorUntil = Math.max(s.flags.sponsorUntil || 0, s.day + 60); return _t('Votre logo sur 22 petits maillots ! Ils gagnent 12-0.'); }, s => s.cash < 5000], [_t('Refuser'), '', 'ghost', () => null]], auto: 1 },
  { id: 'fuite', ico: '💧', title: _t('Dégât des eaux'), txt: () => _t('Une fuite d’eau inonde l’accueil !'),
    ch: [[_t('Plombier en urgence (2 000 €)'), _t('Sûr'), 'success', s => { pay(s, 2000); return _t('Réparé en une heure.'); }], [_t('Bricoler vous-même'), _t('Une chance sur deux'), '', s => { if (chance(0.5)) return _t('Un peu de scotch et le tour est joué !'); pay(s, 4500); sat(s, -4); return _t('Raté : le plafond s’effondre. 4 500 € de travaux.'); }]], auto: 0 },
  { id: 'influenceur', ico: '🤳', title: _t('Un influenceur débarque'), txt: () => _t('Un influenceur aux 2 millions d’abonnés veut tourner un « challenge » dans votre agence.'),
    ch: [[_t('Accepter'), _t('70 % de buzz positif'), 'success', s => { if (chance(0.7)) { rep(s, 5); newClients(s, 2); return _t('La vidéo cartonne : 2 jeunes ouvrent un compte dès le lendemain !'); } rep(s, -3); return _t('Il renverse un café sur le serveur informatique. Bad buzz.'); }], [_t('Refuser'), '', 'ghost', () => null]], auto: 1 },
  { id: 'marche', ico: '🧺', title: _t('Les commerçants du marché'), txt: () => _t('Les commerçants du marché du dimanche cherchent une banque pour déposer leur recette chaque semaine.'),
    ch: [[_t('Ouvrir le dimanche matin (800 €)'), _t('Heures sup’ de l’équipe'), 'success', s => { pay(s, 800); const a = rint(3, 8) * 1e4; s.depX = (s.depX || 0) + a; s.cash += a; recomputeAgg(s); return _l`Les maraîchers déposent ${money(a)} chez vous !`; }], [_t('Refuser'), '', 'ghost', () => null]], auto: 1 },
  { id: 'stagiaire', ico: '🧑‍🎓', title: _t('Demande de stage'), txt: () => _t('Un étudiant en école de commerce, très motivé, demande un stage de 3 mois.'),
    ch: [[_t('Le prendre (1 800 €)'), _t('Votre équipe gagne de l’expérience'), 'success', s => { pay(s, 1800); for (const b of s.branches) for (const e of b.staff || []) if (e.lvl < MAX_LVL) e.xp = Math.min(xpNeed(e.lvl), e.xp + 15); return _t('Il fait des photocopies… et des tableaux Excel magnifiques.'); }], [_t('Refuser'), '', 'ghost', () => null]], auto: 1 },
  { id: 'chat', ico: '🐈', title: _t('Un chat dans l’agence'), txt: () => _t('Un chat roux s’est installé sur le fauteuil de l’accueil. Les clients l’adorent.'),
    ch: [[_t('L’adopter'), _t('Mascotte officielle'), 'success', s => { sat(s, 4); rep(s, 1); return _t('Il s’appelle désormais « Taux Zéro ».'); }], [_t('Appeler la SPA'), '', 'ghost', s => { sat(s, -2); return _t('Les clients sont tristes.'); }]], auto: 0 },
  { id: 'braderie', ico: '🎪', title: _t('Braderie du quartier'), txt: () => _t('La braderie annuelle a lieu ce week-end. Tenir un stand coûte <b>1 200 €</b>.'),
    ch: [[_t('Tenir un stand'), _t('Trouver de nouveaux clients'), 'success', s => { pay(s, 1200); const n = rint(2, 4); newClients(s, n); return _l`${n} visiteurs du stand ouvrent un compte !`; }], [_t('Ne pas y aller'), '', 'ghost', () => null]], auto: 1 },
];

// ---------- Journées spéciales ----------
function specialDay(s) {
  const dom = s.day % 30 + 1, m = Math.floor(s.day / 30) % 12;
  if ((m === 0 || m === 6) && dom <= 7) return { ico: '🛍️', name: m ? _t('Soldes d’été') : _t('Soldes d’hiver'), desc: _t('Vos clients dépensent beaucoup : attention aux découverts !'), vis: 1.1, spend: 1.4 };
  if (m === 8 && dom <= 6) return { ico: '🎒', name: _t('La rentrée'), desc: _t('Étudiants et nouveaux arrivants : beaucoup d’ouvertures de comptes.'), vis: 1.3, compte: 1.8 };
  if (m === 10 && dom >= 24 && dom <= 28) return { ico: '🖤', name: _t('Black Friday'), desc: _t('Achats en folie : les paiements suspects explosent.'), fraud: 3, spend: 1.3 };
  if (m === 11 && dom >= 15 && dom <= 24) return { ico: '🎄', name: _t('Marché de Noël'), desc: _t('Le quartier est bondé : plus de visiteurs.'), vis: 1.25, spend: 1.2 };
  if (m === 1 && dom === 14) return { ico: '💘', name: _t('Saint-Valentin'), desc: _t('L’amour est dans l’air… et les projets de mariage aussi.'), vis: 1.05 };
  if (s.flags.greve === s.day) return { ico: '🚇', name: _t('Grève des transports'), desc: _t('Peu de clients arrivent jusqu’à l’agence aujourd’hui.'), vis: 0.55 };
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
    if (St.pret) { storyEnd(s, p); const r = personLoanRequest(s, p); if (r) { r.reason = e.sid === 'mariage' ? _t('un plus grand appartement pour la famille') : _t('son premier appartement'); t.cards.push({ id: ++ui.cardSeq, kind: 'pret', branch: p.br, pid: p.i, name: pname(p), req: r, back: 1 }); } continue; }
    t.cards.push(storyCard(s, e.sid, e.step, e.pid, e.d));
  }
  // Une nouvelle histoire commence
  const active = s.people.filter(p => p.saga).length;
  if (s.people.length >= 15 && active < 4 && chance(0.06 * (sdMod(s, 'vis') > 1 ? 1.2 : 1))) {
    const sid = s.today.sd && s.today.sd.name === _t('Saint-Valentin') ? 'mariage' : pick(Object.keys(STORIES));
    const cands = s.people.filter(p => !p.saga && pw(p) === 1 && STORIES[sid].pick(p));
    if (cands.length) { const p = pick(cands); p.saga = sid; t.cards.push(storyCard(s, sid, 0, p.i)); }
  }
  // La vie du quartier
  if (s.clients >= 10 && chance(0.05)) {
    s.flags.qSeen = s.flags.qSeen || [];
    const pool = QUARTIER.filter(q => (!q.need || q.need(s)) && !s.flags.qSeen.includes(q.id));
    if (!pool.length) s.flags.qSeen = [];
    const q = pick(pool.length ? pool : QUARTIER); s.flags.qSeen.push(q.id);
    t.cards.push(storyCard(s, 'quartier', 0, null, { q: q.id }));
  }
  // Une décision de direction (presque chaque jour au début, pour que le bureau ne soit jamais vide)
  if (chance(s.chapter === 0 ? 0.07 : 0.035)) addDirectionCard(s, t); // une décision tous les mois environ
  // Alerte de liquidités
  if (s.deposits > 1e5 && s.cash < s.deposits * 0.1 && !(s.flags.liqAlert > s.day - 15)) {
    s.flags.liqAlert = s.day;
    t.cards.unshift(storyCard(s, 'liquidite', 0, null, {}));
  }
}
const LIQ = { ico: '🚨', title: _t('Caisses presque vides'), txt: s => _l`Il ne reste que <b>${money(s.cash)}</b> en caisse pour <b>${money(s.deposits)}</b> déposés par vos clients (${pct(s.cash / s.deposits * 100, 0)}). Si plusieurs clients retirent leur argent en même temps, c’est la panique bancaire.`,
  ch: [
    [_t('Emprunter à la banque centrale'), s => _l`${money(Math.round(s.deposits * 0.1 / 1e4) * 1e4)} au taux directeur`, 'success', s => { const a = Math.round(s.deposits * 0.1 / 1e4) * 1e4; s.cbDebt += a; s.cash += a; return _l`${money(a)} empruntés : vos caisses respirent.`; }],
    [_t('Remonter le taux du livret (+0,5 pt)'), _t('Attire l’épargne, coûte plus cher'), '', s => { s.depositRate = Math.round((s.depositRate + 0.5) * 100) / 100; return _l`Taux du livret porté à ${pct(s.depositRate, 2)}.`; }],
    [_t('Ne rien faire'), _t('Risqué'), 'ghost', () => null],
  ], auto: 2 };

// ---------- Affichage et choix ----------
function storyStep(c) { return c.sid === 'quartier' ? QUARTIER.find(q => q.id === c.d.q) : c.sid === 'direction' ? DIRECTION.find(q => q.id === c.d.q) : c.sid === 'liquidite' ? LIQ : STORIES[c.sid].steps[c.step]; }
const val = (v, s, c, p) => typeof v === 'function' ? v(s, c, p) : v;
function storyMeta(s, c) { const St = storyStep(c); return [val(St.ico, s, c), val(St.title, s, c)]; }
function storyBody(s, c) {
  const St = storyStep(c), p = c.pid && findPerson(s, c.pid);
  if (c.pid && !p) return [_t('<p class="muted">Ce client est parti.</p>'), btn(c.id, 'end', 'OK')];
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
  { id: 'frais', ico: '🏷️', title: _t('Le prix du compte'), txt: s => _l`Vos guichetiers vous demandent quels frais de tenue de compte appliquer. Aujourd’hui : <b>${nf1.format(s.prod.cc.fee)} €/mois</b> (la concurrence : 5 €).`,
    ch: [[_t('2 € : attirer du monde'), _t('Plus de clients, moins de revenus'), '', s => { s.prod.cc.fee = 2; return _t('Frais à 2 € : le bouche-à-oreille va tourner.'); }], [_t('5 € : prix du marché'), '', 'success', s => { s.prod.cc.fee = 5; return _t('Frais alignés sur le marché.'); }], [_t('8 € : rentabilité'), _t('Plus de revenus, plus de départs'), 'danger', s => { s.prod.cc.fee = 8; return _t('Frais à 8 € : surveillez les départs.'); }]], auto: 1 },
  { id: 'pub', ico: '🚋', title: _t('Campagne dans le tram'), txt: () => _t('Une régie propose une campagne d’affichage sur les trams de la ville : <b>8 000 €</b> pour un mois.'),
    ch: [[_t('Lancer la campagne'), _t('+15 % de visiteurs pendant 30 jours'), 'success', s => { pay(s, 8000); s.flags.sponsorUntil = Math.max(s.flags.sponsorUntil || 0, s.day + 30); rep(s, 1); return _t('Votre logo roule dans toute la ville !'); }, s => s.cash < 8000], [_t('Pas maintenant'), '', 'ghost', () => null]], auto: 1 },
  { id: 'samedi', once: true, ico: '📅', title: _t('Ouvrir le samedi ?'), txt: () => _t('Vos clients réclament une ouverture le <b>samedi matin</b>. Cela coûte 1 500 €/mois d’heures supplémentaires.'),
    ch: [[_t('Ouvrir le samedi'), _t('+12 % de visiteurs, 1 500 €/mois'), 'success', s => { s.flags.samedi = true; sat(s, 3); return _t('Les samedis matins, la file d’attente déborde !'); }], [_t('Rester fermé'), _t('L’équipe est soulagée'), 'ghost', s => { sat(s, -2); return null; }]], auto: 1 },
  { id: 'inspection', ico: '🔍', title: _t('Inspection de l’ACPR'), txt: () => _t('Le gendarme des banques annonce une <b>inspection</b> la semaine prochaine.'),
    ch: [[_t('Préparer un dossier impeccable'), _t('6 000 € de consultants'), 'success', s => { pay(s, 6000); rep(s, 1); return _t('Inspection parfaite : « une banque exemplaire ».'); }, s => s.cash < 6000], [_t('Improviser'), _t('40 % de risque d’amende'), 'ghost', s => { if (chance(0.4)) { pay(s, 15000); rep(s, -3); return _t('Des papiers manquants : 15 000 € d’amende.'); } return _t('Ouf, l’inspecteur n’a rien vu.'); }]], auto: 1 },
  { id: 'concurrent', ico: '⚔️', title: _t('Un concurrent s’installe'), txt: (s, c) => _l`<b>${c.d.r}</b> ouvre une agence juste en face et propose des frais à 1 €/mois.`,
    init: (s, c) => { c.d.r = pick(RIVALS).name; },
    ch: [[_t('Baisser vos frais à 3 €'), _t('Garder vos clients'), '', s => { s.prod.cc.fee = Math.min(s.prod.cc.fee, 3); return _t('Frais baissés : vos clients restent.'); }], [_t('Contre-campagne (10 000 €)'), _t('Visiteurs en hausse'), 'success', s => { pay(s, 10000); s.flags.sponsorUntil = Math.max(s.flags.sponsorUntil || 0, s.day + 45); return _t('« La vraie banque du quartier, c’est nous ! »'); }, s => s.cash < 10000], [_t('Miser sur la qualité'), _t('Ils perdront des clients'), 'ghost', s => { for (const b of s.branches) b.rivalUntil = s.day + 60; return _t('Le concurrent vous prendra quelques clients pendant deux mois.'); }]], auto: 2 },
  { id: 'prime', need: s => staffTotal(s, 'gs') + staffTotal(s, 'bs') >= 2, ico: '💶', title: _t('Votre équipe demande une prime'), txt: () => _t('Après une bonne période, vos employés espèrent une petite prime.'),
    ch: [[_t('Prime de 300 € chacun'), _t('Équipe motivée'), 'success', s => { const n = staffTotal(s, 'gs') + staffTotal(s, 'bs'); pay(s, n * 300); sat(s, 5); for (const b of s.branches) for (const e of b.staff || []) if (e.lvl < MAX_LVL) e.xp = Math.min(xpNeed(e.lvl), e.xp + 10); return _l`${n} employés ravis.`; }], [_t('Un restaurant d’équipe (800 €)'), '', '', s => { pay(s, 800); sat(s, 3); return _t('Soirée réussie !'); }], [_t('Refuser'), _t('Ambiance tendue'), 'ghost', s => { sat(s, -6); return _t('Les sourires se font rares au guichet…'); }]], auto: 2 },
  { id: 'vert', once: true, ico: '🌱', title: _t('Le label « Banque verte »'), txt: () => _t('Un organisme propose de vous labelliser « Banque verte » après un audit à <b>12 000 €</b>.'),
    ch: [[_t('Obtenir le label'), _t('+4 réputation, épargne attirée 6 mois'), 'success', s => { pay(s, 12000); rep(s, 4); s.flags.greenUntil = s.day + 180; return _t('Label obtenu : les épargnants adorent.'); }, s => s.cash < 12000], [_t('Non merci'), '', 'ghost', () => null]], auto: 1 },
  { id: 'vip', need: s => s.chapter >= 1, ico: '🤵', title: _t('Un très gros client'), txt: (s, c) => _l`Un chef d’entreprise veut déposer <b>${money(c.d.amt)}</b> chez vous… si vous lui offrez <b>3 %</b> la première année.`,
    init: (s, c) => { c.d.amt = Math.round(Math.max(3e5, equity(s) * rnd(0.3, 0.8)) / 1e5) * 1e5; },
    ch: [[_t('Accepter à 3 %'), _t('Vous lui versez la différence'), 'success', (s, c) => { const extra = Math.round(c.d.amt * Math.max(0, 3 - s.depositRate) / 100); vipDeposit(s, c.d.amt); pay(s, extra); return _l`${money(c.d.amt)} arrivent ! Prime de bienvenue versée : ${money(extra)}.`; }], [_t('Négocier à 2 %'), _t('55 % de chances'), '', (s, c) => { if (!chance(0.55)) return _t('Il part chez un concurrent.'); const extra = Math.round(c.d.amt * Math.max(0, 2 - s.depositRate) / 100); vipDeposit(s, c.d.amt); pay(s, extra); return _l`Marché conclu à 2 % : ${money(c.d.amt)} déposés.`; }], [_t('Refuser'), '', 'ghost', () => null]], auto: 2 },
  { id: 'presse', need: s => (s.prod.cc.agio || 14) >= 13, ico: '📺', title: _t('Enquête sur les frais bancaires'), txt: s => _l`Un journaliste de France 3 enquête sur les agios. Les vôtres sont à <b>${pct(s.prod.cc.agio || 14)}</b>.`,
    ch: [[_t('Baisser les agios à 10 %'), _t('+3 réputation'), 'success', s => { s.prod.cc.agio = 10; rep(s, 3); return _t('« Une banque qui écoute ses clients. »'); }], [_t('Défendre vos tarifs'), _t('Mauvaise presse'), 'ghost', s => { rep(s, -3); return _t('Le reportage n’est pas tendre avec vous…'); }]], auto: 1 },
  { id: 'mecenat', ico: '🎭', title: _t('Mécénat culturel'), txt: () => _t('Le festival Montpellier Danse cherche un mécène : <b>15 000 €</b>.'),
    ch: [[_t('Devenir mécène'), _t('+5 réputation'), 'success', s => { pay(s, 15000); rep(s, 5); return _t('Votre nom en grand sur l’affiche du festival !'); }, s => s.cash < 15000], [_t('Décliner'), '', 'ghost', () => null]], auto: 1 },
  { id: 'informatique', ico: '💻', title: _t('Informatique vieillissante'), txt: () => _t('Votre logiciel bancaire date de 2009 et plante deux fois par semaine.'),
    ch: [[_t('Moderniser (20 000 €)'), _t('Équipe plus efficace · un investissement amorti sur 5 ans'), 'success', s => { s.cash -= 20000; s.fixed = (s.fixed || 0) + 20000; sat(s, 5); rep(s, 1); for (const b of s.branches) for (const e of b.staff || []) if (e.lvl < MAX_LVL) e.xp = Math.min(xpNeed(e.lvl), e.xp + 15); return _t('Nouveau système installé : tout va plus vite.'); }, s => s.cash < 20000], [_t('Encore un an'), _t('Clients agacés'), 'ghost', s => { sat(s, -3); return _t('Écran bleu au guichet… encore.'); }]], auto: 1 },
  { id: 'jeunes', once: true, ico: '🧑‍🎓', title: _t('Une offre pour les jeunes'), txt: () => _t('Votre équipe propose une offre « compte jeune » : carte gratuite pour les 18-25 ans.'),
    ch: [[_t('Lancer l’offre (5 000 €)'), _t('+ de visiteurs, + réputation'), 'success', s => { pay(s, 5000); s.flags.jeunes = true; rep(s, 2); return _t('Les étudiants affluent !'); }, s => s.cash < 5000], [_t('Non'), '', 'ghost', () => null]], auto: 1 },
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
