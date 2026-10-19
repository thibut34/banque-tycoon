'use strict';
/* =====================================================================
   BANQUE TYCOON — événements supplémentaires
   (chaque événement a un délai avant de pouvoir revenir : voir triggerEvent)
   ===================================================================== */

EVENTS.push(
  { id: 'seminaire', w: 1.2, cond: s => staffTotal(s, 'gs') + staffTotal(s, 'bs') >= 3, make: s => {
    const n = s.branches.reduce((a, b) => a + (b.staff || []).length, 0), cost = n * 1500;
    return { icon: '🏕️', title: _t('Séminaire d’équipe'), text: _l`Vos ${n} employés rêvent d’un séminaire au bord du lac d’Annecy : ateliers, kayak et karaoké.`, choices: [
      { label: _l`Offrir le séminaire (${money(cost)})`, sub: _t('+25 XP pour chaque employé, satisfaction en hausse'), disabled: s => s.cash < cost, fn: s => {
        s.cash -= cost;
        for (const b of s.branches) { b.sat = clamp(b.sat + 8, 0, 100); for (const e of b.staff || []) if (e.lvl < MAX_LVL) e.xp = Math.min(xpNeed(e.lvl), e.xp + 25); }
        return _t('Tout le monde revient motivé (et un peu enroué).');
      } },
      { label: _t('Une pizza en salle de pause'), sub: _t('Gratuit, mais personne n’est dupe'), fn: s => { for (const b of s.branches) b.sat = clamp(b.sat - 3, 0, 100); } },
    ] };
  } },
  { id: 'genie', w: 0.8, cond: s => staffTotal(s, 'bs') >= 1, make: s => ({ icon: '🧑‍💻', title: _t('Le stagiaire génial'), text: _t('Le stagiaire a codé pendant le week-end un algorithme qui repère les mauvais payeurs. Il demande un CDI.'), choices: [
    { label: s.upgrades.analyste ? _t('L’embaucher (son outil améliore votre IA)') : _t('L’embaucher comme analyste crédit'), sub: s.upgrades.analyste ? _t('Défauts -10 % sur les nouveaux prêts') : _t('Débloque gratuitement l’analyste crédit'), fn: s => { if (s.upgrades.analyste) s.flags.genius = true; else s.upgrades.analyste = true; return _t('Bienvenue dans l’équipe, petit génie !'); } },
    { label: _t('Le remercier pour son stage'), sub: _t('Il part chez un concurrent'), fn: () => _t('Il part avec son algorithme sous le bras.') },
  ] }) },
  { id: 'vert', w: 1, cond: s => s.chapter >= 1, make: s => ({ icon: '🌱', title: _t('Manifestation pour le climat'), text: _t('Des militants manifestent devant votre siège : « Votre argent finance-t-il la planète ou les pétroliers ? »'), choices: [
    { label: _t('Lancer une gamme d’épargne verte (60 k€)'), sub: _t('+7 réputation, plus d’épargnants pendant un an'), disabled: s => s.cash < 60e3, fn: s => { s.cash -= 60e3; s.reputation += 7; s.flags.greenUntil = s.day + 360; return _t('Votre livret vert fait un carton chez les jeunes.'); } },
    { label: _t('Leur offrir des croissants'), sub: _t('+1 réputation'), fn: s => { s.reputation += 1; } },
    { label: _t('Appeler la sécurité'), sub: _t('-6 réputation'), fn: s => { s.reputation -= 6; return _t('La vidéo tourne en boucle sur les réseaux…'); } },
  ] }) },
  { id: 'trophee', w: 0.8, cond: s => s.day > 360, make: s => {
    const sat = avgSat(s), win = sat > 70;
    return { icon: '🏆', title: _t('Trophée de la banque de l’année'), text: win ? _l`Le magazine « Ma Banque & Moi » vous élit <b>banque de l’année</b> grâce à des clients satisfaits à ${Math.round(sat)}/100 !` : _l`Le magazine « Ma Banque & Moi » publie son classement. Avec des clients satisfaits à ${Math.round(sat)}/100, vous terminez… « peut mieux faire ».`, choices: [
      win ? { label: _t('Soulever le trophée'), sub: _t('+8 réputation et 50 k€ de prix'), fn: s => { s.reputation += 8; s.cash += 50e3; } } : { label: _t('Promis, on va s’améliorer'), sub: _t('-2 réputation'), fn: s => { s.reputation -= 2; } },
    ] };
  } },
  { id: 'fisc', w: 0.9, cond: s => s.day > 360 && s.stats.profit > 200e3, make: s => {
    const amt = Math.round(Math.max(30e3, s.stats.profit * 0.03) / 1e3) * 1e3;
    if (s.upgrades.conformite) return { icon: '🧾', title: _t('Contrôle fiscal'), text: _t('Le fisc épluche vos comptes… et votre service conformité avait tout prévu. Rien à redire.'), choices: [{ label: _t('Merci la conformité'), fn: () => { } }] };
    return { icon: '🧾', title: _t('Contrôle fiscal'), text: _l`Le fisc vous réclame <b>${money(amt)}</b> pour une case mal cochée en 2027.`, choices: [
      { label: _l`Payer ${money(amt)}`, fn: s => { s.cash -= amt; } },
      { label: _t('Contester devant le tribunal'), sub: _t('Une chance sur deux : rien à payer, ou le double'), fn: s => { if (chance(0.5)) return _t('Le juge vous donne raison !'); s.cash -= amt * 2; return _l`Perdu : vous payez ${money(amt * 2)}.`; } },
    ] };
  } },
  { id: 'club', w: 1, cond: s => s.chapter >= 1, make: s => {
    const cost = Math.round(Math.max(40e3, equity(s) * 0.01) / 1e3) * 1e3, c = cityOf(pick(s.branches));
    return { icon: '⚽', title: _t('Sponsoring sportif'), text: _l`Le club de foot de ${c.name} cherche un sponsor maillot pour la saison : <b>${money(cost)}</b>.`, choices: [
      { label: _t('Signer'), sub: _t('+6 réputation, plus de clients pendant 6 mois'), disabled: s => s.cash < cost, fn: s => { s.cash -= cost; s.reputation += 6; s.flags.sponsorUntil = s.day + 180; return _t('Votre logo sur les maillots ! Le club gagne 3-0 le soir même.'); } },
      { label: _t('Refuser'), fn: () => _t('C’est la boulangerie du coin qui sponsorise.') },
    ] };
  } },
  { id: 'belier', w: 1, cond: s => staffTotal(s, 'dab') > 0, make: s => {
    const b = pick(s.branches.filter(b => b.dab)), c = cityOf(b);
    if (b.vig) return { icon: '💂', title: _t('Attaque au bélier déjouée'), text: _l`Des voleurs ont tenté d’arracher un distributeur à ${c.name} avec un tracteur. Votre vigile a appelé la police à temps.`, choices: [{ label: _t('Bravo !'), sub: _t('+2 réputation'), fn: s => { s.reputation += 2; } }] };
    return { icon: '🚜', title: _l`Distributeur arraché à ${c.name}`, text: _t('Des voleurs ont arraché un distributeur avec un tracteur volé. Il faut le remplacer.'), choices: [
      { label: _l`Le remplacer (${money(itemCost(b, 'dab'))})`, fn: s => { s.cash -= itemCost(b, 'dab') + 20e3; return _t('Nouveau distributeur installé. Pensez au vigile !'); } },
      { label: _t('Ne pas le remplacer'), sub: _t('Un distributeur en moins'), fn: s => { const x = getBranch(s, b.id); if (x && x.dab) x.dab--; s.cash -= 20e3; } },
    ] };
  } },
  { id: 'coupure', w: 1, make: s => {
    const b = pick(s.branches), c = cityOf(b), cost = Math.round(Math.max(15e3, c.build * 0.05) / 1e3) * 1e3;
    return { icon: '🔌', title: _l`Panne d’électricité à ${c.name}`, text: _t('Une coupure générale plonge l’agence dans le noir. Les clients repartent.'), choices: [
      { label: _l`Louer un groupe électrogène (${money(cost)})`, fn: s => { s.cash -= cost; return _t('Le groupe ronronne, l’agence reste ouverte.'); } },
      { label: _t('Fermer en attendant'), sub: _t('Clients perdus et satisfaction en baisse'), fn: s => { const x = getBranch(s, b.id); if (x) { x.svc = 0.3; x.sat = clamp(x.sat - 15, 0, 100); } } },
    ] };
  } },
  { id: 'vip', w: 1, cond: s => s.chapter >= 1, make: s => {
    const amt = Math.round(Math.max(150e3, equity(s) * 0.15) / 1e4) * 1e4;
    return { icon: '🎩', title: _t('Un client très important'), text: _l`Le célèbre chef étoilé Jean-Bernard Lasauce veut emprunter <b>${money(amt)}</b> pour son nouveau restaurant, à <b>${pct(s.policyRate + 1.2)}</b>. Excellent dossier, et il a beaucoup d’amis…`, choices: [
      { label: _t('Accepter'), sub: _t('Prêt sûr mais peu rentable, +4 réputation'), disabled: s => s.cash < amt || s.surveillance, fn: s => { grantLoan(s, { id: s.nextId++, type: 'pro', name: _t('Chef J.-B. Lasauce'), amount: amt, offer: Math.round((s.policyRate + 1.2) * 10) / 10, maxRate: 99, dur: 60, score: 820 }); s.reputation += 4; return _t('Il vous invite à l’inauguration. Le soufflé est parfait.'); } },
      { label: _t('Négocier un meilleur taux'), sub: _t('Une chance sur deux qu’il accepte'), disabled: s => s.cash < amt || s.surveillance, fn: s => { if (chance(0.5)) { grantLoan(s, { id: s.nextId++, type: 'pro', name: _t('Chef J.-B. Lasauce'), amount: amt, offer: Math.round((s.policyRate + 2.2) * 10) / 10, maxRate: 99, dur: 60, score: 820 }); return _t('Il accepte en râlant.'); } s.reputation -= 2; return _t('Vexé, il part chez un concurrent.'); } },
      { label: _t('Refuser'), fn: () => _t('Il part déçu.') },
    ] };
  } },
  { id: 'cafe', w: 0.8, cond: s => s.chapter >= 1, make: s => ({ icon: '☕', title: _t('Une idée de génie'), text: _t('Votre directrice adjointe Gisèle propose d’installer un coin café dans toutes les agences.'), choices: [
    { label: _l`Installer (${money(s.branches.length * 8e3)})`, sub: _t('+5 satisfaction dans toutes les agences'), disabled: s => s.cash < s.branches.length * 8e3, fn: s => { s.cash -= s.branches.length * 8e3; for (const b of s.branches) b.sat = clamp(b.sat + 5, 0, 100); s.flags.coffee = true; return _t('L’odeur du café attire même les passants.'); } },
    { label: _t('Pas maintenant'), fn: () => _t('Gisèle range sa machine à expresso, déçue.') },
  ] }) },
);
