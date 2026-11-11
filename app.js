/* Quota – previdenza complementare sotto controllo.
   Web app locale: tutti i dati personali restano nel browser del telefono (localStorage).
   Nessun server, nessun account. */
'use strict';

/* ======================= Costanti e utilità ======================= */
const APP_VERSION = '1.9.0';
const DISCLAIMER = 'Progetto personale e indipendente, non affiliato a Previdenza Cooperativa né ad altri fondi. Le stime non costituiscono consulenza finanziaria.';
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

/* Ipotesi delle proiezioni della pagina Pensione (aggiornabili da riferimenti.json).
   Rendimenti reali attesi per comparto, al lordo di costi e tasse: Previdenza Cooperativa,
   "Metodologia e ipotesi per il calcolo delle proiezioni pensionistiche" (azionario 4%, obbligazionario 2%).
   quotaTasse: parte del rendimento netto dai costi che se ne va in tasse; calibrata in modo che il
   Dinamico ricostruisca la previsione del prospetto 2025 (2,55% reale netto). */
const PROIEZIONI_BUILTIN = {
  fonte: 'Previdenza Cooperativa, metodologia delle proiezioni (ipotesi COVIP)',
  rendimentiLordi: { Sicuro: 0.02, Bilanciato: 0.026, Dinamico: 0.03 },
  quotaTasse: 0.066,
  crescitaContributi: 0.01,
  inflazione: 0.02,
  costoFissoAnnuo: 12,
  etaPensione: 67,
  coeffRendita67: 0.041,
  coeffRenditaPerAnno: 0.0015,
  tassaPrestazione: { base: 0.15, riduzioneAnnua: 0.003, dopoAnni: 15, minimo: 0.09 },
  scartoScenari: 0.01,
  link: {
    metodologia: 'https://www.previdenzacooperativa.it/wp-content/uploads/2023/11/Metodologia-e-ipotesi-per-il-calcolo-delle-proiezioni-pensionistiche.pdf',
    covip: 'https://www.covip.it'
  }
};

// Dati pubblici incorporati: l'app funziona anche se il download non riesce.
const REF_BUILTIN = {
  formato: 'quota-riferimenti', versione: '2026-11-11.2', aggiornato: '2026-11-11',
  deducibilita: { fonte: 'D.Lgs. 252/2005 art. 8 c. 4, come modificato dalla Legge 199/2025 (Bilancio 2026)', limiti: { '2007': 5164.57, '2026': 5300 } },
  tfr: { fonte: 'ISTAT, indice FOI', imposta: 0.17, coefficienti: {
    '2024-12': 2.320017,
    '2025-01': 0.561772, '2025-02': 0.811564, '2025-03': 1.123752, '2025-04': 1.186356, '2025-05': 1.248960, '2025-06': 1.436356,
    '2025-07': 1.873336, '2025-08': 1.998336, '2025-09': 2.060940, '2025-10': 1.998752, '2025-11': 2.061356, '2025-12': 2.311148,
    '2026-01': 0.363025, '2026-02': 0.862716, '2026-03': 1.437346, '2026-04': 2.311728, '2026-05': 2.661543, '2026-06': 2.786543,
    '2026-07': 3.136358, '2026-08': 3.710988, '2026-09': 4.285617 } },
  irpef: { fonte: 'TUIR art. 11, come modificato dalla Legge 199/2025 (Bilancio 2026)', aliquote: { '2024': [0.23, 0.35, 0.43], '2026': [0.23, 0.33, 0.43] } },
  isc: { anno: 2025, fonte: 'COVIP, Relazione annuale 2025: ISC medio a 10 anni', fondiAperti: 0.0136, pip: 0.0217, fondiNegoziali: 0.0047 },
  fondo: { nome: 'Previdenza Cooperativa', fonte: 'Previdenza Cooperativa, scheda costi: ISC a 10 anni', iscComparti: { Sicuro: 0.0067, Bilanciato: 0.0038, Dinamico: 0.0027 },
    // Composizione, aree, rischio e rendimenti annui dei comparti (dati pubblici del fondo).
    comparti: {"al": "2025-12-31", "fonte": "Previdenza Cooperativa, Nota informativa: schede Presentazione e Opzioni di investimento (in vigore dal 31/10/2026), dati al 31/12/2025", "link": "https://www.previdenzacooperativa.it/wp-content/uploads/2023/11/Scheda-Le-opzioni-di-investimento.pdf", "Sicuro": {"categoria": "Garantito", "livello": 1, "orizzonte": "Breve, fino a 5 anni dalla pensione", "garanzia": "Capitale versato restituito alla scadenza della convenzione", "avvio": "2006-10-01", "patrimonio": 508749563, "azioni": 3, "obbligazioni": 97, "governativi": 80.2, "corporate": 15.7, "liquidita": 1.2, "durationMesi": 26, "valuta": 2.7, "ter": 0.0063, "aree": {"Italia": 35.4, "Altri Paesi area euro": 51.2, "Altri Paesi UE": 7.2, "Stati Uniti": 4.1, "Giappone": 0.3, "Altri Paesi OCSE": 0.6, "Paesi non OCSE": 0.0}, "rendimenti": {"2025": [1.89, null]}, "nota": "Obiettivo: rendimento almeno pari all'inflazione italiana; volatilità tenuta sotto il 4% l'anno."}, "Bilanciato": {"categoria": "Obbligazionario misto", "livello": 2, "orizzonte": "Medio, tra 5 e 15 anni dalla pensione", "garanzia": null, "avvio": "2020-01-02", "patrimonio": 1673825673, "azioni": 31, "obbligazioni": 69, "governativi": 45.0, "corporate": 22.1, "liquidita": 0.9, "durationMesi": 71, "valuta": 27.6, "ter": 0.0024, "aree": {"Italia": 11.8, "Altri Paesi area euro": 28.8, "Altri Paesi UE": 1.5, "Stati Uniti": 38.5, "Giappone": 1.7, "Altri Paesi OCSE": 11.8, "Paesi non OCSE": 3.9}, "rendimenti": {"2020": [4.8, 4.0], "2021": [6.1, 5.6], "2022": [-9.6, -8.7], "2023": [7.3, 7.2], "2024": [8.3, 7.2], "2025": [3.32, 3.83]}, "nota": null}, "Dinamico": {"categoria": "Azionario", "livello": 3, "orizzonte": "Lungo, oltre 15 anni dalla pensione", "garanzia": null, "avvio": "2020-01-02", "patrimonio": 324525230, "azioni": 51, "obbligazioni": 49, "governativi": 32.4, "corporate": 13.5, "liquidita": 2.4, "durationMesi": 65, "valuta": 23.8, "ter": 0.0023, "aree": {"Italia": 11.9, "Altri Paesi area euro": 20.0, "Altri Paesi UE": 1.2, "Stati Uniti": 43.8, "Giappone": 2.4, "Altri Paesi OCSE": 11.4, "Paesi non OCSE": 5.6}, "rendimenti": {"2020": [5.9, 5.7], "2021": [10.0, 8.7], "2022": [-11.3, -11.2], "2023": [8.5, 9.5], "2024": [11.0, 9.5], "2025": [6.1, 5.9]}, "nota": null}} },
  proiezioni: PROIEZIONI_BUILTIN
};

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const thousands = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function num(n, d) { const p = Math.abs(n).toFixed(d).split('.'); return (n < 0 && Math.abs(n) >= Math.pow(10, -d) / 2 ? '−' : '') + thousands(p[0]) + (p[1] ? ',' + p[1] : ''); }
/* Modalità privata: ogni importo passa da eur()/eurS(). Con la modalità attiva restituiscono
   sempre lo stesso numero di pallini (mai quante cifre ha l'importo vero). Le viste mostrano
   al loro posto percentuali e rapporti; il mascheramento qui è la rete di sicurezza. */
const MASK = '€ •••••';
const priv = () => ui.priv === true;
function eur(n, d = 2) { return priv() ? MASK : num(n, d) + ' €'; }
function eurS(n, d = 2) { return priv() ? MASK : (n >= 0 ? '+' : '') + eur(n, d); }
// Quota percentuale intera ("37%"), per le parti di un totale.
function pq(x) { return isFinite(x) ? Math.round(x * 100) + '%' : '—'; }
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
// "settembre" se è lo stesso anno di rif, altrimenti "dicembre 2025"
const prevMonthLabel = (k, rif) => { const a = parseKey(k); return MESI[a.m - 1] + (a.y !== parseKey(rif).y ? ' ' + a.y : ''); };
// "12 marzo 2026" da "2026-03-12"
const isoLabel = (s) => { const [y, m, d] = s.split('-').map(Number); return d + ' ' + MESI[m - 1] + ' ' + y; };
function todayKey() { const d = new Date(); return key(d.getFullYear(), d.getMonth() + 1); }

/* ---------- Giorno di paga e giorni feriali ---------- */
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
// Pasqua (calendario gregoriano, algoritmo di Meeus/Jones/Butcher)
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mese = Math.floor((h + l - 7 * m + 114) / 31), giorno = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mese - 1, giorno);
}
// Festività nazionali italiane (L. 260/1949 e succ.; 4 ottobre dal 2026, L. 151/2025)
const FESTE_FISSE = ['01-01', '01-06', '04-25', '05-01', '06-02', '08-15', '11-01', '12-08', '12-25', '12-26'];
function isFestivo(d) {
  const y = d.getFullYear(), md = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  if (FESTE_FISSE.includes(md) || (y >= 2026 && md === '10-04')) return true;
  const pq = easter(y); pq.setDate(pq.getDate() + 1); // Lunedì dell'Angelo
  return d.getMonth() === pq.getMonth() && d.getDate() === pq.getDate();
}
const isFeriale = (d) => d.getDay() !== 0 && d.getDay() !== 6 && !isFestivo(d);
function giornoPaga() { const g = data && data.impostazioni ? Number(data.impostazioni.giornoPaga) : 1; return g >= 1 && g <= 31 ? g : 1; }
// Data in cui la busta paga del mese (y, m) diventa disponibile: il giorno impostato
// (o l'ultimo del mese, se il mese è più corto), spostato al primo giorno feriale.
function paydayDate(y, m) {
  const d = new Date(y, m - 1, Math.min(giornoPaga(), lastDay(y, m)));
  while (!isFeriale(d)) d.setDate(d.getDate() + 1);
  return d;
}
const dayLabel = (d) => GIORNI[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
// Ultima data di paga già arrivata (indice del mese di arrivo) e la prossima.
function paydayInfo(now = new Date()) {
  const oggi = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let i = now.getFullYear() * 12 + now.getMonth();
  const at = (j) => paydayDate(Math.floor(j / 12), (j % 12) + 1);
  while (at(i) > oggi) i--;
  return { arrivo: i, prossima: at(i + 1) };
}

/* ======================= Stato ======================= */
let data = null;          // dati personali
let ref = REF_BUILTIN;    // dati pubblici ufficiali (incorporati o scaricati)
let refUser = null;       // eventuali valori inseriti dall'utente
const ui = { pens: { vol: null, g: null, ex: 0, sc: 0 }, priv: false, tab: 'home', range: 'all', selIdx: null, year: null, insMonth: null, form: null, cmpOpen: false, cmpDet: false, sheet: null, guideOpen: false, intro: null, guida: null, introVista: 0 };

function loadJSON(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('Impossibile salvare: memoria del browser non disponibile'); return false; } }
function persist() { if (data) saveJSON(STORE_KEY, data); }
// Preferenze dell'app (non fanno parte del backup): la modalità privata resta com'era all'ultima chiusura; intro = versione dell'introduzione già vista.
function savePref() { saveJSON(PREF_KEY, { privata: ui.priv, intro: ui.introVista }); }

function emptyData() {
  return {
    formato: 'quota-backup', versione: 1, esportato: null,
    fondo: { nome: 'Previdenza Cooperativa', albo_covip: 170, adesione: 'collettiva', sito: LINK_FONDO, areaRiservata: LINK_AREA },
    impostazioni: { giornoPaga: 1, scaglioneIrpef: 2 },
    comparti: [], aliquote: [], bustePaga: [], valorizzazioni: [], versamentiVolontari: [], modifiche: {},
    pensione: { nascita: null }, prospetto: null
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
    // Contributi letti dalla busta paga (facoltativi): se mancano si stimano dalle aliquote.
    if (b.azienda != null && isFinite(b.azienda)) r.azienda = Number(b.azienda);
    if (b.volontario != null && isFinite(b.volontario)) r.volontario = Number(b.volontario);
    if (b.nota) r.nota = b.nota;
    return r;
  });
  out.valorizzazioni = (d.valorizzazioni || []).filter((v) => v && v.mese && v.quote > 0 && v.valoreQuota > 0).map((v) => ({
    mese: v.mese, data: v.data || null, quote: Number(v.quote), valoreQuota: Number(v.valoreQuota), totaleVersato: Number(v.totaleVersato), comparto: v.comparto || null
  }));
  // Versamenti volontari fuori busta paga (bonifico al fondo): dedotti o non dedotti.
  out.versamentiVolontari = (d.versamentiVolontari || []).filter((x) => x && /^\d{4}-\d{2}-\d{2}$/.test(x.data || '') && Number(x.importo) > 0).map((x, i) => {
    const r = { id: String(x.id || 'vv' + Date.now().toString(36) + i), data: x.data, importo: Number(x.importo), dedotto: x.dedotto !== false };
    if (!r.dedotto && x.comunicato) r.comunicato = true;
    if (x.nota) r.nota = String(x.nota).slice(0, 200);
    return r;
  }).sort((a, b) => a.data.localeCompare(b.data));
  out.modifiche = d.modifiche || {};
  // Pagina Pensione: mese di nascita (facoltativo) e dati del prospetto annuale del fondo (facoltativi).
  if (d.pensione && /^\d{4}-\d{2}$/.test(d.pensione.nascita || '')) out.pensione.nascita = d.pensione.nascita;
  const pr = d.prospetto;
  if (pr && /^\d{4}-\d{2}-\d{2}$/.test(pr.dataPensione || '') && pr.posizioneFinale > 0 && pr.renditaAnnua > 0) {
    out.prospetto = { anno: Number(pr.anno) || null, dataPensione: pr.dataPensione, posizioneFinale: Number(pr.posizioneFinale), renditaAnnua: Number(pr.renditaAnnua),
      adesione: /^\d{4}-\d{2}-\d{2}$/.test(pr.adesione || '') ? pr.adesione : null, fonte: pr.fonte === 'pdf' ? 'pdf' : 'mano' };
    const v = pr.verifica;
    if (v && v.posizione > 0) out.prospetto.verifica = { posizione: Number(v.posizione), vol: Number(v.vol) || 0, az: Number(v.az) || 0, tfr: Number(v.tfr) || 0 };
  }
  const gp = Math.round(Number(d.impostazioni && d.impostazioni.giornoPaga));
  out.impostazioni.giornoPaga = gp >= 1 && gp <= 31 ? gp : 1;
  const sc = Math.round(Number(d.impostazioni && d.impostazioni.scaglioneIrpef));
  out.impostazioni.scaglioneIrpef = sc >= 1 && sc <= 3 ? sc : 2;
  const byKey = (a, b) => (a.dal || a.mese).localeCompare(b.dal || b.mese);
  out.comparti.sort(byKey); out.aliquote.sort(byKey); out.bustePaga.sort(byKey); out.valorizzazioni.sort(byKey);
  if (!out.aliquote.length) out.aliquote.push({ dal: '2000-01', volontario: 0, azienda: 0 });
  return out;
}

