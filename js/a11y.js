'use strict';
/* =====================================================================
   BANQUE TYCOON — accessibilité, options et lexique
   Taille du texte, animations réduites, contraste élevé, mode daltonien,
   mode détente, et une explication simple de chaque terme bancaire.
   ===================================================================== */

const GLOSSARY = {
  equity: ['Fonds propres', 'C’est ce que vaut vraiment votre banque : tout ce que vous possédez (argent, prêts, actions) moins tout ce que vous devez (l’argent des clients, les dettes). S’ils passent sous zéro, c’est la faillite.'],
  cash: ['Liquidités', 'L’argent disponible tout de suite dans vos caisses. Il sert à prêter, à payer les salaires et à rendre leur argent aux clients qui le demandent. Sans liquidités, la banque centrale vous dépanne… à un taux pénalité.'],
  ratio: ['Ratio de solvabilité', 'Vos fonds propres divisés par vos prêts et placements risqués. Le régulateur exige au moins 8 % : c’est votre matelas de sécurité. En dessous, vous êtes surveillé ; 6 mois d’affilée et vous perdez votre licence.'],
  rep: ['Réputation', 'Ce que les gens pensent de votre banque. Elle attire les clients et les emprunteurs. Elle monte avec des clients bien servis et de bonnes actions, et baisse avec les scandales et les frais trop élevés.'],
  rank: ['Classement', 'Votre place parmi les grandes banques du monde, selon les fonds propres. Le but ultime : devenir numéro 1.'],
  service: ['Clients servis / perdus', 'Chaque jour, des clients viennent dans l’agence. Si vous n’avez pas assez de guichetiers, de distributeurs ou de conseillers, une partie repart sans être servie : vous perdez des dépôts et de la satisfaction.'],
  grade: ['Note de crédit', 'La fiabilité de l’emprunteur, de A (très sûr) à E (très risqué). Un client noté D ou E fait souvent défaut : il faut lui prêter plus cher, ou refuser.'],
  rate: ['Taux d’intérêt', 'Le prix de l’argent prêté, en pourcentage par an. Plus il est élevé, plus vous gagnez… mais moins le client accepte, et plus il risque de ne pas rembourser.'],
  policy: ['Taux directeur', 'Le taux fixé par la banque centrale. Il influence tous les autres : quand il monte, les crédits et l’épargne coûtent plus cher.'],
  margin: ['Marge d’intérêt', 'Le cœur du métier : vous empruntez l’argent des clients pas cher (comptes, livrets) et vous le prêtez plus cher. La différence, c’est votre bénéfice.'],
  endet: ['Taux d’endettement', 'La part des revenus mensuels du client qui partira dans les mensualités. En France, la règle du HCSF interdit aux banques de prêter si elle dépasse 35 %. Plus elle est élevée, plus le client risque de ne pas pouvoir rembourser.'],
  apport: ['Apport personnel', 'La part du prix du logement que le client paie avec ses propres économies. Plus l’apport est élevé, moins le prêt est risqué, et plus vous récupérez d’argent si le client fait défaut (la maison est revendue).'],
  usure: ['Taux d’usure', 'Le taux maximal autorisé par la loi pour chaque type de crédit. Au-delà, prêter est illégal : vous ne pouvez pas le dépasser.'],
  fraud: ['Fraude', 'Certains emprunteurs sont des escrocs : ils disparaissent avec l’argent au bout de deux mois. Faites vérifier les dossiers douteux (🔎) avant de prêter, surtout s’ils acceptent n’importe quel taux.'],
};
const tip = k => GLOSSARY[k] ? `<button class="tip" data-act="tip" data-k="${k}" aria-label="Qu’est-ce que « ${GLOSSARY[k][0]} » ?">?</button>` : '';

function applyPrefs() {
  const reduce = prefs.calm != null ? prefs.calm : window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  root.classList.toggle('calm', !!reduce);
  root.classList.toggle('hc', !!prefs.contrast);
  root.classList.toggle('cb', !!prefs.cb);
  document.body.style.zoom = { l: 1.12, xl: 1.25 }[prefs.text] || '';
  if (S) drawCharts();
}
const reduceMotion = () => document.documentElement.classList.contains('calm');

function settingsHTML() {
  const seg = (k, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button data-act="setPref" data-k="${k}" data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const onoff = (k, cur) => seg(k, [['0', 'Non'], ['1', 'Oui']], cur ? '1' : '0');
  return `<div class="m-ico">⚙️</div><h2>Options</h2>
    <div class="opts">
      <div class="opt"><div><b>Taille du texte</b><small>Agrandit toute l’interface.</small></div>${seg('text', [['n', 'Normale'], ['l', 'Grande'], ['xl', 'Très grande']], prefs.text || 'n')}</div>
      <div class="opt"><div><b>Sons</b><small>Bruitages des actions et des alertes.</small></div>${seg('mute', [['0', 'Activés'], ['1', 'Coupés']], prefs.mute ? '1' : '0')}</div>
      <div class="opt"><div><b>Animations réduites</b><small>Moins de mouvements à l’écran.</small></div>${onoff('calm', reduceMotion())}</div>
      <div class="opt"><div><b>Contraste élevé</b><small>Textes et bordures plus marqués.</small></div>${onoff('contrast', prefs.contrast)}</div>
      <div class="opt"><div><b>Mode daltonien</b><small>Ajoute ▲ et ▼ aux gains et aux pertes.</small></div>${onoff('cb', prefs.cb)}</div>
      ${S ? `<div class="opt"><div><b>Mode détente</b><small>Pour cette partie : le régulateur patiente 12 mois, et l’État vous sauve une fois tous les 5 ans en cas de faillite.</small></div>${seg('easy', [['0', 'Non'], ['1', 'Oui']], S.flags.easy ? '1' : '0')}</div>` : ''}
    </div>
    <div class="choices"><button class="btn primary" data-act="closeModal">Fermer</button></div>`;
}
function openSettings() { ui.modal = true; showModal(settingsHTML()); }
function setPref(k, v) {
  if (k === 'easy') { if (S) { S.flags.easy = v === '1'; toast(S.flags.easy ? '🛟 Mode détente activé pour cette partie' : 'Mode détente désactivé', 'gold'); } }
  else if (k === 'text') prefs.text = v;
  else prefs[k] = v === '1';
  savePrefs(); applyPrefs();
  if (k === 'mute' && $('#muteBtn')) $('#muteBtn').innerHTML = ic(prefs.mute ? 'mute' : 'vol');
  showModal(settingsHTML());
}
function showTip(k) {
  const [t, d] = GLOSSARY[k] || ['', ''];
  ui.modal = true;
  showModal(`<div class="m-ico">📖</div><h2>${t}</h2><p class="center">${d}</p><div class="choices"><button class="btn primary" data-act="closeModal">Compris</button></div>`);
}
applyPrefs();
