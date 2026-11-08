/* Quota – previdenza complementare sotto controllo.
   Web app locale: tutti i dati personali restano nel browser del telefono (localStorage).
   Nessun server, nessun account. */
'use strict';

/* ======================= Costanti e utilità ======================= */
const APP_VERSION = '1.0.0';
const STORE_KEY = 'quota.dati.v1';
const PREF_KEY = 'quota.pref.v1';
const REF_CACHE_KEY = 'quota.rif.cache.v1';
const REF_USER_KEY = 'quota.rif.utente.v1';
const LINK_FONDO = 'https://www.previdenzacooperativa.it';
const LINK_AREA = 'https://whorizon.previnet.it/w-horizon-previco/login.html#/';
const COMPARTI = ['Sicuro', 'Bilanciato', 'Dinamico'];

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const INIZ = ['G', 'F', 'M', 'A', 'M', 'G', 'L', 'A', 'S', 'O', 'N', 'D'];

// Dati pubblici incorporati: l'app funziona anche se il download non riesce.
const REF_BUILTIN = {
  formato: 'quota-riferimenti', versione: '2026-11-08', aggiornato: '2026-11-08',
  tfr: { fonte: 'ISTAT, indice FOI', imposta: 0.17, coefficienti: {
    '2024-12': 2.320017,
    '2025-01': 0.561772, '2025-02': 0.811564, '2025-03': 1.123752, '2025-04': 1.186356, '2025-05': 1.248960, '2025-06': 1.436356,
    '2025-07': 1.873336, '2025-08': 1.998336, '2025-09': 2.060940, '2025-10': 1.998752, '2025-11': 2.061356, '2025-12': 2.311148,
    '2026-01': 0.363025, '2026-02': 0.862716, '2026-03': 1.437346, '2026-04': 2.311728, '2026-05': 2.661543, '2026-06': 2.786543,
    '2026-07': 3.136358, '2026-08': 3.710988, '2026-09': 4.285617 } },
  isc: { anno: 2025, fonte: 'COVIP, Relazione annuale 2025: ISC medio a 10 anni', fondiAperti: 0.0136, pip: 0.0217, fondiNegoziali: 0.0047 },
  fondo: { nome: 'Previdenza Cooperativa', fonte: 'Previdenza Cooperativa, scheda costi: ISC a 10 anni', iscComparti: { Sicuro: 0.0067, Bilanciato: 0.0038, Dinamico: 0.0027 } }
};

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const thousands = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function num(n, d) { const p = Math.abs(n).toFixed(d).split('.'); return (n < 0 && Math.abs(n) >= Math.pow(10, -d) / 2 ? '−' : '') + thousands(p[0]) + (p[1] ? ',' + p[1] : ''); }
function eur(n, d = 2) { return num(n, d) + ' €'; }
function eurS(n, d = 2) { return (n >= 0 ? '+' : '') + eur(n, d); }
function pct(x, d = 1) { const v = x * 100; return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d).replace('.', ',') + '%'; }
function pctPlain(x, d = 2) { return (x * 100).toFixed(d).replace('.', ',') + '%'; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function parseIt(s) {
  s = String(s == null ? '' : s).trim().replace(/\s|€|%/g, '');
  if (!s) return NaN;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  const v = Number(s);
  return isFinite(v) ? v : NaN;
}
function inVal(n, d) { return n == null || isNaN(n) ? '' : num(n, d); }

// Mesi come "AAAA-MM" e indice assoluto (anno*12 + mese-1)
const key = (y, m) => y + '-' + String(m).padStart(2, '0');
const parseKey = (k) => { const [y, m] = k.split('-').map(Number); return { y, m }; };
const idxOf = (k) => { const { y, m } = parseKey(k); return y * 12 + m - 1; };
const keyOf = (i) => key(Math.floor(i / 12), (i % 12) + 1);
const lastDay = (y, m) => new Date(y, m, 0).getDate();
const monthLabel = (k) => { const { y, m } = parseKey(k); return cap(MESI[m - 1]) + ' ' + y; };
const dateLabel = (k) => { const { y, m } = parseKey(k); return lastDay(y, m) + ' ' + MESI[m - 1] + ' ' + y; };
function todayKey() { const d = new Date(); return key(d.getFullYear(), d.getMonth() + 1); }

/* ======================= Stato ======================= */
let data = null;          // dati personali
let ref = REF_BUILTIN;    // dati pubblici ufficiali (incorporati o scaricati)
let refUser = null;       // eventuali valori inseriti dall'utente
const ui = { tab: 'home', range: 'all', selIdx: null, year: null, insMonth: null, form: null, cmpOpen: false, sheet: null, guideOpen: false };

function loadJSON(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('Impossibile salvare: memoria del browser non disponibile'); return false; } }
function persist() { if (data) saveJSON(STORE_KEY, data); }

function emptyData() {
  return {
    formato: 'quota-backup', versione: 1, esportato: null,
    fondo: { nome: 'Previdenza Cooperativa', albo_covip: 170, adesione: 'collettiva', sito: LINK_FONDO, areaRiservata: LINK_AREA },
    comparti: [], aliquote: [], bustePaga: [], valorizzazioni: [], modifiche: {}
  };
}

function normalize(d) {
  const out = emptyData();
  Object.assign(out.fondo, d.fondo || {});
  out.comparti = (d.comparti || []).filter((c) => c && c.dal && c.nome).map((c) => ({ nome: c.nome, dal: c.dal, nota: c.nota }));
  out.aliquote = (d.aliquote || []).filter((a) => a && a.dal).map((a) => ({ dal: a.dal, volontario: Number(a.volontario) || 0, azienda: Number(a.azienda) || 0 }));
  out.bustePaga = (d.bustePaga || []).filter((b) => b && b.mese && isFinite(b.tfr)).map((b) => {
    const r = { mese: b.mese, imponibile: b.imponibile == null ? null : Number(b.imponibile), tfr: Number(b.tfr) };
    if (b.aziendaManuale != null) r.aziendaManuale = Number(b.aziendaManuale);
    if (b.nota) r.nota = b.nota;
    return r;
  });
  out.valorizzazioni = (d.valorizzazioni || []).filter((v) => v && v.mese && v.quote > 0 && v.valoreQuota > 0).map((v) => ({
    mese: v.mese, data: v.data || null, quote: Number(v.quote), valoreQuota: Number(v.valoreQuota), totaleVersato: Number(v.totaleVersato), comparto: v.comparto || null
  }));
  out.modifiche = d.modifiche || {};
  const byKey = (a, b) => (a.dal || a.mese).localeCompare(b.dal || b.mese);
  out.comparti.sort(byKey); out.aliquote.sort(byKey); out.bustePaga.sort(byKey); out.valorizzazioni.sort(byKey);
  if (!out.aliquote.length) out.aliquote.push({ dal: '2000-01', volontario: 0, azienda: 0 });
  return out;
}

/* ======================= Dati pubblici ======================= */
function effRef() {
  const r = JSON.parse(JSON.stringify(ref));
  if (refUser) {
    if (refUser.isc) Object.assign(r.isc, refUser.isc);
    if (refUser.iscComparti) Object.assign(r.fondo.iscComparti, refUser.iscComparti);
  }
  return r;
}
async function refreshRef() {
  const cached = loadJSON(REF_CACHE_KEY);
  if (cached && cached.versione > ref.versione) ref = cached;
  try {
    const res = await fetch('data/riferimenti.json', { cache: 'no-store' });
    if (!res.ok) return;
    const j = await res.json();
    if (j && j.formato === 'quota-riferimenti' && j.versione >= ref.versione) {
      const changed = j.versione !== ref.versione;
      ref = j; saveJSON(REF_CACHE_KEY, j);
      if (changed) render();
    }
  } catch (e) { /* offline: si usano gli ultimi dati validi */ }
}
function tfrCoef(y, m) {
  // Coefficiente (%) del mese m dell'anno y; se non ancora pubblicato, l'ultimo disponibile di quell'anno,
  // altrimenti la sola parte fissa (1,5% annuo in proporzione).
  const t = effRef().tfr.coefficienti; let best = null;
  for (let mm = m; mm >= 1; mm--) { const v = t[key(y, mm)]; if (v != null) { best = v; break; } }
  return (best != null ? best : 1.5 * m / 12) / 100;
}

/* ======================= Calcoli ======================= */
function rateFor(k) { let r = data.aliquote[0]; for (const a of data.aliquote) if (a.dal <= k) r = a; return r; }
function compartoFor(k) { let c = data.comparti[0] ? data.comparti[0].nome : 'Comparto'; for (const x of data.comparti) if (x.dal <= k) c = x.nome; return c; }
function buste() { const m = {}; for (const b of data.bustePaga) m[b.mese] = b; return m; }
function monthCalc(b) {
  if (!b) return null;
  if (b.imponibile == null) { const az = b.aziendaManuale || 0; return { base: null, tfr: b.tfr, vol: 0, az, tot: az + b.tfr }; }
  const r = rateFor(b.mese);
  const vol = b.imponibile * r.volontario, az = b.imponibile * r.azienda;
  return { base: b.imponibile, tfr: b.tfr, vol, az, tot: vol + az + b.tfr, r };
}
function snaps() {
  return data.valorizzazioni.map((v) => ({ k: v.mese, i: idxOf(v.mese), q: v.quote, vq: v.valoreQuota, e: v.totaleVersato, v: v.quote * v.valoreQuota, c: v.comparto || compartoFor(v.mese), data: v.data }));
}

