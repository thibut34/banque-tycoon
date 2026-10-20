'use strict';
/* =====================================================================
   BANQUE TYCOON — intégration CrazyGames
   SDK v3 : chargement, début/pause de partie, moments forts, réglage
   « son coupé » du site, sauvegarde en ligne (module Data) et publicités.
   Hors de CrazyGames (GitHub Pages, ordinateur), tout se replie
   proprement sur le navigateur et le jeu marche sans publicité.
   ===================================================================== */

// Publicités : CrazyGames les interdit en « Basic Launch ». Passez à true seulement quand le jeu
// est sélectionné pour le « Full Launch » (CrazyGames vous le dira par e-mail).
const ADS_ENABLED = false;

const BIG = '__trop_gros__'; // marqueur : la sauvegarde est dans localStorage
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
  // Le SDK refuse deux signaux à moins d'une seconde d'écart : on n'envoie l'état qu'une fois stable
  gameplay(on) {
    this.want = on; if (!this.sdk || this.gpTimer) return;
    const send = () => {
      this.gpTimer = null;
      if (this.playing !== this.want) { this.playing = this.want; this.lastGp = Date.now(); this.call(s => this.playing ? s.game.gameplayStart() : s.game.gameplayStop()); }
    };
    const wait = 1100 - (Date.now() - (this.lastGp || 0));
    if (wait <= 0) send(); else this.gpTimer = setTimeout(send, wait);
  },
  happy() { this.call(s => s.game.happytime()); },
  locale() { try { return (this.sdk && this.sdk.user.systemInfo.locale) || navigator.language || 'en'; } catch (e) { return navigator.language || 'en'; } },

  // ---------- Sauvegarde ----------
  getItem(k) {
    try { if (this.sdk && this.sdk.data) { const v = this.sdk.data.getItem(k); if (v === BIG) return localStorage.getItem(k); if (v != null) return v; } } catch (e) { }
    try { return localStorage.getItem(k); } catch (e) { return null; }
  },
  setItem(k, v) {
    // CrazyGames refuse plus de 1 Mo : une très grosse partie reste alors dans le navigateur, et le module Data le note
    try { if (this.sdk && this.sdk.data) { if (v.length < 1e6 - 2e3) { this.sdk.data.setItem(k, v); return; } this.sdk.data.setItem(k, BIG); } } catch (e) { }
    try { localStorage.setItem(k, v); } catch (e) { }
  },
  removeItem(k) {
    try { if (this.sdk && this.sdk.data) this.sdk.data.removeItem(k); } catch (e) { }
    try { localStorage.removeItem(k); } catch (e) { }
  },

  // ---------- Publicités ----------
  canAd() { return ADS_ENABLED && !!(this.sdk && this.sdk.ad); },
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
    this.ad('rewarded', () => { this.lastReward = Date.now(); onReward(); }, () => toast(_t('Pas de publicité disponible pour le moment. Réessayez plus tard !'), 'bad'));
  },
};
