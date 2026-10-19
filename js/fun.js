'use strict';
/* =====================================================================
   BANQUE TYCOON — le fun : niveau du banquier, atouts à choisir, combos,
   étoiles de la journée, coffres, bonus quotidien et effets visuels
   ===================================================================== */

function M(s) {
  if (!s.meta) s.meta = { lvl: 1, xp: 0, perks: {}, stars: 0, chests: 0, streak: 0, best: 0, pendingPerk: 0, login: null, opened: 0 };
  return s.meta;
}
const xpFor = l => Math.round(110 * Math.pow(l, 1.7));
const perk = (s, k) => (s && s.meta && s.meta.perks[k]) || 0;
const CHEST_STARS = 12;
const primeAmt = s => Math.round(Math.max(5000, equity(s) * 0.02) / 500) * 500;

// ---------- Atouts ----------
const PERKS = {
  vendeur: { ico: '💼', name: _t('Vendeur né'), txt: () => _t('+12 % de chances de vendre une carte, un livret ou la Gold'), max: 5 },
  aimant: { ico: '🧲', name: _t('Bouche-à-oreille'), txt: () => _t('+1 visiteur par jour dans chaque agence'), max: 5 },
  chasseur: { ico: '🎯', name: _t('Chasseur de primes'), txt: () => _t('Objectif du jour : récompense +50 %'), max: 4 },
  negociateur: { ico: '🤝', name: _t('Négociateur'), txt: () => _t('Les emprunteurs acceptent un taux 0,2 point plus haut'), max: 4 },
  fidelite: { ico: '💞', name: _t('Clients fidèles'), txt: () => _t('15 % de départs en moins chaque mois'), max: 4 },
  sangfroid: { ico: '⏱️', name: _t('Sang-froid'), txt: () => _t('Vos combos durent 3 secondes de plus'), max: 3 },
  etoile: { ico: '🌟', name: _t('Chouchou du siège'), txt: () => _t('+1 étoile bonus pour chaque journée parfaite'), max: 2 },
  prime: { ico: '💰', name: _t('Prime du siège'), txt: s => _l`${money(primeAmt(s))} tout de suite`, max: 99, once: true },
  tele: { ico: '📺', name: _t('Passage au JT'), txt: () => _t('+6 de réputation tout de suite'), max: 99, once: true },
  mentor: { ico: '🎓', name: _t('Mentor'), txt: () => _t('Toute votre équipe gagne 40 points d’expérience'), max: 99, once: true },
};
function applyPerk(s, k) {
  const m = M(s);
  m.perks[k] = (m.perks[k] || 0) + 1;
  if (k === 'prime') s.cash += primeAmt(s);
  if (k === 'tele') s.reputation = clamp(s.reputation + 6, 0, 100);
  if (k === 'mentor') for (const b of s.branches) for (const e of b.staff || []) if (e.lvl < MAX_LVL) e.xp = Math.min(xpNeed(e.lvl), e.xp + 40);
}
function perkChoices(s) {
  const pool = Object.keys(PERKS).filter(k => perk(s, k) < PERKS[k].max);
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
function showPerkModal() {
  const s = S, m = M(s);
  ui.perkChoices = perkChoices(s); ui.modal = true;
  showModal(_l`<div class="lvup"><div class="lvup-badge">${m.lvl}</div><h2>Niveau ${m.lvl} !</h2><p class="center muted">Choisissez un atout. Il reste pour toute la partie.</p>
    <div class="perks">${ui.perkChoices.map(k => { const P = PERKS[k], l = perk(s, k); return `<button class="perk" data-act="perk" data-k="${k}"><span class="pk-ico">${P.ico}</span><b>${P.name}</b><small>${P.txt(s)}</small>${!P.once ? `<span class="pk-lv">${'●'.repeat(l)}${'○'.repeat(Math.min(5, P.max) - l)}</span>` : ''}</button>`; }).join('')}</div></div>`, true);
  SFX.play('level'); confetti(80);
}
function showMyPerks() {
  const s = S, m = M(s), own = Object.keys(m.perks).filter(k => !PERKS[k].once);
  ui.modal = true;
  showModal(_l`<div class="m-ico">🏅</div><h2>Banquier niveau ${m.lvl}</h2>
    <div class="xpbar big"><i style="width:${Math.min(100, m.xp / xpFor(m.lvl) * 100)}%"></i></div><p class="center small muted">${nf0.format(m.xp)} / ${nf0.format(xpFor(m.lvl))} XP · traitez les clients vous-même et enchaînez les combos pour progresser</p>
    <div class="kpis fk">${[[_t('⭐ Étoiles'), nf0.format(m.stars % CHEST_STARS) + ' / ' + CHEST_STARS], [_t('🎁 Coffres ouverts'), m.opened], [_t('🔥 Série'), m.streak + ' j'], [_t('🏆 Meilleur combo'), 'x' + (m.best || 0)]].map(([a, b]) => `<div class="kpi"><small>${a}</small><b>${b}</b></div>`).join('')}</div>
    <h3 class="sec">Vos atouts</h3>${own.length ? `<div class="perks small">${own.map(k => `<div class="perk owned"><span class="pk-ico">${PERKS[k].ico}</span><b>${PERKS[k].name} ${m.perks[k] > 1 ? '×' + m.perks[k] : ''}</b><small>${PERKS[k].txt(s)}</small></div>`).join('')}</div>` : _t('<p class="muted center">Aucun pour l’instant : gagnez un niveau pour en choisir un.</p>')}
    <div class="choices"><button class="btn primary" data-act="closeModal">Fermer</button></div>`);
}

// ---------- Expérience ----------
function gainXP(s, n) {
  const m = M(s);
  m.xp += n;
  while (m.xp >= xpFor(m.lvl)) { m.xp -= xpFor(m.lvl); m.lvl++; m.pendingPerk++; }
}

// ---------- Combos ----------
const comboMul = n => 1 + 0.125 * (Math.min(n, 9) - 1);
function bumpCombo(s) {
  const now = Date.now(), c = ui.combo || (ui.combo = { n: 0, until: 0 });
  c.n = now < c.until ? c.n + 1 : 1;
  const dur = (7 + 3 * perk(s, 'sangfroid')) * 1000;
  c.until = now + dur;
  const m = M(s); if (c.n > (m.best || 0)) m.best = c.n;
  renderCombo(dur);
  if (c.n >= 2) SFX.play('combo', c.n);
  return c.n;
}
function renderCombo(dur) {
  let el = $('#combo');
  if (!el) { el = document.createElement('div'); el.id = 'combo'; document.body.appendChild(el); }
  const n = ui.combo.n;
  if (n < 2) { el.hidden = true; return; }
  el.hidden = false;
  el.className = n >= 8 ? 'hot3' : n >= 5 ? 'hot2' : 'hot1';
  el.innerHTML = _l`<b>COMBO x${Math.min(n, 99)}${n > 99 ? '+' : ''}</b><small>XP ×${nf2.format(comboMul(n)).replace(',00', '')}</small><i style="animation-duration:${dur}ms"></i>`;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(ui.comboT); ui.comboT = setTimeout(() => { el.hidden = true; }, dur);
}

// ---------- Effets visuels ----------
function floatText(x, y, text, cls = '') {
  if (reduceMotion()) return;
  const el = document.createElement('div');
  el.className = 'fx-float ' + cls; el.innerHTML = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 1300);
}
function coinBurst(x, y, n = 8, target = '#tbCash') {
  if (reduceMotion()) return;
  const t = $(target), r = t && t.getBoundingClientRect();
  if (!r || !r.width) return;
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div'); el.className = 'fx-coin'; el.textContent = '🪙';
    el.style.left = x + 'px'; el.style.top = y + 'px';
    document.body.appendChild(el);
    const dx = rnd(-60, 60), dy = rnd(-70, -20), delay = i * 40;
    el.animate([
      { transform: _t('translate(0,0) scale(.6)'), opacity: 1 },
      { transform: _l`translate(${dx}px,${dy}px) scale(1.1)`, opacity: 1, offset: 0.35 },
      { transform: _l`translate(${r.left + r.width / 2 - x}px,${r.top + r.height / 2 - y}px) scale(.5)`, opacity: 0.9 },
    ], { duration: 750, delay, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' });
    setTimeout(() => { el.remove(); if (i === n - 1) { t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump'); SFX.play('coin'); } }, 760 + delay);
  }
}
function shake() { if (reduceMotion()) return; const p = $('#panel'); p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); }
// Les compteurs du haut défilent au lieu de sauter
function setNum(el, v) {
  if (el._target === v) return;
  const from = el._target == null || reduceMotion() ? v : (el._shown ?? v);
  el._target = v;
  if (from === v) { el._shown = v; el.textContent = money(v); return; }
  const t0 = performance.now(), d = 700;
  if (v > from) { el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); }
  const step = now => {
    if (el._target !== v) return;
    const k = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - k, 3);
    el._shown = from + (v - from) * e; el.textContent = money(el._shown);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- Après chaque décision prise vous-même ----------
function funCard(s, c, before, el) {
  const t = s.today, a = t.tally, m = M(s);
  t.manual = (t.manual || 0) + 1;
  const n = bumpCombo(s);
  const dComptes = a.comptes - before.comptes, dVentes = a.ventes - before.ventes, dPrets = a.prets - before.prets;
  const base = c.task ? 25 : 35;
  m.stars++; if (m.stars % CHEST_STARS === 0) m.chests++;
  const xp = Math.round((base + dComptes * 10 + dVentes * 14 + dPrets * 40) * comboMul(n));
  const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
  const x = r.left + r.width / 2, y = r.top;
  const lv = m.lvl;
  gainXP(s, xp);
  floatText(x, y - 10, _l`+${xp} XP`, 'xp');
  const tags = [];
  if (dComptes) tags.push(_t('+1 client 🙋'));
  if (dVentes) tags.push(_t('Vente ! 💳'));
  if (dPrets) tags.push(_t('Prêt signé ! 🤝'));
  tags.forEach((txt, i) => setTimeout(() => floatText(x, y - 40, txt, 'big'), 120 + i * 220));
  if (dVentes || dPrets) coinBurst(x, y, dPrets ? 14 : 8);
  else if (dComptes) coinBurst(x, y, 4);
  if (m.lvl > lv) floatText(innerWidth / 2, innerHeight / 3, _l`NIVEAU ${m.lvl} !`, 'huge');
  funHUD();
}

// ---------- Étoiles de la journée ----------
function starRules(s, t) {
  const tot = t.total || t.cards.length, man = t.manual || 0;
  return [
    [_t('Décider vous-même de tous les dossiers de votre bureau'), man >= tot],
    [_t('Réussir l’objectif du jour'), !!(t.obj && t.obj.done)],
    [_t('Assez de personnel : aucun visiteur reparti'), t.arrived > 0 && !t.lost],
  ];
}
function funEndDay(s, t) {
  if (!t || !(t.total || t.cards.length || t.arrived)) return;
  const m = M(s), rules = starRules(s, t);
  let st = rules.filter(r => r[1]).length;
  if (st === 3) st += perk(s, 'etoile');
  m.streak = st >= 2 ? m.streak + 1 : 0;
  const before = Math.floor(m.stars / CHEST_STARS);
  m.stars += st;
  const bonus = st ? Math.round(st * 10 * (1 + Math.min(m.streak, 10) * 0.1)) : 0;
  if (bonus) gainXP(s, bonus);
  m.chests += Math.floor(m.stars / CHEST_STARS) - before;
  dayBanner(st, bonus, m.streak);
}
function dayBanner(st, xp, streak) {
  const el = document.createElement('div'); el.className = 'daybanner';
  el.innerHTML = `<div class="db-stars">${[0, 1, 2].map(i => `<span class="${i < st ? 'on' : ''}" style="animation-delay:${0.15 + i * 0.22}s">★</span>`).join('')}${st > 3 ? _t('<span class="on bonus">★</span>') : ''}</div>
    <b>${st >= 3 ? _t('Journée parfaite !') : st === 2 ? _t('Belle journée !') : st === 1 ? _t('Journée correcte') : _t('Journée ratée…')}</b>
    <small>${xp ? _l`+${xp} XP` : _t('Aucune étoile : traitez vous-même vos clients')}${streak >= 2 ? _l` · 🔥 série de ${streak} jours` : ''}</small>`;
  document.body.appendChild(el); ui.bannerUntil = Date.now() + 2600;
  for (let i = 0; i < st; i++) setTimeout(() => SFX.play('star', i), 150 + i * 220);
  setTimeout(() => el.classList.add('out'), 2200); setTimeout(() => el.remove(), 2700);
}

// ---------- Coffres ----------
const RARITY = [
  ['commun', _t('Commun'), 0.6, '#94a3b8'], ['rare', _t('Rare'), 0.28, '#60a5fa'], ['epique', _t('Épique'), 0.1, '#c084fc'], ['legend', _t('Légendaire'), 0.02, '#fbbf24'],
];
function rollChest(s) {
  let r = Math.random(), k = 0;
  for (; k < RARITY.length - 1; k++) { r -= RARITY[k][2]; if (r < 0) break; }
  const eq = Math.max(5e5, equity(s)), lines = [];
  const cash = f => { const v = Math.round(eq * f / 100) * 100; s.cash += v; lines.push(`💰 ${money(v)}`); };
  if (k === 0) { const o = rint(0, 2); if (o === 0) cash(0.002); else if (o === 1) { s.reputation = clamp(s.reputation + 2, 0, 100); lines.push(_t('⭐ +2 réputation')); } else { gainXP(s, 60); lines.push(_t('✨ +60 XP')); } }
  if (k === 1) { cash(0.005); s.reputation = clamp(s.reputation + 2, 0, 100); lines.push(_t('⭐ +2 réputation')); }
  if (k === 2) { cash(0.01); vipClient(s, lines); }
  if (k === 3) { cash(0.03); vipClient(s, lines); M(s).pendingPerk++; lines.push(_t('🏅 Un atout gratuit')); }
  return { k, lines };
}
function vipClient(s, lines) {
  const b = s.branches[0]; if (!b) return;
  const p = newPersonFor(s, b); p.j = 8; p.s = rint(8, 14) * 1000; p.sp = Math.round(p.s * 0.45); p.b = p.s * rint(2, 5); p.save0 = p.s * rint(5, 15); p.q = 90;
  openPersonAccount(s, p, { card: true, livret: true }); p.c = 2; recomputeAgg(s);
  lines.push(_l`🤵 Client VIP : ${esc(pname(p))} (${money(p.b + (p.l || 0))} déposés)`);
}
function showChest() {
  ui.modal = true;
  showModal(_l`<div class="chest-wrap"><div class="chest">🎁</div><h2>Coffre gagné !</h2><p class="center muted">${CHEST_STARS} étoiles réunies. Qu’y a-t-il dedans ?</p>
    <div class="choices"><button class="btn gold big" data-act="openChest">Ouvrir le coffre</button></div></div>`, true);
  SFX.play('notify');
}
function openChest() {
  const s = S, m = M(s); if (m.chests <= 0) return closeModal();
  m.chests--; m.opened = (m.opened || 0) + 1;
  const { k, lines } = rollChest(s), [, name, , col] = RARITY[k];
  const box = $('#modal .chest'); if (box) box.classList.add('open');
  SFX.play('chest');
  setTimeout(() => {
    $('#modal .modal-box').innerHTML = _l`<div class="chest-wrap" style="--rar:${col}"><div class="chest done">${k >= 2 ? '💎' : k === 1 ? '🎉' : '✨'}</div><div class="rarity">${name}</div>
      <ul class="loot">${lines.map(l => `<li>${l}</li>`).join('')}</ul>
      <div class="choices"><button class="btn primary" data-act="closeModal">Super !</button></div></div>`;
    $('#modal').dataset.noclose = '';
    SFX.play(k >= 2 ? 'level' : 'good'); confetti(k >= 2 ? 140 : 50);
    renderTop(); funHUD();
  }, reduceMotion() ? 0 : 900);
}

// ---------- Bonus de connexion (un par vrai jour) ----------
const isoDay = d => d.toISOString().slice(0, 10);
function checkLogin(s) {
  const m = M(s), today = isoDay(new Date()), yest = isoDay(new Date(Date.now() - 864e5));
  if (m.login && m.login.d === today) return;
  const streak = m.login && m.login.d === yest ? m.login.n + 1 : 1;
  m.login = { d: today, n: streak, claimed: false };
  ui.loginPending = true;
}
function showLogin() {
  const s = S, m = M(s), n = m.login.n, amt = loginAmt(s, n);
  ui.modal = true;
  showModal(_l`<div class="m-ico">📅</div><h2>Bonus de connexion</h2><p class="center muted">Revenez chaque jour : la récompense grandit jusqu’au 7ᵉ jour.</p>
    <div class="login-days">${[1, 2, 3, 4, 5, 6, 7].map(d => _l`<div class="ld ${d < ((n - 1) % 7) + 1 ? 'past' : d === ((n - 1) % 7) + 1 ? 'now' : ''}"><small>Jour ${d}</small><b>${d === 7 ? '🎁' : '💰'}</b><span>${money(loginAmt(s, d))}</span></div>`).join('')}</div>
    <div class="choices"><button class="btn gold big" data-act="claimLogin">Récupérer ${money(amt)}${((n - 1) % 7) + 1 === 7 ? _t(' + un coffre') : ''}</button>${CG.canAd() ? _l`<button class="btn primary" data-act="claimLogin2">📺 Doubler avec une publicité : ${money(amt * 2)}</button>` : ''}</div>`, true);
}
const loginAmt = (s, n) => Math.round(Math.max(1000, Math.max(5e5, equity(s)) * 0.001) * (((n - 1) % 7) + 1) / 100) * 100;
function claimLogin(mult = 1) {
  const s = S, m = M(s), n = m.login.n, amt = loginAmt(s, n) * mult;
  if (m.login.claimed) return closeModal();
  m.login.claimed = true; s.cash += amt;
  if (((n - 1) % 7) + 1 === 7) m.chests++;
  const b = $('#modal [data-act=claimLogin]'), r = b && b.getBoundingClientRect();
  closeModal();
  if (r) coinBurst(r.left + r.width / 2, r.top, 12);
  renderTop(); save();
}

// ---------- Barre du banquier (en haut) ----------
function funHUD() {
  if (!S) return;
  const m = M(S);
  let el = $('#lvchip');
  if (!el) {
    el = document.createElement('button'); el.id = 'lvchip'; el.className = 'lvchip'; el.dataset.act = 'myPerks'; el.title = _t('Votre niveau, vos atouts et vos étoiles');
    $('.tb-date').after(el);
  }
  const key = [m.lvl, m.xp, m.stars, m.chests].join('|'); if (el._k === key) return; el._k = key;
  el.innerHTML = _l`<span class="lv">${m.lvl}</span><span class="lvtxt"><small>Banquier niv. ${m.lvl}</small><span class="xpbar"><i style="width:${Math.min(100, m.xp / xpFor(m.lvl) * 100)}%"></i></span></span><span class="chestp" title="Étoiles avant le prochain coffre">⭐ ${m.stars % CHEST_STARS}/${CHEST_STARS}</span>`;
}

Object.assign(actions, {
  perk: el => { const k = el.dataset.k; if (!ui.perkChoices || !ui.perkChoices.includes(k)) return; applyPerk(S, k); M(S).pendingPerk--; ui.perkChoices = null; closeModal(); toast(_l`${PERKS[k].ico} Atout obtenu : <b>${PERKS[k].name}</b>`, 'good'); renderTop(); renderPanel(true); funHUD(); save(); },
  myPerks: () => showMyPerks(),
  openChest: () => openChest(),
  claimLogin: () => claimLogin(),
  claimLogin2: () => CG.rewarded(() => claimLogin(2)),
});

// Touches 1 à 5 : choisir une réponse sur la première carte
document.addEventListener('keydown', e => {
  if (!S || ui.modal || e.target.matches('input,textarea,select') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!/^[1-5]$/.test(e.key) || ui.tab !== 'dash') return;
  const b = $$('.focus-card .cc-actions .btn')[+e.key - 1];
  if (b && !b.disabled) { e.preventDefault(); b.click(); }
});

// Boucle légère : niveaux, coffres et bonus à afficher dès qu'aucune fenêtre n'est ouverte
let funLast = null;
setInterval(() => {
  if (!S || $('#game').hidden) return;
  if (funLast !== S) { funLast = S; ui.combo = null; checkLogin(S); if (S.today) ui.cardSeq = Math.max(ui.cardSeq || 0, ...S.today.cards.map(c => +c.id || 0)); }
  funHUD();
  if (ui.modal || S.over || ui.bannerUntil > Date.now()) return;
  const m = M(S);
  if (ui.loginPending && m.login && !m.login.claimed && S.day > 0) { ui.loginPending = false; return showLogin(); }
  if (m.pendingPerk > 0) return showPerkModal();
  if (m.chests > 0) return showChest();
}, 400);
