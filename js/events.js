'use strict';
/* =====================================================================
   BANQUE TYCOON — événements aléatoires (à choix)
   ===================================================================== */

const randomBranch = s => pick(s.branches);
const freeCity = s => {
  const ids = Object.keys(CITIES).filter(id => !getBranch(s, id) && CITIES[id].region !== 'espace' && regionUnlocked(s, CITIES[id].region));
  return ids.length ? pick(ids) : null;
};

const EVENTS = [
  { id: 'hack', w: 3, make: s => {
    if (s.upgrades.cyber) return { icon: '🛡️', title: 'Cyberattaque repoussée', text: 'Des hackers ont tenté de pirater vos serveurs… votre équipe cybersécurité les a renvoyés jouer à Minecraft.', choices: [{ label: 'Bien joué l’équipe !', sub: '+3 réputation', fn: s => { s.reputation += 3; } }] };
    const loss = Math.max(20e3, Math.min(s.cash * rnd(0.04, 0.1), equity(s) * 0.05));
    return { icon: '💻', title: 'Cyberattaque !', text: `Des hackers ont siphonné <b>${money(loss)}</b> de vos comptes ! Ils réclament une rançon pour en rendre la moitié.`, choices: [
      { label: `Payer la rançon (${money(loss * 0.15)})`, sub: 'Vous récupérez la moitié, mais ça se saura peut-être…', fn: s => { s.cash -= loss * 0.15 + loss * 0.5; if (chance(0.4)) { s.reputation -= 10; return 'La presse l’a appris. Réputation -10.'; } return 'Discret. Vous récupérez la moitié.'; } },
      { label: 'Refuser et porter plainte', sub: 'Perte totale, mais réputation intacte.', fn: s => { s.cash -= loss; s.reputation += 2; return 'La police enquête. Vous perdez tout, mais votre honnêteté plaît.'; } },
    ] };
  } },
  { id: 'braquage', w: 2.5, make: s => {
    const b = randomBranch(s), c = cityOf(b);
    if (b.vig) return { icon: '💂', title: `Braquage raté à ${c.name}`, text: 'Trois malfrats déguisés en Daft Punk ont tenté leur chance. Votre vigile les a plaqués avant la porte.', choices: [{ label: 'Prime pour le vigile (5 k€)', sub: '+3 réputation', fn: s => { s.cash -= 5e3; s.reputation += 3; } }, { label: 'Un grand merci suffira', fn: () => { } }] };
    let loss = Math.min(s.cash * 0.3, Math.max(30e3, equity(s) * rnd(0.02, 0.05)));
    if (s.upgrades.coffre) loss /= 2;
    return { icon: '🦹', title: `Braquage à ${c.name} !`, text: `Des braqueurs déguisés en Daft Punk sont repartis avec <b>${money(loss)}</b>${s.upgrades.coffre ? ' (vos coffres blindés ont limité la casse)' : ''}. Un vigile les aurait arrêtés…`, choices: [{ label: 'Embaucher un vigile la prochaine fois', fn: s => { s.cash -= loss; } }] };
  } },
  { id: 'mafia', w: 1.2, cond: s => !s.flags.mafia && !s.flags.honest, make: s => {
    const amt = Math.round(Math.max(2e6, depositCap(s) * 0.3) / 1e5) * 1e5;
    return { icon: '🕶️', title: 'Une offre qu’on ne peut pas refuser', text: `Un certain <b>M. Corleone</b> souhaite déposer <b>${money(amt)}</b> en liquide dans votre banque. « Sans poser de questions », précise-t-il en caressant un chat.`, choices: [
      { label: 'Accepter les valises', sub: 'Énorme dépôt gratuit… tant que personne ne sait.', fn: s => { s.cash += amt; s.flags.mafia = amt; return 'Les valises sont dans le coffre. Croisons les doigts.'; } },
      { label: 'Refuser poliment', fn: () => 'M. Corleone repart. Il n’a pas l’air content.' },
      { label: 'Dénoncer à la police', sub: '+15 réputation', fn: s => { s.reputation += 15; s.flags.honest = true; return 'Coup de filet ! Vous faites la une des journaux en héros.'; } },
    ] };
  } },
  { id: 'star', w: 2, make: s => {
    const star = pick(['le footballeur Kylian M.', 'la chanteuse Aya N.', 'l’acteur Omar S.', 'le youtubeur Squeezy', 'la tenniswoman Caro G.']);
    const amt = Math.round(depositCap(s) * rnd(0.05, 0.15) / 1e4) * 1e4;
    return { icon: '⭐', title: 'Une star chez vous !', text: `<b>${star}</b> veut ouvrir un compte et y placer <b>${money(amt)}</b>. Elle exige un taux de 4 % garanti… sur ce compte seulement.`, choices: [
      { label: 'Accepter', sub: '+6 réputation, coûteux', fn: s => { s.cash += amt; s.deposits += amt; s.reputation += 6; s.cash -= amt * 0.02; return 'Selfie avec la star ! Réputation +6.'; } },
      { label: 'Refuser', fn: () => 'La star va chez le concurrent.' },
    ] };
  } },
  { id: 'viral', w: 2, make: s => {
    if (chance(0.6)) return { icon: '📱', title: 'Buzz sur TikTok !', text: 'La vidéo de votre conseiller qui danse la macarena en expliquant les taux d’intérêt fait 12 millions de vues.', choices: [{ label: 'Lui offrir une prime (20 k€)', sub: '+12 réputation', fn: s => { s.cash -= 20e3; s.reputation += 12; } }, { label: 'Ne rien faire', sub: '+7 réputation', fn: s => { s.reputation += 7; } }] };
    return { icon: '🤬', title: 'Bad buzz !', text: 'Un client filme un guichetier qui lui répond « revenez demain » pour la 14ᵉ fois. La vidéo devient virale.', choices: [
      { label: 'Excuses publiques + geste commercial (50 k€)', sub: '-3 réputation', fn: s => { s.cash -= 50e3; s.reputation -= 3; } },
      { label: 'Ignorer', sub: '-12 réputation', fn: s => { s.reputation -= 12; } },
    ] };
  } },
  { id: 'bug', w: 1.5, make: () => ({ icon: '🐛', title: 'Bug informatique', text: 'Un bug a crédité <b>1 milliard d’euros</b> sur le compte de Gérard, retraité à Limoges. Il a déjà commandé trois tracteurs et un flamant rose gonflable.', choices: [
    { label: 'Annuler l’opération (30 k€ de frais)', sub: '-3 réputation', fn: s => { s.cash -= 30e3; s.reputation -= 3; return 'Gérard est triste. Le flamant est remboursé.'; } },
    { label: 'Annuler mais lui offrir 10 k€', sub: '+8 réputation, la France adore Gérard', fn: s => { s.cash -= 40e3; s.reputation += 8; return 'Gérard passe au JT de 20 h. Tout le monde vous aime.'; } },
  ] }) },
  { id: 'greve', w: 1.5, cond: s => staffTotal(s, 'gs') + staffTotal(s, 'bs') >= 4, make: s => {
    const cost = monthlyCosts(s);
    return { icon: '✊', title: 'Grève du personnel', text: 'Vos employés réclament une hausse de salaire et des croissants le vendredi.', choices: [
      { label: `Accepter (${money(cost)})`, sub: '+2 réputation', fn: s => { s.cash -= cost; s.reputation += 2; return 'Le travail reprend, avec des croissants.'; } },
      { label: 'Refuser', sub: 'Les demandes de prêt chutent pendant 20 jours, -6 réputation', fn: s => { s.flags.strikeUntil = s.day + 20; s.reputation -= 6; return 'Les agences tournent au ralenti…'; } },
    ] };
  } },
  { id: 'inspection', w: 2, make: s => {
    const ok = capRatio(s) >= minRatio(s) + 2;
    const base = Math.max(50e3, equity(s) * 0.03), fine = s.upgrades.conformite ? base / 3 : base;
    if (ok && (s.upgrades.conformite || chance(0.5))) return { icon: '🧐', title: 'Inspection du régulateur', text: 'Les inspecteurs ont épluché vos comptes pendant 3 semaines. Verdict : rien à signaler.', choices: [{ label: 'Ouf !', sub: '+3 réputation', fn: s => { s.reputation += 3; } }] };
    return { icon: '🧐', title: 'Inspection du régulateur', text: `Les inspecteurs ont trouvé des « irrégularités » (un tableur nommé « vrais_comptes_FINAL_v3.xlsx »). Amende : <b>${money(fine)}</b>.`, choices: [{ label: 'Payer', sub: '-4 réputation', fn: s => { s.cash -= fine; s.reputation -= 4; } }] };
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
    const idea = pick(['une appli qui traduit les miaulements', 'des baskets qui se lacent toutes seules', 'un réseau social pour plantes vertes', 'une IA qui choisit votre fromage du jour']);
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
  { id: 'snail', w: 1, make: () => ({ icon: '🐌', title: 'Folie sur les forums', text: 'Des milliers d’internautes appellent à acheter des actions <b>Escargots & Co</b> « pour aller sur la Lune ». Le cours risque de s’envoler… pendant quelques jours.', choices: [{ label: 'Intéressant… (voir les marchés)', fn: s => { s.flags.snailMania = s.day + rint(5, 10); ui.market = 'snail'; } }] }) },
  { id: 'krach', w: 1, make: () => ({ icon: '📉', title: 'Krach éclair', text: 'Un algorithme de trading a confondu « vendre » et « vendre TOUT ». Les marchés actions plongent de 15 % en une matinée.', choices: [{ label: 'Respirer profondément', fn: s => { for (const id of ['cac', 'tech', 'oil', 'snail', 'crypto']) s.market[id].price *= 0.85; s.market.gold.price *= 1.05; } }] }) },
  { id: 'heritage', w: 1, make: () => {
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
    return { icon: '🏚️', title: 'Un petit concurrent fait faillite', text: `La Banque Populiste vend son portefeuille de <b>${n} prêts</b> (valeur <b>${money(face)}</b>) pour seulement <b>${money(price)}</b>. Attention : leurs clients sont un peu plus risqués.`, choices: [
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
  { id: 'fusion', w: 0.6, cond: s => equity(s) > 15e6 && s.day - (s.flags.lastFusion || 0) > 720, make: s => {
    const offer = equity(s) * rnd(1.4, 2.2);
    s.flags.lastFusion = s.day;
    return { icon: '🤵', title: 'Offre de rachat', text: `<b>JP Morgane</b> propose de racheter ${esc(s.name)} pour <b>${money(offer)}</b>. Vous partiriez à la retraite avec ce chèque (fin de partie).`, choices: [
      { label: 'Jamais ! Ma banque n’est pas à vendre', sub: '+3 réputation', fn: s => { s.reputation += 3; } },
      { label: 'Vendre et partir aux Bahamas 🏝️', sub: 'Termine la partie', fn: s => { s.fortune += offer; setTimeout(() => gameOver('vente'), 50); } },
    ] };
  } },
  { id: 'aliens', w: 2, cond: s => !!getBranch(s, 'lune'), make: s => {
    const amt = depositCap(s) * 0.1;
    return { icon: '👽', title: 'Clients d’un autre monde', text: `Des extraterrestres ont atterri près de votre base lunaire. Ils veulent déposer l’équivalent de <b>${money(amt)}</b> en cristaux de plutonium.`, choices: [
      { label: 'Bienvenue, chers clients !', sub: '+10 réputation', fn: s => { s.cash += amt; s.deposits += amt; s.reputation += 10; return 'Premier compte intergalactique de l’histoire !'; } },
      { label: 'Refuser (on ne sait jamais)', fn: () => 'Ils repartent vers Mars. Il paraît qu’il y a une banque là-bas.' },
    ] };
  } },
  { id: 'pandemie', w: 0.5, cond: s => s.economy !== 'crise' && s.day > 360, make: () => ({ icon: '🦠', title: 'Épidémie mondiale', text: 'Un nouveau virus provoque un confinement mondial. Les économistes prévoient une crise imminente.', choices: [{ label: 'Sortir les masques', fn: s => { s.nextEcon = 'crise'; s.econTimer = 1; } }] }) },
  { id: 'trader', w: 1, cond: s => portfolioValue(s) > 200e3, make: s => {
    const id = pick(Object.keys(s.portfolio).filter(k => s.portfolio[k] > 0)) || 'cac';
    return { icon: '🕵️', title: 'Tuyau d’initié', text: `Un « ami » vous glisse que <b>${ASSETS[id].name}</b> va exploser demain. C’est illégal d’utiliser ce genre d’info…`, choices: [
      { label: 'Foncer', sub: 'Risque d’amende', fn: s => { if (chance(0.5)) { s.market[id].price *= 1.25; if (chance(0.5)) { const f = 300e3 / (s.upgrades.conformite ? 3 : 1); s.cash -= f; s.reputation -= 10; return `Le cours monte… mais l’AMF vous attrape. Amende ${money(f)} !`; } return 'Le cours bondit de 25 % !'; } s.market[id].price *= 0.85; return 'Le tuyau était percé : -15 %.'; } },
      { label: 'Refuser', sub: '+2 réputation', fn: s => { s.reputation += 2; } },
    ] };
  } },
  // ----- Nouveaux événements -----
  { id: 'tempete', w: 1.2, make: s => {
    const b = randomBranch(s), c = cityOf(b), cost = Math.max(20e3, c.build * 0.1);
    return { icon: '🌊', title: `Inondation à ${c.name}`, text: `Une tempête a inondé votre agence de ${c.name}. Les clients pataugent entre les guichets.`, choices: [
      { label: `Réparer tout de suite (${money(cost)})`, fn: s => { s.cash -= cost; return 'Tout est sec et repeint à neuf.'; } },
      { label: 'Mettre des seaux et attendre', sub: 'Satisfaction de l’agence en chute', fn: s => { const x = getBranch(s, b.id); if (x) x.sat = 5; s.reputation -= 3; return 'Les clients ne sont pas ravis.'; } },
    ] };
  } },
  { id: 'influenceur', w: 1.2, make: s => {
    const cost = Math.max(30e3, Math.round(equity(s) * 0.005 / 1e3) * 1e3), inflow = depositCap(s) * 0.04;
    return { icon: '🤳', title: 'Un influenceur finance', text: `<b>@CryptoKevin</b> (3 millions d’abonnés) propose de faire la promo de votre livret pour <b>${money(cost)}</b>.`, choices: [
      { label: 'Signer le contrat', sub: `+${money(inflow)} de dépôts, +4 réputation`, fn: s => { s.cash -= cost; s.cash += inflow; s.deposits += inflow; s.reputation += 4; return 'Les nouveaux clients affluent !'; } },
      { label: 'Non merci', fn: () => 'Il fait finalement la promo d’un casino en ligne.' },
    ] };
  } },
  { id: 'panne', w: 1, cond: s => staffTotal(s, 'dab') > 0, make: s => {
    const cost = staffTotal(s, 'dab') * 8e3;
    return { icon: '🏧', title: 'Distributeurs en folie', text: 'Un bug fait cracher des billets de 50 € à vos distributeurs. Une foule joyeuse se forme devant les agences.', choices: [
      { label: `Couper et réparer (${money(cost)})`, fn: s => { s.cash -= cost; } },
      { label: 'Laisser faire une heure, pour la gloire', sub: `-${money(cost * 4)}, +9 réputation`, fn: s => { s.cash -= cost * 4; s.reputation += 9; return 'Vous êtes la banque la plus populaire du pays.'; } },
    ] };
  } },
  { id: 'loto', w: 1.2, make: s => {
    const amt = Math.round(Math.max(3e5, depositCap(s) * 0.03) / 1e4) * 1e4;
    return { icon: '🍀', title: 'Gagnant du loto', text: `Josiane, cliente fidèle, vient de gagner <b>${money(amt)}</b> au loto. Votre concurrent lui promet 3 % s’il lui confie l’argent.`, choices: [
      { label: 'Lui offrir 3,5 % la première année', sub: 'Elle reste chez vous', fn: s => { s.cash += amt; s.deposits += amt; s.cash -= amt * 0.02; return 'Josiane reste fidèle. Elle vous offre un gâteau.'; } },
      { label: 'Lui souhaiter bonne chance', fn: () => 'Josiane part chez le concurrent.' },
    ] };
  } },
  { id: 'stagiaire', w: 1, make: s => {
    const cost = Math.max(25e3, monthlyCosts(s) * 0.5);
    return { icon: '🙈', title: 'Le stagiaire a tout effacé', text: 'En voulant « faire de la place », le stagiaire a supprimé la base de données des clients.', choices: [
      { label: `Restaurer la sauvegarde (${money(cost)})`, fn: s => { s.cash -= cost; return 'Tout est revenu. Le stagiaire est muté à la photocopieuse.'; } },
      { label: 'Demander aux clients de tout ressaisir', sub: '-8 réputation', fn: s => { s.reputation -= 8; } },
    ] };
  } },
  { id: 'journaliste', w: 1, cond: s => s.fees !== 'bas', make: s => ({ icon: '📰', title: 'Enquête de presse', text: 'Un journaliste prépare un article sur « les frais bancaires abusifs ». Votre banque est citée.', choices: [
    { label: 'Baisser les frais immédiatement', sub: 'Frais réglés sur « Bas », +5 réputation', fn: s => { s.fees = 'bas'; s.reputation += 5; return 'L’article vous présente en exemple.'; } },
    { label: 'Assumer', sub: s.fees === 'eleve' ? '-10 réputation' : '-3 réputation', fn: s => { s.reputation -= s.fees === 'eleve' ? 10 : 3; } },
  ] }) },
  { id: 'reseau', w: 1.2, cond: s => s.rivals.some(r => r.eq > 1e6 && r.eq < equity(s) * 0.5) && freeCity(s), make: s => {
    const r = s.rivals.filter(r => r.eq > 1e6 && r.eq < equity(s) * 0.5).sort((a, b) => b.eq - a.eq)[0];
    const R = RIVALS.find(x => x.id === r.id), city = freeCity(s), price = Math.round(CITIES[city].build * 1.5 / 1e4) * 1e4, dep = r.eq * 1.5;
    return { icon: '🤝', title: `${R.name} vend une agence`, text: `En difficulté, <b>${R.name}</b> vous propose son agence de <b>${CITIES[city].name}</b>, avec ses clients (<b>${money(dep)}</b> de dépôts), pour <b>${money(price)}</b>.`, choices: [
      { label: `Racheter (${money(price)})`, disabled: s => s.cash < price, fn: s => {
        s.cash -= price; s.cash += dep; s.deposits += dep; s.branches.push(newBranch(city, { g: 2, gs: 2 })); r.eq *= 0.8;
        return `L’agence de ${CITIES[city].name} est à vous !`;
      } },
      { label: 'Pas intéressé', fn: () => 'Un autre concurrent la rachète.' },
    ] };
  } },
  { id: 'restructuration', w: 1.5, cond: s => s.loans.some(l => l.type === 'souv'), make: s => {
    const L = pick(s.loans.filter(l => l.type === 'souv'));
    return { icon: '🏛️', title: `${L.name} demande un délai`, text: `Le ministre des Finances de <b>${esc(L.name)}</b> vous demande d’effacer 20 % de sa dette (<b>${money(L.out * 0.2)}</b>) pour éviter le défaut.`, choices: [
      { label: 'Accepter la restructuration', sub: 'Perte certaine, mais risque de défaut divisé par 2', fn: s => { const x = s.loans.find(l => l.id === L.id); if (x) { x.out *= 0.8; x.pdA /= 2; x.pmt = payment(x.out, x.rate, Math.max(1, x.left)); } s.cash -= 0; s.reputation += 2; return 'Le pays vous remercie.'; } },
      { label: 'Refuser', sub: 'Risque de défaut doublé', fn: s => { const x = s.loans.find(l => l.id === L.id); if (x) x.pdA *= 2; } },
    ] };
  } },
];

function triggerEvent() {
  const pool = EVENTS.filter(e => !e.cond || e.cond(S));
  const w = {}; pool.forEach((e, i) => w[i] = e.w);
  const e = pool[weighted(w)];
  const m = e.make(S);
  S.stats.events++;
  SFX.play('notify');
  eventModal(m.icon, m.title, `<p class="center">${m.text}</p>`, m.choices);
}

function eventModal(icon, title, html, choices) {
  ui.event = { choices };
  ui.modal = true;
  const btns = choices.map((c, i) => {
    const dis = c.disabled && c.disabled(S);
    return `<button class="choice" data-act="choice" data-i="${i}" ${dis ? 'disabled' : ''}><span>${c.label}</span>${c.sub ? `<small>${c.sub}</small>` : ''}${dis ? '<small>Impossible : fonds insuffisants ou surveillance</small>' : ''}</button>`;
  }).join('');
  showModal(`<div class="m-ico">${icon}</div><h2>${title}</h2>${html}<div class="choices">${btns}</div>`, true);
}
