'use strict';
/* =====================================================================
   BANQUE TYCOON — l'agence vivante
   Les clients entrent, font la queue, vont au bon poste (guichet, bureau
   de crédit, distributeur), sont servis puis repartent. Chaque visite a
   un vrai effet : compte ouvert, carte vendue, prêt signé, fraude
   déjouée… Si la file est trop longue, ils repartent fâchés.
   Chaque poste se monte en niveau : il sert plus vite et vend mieux.
   ===================================================================== */

const AG = {}; // état en mémoire de chaque agence (non sauvegardé)
const ag = b => AG[b.id] || (ROOM_KINDS.forEach(k => { if (b[k] == null) b[k] = 0; }), AG[b.id] = { agents: [], busy: {}, pops: [], spawnAcc: 0, rateKey: '', rate: 0, day: { arr: 0, served: 0, lost: 0 } });

// Ce que veut chaque visiteur, le poste où il va et le temps qu'il y passe (en secondes)
const INTENTS = {
  compte: { ico: '🙋', st: 'g', t: 2, name: _t('Ouvrir un compte') },
  op: { ico: '💬', st: 'g', t: 1.4, name: _t('Une opération') },
  demande: { ico: '🗣️', st: 'g', t: 1.6, name: _t('Une demande') },
  reclam: { ico: '😠', st: 'g', t: 2, name: _t('Une réclamation') },
  suspect: { ico: '🕶️', st: 'g', t: 2.2, name: _t('Déposer du liquide') },
  pret: { ico: '🏠', st: 'b', t: 3.2, name: _t('Un crédit') },
  pro: { ico: '🏭', st: 'b', t: 3.8, name: _t('Un prêt pro') },
  av: { ico: '☂️', st: 'b', t: 2.6, name: _t('Placer son épargne') },
  dab: { ico: '🏧', st: 'dab', t: 0.9, name: _t('Retirer des billets') },
  coffre: { ico: '🔐', st: 'cof', t: 1.8, name: _t('Louer un coffre') },
  entreprise: { ico: '💼', st: 'ent', t: 3.4, name: _t('Un chef d’entreprise') },
  vip: { ico: '💎', st: 'vip', t: 3.8, name: _t('Un client fortuné') },
};
const DEF_INTENT = { g: 'op', b: 'pret', dab: 'dab', cof: 'coffre', ent: 'entreprise', vip: 'vip' };
const stCount = (b, k) => k === 'g' ? b.gs : k === 'b' ? b.bs : (b[k] || 0);

// ---------- Niveaux des postes ----------
const ST_MAX = 10;
const ST_NAME = { g: _t('Guichet'), b: _t('Bureau de crédit'), dab: _t('Distributeur'), cof: _t('Salle des coffres'), ent: _t('Espace entreprises'), vip: _t('Salon VIP') };
const ST_ICO = { g: '🪟', b: '🗂️', dab: '🏧', cof: '🔐', ent: '🏢', vip: '🥂' };
const stLv = (b, k, i) => (b.lv && b.lv[k] && b.lv[k][i]) || 1;
const stCost = (b, k, lv) => Math.round(itemCost(b, k) * 0.3 * Math.pow(1.65, lv - 1) / 100) * 100;
function stTime(b, k, i, intent) { // durée moyenne d'un rendez-vous à ce poste
  let m = Math.pow(0.88, stLv(b, k, i) - 1);
  if (k === 'g' || k === 'b') { const e = staffOf(b, k + 's')[i]; if (e) m /= empEff(e); }
  return INTENTS[intent || DEF_INTENT[k]].t * m;
}
function upgradeStation(b, k, i) {
  const lv = stLv(b, k, i); if (lv >= ST_MAX) return false;
  const cost = stCost(b, k, lv);
  if (S.cash < cost) return toast(_t('Liquidités insuffisantes'), 'bad'), false;
  S.cash -= cost; S.fixed = (S.fixed || 0) + cost;
  b.lv = b.lv || {}; b.lv[k] = b.lv[k] || []; b.lv[k][i] = lv + 1;
  const sl = blay(b)[k][i];
  ag(b).pops.push({ x: sl.x, y: sl.y, z: 1.8, t: 1.8, txt: _l`⬆ Niveau ${lv + 1}`, col: '#a5f3fc', big: true });
  SFX.play('build'); gainXP(S, 10 + lv * 4); funHUD();
  log(_l`⬆️ ${CITIES[b.id].name} : ${ST_NAME[k].toLowerCase()} ${i + 1} passe au niveau ${lv + 1} (${money(cost)}).`);
  return true;
}

