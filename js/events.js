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
    if (s.upgrades.cyber) return { icon: '🛡️', title: _t('Cyberattaque repoussée'), text: _t('Des hackers ont tenté de pirater vos serveurs… votre équipe cybersécurité les a renvoyés jouer à Minecraft.'), choices: [{ label: _t('Bien joué l’équipe !'), sub: _t('+3 réputation'), fn: s => { s.reputation += 3; } }] };
    const loss = Math.max(5e3, Math.min(s.cash * rnd(0.02, 0.05), equity(s) * 0.025));
    return { icon: '💻', title: _t('Cyberattaque !'), text: _l`Des hackers ont siphonné <b>${money(loss)}</b> de vos comptes ! Ils réclament une rançon pour en rendre la moitié.`, choices: [
      { label: _l`Payer la rançon (${money(loss * 0.15)})`, sub: _t('Vous récupérez la moitié, mais ça se saura peut-être…'), fn: s => { s.cash -= loss * 0.15 + loss * 0.5; if (chance(0.4)) { s.reputation -= 10; return _t('La presse l’a appris. Réputation -10.'); } return _t('Discret. Vous récupérez la moitié.'); } },
      { label: _t('Refuser et porter plainte'), sub: _t('Perte totale, mais réputation intacte.'), fn: s => { s.cash -= loss; s.reputation += 2; return _t('La police enquête. Vous perdez tout, mais votre honnêteté plaît.'); } },
    ] };
  } },
  { id: 'braquage', w: 2.5, make: s => {
    const b = randomBranch(s), c = cityOf(b);
    if (b.vig) return { icon: '💂', title: _l`Braquage raté à ${c.name}`, text: _t('Trois malfrats déguisés en Daft Punk ont tenté leur chance. Votre vigile les a plaqués avant la porte.'), choices: [{ label: _t('Prime pour le vigile (5 k€)'), sub: _t('+3 réputation'), fn: s => { s.cash -= 5e3; s.reputation += 3; } }, { label: _t('Un grand merci suffira'), fn: () => { } }] };
    let loss = Math.min(s.cash * 0.3, Math.max(8e3, equity(s) * rnd(0.01, 0.025)));
    if (s.upgrades.coffre) loss /= 2;
    return { icon: '🦹', title: _l`Braquage à ${c.name} !`, text: _l`Des braqueurs déguisés en Daft Punk sont repartis avec <b>${money(loss)}</b>${s.upgrades.coffre ? _t(' (vos coffres blindés ont limité la casse)') : ''}. Un vigile les aurait arrêtés…`, choices: [{ label: _t('Embaucher un vigile la prochaine fois'), fn: s => { s.cash -= loss; s.flags.robbed = true; } }] };
  } },
  { id: 'mafia', w: 1.2, cond: s => !s.flags.mafia && !s.flags.honest, make: s => {
    const amt = Math.round(Math.max(2e6, depositCap(s) * 0.3) / 1e5) * 1e5;
    return { icon: '🕶️', title: _t('Une offre qu’on ne peut pas refuser'), text: _l`Un certain <b>M. Corleone</b> souhaite déposer <b>${money(amt)}</b> en liquide dans votre banque. « Sans poser de questions », précise-t-il en caressant un chat.`, choices: [
      { label: _t('Accepter les valises'), sub: _t('Énorme dépôt gratuit… tant que personne ne sait.'), fn: s => { s.cash += amt; s.flags.mafia = amt; return _t('Les valises sont dans le coffre. Croisons les doigts.'); } },
      { label: _t('Refuser poliment'), fn: () => _t('M. Corleone repart. Il n’a pas l’air content.') },
      { label: _t('Dénoncer à la police'), sub: _t('+15 réputation'), fn: s => { s.reputation += 15; s.flags.honest = true; return _t('Coup de filet ! Vous faites la une des journaux en héros.'); } },
    ] };
  } },
  { id: 'star', w: 2, make: s => {
    const star = pick([_t('le footballeur Kylian M.'), _t('la chanteuse Aya N.'), _t('l’acteur Omar S.'), _t('le youtubeur Squeezy'), _t('la tenniswoman Caro G.')]);
    const amt = Math.round(depositCap(s) * rnd(0.05, 0.15) / 1e4) * 1e4;
    return { icon: '⭐', title: _t('Une star chez vous !'), text: _l`<b>${star}</b> veut ouvrir un compte et y placer <b>${money(amt)}</b>. Elle exige un taux de 4 % garanti… sur ce compte seulement.`, choices: [
      { label: _t('Accepter'), sub: _t('+6 réputation, coûteux'), fn: s => { s.cash += amt; s.deposits += amt; s.reputation += 6; s.cash -= amt * 0.02; return _t('Selfie avec la star ! Réputation +6.'); } },
      { label: _t('Refuser'), fn: () => _t('La star va chez le concurrent.') },
    ] };
  } },
  { id: 'viral', w: 2, make: s => {
    if (chance(0.6)) return { icon: '📱', title: _t('Buzz sur TikTok !'), text: _t('La vidéo de votre conseiller qui danse la macarena en expliquant les taux d’intérêt fait 12 millions de vues.'), choices: [{ label: _t('Lui offrir une prime (20 k€)'), sub: _t('+12 réputation'), fn: s => { s.cash -= 20e3; s.reputation += 12; } }, { label: _t('Ne rien faire'), sub: _t('+7 réputation'), fn: s => { s.reputation += 7; } }] };
    return { icon: '🤬', title: _t('Bad buzz !'), text: _t('Un client filme un guichetier qui lui répond « revenez demain » pour la 14ᵉ fois. La vidéo devient virale.'), choices: [
      { label: _t('Excuses publiques + geste commercial (50 k€)'), sub: _t('-3 réputation'), fn: s => { s.cash -= 50e3; s.reputation -= 3; } },
      { label: _t('Ignorer'), sub: _t('-12 réputation'), fn: s => { s.reputation -= 12; } },
    ] };
  } },
  { id: 'bug', w: 1.5, make: s => { const f = Math.round(Math.max(5e3, Math.min(30e3, equity(s) * 0.02)) / 1e3) * 1e3; return { icon: '🐛', title: _t('Bug informatique'), text: _t('Un bug a crédité <b>1 milliard d’euros</b> sur le compte de Gérard, retraité à Limoges. Il a déjà commandé trois tracteurs et un flamant rose gonflable.'), choices: [
    { label: _l`Annuler l’opération (${money(f)} de frais)`, sub: _t('-3 réputation'), fn: s => { s.cash -= f; s.reputation -= 3; return _t('Gérard est triste. Le flamant est remboursé.'); } },
    { label: _l`Annuler mais lui offrir ${money(f / 3)}`, sub: _t('+8 réputation, la France adore Gérard'), fn: s => { s.cash -= f * 4 / 3; s.reputation += 8; return _t('Gérard passe au JT de 20 h. Tout le monde vous aime.'); } },
  ] }; } },
  { id: 'greve', w: 1.5, cond: s => staffTotal(s, 'gs') + staffTotal(s, 'bs') >= 4, make: s => {
    const cost = monthlyCosts(s);
    return { icon: '✊', title: _t('Grève du personnel'), text: _t('Vos employés réclament une hausse de salaire et des croissants le vendredi.'), choices: [
      { label: _l`Accepter (${money(cost)})`, sub: _t('+2 réputation'), fn: s => { s.cash -= cost; s.reputation += 2; return _t('Le travail reprend, avec des croissants.'); } },
      { label: _t('Refuser'), sub: _t('Les demandes de prêt chutent pendant 20 jours, -6 réputation'), fn: s => { s.flags.strikeUntil = s.day + 20; s.reputation -= 6; return _t('Les agences tournent au ralenti…'); } },
    ] };
  } },
  { id: 'inspection', w: 2, make: s => {
    const ok = capRatio(s) >= minRatio(s) + 2;
    const base = Math.max(10e3, equity(s) * 0.015), fine = s.upgrades.conformite ? base / 3 : base;
    if (ok && (s.upgrades.conformite || chance(0.5))) return { icon: '🧐', title: _t('Inspection du régulateur'), text: _t('Les inspecteurs ont épluché vos comptes pendant 3 semaines. Verdict : rien à signaler.'), choices: [{ label: _t('Ouf !'), sub: _t('+3 réputation'), fn: s => { s.reputation += 3; } }] };
    return { icon: '🧐', title: _t('Inspection du régulateur'), text: _l`Les inspecteurs ont trouvé des « irrégularités » (un tableur nommé « vrais_comptes_FINAL_v3.xlsx »). Amende : <b>${money(fine)}</b>.`, choices: [{ label: _t('Payer'), sub: _t('-4 réputation'), fn: s => { s.cash -= fine; s.reputation -= 4; } }] };
  } },
  { id: 'stade', w: 1, make: s => {
    const amt = Math.round(Math.max(1e6, equity(s) * 0.4) / 1e5) * 1e5;
    return { icon: '🏟️', title: _t('Le maire a une idée'), text: _l`La mairie veut emprunter <b>${money(amt)}</b> sur 48 mois à <b>${pct(s.policyRate + 0.5)}</b> pour construire un stade de pétanque olympique. Taux faible, mais quasi aucun risque.`, choices: [
      { label: _t('Financer le stade'), sub: _t('Prêt sûr, +5 réputation'), disabled: s => s.cash < amt || s.surveillance, fn: s => { grantLoan(s, { id: s.nextId++, type: 'pro', name: _t('Mairie (stade de pétanque)'), amount: amt, offer: s.policyRate + 0.5, maxRate: 99, dur: 48, score: 850 }); s.reputation += 5; return _t('Le stade portera le nom de votre banque !'); } },
      { label: _t('Refuser'), sub: _t('-4 réputation'), fn: s => { s.reputation -= 4; } },
    ] };
  } },
  { id: 'licorne', w: 1.5, make: s => {
    const amt = Math.round(Math.max(50e3, equity(s) * 0.05) / 1e4) * 1e4;
    const idea = pick([_t('une appli qui traduit les miaulements'), _t('des baskets qui se lacent toutes seules'), _t('un réseau social pour plantes vertes'), _t('une IA qui choisit votre fromage du jour')]);
    return { icon: '🦄', title: _t('Deux étudiants en sweat à capuche'), text: _l`Ils veulent <b>${money(amt)}</b> pour lancer <b>${idea}</b>, contre 20 % de leur entreprise. Deux chances sur trois de tout perdre… mais qui sait ?`, choices: [
      { label: _l`Investir ${money(amt)}`, disabled: s => s.cash < amt, fn: s => {
        s.cash -= amt; const r = Math.random();
        if (r < 0.65) return _t('Faillite au bout de 8 mois. Ils ont tout dépensé en baby-foot.');
        if (r < 0.93) { s.cash += amt * 2; return _l`Rachetés par un géant ! Vous touchez ${money(amt * 2)}.`; }
        s.cash += amt * 8; s.flags.unicorn = true; return _l`🦄 C’EST UNE LICORNE ! Vous touchez ${money(amt * 8)} !`;
      } },
      { label: _t('Non merci'), fn: () => _t('Ils partent pitcher chez votre concurrent.') },
    ] };
  } },
  { id: 'snail', w: 1, make: () => ({ icon: '🐌', title: _t('Folie sur les forums'), text: _t('Des milliers d’internautes appellent à acheter des actions <b>Escargots & Co</b> « pour aller sur la Lune ». Le cours risque de s’envoler… pendant quelques jours.'), choices: [{ label: _t('Intéressant… (voir les marchés)'), fn: s => { s.flags.snailMania = s.day + rint(5, 10); ui.market = 'snail'; } }] }) },
  { id: 'krach', w: 1, make: () => ({ icon: '📉', title: _t('Krach éclair'), text: _t('Un algorithme de trading a confondu « vendre » et « vendre TOUT ». Les marchés actions plongent de 15 % en une matinée.'), choices: [{ label: _t('Respirer profondément'), fn: s => { for (const id of ['cac', 'tech', 'oil', 'snail', 'crypto']) s.market[id].price *= 0.85; s.market.gold.price *= 1.05; } }] }) },
  { id: 'heritage', w: 1, make: () => {
    const amt = rint(2, 10) * 1e4;
    return { icon: '👵', title: _t('Un héritage inattendu'), text: _l`Mme Jeanne, cliente de 104 ans, vous lègue <b>${money(amt)}</b>… à condition de prendre soin de ses 14 chats.`, choices: [
      { label: _t('Accepter les chats 🐈'), sub: _t('Les chats coûtent 2 000 €/mois… pour toujours'), fn: s => { s.cash += amt; s.flags.cats = true; return _t('Les 14 chats s’installent dans votre bureau.'); } },
      { label: _t('Donner l’héritage à la SPA'), sub: _t('+10 réputation'), fn: s => { s.reputation += 10; return _t('Les chats sont heureux. La France aussi.'); } },
    ] };
  } },
  { id: 'don', w: 1.2, make: s => {
    const amt = Math.max(5e3, Math.round(equity(s) * 0.01 / 1e3) * 1e3);
    return { icon: '❤️', title: _t('Appel aux dons'), text: _l`Une association caritative vous demande un don de <b>${money(amt)}</b> pour l’hiver.`, choices: [
      { label: _t('Donner'), sub: _t('+7 réputation'), fn: s => { s.cash -= amt; s.reputation += 7; } },
      { label: _t('Refuser'), sub: _t('-2 réputation'), fn: s => { s.reputation -= 2; } },
    ] };
  } },
  { id: 'rachat', w: 1.2, make: s => {
    const n = rint(4, 8), reqs = []; for (let i = 0; i < n; i++) reqs.push(makeRequest(s, pick(['auto', 'immo', 'pro', 'conso'])));
    const face = reqs.reduce((a, r) => a + r.amount, 0), price = face * 0.82;
    return { icon: '🏚️', title: _t('Un petit concurrent fait faillite'), text: _l`La Banque Populiste vend son portefeuille de <b>${n} prêts</b> (valeur <b>${money(face)}</b>) pour seulement <b>${money(price)}</b>. Attention : leurs clients sont un peu plus risqués.`, choices: [
      { label: _l`Racheter pour ${money(price)}`, disabled: s => s.cash < price || s.surveillance, fn: s => {
        for (const r of reqs) { r.score = Math.max(300, r.score - 60); r.offer = r.maxRate; grantLoan(s, r); s.stats.granted--; }
        s.cash += face - price; return _l`${n} prêts ajoutés à votre portefeuille avec une décote de ${money(face - price)}.`;
      } },
      { label: _t('Passer'), fn: () => _t('Un fonds vautour rachète tout.') },
    ] };
  } },
  { id: 'rumeur', w: 1, cond: s => s.deposits > 1e6, make: s => ({ icon: '😱', title: _t('Rumeur de faillite'), text: _t('Un message WhatsApp affirme que votre banque va fermer demain. Les clients commencent à faire la queue devant les agences.'), choices: [
    { label: _l`Campagne de communication (${money(Math.max(50e3, s.deposits * 0.005))})`, sub: _t('Limite les retraits à 5 %'), fn: s => { s.cash -= Math.max(50e3, s.deposits * 0.005); bankRun(s, 0.05); s.reputation += 5; } },
    { label: _t('Ne rien dire'), sub: s.cash / Math.max(1, s.deposits) > 0.2 ? _t('Vos réserves sont solides : retraits modérés') : _t('Vos réserves sont faibles : risque élevé !'), fn: s => { bankRun(s, s.cash / s.deposits > 0.2 ? 0.08 : 0.25); } },
  ] }) },
  { id: 'fusion', w: 0.6, cond: s => equity(s) > 15e6 && s.day - (s.flags.lastFusion || 0) > 720, make: s => {
    const offer = equity(s) * rnd(1.4, 2.2);
    s.flags.lastFusion = s.day;
    return { icon: '🤵', title: _t('Offre de rachat'), text: _l`<b>JP Morgane</b> propose de racheter ${esc(s.name)} pour <b>${money(offer)}</b>. Vous partiriez à la retraite avec ce chèque (fin de partie).`, choices: [
      { label: _t('Jamais ! Ma banque n’est pas à vendre'), sub: _t('+3 réputation'), fn: s => { s.reputation += 3; } },
      { label: _t('Vendre et partir aux Bahamas 🏝️'), sub: _t('Termine la partie'), fn: s => { s.fortune += offer; setTimeout(() => gameOver('vente'), 50); } },
    ] };
  } },
  { id: 'aliens', w: 2, cond: s => !!getBranch(s, 'lune'), make: s => {
    const amt = depositCap(s) * 0.1;
    return { icon: '👽', title: _t('Clients d’un autre monde'), text: _l`Des extraterrestres ont atterri près de votre base lunaire. Ils veulent déposer l’équivalent de <b>${money(amt)}</b> en cristaux de plutonium.`, choices: [
      { label: _t('Bienvenue, chers clients !'), sub: _t('+10 réputation'), fn: s => { s.cash += amt; s.deposits += amt; s.reputation += 10; return _t('Premier compte intergalactique de l’histoire !'); } },
      { label: _t('Refuser (on ne sait jamais)'), fn: () => _t('Ils repartent vers Mars. Il paraît qu’il y a une banque là-bas.') },
    ] };
  } },
  { id: 'pandemie', w: 0.5, cond: s => s.economy !== 'crise' && s.day > 360, make: () => ({ icon: '🦠', title: _t('Épidémie mondiale'), text: _t('Un nouveau virus provoque un confinement mondial. Les économistes prévoient une crise imminente.'), choices: [{ label: _t('Sortir les masques'), fn: s => { s.nextEcon = 'crise'; s.econTimer = 1; } }] }) },
  { id: 'trader', w: 1, cond: s => portfolioValue(s) > 200e3, make: s => {
    const id = pick(Object.keys(s.portfolio).filter(k => s.portfolio[k] > 0)) || 'cac';
    return { icon: '🕵️', title: _t('Tuyau d’initié'), text: _l`Un « ami » vous glisse que <b>${ASSETS[id].name}</b> va exploser demain. C’est illégal d’utiliser ce genre d’info…`, choices: [
      { label: _t('Foncer'), sub: _t('Risque d’amende'), fn: s => { if (chance(0.5)) { s.market[id].price *= 1.25; if (chance(0.5)) { const f = 300e3 / (s.upgrades.conformite ? 3 : 1); s.cash -= f; s.reputation -= 10; return _l`Le cours monte… mais l’AMF vous attrape. Amende ${money(f)} !`; } return _t('Le cours bondit de 25 % !'); } s.market[id].price *= 0.85; return _t('Le tuyau était percé : -15 %.'); } },
      { label: _t('Refuser'), sub: _t('+2 réputation'), fn: s => { s.reputation += 2; } },
    ] };
  } },
  // ----- Nouveaux événements -----
  { id: 'tempete', w: 1.2, make: s => {
    const b = randomBranch(s), c = cityOf(b), cost = Math.max(5e3, c.build * 0.05);
    return { icon: '🌊', title: _l`Inondation à ${c.name}`, text: _l`Une tempête a inondé votre agence de ${c.name}. Les clients pataugent entre les guichets.`, choices: [
      { label: _l`Réparer tout de suite (${money(cost)})`, fn: s => { s.cash -= cost; return _t('Tout est sec et repeint à neuf.'); } },
      { label: _t('Mettre des seaux et attendre'), sub: _t('Satisfaction de l’agence en chute'), fn: s => { const x = getBranch(s, b.id); if (x) x.sat = 5; s.reputation -= 3; return _t('Les clients ne sont pas ravis.'); } },
    ] };
  } },
  { id: 'influenceur', w: 1.2, make: s => {
    const cost = Math.max(30e3, Math.round(equity(s) * 0.005 / 1e3) * 1e3), inflow = depositCap(s) * 0.04;
    return { icon: '🤳', title: _t('Un influenceur finance'), text: _l`<b>@CryptoKevin</b> (3 millions d’abonnés) propose de faire la promo de votre livret pour <b>${money(cost)}</b>.`, choices: [
      { label: _t('Signer le contrat'), sub: _l`+${money(inflow)} de dépôts, +4 réputation`, fn: s => { s.cash -= cost; s.cash += inflow; s.deposits += inflow; s.reputation += 4; return _t('Les nouveaux clients affluent !'); } },
      { label: _t('Non merci'), fn: () => _t('Il fait finalement la promo d’un casino en ligne.') },
    ] };
  } },
  { id: 'panne', w: 1, cond: s => staffTotal(s, 'dab') > 0, make: s => {
    const cost = staffTotal(s, 'dab') * 8e3;
    return { icon: '🏧', title: _t('Distributeurs en folie'), text: _t('Un bug fait cracher des billets de 50 € à vos distributeurs. Une foule joyeuse se forme devant les agences.'), choices: [
      { label: _l`Couper et réparer (${money(cost)})`, fn: s => { s.cash -= cost; } },
      { label: _t('Laisser faire une heure, pour la gloire'), sub: _l`-${money(cost * 4)}, +9 réputation`, fn: s => { s.cash -= cost * 4; s.reputation += 9; return _t('Vous êtes la banque la plus populaire du pays.'); } },
    ] };
  } },
  { id: 'loto', w: 1.2, make: s => {
    const amt = Math.round(Math.max(3e5, depositCap(s) * 0.03) / 1e4) * 1e4;
    return { icon: '🍀', title: _t('Gagnant du loto'), text: _l`Josiane, cliente fidèle, vient de gagner <b>${money(amt)}</b> au loto. Votre concurrent lui promet 3 % s’il lui confie l’argent.`, choices: [
      { label: _t('Lui offrir 3,5 % la première année'), sub: _t('Elle reste chez vous'), fn: s => { s.cash += amt; s.deposits += amt; s.cash -= amt * 0.02; return _t('Josiane reste fidèle. Elle vous offre un gâteau.'); } },
      { label: _t('Lui souhaiter bonne chance'), fn: () => _t('Josiane part chez le concurrent.') },
    ] };
  } },
  { id: 'stagiaire', w: 1, make: s => {
    const cost = Math.max(5e3, monthlyCosts(s) * 0.3);
    return { icon: '🙈', title: _t('Le stagiaire a tout effacé'), text: _t('En voulant « faire de la place », le stagiaire a supprimé la base de données des clients.'), choices: [
      { label: _l`Restaurer la sauvegarde (${money(cost)})`, fn: s => { s.cash -= cost; return _t('Tout est revenu. Le stagiaire est muté à la photocopieuse.'); } },
      { label: _t('Demander aux clients de tout ressaisir'), sub: _t('-8 réputation'), fn: s => { s.reputation -= 8; } },
    ] };
  } },
  { id: 'journaliste', w: 1, cond: s => s.prod && s.prod.cc.on && s.prod.cc.fee > 6.5, make: s => ({ icon: '📰', title: _t('Enquête de presse'), text: _l`Un journaliste prépare un article sur « les frais bancaires abusifs ». Vos ${nf1.format(s.prod.cc.fee)} € par mois sont cités.`, choices: [
    { label: _t('Baisser les frais à 4 €/mois'), sub: _t('+5 réputation'), fn: s => { s.prod.cc.fee = 4; s.reputation += 5; return _t('L’article vous présente en exemple.'); } },
    { label: _t('Assumer'), sub: s.prod.cc.fee > 8 ? _t('-10 réputation') : _t('-3 réputation'), fn: s => { s.reputation -= s.prod.cc.fee > 8 ? 10 : 3; } },
  ] }) },
  { id: 'reseau', w: 1.2, cond: s => s.rivals.some(r => !r.gone && r.eq > 1e6 && r.eq < equity(s) * 0.5) && freeCity(s), make: s => {
    const r = s.rivals.filter(r => !r.gone && r.eq > 1e6 && r.eq < equity(s) * 0.5).sort((a, b) => b.eq - a.eq)[0];
    const R = RIVALS.find(x => x.id === r.id), city = freeCity(s), price = Math.round(CITIES[city].build * 1.5 / 1e4) * 1e4, dep = r.eq * 1.5;
    return { icon: '🤝', title: _l`${R.name} vend une agence`, text: _l`En difficulté, <b>${R.name}</b> vous propose son agence de <b>${CITIES[city].name}</b>, avec ses clients (<b>${money(dep)}</b> de dépôts), pour <b>${money(price)}</b>.`, choices: [
      { label: _l`Racheter (${money(price)})`, disabled: s => s.cash < price, fn: s => {
        s.cash -= price; s.cash += dep; s.deposits += dep; s.branches.push(newBranch(city, { g: 2, gs: 2 })); r.eq *= 0.8;
        return _l`L’agence de ${CITIES[city].name} est à vous !`;
      } },
      { label: _t('Pas intéressé'), fn: () => _t('Un autre concurrent la rachète.') },
    ] };
  } },
  { id: 'restructuration', w: 1.5, cond: s => s.loans.some(l => l.type === 'souv'), make: s => {
    const L = pick(s.loans.filter(l => l.type === 'souv'));
    return { icon: '🏛️', title: _l`${L.name} demande un délai`, text: _l`Le ministre des Finances de <b>${esc(L.name)}</b> vous demande d’effacer 20 % de sa dette (<b>${money(L.out * 0.2)}</b>) pour éviter le défaut.`, choices: [
      { label: _t('Accepter la restructuration'), sub: _t('Perte certaine, mais risque de défaut divisé par 2'), fn: s => { const x = s.loans.find(l => l.id === L.id); if (x) { x.out *= 0.8; x.pdA /= 2; x.pmt = payment(x.out, x.rate, Math.max(1, x.left)); } s.cash -= 0; s.reputation += 2; return _t('Le pays vous remercie.'); } },
      { label: _t('Refuser'), sub: _t('Risque de défaut doublé'), fn: s => { const x = s.loans.find(l => l.id === L.id); if (x) x.pdA *= 2; } },
    ] };
  } },
];