function model() {
  const B = buste(), P = snaps();
  const months = {};
  for (const b of data.bustePaga) months[b.mese] = monthCalc(b);
  const last = P[P.length - 1] || null;
  let tv = 0, tvol = 0, taz = 0, ttfr = 0;
  for (const k in months) { const d = months[k]; tv += d.tot; tvol += d.vol; taz += d.az; ttfr += d.tfr; }
  const firstKey = data.bustePaga.length ? data.bustePaga[0].mese : (P[0] ? P[0].k : todayKey());
  return { B, P, months, last, tv, tvol, taz, ttfr, firstKey };
}

function quarterInfo(M, y, q) {
  let amt = 0, present = 0;
  for (let m = 3 * q - 2; m <= 3 * q; m++) { const d = M.months[key(y, m)]; if (d) { amt += d.tot; present++; } }
  const res = { y, q, amt, present };
  const endIdx = y * 12 + 3 * q - 1;
  if (present === 0) { res.st = endIdx < idxOf(todayKey()) ? 'vuoto' : 'futuro'; return res; }
  if (present < 3) { res.st = 'corso'; return res; }
  const before = M.P.filter((p) => p.i <= endIdx);
  if (!before.length) {
    if (M.P.length) { res.st = 'ok'; res.note = 'Incluso nel primo saldo del ' + dateLabel(M.P[0].k); }
    else { res.st = 'attesa'; res.note = 'Nessun valore del fondo registrato'; }
    return res;
  }
  const end = before[before.length - 1];
  const next = M.P.find((p) => p.i > endIdx);
  if (!next) { res.st = 'attesa'; res.note = 'Atteso con il valore di ' + MESI[(3 * q) % 12]; return res; }
  const cred = next.e - end.e, diff = cred - amt;
  res.cred = cred; res.diff = diff;
  if (Math.abs(diff) < 0.05) { res.st = 'ok'; res.note = 'Accreditati ' + eur(cred) + ' · al centesimo'; }
  else { res.st = 'diff'; res.note = 'Accreditati ' + eur(cred) + ' · differenza ' + eurS(diff); }
  return res;
}

function yearsRange(M) {
  const y0 = parseKey(M.firstKey).y, y1 = Math.max(parseKey(todayKey()).y, M.last ? parseKey(M.last.k).y : y0);
  const ys = []; for (let y = y0; y <= y1; y++) ys.push(y); return ys;
}

function pendingMonth(M) {
  // Il mese da completare è quello precedente a oggi.
  const k = keyOf(idxOf(todayKey()) - 1);
  if (k < M.firstKey) return null;
  const needPay = !M.B[k], needSnap = !M.P.find((p) => p.k === k);
  return { k, needPay, needSnap, done: !needPay && !needSnap };
}

function comparison(M) {
  if (!M.last || M.P.length < 2) return null;
  const R = effRef(), D = M.last.i;
  let versD = 0, volD = 0, azD = 0; const tfrY = {};
  for (const k in M.months) {
    if (idxOf(k) > D) continue;
    const d = M.months[k], y = parseKey(k).y;
    versD += d.tot; volD += d.vol; azD += d.az; tfrY[y] = (tfrY[y] || 0) + d.tfr;
  }
  const pend = versD - M.last.e;
  const azQ = (qe) => { let t = 0; for (let i = qe - 2; i <= qe; i++) { const d = M.months[keyOf(i)]; if (d) t += d.az; } return t; };
  // contributi azienda già compresi nel primo saldo: trimestri chiusi prima della prima valorizzazione
  let az0 = 0;
  const firstIdx = idxOf(M.firstKey);
  for (let qe = firstIdx + (((2 - firstIdx % 3) + 3) % 3); qe < M.P[0].i; qe += 3) az0 += azQ(qe);
  const ownIsc = (c) => (R.fondo.iscComparti[c] != null ? R.fondo.iscComparti[c] : R.isc.fondiNegoziali || 0.0047);
  const sim = (isc, lose) => {
    let A = M.P[0].v * (lose && M.P[0].e > 0 ? (M.P[0].e - az0) / M.P[0].e : 1), cAz = az0;
    for (let i = 1; i < M.P.length; i++) {
      const a = M.P[i - 1], b = M.P[i], flow = b.e - a.e, r = (b.v - flow) / a.v;
      A = A * r * Math.pow(1 - (isc - ownIsc(a.c)), (b.i - a.i) / 12);
      if (flow > 1) { const qe = (b.i - 1) - ((((b.i - 1 - 2) % 3) + 3) % 3); const azf = azQ(qe); A += flow - (lose ? azf : 0); cAz += azf; }
    }
    return { A, cAz };
  };
  const own = M.last.v + pend;
  const fpa = sim(R.isc.fondiAperti, true), fpaK = sim(R.isc.fondiAperti, false);
  const pip = sim(R.isc.pip, true), pipK = sim(R.isc.pip, false);
  const pendAz = azD - fpa.cAz;
  const ly = parseKey(M.last.k).y, lm = parseKey(M.last.k).m, y0 = parseKey(M.firstKey).y;
  let bal = 0; for (let y = y0; y < ly; y++) bal = bal * (1 + (1 - R.tfr.imposta) * tfrCoef(y, 12)) + (tfrY[y] || 0);
  const tfrAlt = bal * (1 + (1 - R.tfr.imposta) * tfrCoef(ly, lm)) + (tfrY[ly] || 0);
  return {
    date: dateLabel(M.last.k), pend, own,
    fpa: fpa.A + pend - pendAz, fpaKeep: fpaK.A + pend,
    pip: pip.A + pend - pendAz, pipKeep: pipK.A + pend,
    tfr: tfrAlt + volD, R
  };
}