// ---------- Arrivées ----------
function pickIntent(s, b, mine) {
  const c = Math.min(1, mine.length / 20), r = Math.random();
  if (b.vip && chance(0.04 + s.reputation / 2500)) return 'vip';
  if (b.ent && chance(0.1)) return 'entreprise';
  if (b.cof && mine.length > 10 && chance(0.07)) return 'coffre';
  if (b.dab && r < 0.1 + 0.12 * c) return 'dab';
  if (b.bs && loansOpen(s) && r < 0.32) return chance(0.35) || mine.length < 5 ? 'pro' : 'pret'; // les demandes de crédit
  if (b.gs && mine.length > 3 && r < 0.6) return 'op';
  let k = pickKind(s, b, mine.length);
  if (INTENTS[k].st === 'b' && !b.bs) k = mine.length > 3 ? 'op' : 'compte';
  if (INTENTS[k].st === 'g' && !b.gs) k = b.bs && loansOpen(s) ? 'pret' : 'dab';
  if (k === 'dab' && !b.dab) return null;
  return k;
}
function spawnRate(s, b, A) {
  const key = `${s.day}|${b.gs}|${b.bs}|${b.dab}|${Math.round(s.reputation)}`;
  if (A.rateKey !== key) { A.rateKey = key; A.rate = (b.gs || b.bs || b.dab) ? dayArrivals(s, b) * (0.85 + 0.08 * (b.g + b.b + b.dab) + 0.12 * ((b.cof || 0) + (b.ent || 0) + (b.vip || 0))) + (b.dab ? 1.5 : 0) : 0; } // une agence bien équipée attire du monde
  return A.rate / (DAY_MS / 1000);
}

