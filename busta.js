/* Quota – lettura della busta paga in PDF.
   Tutto avviene nel telefono: il PDF non viene caricato da nessuna parte né conservato.
   La lettura del testo usa pdf.js (Mozilla, licenza Apache 2.0) in vendor/pdfjs/, caricato solo quando serve.

   Tarato sul cedolino Inaz (Stampe.net):
   - Imponibile = colonna "Dato Base" della voce 721 (Ctr.Filcoop, riga "*** c/Azienda")
   - TFR        = colonna "Dato Base" della voce 786 (Smobil.% su Tfr)
   - Mese       = "MESE E PERIODO COMPETENZA"
   Nel codice ci sono solo etichette e codici voce, mai dati personali. */
(function (root) {
  'use strict';

  const VOCI = { imponibile: '721', tfr: '786' };
  const RE_IMPORTO = /^\d{1,3}(?:\.\d{3})*,\d{2}-?$|^\d+,\d{2}-?$/;
  const RE_PERC = /^\d+,\d{3,5}$/;
  const RE_CODICE = /^[0-9A-Z]{3,5}$/;

  const toNum = (s) => Number(String(s).replace(/-$/, '').replace(/\./g, '').replace(',', '.'));
  const isImporto = (t) => RE_IMPORTO.test(t.s);
  const cx = (t) => t.x + t.w / 2;

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

  /* Centri orizzontali delle colonne numeriche, letti dall'intestazione della tabella. */
  function colonne(rs) {
    for (const r of rs) {
      const t = r.t, i = t.findIndex((w, j) => w.s === 'Dato' && t[j + 1] && t[j + 1].s === 'Base');
      if (i < 0) continue;
      const c = { base: (t[i].x + t[i + 1].x + t[i + 1].w) / 2 };
      const f = t.findIndex((w, j) => w.s === 'Dato' && t[j + 1] && t[j + 1].s === 'Figurativo');
      if (f >= 0) c.fig = (t[f].x + t[f + 1].x + t[f + 1].w) / 2;
      const k = t.find((w) => /^Competenze/.test(w.s)); if (k) c.comp = cx(k);
      return c;
    }
    return null;
  }

  function colonnaDi(tok, col) {
    if (!col) return null;
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

  /* Legge una voce: Dato Base (preferendo la riga "c/Azienda"), percentuale e importo per il controllo. */
  function voce(rs, codice, col, preferisci) {
    const b = blocco(rs, codice); if (!b) return null;
    const ordinati = preferisci ? b.slice().sort((r1, r2) => (r2.t.some((w) => preferisci.test(w.s)) ? 1 : 0) - (r1.t.some((w) => preferisci.test(w.s)) ? 1 : 0)) : b;
    for (const r of ordinati) {
      const imp = r.t.filter(isImporto);
      if (!imp.length) continue;
      let base = col ? imp.find((w) => colonnaDi(w, col) === 'base') : null;
      if (!base) base = imp.find((w) => !/-$/.test(w.s)); // senza intestazioni: primo importo senza segno
      if (!base) continue;
      const perc = r.t.find((w) => RE_PERC.test(w.s) && w.x < base.x);
      const altro = imp.find((w) => w !== base);
      return { valore: toNum(base.s), perc: perc ? toNum(perc.s) : null, importo: altro ? toNum(altro.s) : null };
    }
    return null;
  }

  /* Mese e anno di competenza: due token "MM" e "AAAA" vicini, sotto "PERIODO COMPETENZA". */
  function periodo(rs) {
    const hi = rs.findIndex((r) => r.t.some((w) => w.s === 'COMPETENZA'));
    const cand = hi >= 0 ? rs.slice(hi, hi + 4) : rs;
    const hx = hi >= 0 ? rs[hi].t.find((w) => w.s === 'COMPETENZA').x : null;
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

  /* pages: [[{s, x, y, w}]] con y dall'alto verso il basso. */
  function parse(pages) {
    const res = { mese: null, mensilita: null, imponibile: null, tfr: null, controlli: [], avvisi: [] };
    for (const items of pages) {
      const rs = rows(words(items)), col = colonne(rs);
      if (!res.mese && !res.mensilita) {
        const p = periodo(rs);
        if (p) { if (p.m > 12) res.mensilita = { n: p.m, y: p.y }; else res.mese = p.y + '-' + String(p.m).padStart(2, '0'); }
      }
      if (res.imponibile == null) {
        const v = voce(rs, VOCI.imponibile, col, /c\/Azienda/);
        if (v) {
          res.imponibile = v.valore;
          if (v.perc != null && v.importo != null) {
            const atteso = Math.round(v.valore * v.perc) / 100;
            if (Math.abs(atteso - v.importo) <= 0.02) res.controlli.push('Imponibile verificato: ' + String(v.perc).replace('.', ',') + '% = contributo azienda in busta.');
            else res.avvisi.push('L\'imponibile letto non torna con il contributo azienda in busta: ricontrolla il valore.');
          }
        }
      }
      if (res.tfr == null) {
        const v = voce(rs, VOCI.tfr, col);
        if (v) {
          res.tfr = v.valore;
          if (v.importo != null && Math.abs(v.importo - v.valore) > 0.01 && v.perc === 100) res.avvisi.push('Il TFR letto non coincide con l\'importo della voce ' + VOCI.tfr + ': ricontrolla il valore.');
        }
      }
    }
    if (res.imponibile == null) res.avvisi.push('Voce ' + VOCI.imponibile + ' (imponibile) non trovata.');
    if (res.tfr == null) res.avvisi.push('Voce ' + VOCI.tfr + ' (TFR al fondo) non trovata.');
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
  async function readPdf(file, opts) {
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
      for (let p = 1; p <= Math.min(doc.numPages, 6); p++) {
        const page = await doc.getPage(p);
        const h = page.getViewport({ scale: 1 }).height;
        const tc = await page.getTextContent();
        pages.push(tc.items.filter((it) => it.str).map((it) => ({ s: it.str, x: it.transform[4], y: h - it.transform[5], w: it.width })));
      }
      if (!pages.some((p) => p.length)) throw new Error('Nel PDF non c\'è testo: sembra una scansione o una foto.');
      return parse(pages);
    } finally { doc.destroy(); }
  }

  const api = { parse, readPdf, VOCI };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.QuotaBusta = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