/* ======================= Dati pubblici ======================= */
function effRef() {
  const r = JSON.parse(JSON.stringify(ref));
  if (!r.deducibilita) r.deducibilita = REF_BUILTIN.deducibilita;
  if (!r.irpef) r.irpef = REF_BUILTIN.irpef;
  if (!r.proiezioni) r.proiezioni = REF_BUILTIN.proiezioni;
  if (!r.fondo.comparti) r.fondo.comparti = REF_BUILTIN.fondo.comparti;
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
/* Versamenti volontari fuori busta paga. k = mese "AAAA-MM", i = indice del mese. */
function extras() { return (data.versamentiVolontari || []).map((x) => ({ ...x, k: x.data.slice(0, 7), i: idxOf(x.data.slice(0, 7)), y: Number(x.data.slice(0, 4)) })); }
/* Contributi del mese: quelli letti dalla busta paga se ci sono, altrimenti stimati dalle aliquote.
   stimato = almeno uno dei due contributi è calcolato e non letto. */
function monthCalc(b) {
  if (!b) return null;
  const letti = b.azienda != null && b.volontario != null;
  if (b.imponibile == null) {
    const az = b.azienda != null ? b.azienda : (b.aziendaManuale || 0), vol = b.volontario != null ? b.volontario : 0;
    return { base: null, tfr: b.tfr, vol, az, tot: vol + az + b.tfr, stimato: !letti };
  }
  const r = rateFor(b.mese);
  const vol = b.volontario != null ? b.volontario : b.imponibile * r.volontario;
  const az = b.azienda != null ? b.azienda : b.imponibile * r.azienda;
  return { base: b.imponibile, tfr: b.tfr, vol, az, tot: vol + az + b.tfr, r, stimato: !letti };
}

/* Limite di deducibilità in vigore nell'anno (dati pubblici, aggiornabili da riferimenti.json). */
function limiteDeducibile(y) {
  const L = effRef().deducibilita.limiti; let v = null;
  for (const k of Object.keys(L).sort()) if (Number(k) <= y) v = L[k];
  return v;
}
/* Spazio deducibile dell'anno: contributo tuo + azienda, per mese di competenza della busta paga. Il TFR non conta. */
function deducibile(M, y) {
  const lim = limiteDeducibile(y); if (lim == null) return null;
  let vol = 0, az = 0, mesi = 0, stimati = 0, ultimo = 0, xd = 0, xn = 0;
  for (let m = 1; m <= 12; m++) {
    const d = M.months[key(y, m)]; if (!d) continue;
    vol += d.vol; az += d.az; mesi++; ultimo = m; if (d.stimato) stimati++;
  }
  // Versamenti fuori busta: quelli dedotti usano lo spazio, quelli non dedotti no.
  for (const x of M.X) if (x.y === y) { if (x.dedotto) xd += x.importo; else xn += x.importo; }
  const busta = vol + az;
  vol += xd;
  const usato = vol + az;
  // Proiezione a fine anno: media delle buste registrate per i mesi che mancano (solo se l'anno è in corso).
  const proiezione = mesi && ultimo < 12 ? usato + (busta / mesi) * (12 - ultimo) : null;
  return { y, lim, vol, az, usato, resto: lim - usato, oltre: Math.max(0, usato - lim), mesi, stimati, ultimo, proiezione, xd, xn };
}
function snaps() {
  return data.valorizzazioni.map((v) => ({ k: v.mese, i: idxOf(v.mese), q: v.quote, vq: v.valoreQuota, e: v.totaleVersato, v: v.quote * v.valoreQuota, c: v.comparto || compartoFor(v.mese), data: v.data }));
}

function model() {
  const B = buste(), P = snaps();
  const months = {};
  for (const b of data.bustePaga) months[b.mese] = monthCalc(b);
  const last = P[P.length - 1] || null;
  const X = extras();
  let tv = 0, tvol = 0, taz = 0, ttfr = 0;
  for (const k in months) { const d = months[k]; tv += d.tot; tvol += d.vol; taz += d.az; ttfr += d.tfr; }
  for (const x of X) { tv += x.importo; tvol += x.importo; }
  const firstKey = data.bustePaga.length ? data.bustePaga[0].mese : (P[0] ? P[0].k : todayKey());
  return { B, P, X, months, last, tv, tvol, taz, ttfr, firstKey };
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
  // Versamenti fuori busta arrivati tra i due valori del fondo: sono nello stesso accredito.
  let extra = 0; for (const x of M.X) if (x.i > end.i && x.i <= next.i) extra += x.importo;
  const cred = next.e - end.e, diff = cred - amt - extra;
  res.cred = cred; res.diff = diff; res.extra = extra;
  const di = extra > 0 ? ' (di cui ' + eur(extra) + ' fuori busta)' : '';
  if (Math.abs(diff) < 0.05) { res.st = 'ok'; res.note = 'Accreditati ' + eur(cred) + di + ' · al centesimo'; }
  else { res.st = 'diff'; res.note = 'Accreditati ' + eur(cred) + di + ' · differenza ' + eurS(diff); }
  return res;
}

function yearsRange(M) {
  const y0 = parseKey(M.firstKey).y, y1 = Math.max(parseKey(todayKey()).y, M.last ? parseKey(M.last.k).y : y0);
  const ys = []; for (let y = y0; y <= y1; y++) ys.push(y); return ys;
}

function pendingMonth(M) {
  // Il mese da completare è quello dell'ultima busta paga arrivata: la busta di un mese
  // arriva nel mese dopo, dal giorno di paga (spostato al primo giorno feriale).
  const P = paydayInfo();
  const k = keyOf(P.arrivo - 1);
  if (k < M.firstKey) return null;
  const needPay = !M.B[k], needSnap = !M.P.find((p) => p.k === k);
  return { k, needPay, needSnap, done: !needPay && !needSnap, prossima: P.prossima, prossimoMese: keyOf(P.arrivo) };
}

/* Stato dei dati per il pulsante della Panoramica e il riquadro della pagina Inserisci.
   Mese in corso: contano busta paga e dati del fondo. Mesi precedenti: contano solo le buste
   paga (si recuperano sempre); i dati del fondo passati non si possono più recuperare dal sito.
   livello: 'ok' tutto inserito · 'warn' manca qualcosa · 'bad' mancano entrambi i dati del mese in corso. */
function statoDati(M) {
  const pm = pendingMonth(M);
  const empty = !data.bustePaga.length && !data.valorizzazioni.length;
  const fine = pm ? pm.k : keyOf(idxOf(todayKey()) - 1);
  const bustePassate = [];
  if (!empty) for (let i = idxOf(M.firstKey); i < idxOf(fine); i++) { const k = keyOf(i); if (!M.B[k]) bustePassate.push(k); }
  let livello = 'ok';
  if (empty || (pm && pm.needPay && pm.needSnap)) livello = 'bad';
  else if ((pm && !pm.done) || bustePassate.length) livello = 'warn';
  return { pm, bustePassate, livello, empty };
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
  // Fuori busta: già nel valore del fondo; senza fondo sarebbero rimasti in tasca.
  for (const x of M.X) if (x.i <= D) { versD += x.importo; volD += x.importo; }
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

/* Aliquota IRPEF del proprio scaglione (Impostazioni) in vigore nell'anno y. */
function aliquotaIrpef(y) {
  const A = effRef().irpef.aliquote; let v = null;
  for (const k of Object.keys(A).sort()) if (Number(k) <= y) v = A[k];
  if (!v) v = A[Object.keys(A).sort()[0]];
  return v[(data.impostazioni.scaglioneIrpef || 2) - 1];
}
/* "Ogni 1 € di tasca tua": quanto vale oggi nel fondo ogni euro di contributo volontario,
   al netto dell'IRPEF risparmiata con la deduzione. Il TFR resta fuori (sarebbe tuo comunque),
   e del rendimento conta solo la parte maturata su volontario + azienda. */
function moltiplicatore(M, C) {
  if (!M.last || !C) return null;
  const D = M.last.i;
  let vol = 0, az = 0, tot = 0, risp = 0;
  const anni = {};
  for (const k in M.months) {
    if (idxOf(k) > D) continue;
    const d = M.months[k], y = parseKey(k).y;
    vol += d.vol; az += d.az; tot += d.tot;
    anni[y] = anni[y] || { vol: 0, az: 0 }; anni[y].vol += d.vol; anni[y].az += d.az;
  }
  // Fuori busta: contano tutti come soldi tuoi, solo quelli dedotti danno IRPEF risparmiata.
  for (const x of M.X) {
    if (x.i > D) continue;
    vol += x.importo; tot += x.importo;
    if (x.dedotto) { anni[x.y] = anni[x.y] || { vol: 0, az: 0 }; anni[x.y].vol += x.importo; }
  }
  // Deduzione: il volontario conta fino al limite dell'anno, dopo il contributo azienda.
  for (const y in anni) {
    const lim = limiteDeducibile(Number(y)); if (lim == null) continue;
    risp += Math.min(anni[y].vol, Math.max(0, lim - anni[y].az)) * aliquotaIrpef(Number(y));
  }
  const tasca = vol - risp;
  if (vol < 1 || tasca < 1 || tot < 1) return null;
  const rend = (C.own - tot) * ((vol + az) / tot);
  const x = (vol + az + rend) / tasca;
  return { x, vol, az, risp, tasca, rend, oggi: vol + az + rend, irpef: risp / tasca, azienda: az / tasca, rendimento: rend / tasca };
}

/* ======================= Link esterni (sempre nel browser del telefono) ======================= */
function isStandalone() { return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches; }
function isIOS() { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function extHref(u) { return isStandalone() && isIOS() ? u.replace(/^https:\/\//, 'x-safari-https://') : u; }
function extLink(u, inner, cls = '', style = '') { return `<a class="${cls}" style="${style}" href="${esc(extHref(u))}" target="_blank" rel="noopener noreferrer">${inner}</a>`; }
const ICON_EXT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

/* ======================= Viste ======================= */
// In modalità privata si vedono solo Panoramica e Anni: niente inserimento, impostazioni o export.
const PRIV_TABS = ['home', 'anni', 'pensione'];
const ICON_EYE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICON_EYE_OFF = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9"/><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
// Etichetta accanto al sopratitolo, così il titolo grande resta intero anche sugli schermi stretti.
function privPill() { return priv() ? '<span class="privpill">Modalità privata</span>' : ''; }
// Pulsante a occhio nelle intestazioni di Panoramica e Anni.
function privBtn() {
  return priv()
    ? `<button type="button" class="eyebtn on" data-act="priv" aria-pressed="true" aria-label="Mostra gli importi">${ICON_EYE_OFF}</button>`
    : `<button type="button" class="eyebtn" data-act="priv" aria-pressed="false" aria-label="Nascondi gli importi">${ICON_EYE}</button>`;
}
function render() {
  const app = $('#app'), tab = $('#tabbar');
  if (!data) { tab.hidden = true; app.innerHTML = viewWelcome(); renderGuida(); return; }
  tab.hidden = false;
  if (priv() && !PRIV_TABS.includes(ui.tab)) ui.tab = 'home';
  if (priv()) ui.sheet = null;
  document.body.classList.toggle('privata', priv());
  const M = model();
  const views = { home: viewHome, anni: viewAnni, inserisci: viewInserisci, pensione: viewPensione, impostazioni: viewImpostazioni };
  app.innerHTML = (views[ui.tab] || viewHome)(M);
  tab.innerHTML = tabbarHTML();
  renderSheet(M);
  if (ui.tab === 'home') bindChart(M);
  if (ui.tab === 'inserisci') refreshInsCalc();
  if (ui.tab === 'pensione') refreshPens();
  renderGuida();
}

function tabbarHTML() {
  const t = (id, label, icon) => `<button type="button" data-act="tab" data-v="${id}" ${ui.tab === id ? 'aria-current="page"' : ''}>${icon}${label}</button>`;
  const ic = (p) => `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const show = (id, html) => !priv() || PRIV_TABS.includes(id) ? html : '';
  return '<div class="inner">' +
    t('home', 'Panoramica', ic('<path d="M3 17l5-5 4 4 8-8"/><path d="M15 8h5v5"/>')) +
    t('anni', 'Anni', ic('<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>')) +
    t('pensione', 'Pensione', ic('<path d="M6.5 3h11M6.5 21h11"/><path d="M7.5 3c0 5 4.5 6 4.5 9s-4.5 4-4.5 9M16.5 3c0 5-4.5 6-4.5 9s4.5 4 4.5 9"/>')) +
    show('impostazioni', t('impostazioni', 'Impostazioni', ic('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'))) +
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
    <button type="button" class="btn soft" data-act="intro-open">Guarda l'introduzione</button>
    ${isIOS() && !isStandalone()
      ? '<div class="card banner warn" style="margin:24px 0 0;text-align:left;border-radius:14px"><b>Meglio salvarla sulla Home.</b> Condividi › Aggiungi alla schermata Home, poi apri Quota dall\'icona. In Safari i dati possono essere cancellati dopo 7 giorni senza aprirla e non passano all\'app sulla Home.</div>'
      : isStandalone() ? '' : '<p style="font-size:13px; margin-top:24px">Per installarla: in Safari tocca Condividi › Aggiungi alla schermata Home.</p>'}
    <p style="font-size:12px; margin-top:16px">${DISCLAIMER}</p>
  </div>`;
}

/* ---------- Panoramica ---------- */
function chartGeom(M) {
  const P = M.P; if (P.length < 2) return null;
  // 12 mesi: dal valore di un anno prima (13 punti), così il rendimento copre 12 mesi interi.
  const pts = ui.range === 'all' ? P : P.filter((p) => p.i >= M.last.i - 12);
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

/* Rendimento ponderato nel tempo tra due valori del fondo: concatena i rendimenti mese per mese
   togliendo i versamenti arrivati. Non dipende da quanto e quando si è versato; dentro uno stesso
   comparto coincide con la variazione del valore quota, e regge anche i cambi di comparto. */
function twr(M, a, b) {
  const P = M.P, ia = P.indexOf(a), ib = P.indexOf(b);
  let f = 1;
  for (let j = ia + 1; j <= ib; j++) { const p = P[j - 1], q = P[j]; f *= (q.v - (q.e - p.e)) / p.v; }
  return f - 1;
}
/* Confronto con il TFR in azienda, con base il tuo fondo = 100 (come la card "E se non avessi aderito?"). */
function tfrChip(C) {
  const d = C.tfr / C.own - 1;
  return 'Con il TFR in azienda avresti il ' + pct(Math.abs(d)).slice(1) + (d <= 0 ? ' in meno' : ' in più');
}
function heroTexts(sel, isLatest, M, G) {
  // Vista 12 mesi: rendimento e guadagno del periodo, dal primo punto del grafico.
  const s0 = ui.range === '1y' && G ? G.pts[0] : null;
  if (s0 && sel !== s0) {
    const r = twr(M, s0, sel), gp = (sel.v - s0.v) - (sel.e - s0.e);
    const da = 'da ' + MESI[parseKey(s0.k).m - 1] + ' ' + parseKey(s0.k).y;
    if (priv()) return { value: pct(r), chip: 'Rendimento ' + da, when: 'al ' + dateLabel(sel.k),
      hint: isLatest ? 'Solo la forma del grafico: nessun importo, nemmeno toccando.' : 'Rendimento del periodo · comparto ' + sel.c };
    return { value: eur(sel.v), chip: eurS(gp) + ' · ' + pct(r) + ' ' + da, when: 'al ' + dateLabel(sel.k),
      hint: isLatest ? 'Guadagno del periodo, senza i versamenti. Tocca o scorri il grafico.' : 'Versato nel periodo: ' + eur(sel.e - s0.e) + ' · comparto ' + sel.c };
  }
  const g = sel.v - sel.e;
  if (priv()) {
    // Nessun importo: rendimento sul versato e, sull'ultimo mese, il confronto con il TFR in azienda.
    const C = isLatest && ui.range === 'all' ? comparison(M) : null;
    let chip = 'sul versato';
    if (C && C.tfr > 0 && C.own > 0) chip = tfrChip(C);
    return {
      value: pct(g / sel.e), chip, when: 'al ' + dateLabel(sel.k),
      hint: isLatest ? 'Solo la forma del grafico: nessun importo, nemmeno toccando.' : 'Rendimento sul versato fino ad allora · comparto ' + sel.c
    };
  }
  return {
    value: eur(sel.v), chip: eurS(g) + ' · ' + pct(g / sel.e), when: 'al ' + dateLabel(sel.k),
    hint: isLatest ? 'Tocca o scorri il grafico per vedere ogni mese.' : 'Versato fino ad allora: ' + eur(sel.e) + ' · comparto ' + sel.c
  };
}

/* Pulsante a stati, in Panoramica e in Anni: verde "Aggiornato" se è tutto inserito, arancione se manca
   qualcosa, rosso se mancano sia la busta paga sia i dati del fondo del mese in corso. Non c'è in privata. */
function addBtnHTML(M) {
  if (priv()) return '';
  const S = statoDati(M);
  return S.livello === 'ok'
    ? `<button type="button" class="addbtn ok" data-act="ins-open" aria-label="Dati aggiornati, apri l'inserimento"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span class="lbl">Aggiornato</span></button>`
    : `<button type="button" class="addbtn ${S.livello}" data-act="ins-open" aria-label="${S.livello === 'bad' ? 'Mancano i dati del mese, inserisci' : 'Mancano alcuni dati, inserisci'}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span class="lbl">Inserisci</span></button>`;
}

/* Da dove arrivano i soldi: dentro la scheda del valore (scura) oppure come scheda a sé se il grafico non c'è ancora. */
function compHTML(M, inHero) {
  if (!(M.tv > 0)) return '';
  const P_ = priv(), w = (x) => Math.round(x / M.tv * 100) + '%';
  const col = inHero ? { tfr: '#5B8EE6', az: '#F5A524', vol: '#A9D0FA' } : { tfr: 'var(--tfr)', az: 'var(--az)', vol: 'var(--vol)' };
  const sub = P_ ? 'Su ogni 100 € versati dall\'adesione' : 'Versati dall\'adesione: ' + eur(M.tv);
  const parts = [['TFR', M.ttfr, col.tfr], ['Azienda', M.taz, col.az], ['Tuo contributo', M.tvol, col.vol]];
  const bar = `<div class="stack" aria-hidden="true">${parts.map((p) => `<div style="width:${w(p[1])};background:${p[2]}"></div>`).join('')}</div>`;
  if (inHero && M.last) {
    // Valore di oggi = versato arrivato al fondo (diviso come nelle buste paga) + rendimento.
    const L = M.last, base = L.e, k = base / M.tv, rend = L.v - base, tot = Math.max(L.v, base);
    const q = [['TFR', M.ttfr * k, col.tfr], ['Azienda', M.taz * k, col.az], ['Tu', M.tvol * k, col.vol]];
    if (rend > 0) q.push(['Rendimento', rend, '#5BE0A8']);
    const pw = (x) => Math.round(x / tot * 100) + '%';
    const bar4 = `<div class="stack" aria-hidden="true">${q.map((p) => `<div style="width:${(p[1] / tot * 100).toFixed(1)}%;background:${p[2]}"></div>`).join('')}</div>`;
    return `<div class="hero-comp" aria-label="Com'è fatto il valore">
      <div class="top"><span class="lbl">Com'è fatto il valore</span><span class="when">${P_ ? 'Su ogni 100 € di valore' : 'Al ' + dateLabel(L.k)}</span></div>${bar4}
      <div class="hc-grid g4">${q.map((p) => `<div><div class="hc-l"><span class="dot" style="background:${p[2]}"></span>${p[0]}</div>
        <div class="hc-v num">${P_ ? Math.round(p[1] / tot * 100) + ' €' : (p[0] === 'Rendimento' ? '+' : '') + eur(p[1], 0)}</div>${P_ ? '' : `<div class="hc-p num">${pw(p[1])}</div>`}</div>`).join('')}</div>
      ${rend < 0 ? `<div class="hc-neg">Rendimento ${P_ ? pct(rend / base) : eurS(rend, 0)}: oggi il valore è sotto il versato.</div>` : ''}
    </div>`;
  }
  const v = (x) => P_ ? Math.round(x / M.tv * 100) + ' €' : `${eur(x)} <span style="color:var(--muted)">· ${w(x)}</span>`;
  return `<section class="card" aria-label="Da dove arrivano i versamenti">
    <div class="title">Da dove arrivano i soldi</div><div class="sub">${sub}</div>${bar}
    <div class="legend-list">${parts.map((p) => `<div><span class="k"><span class="dot" style="width:10px;height:10px;background:${p[2]}"></span>${p[0] === 'Azienda' ? 'Contributo azienda' : p[0] === 'Tuo contributo' ? 'Contributo volontario' : p[0]}</span><span class="num">${v(p[1])}</span></div>`).join('')}</div>
  </section>`;
}

function viewHome(M) {
  const P_ = priv();
  let html = `<div class="head"><div class="eyebrow-row"><div class="eyebrow">${esc(data.fondo.nome)}${M.last ? ' · ' + esc(M.last.c) : ''}</div>${privPill()}</div>
    <div class="title-row"><h1>Panoramica</h1><div class="head-actions">
      ${addBtnHTML(M)}
      ${privBtn()}
    </div></div></div>`;

  // Hero
  const G = chartGeom(M);
  if (M.last && G) {
    const sel = G.pts.find((p) => p.i === ui.selIdx) || G.pts[G.pts.length - 1];
    const t = heroTexts(sel, sel === G.pts[G.pts.length - 1], M, G);
    html += `<section class="hero" aria-label="${P_ ? 'Rendimento della posizione' : 'Valore della posizione'}">
      <div class="top"><span class="lbl">${P_ ? 'Rendimento della posizione' : 'Valore della posizione'}</span>
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
        <span><span class="sw" style="height:3px;border-radius:2px;background:#5BE0A8"></span>${P_ ? 'Andamento' : 'Valore'}</span>
        <span><span class="sw" style="border-top:2px dashed rgba(255,255,255,.6)"></span>Versato accreditato</span>
        ${G.hasGap ? '<span><span class="sw" style="border-top:2px dotted #5BE0A8"></span>Mese non registrato</span>' : ''}
      </div>
      <div class="hint" id="h-hint">${t.hint}</div>
      ${compHTML(M, true)}
    </section>`;
  } else {
    html += `<section class="card"><div class="title">Ancora pochi dati</div><div class="sub">Il grafico compare dopo almeno due valori del fondo. Inserisci quote e valore quota dal sito del fondo.</div></section>`;
    html += compHTML(M, false);
  }

  const C = comparison(M);

  // Ogni 1 € di tasca tua: è un rapporto, si legge uguale nelle due modalità.
  const X = moltiplicatore(M, C);
  if (X) {
    const f = (v) => num(v, 2) + ' €';
    const tot = 1 + Math.max(0, X.irpef) + Math.max(0, X.azienda) + Math.max(0, X.rendimento);
    const w = (v) => (Math.max(0, v) / tot * 100).toFixed(1) + '%';
    const al = pctPlain(aliquotaIrpef(parseKey(M.last.k).y), 0);
    const note = P_
      ? 'Il contributo dell\'azienda e la deduzione fiscale moltiplicano quello che metti tu. Il TFR non è contato: sarebbe tuo comunque.'
      : `Contributo volontario ${eur(X.vol)}, di cui ${eur(X.risp)} tornati come IRPEF risparmiata: di tasca tua ${eur(X.tasca)}. Oggi, con il contributo dell'azienda e il rendimento, valgono ${eur(X.oggi)} nel fondo. Il TFR non è contato: sarebbe tuo comunque.`;
    html += `<section class="card" aria-label="Ogni euro di tasca tua">
      <div class="title">Ogni 1 € di tasca tua</div>
      <div class="num ok-t" style="font-size:34px;font-weight:700;letter-spacing:-.02em;margin-top:6px">è diventato ${f(X.x)}</div>
      <div class="stack" aria-hidden="true"><div style="width:${w(1)};background:var(--vol)"></div><div style="width:${w(X.irpef)};background:var(--accent)"></div><div style="width:${w(X.azienda)};background:var(--az)"></div><div style="width:${w(X.rendimento)};background:var(--mint)"></div></div>
      <div class="grid2 molt">
        <div><span class="dot" style="background:var(--vol)"></span>1,00 € tuo</div>
        <div><span class="dot" style="background:var(--accent)"></span>+${f(X.irpef)} meno IRPEF</div>
        <div><span class="dot" style="background:var(--az)"></span>+${f(X.azienda)} dall'azienda</div>
        <div><span class="dot" style="background:var(--mint)"></span>${X.rendimento >= 0 ? '+' : ''}${f(X.rendimento)} di rendimento</div>
      </div>
      <div class="sub" style="margin-top:12px;color:var(--text-2)">${esc(note)} Deduzione stimata con l'aliquota IRPEF del ${al} (Impostazioni).</div>
    </section>`;
  }

  // Spazio deducibile
  html += cardDeducibile(M);

  // Confronto
  if (C) {
    const max = Math.max(C.own, C.fpa, C.pip, C.tfr);
    // In privata: il tuo fondo vale 100, le alternative in proporzione.
    const val = (v) => P_ ? num(v / C.own * 100, 1) : eur(v);
    const dif = (v) => P_ ? pct(v / C.own - 1) : eurS(v - C.own);
    const row = (label, sub, v, color, own) => `<div>
      <div class="cmp-top"><span>${label}</span><span class="num">${val(v)}</span></div>
      <div class="cmp-track"><div style="width:${(v / max * 100).toFixed(1)}%;background:${color}"></div></div>
      <div class="cmp-bot"><span>${sub}</span>${own ? '' : `<b class="${v - C.own < 0 ? 'bad-t' : 'ok-t'}">${dif(v)}</b>`}</div></div>`;
    const userTag = refUser ? ' · <b>valori inseriti da te</b>' : '';
    const vsTfr = C.own - C.tfr;
    html += `<section class="card" aria-label="Confronto con le alternative">
      <div class="title">E se non avessi aderito?</div>
      <div class="sub">${P_ ? 'Il tuo fondo vale 100. Stessi versamenti, stima su medie pubbliche' : 'Stessi versamenti, situazione al ' + C.date + '. Stima su medie pubbliche'}${userTag}.</div>
      <div class="cmp-hi ${vsTfr < 0 ? 'neg' : ''}">${P_
        ? `<span class="num">${pct(C.tfr / C.own - 1)}</span><span>con il TFR lasciato in azienda</span>`
        : `<span class="num">${eurS(vsTfr, 0)}</span><span>rispetto al TFR lasciato in azienda</span>`}</div>
      <div class="cmp-rows">
        ${row(esc(data.fondo.nome), 'Il tuo fondo, dato reale', C.own, 'var(--accent)', true)}
        ${row('Fondo aperto (banche, SGR)', 'Costi medi ' + pctPlain(C.R.isc.fondiAperti) + ' l\'anno, niente contributo azienda', C.fpa, 'var(--alt)')}
        ${row('PIP (assicurazioni)', 'Costi medi ' + pctPlain(C.R.isc.pip) + ' l\'anno, niente contributo azienda', C.pip, 'var(--alt)')}
        ${row('TFR lasciato in azienda', 'Rivalutazione di legge, niente contributo azienda', C.tfr, 'var(--alt)')}
      </div>
      <button type="button" class="linkbtn" data-act="cmp-toggle" aria-expanded="${ui.cmpOpen}">${ui.cmpOpen ? 'Nascondi come è calcolato' : 'Come è calcolato'}</button>
      ${ui.cmpOpen ? `<div class="details">
        <div><b>Il tuo fondo</b>: valore reale al ${C.date}, più i versamenti già trattenuti in busta paga e non ancora accreditati${P_ ? '' : ' (' + eur(C.pend) + ')'}. Così tutte le righe partono dagli stessi soldi.</div>
        <div><b>Fondo aperto e PIP</b>: stessi investimenti del tuo comparto, meno la differenza di costo (${esc(C.R.isc.fonte)}). Il contributo azienda spetta di norma solo al fondo di categoria; anche ricevendolo avresti comunque ${P_ ? pct(C.fpaKeep / C.own - 1).slice(1) : eur(C.own - C.fpaKeep)} (fondo aperto) e ${P_ ? pct(C.pipKeep / C.own - 1).slice(1) : eur(C.own - C.pipKeep)} (PIP) in meno, solo per i costi.</div>
        <div><b>TFR in azienda</b>: rivalutazione di legge (1,5% + 75% dell'inflazione ISTAT), tassata al 17%. Il contributo volontario resta in busta paga, senza rendimento e senza deduzione fiscale.</div>
        <div style="color:var(--muted)">Non include la tassazione finale, più bassa nel fondo pensione (dal 15% al 9%). È una stima, non un consiglio d'investimento. Dati pubblici aggiornati al ${esc(C.R.aggiornato || C.R.versione)}.</div>
      </div>` : ''}
    </section>`;
  }

  // Comparto: valore quota, costi, ripartizione, rischio e investimenti. Tutti dati pubblici del fondo: restano visibili anche in privata.
  if (M.last) html += cardComparto(M);
  return html;
}

/* Card del comparto in Panoramica. */
function cardComparto(M) {
  const R = effRef(), cur = M.last.c, since = data.comparti.filter((c) => c.nome === cur).map((c) => c.dal).pop();
  const firstOfCur = M.P.find((p) => p.c === cur && (!since || p.k >= since));
  const isc = R.fondo.iscComparti[cur], CC = R.fondo.comparti || {}, I = CC[cur];
  const p1 = (x) => num(x, x >= 10 || Number.isInteger(x) ? 0 : 1) + '%';
  let html = `<section class="card" aria-label="Comparto">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><div class="title">Comparto ${esc(cur)}</div><div class="sub">${since ? 'da ' + MESI[parseKey(since).m - 1] + ' ' + parseKey(since).y : ''}</div></div>
    ${I ? `<div class="sub">${esc(I.categoria)} · ${esc(I.orizzonte)}</div>` : ''}
    <div class="grid3">
      <div><div class="kv-l">Valore quota</div><div class="kv-v">${num(M.last.vq, 3)} €</div></div>
      <div><div class="kv-l">${firstOfCur && firstOfCur !== M.last ? 'Da ' + MS[parseKey(firstOfCur.k).m - 1] + ' ' + String(parseKey(firstOfCur.k).y).slice(2) : 'Variazione'}</div><div class="kv-v ok-t">${firstOfCur ? pct(M.last.vq / firstOfCur.vq - 1) : '—'}</div></div>
      <div><div class="kv-l">Costi (ISC 10 anni)</div><div class="kv-v">${isc != null ? pctPlain(isc) : '—'}</div></div>
    </div>`;
  if (I) {
    const al = isoLabel(CC.al);
    // Ripartizione azioni / obbligazioni
    html += `<div class="cp-sec"><div class="cp-h"><span>Ripartizione</span><span class="cp-d">al ${al}</span></div>
      <div class="stack cp-bar" aria-hidden="true"><div style="width:${I.azioni}%;background:var(--accent)"></div><div style="width:${I.obbligazioni}%;background:var(--alt)"></div></div>
      <div class="cp-leg"><span><span class="dot" style="background:var(--accent)"></span>Azioni <b class="num">${I.azioni}%</b></span><span><span class="dot" style="background:var(--alt)"></span>Obbligazioni <b class="num">${I.obbligazioni}%</b></span></div></div>`;
    // Rischio: posizione tra i tre comparti del fondo
    const anni = Object.keys(I.rendimenti).sort(), vals = anni.map((y) => I.rendimenti[y][0]);
    const worst = anni.length > 1 ? anni[vals.indexOf(Math.min(...vals))] : null, best = anni.length > 1 ? anni[vals.indexOf(Math.max(...vals))] : null;
    html += `<div class="cp-sec"><div class="cp-h"><span>Rischio</span></div>
      <div class="risk3" role="img" aria-label="Rischio ${['basso', 'medio', 'più alto'][I.livello - 1]} tra i comparti del fondo">${COMPARTI.map((n, i) => `<div class="${i + 1 === I.livello ? 'on' : i + 1 < I.livello ? 'fill' : ''}"><span></span>${n}</div>`).join('')}</div>
      <div class="sub" style="margin-top:8px">${I.garanzia ? esc(I.garanzia) + '. ' : 'Nessuna garanzia: il valore può anche scendere. '}${worst ? `Anno peggiore <b class="bad-t num">${pct(I.rendimenti[worst][0] / 100)}</b> (${worst}), migliore <b class="ok-t num">${pct(I.rendimenti[best][0] / 100)}</b> (${best}).` : ''}</div></div>`;
    html += `<button type="button" class="linkbtn" data-act="cmp-det" aria-expanded="${!!ui.cmpDet}">${ui.cmpDet ? 'Nascondi investimenti e rendimenti' : 'Investimenti e rendimenti'}</button>`;
    if (ui.cmpDet) {
      const A = I.aree, g = [['Stati Uniti', A['Stati Uniti']], ['Italia', A['Italia']], ['Resto d\'Europa', A['Altri Paesi area euro'] + A['Altri Paesi UE']],
        ['Altri Paesi avanzati', A['Giappone'] + A['Altri Paesi OCSE']], ['Paesi emergenti', A['Paesi non OCSE']]].sort((x, y) => y[1] - x[1]);
      const gmax = Math.max(...g.map((x) => x[1]));
      const anniTxt = (m) => { const y = Math.floor(m / 12), r = m % 12; return y + (r >= 6 ? ' anni e mezzo' : y === 1 ? ' anno' : ' anni'); };
      html += `<div class="cp-sec"><div class="cp-h"><span>Dove investe</span><span class="cp-d">azioni e obbligazioni</span></div>
        <div class="geo">${g.map((x) => `<div><span>${x[0]}</span><div class="geo-t"><div style="width:${(x[1] / gmax * 100).toFixed(1)}%"></div></div><b class="num">${p1(x[1])}</b></div>`).join('')}</div>
        <div class="grid2 cp-kv">
          <div><div class="kv-l">Titoli di Stato</div><div class="kv-v">${p1(I.governativi)}</div></div>
          <div><div class="kv-l">Obbligazioni aziendali</div><div class="kv-v">${p1(I.corporate)}</div></div>
          <div><div class="kv-l">In valute non euro</div><div class="kv-v">${p1(I.valuta)}</div></div>
          <div><div class="kv-l">Durata media obbligazioni</div><div class="kv-v">${anniTxt(I.durationMesi)}</div></div>
        </div></div>`;
      if (anni.length > 1) {
        const mx = Math.max(...anni.map((y) => Math.max(Math.abs(I.rendimenti[y][0]), Math.abs(I.rendimenti[y][1] || 0))));
        const W = 300, H = 150, mid = 64, sc = 52 / mx, bw = W / anni.length;
        const bars = anni.map((y, i) => {
          const [r, bmk] = I.rendimenti[y], x = i * bw + bw * 0.22, w = bw * 0.56, h = Math.abs(r) * sc;
          return `<rect x="${x.toFixed(1)}" y="${(r >= 0 ? mid - h : mid).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(h, 1).toFixed(1)}" rx="3" fill="${r >= 0 ? 'var(--accent)' : 'var(--bad)'}"/>`
            + (bmk != null ? `<line x1="${(x - 3).toFixed(1)}" x2="${(x + w + 3).toFixed(1)}" y1="${(mid - bmk * sc).toFixed(1)}" y2="${(mid - bmk * sc).toFixed(1)}" stroke="var(--text)" stroke-width="2" stroke-linecap="round"/>` : '')
            + `<text x="${(x + w / 2).toFixed(1)}" y="${(r >= 0 ? mid - h - 5 : mid + h + 13).toFixed(1)}" text-anchor="middle" class="yr-v">${num(r, 1)}</text>`
            + `<text x="${(x + w / 2).toFixed(1)}" y="${H - 2}" text-anchor="middle" class="yr-l">${y}</text>`;
        }).join('');
        html += `<div class="cp-sec"><div class="cp-h"><span>Rendimento netto anno per anno</span><span class="cp-d">%</span></div>
          <svg class="yrs" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rendimenti annui del comparto: ${anni.map((y) => y + ' ' + num(I.rendimenti[y][0], 1) + '%').join(', ')}"><line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="var(--sep)"/>${bars}</svg>
          <div class="cp-leg"><span><span class="dot" style="background:var(--accent)"></span>Comparto</span><span><span class="dot" style="height:3px;border-radius:2px;background:var(--text)"></span>Benchmark</span></div></div>`;
      } else {
        const y = anni[0];
        html += `<div class="cp-sec"><div class="cp-h"><span>Rendimento netto ${y}</span></div><div class="kv-v ok-t" style="font-size:20px">${pct(I.rendimenti[y][0] / 100)}</div></div>`;
      }
      html += `<div class="details" style="margin-top:12px">
        ${I.nota ? `<div>${esc(I.nota)}</div>` : ''}
        <div>Costi effettivi del comparto nel 2025 (TER): ${pctPlain(I.ter)} del patrimonio. Patrimonio del comparto: ${num(I.patrimonio / 1e6, 0)} milioni di euro.</div>
        <div style="color:var(--muted)">Dati pubblici del fondo, uguali per tutti gli iscritti al comparto: ${esc(CC.fonte)}. I rendimenti passati non sono indicativi di quelli futuri.</div>
        ${extLink(CC.link, '<span>Scheda ufficiale del fondo</span>' + ICON_EXT, '', 'display:inline-flex;align-items:center;gap:6px;font-weight:600;text-decoration:none')}
      </div>`;
    }
  }
  html += `${data.comparti.length > 1 ? '<div class="sub" style="margin-top:12px">I valori quota di comparti diversi non si confrontano tra loro: il grafico segna il punto di cambio.</div>' : ''}
    ${extLink(LINK_FONDO, '<span>Dettagli sul fondo</span>' + ICON_EXT, 'linkbtn', 'display:flex;align-items:center;justify-content:space-between;text-decoration:none')}
  </section>`;
  return html;
}

/* Card della Panoramica: quanto spazio deducibile resta nell'anno. */
function cardDeducibile(M) {
  const oggi = parseKey(todayKey());
  let D = deducibile(M, oggi.y);
  if (D && !D.mesi) { const P = deducibile(M, oggi.y - 1); if (P && P.mesi) D = P; } // a inizio anno mostra ancora l'anno chiuso
  if (!D || !D.mesi) return '';
  const P_ = priv();
  const chiuso = D.y < oggi.y || D.ultimo === 12;
  const scala = Math.max(D.lim, D.usato);
  const w = (x) => (x / scala * 100).toFixed(1) + '%';
  const ql = (x) => pq(x / D.lim); // quota del limite, per la modalità privata
  let big, pill;
  if (D.oltre > 0.005) { big = `<span class="warn-t">Oltre ${P_ ? 'del ' + ql(D.oltre) : 'di ' + eur(D.oltre)}</span>`; pill = '<span class="pill warn">Limite superato</span>'; }
  else if (D.resto < 0.005) { big = '<span class="ok-t">Limite raggiunto</span>'; pill = '<span class="pill ok">Al massimo</span>'; }
  else { big = P_ ? (chiuso ? 'Non usato il ' : 'Resta il ') + ql(D.resto) : (chiuso ? 'Non usati ' : 'Restano ') + eur(D.resto); pill = D.stimati ? '<span class="pill idle">In parte stimato</span>' : ''; }
  const note = [];
  if (!chiuso && D.proiezione != null && D.oltre <= 0) {
    const fine = D.lim - D.proiezione;
    if (P_) note.push('A questo ritmo a fine anno arrivi al ' + ql(D.proiezione) + ' del limite.');
    else note.push('A questo ritmo a fine anno arrivi a ' + eur(D.proiezione, 0) + (fine >= 0 ? ': resterebbero ' + eur(fine, 0) + ' di spazio.' : ', oltre il limite di ' + eur(-fine, 0) + '.'));
  }
  if (D.stimati) note.push(D.stimati + (D.stimati === 1 ? ' mese ha' : ' mesi hanno') + ' i contributi stimati dalle aliquote: ricarica la busta paga per i valori esatti.');
  if (D.xd > 0) note.push(P_ ? 'Comprende i versamenti fatti fuori busta paga.' : 'Comprende ' + eur(D.xd) + ' versati fuori busta paga.');
  if (D.xn > 0) note.push(P_ ? 'I versamenti non dedotti non contano.' : 'Non contano ' + eur(D.xn) + ' versati e non dedotti.');
  let banner = '';
  const fineAnno = D.y === oggi.y && (oggi.m === 12 || (oggi.m === 11 && new Date().getDate() >= 15));
  if (D.oltre > 0.005) banner = `<div class="banner warn" style="margin-top:14px;border-radius:12px">La parte oltre il limite non è deducibile. Comunicala al fondo entro il 31 dicembre ${D.y + 1}: così alla fine non verrà tassata di nuovo.</div>`;
  else if (fineAnno && D.resto >= 1) banner = `<div class="banner info" style="margin-top:14px;border-radius:12px">Entro il 31 dicembre puoi versare ancora fino ${P_ ? 'al <b>' + ql(D.resto) + ' del limite</b>' : 'a <b>' + eur(D.resto) + '</b>'} con un versamento volontario e dedurli nella prossima dichiarazione.${P_ ? '' : ' ' + extLink(LINK_AREA, 'Area riservata', '', 'font-weight:600;color:inherit')}</div>`;
  return `<section class="card" aria-label="Spazio deducibile ${D.y}">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div class="title">Spazio deducibile ${D.y}</div>${pill}</div>
    <div class="sub">Contributo tuo e dell'azienda · il TFR non conta</div>
    <div class="num" style="font-size:26px;font-weight:700;letter-spacing:-.02em;margin-top:10px">${big}</div>
    <div class="bar" role="img" aria-label="${P_ ? 'Usato il ' + ql(D.usato) + ' del limite' : 'Usati ' + eur(D.usato) + ' su ' + eur(D.lim)}"><div style="width:${w(D.az)};background:var(--az)"></div><div style="width:${w(D.vol)};background:var(--vol)"></div></div>
    <div class="grid3">
      <div><div class="kv-l"><span class="dot" style="background:var(--vol)"></span>Tuo</div><div class="kv-v">${P_ ? ql(D.vol) : eur(D.vol)}</div></div>
      <div><div class="kv-l"><span class="dot" style="background:var(--az)"></span>Azienda</div><div class="kv-v">${P_ ? ql(D.az) : eur(D.az)}</div></div>
      <div><div class="kv-l">${P_ ? 'Spazio libero' : 'Limite'}</div><div class="kv-v">${P_ ? ql(Math.max(0, D.resto)) : eur(D.lim)}</div></div>
    </div>
    ${banner}
    <div class="sub" style="margin-top:12px;color:var(--text-2)">${note.map(esc).join(' ')}</div>
    ${P_ ? '' : '<button type="button" class="linkbtn" data-act="vv-new">+ Aggiungi versamento volontario</button>'}
    <button type="button" class="linkbtn" data-act="go-anni" data-v="${D.y}"${P_ ? '' : ' style="margin-top:0"'}>Dettaglio nel resoconto ${D.y}</button>
  </section>`;
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
    const t = heroTexts(best, best === G.pts[G.pts.length - 1], M, G);
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
  const P_ = priv();
  const ys = yearsRange(M);
  if (!ui.year || ys.indexOf(ui.year) < 0) ui.year = ys[ys.length - 1];
  const Y = ui.year, tk = todayKey();
  let html = `<div class="head"><div class="eyebrow-row"><div class="eyebrow">Resoconto</div>${privPill()}</div><div class="title-row anni"><h1 style="white-space:nowrap">Anno ${Y}</h1><div class="head-actions">${addBtnHTML(M)}${privBtn()}</div></div></div>
    <div class="seg" role="group" aria-label="Scegli l'anno">${ys.map((y) => `<button type="button" data-act="year" data-v="${y}" aria-pressed="${y === Y}">${y}</button>`).join('')}</div>`;
  html += bannerNonDedotti(M);

  // In privata: le righe dei mesi mostrano la ripartizione in % e il valore quota (pubblico), mai quote o importi.
  const parts = (d) => P_ ? `Ripartizione: Vol. ${pq(d.vol / d.tot)} · Az. ${pq(d.az / d.tot)} · TFR ${pq(d.tfr / d.tot)}` : `Vol. ${eur(d.vol)} · Az. ${eur(d.az)} · TFR ${eur(d.tfr)}`;
  const snapLine = (snap) => {
    if (!P_) return `${num(snap.q, 3)} quote × ${num(snap.vq, 3)} € = ${eur(snap.v)}`;
    const before = M.P.filter((p) => p.i < snap.i).pop();
    const ch = before && before.c === snap.c ? ' · ' + pct(snap.vq / before.vq - 1) + ' dal valore precedente' : '';
    return `Valore quota ${num(snap.vq, 3)} €${ch}`;
  };
  const tag = (k, label) => P_ ? `<span class="pill warn">${label}</span>` : `<button type="button" class="chipbtn warn" data-act="ins-month" data-v="${k}">${label}</button>`;

  let yt = 0, yv = 0, ya = 0, yf = 0, count = 0; const rows = [];
  const pmK = (pendingMonth(M) || {}).k;
  // Versamento fuori busta: riga sotto il mese in cui è stato fatto, verde se dedotto, rossa se no.
  const vvRow = (x) => `<div class="row">
      <div class="row-top"><span class="row-name">Versamento volontario</span><span class="row-name num">${eur(x.importo)}</span></div>
      <div class="row-meta">${isoLabel(x.data)} · fuori busta paga</div>
      ${x.nota && !P_ ? `<div class="row-meta">${esc(x.nota)}</div>` : ''}
      <div class="row-actions"><span class="pill ${x.dedotto ? 'ok' : 'bad'}">${x.dedotto ? 'Dedotto' : 'Non dedotto' + (x.comunicato ? ' · comunicato' : '')}</span>${P_ ? '' : `<button type="button" class="chipbtn" data-act="vv-edit" data-v="${esc(x.id)}" aria-label="Modifica il versamento del ${isoLabel(x.data)}">Modifica</button>`}</div>
    </div>`;
  for (let m = 1; m <= 12; m++) {
    const k = key(Y, m), d = M.months[k], snap = M.P.find((p) => p.k === k);
    const xs = M.X.filter((x) => x.k === k);
    for (const x of xs) { yt += x.importo; yv += x.importo; }
    if (d) { yt += d.tot; yv += d.vol; ya += d.az; yf += d.tfr; count++; }
    const beforeStart = k < M.firstKey, future = k >= tk;
    if (d) {
      const edited = data.modifiche && data.modifiche[k];
      rows.push(`<div class="row">
        <div class="row-top"><span class="row-name">${cap(MESI[m - 1])}</span><span class="row-name num">${eur(d.tot)}</span></div>
        ${P_ ? '' : `<div class="row-meta">${d.base == null ? 'Imponibile non registrato' + (d.az ? ' · azienda inserita a mano' : '') : 'Imponibile ' + eur(d.base)}</div>`}
        <div class="row-meta" style="margin-top:1px">${parts(d)}</div>
        ${d.stimato && d.base != null ? '<div class="row-meta" style="color:var(--muted)">Contributi stimati dalle aliquote</div>' : ''}
        ${snap ? `<div class="row-meta ok-t">${snapLine(snap)}</div>` : (M.P.length && k > M.P[0].k ? (k === pmK ? '<div class="row-meta warn-t">Valore quota da inserire</div>' : '<div class="row-meta">Valore quota non registrato</div>') : '')}
        ${P_ ? '' : `<div class="row-actions"><span style="font-size:12px;font-weight:600;color:var(--info)">${edited ? 'Modificato da te' : ''}</span><button type="button" class="chipbtn" data-act="ins-month" data-v="${k}" aria-label="Modifica ${MESI[m - 1]} ${Y}">Modifica</button></div>`}
      </div>`);
    } else if (snap) {
      rows.push(`<div class="row"><div class="row-top"><span class="row-name">${cap(MESI[m - 1])}</span>${tag(k, 'Busta paga mancante')}</div>
        <div class="row-meta ok-t">${snapLine(snap)}</div></div>`);
    } else if (!beforeStart && !future) {
      rows.push(`<div class="row"><div class="row-top"><span class="row-name">${cap(MESI[m - 1])}</span>${tag(k, 'Da inserire')}</div></div>`);
    } else {
      rows.push(`<div class="row"><div class="row-top"><span class="row-name" style="color:var(--faint)">${cap(MESI[m - 1])}</span><span class="sub">${future ? 'In arrivo' : 'Prima dell\'adesione'}</span></div></div>`);
    }
    for (const x of xs) rows.push(vvRow(x));
  }

  const mesiReg = count + ' ' + (count === 1 ? 'mese registrato' : 'mesi registrati');
  // Scheda dell'anno: versato per busta paga (come la CU) e situazione del fondo a fine periodo.
  const yp = (x) => P_ ? pq(x / yt) : eur(x);
  const ysnap = M.P.filter((p) => parseKey(p.k).y === Y);
  const yr = (l, v, extra = '') => `<div class="yrow"><span>${l}</span><span class="num"${extra}>${v}</span></div>`;
  const dotL = (c, l) => `<span class="dot" style="background:var(--${c})"></span>${l}`;
  let fondoRows = '', comps = [];
  if (ysnap.length) {
    const endS = ysnap[ysnap.length - 1];
    const prev = M.P.filter((p) => parseKey(p.k).y < Y).pop();
    const endR = endS.v - endS.e, prevR = prev ? prev.v - prev.e : 0;
    comps = [...new Set(ysnap.map((p) => p.c))];
    // Variazione del valore quota nell'anno, solo dentro lo stesso comparto
    const vq0 = prev && prev.c === endS.c ? prev.vq : (ysnap.find((p) => p.c === endS.c) || endS).vq;
    const ok = ' style="color:var(--ok);font-weight:600"';
    fondoRows = P_
      ? yr('Valore quota nell\'anno', endS.vq !== vq0 ? pct(endS.vq / vq0 - 1) : '—', ok) + yr('Rendimento totale', pct(endR / endS.e) + ' sul versato', ok)
      : yr(prev ? 'Guadagno nell\'anno' : 'Guadagno dall\'adesione', eurS(endR - prevR), ok)
        + yr('Rendimento totale', eurS(endR) + ' · ' + pct(endR / endS.e), ok)
        + yr('Posizione al ' + dateLabel(endS.k), eur(endS.v), ' style="font-weight:700"');
  }
  // Note: lettura dalle buste paga e stato degli accrediti dei trimestri
  const notes = [];
  const qs = [1, 2, 3, 4].map((q) => quarterInfo(M, Y, q));
  const stim = Object.keys(M.months).filter((k) => parseKey(k).y === Y && M.months[k].stimato).length;
  if (count && !stim) notes.push(['ok', 'Contributi letti dalle buste paga ' + Y + ': da confrontare con la tua CU.']);
  if (qs.some((r) => r.st === 'diff')) notes.push(['bad', 'Qualche trimestre non torna con quanto accreditato dal fondo: trovi il dettaglio in Trimestri.']);
  else if (qs[3].st === 'attesa') notes.push(['warn', 'Le buste di ott – dic' + (P_ ? '' : ' (' + eur(qs[3].amt) + ')') + ' arrivano al fondo a gennaio ' + (Y + 1) + ': il controllo è in Trimestri.']);
  html += `<section class="card" aria-label="L'anno ${Y}">
    ${P_
      ? `<div style="font-size:28px;font-weight:700;letter-spacing:-.02em;line-height:1.15">Versato nell'anno</div><div style="font-size:17px;font-weight:600;color:var(--muted);margin:2px 0 6px">${mesiReg}</div>`
      : `<div class="sub">Versato nell'anno · ${mesiReg}</div><div class="num" style="font-size:32px;font-weight:700;letter-spacing:-.02em;margin:2px 0 6px">${eur(yt)}</div>`}
    ${yr(dotL('vol', 'Tuo contributo'), yp(yv))}${yr(dotL('az', 'Azienda'), yp(ya))}${yr(dotL('tfr', 'TFR'), yp(yf))}
    ${fondoRows}
    ${comps.length ? `<div class="sub" style="margin-top:10px">${comps.length > 1 ? 'Comparti nell\'anno: ' + comps.map(esc).join(' → ') : 'Comparto ' + esc(comps[0])}</div>` : ''}
    ${notes.map(([c, t]) => `<div class="ynote ${c}">${t}</div>`).join('')}
  </section>`;

  const D = deducibile(M, Y);
  if (D && (D.mesi || D.xd || D.xn)) {
    const passato = Y < parseKey(todayKey()).y;
    const ql = (x) => pq(x / D.lim);
    const v = (x) => P_ ? ql(x) : eur(x);
    const [lab3, val3] = D.oltre > 0.005 ? ['Oltre il limite', `<span class="warn-t">${v(D.oltre)}</span>`] : D.resto < 0.005 ? ['Spazio', '<span class="ok-t">Pieno</span>'] : [passato ? (P_ ? 'Non usato' : 'Non usati') : (P_ ? 'Spazio libero' : 'Restano'), v(D.resto)];
    const sc = Math.max(D.lim, D.usato);
    html += `<h2 class="sec">Deducibilità</h2><section class="card" aria-label="Deducibilità ${Y}">
      <div class="sub">${P_ ? 'Contributi deducibili, in percentuale del limite' : 'Contributi deducibili su ' + eur(D.lim)}</div>
      <div class="num" style="font-size:26px;font-weight:700;letter-spacing:-.02em;margin-top:2px">${P_ ? 'Usato il ' + ql(D.usato) : eur(D.usato)}</div>
      <div class="bar"><div style="width:${(D.az / sc * 100).toFixed(1)}%;background:var(--az)"></div><div style="width:${(D.vol / sc * 100).toFixed(1)}%;background:var(--vol)"></div></div>
      <div class="grid3">
        <div><div class="kv-l"><span class="dot" style="background:var(--vol)"></span>Tuo</div><div class="kv-v">${v(D.vol)}</div></div>
        <div><div class="kv-l"><span class="dot" style="background:var(--az)"></span>Azienda</div><div class="kv-v">${v(D.az)}</div></div>
        <div><div class="kv-l">${lab3}</div><div class="kv-v">${val3}</div></div>
      </div>
      <div class="sub" style="margin-top:12px;color:var(--text-2)">${D.stimati ? D.stimati + (D.stimati === 1 ? ' mese con contributi stimati' : ' mesi con contributi stimati') + ' dalle aliquote, segnati qui sotto. ' : 'Contributi letti dalle buste paga. '}${D.xd > 0 ? (P_ ? 'Comprende i versamenti fuori busta dedotti. ' : 'Comprende ' + eur(D.xd) + ' versati fuori busta e dedotti. ') : ''}${D.xn > 0 ? (P_ ? 'I versamenti non dedotti non contano. ' : 'Non contano ' + eur(D.xn) + ' non dedotti. ') : ''}Il TFR versato al fondo${P_ ? '' : ' (' + eur(yf) + ')'} non rientra nel limite. Per conferma, confronta il totale con la Certificazione Unica.</div>
      ${P_ ? '' : '<button type="button" class="linkbtn" data-act="vv-new">+ Aggiungi versamento volontario</button>'}
    </section>`;
  }

  html += verificaProspetto(M, Y);
  const periods = ['gen – mar', 'apr – giu', 'lug – set', 'ott – dic'];
  const pill = { ok: ['ok', 'Accreditato'], diff: ['bad', 'Da verificare'], attesa: ['warn', 'In attesa'], corso: ['idle', 'In corso'], futuro: ['idle', 'Da versare'], vuoto: ['idle', 'Nessun dato'] };
  html += `<h2 class="sec">Trimestri</h2><section class="card flush" aria-label="Trimestri">` + trimestriRiepilogo(qs, Y) + [1, 2, 3, 4].map((q) => {
    const r = qs[q - 1], p = pill[r.st];
    let note = r.note || (r.st === 'corso' ? 'Mesi ancora da inserire' : r.st === 'futuro' ? 'Non ancora iniziato' : 'Nessuna busta paga registrata');
    if (P_ && r.st === 'ok') note = 'Torna al centesimo con le buste paga';
    if (P_ && r.st === 'diff') note = 'Non torna con le buste paga';
    return `<div class="row"><div class="row-top" style="align-items:center"><span class="row-name">${q}° trimestre <span style="font-weight:400;color:var(--muted);font-size:14px">${periods[q - 1]}</span></span><span class="pill ${p[0]}">${p[1]}</span></div>
      <div class="row-top" style="margin-top:4px;font-size:14px;color:var(--text-2)"><span>${note}</span><span class="num" style="font-weight:600;color:var(--text)">${r.amt > 0 ? eur(r.amt) : '—'}</span></div></div>`;
  }).join('') + '</section>';

  html += `<h2 class="sec">Mese per mese</h2><section class="card flush" aria-label="Dati mensili inseriti">${rows.join('')}</section>`;
  return html;
}

/* Riepilogo in cima ai Trimestri (era la card "Versato e accreditato" della Panoramica):
   busta paga dell'anno confrontata con quanto il fondo ha accreditato. */
function trimestriRiepilogo(qs, Y) {
  const P_ = priv();
  let tot = 0, okSum = 0, waitSum = 0; const waitNames = [], diffNames = [];
  for (const r of qs) {
    tot += r.amt;
    if (r.st === 'ok' || r.st === 'diff') okSum += r.amt;
    if (r.st === 'diff') diffNames.push(r.q + '° trimestre');
    if (r.st === 'attesa' || r.st === 'corso') waitSum += r.amt;
    if (r.st === 'attesa') waitNames.push(r.q + '° trimestre');
  }
  if (tot <= 0) return '';
  const v3 = (x) => P_ ? pctPlain(x / tot, 1) : eur(x);
  let note = waitNames.length ? 'Il ' + waitNames.join(' e il ') + ' risulta versato in busta paga ma non ancora sul sito: lo controllo da solo al prossimo inserimento.'
    : okSum >= tot - 0.005 ? 'Ogni trimestre versato nel ' + Y + ' risulta accreditato dal fondo, al centesimo.' : 'Il trimestre in corso si controlla quando è completo.';
  if (diffNames.length) note = 'Da verificare: il ' + diffNames.join(' e il ') + ' non torna con le buste paga.';
  return `<div class="row" aria-label="Versato e accreditato nel ${Y}">
    <div class="sub">Busta paga confrontata con il fondo</div>
    <div class="bar" style="margin-top:10px"><div style="width:${(okSum / tot * 100).toFixed(1)}%;background:var(--accent)"></div><div style="width:${(waitSum / tot * 100).toFixed(1)}%;background:var(--az)"></div></div>
    <div class="grid3">
      <div><div class="kv-l">Versato</div><div class="kv-v">${v3(tot)}</div></div>
      <div><div class="kv-l">Accreditato</div><div class="kv-v ok-t">${v3(okSum)}</div></div>
      <div><div class="kv-l">In attesa</div><div class="kv-v warn-t">${v3(waitSum)}</div></div>
    </div>
    <div class="sub" style="margin-top:10px;color:var(--text-2)">${note}</div>
  </div>`;
}

/* Avviso in cima ad Anni: versamenti non dedotti ancora da comunicare al fondo.
   Va fatto entro il 31 dicembre dell'anno dopo il versamento (D.Lgs. 252/2005, art. 8 c. 4):
   così quella parte non viene tassata quando la ritiri. */
function bannerNonDedotti(M) {
  const P_ = priv(), per = {};
  for (const x of M.X) if (!x.dedotto && !x.comunicato) per[x.y] = (per[x.y] || 0) + x.importo;
  const oggi = new Date();
  return Object.keys(per).sort().map((y) => {
    y = Number(y);
    const scaduto = oggi > new Date(y + 1, 11, 31, 23, 59);
    const cosa = P_ ? 'versamenti non dedotti nel ' + y : '<b>' + eur(per[y]) + '</b> versati e non dedotti nel ' + y;
    const testo = scaduto
      ? `Hai ${cosa}: la scadenza per comunicarli al fondo era il 31 dicembre ${y + 1}. Chiedi al fondo come procedere.`
      : `Hai ${cosa}: comunicali al fondo entro il <b>31 dicembre ${y + 1}</b>, così quando li ritiri non verranno tassati.`;
    return `<div class="banner ${scaduto ? 'bad' : 'warn'} ins-miss" style="margin-top:12px" role="status">${testo}${P_ ? '' : `
      <div class="chips">${extLink(LINK_AREA, 'Area riservata', 'chipbtn warn', 'text-decoration:none;background:var(--card)')}<button type="button" class="chipbtn warn" data-act="vv-com" data-v="${y}">Segna come comunicato</button></div>`}</div>`;
  }).join('');
}

/* ---------- Inserisci / Modifica ---------- */
function insDefaults(k) {
  const b = data.bustePaga.find((x) => x.mese === k);
  const v = data.valorizzazioni.find((x) => x.mese === k);
  return { k, base: b && b.imponibile != null ? inVal(b.imponibile, 2) : '', tfr: b ? inVal(b.tfr, 2) : '',
    az: b && b.azienda != null ? inVal(b.azienda, 2) : '', vol: b && b.volontario != null ? inVal(b.volontario, 2) : '', q: v ? inVal(v.quote, 3) : '', vq: v ? inVal(v.valoreQuota, 3) : '', e: v ? inVal(v.totaleVersato, 2) : '', existed: !!(b || v), err: null };
}

/* Riquadro in cima alla pagina Inserisci: cosa manca nel mese scelto e quali buste paga
   dei mesi precedenti sono ancora da inserire. Per i mesi passati i dati del fondo non si
   segnalano: dal sito non si possono più recuperare. */
function insMancanti(M, S, k) {
  const pm = S.pm, isCur = pm && k === pm.k, past = pm ? k < pm.k : true;
  const needPay = !M.B[k], needSnap = isCur && !M.P.find((p) => p.k === k);
  const out = [];
  if (isCur || past) {
    const manca = [];
    if (needPay) manca.push('<b>busta paga</b> (imponibile, contributi e TFR)');
    if (needSnap) manca.push('<b>dati del fondo</b> (quote e valore quota)');
    if (manca.length) {
      const liv = manca.length === 2 ? 'bad' : 'warn';
      out.push(`<div class="banner ${liv} ins-miss">Manca: ${manca.join(' e ')}.${needSnap ? ' Prendili dal sito prima che il valore del mese venga sostituito: ' + extLink(LINK_AREA, 'Area riservata', '', 'font-weight:600;color:inherit') : ''}</div>`);
    } else if (isCur) out.push('<div class="banner ok ins-miss">Mese completo: busta paga e dati del fondo ci sono. Puoi correggerli e salvare.</div>');
  }
  const altre = S.bustePassate.filter((x) => x !== k);
  if (altre.length) {
    const max = 6, shown = altre.slice(-max).reverse();
    out.push(`<div class="banner warn ins-miss">${altre.length === 1 ? 'Manca anche la busta paga di un mese precedente' : 'Mancano anche le buste paga di ' + altre.length + ' mesi precedenti'}:
      <div class="chips">${shown.map((x) => `<button type="button" class="chipbtn warn" data-act="ins-month" data-v="${x}">${monthLabel(x)}</button>`).join('')}${altre.length > max ? `<span class="sub">e altri ${altre.length - max}</span>` : ''}</div></div>`);
  }
  return out.join('');
}

function viewInserisci(M) {
  const S = statoDati(M), pm = S.pm;
  // Mese proposto: quello in corso se manca qualcosa, altrimenti l'ultima busta paga passata mancante.
  if (!ui.insMonth) ui.insMonth = pm && !pm.done ? pm.k : S.bustePassate.length ? S.bustePassate[S.bustePassate.length - 1] : pm ? pm.k : keyOf(idxOf(todayKey()) - 1);
  if (!ui.form || ui.form.k !== ui.insMonth) ui.form = insDefaults(ui.insMonth);
  const f = ui.form, k = f.k;
  // mesi selezionabili: dall'inizio dei dati fino al mese corrente
  const opts = []; for (let i = idxOf(todayKey()); i >= idxOf(M.firstKey < '2000-01' ? '2000-01' : M.firstKey) - 12; i--) opts.push(keyOf(i));
  const prevSnap = M.P.filter((p) => p.i < idxOf(k)).pop();
  const ph = (val, d) => val != null ? num(val, d) : '';
  const lastB = data.bustePaga.filter((b) => b.mese < k).pop();
  return `<button type="button" class="backbtn" data-act="tab" data-v="home"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Panoramica</button>
    <div class="head" style="padding-top:4px"><div class="eyebrow">${f.existed ? 'Modifica' : 'Inserimento mensile'}</div><h1>${monthLabel(k)}</h1></div>
    ${insMancanti(M, S, k)}
    <section class="card flush" style="margin-top:0">
      <div class="field"><label for="i-mese">Mese</label><select id="i-mese" data-act="ins-select">${opts.map((o) => `<option value="${o}" ${o === k ? 'selected' : ''}>${monthLabel(o)}</option>`).join('')}</select></div>
    </section>
    ${f.existed ? '<div class="note">Questo mese ha già dei dati: correggili e salva. Trimestri, grafico e confronto si ricalcolano da soli.</div>' : ''}
    <h3 class="group">1 · Dalla busta paga</h3>
    <section class="card flush" style="margin-top:0">
      <label class="listlink" for="i-pdf" style="cursor:pointer"><span>Leggi dalla busta paga (PDF)</span>${ICON_DOC}</label>
      <input id="i-pdf" class="sr" type="file" accept="application/pdf,.pdf" data-act="busta-pdf">
      <div id="pdf-info">${pdfBanner(f.pdf)}</div>
      <div class="field"><label for="i-base">Imponibile</label><input id="i-base" inputmode="decimal" autocomplete="off" data-f="base" value="${esc(f.base)}" placeholder="${lastB && lastB.imponibile != null ? esc(num(lastB.imponibile, 2)) : '0,00'}"></div>
      <div class="field"><label for="i-az">Contributo azienda</label><input id="i-az" inputmode="decimal" autocomplete="off" data-f="az" value="${esc(f.az)}" placeholder="0,00"></div>
      <div class="field"><label for="i-vol">Contributo volontario</label><input id="i-vol" inputmode="decimal" autocomplete="off" data-f="vol" value="${esc(f.vol)}" placeholder="0,00"></div>
      <div class="field"><label for="i-tfr">TFR del mese</label><input id="i-tfr" inputmode="decimal" autocomplete="off" data-f="tfr" value="${esc(f.tfr)}" placeholder="${lastB ? esc(num(lastB.tfr, 2)) : '0,00'}"></div>
      <div class="calc" id="calc-pay"></div>
    </section>
    <div id="calc-aliq" style="margin:0 16px"></div>
    <div class="note"><span id="ph-pay"></span>I contributi si leggono dalla busta paga e si controllano con le aliquote in Impostazioni. Se li lasci vuoti, l'app li stima con le aliquote di quel mese.</div>
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
    <div class="note" id="ph-snap" hidden></div>
    <div id="ins-err"></div>
    <div style="margin:20px 16px 0"><button type="button" class="btn primary big" data-act="ins-save" id="ins-save">Salva ${MESI[parseKey(k).m - 1]}</button></div>`;
}

/* ---------- Lettura busta paga PDF (busta.js) ---------- */
const ICON_DOC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h4"/></svg>';
function pdfBanner(p) {
  if (!p) return '';
  const extra = (p.righe || []).map((r) => `<div style="margin-top:4px">${esc(r)}</div>`).join('');
  return `<div class="banner ${p.stato}" role="status">${esc(p.msg)}${extra}</div>`;
}
async function readBusta(file) {
  const info = $('#pdf-info');
  if (info) info.innerHTML = pdfBanner({ stato: 'info', msg: 'Lettura della busta paga…' });
  let res;
  try {
    if (!window.QuotaBusta) throw new Error('Lettore PDF non disponibile: ricarica l\'app.');
    res = await window.QuotaBusta.readPdf(file, {
      askPassword: (retry) => prompt(retry ? 'Password errata. Riprova:' : 'La busta paga è protetta da password. Inseriscila (non viene salvata):')
    });
  } catch (e) {
    if (!ui.form) return;
    ui.form.pdf = { stato: 'bad', msg: e && e.message ? e.message : 'Impossibile leggere il PDF.' };
    render(); return;
  }
  if (!ui.form || ui.tab !== 'inserisci') return;
  const val = (n) => n == null ? '—' : eur(n);
  if (res.mensilita) {
    ui.form.pdf = { stato: 'warn', msg: `Questa è la busta della ${res.mensilita.n}ª mensilità ${res.mensilita.y}: i valori non sono stati inseriti in automatico.`,
      righe: ['Letti: imponibile ' + val(res.imponibile) + ', contributo azienda ' + val(res.azienda) + ', contributo volontario ' + val(res.volontario) + ', TFR ' + val(res.tfr) + '. Ricorda che anche questi contributi contano per il limite deducibile: se servono, inseriscili a mano.'] };
    render(); return;
  }
  if (res.imponibile == null && res.tfr == null && res.azienda == null && res.volontario == null) {
    ui.form.pdf = { stato: 'bad', msg: 'Non ho trovato i dati in questo PDF. Inseriscili a mano.', righe: res.avvisi };
    render(); return;
  }
  let k = ui.form.k; const righe = [];
  if (res.mese && res.mese !== k) {
    if (res.mese > todayKey()) righe.push('Il mese indicato nella busta (' + monthLabel(res.mese) + ') è nel futuro: valori inseriti in ' + monthLabel(k) + '.');
    else { k = res.mese; ui.insMonth = k; ui.form = insDefaults(k); }
  } else if (!res.mese) righe.push('Mese non trovato nella busta: verifica che sia ' + monthLabel(k) + '.');
  const f = ui.form, old = data.bustePaga.find((b) => b.mese === k);
  if (res.imponibile != null) f.base = inVal(res.imponibile, 2);
  if (res.tfr != null) f.tfr = inVal(res.tfr, 2);
  if (res.azienda != null) f.az = inVal(res.azienda, 2);
  if (res.volontario != null) f.vol = inVal(res.volontario, 2);
  const cambia = (a, b) => a != null && b != null && Math.abs(a - b) > 0.005;
  if (old && (cambia(res.imponibile, old.imponibile) || cambia(res.tfr, old.tfr) || cambia(res.azienda, old.azienda) || cambia(res.volontario, old.volontario)))
    righe.push('Sostituiscono i dati già salvati: imponibile ' + val(old.imponibile) + ', azienda ' + val(old.azienda) + ', volontario ' + val(old.volontario) + ', TFR ' + val(old.tfr) + '.');
  // Controllo con le aliquote impostate dall'utente (dipendono dal contratto, non dal modello di busta).
  const avvAliq = controlloAliquote(k, res.imponibile, res.azienda, res.volontario);
  righe.push(...res.controlli, ...res.avvisi, ...avvAliq);
  const nomeProfilo = res.profilo && res.profilo.certo ? ' (' + res.profilo.nome + ')' : '';
  f.pdf = { stato: res.avvisi.length || avvAliq.length ? 'warn' : 'ok', msg: 'Letti dalla busta paga di ' + monthLabel(k) + nomeProfilo + ': imponibile ' + val(res.imponibile) + ', azienda ' + val(res.azienda) + ', volontario ' + val(res.volontario) + ', TFR ' + val(res.tfr) + '. Controlla e premi Salva.', righe };
  render(); window.scrollTo(0, 0);
}

/* Percentuale effettiva di un contributo sull'imponibile, se è "pulita" (a un decimale) e spiega
   l'importo al centesimo; altrimenti null (arrotondamenti, conguagli, voci strane). */
function aliquotaEffettiva(val, base) {
  if (!(val >= 0) || !(base > 0)) return null;
  const p = Math.round(val / base * 1000) / 1000; // es. 0,015
  return Math.abs(Math.round(base * p * 100) / 100 - val) <= 0.02 ? p : null;
}
/* Proposta di cambio aliquota: quando un contributo letto corrisponde a una percentuale diversa da
   quella impostata per il mese. Restituisce le nuove aliquote (frazioni) e un testo, oppure null. */
function propostaAliquota(k, base, az, vol) {
  if (!(base > 0)) return null;
  const r = rateFor(k), eAz = aliquotaEffettiva(az, base), eVol = aliquotaEffettiva(vol, base);
  const dAz = eAz != null && Math.abs(eAz - r.azienda) > 0.00005, dVol = eVol != null && Math.abs(eVol - r.volontario) > 0.00005;
  if (!dAz && !dVol) return null;
  const p = (x) => pctPlain(x, Math.round(x * 1000) % 10 ? 1 : 0);
  const parti = [];
  if (dAz) parti.push('azienda ' + p(eAz) + ' (impostato ' + p(r.azienda) + ')');
  if (dVol) parti.push('il tuo contributo ' + p(eVol) + ' (impostato ' + p(r.volontario) + ')');
  return { az: dAz ? eAz : r.azienda, vol: dVol ? eVol : r.volontario, testo: parti.join(' e ') };
}

/* Confronta i contributi letti con le aliquote impostate per quel mese; restituisce gli avvisi. */
function controlloAliquote(k, base, az, vol) {
  const out = []; if (!(base > 0)) return out;
  const r = rateFor(k);
  const chk = (val, aliq, nome) => {
    if (val == null || !isFinite(val)) return;
    const atteso = Math.round(base * aliq * 100) / 100;
    if (Math.abs(val - atteso) > 0.02) out.push('Il ' + nome + ' (' + eur(val) + ') non corrisponde all\'aliquota impostata: ' + pctPlain(aliq, aliq * 100 % 1 ? 1 : 0) + ' dell\'imponibile = ' + eur(atteso) + '. Se l\'aliquota è cambiata, aggiornala in Impostazioni.');
  };
  chk(az, r.azienda, 'contributo azienda'); chk(vol, r.volontario, 'contributo volontario');
  return out;
}

function refreshInsCalc() {
  const M = model(), f = ui.form; if (!f) return;
  const k = f.k, { m } = parseKey(k), r = rateFor(k);
  const base = parseIt(f.base), tfr = parseIt(f.tfr), q = parseIt(f.q), vq = parseIt(f.vq), e = parseIt(f.e);
  const p0 = (a) => pctPlain(a, a * 100 % 1 ? 1 : 0);
  const volS = base > 0 ? base * r.volontario : 0, azS = base > 0 ? base * r.azienda : 0;
  const azIn = parseIt(f.az), volIn = parseIt(f.vol);
  const az = azIn >= 0 ? azIn : azS, vol = volIn >= 0 ? volIn : volS;
  for (const [id, v] of [['#i-az', azS], ['#i-vol', volS]]) { const el = $(id); if (el) el.placeholder = base > 0 ? num(v, 2) : '0,00'; }
  // stato di ogni contributo: letto e coerente con l'aliquota, letto ma diverso, oppure stimato
  const st = (inp, stima, aliq) => {
    if (!(inp >= 0)) return `<span style="color:var(--muted)">stimato · ${p0(aliq)}</span>`;
    if (!(base > 0)) return '';
    return Math.abs(inp - Math.round(stima * 100) / 100) <= 0.02 ? `<span class="ok-t">✓ ${p0(aliq)}</span>` : `<span class="warn-t">≠ ${p0(aliq)} (${eur(stima)})</span>`;
  };
  const pay = $('#calc-pay');
  if (pay) pay.innerHTML = `<div><span>Azienda ${st(azIn, azS, r.azienda)}</span><span class="num">${base > 0 || azIn >= 0 ? eur(az) : '—'}</span></div>
    <div><span>Volontario ${st(volIn, volS, r.volontario)}</span><span class="num">${base > 0 || volIn >= 0 ? eur(vol) : '—'}</span></div>
    <div class="strong"><span>Versato nel mese</span><span class="num">${tfr > 0 ? eur(vol + az + tfr) : '—'}</span></div>`;
  const pa = $('#calc-aliq');
  if (pa) {
    const P = propostaAliquota(k, base, azIn, volIn);
    pa.innerHTML = P ? `<div class="banner info ins-miss" style="margin:12px 0 0">La busta indica ${P.testo}, diverso da quanto impostato. Se il contratto è cambiato:
      <div class="chips"><button type="button" class="chipbtn" data-act="aliq-auto" data-v="${esc(k + ';' + P.vol + ';' + P.az)}">Aggiorna l'aliquota da ${esc(monthLabel(k))}</button></div></div>` : '';
  }
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
  // Nota "In grigio…": solo se un campo vuoto mostra davvero il valore di un mese precedente.
  const empty = (x) => !String(x == null ? '' : x).trim();
  const lastB = data.bustePaga.filter((b) => b.mese < k).pop();
  const payGrey = lastB && ((empty(f.base) && lastB.imponibile != null) || empty(f.tfr));
  const snapGrey = prevSnap && (empty(f.q) || empty(f.vq) || empty(f.e));
  const phPay = $('#ph-pay'), phSnap = $('#ph-snap');
  if (phPay) phPay.textContent = payGrey ? 'In grigio i valori di ' + prevMonthLabel(lastB.mese, k) + '. ' : '';
  if (phSnap) { phSnap.hidden = !snapGrey; phSnap.textContent = snapGrey ? 'In grigio i valori di ' + prevMonthLabel(prevSnap.k, k) + '.' : ''; }
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
  const azT = String(f.az || '').trim(), volT = String(f.vol || '').trim(), az = parseIt(azT), vol = parseIt(volT);
  const anyPay = String(f.base).trim() || String(f.tfr).trim() || azT || volT;
  const anySnap = String(f.q).trim() || String(f.vq).trim() || String(f.e).trim();
  const fail = (msg) => { f.err = msg; refreshInsCalc(); };
  if (!anyPay && !anySnap) return fail('Inserisci almeno i dati della busta paga o quelli del sito.');
  if (anyPay && !(tfr >= 0 && isFinite(tfr) && String(f.tfr).trim())) return fail('Manca il TFR del mese.');
  if (anyPay && String(f.base).trim() && !(base > 0)) return fail('L\'imponibile non è un numero valido.');
  if ((azT && !(az >= 0)) || (volT && !(vol >= 0))) return fail('I contributi devono essere numeri (anche 0), oppure vuoti per stimarli.');
  if (base > 0 && ((az > base * 0.2) || (vol > base * 0.2))) return fail('Un contributo supera il 20% dell\'imponibile: controlla le virgole.');
  if (anySnap && !(q > 0 && vq > 0 && e > 0)) return fail('Per il sito del fondo servono tutti e tre i valori: quote, valore quota e totale versato.');
  if (vq > 1000 || q > 1e7) return fail('I valori del fondo sembrano fuori scala: controlla le virgole.');
  const existed = f.existed;
  if (anyPay) {
    const old = data.bustePaga.find((b) => b.mese === k);
    const row = { mese: k, imponibile: base > 0 ? base : null, tfr };
    if (azT) row.azienda = az;
    if (volT) row.volontario = vol;
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

/* ======================= Pensione ======================= */
/* Previsione della posizione al pensionamento, a tre livelli:
   0 · senza data di pensionamento: la pagina chiede il mese di nascita;
   1 · con il mese di nascita: stima dell'app (pensione di vecchiaia a 67 anni, coefficiente di rendita generico);
   2 · con il prospetto annuale del fondo: data, previsione ufficiale e coefficiente di rendita del fondo.
   Tutto in euro di oggi (rendimenti reali, al netto dell'inflazione), con le ipotesi di effRef().proiezioni. */
const compNome = (c) => { const x = String(c || '').toLowerCase(); return COMPARTI.find((n) => n.toLowerCase() === x) || 'Dinamico'; };
function pensLivello() { return data.prospetto ? 2 : data.pensione && data.pensione.nascita ? 1 : 0; }
// Indice (mesi, con frazione) della data di pensionamento.
function pensIdx() {
  const R = effRef().proiezioni;
  if (data.prospetto) { const [y, m, d] = data.prospetto.dataPensione.split('-').map(Number); return y * 12 + m - 1 + (d - 1) / 31; }
  if (data.pensione.nascita) return idxOf(data.pensione.nascita) + R.etaPensione * 12;
  return null;
}
const pensLabel = (i) => { const m = Math.floor(i) % 12, y = Math.floor(Math.floor(i) / 12); return MESI[m] + ' ' + y; };

function pensBase(M) {
  if (!M.last || pensLivello() === 0) return null;
  const ks = Object.keys(M.months).sort().filter((k) => idxOf(k) <= idxOf(todayKey())).slice(-12);
  if (!ks.length) return null;
  const Rf = effRef(), R = Rf.proiezioni, C = comparison(M);
  let vol = 0, az = 0, tfr = 0, imp = 0, nImp = 0;
  for (const k of ks) { const d = M.months[k]; vol += d.vol; az += d.az; tfr += d.tfr; if (d.base > 0) { imp += d.base; nImp++; } }
  const sc = 12 / ks.length; vol *= sc; az *= sc; tfr *= sc;
  imp = nImp ? imp * 12 / nImp : 0;
  const comp = compNome(M.last.c);
  const isc = (c) => Rf.fondo.iscComparti[c] != null ? Rf.fondo.iscComparti[c] : Rf.isc.fondiNegoziali;
  const netto = (lordo, costo) => (lordo - costo) * (1 - R.quotaTasse);
  const rC = {}; for (const c of COMPARTI) rC[c] = netto(R.rendimentiLordi[c], isc(c));
  const tfrNom = (0.015 + 0.75 * R.inflazione) * (1 - Rf.tfr.imposta);
  const own = C ? C.own : M.last.v;
  const pIdx = pensIdx(), t0 = M.last.i + 1;
  const nasc = data.pensione.nascita ? idxOf(data.pensione.nascita) : null;
  const eta = nasc != null ? (pIdx - nasc) / 12 : R.etaPensione;
  const coef = data.prospetto ? data.prospetto.renditaAnnua / data.prospetto.posizioneFinale : R.coeffRendita67 + R.coeffRenditaPerAnno * (eta - R.etaPensione);
  const ades = data.prospetto && data.prospetto.adesione ? idxOf(data.prospetto.adesione.slice(0, 7)) : idxOf(M.firstKey);
  return {
    R, comp, rC, rCur: rC[comp], rAperti: netto(R.rendimentiLordi[comp], Rf.isc.fondiAperti), rPip: netto(R.rendimentiLordi[comp], Rf.isc.pip),
    rTfr: (1 + tfrNom) / (1 + R.inflazione) - 1,
    own, startAperti: C ? C.fpa : own, startPip: C ? C.pip : own, startTfr: C ? C.tfr : own,
    versatoOggi: M.last.e + (C ? C.pend : 0),
    vol, az, tfr, imp, volPct: imp > 0 ? vol / imp : 0,
    pIdx, t0, eta, coef, ades, oggi: M.last.k
  };
}

/* Simulazione anno per anno: contributi a metà anno, crescita reale dei contributi g.
   tfrMode: TFR lasciato in azienda (rivalutazione di legge) e contributo volontario tenuto in busta, senza rendimento. */
function pensSim(B, o) {
  const n = Math.max(0, o.anni), yrs = Math.floor(n), fr = n - yrs;
  let v = o.start, cash = 0, sv = 0, sa = 0, st = 0, cost = 0, fV = o.vol, fA = o.az, fT = o.tfr;
  const pts = [v], fix = o.tfrMode ? 0 : B.R.costoFissoAnnuo;
  const step = (f) => {
    if (o.tfrMode) { v = v * Math.pow(1 + B.rTfr, f) + fT * f; cash += fV * f; }
    else { const c = (fV + fA + fT - fix) * f; v = v * Math.pow(1 + o.r, f) + c * Math.pow(1 + o.r, f / 2); cost += fix * f; }
    sv += fV * f; sa += (o.tfrMode ? 0 : fA) * f; st += fT * f;
  };
  for (let y = 0; y < yrs; y++) { step(1); fV *= 1 + o.g; fA *= 1 + o.g; fT *= 1 + o.g; pts.push(v + cash); }
  if (fr > 0.001) { step(fr); pts.push(v + cash); }
  return { v: v + cash, sv, sa, st, cost, pts, n };
}

/* Rendita lorda e netta stimata. Tassazione della prestazione: dal 15% al 9% con gli anni di adesione
   oltre il 15°, applicata solo alla parte che viene da contributi e TFR (i rendimenti sono già tassati). */
function pensRendita(B, cap, versTot, ex) {
  const T = B.R.tassaPrestazione;
  const anniAdes = Math.floor((B.pIdx + ex * 12 - B.ades) / 12);
  const aliq = Math.max(T.minimo, T.base - T.riduzioneAnnua * Math.max(0, anniAdes - T.dopoAnni));
  const coef = B.coef + B.R.coeffRenditaPerAnno * ex;
  const quota = cap > 0 ? Math.min(1, versTot / cap) : 1;
  const lordo = cap * coef, netto = lordo * (1 - aliq * quota);
  return { lordo, netto, aliq, quota, coef, anniAdes, pctStip: B.imp > 0 ? lordo / B.imp : null, pctStipN: B.imp > 0 ? netto / B.imp : null };
}

/* Calcolo completo per un insieme di scelte (contributo %, crescita, anni in più/meno, scenario). */
function pensRun(B, p) {
  const ex = p.ex || 0, anni = (B.pIdx + ex * 12 - B.t0) / 12;
  const g = p.g == null ? B.R.crescitaContributi : p.g / 100;
  const vol = p.vol == null ? B.vol : B.imp * p.vol / 100, az = p.vol === 0 ? 0 : B.az;
  const r = B.rCur + (p.sc || 0) * B.R.scartoScenari;
  const s = pensSim(B, { start: B.own, r, vol, az, tfr: B.tfr, g, anni });
  const vers = s.sv + s.sa + s.st;
  const rend = pensRendita(B, s.v, B.versatoOggi + vers, ex);
  return { s, vers, guadagno: s.v - B.own - vers + s.cost, rend, anni, g, ex };
}

/* I sei scenari a confronto, tutti con le scelte di oggi. */
function pensScenari(B) {
  const g = B.R.crescitaContributi, anni = (B.pIdx - B.t0) / 12;
  const out = COMPARTI.map((c) => ({ id: c, nome: c, cur: c === B.comp, line: true, ...pensSim(B, { start: B.own, r: B.rC[c], vol: B.vol, az: B.az, tfr: B.tfr, g, anni }) }));
  out.push({ id: 'aperti', nome: 'Fondo aperto (banche, SGR)', ...pensSim(B, { start: B.startAperti, r: B.rAperti, vol: B.vol, az: 0, tfr: B.tfr, g, anni }) });
  out.push({ id: 'pip', nome: 'PIP (assicurazioni)', ...pensSim(B, { start: B.startPip, r: B.rPip, vol: B.vol, az: 0, tfr: B.tfr, g, anni }) });
  out.push({ id: 'tfr', nome: 'TFR lasciato in azienda', line: true, ...pensSim(B, { start: B.startTfr, vol: B.vol, az: 0, tfr: B.tfr, g, anni, tfrMode: true }) });
  return out;
}

/* "Sei in linea?": la posizione reale confrontata con quella che si sarebbe avuta crescendo esattamente
   al rendimento previsto, con gli stessi versamenti nelle stesse date. */
function pensInLinea(M, B) {
  const P = M.P; if (P.length < 2) return null;
  const run = (from) => { let E = P[from].v; for (let i = from + 1; i < P.length; i++) { const a = P[i - 1], b = P[i]; E = E * Math.pow(1 + B.rC[compNome(a.c)], (b.i - a.i) / 12) + (b.e - a.e); } return E; };
  const y = parseKey(M.last.k).y; let f = -1;
  for (let i = 0; i < P.length; i++) if (parseKey(P[i].k).y < y) f = i;
  const mk = (E) => ({ exp: E, diff: M.last.v - E, pct: M.last.v / E - 1 });
  return { all: mk(run(0)), anno: f >= 0 && f < P.length - 1 ? mk(run(f)) : null, y, dal: P[0].k };
}

/* Pagina Pensione: le previsioni restano in euro anche in modalità privata (sono stime future).
   Si nasconde solo la posizione di oggi. */
const eurF = (n, d = 2) => num(n, d) + ' €';
const eurFS = (n, d = 2) => (n >= 0 ? '+' : '') + eurF(n, d);

function pensChart(S, P_, annoFine) {
  const L = S.filter((s) => s.line), cur = L.find((s) => s.cur) || L[0];
  const n = cur.n, mx = Math.max(...L.map((s) => Math.max(...s.pts))) * 1.04, W = 196, H = 230;
  const X = (t) => 6 + Math.min(t, n) / (n || 1) * W, Y = (v) => H - v / mx * (H - 14);
  const col = (s) => s.cur ? 'var(--accent)' : s.id === 'tfr' ? 'var(--alt)' : 'var(--tfr)';
  const dash = (s) => s.cur ? '' : s.id === 'tfr' ? '1.5 3' : s.id === 'Sicuro' ? '2 3' : s.id === 'Bilanciato' ? '6 3' : '4 3';
  let h = `<line x1="6" y1="${H}" x2="${6 + W}" y2="${H}" stroke="var(--sep)" stroke-width="1"/>`;
  const ord = L.slice().sort((a, b) => b.v - a.v); let last = -99; const lab = [];
  for (const s of ord) {
    h += `<polyline fill="none" stroke="${col(s)}" stroke-width="${s.cur ? 2.6 : 1.4}" ${dash(s) ? `stroke-dasharray="${dash(s)}"` : ''} stroke-linecap="round" points="${s.pts.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}"/>`;
    let y = Y(s.v); if (y - last < 34) y = last + 34; last = y;
    h += `<circle cx="${6 + W}" cy="${Y(s.v).toFixed(1)}" r="3.2" fill="${col(s)}"/>`;
    const val = eurF(s.v, 0);
    lab.push(`<text x="${W + 14}" y="${(y - 1).toFixed(1)}" font-size="14" font-weight="${s.cur ? 700 : 600}" fill="var(--text)">${val}</text><text x="${W + 14}" y="${(y + 14).toFixed(1)}" font-size="12" fill="var(--muted)">${s.id === 'tfr' ? 'TFR in azienda' : esc(s.nome)}${s.cur ? ' · tuo' : ''}</text>`);
  }
  const y0 = parseKey(todayKey()).y;
  h += lab.join('') + `<text x="6" y="${H + 16}" font-size="11" fill="var(--muted)">${y0}</text><text x="${6 + W}" y="${H + 16}" font-size="11" text-anchor="end" fill="var(--muted)">${annoFine}</text>`;
  const maxY = Math.max(H + 22, last + 20);
  return `<svg width="100%" viewBox="0 0 340 ${maxY.toFixed(0)}" role="img" aria-label="Crescita della posizione fino alla pensione: i tre comparti e il TFR lasciato in azienda">${h}</svg>`;
}

const LINK_METODO = () => effRef().proiezioni.link.metodologia;
const PENS_DECLARATORIA = 'Le previsioni di questa pagina sono stime elaborate sul telefono a partire dai tuoi dati e dalle ipotesi pubblicate dal fondo e dalla COVIP. Non sono la proiezione ufficiale del fondo, non impegnano Previdenza Cooperativa né la COVIP e non sono una consulenza finanziaria né un consiglio d\'investimento o sulla scelta del comparto. Gli importi sono in euro di oggi (al netto di un\'inflazione ipotizzata del 2% l\'anno) e i rendimenti sono ipotesi: quelli reali possono essere più alti o più bassi, anche negativi in alcuni anni, e i rendimenti passati non sono indicativi di quelli futuri. Fondi aperti e PIP sono stimati con i costi medi pubblicati dalla COVIP a parità di investimento e senza contributo dell\'azienda; il TFR in azienda con la rivalutazione di legge (1,5% più il 75% dell\'inflazione, tassata al 17%). La rendita è vitalizia, immediata e senza reversibilità; il netto stima l\'imposta sulla prestazione con le regole di oggi (dal 15% al 9% in base agli anni di adesione, sulla sola parte che viene da contributi e TFR), che potrebbero cambiare. Per i dettagli fiscali fa fede il Documento sul regime fiscale del fondo.';

function viewPensione(M) {
  const P_ = priv(), L = pensLivello();
  let html = `<div class="head"><div class="eyebrow-row"><div class="eyebrow">Previsione</div>${privPill()}</div><div class="title-row"><h1>Pensione</h1><div class="head-actions">${privBtn()}</div></div></div>`;
  const links = `<h2 class="sec">Approfondisci</h2><section class="card flush">
      ${extLink(LINK_AREA, '<span>Simulatore ufficiale del fondo<br><span class="sub">Area riservata › proiezioni personalizzate</span></span>' + ICON_EXT, 'listlink')}
      ${extLink(LINK_METODO(), '<span>Metodologia e ipotesi del fondo</span>' + ICON_EXT, 'listlink')}
      ${extLink(effRef().proiezioni.link.covip, '<span>COVIP · guida alla previdenza complementare</span>' + ICON_EXT, 'listlink')}
    </section>
    <div class="note" style="margin-top:14px;line-height:1.5">${PENS_DECLARATORIA}</div>`;
  if (!M.last || !Object.keys(M.months).length) {
    return html + `<section class="card"><div class="title">Servono i primi dati</div><div class="sub">Per la previsione servono almeno una busta paga e un valore del fondo.</div></section>` + links;
  }
  if (L === 0) {
    html += `<section class="card">
      <div style="display:flex;gap:10px;align-items:center"><span class="icon-badge" style="background:var(--accent-soft);color:var(--accent-text)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3h11M6.5 21h11"/><path d="M7.5 3c0 5 4.5 6 4.5 9s-4.5 4-4.5 9M16.5 3c0 5-4.5 6-4.5 9s4.5 4 4.5 9"/></svg></span>
      <div><div class="title">Quando andrai in pensione?</div><div class="sub">Con il tuo mese di nascita Quota calcola quanto potresti avere, partendo dalla tua posizione di oggi e dai versamenti delle buste paga.</div></div></div>
      ${P_ ? '' : '<div class="btnrow"><button type="button" class="btn primary" data-act="sheet" data-v="pensdati">Aggiungi dati</button></div>'}
      <div class="sub" style="margin-top:12px">Con il prospetto annuale del fondo (il PDF o tre numeri a mano) la previsione usa anche la data e la rendita ufficiali.</div>
    </section>`;
    return html + links;
  }
  const B = pensBase(M);
  if (!B) return html + `<section class="card"><div class="sub">Dati insufficienti per la previsione.</div></section>` + links;
  const X = pensRun(B, { vol: null, g: null, ex: 0, sc: 0 }), Rr = X.rend, pr = data.prospetto;
  const quando = pensLabel(B.pIdx), eta = Math.round(B.eta);
  const pq1 = (x) => x == null ? '—' : pctPlain(x, 0);

  // Riepilogo
  // Rendita: prima l'importo annuale, grande; sotto quello mensile, più piccolo.
  const rendita = (lab, v, color) => `<div><div class="kv-l" style="color:var(--hero-2)">${lab}</div>
      <div class="kv-v" style="color:${color};font-size:24px;font-weight:700;letter-spacing:-.02em">${eurF(v, 0)}<span style="font-size:14px;font-weight:600;color:var(--hero-2)"> l'anno</span></div>
      <div class="kv-l" style="color:var(--hero-2);font-size:15px">${eurF(v / 12, 0)} al mese</div></div>`;
  html += `<section class="hero" aria-label="Previsione al pensionamento">
    <div class="lbl">Al pensionamento · ${quando}${eta ? ' · ' + eta + ' anni' : ''}</div>
    <div class="big">${eurF(X.s.v, 0)}</div>
    <div class="when">Capitale stimato, in euro di oggi</div>
    <div class="grid2" style="margin-top:14px">
      ${rendita('Rendita lorda', Rr.lordo, '#fff')}
      ${rendita('Rendita netta stimata', Rr.netto, 'var(--mint)')}
    </div>
    <div class="when" style="margin-top:8px">Netto: imposta sulla prestazione del ${pctPlain(Rr.aliq, 1)} (${Rr.anniAdes} anni di adesione), solo su contributi e TFR.</div>
    ${Rr.pctStip != null ? `<div class="when" style="margin-top:10px">La rendita lorda vale il ${pq1(Rr.pctStip)} del tuo stipendio lordo di oggi (12 mensilità).</div>` : ''}
  </section>`;
  const yp = (x) => eurF(x, 0);
  html += `<section class="card" aria-label="Da dove arriva">
    <div class="sub">Da oggi alla pensione · ${num(X.anni, 1)} anni</div>
    <div class="yrow"><span>Versato da oggi</span><span class="num" style="font-weight:600">${eurF(X.vers, 0)}</span></div>
    <div class="yrow"><span><span class="dot" style="background:var(--vol)"></span>Tuo contributo</span><span class="num">${yp(X.s.sv)}</span></div>
    <div class="yrow"><span><span class="dot" style="background:var(--az)"></span>Azienda</span><span class="num">${yp(X.s.sa)}</span></div>
    <div class="yrow"><span><span class="dot" style="background:var(--tfr)"></span>TFR</span><span class="num">${yp(X.s.st)}</span></div>
    <div class="yrow"><span>Guadagno del fondo</span><span class="num" style="color:var(--ok);font-weight:600">${eurFS(X.guadagno, 0)}</span></div>
    <div class="yrow"><span>Posizione di oggi</span><span class="num">${P_ ? MASK : eurF(B.own, 0)}</span></div>
    ${pr ? `<div class="ynote ${Math.abs(X.s.v / pr.posizioneFinale - 1) < 0.05 ? 'ok' : 'warn'}">Previsione ufficiale del prospetto ${pr.anno || ''}: ${eurF(pr.posizioneFinale, 0) + ', rendita lorda ' + eurF(pr.renditaAnnua, 0) + ' l\'anno. Quota stima ' + eurFS(X.s.v - pr.posizioneFinale, 0) + '.'} La differenza viene dai dati più recenti e dalle ipotesi di calcolo.</div>`
      : `<div class="ynote warn">Rendita calcolata con un coefficiente generico. Aggiungi il prospetto annuale del fondo per la data e la rendita ufficiali.${P_ ? '' : ' <button type="button" class="chipbtn warn" style="margin-top:8px;background:var(--card)" data-act="sheet" data-v="pensdati">Aggiungi il prospetto</button>'}</div>`}
  </section>`;

  // Sei in linea?
  const IL = pensInLinea(M, B);
  if (IL) {
    const riga = (lab, d) => { const avanti = d.diff >= 0; return `<div class="yrow"><span>${lab}</span><span class="num" style="color:var(${avanti ? '--ok' : '--warn'});font-weight:600">${P_ ? pct(d.pct, 1) : eurS(d.diff, 0)} ${avanti ? 'avanti' : 'indietro'}</span></div>`; };
    html += `<h2 class="sec">Sei in linea?</h2><section class="card" aria-label="Sei in linea">
      <div class="sub">La tua posizione reale confrontata con quella prevista dalle ipotesi del fondo, con gli stessi versamenti.</div>
      ${IL.anno ? riga('Nel ' + IL.y, IL.anno) : ''}${riga('Dall\'inizio (' + monthLabel(IL.dal).toLowerCase() + ')', IL.all)}
      <div class="sub" style="margin-top:8px">Avanti vuol dire che finora il fondo ha reso più delle ipotesi; i mercati però cambiano, in meglio e in peggio.</div>
    </section>`;
  }

  // Grafico e classifica
  const S = pensScenari(B), cur = S.find((s) => s.cur);
  html += `<h2 class="sec">Come cresce</h2><section class="card" aria-label="Grafico">
    <div class="sub">I tre comparti del fondo e il TFR lasciato in azienda, con i tuoi versamenti di oggi</div>
    ${pensChart(S, P_, Math.floor(B.pIdx / 12))}
    <div class="legend" style="margin-top:6px;font-size:12px;color:var(--muted);display:flex;gap:12px;flex-wrap:wrap"><span><span class="sw" style="border-top:2.6px solid var(--accent)"></span>Comparto ${esc(B.comp)} (attuale)</span><span><span class="sw" style="border-top:1.4px dashed var(--tfr)"></span>Altri comparti</span><span><span class="sw" style="border-top:1.4px dotted var(--alt)"></span>TFR in azienda</span></div>
  </section>`;
  const ord = S.slice().sort((a, b) => b.v - a.v), top = ord[0].v;
  html += `<h2 class="sec">Al pensionamento</h2><section class="card" aria-label="Classifica">
    ${ord.map((s) => { const d = s.v - cur.v; return `<div class="pbar"><div class="row-top"><span style="${s.cur ? 'font-weight:700' : ''}">${esc(s.nome)}${s.cur ? ' · la tua scelta' : ''}</span><span class="num" style="font-weight:600">${eurF(s.v, 0)}</span></div>
      <div class="pbar-track"><div style="width:${(s.v / top * 100).toFixed(1)}%;background:${s.cur ? 'var(--accent)' : s.id === 'tfr' || s.id === 'pip' || s.id === 'aperti' ? 'var(--alt)' : 'var(--tfr)'}"></div></div>
      ${!s.cur ? `<div class="sub" style="margin-top:3px;color:var(${d >= 0 ? '--ok' : '--bad'})">${eurFS(d, 0)} rispetto alla tua scelta</div>` : ''}</div>`; }).join('')}
    <div class="sub" style="margin-top:6px">Fondo aperto e PIP: costi medi COVIP a parità di investimento, senza il contributo dell'azienda. TFR in azienda: rivalutazione di legge; il tuo contributo resta in busta paga, senza rendimento.</div>
  </section>
  <section class="card banner warn" style="padding:14px 18px;border-radius:var(--radius)"><b>Rendimento e rischio vanno insieme.</b> I comparti con più azioni rendono di più in media ma possono perdere di più negli anni negativi, e conta soprattutto negli anni vicini alla pensione. Questo confronto non è un consiglio sulla scelta del comparto.</section>`;

  // Calcolatore
  const vDef = Math.round(B.volPct * 200) / 2, p = ui.pens;
  html += `<h2 class="sec">E se…</h2><section class="card" aria-label="Calcolatore">
    <div class="sub">Sposta i cursori: il confronto è con la previsione qui sopra.</div>
    <div class="pslider"><label for="p-vol">Tuo contributo</label><input id="p-vol" type="range" min="0" max="10" step="0.5" value="${p.vol == null ? vDef : p.vol}" data-p="vol"><output id="p-vol-o"></output></div>
    <div class="pslider"><label for="p-g">Crescita dello stipendio</label><input id="p-g" type="range" min="0" max="3" step="0.5" value="${p.g == null ? B.R.crescitaContributi * 100 : p.g}" data-p="g"><output id="p-g-o"></output></div>
    <div class="pslider"><label for="p-ex">Pensione</label><input id="p-ex" type="range" min="-3" max="3" step="1" value="${p.ex}" data-p="ex"><output id="p-ex-o"></output></div>
    <div class="seg" role="group" aria-label="Scenario di rendimento" style="margin:12px 0 0">${[[-1, 'Prudente'], [0, 'Come il fondo'], [1, 'Ottimista']].map(([v, l]) => `<button type="button" data-act="pens-sc" data-v="${v}" aria-pressed="${p.sc === v}">${l}</button>`).join('')}</div>
    <div id="p-sc-o" class="sub" style="margin-top:6px"></div>
    <div id="pens-calc" style="margin-top:10px"></div>
    <button type="button" class="linkbtn" data-act="pens-reset" style="margin-top:6px">Ripristina i valori di oggi</button>
  </section>`;
  if (!P_) html += `<section class="card flush"><button type="button" class="listlink" data-act="sheet" data-v="pensdati"><span>Dati della previsione<br><span class="sub">${pr ? 'Prospetto ' + (pr.anno || '') + (pr.fonte === 'pdf' ? ' letto dal PDF' : ' inserito a mano') : 'Nascita ' + monthLabel(data.pensione.nascita).toLowerCase() + ' · aggiungi il prospetto'}</span></span><span class="sub">Modifica</span></button></section>`;
  return html + links;
}

function refreshPens() {
  const out = $('#pens-calc'); if (!out || !data) return;
  const M = model(), B = pensBase(M); if (!B) return;
  const p = ui.pens, base = pensRun(B, { vol: null, g: null, ex: 0, sc: 0 });
  const X = pensRun(B, p);
  const vDef = Math.round(B.volPct * 200) / 2, volShown = p.vol == null ? vDef : p.vol;
  const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  set('#p-vol-o', num(volShown, volShown % 1 ? 1 : 0) + '%');
  set('#p-g-o', num(X.g * 100, X.g * 1000 % 10 ? 1 : 0) + '%');
  set('#p-ex-o', String(Math.floor((B.pIdx + p.ex * 12) / 12)));
  set('#p-sc-o', 'Rendimento reale netto ' + pctPlain(B.rCur + p.sc * B.R.scartoScenari, 2) + ' l\'anno · comparto ' + B.comp + (p.vol === 0 ? ' · senza contributo tuo l\'azienda non versa' : ''));
  const d = X.s.v - base.s.v, dn = X.rend.netto - base.rend.netto;
  out.innerHTML = `<div class="grid2">
      <div><div class="kv-l">Capitale</div><div class="kv-v">${eurF(X.s.v, 0)}</div><div class="kv-l" style="color:var(${d >= 0 ? '--ok' : '--bad'})">${eurFS(d, 0)}</div></div>
      <div><div class="kv-l">Rendita netta l'anno</div><div class="kv-v">${eurF(X.rend.netto, 0)}</div><div class="kv-l">${eurF(X.rend.netto / 12, 0)} al mese</div><div class="kv-l" style="color:var(${dn >= 0 ? '--ok' : '--bad'})">${eurFS(dn, 0)} l'anno</div></div>
    </div>
    <div class="sub" style="margin-top:8px">Lorda ${eurF(X.rend.lordo, 0)} l'anno (${eurF(X.rend.lordo / 12, 0)} al mese) · imposta ${pctPlain(X.rend.aliq, 1)} · di tasca tua ${eurF(X.s.sv, 0)} da oggi</div>`;
}

/* Prospetto annuale del fondo (PDF): estrae i dati della previsione e quelli per la verifica dell'anno.
   Riconosce le etichette del "Prospetto delle prestazioni pensionistiche – fase di accumulo" (schema COVIP). */
function parseProspetto(t) {
  const T = String(t).replace(/\s+/g, ' ');
  const n = (s) => s == null ? null : Number(s.replace(/\./g, '').replace(',', '.'));
  const d = (s) => { const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] : null; };
  const g = (re) => { const m = re.exec(T); return m ? m[1] : null; };
  const anno = Number(g(/fase di accumulo\s*\(?\s*Anno (\d{4})/i)) || null;
  const dataPensione = d(g(/pensionamento\s+di\s*(?:vecchiaia:?\s*)?(\d{2}\/\d{2}\/\d{4})/i) || g(/vecchiaia:?\s*(\d{2}\/\d{2}\/\d{4})/i));
  const adesione = d(g(/adesione alla previdenza\s*(?:complementare:?\s*)?(\d{2}\/\d{2}\/\d{4})/i) || g(/complementare:?\s*(\d{2}\/\d{2}\/\d{4})/i));
  const posFin = n(g(/([\d.]+,\d{2})\s*\(posizione finale\)/i));
  const rendita = n(g(/([\d.]+,\d{2})\s*annui/i));
  let verifica = null;
  if (anno) {
    const pos = n(g(new RegExp('Posizione individuale al 31/12/' + anno + '\\s+([\\d.]+,\\d{2})', 'i')));
    const two = (lab) => { const m = new RegExp(lab + '\\s+([\\d.]+,\\d{2})\\s+([\\d.]+,\\d{2})', 'i').exec(T); return m ? n(m[2]) : null; };
    if (pos) verifica = { posizione: pos, vol: two('contributi lavoratore') || 0, az: two('contributi datore di lavoro') || 0, tfr: two('\\bTFR') || 0 };
  }
  return { anno, dataPensione, adesione, posFin, rendita, verifica };
}
async function readProspetto(file) {
  if (!ui.sheet) return;
  ui.sheet.info = { stato: 'info', msg: 'Lettura del prospetto…' }; renderSheet();
  let r;
  try {
    if (!window.QuotaBusta || !window.QuotaBusta.readText) throw new Error('Lettore PDF non disponibile: ricarica l\'app.');
    r = parseProspetto(await window.QuotaBusta.readText(file, { askPassword: (retry) => prompt(retry ? 'Password errata. Riprova:' : 'Il PDF è protetto da password. Inseriscila (non viene salvata):') }));
  } catch (e) { if (ui.sheet) { ui.sheet.info = { stato: 'bad', msg: e && e.message ? e.message : 'Impossibile leggere il PDF.' }; renderSheet(); } return; }
  if (!ui.sheet) return;
  const s = ui.sheet;
  if (!r.dataPensione && !r.posFin && !r.rendita) { s.info = { stato: 'bad', msg: 'Non sembra il prospetto annuale del fondo: inserisci i dati a mano.' }; renderSheet(); return; }
  if (r.anno) s.anno = String(r.anno);
  if (r.dataPensione) s.dataPensione = r.dataPensione;
  if (r.posFin) s.posFin = num(r.posFin, 2);
  if (r.rendita) s.rendita = num(r.rendita, 2);
  s.adesione = r.adesione; s.verifica = r.verifica; s.fonte = 'pdf';
  const manca = [!r.dataPensione && 'data di pensionamento', !r.posFin && 'posizione finale', !r.rendita && 'rendita'].filter(Boolean);
  s.info = { stato: manca.length ? 'warn' : 'ok', msg: 'Letti dal prospetto' + (r.anno ? ' ' + r.anno : '') + (manca.length ? '. Non trovati: ' + manca.join(', ') + ', inseriscili a mano.' : '. Controlla e premi Salva: il PDF non viene conservato.') };
  renderSheet();
}

/* Verifica dell'anno con il prospetto: posizione al 31/12 e versato arrivato al fondo nell'anno. */
function verificaProspetto(M, Y) {
  const pr = data.prospetto; if (!pr || pr.anno !== Y || !pr.verifica) return '';
  const P_ = priv(), V = pr.verifica, dec = M.P.find((p) => p.k === key(Y, 12)), decP = M.P.find((p) => p.k === key(Y - 1, 12));
  const versP = V.vol + V.az + V.tfr;
  const riga = (lab, app, uff) => {
    if (app == null) return `<div class="yrow"><span>${lab}</span><span class="num" style="color:var(--muted)">valore di dicembre mancante</span></div>`;
    const ok = Math.abs(app - uff) < 1;
    return `<div class="yrow"><span>${lab}</span><span class="num">${P_ ? '' : eur(app) + ' · '}<span class="pill ${ok ? 'ok' : 'warn'}">${ok ? 'Torna' : (P_ ? 'Diverso' : 'Diff. ' + eurS(app - uff))}</span></span></div>`;
  };
  return `<h2 class="sec">Verifica con il prospetto ${Y}</h2><section class="card" aria-label="Verifica con il prospetto">
    <div class="sub">Il prospetto conta i versamenti quando arrivano al fondo${P_ ? '' : ': ' + eur(versP) + ' nel ' + Y + ', posizione ' + eur(V.posizione)}.</div>
    ${riga('Posizione al 31/12', dec ? dec.v : null, V.posizione)}
    ${riga('Arrivato al fondo nell\'anno', dec && decP ? dec.e - decP.e : null, versP)}
  </section>`;
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
    <section class="card flush helpcard">
      <button type="button" class="glink" data-act="guida-open"><span class="help-ic" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v13"/><path d="M3 5.5c3-1.3 6-1.3 9 1.5 3-2.8 6-2.8 9-1.5V19c-3-1.3-6-1.3-9 1-3-2.3-6-2.3-9-1z"/></svg></span>
        <span style="flex:1"><span class="gl-t">Guida completa</span><span class="gl-s">Come inserire i dati, cosa vuol dire ogni schermata, cosa salva Quota</span></span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
      <button type="button" class="listlink" data-act="intro-open">Rivedi l'introduzione</button>
    </section>
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

    <h3 class="group">Tasse</h3>
    <section class="card flush" style="margin-top:0">
      <div class="field"><label for="s-irpef">Scaglione IRPEF</label><select id="s-irpef" data-act="scaglione-irpef">${(() => {
        const y = parseKey(todayKey()).y, lab = ['fino a 28.000 €', '28.000 – 50.000 €', 'oltre 50.000 €'];
        return [1, 2, 3].map((n) => `<option value="${n}" ${data.impostazioni.scaglioneIrpef === n ? 'selected' : ''}>${pctPlain(R.irpef.aliquote[Object.keys(R.irpef.aliquote).filter((k) => Number(k) <= y).sort().pop()][n - 1], 0)} · ${lab[n - 1]}</option>`).join('');
      })()}</select></div>
    </section>
    <div class="note">Il tuo scaglione più alto di reddito. Serve solo a stimare quanta IRPEF ti torna con la deduzione dei contributi (card "Ogni 1 € di tasca tua"). Fonte: ${esc(R.irpef.fonte)}.</div>

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
      <div class="field"><label for="s-paga">Giorno di paga</label><select id="s-paga" data-act="giorno-paga">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${i + 1 === giornoPaga() ? 'selected' : ''}>${i + 1} del mese</option>`).join('')}</select></div>
      <div class="row"><div class="row-meta">Prossima busta paga attesa ${dayLabel(paydayInfo().prossima)}</div></div>
      <button type="button" class="listlink" data-act="guide-toggle" aria-expanded="${ui.guideOpen}">${ui.guideOpen ? 'Nascondi la guida' : 'Come attivare il promemoria mensile'}</button>
      ${ui.guideOpen ? `<div class="details" style="padding:4px 18px 16px">
        <div>Le web app non possono mandare promemoria da sole: li fa <b>Comandi Rapidi</b> di iOS, gratis.</div>
        <div><b>1.</b> Apri l'app Comandi › Automazione › Nuova automazione › <b>Ora del giorno</b>.</div>
        <div><b>2.</b> Scegli <b>Mensilmente</b>, il giorno di paga (${giornoPaga()}) e un orario. La notifica arriva sempre quel giorno, anche se è festivo: la card in Panoramica invece compare dal primo giorno feriale.</div>
        <div><b>3.</b> Seleziona <b>Esegui immediatamente</b> e attiva <b>Notifica quando eseguito</b>.</div>
        <div><b>4.</b> Come azione aggiungi <b>Apri URL</b> con l'indirizzo dell'app: <span class="num" style="word-break:break-all">${esc(location.origin + location.pathname)}</span></div>
        <div>Ripeti per l'ultimo giorno del mese, quando il fondo pubblica il valore quota.</div>
      </div>` : ''}
    </section>

    <div class="note">Quota ti chiede i dati del mese dal giorno di paga. Se cade di sabato, domenica o in un giorno festivo, dal primo giorno feriale successivo.${giornoPaga() > 28 ? ' Nei mesi più corti vale l\'ultimo giorno del mese.' : ''}</div>

    <h3 class="group">Privacy e dati</h3>
    <section class="card flush" style="margin-top:0">
      <div class="row"><div class="row-name" style="font-weight:400">Dati solo su questo iPhone</div><div class="row-meta">Nessun account, nessun server. Fai un backup ogni tanto e salvalo in File › iCloud Drive.</div></div>
      <button type="button" class="listlink" data-act="export">Esporta backup</button>
      <button type="button" class="listlink" data-act="export-csv">Esporta per foglio di calcolo (CSV)</button>
      <label class="listlink" for="imp-file2" style="cursor:pointer">Importa backup</label>
      <input id="imp-file2" class="sr" type="file" accept=".json,application/json" data-act="import">
      <button type="button" class="listlink" style="color:var(--bad)" data-act="wipe">Elimina tutti i dati</button>
    </section>
    <div class="note">${DISCLAIMER}</div>
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
  } else if (s.type === 'pensdati') {
    body = head('Dati della previsione') + `<h3 class="group">La tua data</h3><section class="card flush" style="margin-top:0">
      <div class="field"><label for="s-nasc">Mese di nascita</label><input id="s-nasc" type="month" data-s="nascita" value="${esc(s.nascita || '')}"></div></section>
      <div class="note">Serve per la data della pensione di vecchiaia (67 anni). Resta solo su questo telefono.</div>
      <h3 class="group">Prospetto annuale del fondo</h3><section class="card flush" style="margin-top:0">
      <label class="listlink" for="s-pdf" style="cursor:pointer"><span>Leggi il prospetto (PDF)</span>${ICON_DOC}</label>
      <input id="s-pdf" class="sr" type="file" accept="application/pdf,.pdf" data-act="prosp-pdf">
      ${s.info ? `<div class="banner ${s.info.stato}" role="status">${esc(s.info.msg)}</div>` : ''}
      <div class="field"><label for="s-anno">Anno del prospetto</label><input id="s-anno" inputmode="numeric" data-s="anno" value="${esc(s.anno || '')}" placeholder="2025"></div>
      <div class="field"><label for="s-dp">Data di pensionamento</label><input id="s-dp" type="date" data-s="dataPensione" value="${esc(s.dataPensione || '')}"></div>
      <div class="field"><label for="s-pf">Posizione finale €</label><input id="s-pf" inputmode="decimal" data-s="posFin" value="${esc(s.posFin || '')}" placeholder="0,00"></div>
      <div class="field"><label for="s-rd">Rendita annua €</label><input id="s-rd" inputmode="decimal" data-s="rendita" value="${esc(s.rendita || '')}" placeholder="0,00"></div></section>
      <div class="note">Nella prima pagina del prospetto, "Quanto potresti ricevere quando andrai in pensione". Il PDF viene solo letto, mai salvato. Se lo lasci vuoto, la previsione usa la data di nascita e un coefficiente di rendita generico.</div>
      ${data.prospetto ? '<section class="card flush"><button type="button" class="listlink" data-act="prosp-del" style="color:var(--bad)">Togli i dati del prospetto</button></section>' : ''}`;
  } else if (s.type === 'volontario') {
    const opt = (v, l) => `<button type="button" data-act="vv-ded" data-v="${v}" aria-pressed="${s.dedotto === (v === '1')}">${l}</button>`;
    body = head(s.id ? 'Versamento volontario' : 'Nuovo versamento') + `<section class="card flush">
      <div class="field"><label for="s-vvd">Data del versamento</label><input id="s-vvd" type="date" data-s="data" value="${esc(s.data || '')}"></div>
      <div class="field"><label for="s-vvi">Importo €</label><input id="s-vvi" inputmode="decimal" autocomplete="off" data-s="importo" value="${esc(s.importo || '')}" placeholder="0,00"></div>
      <div class="field"><label for="s-vvn">Note</label><input id="s-vvn" autocomplete="off" maxlength="200" data-s="nota" value="${esc(s.nota || '')}" placeholder="Facoltative"></div></section>
      <h3 class="group">Nella dichiarazione dei redditi</h3>
      <div class="seg" role="group" aria-label="Deduzione">${opt('1', 'Dedotto')}${opt('0', 'Non dedotto')}</div>
      <div class="note">${s.dedotto
        ? 'Dedotto: lo porti in deduzione nella dichiarazione e conta nello spazio deducibile dell\'anno.'
        : 'Non dedotto: va comunicato al fondo entro il 31 dicembre dell\'anno dopo, così quando lo ritiri non viene tassato. In Anni compare un promemoria finché non lo segni come comunicato.'}</div>
      ${s.id ? '<section class="card flush"><button type="button" class="listlink" data-act="vv-del" style="color:var(--bad)">Elimina il versamento</button></section>' : ''}`;
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

function openSheet(type, id) {
  const R = effRef();
  if (type === 'volontario') {
    const x = id ? data.versamentiVolontari.find((v) => v.id === id) : null;
    const d = new Date(), oggi = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    ui.sheet = x ? { type, id: x.id, data: x.data, importo: num(x.importo, 2), nota: x.nota || '', dedotto: x.dedotto, comunicato: !!x.comunicato }
      : { type, id: null, data: oggi, importo: '', nota: '', dedotto: true, comunicato: false };
  } else if (type === 'ref') {
    const s = { type, fpa: num(R.isc.fondiAperti * 100, 2), pip: num(R.isc.pip * 100, 2) };
    for (const c in R.fondo.iscComparti) s['c-' + c] = num(R.fondo.iscComparti[c] * 100, 2);
    ui.sheet = s;
  } else if (type === 'pensdati') {
    const pr = data.prospetto;
    ui.sheet = { type, nascita: data.pensione.nascita || '', anno: pr && pr.anno ? String(pr.anno) : '', dataPensione: pr ? pr.dataPensione : '',
      posFin: pr ? num(pr.posizioneFinale, 2) : '', rendita: pr ? num(pr.renditaAnnua, 2) : '', adesione: pr ? pr.adesione : null, verifica: pr ? pr.verifica : null, fonte: pr ? pr.fonte : 'mano' };
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
  } else if (s.type === 'pensdati') {
    const nas = String(s.nascita || '').trim();
    if (nas && !/^\d{4}-\d{2}$/.test(nas)) return sheetError('Scegli il mese di nascita.');
    if (nas && (nas < '1940-01' || nas > keyOf(idxOf(todayKey()) - 16 * 12))) return sheetError('Controlla il mese di nascita.');
    const pf = parseIt(s.posFin), rd = parseIt(s.rendita), dp = String(s.dataPensione || '').trim(), anno = Number(s.anno) || null;
    const qualcosa = dp || String(s.posFin || '').trim() || String(s.rendita || '').trim();
    if (qualcosa) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dp) || dp <= todayKey()) return sheetError('Inserisci una data di pensionamento futura.');
      if (!(pf > 0)) return sheetError('Inserisci la posizione finale prevista (es. 219.247,07).');
      if (!(rd > 0) || rd > pf) return sheetError('Inserisci la rendita annua prevista (es. 9.004,15).');
    }
    if (!nas && !qualcosa) return sheetError('Inserisci il mese di nascita oppure i dati del prospetto.');
    data.pensione = { nascita: nas || null };
    data.prospetto = qualcosa ? { anno, dataPensione: dp, posizioneFinale: pf, renditaAnnua: rd, adesione: s.adesione || null, fonte: s.fonte === 'pdf' ? 'pdf' : 'mano', ...(s.verifica && s.fonte === 'pdf' ? { verifica: s.verifica } : {}) } : null;
  } else if (s.type === 'volontario') {
    const dt = String(s.data || '').trim(), imp = parseIt(s.importo);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dt) || dt < '2000-01-01') return sheetError('Scegli la data del versamento.');
    if (!(imp > 0) || imp > 100000) return sheetError('Inserisci l\'importo versato (es. 500,00).');
    const r = { id: s.id || 'vv' + Date.now().toString(36), data: dt, importo: Math.round(imp * 100) / 100, dedotto: !!s.dedotto };
    if (!r.dedotto && s.comunicato) r.comunicato = true;
    const nota = String(s.nota || '').trim().slice(0, 200); if (nota) r.nota = nota;
    data.versamentiVolontari = data.versamentiVolontari.filter((v) => v.id !== r.id).concat([r]).sort((a, b) => a.data.localeCompare(b.data));
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
async function shareFile(content, name, type, title) {
  const blob = new Blob([content], { type });
  try {
    const file = new File([blob], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
async function exportData() {
  const out = Object.assign({}, data, { esportato: new Date().toISOString().slice(0, 10) });
  await shareFile(JSON.stringify(out, null, 2), 'quota-backup-' + out.esportato + '.json', 'application/json', 'Backup Quota');
}

/* Esportazione per foglio di calcolo (sola lettura: non modifica i dati né il backup).
   Una riga per mese, formato italiano: separatore ";" e virgola decimale, così Excel,
   Numbers e Google Fogli aprono il file con le colonne già separate. Date AAAA-MM. */
function buildCSV() {
  const M = model();
  const V = {}; for (const v of data.valorizzazioni) V[v.mese] = v;
  const keys = [...new Set(data.bustePaga.map((b) => b.mese).concat(data.valorizzazioni.map((v) => v.mese)))].sort();
  const n = (x, d) => (x == null || !isFinite(x) ? '' : Number(x).toFixed(d).replace('.', ','));
  const cell = (s) => { s = String(s == null ? '' : s); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const head = ['mese', 'imponibile', 'tfr', 'aliquota_volontario_%', 'aliquota_azienda_%', 'contributo_volontario', 'contributo_azienda', 'contributi_stimati', 'versato_nel_mese',
    'numero_quote', 'valore_quota', 'totale_versato_fondo', 'valore_posizione', 'rendimento', 'comparto', 'data_valorizzazione'];
  const rows = keys.map((k) => {
    const d = M.months[k], v = V[k], r = rateFor(k);
    const val = v ? v.quote * v.valoreQuota : null;
    return [
      k,
      d ? n(d.base, 2) : '', d ? n(d.tfr, 2) : '',
      d && d.base != null ? n(r.volontario * 100, 2) : '', d && d.base != null ? n(r.azienda * 100, 2) : '',
      d ? n(d.vol, 2) : '', d ? n(d.az, 2) : '', d ? (d.stimato ? 'si' : 'no') : '', d ? n(d.tot, 2) : '',
      v ? n(v.quote, 3) : '', v ? n(v.valoreQuota, 3) : '', v ? n(v.totaleVersato, 2) : '',
      v ? n(val, 2) : '', v ? n(val - v.totaleVersato, 2) : '',
      v ? (v.comparto || compartoFor(k)) : compartoFor(k), v && v.data ? v.data : ''
    ].map(cell).join(';');
  });
  // BOM UTF-8: serve a Excel per leggere correttamente gli accenti
  return '﻿' + [head.join(';')].concat(rows).join('\r\n') + '\r\n';
}
async function exportCSV() {
  if (!data.bustePaga.length && !data.valorizzazioni.length) { toast('Nessun dato da esportare'); return; }
  await shareFile(buildCSV(), 'quota-dati-' + new Date().toISOString().slice(0, 10) + '.csv', 'text/csv', 'Dati Quota');
}

/* ======================= Eventi ======================= */
const PRIV_BLOCKED = ['vv-new', 'vv-edit', 'vv-del', 'vv-ded', 'vv-com', 'prosp-del', 'aliq-auto', 'ins-open', 'ins-month', 'ins-save', 'sheet', 'sheet-save', 'export', 'export-csv', 'wipe', 'ref-reset', 'del-comparto', 'del-aliquota', 'start-empty'];
let toastTimer = null;
function toast(msg) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, v = el.dataset.v;
  if (act === 'sheet-scrim' && ev.target !== el) return;
  // In modalità privata niente inserimento, impostazioni, fogli o export (anche se un pulsante restasse a schermo).
  if (priv() && (PRIV_BLOCKED.includes(act) || (act === 'tab' && !PRIV_TABS.includes(v)))) return;
  switch (act) {
    case 'priv':
      ui.priv = !ui.priv; ui.selIdx = null; savePref(); render();
      toast(ui.priv ? 'Modalità privata: importi nascosti' : 'Importi visibili');
      break;
    case 'tab': ui.tab = v; if (v === 'inserisci') { ui.insMonth = null; ui.form = null; } render(); window.scrollTo(0, 0); break;
    case 'ins-open': ui.tab = 'inserisci'; ui.insMonth = null; ui.form = null; render(); window.scrollTo(0, 0); break;
    case 'range': ui.range = v; ui.selIdx = null; render(); break;
    case 'year': ui.year = Number(v); render(); break;
    case 'go-anni': ui.tab = 'anni'; ui.year = Number(v); render(); window.scrollTo(0, 0); break;
    case 'cmp-toggle': ui.cmpOpen = !ui.cmpOpen; render(); break;
    case 'cmp-det': ui.cmpDet = !ui.cmpDet; render(); break;
    case 'guide-toggle': ui.guideOpen = !ui.guideOpen; render(); break;
    case 'ins-month': ui.tab = 'inserisci'; ui.insMonth = v; ui.form = null; render(); window.scrollTo(0, 0); break;
    case 'ins-save': saveIns(); break;
    case 'pens-sc': ui.pens.sc = Number(v); document.querySelectorAll('[data-act="pens-sc"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(v)))); refreshPens(); break;
    case 'pens-reset': ui.pens = { vol: null, g: null, ex: 0, sc: 0 }; render(); break;
    case 'prosp-del': if (confirm('Togliere i dati del prospetto? La previsione userà la data di nascita, se c\'è.')) { data.prospetto = null; persist(); ui.sheet = null; toast('Dati del prospetto tolti'); render(); } break;
    case 'aliq-auto': {
      const [dal, vol, az] = String(v).split(';'); const nv = Number(vol), na = Number(az);
      if (!/^\d{4}-\d{2}$/.test(dal) || !(nv >= 0 && nv <= 0.2) || !(na >= 0 && na <= 0.2)) break;
      data.aliquote = data.aliquote.filter((a) => a.dal !== dal).concat([{ dal, volontario: nv, azienda: na }]).sort((a, b) => a.dal.localeCompare(b.dal));
      persist(); toast('Aliquota aggiornata da ' + monthLabel(dal)); refreshInsCalc(); break;
    }
    case 'start-empty': data = normalize(emptyData()); data.comparti = [{ nome: 'Dinamico', dal: todayKey() }]; persist(); ui.tab = 'impostazioni'; render(); break;
    case 'export': exportData(); break;
    case 'export-csv': exportCSV(); break;
    case 'wipe': if (confirm('Eliminare tutti i dati da questo telefono? Fai prima un backup.')) { localStorage.removeItem(STORE_KEY); data = null; render(); } break;
    case 'sheet': openSheet(v); break;
    case 'vv-new': openSheet('volontario'); break;
    case 'vv-edit': openSheet('volontario', v); break;
    case 'vv-ded': if (ui.sheet) { ui.sheet.dedotto = v === '1'; if (ui.sheet.dedotto) ui.sheet.comunicato = false; renderSheet(); } break;
    case 'vv-del': if (ui.sheet && confirm('Eliminare questo versamento?')) { data.versamentiVolontari = data.versamentiVolontari.filter((x) => x.id !== ui.sheet.id); persist(); ui.sheet = null; toast('Versamento eliminato'); render(); } break;
    case 'vv-com': {
      const y = String(v);
      for (const x of data.versamentiVolontari) if (!x.dedotto && x.data.slice(0, 4) === y) x.comunicato = true;
      persist(); toast('Segnato come comunicato al fondo'); render(); break;
    }
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
  if (t.dataset.p && ui.tab === 'pensione') { ui.pens[t.dataset.p] = Number(t.value); refreshPens(); }
});
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.dataset.act === 'import' && t.files && t.files[0]) { importFile(t.files[0]); t.value = ''; }
  if (t.dataset.act === 'busta-pdf' && t.files && t.files[0]) { const file = t.files[0]; t.value = ''; readBusta(file); }
  if (t.dataset.act === 'prosp-pdf' && t.files && t.files[0]) { const file = t.files[0]; t.value = ''; readProspetto(file); }
  if (t.dataset.act === 'ins-select') { ui.insMonth = t.value; ui.form = null; render(); }
  if (t.dataset.act === 'scaglione-irpef' && data) { data.impostazioni.scaglioneIrpef = Number(t.value); persist(); render(); }
  if (t.dataset.act === 'giorno-paga' && data) { data.impostazioni.giornoPaga = Number(t.value); persist(); ui.insMonth = null; ui.form = null; render(); }
  if (t.dataset.s && ui.sheet) { ui.sheet[t.dataset.s] = t.value; }
});
let resizeT = null;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (ui.tab === 'home') render(); }, 200); });

/* ======================= Avvio ======================= */
(function start() {
  const saved = loadJSON(STORE_KEY);
  data = saved ? normalize(saved) : null;
  refUser = loadJSON(REF_USER_KEY);
  const pref = loadJSON(PREF_KEY);
  ui.priv = !!(pref && pref.privata);
  ui.introVista = pref && Number(pref.intro) > 0 ? Number(pref.intro) : 0;
  const cached = loadJSON(REF_CACHE_KEY);
  if (cached && cached.versione > ref.versione) ref = cached;
  render();
  // Introduzione alla prima apertura (e dopo cambi importanti); in modalità privata aspetta la prossima volta.
  if (ui.introVista < INTRO_VER && !ui.priv) introOpen();
  refreshRef();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
