'use strict';
/* =====================================================================
   BANQUE TYCOON — traduction (français / anglais)
   Le français est la langue d'origine du code. Chaque texte affiché passe
   par _t('…') ou le modèle _l`…` : en anglais, on cherche sa traduction
   dans EN_DICT (lang-en.js), sinon on garde le français.
   La langue suit le navigateur (anglais par défaut, comme le demande
   CrazyGames) et peut être changée dans les options.
   ===================================================================== */

const LANG = (() => {
  try { const p = JSON.parse(localStorage.getItem('banqueTycoon.prefs') || '{}'); if (p.lang === 'fr' || p.lang === 'en') return p.lang; } catch (e) { }
  return /^fr/i.test(navigator.language || '') ? 'fr' : 'en';
})();
document.documentElement.lang = LANG;
const TR = LANG === 'fr' ? null : (typeof EN_DICT !== 'undefined' ? EN_DICT : {});
const I18N_MISSING = new Set(); // pour repérer les textes oubliés pendant les tests

function _t(s) {
  if (!TR || typeof s !== 'string') return s;
  const v = TR[s];
  if (v == null) { I18N_MISSING.add(s); return s; }
  return v;
}
// Modèle traduit : les parties fixes forment la clé, les valeurs ${…} sont réinsérées.
// Une traduction peut réordonner les valeurs avec {0}, {1}…
function _l(strings, ...vals) {
  if (TR) {
    const key = strings.join('{}'), v = TR[key];
    if (v != null) { let i = 0; return v.replace(/\{(\d*)\}/g, (_, n) => { const k = n === '' ? i++ : +n; return k < vals.length ? String(vals[k]) : ''; }); }
    I18N_MISSING.add(key);
  }
  let o = strings[0];
  for (let i = 0; i < vals.length; i++) o += vals[i] + strings[i + 1];
  return o;
}
// Les textes écrits directement dans index.html
function i18nStatic(root) {
  if (!TR) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const k = n.nodeValue.trim(); if (!k || TR[k] == null || n.parentElement.closest('[data-brand]')) continue; // le nom du jeu ne se traduit pas
    n.nodeValue = n.nodeValue.replace(k, TR[k]);
  }
  for (const el of root.querySelectorAll('[title],[aria-label],[placeholder]')) for (const a of ['title', 'aria-label', 'placeholder']) {
    const k = el.getAttribute(a); if (k && TR[k] != null) el.setAttribute(a, TR[k]);
  }
  const d = document.querySelector('meta[name=description]'); if (d && TR[d.content]) d.content = TR[d.content];
}
i18nStatic(document.body);