/* ======================= Link esterni (sempre nel browser del telefono) ======================= */
function isStandalone() { return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches; }
function isIOS() { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function extHref(u) { return isStandalone() && isIOS() ? u.replace(/^https:\/\//, 'x-safari-https://') : u; }
function extLink(u, inner, cls = '', style = '') { return `<a class="${cls}" style="${style}" href="${esc(extHref(u))}" target="_blank" rel="noopener noreferrer">${inner}</a>`; }
const ICON_EXT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

/* ======================= Viste ======================= */
function render() {
  const app = $('#app'), tab = $('#tabbar');
  if (!data) { tab.hidden = true; app.innerHTML = viewWelcome(); return; }
  tab.hidden = false;
  const M = model();
  const views = { home: viewHome, anni: viewAnni, inserisci: viewInserisci, impostazioni: viewImpostazioni };
  app.innerHTML = (views[ui.tab] || viewHome)(M);
  tab.innerHTML = tabbarHTML();
  renderSheet(M);
  if (ui.tab === 'home') bindChart(M);
  if (ui.tab === 'inserisci') refreshInsCalc();
}

function tabbarHTML() {
  const t = (id, label, icon) => `<button type="button" data-act="tab" data-v="${id}" ${ui.tab === id ? 'aria-current="page"' : ''}>${icon}${label}</button>`;
  const ic = (p) => `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  return '<div class="inner">' +
    t('home', 'Panoramica', ic('<path d="M3 17l5-5 4 4 8-8"/><path d="M15 8h5v5"/>')) +
    t('anni', 'Anni', ic('<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>')) +
    t('inserisci', 'Inserisci', ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>')) +
    t('impostazioni', 'Impostazioni', ic('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>')) +
    '</div>';
}

function viewWelcome() {
  return `<div class="welcome">
    <img src="icons/icon-512.png" alt="">
    <h1>Quota</h1>
    <p>La tua previdenza complementare, chiara. I dati restano solo su questo telefono: niente account, niente server.</p>
    <label class="btn primary" for="imp-file">Importa il tuo storico</label>
    <input id="imp-file" class="sr" type="file" accept=".json,application/json" data-act="import">
    <button type="button" class="btn grey" data-act="start-empty">Inizia da zero</button>
    <p style="font-size:13px; margin-top:24px">Per installarla: in Safari tocca Condividi › Aggiungi alla schermata Home.</p>
  </div>`;
}

/* ---------- Panoramica ---------- */
function chartGeom(M) {
  const P = M.P; if (P.length < 2) return null;
  const pts = ui.range === 'all' ? P : P.filter((p) => p.i >= M.last.i - 11);
  if (pts.length < 2) return null;
  const W = Math.max(260, Math.min(window.innerWidth, 560) - 72), H = 170, T = 14, Bm = 10;
  const x0 = pts[0].i, x1 = pts[pts.length - 1].i;
  const X = (i) => 8 + (i - x0) / ((x1 - x0) || 1) * (W - 16);
  const ymax = Math.max(...pts.map((p) => Math.max(p.v, p.e))) * 1.04;
  const ymin = ui.range === 'all' ? 0 : Math.min(...pts.map((p) => Math.min(p.v, p.e))) * 0.94;
  const Y = (v) => T + (1 - (v - ymin) / (ymax - ymin)) * (H - T - Bm);
  let line = '', gap = '', step = '', hasGap = false;
  pts.forEach((p, i) => {
    const x = X(p.i).toFixed(1), y = Y(p.v).toFixed(1), ye = Y(p.e).toFixed(1);
    if (!i) { line = `M${x} ${y}`; step = `M${x} ${ye}`; return; }
    const q = pts[i - 1];
    if (p.i - q.i > 1) { hasGap = true; line += ` M${x} ${y}`; gap += `M${X(q.i).toFixed(1)} ${Y(q.v).toFixed(1)} L${x} ${y} `; }
    else line += ` L${x} ${y}`;
    step += ` H${x} V${ye}`;
  });
  const base = (H - Bm).toFixed(1);
  const area = `M${X(x0).toFixed(1)} ${base}` + pts.map((p) => ` L${X(p.i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join('') + ` L${X(x1).toFixed(1)} ${base} Z`;
  // cambi di comparto visibili
  const switches = [];
  for (let i = 1; i < pts.length; i++) if (pts[i].c !== pts[i - 1].c) switches.push({ x: X(pts[i].i), label: pts[i].c });
  const labels = [];
  pts.forEach((p, i) => {
    const first = !i, lastP = i === pts.length - 1, m = parseKey(p.k).m;
    if (!(first || lastP || m === 1)) return;
    if (!first && !lastP && (X(x1) - X(p.i) < 50 || X(p.i) - X(x0) < 50)) return;
    labels.push({ text: MS[m - 1] + ' ' + String(parseKey(p.k).y).slice(2), pos: first ? 'left:0' : lastP ? 'right:0' : `left:${(X(p.i) - 14).toFixed(1)}px` });
  });
  return { pts, W, H, X, Y, line, gap, step, area, hasGap, switches, labels };
}

function heroTexts(sel, isLatest) {
  const g = sel.v - sel.e;
  return {
    value: eur(sel.v), chip: eurS(g) + ' · ' + pct(g / sel.e), when: 'al ' + dateLabel(sel.k),
    hint: isLatest ? 'Tocca o scorri il grafico per vedere ogni mese.' : 'Versato fino ad allora: ' + eur(sel.e) + ' · comparto ' + sel.c
  };
}

function viewHome(M) {
  const pm = pendingMonth(M);
  let html = `<div class="head"><div class="eyebrow">${esc(data.fondo.nome)}${M.last ? ' · ' + esc(M.last.c) : ''}</div><h1>Panoramica</h1></div>`;

  // Hero
  const G = chartGeom(M);
  if (M.last && G) {
    const sel = G.pts.find((p) => p.i === ui.selIdx) || G.pts[G.pts.length - 1];
    const t = heroTexts(sel, sel === G.pts[G.pts.length - 1]);
    html += `<section class="hero" aria-label="Valore della posizione">
      <div class="top"><span class="lbl">Valore della posizione</span>
        <div class="seg-dark" role="group" aria-label="Periodo">
          <button type="button" data-act="range" data-v="all" aria-pressed="${ui.range === 'all'}">Tutto</button>
          <button type="button" data-act="range" data-v="1y" aria-pressed="${ui.range === '1y'}">12 mesi</button>
        </div></div>
      <div class="big" id="h-value">${t.value}</div>
      <div class="row"><span class="chip" id="h-chip">${t.chip}</span><span class="when" id="h-when">${t.when}</span></div>
      <div class="chart" id="chart" role="img" aria-label="Andamento del valore della posizione e del versato">
        <svg viewBox="0 0 ${G.W} ${G.H}" width="${G.W}" height="${G.H}" aria-hidden="true">
          <path d="${G.area}" fill="#5BE0A8" fill-opacity="0.13"/>
          <path d="${G.step}" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="3 3"/>
          ${G.switches.map((s) => `<line x1="${s.x.toFixed(1)}" x2="${s.x.toFixed(1)}" y1="14" y2="${G.H - 10}" stroke="#fff" stroke-opacity="0.45" stroke-dasharray="1 3"/><text x="${(s.x + 4).toFixed(1)}" y="9" fill="#A9C2B9" font-size="11" font-weight="600">→ ${esc(s.label)}</text>`).join('')}
          <path d="${G.line}" fill="none" stroke="#5BE0A8" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          <path d="${G.gap}" fill="none" stroke="#5BE0A8" stroke-width="2" stroke-opacity="0.6" stroke-dasharray="2 5" stroke-linecap="round"/>
          <line id="h-vline" x1="${G.X(sel.i).toFixed(1)}" x2="${G.X(sel.i).toFixed(1)}" y1="0" y2="${G.H - 10}" stroke="#fff" stroke-opacity="0.3"/>
          <circle id="h-dot-e" cx="${G.X(sel.i).toFixed(1)}" cy="${G.Y(sel.e).toFixed(1)}" r="3.5" fill="#fff"/>
          <circle id="h-dot-v" cx="${G.X(sel.i).toFixed(1)}" cy="${G.Y(sel.v).toFixed(1)}" r="6" fill="#0F1F1B" stroke="#5BE0A8" stroke-width="3"/>
        </svg>
      </div>
      <div class="xlabels">${G.labels.map((l) => `<span style="${l.pos}">${l.text}</span>`).join('')}</div>
      <div class="legend">
        <span><span class="sw" style="height:3px;border-radius:2px;background:#5BE0A8"></span>Valore</span>
        <span><span class="sw" style="border-top:2px dashed rgba(255,255,255,.6)"></span>Versato accreditato</span>
        ${G.hasGap ? '<span><span class="sw" style="border-top:2px dotted #5BE0A8"></span>Mese non registrato</span>' : ''}
      </div>
      <div class="hint" id="h-hint">${t.hint}</div>
    </section>`;
  } else {
    html += `<section class="card"><div class="title">Ancora pochi dati</div><div class="sub">Il grafico compare dopo almeno due valori del fondo. Inserisci quote e valore quota dal sito del fondo.</div></section>`;
  }

  // Promemoria
  if (pm && !pm.done) {
    const tag = (need) => need ? '<span class="pill warn">Da fare</span>' : '<span class="pill ok">Fatto</span>';
    html += `<section class="card" aria-label="Promemoria">
      <div style="display:flex;gap:10px;align-items:center">
        <span class="icon-badge" style="background:var(--warn-soft);color:var(--warn)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg></span>
        <div><div class="title">${monthLabel(pm.k)} da completare</div><div class="sub">Due minuti, una volta al mese</div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;font-size:15px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span>Busta paga · imponibile e TFR</span>${tag(pm.needPay)}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span>Sito del fondo · quote e valore quota</span>${tag(pm.needSnap)}</div>
      </div>
      <div class="btnrow">
        <button type="button" class="btn primary" data-act="ins-month" data-v="${pm.k}">Inserisci ora</button>
        ${extLink(LINK_AREA, 'Area riservata', 'btn soft')}
      </div>
    </section>`;
  } else if (pm) {
    html += `<section class="card" style="display:flex;gap:12px;align-items:center">
      <span class="icon-badge" style="background:var(--ok-soft);color:var(--ok)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
      <div><div class="title">${monthLabel(pm.k)} completato</div><div class="sub">Il prossimo promemoria arriva con la busta paga di ${MESI[parseKey(todayKey()).m - 1]}</div></div>
    </section>`;
  }

  // Confronto
  const C = comparison(M);
  if (C) {
    const max = Math.max(C.own, C.fpa, C.pip, C.tfr);
    const row = (label, sub, val, color, own) => `<div>
      <div class="cmp-top"><span>${label}</span><span class="num">${eur(val)}</span></div>
      <div class="cmp-track"><div style="width:${(val / max * 100).toFixed(1)}%;background:${color}"></div></div>
      <div class="cmp-bot"><span>${sub}</span>${own ? '' : `<b class="${val - C.own < 0 ? 'bad-t' : 'ok-t'}">${eurS(val - C.own)}</b>`}</div></div>`;
    const userTag = refUser ? ' · <b>valori inseriti da te</b>' : '';
    html += `<section class="card" aria-label="Confronto con le alternative">
      <div class="title">E se non avessi aderito?</div>
      <div class="sub">Stessi versamenti, situazione al ${C.date}. Stima su medie pubbliche${userTag}.</div>
      <div class="cmp-rows">
        ${row(esc(data.fondo.nome), 'Il tuo fondo, dato reale', C.own, 'var(--accent)', true)}
        ${row('Fondo aperto (banche, SGR)', 'Costi medi ' + pctPlain(C.R.isc.fondiAperti) + ' l\'anno, niente contributo azienda', C.fpa, 'var(--alt)')}
        ${row('PIP (assicurazioni)', 'Costi medi ' + pctPlain(C.R.isc.pip) + ' l\'anno, niente contributo azienda', C.pip, 'var(--alt)')}
        ${row('TFR lasciato in azienda', 'Rivalutazione di legge, niente contributo azienda', C.tfr, 'var(--alt)')}
      </div>
      <button type="button" class="linkbtn" data-act="cmp-toggle" aria-expanded="${ui.cmpOpen}">${ui.cmpOpen ? 'Nascondi come è calcolato' : 'Come è calcolato'}</button>
      ${ui.cmpOpen ? `<div class="details">
        <div><b>Il tuo fondo</b>: valore reale al ${C.date}, più i versamenti già trattenuti in busta paga e non ancora accreditati (${eur(C.pend)}). Così tutte le righe partono dagli stessi soldi.</div>
        <div><b>Fondo aperto e PIP</b>: stessi investimenti del tuo comparto, meno la differenza di costo (${esc(C.R.isc.fonte)}). Il contributo azienda spetta di norma solo al fondo di categoria; anche ricevendolo avresti comunque ${eur(C.own - C.fpaKeep)} (fondo aperto) e ${eur(C.own - C.pipKeep)} (PIP) in meno, solo per i costi.</div>
        <div><b>TFR in azienda</b>: rivalutazione di legge (1,5% + 75% dell'inflazione ISTAT), tassata al 17%. Il contributo volontario resta in busta paga, senza rendimento e senza deduzione fiscale.</div>
        <div style="color:var(--muted)">Non include la tassazione finale, più bassa nel fondo pensione (dal 15% al 9%). È una stima, non un consiglio d'investimento. Dati pubblici aggiornati al ${esc(C.R.aggiornato || C.R.versione)}.</div>
      </div>` : ''}
    </section>`;
  }

  // Versato e accreditato
  if (M.tv > 0) {
    let okSum = 0, waitSum = 0, runSum = 0; const waitNames = [], diffNames = [];
    for (const y of yearsRange(M)) for (let q = 1; q <= 4; q++) {
      const r = quarterInfo(M, y, q);
      if (r.st === 'ok' || r.st === 'diff') okSum += r.amt;
      if (r.st === 'diff') diffNames.push(q + '° trimestre ' + y);
      if (r.st === 'attesa') { waitSum += r.amt; waitNames.push(q + '° trimestre ' + y); }
      if (r.st === 'corso') runSum += r.amt;
    }
    let note = waitNames.length ? 'Il ' + waitNames.join(', ') + ' risulta versato in busta paga ma non ancora sul sito: lo controllo da solo al prossimo inserimento.' : 'Ogni trimestre versato risulta accreditato dal fondo, al centesimo.';
    if (diffNames.length) note = 'Da verificare: ' + diffNames.join(', ') + ' non torna con le buste paga. Trovi il dettaglio in Anni.';
    if (runSum > 0) note += ' Il trimestre in corso vale finora ' + eur(runSum) + '.';
    html += `<section class="card" aria-label="Versato e accreditato">
      <div class="title">Versato e accreditato</div><div class="sub">Busta paga confrontata con il fondo, trimestre per trimestre</div>
      <div class="bar"><div style="width:${(okSum / M.tv * 100).toFixed(1)}%;background:var(--accent)"></div><div style="width:${((waitSum + runSum) / M.tv * 100).toFixed(1)}%;background:var(--az)"></div></div>
      <div class="grid3">
        <div><div class="kv-l">Versato</div><div class="kv-v">${eur(M.tv)}</div></div>
        <div><div class="kv-l">Accreditato</div><div class="kv-v ok-t">${eur(okSum)}</div></div>
        <div><div class="kv-l">In attesa</div><div class="kv-v warn-t">${eur(waitSum + runSum)}</div></div>
      </div>
      <div class="sub" style="margin-top:12px;color:var(--text-2)">${note}</div>
    </section>`;

    // Composizione
    const w = (x) => Math.round(x / M.tv * 100) + '%';
    html += `<section class="card" aria-label="Da dove arrivano i versamenti">
      <div class="title">Da dove arrivano i soldi</div><div class="sub">Totale versato dall'adesione: ${eur(M.tv)}</div>
      <div class="stack"><div style="width:${w(M.ttfr)};background:var(--tfr)"></div><div style="width:${w(M.taz)};background:var(--az)"></div><div style="width:${w(M.tvol)};background:var(--vol)"></div></div>
      <div class="legend-list">
        <div><span class="k"><span class="dot" style="width:10px;height:10px;background:var(--tfr)"></span>TFR</span><span class="num">${eur(M.ttfr)} <span style="color:var(--muted)">· ${w(M.ttfr)}</span></span></div>
        <div><span class="k"><span class="dot" style="width:10px;height:10px;background:var(--az)"></span>Contributo azienda</span><span class="num">${eur(M.taz)} <span style="color:var(--muted)">· ${w(M.taz)}</span></span></div>
        <div><span class="k"><span class="dot" style="width:10px;height:10px;background:var(--vol)"></span>Contributo volontario</span><span class="num">${eur(M.tvol)} <span style="color:var(--muted)">· ${w(M.tvol)}</span></span></div>
      </div>
    </section>`;
  }

  // Comparto
  if (M.last) {
    const cur = M.last.c; const since = data.comparti.filter((c) => c.nome === cur).map((c) => c.dal).pop();
    const firstOfCur = M.P.find((p) => p.c === cur && (!since || p.k >= since));
    const isc = effRef().fondo.iscComparti[cur];
    html += `<section class="card" aria-label="Comparto">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><div class="title">Comparto ${esc(cur)}</div><div class="sub">${since ? 'da ' + MESI[parseKey(since).m - 1] + ' ' + parseKey(since).y : ''}</div></div>
      <div class="grid3">
        <div><div class="kv-l">Valore quota</div><div class="kv-v">${num(M.last.vq, 3)} €</div></div>
        <div><div class="kv-l">${firstOfCur && firstOfCur !== M.last ? 'Da ' + MS[parseKey(firstOfCur.k).m - 1] + ' ' + String(parseKey(firstOfCur.k).y).slice(2) : 'Variazione'}</div><div class="kv-v ok-t">${firstOfCur ? pct(M.last.vq / firstOfCur.vq - 1) : '—'}</div></div>
        <div><div class="kv-l">Costi (ISC 10 anni)</div><div class="kv-v">${isc != null ? pctPlain(isc) : '—'}</div></div>
      </div>
      ${data.comparti.length > 1 ? '<div class="sub" style="margin-top:12px">I valori quota di comparti diversi non si confrontano tra loro: il grafico segna il punto di cambio.</div>' : ''}
      ${extLink(LINK_FONDO, '<span>Dettagli sul fondo</span>' + ICON_EXT, 'linkbtn', 'display:flex;align-items:center;justify-content:space-between;text-decoration:none')}
    </section>`;
  }
  return html;
}

function bindChart(M) {
  const el = $('#chart'); if (!el) return;
  const G = chartGeom(M); if (!G) return;
  const pick = (clientX) => {
    const rect = el.getBoundingClientRect();
    const x = (clientX - rect.left) * (G.W / rect.width);
    let best = G.pts[0], bd = Infinity;
    for (const p of G.pts) { const d = Math.abs(G.X(p.i) - x); if (d < bd) { bd = d; best = p; } }
    ui.selIdx = best.i;
    const t = heroTexts(best, best === G.pts[G.pts.length - 1]);
    $('#h-value').textContent = t.value; $('#h-chip').textContent = t.chip; $('#h-when').textContent = t.when; $('#h-hint').textContent = t.hint;
    const sx = G.X(best.i).toFixed(1);
    for (const id of ['h-vline']) { $('#' + id).setAttribute('x1', sx); $('#' + id).setAttribute('x2', sx); }
    $('#h-dot-e').setAttribute('cx', sx); $('#h-dot-e').setAttribute('cy', G.Y(best.e).toFixed(1));
    $('#h-dot-v').setAttribute('cx', sx); $('#h-dot-v').setAttribute('cy', G.Y(best.v).toFixed(1));
  };
  let down = false;
  el.addEventListener('pointerdown', (e) => { down = true; pick(e.clientX); });
  el.addEventListener('pointermove', (e) => { if (down || e.pointerType === 'mouse') pick(e.clientX); });
  window.addEventListener('pointerup', () => { down = false; }, { once: true });
}

/* ---------- Anni ---------- */
function viewAnni(M) {
  const ys = yearsRange(M);
  if (!ui.year || ys.indexOf(ui.year) < 0) ui.year = ys[ys.length - 1];
  const Y = ui.year, tk = todayKey();
  let html = `<div class="head"><div class="eyebrow">Resoconto</div><h1>Anno ${Y}</h1></div>
    <div class="seg" role="group" aria-label="Scegli l'anno">${ys.map((y) => `<button type="button" data-act="year" data-v="${y}" aria-pressed="${y === Y}">${y}</button>`).join('')}</div>`;

  let yt = 0, yv = 0, ya = 0, yf = 0, count = 0; const bars = [], rows = [];
  const scale = 120 / Math.max(300, ...Object.values(M.months).map((d) => d.tot));
  for (let m = 1; m <= 12; m++) {
    const k = key(Y, m), d = M.months[k], snap = M.P.find((p) => p.k === k);
    if (d) { yt += d.tot; yv += d.vol; ya += d.az; yf += d.tfr; count++; }
    bars.push(d ? `<div><div class="col"><div style="height:${(d.vol * scale).toFixed(1)}px;background:var(--vol)"></div><div style="height:${(d.az * scale).toFixed(1)}px;background:var(--az)"></div><div style="height:${(d.tfr * scale).toFixed(1)}px;background:var(--tfr)"></div></div></div>` : '<div><div class="empty"></div></div>');
    const beforeStart = k < M.firstKey, future = k >= tk;
    if (d) {
      const edited = data.modifiche && data.modifiche[k];
      rows.push(`<div class="row">
        <div class="row-top"><span class="row-name">${cap(MESI[m - 1])}</span><span class="row-name num">${eur(d.tot)}</span></div>
        <div class="row-meta">${d.base == null ? 'Imponibile non registrato' + (d.az ? ' · azienda inserita a mano' : '') : 'Imponibile ' + eur(d.base)}</div>
        <div class="row-meta" style="margin-top:1px">Vol. ${eur(d.vol)} · Az. ${eur(d.az)} · TFR ${eur(d.tfr)}</div>
        ${snap ? `<div class="row-meta ok-t">${num(snap.q, 3)} quote × ${num(snap.vq, 3)} € = ${eur(snap.v)}</div>` : (M.P.length && k > M.P[0].k ? '<div class="row-meta warn-t">Valore quota non registrato</div>' : '')}
        <div class="row-actions"><span style="font-size:12px;font-weight:600;color:var(--info)">${edited ? 'Modificato da te' : ''}</span><button type="button" class="chipbtn" data-act="ins-month" data-v="${k}" aria-label="Modifica ${MESI[m - 1]} ${Y}">Modifica</button></div>
      </div>`);
    } else if (snap) {
      rows.push(`<div class="row"><div class="row-top"><span class="row-name">${cap(MESI[m - 1])}</span><button type="button" class="chipbtn warn" data-act="ins-month" data-v="${k}">Busta paga mancante</button></div>
        <div class="row-meta ok-t">${num(snap.q, 3)} quote × ${num(snap.vq, 3)} € = ${eur(snap.v)}</div></div>`);
    } else if (!beforeStart && !future) {
      rows.push(`<div class="row"><div class="row-top"><span class="row-name">${cap(MESI[m - 1])}</span><button type="button" class="chipbtn warn" data-act="ins-month" data-v="${k}">Da inserire</button></div></div>`);
    } else {
      rows.push(`<div class="row"><div class="row-top"><span class="row-name" style="color:var(--faint)">${cap(MESI[m - 1])}</span><span class="sub">${future ? 'In arrivo' : 'Prima dell\'adesione'}</span></div></div>`);
    }
  }

  html += `<section class="card" aria-label="Versato nell'anno">
    <div class="sub">Versato nell'anno · ${count} ${count === 1 ? 'mese registrato' : 'mesi registrati'}</div>
    <div class="num" style="font-size:32px;font-weight:700;letter-spacing:-.02em">${eur(yt)}</div>
    <div class="bars">${bars.join('')}</div>
    <div class="bars-lab">${INIZ.map((l) => `<span>${l}</span>`).join('')}</div>
    <div class="grid3">
      <div><div class="kv-l"><span class="dot" style="background:var(--tfr)"></span>TFR</div><div class="kv-v">${eur(yf)}</div></div>
      <div><div class="kv-l"><span class="dot" style="background:var(--az)"></span>Azienda</div><div class="kv-v">${eur(ya)}</div></div>
      <div><div class="kv-l"><span class="dot" style="background:var(--vol)"></span>Volontario</div><div class="kv-v">${eur(yv)}</div></div>
    </div></section>`;

  const ysnap = M.P.filter((p) => parseKey(p.k).y === Y);
  if (ysnap.length) {
    const endS = ysnap[ysnap.length - 1];
    const prev = M.P.filter((p) => parseKey(p.k).y < Y).pop();
    const endR = endS.v - endS.e, prevR = prev ? prev.v - prev.e : 0;
    const comps = [...new Set(ysnap.map((p) => p.c))];
    html += `<section class="hero" style="margin-top:16px;border-radius:22px;padding:18px" aria-label="Situazione a fine periodo">
      <div class="lbl" style="font-size:13px">Valore al ${dateLabel(endS.k)}</div>
      <div class="num" style="font-size:28px;font-weight:700;letter-spacing:-.02em;margin-top:2px">${eur(endS.v)}</div>
      <div class="grid2">
        <div><div class="kv-l" style="color:var(--hero-2)">Rendimento totale</div><div class="kv-v" style="color:var(--mint)">${eurS(endR)} · ${pct(endR / endS.e)}</div></div>
        <div><div class="kv-l" style="color:var(--hero-2)">${prev ? 'Maturato nell\'anno' : 'Maturato dall\'adesione'}</div><div class="kv-v" style="color:var(--mint)">${eurS(endR - prevR)}</div></div>
      </div>
      <div class="when" style="margin-top:10px">${comps.length > 1 ? 'Comparti nell\'anno: ' + comps.map(esc).join(' → ') : 'Comparto ' + esc(comps[0])}</div>
    </section>`;
  }

  const periods = ['gen – mar', 'apr – giu', 'lug – set', 'ott – dic'];
  const pill = { ok: ['ok', 'Accreditato'], diff: ['bad', 'Da verificare'], attesa: ['warn', 'In attesa'], corso: ['idle', 'In corso'], futuro: ['idle', 'Da versare'], vuoto: ['idle', 'Nessun dato'] };
  html += `<h2 class="sec">Trimestri</h2><section class="card flush" aria-label="Trimestri">` + [1, 2, 3, 4].map((q) => {
    const r = quarterInfo(M, Y, q), p = pill[r.st];
    const note = r.note || (r.st === 'corso' ? 'Mesi ancora da inserire' : r.st === 'futuro' ? 'Non ancora iniziato' : 'Nessuna busta paga registrata');
    return `<div class="row"><div class="row-top" style="align-items:center"><span class="row-name">${q}° trimestre <span style="font-weight:400;color:var(--muted);font-size:14px">${periods[q - 1]}</span></span><span class="pill ${p[0]}">${p[1]}</span></div>
      <div class="row-top" style="margin-top:4px;font-size:14px;color:var(--text-2)"><span>${note}</span><span class="num" style="font-weight:600;color:var(--text)">${r.amt > 0 ? eur(r.amt) : '—'}</span></div></div>`;
  }).join('') + '</section>';

  html += `<h2 class="sec">Mese per mese</h2><section class="card flush" aria-label="Dati mensili inseriti">${rows.join('')}</section>`;
  return html;
}

/* ---------- Inserisci / Modifica ---------- */
function insDefaults(k) {
  const b = data.bustePaga.find((x) => x.mese === k);
  const v = data.valorizzazioni.find((x) => x.mese === k);
  return { k, base: b && b.imponibile != null ? inVal(b.imponibile, 2) : '', tfr: b ? inVal(b.tfr, 2) : '', q: v ? inVal(v.quote, 3) : '', vq: v ? inVal(v.valoreQuota, 3) : '', e: v ? inVal(v.totaleVersato, 2) : '', existed: !!(b || v), err: null };
}

function viewInserisci(M) {
  const pm = pendingMonth(M);
  if (!ui.insMonth) ui.insMonth = pm ? pm.k : keyOf(idxOf(todayKey()) - 1);
  if (!ui.form || ui.form.k !== ui.insMonth) ui.form = insDefaults(ui.insMonth);
  const f = ui.form, k = f.k;
  // mesi selezionabili: dall'inizio dei dati fino al mese corrente
  const opts = []; for (let i = idxOf(todayKey()); i >= idxOf(M.firstKey < '2000-01' ? '2000-01' : M.firstKey) - 12; i--) opts.push(keyOf(i));
  const prevSnap = M.P.filter((p) => p.i < idxOf(k)).pop();
  const ph = (val, d) => val != null ? num(val, d) : '';
  const lastB = data.bustePaga.filter((b) => b.mese < k).pop();
  return `<div class="head"><div class="eyebrow">${f.existed ? 'Modifica' : 'Inserimento mensile'}</div><h1>${monthLabel(k)}</h1></div>
    <section class="card flush" style="margin-top:0">
      <div class="field"><label for="i-mese">Mese</label><select id="i-mese" data-act="ins-select">${opts.map((o) => `<option value="${o}" ${o === k ? 'selected' : ''}>${monthLabel(o)}</option>`).join('')}</select></div>
    </section>
    ${f.existed ? '<div class="note">Questo mese ha già dei dati: correggili e salva. Trimestri, grafico e confronto si ricalcolano da soli.</div>' : ''}
    <h3 class="group">1 · Dalla busta paga</h3>
    <section class="card flush" style="margin-top:0">
      <div class="field"><label for="i-base">Imponibile</label><input id="i-base" inputmode="decimal" autocomplete="off" data-f="base" value="${esc(f.base)}" placeholder="${lastB && lastB.imponibile != null ? esc(num(lastB.imponibile, 2)) : '0,00'}"></div>
      <div class="field"><label for="i-tfr">TFR del mese</label><input id="i-tfr" inputmode="decimal" autocomplete="off" data-f="tfr" value="${esc(f.tfr)}" placeholder="${lastB ? esc(num(lastB.tfr, 2)) : '0,00'}"></div>
      <div class="calc" id="calc-pay"></div>
    </section>
    <div class="note">In grigio i valori ${lastB ? 'di ' + MESI[parseKey(lastB.mese).m - 1] : 'precedenti'}. Volontario e azienda si calcolano con le aliquote in vigore in quel mese, che cambi in Impostazioni.</div>
    <h3 class="group">2 · Dal sito del fondo</h3>
    <section class="card flush" style="margin-top:0">
      ${extLink(LINK_AREA, '<span>Apri l\'area riservata</span>' + ICON_EXT, 'listlink')}
      <div class="banner info" id="calc-info"></div>
      <div class="field"><label for="i-q">Numero quote</label><input id="i-q" inputmode="decimal" autocomplete="off" data-f="q" value="${esc(f.q)}" placeholder="${prevSnap ? esc(ph(prevSnap.q, 3)) : '0,000'}"></div>
      <div class="field"><label for="i-vq">Valore quota</label><input id="i-vq" inputmode="decimal" autocomplete="off" data-f="vq" value="${esc(f.vq)}" placeholder="${prevSnap ? esc(ph(prevSnap.vq, 3)) : '0,000'}"></div>
      <div class="field"><label for="i-e">Totale versato</label><input id="i-e" inputmode="decimal" autocomplete="off" data-f="e" value="${esc(f.e)}" placeholder="${prevSnap ? esc(ph(prevSnap.e, 2)) : '0,00'}"></div>
      <div class="calc" id="calc-snap"></div>
      <div id="calc-check"></div>
    </section>
    ${prevSnap ? '<div class="note">In grigio i valori di ' + MESI[parseKey(prevSnap.k).m - 1] + ' ' + parseKey(prevSnap.k).y + '.</div>' : ''}
    <div id="ins-err"></div>
    <div style="margin:20px 16px 0"><button type="button" class="btn primary big" data-act="ins-save" id="ins-save">Salva ${MESI[parseKey(k).m - 1]}</button></div>`;
}

function refreshInsCalc() {
  const M = model(), f = ui.form; if (!f) return;
  const k = f.k, { m } = parseKey(k), r = rateFor(k);
  const base = parseIt(f.base), tfr = parseIt(f.tfr), q = parseIt(f.q), vq = parseIt(f.vq), e = parseIt(f.e);
  const vol = base > 0 ? base * r.volontario : 0, az = base > 0 ? base * r.azienda : 0;
  const pay = $('#calc-pay');
  if (pay) pay.innerHTML = `<div><span>Volontario · ${pctPlain(r.volontario, r.volontario * 100 % 1 ? 1 : 0)}</span><span class="num">${base > 0 ? eur(vol) : '—'}</span></div>
    <div><span>Azienda · ${pctPlain(r.azienda, r.azienda * 100 % 1 ? 1 : 0)}</span><span class="num">${base > 0 ? eur(az) : '—'}</span></div>
    <div class="strong"><span>Versato nel mese</span><span class="num">${tfr > 0 ? eur(vol + az + tfr) : '—'}</span></div>`;
  const prevSnap = M.P.filter((p) => p.i < idxOf(k)).pop();
  const isCredit = m % 3 === 1;
  const qPrev = isCredit ? quarterInfo(M, m === 1 ? parseKey(k).y - 1 : parseKey(k).y, m === 1 ? 4 : (m - 1) / 3) : null;
  const info = $('#calc-info');
  if (info) {
    if (isCredit && qPrev && qPrev.amt > 0) info.textContent = cap(MESI[m - 1]) + ' è il mese dell\'accredito del ' + qPrev.q + '° trimestre: dalle buste paga sono attesi ' + eur(qPrev.amt) + ', quindi quote e totale versato dovrebbero salire.';
    else info.textContent = 'Le quote cambiano solo con gli accrediti trimestrali (gennaio, aprile, luglio, ottobre). Il valore quota cambia ogni mese.';
  }
  const snap = $('#calc-snap');
  const val = q > 0 && vq > 0 ? q * vq : 0;
  if (snap) snap.innerHTML = `<div class="strong"><span>Valore della posizione</span><span class="num">${val ? eur(val) : '—'}</span></div>
    <div><span>Rendimento</span><span class="num">${val && e > 0 ? eurS(val - e) + ' · ' + pct((val - e) / e) : '—'}</span></div>`;
  const chk = $('#calc-check'); let out = '';
  if (e > 0 && prevSnap) {
    const cred = e - prevSnap.e;
    if (isCredit && qPrev && qPrev.amt > 0) {
      const diff = cred - qPrev.amt;
      out += Math.abs(diff) < 0.05
        ? `<div class="banner ok">Accredito del ${qPrev.q}° trimestre confermato: ${eur(cred)}, uguale alle buste paga.</div>`
        : `<div class="banner ${cred < 1 ? 'warn' : 'bad'}">Il fondo ha accreditato ${eur(cred)}, dalle buste paga risultano ${eur(qPrev.amt)} (differenza ${eurS(diff)}).${cred < 1 ? ' Se l\'accredito non è ancora arrivato, ricontrolla a fine mese.' : ''}</div>`;
    } else if (Math.abs(cred) > 1) out += `<div class="banner warn">Il totale versato cambia di ${eurS(cred)} in un mese senza accredito: controlla il dato sul sito.</div>`;
  }
  if (vq > 0 && prevSnap && prevSnap.c === compartoFor(k) && Math.abs(vq / prevSnap.vq - 1) > 0.05) out += `<div class="banner warn">Il valore quota si discosta di oltre il 5% dal mese prima (${num(prevSnap.vq, 3)} €). Controlla di non aver invertito quote e valore quota.</div>`;
  if (chk) chk.innerHTML = out;
  const err = $('#ins-err'); if (err) err.innerHTML = f.err ? `<div class="card banner bad" style="padding:12px 16px">${esc(f.err)}</div>` : '';
}

function saveIns() {
  const f = ui.form, k = f.k;
  const base = parseIt(f.base), tfr = parseIt(f.tfr), q = parseIt(f.q), vq = parseIt(f.vq), e = parseIt(f.e);
  const anyPay = String(f.base).trim() || String(f.tfr).trim();
  const anySnap = String(f.q).trim() || String(f.vq).trim() || String(f.e).trim();
  const fail = (msg) => { f.err = msg; refreshInsCalc(); };
  if (!anyPay && !anySnap) return fail('Inserisci almeno i dati della busta paga o quelli del sito.');
  if (anyPay && !(tfr >= 0 && isFinite(tfr) && String(f.tfr).trim())) return fail('Manca il TFR del mese.');
  if (anyPay && String(f.base).trim() && !(base > 0)) return fail('L\'imponibile non è un numero valido.');
  if (anySnap && !(q > 0 && vq > 0 && e > 0)) return fail('Per il sito del fondo servono tutti e tre i valori: quote, valore quota e totale versato.');
  if (vq > 1000 || q > 1e7) return fail('I valori del fondo sembrano fuori scala: controlla le virgole.');
  const existed = f.existed;
  if (anyPay) {
    const old = data.bustePaga.find((b) => b.mese === k);
    const row = { mese: k, imponibile: base > 0 ? base : null, tfr };
    if (old && old.aziendaManuale != null && !(base > 0)) row.aziendaManuale = old.aziendaManuale;
    data.bustePaga = data.bustePaga.filter((b) => b.mese !== k).concat([row]).sort((a, b) => a.mese.localeCompare(b.mese));
  }
  if (anySnap) {
    const { y, m } = parseKey(k);
    const row = { mese: k, data: key(y, m) + '-' + String(lastDay(y, m)).padStart(2, '0'), quote: q, valoreQuota: vq, totaleVersato: e, comparto: compartoFor(k) };
    data.valorizzazioni = data.valorizzazioni.filter((v) => v.mese !== k).concat([row]).sort((a, b) => a.mese.localeCompare(b.mese));
  }
  if (existed) { data.modifiche = data.modifiche || {}; data.modifiche[k] = new Date().toISOString().slice(0, 10); }
  persist();
  ui.form = null; ui.selIdx = null;
  toast(monthLabel(k) + ' salvato');
  ui.tab = existed ? 'anni' : 'home'; if (existed) ui.year = parseKey(k).y;
  render(); window.scrollTo(0, 0);
}

/* ---------- Impostazioni ---------- */
function viewImpostazioni(M) {
  const R = effRef();
  const cmpRows = data.comparti.map((c, i) => `<div class="row"><div class="row-top" style="align-items:center"><span class="row-name">${esc(c.nome)}</span>
      <span style="display:flex;gap:8px;align-items:center"><span class="sub" style="margin:0">da ${MESI[parseKey(c.dal).m - 1]} ${parseKey(c.dal).y}</span>${i === data.comparti.length - 1 ? '<span class="pill ok">Attuale</span>' : ''}</span></div>
      ${data.comparti.length > 1 && i > 0 ? `<div class="row-actions"><span></span><button type="button" class="chipbtn" data-act="del-comparto" data-v="${i}">Elimina</button></div>` : ''}</div>`).join('');
  const aliqRows = data.aliquote.map((a, i) => `<div class="row"><div class="row-top" style="align-items:center"><span class="row-name">Da ${MESI[parseKey(a.dal).m - 1]} ${parseKey(a.dal).y}</span>${i === data.aliquote.length - 1 ? '<span class="pill ok">In vigore</span>' : ''}</div>
      <div class="row-meta" style="color:var(--text-2);font-size:14px">Volontario ${pctPlain(a.volontario, 1)} · Azienda ${pctPlain(a.azienda, 1)} dell'imponibile</div>
      ${data.aliquote.length > 1 && i > 0 ? `<div class="row-actions"><span></span><button type="button" class="chipbtn" data-act="del-aliquota" data-v="${i}">Elimina</button></div>` : ''}</div>`).join('');
  const lastCoefKey = Object.keys(R.tfr.coefficienti).sort().pop();
  const newer = refUser && refUser.base && ref.versione > refUser.base;
  return `<div class="head"><h1>Impostazioni</h1></div>
    <h3 class="group">Il tuo fondo</h3>
    <section class="card flush" style="margin-top:0">
      <div class="row"><div class="row-name">${esc(data.fondo.nome)}</div><div class="row-meta">Albo COVIP n. ${esc(data.fondo.albo_covip || '—')} · adesione ${esc(data.fondo.adesione || '—')}</div></div>
      ${extLink(LINK_FONDO, '<span>Dettagli sul fondo</span>' + ICON_EXT, 'listlink')}
      ${extLink(LINK_AREA, '<span>Area riservata lavoratori</span>' + ICON_EXT, 'listlink')}
    </section>

    <h3 class="group">Comparti</h3>
    <section class="card flush" style="margin-top:0">${cmpRows || '<div class="row sub">Nessun comparto registrato</div>'}
      <button type="button" class="listlink" data-act="sheet" data-v="comparto">+ Aggiungi un cambio di comparto</button></section>

    <h3 class="group">Aliquote</h3>
    <section class="card flush" style="margin-top:0">${aliqRows}
      <button type="button" class="listlink" data-act="sheet" data-v="aliquota">+ Aggiungi un cambio di aliquota</button></section>
    <div class="note">Ogni aliquota vale da quel mese in poi: i mesi passati restano calcolati con quella dell'epoca.</div>

    <h3 class="group">Dati di confronto</h3>
    <section class="card flush" style="margin-top:0">
      ${newer ? `<div class="banner info">Sono disponibili dati ufficiali più recenti (${esc(ref.aggiornato || ref.versione)}). <button type="button" class="chipbtn" style="margin-top:8px" data-act="ref-reset">Usa i dati ufficiali</button></div>` : ''}
      <div class="row"><div class="row-top"><span>Costi fondi aperti</span><span class="num">${pctPlain(R.isc.fondiAperti)}</span></div>
        <div class="row-top" style="margin-top:6px"><span>Costi PIP</span><span class="num">${pctPlain(R.isc.pip)}</span></div>
        ${Object.keys(R.fondo.iscComparti).map((c) => `<div class="row-top" style="margin-top:6px"><span>Costi comparto ${esc(c)}</span><span class="num">${pctPlain(R.fondo.iscComparti[c])}</span></div>`).join('')}
        <div class="row-meta" style="margin-top:8px">${refUser ? '<b>Valori inseriti da te</b> il ' + esc(refUser.salvato) : 'Fonte: ' + esc(R.isc.fonte)}</div></div>
      <div class="row"><div class="row-top"><span>Rivalutazione TFR</span><span class="num">${num(R.tfr.coefficienti[lastCoefKey], 3)}%</span></div>
        <div class="row-meta">Ultimo coefficiente: ${monthLabel(lastCoefKey)} · ISTAT, si aggiorna da solo</div></div>
      <button type="button" class="listlink" data-act="sheet" data-v="ref">Modifica i costi</button>
      ${refUser ? '<button type="button" class="listlink" data-act="ref-reset">Ripristina valori ufficiali</button>' : ''}
    </section>
    <div class="note">Dati pubblici aggiornati al ${esc(ref.aggiornato || ref.versione)}. Si scaricano da soli quando sei online.</div>

    <h3 class="group">Promemoria</h3>
    <section class="card flush" style="margin-top:0">
      <button type="button" class="listlink" data-act="guide-toggle" aria-expanded="${ui.guideOpen}">${ui.guideOpen ? 'Nascondi la guida' : 'Come attivare il promemoria mensile'}</button>
      ${ui.guideOpen ? `<div class="details" style="padding:4px 18px 16px">
        <div>Le web app non possono mandare promemoria da sole: li fa <b>Comandi Rapidi</b> di iOS, gratis.</div>
        <div><b>1.</b> Apri l'app Comandi › Automazione › Nuova automazione › <b>Ora del giorno</b>.</div>
        <div><b>2.</b> Scegli <b>Mensilmente</b>, il giorno in cui di solito arriva la busta paga, e un orario.</div>
        <div><b>3.</b> Seleziona <b>Esegui immediatamente</b> e attiva <b>Notifica quando eseguito</b>.</div>
        <div><b>4.</b> Come azione aggiungi <b>Apri URL</b> con l'indirizzo dell'app: <span class="num" style="word-break:break-all">${esc(location.origin + location.pathname)}</span></div>
        <div>Ripeti per l'ultimo giorno del mese, quando il fondo pubblica il valore quota.</div>
      </div>` : ''}
    </section>

    <h3 class="group">Privacy e dati</h3>
    <section class="card flush" style="margin-top:0">
      <div class="row"><div class="row-name" style="font-weight:400">Dati solo su questo iPhone</div><div class="row-meta">Nessun account, nessun server. Fai un backup ogni tanto e salvalo in File › iCloud Drive.</div></div>
      <button type="button" class="listlink" data-act="export">Esporta backup</button>
      <label class="listlink" for="imp-file2" style="cursor:pointer">Importa backup</label>
      <input id="imp-file2" class="sr" type="file" accept=".json,application/json" data-act="import">
      <button type="button" class="listlink" style="color:var(--bad)" data-act="wipe">Elimina tutti i dati</button>
    </section>
    <div class="note">Quota ${APP_VERSION} · dati pubblici ${esc(ref.versione)}</div>`;
}

/* ---------- Fogli (aggiunte e dati di confronto) ---------- */
function renderSheet() {
  const root = $('#sheet-root');
  if (!ui.sheet) { root.innerHTML = ''; return; }
  const s = ui.sheet, R = effRef();
  const head = (t) => `<div class="grabber"></div><div class="sheet-head"><button type="button" data-act="sheet-close">Annulla</button><span class="t">${t}</span><button type="button" data-act="sheet-save" style="font-weight:600">Salva</button></div>`;
  let body = '';
  if (s.type === 'comparto') {
    body = head('Cambio di comparto') + `<h3 class="group">Dal mese</h3><section class="card flush" style="margin-top:0">
      <div class="field"><label for="s-dal">Mese</label><input id="s-dal" type="month" data-s="dal" value="${esc(s.dal || todayKey())}"></div>
      <div class="field"><label for="s-nome">Comparto</label><select id="s-nome" data-s="nome">${COMPARTI.map((c) => `<option ${c === s.nome ? 'selected' : ''}>${c}</option>`).join('')}</select></div></section>
      <div class="note">Le valorizzazioni da quel mese in poi verranno attribuite al nuovo comparto.</div>`;
  } else if (s.type === 'aliquota') {
    body = head('Cambio di aliquota') + `<section class="card flush">
      <div class="field"><label for="s-dal">Dal mese</label><input id="s-dal" type="month" data-s="dal" value="${esc(s.dal || todayKey())}"></div>
      <div class="field"><label for="s-vol">Volontario %</label><input id="s-vol" inputmode="decimal" data-s="vol" value="${esc(s.vol || '')}" placeholder="es. 1"></div>
      <div class="field"><label for="s-az">Azienda %</label><input id="s-az" inputmode="decimal" data-s="az" value="${esc(s.az || '')}" placeholder="es. 1,5"></div></section>
      <div class="note">Percentuali sull'imponibile, come in busta paga.</div>`;
  } else if (s.type === 'ref') {
    body = head('Costi di confronto') + `<div class="note" style="margin-top:12px">Usa l'ISC a <b>10 anni</b>. Lo trovi così:</div>
      <div class="details" style="margin:8px 20px 0"><div><b>Fondi aperti e PIP</b>: relazione annuale COVIP (esce a giugno), tabella "Indicatore sintetico dei costi", colonna 10 anni, valori medi.</div>
      <div><b>Il tuo comparto</b>: sito del fondo › Scheda costi, colonna "10 anni".</div></div>
      <section class="card flush">
        <div class="field"><label for="s-fpa">Fondi aperti %</label><input id="s-fpa" inputmode="decimal" data-s="fpa" value="${esc(s.fpa)}"></div>
        <div class="field"><label for="s-pip">PIP %</label><input id="s-pip" inputmode="decimal" data-s="pip" value="${esc(s.pip)}"></div>
        ${Object.keys(R.fondo.iscComparti).map((c) => `<div class="field"><label for="s-c-${c}">${esc(c)} %</label><input id="s-c-${c}" inputmode="decimal" data-s="c-${c}" value="${esc(s['c-' + c])}"></div>`).join('')}
      </section>
      <div class="note">Valori accettati tra 0,05% e 5%. Puoi sempre tornare ai valori ufficiali.</div>`;
  }
  root.innerHTML = `<div class="scrim" data-act="sheet-scrim"><div class="sheet" role="dialog" aria-modal="true">${body}<div id="sheet-err"></div></div></div>`;
}

function openSheet(type) {
  const R = effRef();
  if (type === 'ref') {
    const s = { type, fpa: num(R.isc.fondiAperti * 100, 2), pip: num(R.isc.pip * 100, 2) };
    for (const c in R.fondo.iscComparti) s['c-' + c] = num(R.fondo.iscComparti[c] * 100, 2);
    ui.sheet = s;
  } else ui.sheet = { type, dal: todayKey(), nome: 'Dinamico' };
  renderSheet();
}

function sheetError(msg) { $('#sheet-err').innerHTML = `<div class="card banner bad" style="padding:12px 16px">${esc(msg)}</div>`; }

function saveSheet() {
  const s = ui.sheet;
  if (s.type === 'comparto') {
    if (!/^\d{4}-\d{2}$/.test(s.dal || '')) return sheetError('Scegli il mese.');
    data.comparti = data.comparti.filter((c) => c.dal !== s.dal).concat([{ nome: s.nome || 'Dinamico', dal: s.dal }]).sort((a, b) => a.dal.localeCompare(b.dal));
    for (const v of data.valorizzazioni) if (v.mese >= s.dal) v.comparto = compartoFor(v.mese);
  } else if (s.type === 'aliquota') {
    const vol = parseIt(s.vol), az = parseIt(s.az);
    if (!/^\d{4}-\d{2}$/.test(s.dal || '')) return sheetError('Scegli il mese.');
    if (!(vol >= 0 && vol <= 20) || !(az >= 0 && az <= 20)) return sheetError('Le percentuali devono essere tra 0 e 20.');
    data.aliquote = data.aliquote.filter((a) => a.dal !== s.dal).concat([{ dal: s.dal, volontario: vol / 100, azienda: az / 100 }]).sort((a, b) => a.dal.localeCompare(b.dal));
  } else if (s.type === 'ref') {
    const ok = (v) => v >= 0.05 && v <= 5;
    const fpa = parseIt(s.fpa), pip = parseIt(s.pip);
    if (!ok(fpa) || !ok(pip)) return sheetError('I costi devono essere tra 0,05% e 5%. Attenzione alle virgole: 1,36 e non 136.');
    const comps = {};
    for (const c in effRef().fondo.iscComparti) { const v = parseIt(s['c-' + c]); if (!ok(v)) return sheetError('Il costo del comparto ' + c + ' deve essere tra 0,05% e 5%.'); comps[c] = v / 100; }
    refUser = { base: ref.versione, salvato: new Date().toISOString().slice(0, 10), isc: { fondiAperti: fpa / 100, pip: pip / 100 }, iscComparti: comps };
    saveJSON(REF_USER_KEY, refUser);
  }
  if (s.type !== 'ref') persist();
  ui.sheet = null; toast('Salvato'); render();
}

/* ======================= Import / export ======================= */
function importFile(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const j = JSON.parse(rd.result);
      if (j.formato !== 'quota-backup') throw new Error('formato');
      const d = normalize(j);
      if (data && (data.bustePaga.length || data.valorizzazioni.length) && !confirm('Sostituire i dati attuali con quelli del file?')) return;
      data = d; persist(); ui.tab = 'home'; ui.selIdx = null; ui.form = null;
      toast('Importati ' + d.bustePaga.length + ' mesi di busta paga e ' + d.valorizzazioni.length + ' valori del fondo');
      render();
    } catch (e) { toast('Il file non è un backup di Quota valido'); }
  };
  rd.readAsText(file);
}
async function exportData() {
  const out = Object.assign({}, data, { esportato: new Date().toISOString().slice(0, 10) });
  const name = 'quota-backup-' + out.esportato + '.json';
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Backup Quota' }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ======================= Eventi ======================= */
let toastTimer = null;
function toast(msg) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, v = el.dataset.v;
  if (act === 'sheet-scrim' && ev.target !== el) return;
  switch (act) {
    case 'tab': ui.tab = v; if (v === 'inserisci') { ui.insMonth = null; ui.form = null; } render(); window.scrollTo(0, 0); break;
    case 'range': ui.range = v; ui.selIdx = null; render(); break;
    case 'year': ui.year = Number(v); render(); break;
    case 'cmp-toggle': ui.cmpOpen = !ui.cmpOpen; render(); break;
    case 'guide-toggle': ui.guideOpen = !ui.guideOpen; render(); break;
    case 'ins-month': ui.tab = 'inserisci'; ui.insMonth = v; ui.form = null; render(); window.scrollTo(0, 0); break;
    case 'ins-save': saveIns(); break;
    case 'start-empty': data = normalize(emptyData()); data.comparti = [{ nome: 'Dinamico', dal: todayKey() }]; persist(); ui.tab = 'impostazioni'; render(); break;
    case 'export': exportData(); break;
    case 'wipe': if (confirm('Eliminare tutti i dati da questo telefono? Fai prima un backup.')) { localStorage.removeItem(STORE_KEY); data = null; render(); } break;
    case 'sheet': openSheet(v); break;
    case 'sheet-close': case 'sheet-scrim': ui.sheet = null; renderSheet(); break;
    case 'sheet-save': saveSheet(); break;
    case 'ref-reset': refUser = null; localStorage.removeItem(REF_USER_KEY); toast('Valori ufficiali ripristinati'); render(); break;
    case 'del-comparto': if (confirm('Eliminare questo cambio di comparto?')) { data.comparti.splice(Number(v), 1); for (const x of data.valorizzazioni) x.comparto = compartoFor(x.mese); persist(); render(); } break;
    case 'del-aliquota': if (confirm('Eliminare questa aliquota? I mesi interessati verranno ricalcolati.')) { data.aliquote.splice(Number(v), 1); persist(); render(); } break;
  }
});

document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.dataset.f && ui.form) { ui.form[t.dataset.f] = t.value; ui.form.err = null; refreshInsCalc(); }
  if (t.dataset.s && ui.sheet) { ui.sheet[t.dataset.s] = t.value; }
});
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.dataset.act === 'import' && t.files && t.files[0]) { importFile(t.files[0]); t.value = ''; }
  if (t.dataset.act === 'ins-select') { ui.insMonth = t.value; ui.form = null; render(); }
  if (t.dataset.s && ui.sheet) { ui.sheet[t.dataset.s] = t.value; }
});
let resizeT = null;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (ui.tab === 'home') render(); }, 200); });

/* ======================= Avvio ======================= */
(function start() {
  const saved = loadJSON(STORE_KEY);
  data = saved ? normalize(saved) : null;
  refUser = loadJSON(REF_USER_KEY);
  const cached = loadJSON(REF_CACHE_KEY);
  if (cached && cached.versione > ref.versione) ref = cached;
  render();
  refreshRef();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
