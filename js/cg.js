'use strict';
/* =====================================================================
   BANQUE TYCOON — intégration CrazyGames
   SDK v3 : chargement, début/pause de partie, moments forts, réglage
   « son coupé » du site, sauvegarde en ligne (module Data) et publicités.
   Hors de CrazyGames (GitHub Pages, ordinateur), tout se replie
   proprement sur le navigateur et le jeu marche sans publicité.
   ===================================================================== */

const CG = {
  sdk: null, playing: null, adOn: false, muted: false, lastAd: 0, lastReward: 0,
  async init() {
    try {
      if (!window.CrazyGames || !window.CrazyGames.SDK) return;
      await window.CrazyGames.SDK.init();
      const sdk = window.CrazyGames.SDK;
      if (sdk.environment === 'disabled') return; // hors de CrazyGames
      this.sdk = sdk;
      const st = sdk.game && sdk.game.settings; this.muted = !!(st && st.muteAudio);
      if (sdk.game && sdk.game.addSettingsChangeListener) sdk.game.addSettingsChangeListener(st => { this.muted = !!(st && st.muteAudio); });
    } catch (e) { this.sdk = null; }
  },
  // Sur le site de CrazyGames (ou en test local avec le SDK)
  get live() { return !!this.sdk; },
  call(fn) { try { if (this.sdk) fn(this.sdk); } catch (e) { } },
  loadingStart() { this.call(s => s.game.loadingStart()); },
  loadingStop() { this.call(s => s.game.loadingStop()); },
  // À appeler quand le jeu tourne ou s'arrête (pause, menu, fenêtre)
  gameplay(on) { if (this.playing === on) return; this.playing = on; this.call(s => on ? s.game.gameplayStart() : s.game.gameplayStop()); },
  happy() { this.call(s => s.game.happytime()); },
  locale() { try { return (this.sdk && this.sdk.user.systemInfo.locale) || navigator.language || 'en'; } catch (e) { return navigator.language || 'en'; } },

  // ---------- Sauvegarde ----------
  getItem(k) {
    try { if (this.sdk && this.sdk.data) { const v = this.sdk.data.getItem(k); if (v != null) return v; } } catch (e) { }
    try { return localStorage.getItem(k); } catch (e) { return null; }
  },
  setItem(k, v) {
    try { if (this.sdk && this.sdk.data) { this.sdk.data.setItem(k, v); return; } } catch (e) { }
    try { localStorage.setItem(k, v); } catch (e) { }
  },
  removeItem(k) {
    try { if (this.sdk && this.sdk.data) this.sdk.data.removeItem(k); } catch (e) { }
    try { localStorage.removeItem(k); } catch (e) { }
  },

  // ---------- Publicités ----------
  canAd() { return !!(this.sdk && this.sdk.ad); },
  ad(type, onDone, onFail) {
    if (!this.canAd() || this.adOn) { if (onFail) onFail('unavailable'); return; }
    this.adOn = true; this.gameplay(false);
    const end = () => { this.adOn = false; };
    try {
      this.sdk.ad.requestAd(type, {
        adStarted: () => { this.adOn = true; },
        adFinished: () => { end(); if (type === 'midgame') this.lastAd = Date.now(); if (onDone) onDone(); },
        adError: err => { end(); if (onFail) onFail(err); },
      });
    } catch (e) { end(); if (onFail) onFail(e); }
  },
  // Une pub entre deux mois (au plus une toutes les 3 minutes, comme le demande CrazyGames)
  midgame() { if (this.canAd() && Date.now() - this.lastAd > 180e3) { this.lastAd = Date.now(); this.ad('midgame'); } },
  // Pub récompensée : on la propose au plus toutes les 4 minutes
  rewardReady() { return this.canAd() && Date.now() - this.lastReward > 240e3; },
  rewarded(onReward) {
    this.ad('rewarded', () => { this.lastReward = Date.now(); onReward(); }, () => toast('Pas de publicité disponible pour le moment. Réessayez plus tard !', 'bad'));
  },
};
