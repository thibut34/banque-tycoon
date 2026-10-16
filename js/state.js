'use strict';
/* =====================================================================
   BANQUE TYCOON — état de la partie et calculs financiers
   Le temps avance à vitesse fixe : 1 seconde = 1 jour, 30 jours = 1 mois.
   ===================================================================== */

let S = null;
const ui = { tab: 'dash', market: 'cac', tradeAmt: 100000, pointerDown: false, modal: false, dirty: true, event: null, acc: 0, toastKeys: {}, seen: new Set(), branch: HQ, region: 'france' };

function newBranch(id, o = {}) {
  return Object.assign({ id, size: 1, g: 0, gs: 0, b: 0, bs: 0, dab: 0, vig: 0, deco: 0, sat: 50, since: S ? S.day : 0 }, o);
}

function newState(name) {
  const market = {};
  for (const id in ASSETS) {
    const a = ASSETS[id]; const hist = [];
    let p = a.base;
    for (let i = 0; i < 90; i++) { p *= Math.exp(a.vol * gauss() + 0.0002 * a.beta); hist.push(p); }
    market[id] = { price: p, hist };
  }
  return {
    v: 2, name, day: 0, nextEmp: 0,
    cash: START.cash, deposits: 0, depCC: 0, depLiv: 0, depositRate: 1.5,
    prod: { cc: { on: false, fee: 3 }, liv: { on: false }, av: { on: false, fee: 1, aum: 0 }, carte: { on: false, fee: 45 } },
    loans: [], requests: [], nextId: 1,
    cbDebt: 0, policyRate: 3, rateHist: [3],
    economy: 'stable', econTimer: rint(8, 14), nextEcon: null,
    reputation: 50, surveillance: false, lowCap: 0,
    portfolio: {}, cost: {}, market,
    branches: [newBranch(HQ)], upgrades: {},
    fortune: 0, owned: [],
    history: [], lastPL: null, log: [],
    achievements: {}, flags: {},
    chapter: 0, challenge: null, nextChallenge: 150, tut: 0,
    auto: { on: false, min: 'B', margin: 0.5 },
    rivals: RIVALS.map(r => ({ id: r.id, eq: r.eq, hist: [r.eq] })),
    stats: { granted: 0, defaults: 0, refused: 0, crises: 0, interest: 0, bonus: 0, events: 0, souv: 0, challenges: 0, profit: 0, promos: 0 },
    over: false,
  };
}

// ---------- Agences ----------
const cityOf = b => CITIES[b.id];
const getBranch = (s, id) => s.branches.find(b => b.id === id);
const regionCount = (s, r) => s.branches.filter(b => CITIES[b.id].region === r).length;
const staffTotal = (s, k) => s.branches.reduce((a, b) => a + (b[k] || 0), 0);
const chapterIdx = s => s.chapter;
const regionUnlocked = (s, r) => s.chapter >= REGIONS[r].unlock;
function costMult(b) { const c = cityOf(b); return REGIONS[c.region].cost * (c.region === 'espace' ? 25 : 1); }
function wageMult(s, b) { return REGIONS[cityOf(b).region].wage * (s.upgrades.rh ? 0.85 : 1); }
const itemCost = (b, k) => (ITEMS[k].cost || ITEMS[k].hire) * costMult(b);
function sizeUpCost(b) { const n = SIZES[b.size + 1]; return n ? cityOf(b).build * n.cost : Infinity; }
const branchNeed = b => cityOf(b).traffic - 1; // guichetiers recommandés
function satTarget(s, b) {
  if (!b.gs && !b.bs && !b.dab) return 50;
  const svc = b.svc == null ? 1 : b.svc;
  return clamp(30 + 35 * svc - 40 * Math.max(0, 0.85 - svc) + 4 * b.deco + 3 * b.dab + (s.upgrades.rh ? 10 : 0) + staffSat(b), 5, 100);
}
function branchCap(b) { return cityOf(b).cap * (b.gs ? 0.25 + 0.3 * staffEff(b, 'gs') + 0.05 * b.dab : 0) * (0.8 + b.sat / 250) * (0.5 + 0.5 * (b.svc == null ? 1 : b.svc)) * (specOf(b).cap || 1); }
function branchLoanF(b) { return cityOf(b).loans * 0.45 * staffEff(b, 'bs') * (specOf(b).loans || 1); }
function branchCosts(s, b) {
  const w = wageMult(s, b);
  const wages = b.staff ? b.staff.reduce((a, e) => a + empWage(s, b, e), 0) : (b.gs * ITEMS.gs.wage + b.bs * ITEMS.bs.wage + b.vig * ITEMS.vig.wage) * w;
  return cityOf(b).rent + wages + b.dab * ITEMS.dab.maint;
}
const dabIncome = b => b.dab * cityOf(b).traffic * 1500;
function avgSat(s) {
  let t = 0, w = 0; for (const b of s.branches) { const k = cityOf(b).traffic; t += b.sat * k; w += k; }
  return w ? t / w : 50;
}

// ---------- Déblocages ----------
const itemUnlocked = k => !S || !ITEM_UNLOCK[k] || ITEM_UNLOCK[k](S);
const tabUnlocked = id => !S || (S.unlocked || []).includes(id);
function checkUnlocks(s, silent) {
  if (!s.unlocked) { s.unlocked = []; silent = true; }
  for (const [id, lb] of TABS) {
    if (s.unlocked.includes(id) || !TAB_UNLOCK[id](s)) continue;
    s.unlocked.push(id);
    if (!silent) { s.newTabs = [...(s.newTabs || []), id]; toast(`🔓 Nouvel onglet : <b>${lb}</b><br><small>${TAB_HINT[id] || ''}</small>`, 'gold'); }
    ui.tabsKey = null;
  }
  if (!s.unlockedItems) { s.unlockedItems = Object.keys(ITEM_UNLOCK).filter(k => ITEM_UNLOCK[k](s)); return; }
  for (const k in ITEM_UNLOCK) {
    if (s.unlockedItems.includes(k) || !ITEM_UNLOCK[k](s)) continue;
    s.unlockedItems.push(k);
    toast(`🔓 Nouveau dans « Ma banque » : <b>${k === 'size' ? 'agrandir vos agences' : ITEMS[k].name}</b>`, 'gold');
  }
}

