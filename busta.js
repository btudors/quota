/* Quota – lettura della busta paga in PDF.
   Tutto avviene nel telefono: il PDF non viene caricato da nessuna parte né conservato.
   La lettura del testo usa pdf.js (Mozilla, licenza Apache 2.0) in vendor/pdfjs/, caricato solo quando serve.

   Il motore è generico: trasforma il PDF in righe e colonne, poi legge i dati seguendo un "profilo"
   (busta-profili.js) che dice dove si trova ogni voce in quel modello di cedolino.
   Per un modello nuovo si aggiunge un profilo, senza toccare questo file.
   Nel codice ci sono solo etichette e codici voce, mai dati personali. */
(function (root) {
  'use strict';

  const RE_IMPORTO = /^\d{1,3}(?:\.\d{3})*,\d{2}-?$|^\d+,\d{2}-?$/;
  const RE_PERC = /^\d+,\d{3,5}$/;
  const RE_CODICE = /^[0-9A-Z]{3,5}$/;
  const CAMPI = ['imponibile', 'azienda', 'volontario', 'tfr'];
  const NOMI = { imponibile: 'imponibile', azienda: 'contributo azienda', volontario: 'contributo volontario', tfr: 'TFR al fondo' };

  const toNum = (s) => Number(String(s).replace(/-$/, '').replace(/\./g, '').replace(',', '.'));
  const isImporto = (t) => RE_IMPORTO.test(t.s);
  const cx = (t) => t.x + t.w / 2;
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, '');
  const testoRiga = (r) => norm(r.t.map((w) => w.s).join(''));
  const percTxt = (p) => String(p).replace('.', ',') + '%';

  function profiliDisponibili() {
    if (root.QuotaProfili) return root.QuotaProfili;
    try { return require('./busta-profili.js'); } catch (e) { return []; }
  }

  /* Spezza ogni pezzo di testo in parole, stimando la posizione di ciascuna. */
  function words(items) {
    const out = [];
    for (const it of items) {
      const str = String(it.s || ''); if (!str.trim()) continue;
      const per = str.length ? it.w / str.length : 0;
      const re = /\S+/g; let m;
      while ((m = re.exec(str))) out.push({ s: m[0], x: it.x + m.index * per, w: m[0].length * per, y: it.y });
    }
    return out;
  }

  /* Raggruppa le parole in righe (stessa altezza, tolleranza 2,5 pt). */
  function rows(ws) {
    const sorted = ws.slice().sort((a, b) => a.y - b.y || a.x - b.x);
    const out = [];
    for (const w of sorted) {
      const r = out.length ? out[out.length - 1] : null;
      if (r && Math.abs(w.y - r.y) <= 2.5) r.t.push(w); else out.push({ y: w.y, t: [w] });
    }
    for (const r of out) r.t.sort((a, b) => a.x - b.x);
    return out;
  }

  /* Codice voce della riga: primo token, oppure secondo se il primo è la lettera di assoggettamento (A/B/C). */
  function codiceRiga(r) {
    const t = r.t; if (!t.length) return null;
    if (/^[ABC]$/.test(t[0].s) && t[1] && RE_CODICE.test(t[1].s) && /\d/.test(t[1].s)) return t[1].s;
    return RE_CODICE.test(t[0].s) && /\d/.test(t[0].s) ? t[0].s : null;
  }

  /* Cerca un'intestazione di più parole consecutive nella riga; restituisce il centro orizzontale. */
  function centroFrase(t, frase) {
    const parole = frase.toLowerCase().split(/\s+/);
    for (let i = 0; i + parole.length <= t.length; i++) {
      if (parole.every((p, j) => t[i + j].s.toLowerCase().includes(p))) {
        const a = t[i], b = t[i + parole.length - 1];
        return (a.x + b.x + b.w) / 2;
      }
    }
    return null;
  }

  /* Centri delle colonne numeriche, letti dalla riga di intestazione che ne contiene di più. */
  function colonne(rs, spec) {
    let best = null, nBest = 0;
    for (const r of rs) {
      const c = {}; let n = 0;
      for (const k in spec) { const x = centroFrase(r.t, spec[k]); if (x != null) { c[k] = x; n++; } }
      if (n > nBest) { best = c; nBest = n; }
    }
    return nBest >= 2 ? best : null;
  }

  function colonnaDi(tok, col) {
    let best = null, d = Infinity;
    for (const k in col) { const dd = Math.abs(cx(tok) - col[k]); if (dd < d) { d = dd; best = k; } }
    return best;
  }

  /* Righe della voce: la riga col codice più le righe di continuazione "***". */
  function blocco(rs, codice) {
    const i = rs.findIndex((r) => codiceRiga(r) === codice);
    if (i < 0) return null;
    const out = [rs[i]];
    for (let j = i + 1; j < rs.length && j <= i + 3; j++) { if (rs[j].t[0] && rs[j].t[0].s === '***') out.push(rs[j]); else break; }
    return out;
  }

  /* Legge un campo seguendo il profilo: voce → riga → colonna. */
  function leggiCampo(rs, col, spec) {
    const b = blocco(rs, spec.voce); if (!b) return null;
    let righe = b;
    if (spec.riga) {
      const t = norm(spec.riga), giuste = b.filter((r) => testoRiga(r).includes(t));
      righe = giuste.length ? giuste : b;
    }
    for (const r of righe) {
      const imp = r.t.filter(isImporto);
      if (!imp.length) continue;
      let tok = null;
      if (col) for (const c of spec.colonne || []) { tok = imp.find((w) => colonnaDi(w, col) === c); if (tok) break; }
      else if (spec.senzaIntestazioni === 'primo') tok = imp.find((w) => !/-$/.test(w.s));
      else if (spec.senzaIntestazioni === 'ultimo') tok = imp[imp.length - 1];
      if (!tok) continue;
      const perc = r.t.find((w) => RE_PERC.test(w.s) && w.x < tok.x);
      return { valore: toNum(tok.s), perc: perc ? toNum(perc.s) : null };
    }
    return null;
  }

  /* Mese e anno di competenza: due token "MM" e "AAAA" vicini, sotto l'etichetta del profilo. */
  function periodo(rs, etichetta) {
    const hi = rs.findIndex((r) => r.t.some((w) => w.s === etichetta));
    const cand = hi >= 0 ? rs.slice(hi, hi + 4) : rs;
    const hx = hi >= 0 ? rs[hi].t.find((w) => w.s === etichetta).x : null;
    let best = null;
    for (const r of cand) {
      for (let i = 0; i < r.t.length - 1; i++) {
        const a = r.t[i], b = r.t[i + 1];
        if (/^(0[1-9]|1[0-4])$/.test(a.s) && /^20\d{2}$/.test(b.s) && b.x - (a.x + a.w) < 50) {
          const d = hx == null ? 0 : Math.abs(a.x - hx);
          if (!best || d < best.d) best = { m: Number(a.s), y: Number(b.s), d };
        }
      }
      if (best && hi >= 0) break;
    }
    return best ? { m: best.m, y: best.y } : null;
  }

  /* Sceglie il profilo il cui testo di riconoscimento compare di più nel PDF. */
  function scegliProfilo(pages, profili) {
    const testo = norm(pages.map((p) => p.map((it) => it.s).join(' ')).join(' '));
    let best = null, punti = -1;
    for (const p of profili) {
      const n = (p.riconoscimento || []).filter((s) => testo.includes(norm(s))).length;
      if (n > punti) { best = p; punti = n; }
    }
    return best ? { p: best, certo: punti === (best.riconoscimento || []).length, punti } : null;
  }

  /* pages: [[{s, x, y, w}]] con y dall'alto verso il basso. */
  function parse(pages, profili) {
    const res = { profilo: null, mese: null, mensilita: null, imponibile: null, azienda: null, volontario: null, tfr: null, perc: {}, controlli: [], avvisi: [] };
    const sc = scegliProfilo(pages, profili || profiliDisponibili());
    if (!sc) { res.avvisi.push('Nessun modello di busta paga configurato.'); return res; }
    const P = sc.p;
    res.profilo = { id: P.id, nome: P.nome, certo: sc.certo };
    if (!sc.punti) res.avvisi.push('Modello di busta paga non riconosciuto: provo a leggerla come "' + P.nome + '". Controlla bene i valori.');
    for (const items of pages) {
      const rs = rows(words(items)), col = colonne(rs, P.colonne || {});
      if (!res.mese && !res.mensilita) {
        const p = periodo(rs, P.periodo || 'COMPETENZA');
        if (p) { if (p.m > 12) res.mensilita = { n: p.m, y: p.y }; else res.mese = p.y + '-' + String(p.m).padStart(2, '0'); }
      }
      for (const c of CAMPI) {
        if (res[c] != null || !P.campi[c]) continue;
        const v = leggiCampo(rs, col, P.campi[c]);
        if (v) { res[c] = v.valore; if (v.perc != null) res.perc[c] = v.perc; }
      }
    }
    // Controllo interno: la percentuale stampata in busta torna con l'importo?
    for (const c of ['azienda', 'volontario']) {
      const p = res.perc[c];
      if (res[c] == null || res.imponibile == null || p == null) continue;
      const atteso = Math.round(res.imponibile * p) / 100;
      if (Math.abs(atteso - res[c]) <= 0.02) res.controlli.push(NOMI[c].charAt(0).toUpperCase() + NOMI[c].slice(1) + ' verificato: ' + percTxt(p) + ' dell\'imponibile.');
      else res.avvisi.push('Il ' + NOMI[c] + ' letto non torna con il ' + percTxt(p) + ' dell\'imponibile: ricontrolla il valore.');
    }
    for (const c of CAMPI) if (P.campi[c] && res[c] == null) res.avvisi.push(NOMI[c].charAt(0).toUpperCase() + NOMI[c].slice(1) + ' (voce ' + P.campi[c].voce + ') non letto.');
    if (!res.mese && !res.mensilita) res.avvisi.push('Mese di competenza non trovato.');
    return res;
  }

  /* ---------- Browser: pdf.js ---------- */
  let libPromise = null;
  function loadLib(base) {
    if (root.pdfjsLib) return Promise.resolve(root.pdfjsLib);
    if (!libPromise) libPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = base + 'pdf.min.js';
      s.onload = () => { if (!root.pdfjsLib) return reject(new Error('lib')); root.pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js'; resolve(root.pdfjsLib); };
      s.onerror = () => { libPromise = null; reject(new Error('Impossibile caricare il lettore PDF. Apri l\'app una volta con internet.')); };
      document.head.appendChild(s);
    });
    return libPromise;
  }

  /* askPassword(retry) -> Promise<string|null> */
  /* Legge il testo di un PDF (max 8 pagine) come elementi posizionati, pagina per pagina.
     Usato per la busta paga e per il prospetto annuale del fondo. Il file non viene conservato. */
  async function readPages(file, opts, maxPages) {
    const o = opts || {};
    const lib = await loadLib(o.base || 'vendor/pdfjs/');
    const buf = new Uint8Array(await file.arrayBuffer());
    // isEvalSupported:false = nessun codice generato dal contenuto del PDF (mitigazione consigliata da Mozilla).
    const task = lib.getDocument({ data: buf, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, enableXfa: false });
    task.onPassword = (cb, reason) => {
      const retry = reason === lib.PasswordResponses.INCORRECT_PASSWORD;
      Promise.resolve(o.askPassword ? o.askPassword(retry) : null).then((p) => { if (p == null) task.destroy(); else cb(p); });
    };
    let doc;
    try { doc = await task.promise; } catch (e) {
      if (e && e.name === 'PasswordException') throw new Error('PDF protetto: password non inserita o errata.');
      throw new Error('Il file non sembra un PDF leggibile.');
    }
    try {
      const pages = [];
      for (let p = 1; p <= Math.min(doc.numPages, maxPages || 6); p++) {
        const page = await doc.getPage(p);
        const h = page.getViewport({ scale: 1 }).height;
        const tc = await page.getTextContent();
        pages.push(tc.items.filter((it) => it.str).map((it) => ({ s: it.str, x: it.transform[4], y: h - it.transform[5], w: it.width })));
      }
      if (!pages.some((p) => p.length)) throw new Error('Nel PDF non c\'è testo: sembra una scansione o una foto.');
      return pages;
    } finally { doc.destroy(); }
  }

  async function readPdf(file, opts) { return parse(await readPages(file, opts, 6)); }

  /* Testo semplice del PDF: righe ricostruite dalla posizione, pagine separate da a capo. */
  async function readText(file, opts) {
    const pages = await readPages(file, opts, 8);
    return pages.map((items) => rows(words(items)).map((r) => r.t.map((w) => w.s).join(' ')).join('\n')).join('\n');
  }

  const api = { parse, readPdf, readText, profili: profiliDisponibili };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.QuotaBusta = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