const RIVAL_EVENTS = [
  { id: 'rival_agence', w: 1.4, cond: s => s.chapter >= 1 && aliveRivals(s).length && s.branches.some(b => !(b.rivalUntil > s.day)), make: s => {
    const b = pick(s.branches.filter(b => !(b.rivalUntil > s.day))), c = cityOf(b), R = randomRival(s);
    const cost = Math.round(Math.max(20e3, c.build * 0.15) / 1e3) * 1e3;
    return { icon: '🏪', title: _l`${R.name} s’installe à ${c.name}`, text: _l`<b>${R.name}</b> ouvre une agence juste en face de la vôtre à ${c.name}, avec des cadeaux de bienvenue pour vos clients.`, choices: [
      { label: _l`Riposter : campagne locale (${money(cost)})`, sub: _t('Vos clients restent fidèles'), disabled: s => s.cash < cost, fn: s => { s.cash -= cost; s.reputation += 1; return _l`Vos affiches envahissent ${c.name}. Les clients restent chez vous.`; } },
      { label: _t('Laisser faire'), sub: _t('-20 % de clients dans cette agence pendant un an'), fn: s => { const x = getBranch(s, b.id); if (x) x.rivalUntil = s.day + 360; return _l`${R.name} vous prend des clients à ${c.name}.`; } },
    ] };
  } },
  { id: 'guerre_taux', w: 1, cond: s => s.prod && s.prod.liv.on && !(s.flags.priceWar > s.day) && aliveRivals(s).length, make: s => {
    const R = randomRival(s);
    return { icon: '⚔️', title: _t('Guerre des taux'), text: _l`<b>${R.name}</b> lance un livret à ${pct(s.depositRate + 1, 2)} pour attirer vos épargnants.`, choices: [
      { label: _t('S’aligner : +0,5 point sur votre livret'), sub: _t('Vous pourrez le baisser plus tard dans Produits'), fn: s => { s.depositRate = Math.round((s.depositRate + 0.5) * 100) / 100; return _t('Votre livret reste compétitif.'); } },
      { label: _t('Ignorer'), sub: _t('Votre livret attire 30 % d’épargne en moins pendant 6 mois'), fn: s => { s.flags.priceWar = s.day + 180; } },
    ] };
  } },
  { id: 'debauchage', w: 1.2, cond: s => s.branches.some(b => (b.staff || []).some(e => e.lvl >= 3)) && aliveRivals(s).length, make: s => {
    const all = []; for (const b of s.branches) for (const e of b.staff || []) if (e.lvl >= 3) all.push([b, e]);
    const [b, e] = pick(all), R = randomRival(s);
    return { icon: '🎣', title: _t('Chasseur de têtes'), text: _l`<b>${R.name}</b> propose un pont d’or à <b>${esc(e.name)}</b>, votre ${empTitle(e).toLowerCase()} de ${CITIES[b.id].name}.`, choices: [
      { label: _t('L’augmenter de 15 %'), sub: _t('Salaire plus élevé, mais il devient fidèle'), fn: s => { e.raise = (e.raise || 0) + 0.15; e.trait = 'fidele'; return _l`${e.name} reste chez vous, ravi(e).`; } },
      { label: _t('Le laisser partir'), fn: s => { fireEmp(e.id); return _l`${e.name} rejoint ${R.name}.`; } },
    ] };
  } },
];
EVENTS.push(...RIVAL_EVENTS);

function triggerEvent() {
  const seen = S.flags.evSeen = S.flags.evSeen || {};
  let pool = EVENTS.filter(e => (!e.cond || e.cond(S)) && !(S.day - (seen[e.id] || -9999) < 540));
  if (!pool.length) pool = EVENTS.filter(e => !e.cond || e.cond(S));
  const w = {}; pool.forEach((e, i) => w[i] = e.w);
  const e = pool[weighted(w)];
  seen[e.id] = S.day;
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
    return `<button class="choice" data-act="choice" data-i="${i}" ${dis ? 'disabled' : ''}><span>${c.label}</span>${c.sub ? `<small>${c.sub}</small>` : ''}${dis ? _t('<small>Impossible : fonds insuffisants ou surveillance</small>') : ''}</button>`;
  }).join('');
  showModal(`<div class="m-ico">${icon}</div><h2>${title}</h2>${html}<div class="choices">${btns}</div>`, true);
}