// ---------- Classement ----------
function rankOf(s) { const eq = equity(s); return 1 + s.rivals.filter(r => !r.gone && r.eq > eq).length; }

// ---------- Calculs financiers ----------
const loansOut = s => s.loans.reduce((a, l) => a + l.out, 0);
function holdingValue(s, id) { return (s.portfolio[id] || 0) * s.market[id].price; }
function portfolioValue(s) { let v = 0; for (const id in s.portfolio) v += holdingValue(s, id); return v; }
const equity = s => s.cash + loansOut(s) + portfolioValue(s) - s.deposits - s.cbDebt;
const loanRW = l => l.rw != null ? l.rw : LOAN_TYPES[l.type].rw;
function rwa(s) {
  let r = 0;
  for (const l of s.loans) r += l.out * loanRW(l);
  for (const id in s.portfolio) r += holdingValue(s, id) * ASSETS[id].rw;
  return r;
}
function capRatio(s) { const r = rwa(s); return r < 1 ? Infinity : equity(s) / r * 100; }
const minRatio = s => s.upgrades.lobby ? 6 : 8;
const cbRate = s => s.policyRate + 0.25;
const marketDepRate = s => Math.max(0.1, s.policyRate - 1.2);
function depositCap(s) {
  let c = 0; for (const b of s.branches) c += branchCap(b);
  if (s.upgrades.marketing) c *= 1.25;
  if (s.upgrades.app) c *= 1.2;
  return c;
}
function loanDemand(s) {
  let f = 0; for (const b of s.branches) f += branchLoanF(b);
  f *= ECON[s.economy].demand;
  if (s.upgrades.marketing) f *= 1.3;
  if (s.upgrades.ia) f *= 1.3;
  f *= 0.6 + s.reputation / 125;
  if (s.flags.strikeUntil > s.day) f *= 0.2;
  return f;
}
function annualPD(score, type) { return clamp(0.35 * Math.exp(-(score - 300) / 105) * LOAN_TYPES[type].pd, 0.001, 0.85); }
// Taux d'endettement : mensualité / revenus. Au-delà de 35 %, la règle du HCSF interdit de prêter.
const endet = (r, rate = r.offer) => r.income ? payment(r.amount, rate, r.dur) / r.income : 0;
const usure = r => Math.round((S ? S.policyRate : 3) * 10 + LOAN_TYPES[r.type].usure * 10) / 10;
function reqPD(r, rate = r.offer) {
  if (r.type === 'souv') return RATINGS[r.rating].pd;
  let pd = annualPD(r.score, r.type);
  if (r.income) pd *= 1 + Math.max(0, endet(r, rate) - 0.3) * 5;
  if (r.apport != null) pd *= clamp(1.3 - r.apport * 2, 0.7, 1.3);
  return clamp(pd, 0.001, 0.9);
}
const fmtDur = m => m >= 24 && m % 12 === 0 ? `${m / 12} ans` : `${m} mois`;
function grade(score) { return score >= 750 ? 'A' : score >= 670 ? 'B' : score >= 580 ? 'C' : score >= 500 ? 'D' : 'E'; }
function payment(P, rateAnnual, n) { const i = rateAnnual / 1200; return i === 0 ? P / n : P * i / (1 - Math.pow(1 + i, -n)); }
function acceptProb(r) { return 1 / (1 + Math.exp((r.offer - r.maxRate) * (r.type === 'souv' ? 3 : 1.8))); }
function cbLimit(s) { return 1e6 + 0.5 * loansOut(s) + 0.9 * holdingValue(s, 'oat'); }
function monthlyCosts(s) {
  let c = 0; for (const b of s.branches) c += branchCosts(s, b);
  for (const u in s.upgrades) c += UPGRADES[u].monthly;
  if (s.flags.cats) c += 2000;
  return c;
}
const tradeFee = () => S.upgrades.trading ? 0.001 : 0.005;

// ---------- Journal / notifications ----------
function log(msg, type = '') {
  S.log.unshift({ d: S.day, msg, type });
  if (S.log.length > 80) S.log.pop();
}
function toast(msg, type = '', key) {
  if (key) { if (ui.toastKeys[key] > Date.now()) return; ui.toastKeys[key] = Date.now() + 8000; }
  const el = document.createElement('div');
  el.className = 'toast ' + type; el.innerHTML = msg;
  $('#toasts').appendChild(el);
  while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 4500);
  SFX.play(type === 'good' ? 'good' : type === 'bad' ? 'bad' : 'notify');
}
function floatMoney(amount, x, y) {
  if (x == null) return;
  const el = document.createElement('div');
  el.className = 'float-money ' + cls(amount);
  el.textContent = (amount >= 0 ? '+' : '') + money(amount);
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 1200);
}

// ---------- Sauvegarde ----------
function save() { if (!S || S.over) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function loadSave() { try { const j = localStorage.getItem(SAVE_KEY); return j ? JSON.parse(j) : null; } catch (e) { return null; } }
function loadBest() { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || []; } catch (e) { return []; } }