// ---------- La simulation, image par image ----------
function agencyTick(s, dt) { for (const b of s.branches) branchTick(s, b, dt); }
function branchTick(s, b, dt) {
  const A = ag(b), lay = blay(b);
  A.spawnAcc += dt * spawnRate(s, b, A);
  while (A.spawnAcc >= 1) {
    A.spawnAcc -= 1;
    const mine = branchPeople(s, b.id), intent = pickIntent(s, b, mine);
    if (!intent) continue;
    s.today.arrived++; A.day.arr++;
    if (A.agents.length >= 22) { s.today.lost++; A.day.lost++; continue; } // salle pleine
    const l = chance(0.5);
    A.agents.push(newPerson({ x: l ? -1.5 : lay.W + 1.5, y: lay.D + 1.8, path: [lay.porch.slice(), lay.entry.slice()], st: 'in', intent, sp: rnd(2.6, 3.3), pat: 9 + b.deco * 0.8 + (b.vig ? 0.5 : 0) }));
  }
  const move = a => {
    if (!a.path.length) return true;
    const [tx, ty] = a.path[0], dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy), step = a.sp * dt;
    a.walk += step * 2.2;
    if (d <= step) { a.x = tx; a.y = ty; a.path.shift(); } else { a.x += dx / d * step; a.y += dy / d * step; }
    return !a.path.length;
  };
  // File d'attente : chacun attend son type de poste
  const queue = A.agents.filter(a => a.st === 'queue');
  queue.forEach((a, k) => {
    a.wait += dt; a.path = [lay.queue[Math.min(k, lay.queue.length - 1)].slice()];
    if (a.wait > a.pat * 0.6 && !a.emote) { a.emote = '…'; a.emoteT = 99; }
  });
  for (const a of queue) {
    if (assign(a, b, lay, A)) { if (a.emote === '…') a.emote = null; continue; }
    if (a.wait > a.pat) { leaveBank(a, lay, true); s.today.lost++; A.day.lost++; b.sat = clamp(b.sat - 0.15, 0, 100); }
  }
  for (const a of A.agents) {
    if (a.emoteT) { a.emoteT -= dt; if (a.emoteT <= 0) { a.emote = null; a.emoteT = 0; } }
    if (!move(a)) continue;
    if (a.st === 'in') { if (!assign(a, b, lay, A)) { a.st = 'queue'; a.wait = 0; } }
    else if (a.st === 'go') { a.st = 'serve'; a.serveTot = a.serve; }
    else if (a.st === 'serve') {
      a.serve -= dt;
      if (a.serve <= 0) {
        delete A.busy[a.slot];
        completeVisit(s, b, a, lay, A);
        if (chance(0.2 + b.deco * 0.06)) { a.emote = '❤'; a.emoteT = 1.6; }
        leaveBank(a, lay, false);
      }
    } else if (a.st === 'out') a.gone = true;
  }
  A.agents = A.agents.filter(a => !a.gone);
  for (const k in A.busy) if (!A.agents.includes(A.busy[k])) delete A.busy[k];
  A.pops.forEach(p => { p.t -= dt; p.z += dt * 0.7; });
  A.pops = A.pops.filter(p => p.t > 0);
}
function assign(a, b, lay, A) {
  const k = INTENTS[a.intent].st, n = stCount(b, k);
  for (let i = 0; i < n; i++) {
    if (A.busy[k + i]) continue;
    const [tx, ty] = lay[k][i].cli;
    A.busy[k + i] = a; a.slot = k + i; a.k = k; a.idx = i;
    a.path = [[lay.mid, ty + (k === 'b' ? 0 : 0.15)], [tx, ty]]; a.st = 'go';
    a.serve = stTime(b, k, i, a.intent) * rnd(0.8, 1.2);
    return true;
  }
  return false;
}
function leaveBank(a, lay, angry) {
  a.st = 'out'; a.angry = angry; a.intent = angry ? a.intent : null;
  if (angry) { a.emote = '💢'; a.emoteT = 2.5; }
  a.path = [[lay.mid, a.y], lay.entry.slice(), lay.porch.slice(), [chance(0.5) ? -2 : lay.W + 2, lay.D + 1.7]];
}

