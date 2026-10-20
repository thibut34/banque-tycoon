'use strict';
/* =====================================================================
   BANQUE TYCOON — publicités GameDistribution
   Actif seulement dans le zip GameDistribution (window.GD_GAME_ID est
   alors défini dans index.html). Les pubs passent par les mêmes
   fonctions que pour CrazyGames : CG.midgame(), CG.rewarded()…
   Pendant une pub, CG.adOn met le jeu en pause et coupe le son.
   ===================================================================== */
(function () {
  const id = window.GD_GAME_ID; if (!id) return;
  let ready = false, lastAd = 0, lastReward = 0, prerollDone = false;
  window.GD_OPTIONS = {
    gameId: id,
    onEvent: e => {
      if (e.name === 'SDK_READY') ready = true;
      if (e.name === 'SDK_GAME_PAUSE') CG.adOn = true;   // une pub commence : pause et silence
      if (e.name === 'SDK_GAME_START') CG.adOn = false;  // la pub est finie : on reprend
    },
  };
  const js = document.createElement('script'); js.id = 'gamedistribution-jssdk'; js.src = 'https://html5.api.gamedistribution.com/main.min.js';
  document.head.appendChild(js);
  const sdk = () => ready && window.gdsdk && typeof window.gdsdk.showAd === 'function' ? window.gdsdk : null;
  const show = type => { const g = sdk(); if (!g) return Promise.reject('unavailable'); CG.adOn = true; return g.showAd(type).finally(() => { CG.adOn = false; }); };
  Object.assign(CG, {
    canAd() { return !!sdk(); },
    // GameDistribution demande une pub avant de commencer à jouer (au clic sur « Jouer »)
    preroll() { if (prerollDone) return; prerollDone = true; lastAd = Date.now(); show().catch(() => { }); },
    // Une pub entre deux mois, au plus une toutes les 3 minutes
    midgame() { if (sdk() && Date.now() - lastAd > 180e3) { lastAd = Date.now(); show().catch(() => { }); } },
    // Pub récompensée (coup de pouce, bonus de connexion doublé), au plus toutes les 4 minutes
    rewardReady() { return !!sdk() && Date.now() - lastReward > 240e3; },
    rewarded(onReward) {
      show('rewarded').then(() => { lastReward = Date.now(); onReward(); })
        .catch(() => toast(_t('Pas de publicité disponible pour le moment. Réessayez plus tard !'), 'bad'));
    },
  });
})();