// ---------- Ce que rapporte une visite ----------
function completeVisit(s, b, a, lay, A) {
  A.day.served++; s.today.served = (s.today.served || 0) + 1;
  const lv = stLv(b, a.k, a.idx);
  ui.teamQ = clamp(teamQ(s, b) + 0.03 * (lv - 1), 0, 0.95);
  ui.stBonus = 1 + 0.1 * (lv - 1); ui.stLv = lv;
  const t0 = { ...s.today.tally }, mine = branchPeople(s, b.id);
  let txt = null, col = '#fbbf24';
  try {
    if (INTENTS[a.intent].st === 'cof' || INTENTS[a.intent].st === 'ent' || INTENTS[a.intent].st === 'vip') [txt, col] = roomVisit(s, b, a.intent, mine);
    else if (a.intent === 'dab') { s.cash += 1.5; s.flags.mExtraFees = (s.flags.mExtraFees || 0) + 1.5; txt = '+1,5 €'; }
    else if (a.intent === 'op') { const p = mine.length ? pick(mine) : null; txt = p ? opVisit(s, p) : null; }
    else { const c = makeCard(s, b, a.intent, mine); if (c) [txt, col] = processVisit(s, b, c); }
  } finally { ui.stBonus = 1; ui.stLv = 1; }
  const tl = s.today.tally;
  if (!txt && tl.comptes > t0.comptes) txt = _t('+1 client');
  if (tl.ventes > t0.ventes) { txt = txt && !txt.startsWith(_t('+1 client')) ? txt : (txt ? txt + ' · ' : '') + _t('💳 Vente'); col = '#86efac'; }
  const sl = lay[a.k] && lay[a.k][a.idx];
  if (txt && sl) { A.pops.push({ x: sl.x, y: sl.y, z: 1.9, t: 1.7, txt, col }); }
  if (tl.prets > t0.prets || tl.ventes > t0.ventes) SFX.play('coin');
}
// Un client déjà chez vous vient pour une opération : votre guichetier tente une vente
function opVisit(s, p) {
  const up = upsellChance(s, false);
  if (s.prod.carte.on && !p.c && chance(Math.min(0.9, up * 1.1))) { p.c = 1; s.today.tally.ventes++; recomputeAgg(s); return _t('💳 Carte vendue'); }
  if (s.prod.liv.on && p.l == null && p.b > 1500 && chance(Math.min(0.9, up * livChance(s) * 1.2))) { const m = Math.round(p.b * rnd(0.3, 0.6)); p.b -= m; p.l = m; s.today.tally.ventes++; recomputeAgg(s); return _t('🐷 Livret ouvert'); }
  if (s.prod.carte.on && p.c === 1 && pinc(p) > 3500 && chance(up * 0.4)) { p.c = 2; s.today.tally.ventes++; recomputeAgg(s); return _t('✨ Carte Gold'); }
  p.q = clamp(p.q + 1, 0, 100);
  const fee = Math.round((4 + Math.random() * 4) * (ui.stBonus || 1)); // virement, chèque de banque, remise d’espèces…
  s.cash += fee; s.flags.mExtraFees = (s.flags.mExtraFees || 0) + fee;
  return `+${fee} €`;
}
function processVisit(s, b, c) {
  if ((c.kind === 'pret' || c.kind === 'pro') && c.req) {
    const deskLoans = (s.inbox || []).filter(x => !x.done && (x.kind === 'pret' || x.kind === 'pro')).length;
    if (c.req.amount <= seuil(s) || deskLoans >= 2) {
      const sum = { prets: 0, pretAmt: 0, refus: 0, fraud: 0 };
      advisorLoan(s, c, sum, ui.teamQ);
      if (sum.prets) return [_l`🤝 Prêt ${money(sum.pretAmt)}`, '#86efac'];
      if (sum.fraud) return [_t('🕵️ Escroc démasqué'), '#a5f3fc'];
      return [_t('✋ Prêt refusé'), '#cbd5e1'];
    }
    toDesk(s, c); return [_t('📥 Pour vous'), '#fde68a'];
  }
  if (escalate(s, c)) { c.esc = 1; toDesk(s, c); return [_t('📥 Pour vous'), '#fde68a']; }
  const tr0 = s.stats.tracfin || 0;
  resolveCard(s, c, delegateChoice(s, c), false);
  if (c.kind === 'suspect') return (s.stats.tracfin || 0) > tr0 ? [_t('🕵️ Fraudeur signalé'), '#a5f3fc'] : [_t('🚫 Refusé'), '#cbd5e1'];
  if (c.kind === 'reclam') return [_t('😌 Client calmé'), '#e9d5ff'];
  if (c.kind === 'av') return [_t('☂️ Épargne placée'), '#86efac'];
  if (c.kind === 'demande') return ['✓', '#86efac'];
  return [null, null];
}
// Les salles spéciales : coffres, entreprises, clients fortunés
const fees = (s, v) => { v = Math.round(v * (ui.stBonus || 1)); s.cash += v; s.flags.mExtraFees = (s.flags.mExtraFees || 0) + v; return v; };
function roomVisit(s, b, intent, mine) {
  const big = Math.max(1, loanScale(s));
  if (intent === 'coffre') { const v = fees(s, rnd(120, 260)); s.stats.coffres = (s.stats.coffres || 0) + 1; return [_l`🔐 Coffre loué +${money(v)}`, '#fde68a']; }
  if (intent === 'entreprise') {
    const r = Math.random();
    if (r < 0.45) { // un compte pro : l'entreprise dépose sa trésorerie
      const amt = Math.round(rnd(20, 150) * big) * 1000; s.depX = (s.depX || 0) + amt; s.cash += amt; s.flags.entAcc = (s.flags.entAcc || 0) + 1; recomputeAgg(s);
      return [_l`🏢 Compte pro +${money(amt)}`, '#93c5fd'];
    }
    if (r < 0.75) { const c = makeCard(s, b, 'pro', mine); if (c) return processVisit(s, b, c); }
    const v = fees(s, rnd(150, 600)); return [_l`💱 Commission +${money(v)}`, '#86efac']; // change de devises, affacturage…
  }
  // salon VIP
  const r = Math.random();
  if (r < 0.5) {
    const amt = Math.round(rnd(60, 400) * big) * 1000, p = newPersonFor(s, b);
    p.j = 12; p.s = rint(10, 30) * 1000; p.sp = Math.round(p.s * 0.4); p.b = Math.round(amt * 0.1); p.save0 = Math.round(amt * 0.9); p.q = 90; p.c = 2;
    if (s.prod.av.on) { const sv = p.save0; openPersonAccount(s, p); p.a = sv; } // l’assurance-vie est gérée hors bilan : la banque touche des frais dessus
    else if (s.prod.liv.on) openPersonAccount(s, p, { livret: true });
    else { const sv = p.save0; openPersonAccount(s, p); p.b += sv; s.cash += sv; }
    p.c = 2; recomputeAgg(s); s.today.tally.comptes++;
    return [_l`💎 +${money(amt)} confiés`, '#fde68a'];
  }
  if (r < 0.8) { const v = fees(s, rnd(500, 2000)); return [_l`🥂 Honoraires +${money(v)}`, '#fde68a']; }
  // un très gros crédit : c'est vous qui signez
  const req = makeRequest(s, 'immo');
  Object.assign(req, { name: pname(newPersonFor(s, b)), amount: Math.round(rnd(300, 1200) * big) * 1000, score: rint(720, 820), fraud: false, apport: 0.3, reason: pick([_t('une villa avec vue sur la mer'), _t('un vignoble dans l’Hérault'), _t('un hôtel particulier'), _t('un chalet à Megève')]) });
  req.income = Math.round(payment(req.amount, req.offer, req.dur) / 0.22 / 10) * 10; req.branch = b.id;
  toDesk(s, { id: ++ui.cardSeq, kind: 'pret', branch: b.id, name: req.name, req, vip: 1 });
  return [_t('📥 Gros dossier pour vous'), '#fde68a'];
}

// Un dossier important arrive sur votre bureau (sans arrêter le jeu)
function toDesk(s, c) {
  c.exp = s.day + (c.kind === 'pret' || c.kind === 'pro' ? 7 : 6);
  s.inbox = (s.inbox || []).filter(x => !x.done);
  s.inbox.push(c);
  while (s.inbox.length > MAX_INBOX) { expireCard(s, s.inbox[0]); s.inbox = s.inbox.filter(x => !x.done); }
  s.today.cards = s.inbox; s.today.total = s.inbox.length;
  SFX.play('notify'); ui.dirty = true;
}

// ---------- Fin de journée : on fait les comptes de chaque agence ----------
function agencyDayEnd(s) {
  for (const b of s.branches) {
    const A = ag(b), d = A.day;
    if (d.arr) b.svc = (b.svc == null ? 1 : b.svc) * 0.85 + 0.15 * Math.min(1, d.served / d.arr);
    b.mServed = (b.mServed || 0) + d.served; b.mLost = (b.mLost || 0) + d.lost;
    A.day = { arr: 0, served: 0, lost: 0 };
  }
}

// ---------- Fenêtre d'un poste (clic sur le plan) ----------
function showStPop(b, k, i, x, y) {
  const lv = stLv(b, k, i), people = k === 'g' || k === 'b', staffed = !people || i < b[k + 's'], e = people && staffOf(b, k + 's')[i];
  const cost = lv < ST_MAX ? stCost(b, k, lv) : 0;
  let el = $('#stpop'); if (!el) { el = document.createElement('div'); el.id = 'stpop'; document.body.appendChild(el); }
  el.dataset.k = k; el.dataset.i = i; el.dataset.b = b.id;
  el.innerHTML = _l`<button class="sp-x" data-act="stClose" aria-label="Fermer">×</button>
    <div class="sp-h"><span class="sp-ico">${ST_ICO[k]}</span><div><b>${ST_NAME[k]}${k === 'g' || k === 'b' || stCount(b, k) > 1 ? ' ' + (i + 1) : ''}</b><small>Niveau ${lv} / ${ST_MAX}</small></div></div>
    ${ROOM_KINDS.includes(k) ? `<p class="small muted">${ITEMS[k].desc}</p>` : ''}${e ? _l`<p class="sp-emp">${avatar(e, 28)}<span><b>${esc(e.name)}</b><small>${empTitle(e)} · niveau ${e.lvl}</small></span></p>` : people && !staffed ? _l`<p class="sp-warn">Personne ne travaille ici.</p><button class="btn success full" data-act="stHire">Embaucher · ${money(itemCost(b, k + 's'))}</button>` : ''}
    <div class="sp-stats"><span>⏱ Temps par client</span><b>${nf1.format(stTime(b, k, i))} s</b>${k !== 'dab' ? `<span>${k === 'b' ? _t('📈 Marge sur les prêts') : k === 'g' ? _t('💳 Ventes et commissions') : _t('💰 Revenus par visite')}</span><b>+${k === 'b' ? nf1.format(0.1 * (lv - 1)) + ' pt' : Math.round(0.1 * (lv - 1) * 100) + ' %'}</b>` : ''}</div>
    ${lv < ST_MAX ? _l`<button class="btn gold full" data-act="stUp" ${S.cash < cost ? 'disabled' : ''}>⬆ Niveau ${lv + 1} · ${money(cost)}<small>−12 % de temps${k === 'g' ? _t(', +10 % de ventes et commissions') : k === 'b' ? _t(', +0,1 pt de marge sur les prêts') : k === 'dab' ? '' : _t(', +10 % de revenus')}</small></button>` : _t('<p class="center gold-t"><b>Niveau maximum !</b></p>')}`;
  el.hidden = false;
  const w = 260, h = el.offsetHeight || 220;
  el.style.left = clamp(x - w / 2, 8, innerWidth - w - 8) + 'px';
  el.style.top = clamp(y - h - 16, 8, innerHeight - h - 8) + 'px';
}
function hideStPop() { const el = $('#stpop'); if (el) el.hidden = true; }

Object.assign(actions, {
  stClose: () => hideStPop(),
  stUp: () => {
    const el = $('#stpop'), b = getBranch(S, el.dataset.b), k = el.dataset.k, i = +el.dataset.i;
    if (upgradeStation(b, k, i)) { renderTop(); const r = el.getBoundingClientRect(); showStPop(b, k, i, r.left + r.width / 2, r.bottom + 16); ui.dirty = true; }
  },
  stHire: () => { const el = $('#stpop'); ui.branch = el.dataset.b; hideStPop(); doBuild(el.dataset.k + 's'); },
});
document.addEventListener('pointerdown', e => { const el = $('#stpop'); if (el && !el.hidden && !el.contains(e.target) && !(e.target.id === 'floor')) hideStPop(); });
