// Quota – introduzione alla prima apertura e guida completa (in cima alle Impostazioni).
// Le illustrazioni sono SVG disegnati qui: pochi KB in tutto, seguono chiaro/scuro e non contengono dati personali.
// Usa funzioni e stato di app.js (data, ui, render, …), chiamati solo dopo il suo caricamento.

const INTRO_VER = 1; // aumentare per far rivedere l'introduzione a tutti dopo cambi importanti

/* ======================= Illustrazioni ======================= */
const svg = (inner, h = 150) => `<svg class="ill" viewBox="0 0 280 ${h}" aria-hidden="true" focusable="false">${inner}</svg>`;
const ICO_OK = '<path d="M-5 0l3.5 3.5L5-4" class="s-white" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
const ICO_PLUS = '<path d="M0-5v10M-5 0h10" class="s-white" stroke-width="2.4" stroke-linecap="round"/>';
const ICO_NO = '<path d="M-4-4l8 8M4-4l-8 8" class="s-white" stroke-width="2.4" stroke-linecap="round"/>';
const phone = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" class="f-card s-line" stroke-width="2"/><rect x="${x + w / 2 - 14}" y="${y + 7}" width="28" height="6" rx="3" class="f-track"/>`;

const ILL = {
  benvenuto: svg(`
    <circle cx="140" cy="78" r="70" class="f-soft"/>
    ${phone(92, 10, 96, 136)}
    <rect x="100" y="24" width="80" height="62" rx="12" class="f-hero"/>
    <rect x="107" y="31" width="34" height="5" rx="2.5" class="f-hero2"/>
    <rect x="107" y="40" width="48" height="9" rx="3" class="f-white"/>
    <polyline points="107,76 118,70 128,73 139,62 150,64 161,52 173,46" fill="none" class="s-mint" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="173" cy="46" r="3.5" class="f-mint"/>
    <rect x="100" y="94" width="80" height="20" rx="8" class="f-track"/><rect x="106" y="101" width="30" height="6" rx="3" class="f-muted"/>
    <rect x="100" y="120" width="38" height="18" rx="8" class="f-track"/><rect x="142" y="120" width="38" height="18" rx="8" class="f-track"/>
    <circle cx="52" cy="46" r="15" class="f-az"/><text x="52" y="51" text-anchor="middle" class="t-coin">€</text>
    <circle cx="226" cy="104" r="13" class="f-tfr"/><text x="226" y="109" text-anchor="middle" class="t-coin">€</text>
    <circle cx="232" cy="38" r="9" class="f-vol"/>`),

  privacy: svg(`
    <circle cx="140" cy="78" r="70" class="f-soft"/>
    ${phone(100, 12, 80, 128)}
    <path d="M140 42l24 9v18c0 15-10 26-24 31-14-5-24-16-24-31V51z" class="f-acc"/>
    <rect x="130" y="66" width="20" height="16" rx="3" class="f-white"/><path d="M134 66v-5a6 6 0 0 1 12 0v5" fill="none" class="s-white" stroke-width="2.6"/>
    <g transform="translate(46 52)"><rect x="-18" y="-22" width="36" height="46" rx="5" class="f-card s-line" stroke-width="2"/><text x="0" y="4" text-anchor="middle" class="t-small">PDF</text>
      <g transform="translate(14 -18)"><circle r="10" class="f-bad"/>${ICO_NO}</g></g>
    <g transform="translate(234 52)"><path d="M-20 10a10 10 0 0 1 2-20 14 14 0 0 1 26-2 10 10 0 0 1 12 22z" class="f-card s-line" stroke-width="2"/>
      <g transform="translate(14 -18)"><circle r="10" class="f-bad"/>${ICO_NO}</g></g>
    <g transform="translate(46 116)"><circle r="14" class="f-card s-line" stroke-width="2"/><circle cy="-3" r="4.5" class="f-muted"/><path d="M-8 9a8 7 0 0 1 16 0" class="f-muted"/>
      <g transform="translate(12 -12)"><circle r="9" class="f-bad"/>${ICO_NO}</g></g>
    <g transform="translate(234 116)"><circle r="14" class="f-ok"/>${ICO_OK}</g>`),

  fonti: svg(`
    <g transform="translate(18 26)"><rect width="78" height="98" rx="8" class="f-card s-line" stroke-width="2"/>
      <rect x="10" y="12" width="40" height="6" rx="3" class="f-muted"/>
      ${[30, 44, 58, 72].map((y, i) => `<rect x="10" y="${y}" width="36" height="5" rx="2.5" class="f-track"/><rect x="52" y="${y}" width="16" height="5" rx="2.5" class="${['f-acc', 'f-az', 'f-vol', 'f-tfr'][i]}"/>`).join('')}
      <text x="39" y="92" text-anchor="middle" class="t-small">Busta paga</text></g>
    <g transform="translate(184 26)"><rect width="78" height="98" rx="8" class="f-card s-line" stroke-width="2"/>
      <path d="M0 8a8 8 0 0 1 8-8h62a8 8 0 0 1 8 8v8H0z" class="f-track"/><circle cx="9" cy="8" r="2.5" class="f-bad"/><circle cx="17" cy="8" r="2.5" class="f-az"/><circle cx="25" cy="8" r="2.5" class="f-ok"/>
      <text x="10" y="36" class="t-tiny">Quote</text><rect x="10" y="40" width="50" height="7" rx="3" class="f-acc"/>
      <text x="10" y="60" class="t-tiny">Valore quota</text><rect x="10" y="64" width="38" height="7" rx="3" class="f-acc"/>
      <text x="39" y="92" text-anchor="middle" class="t-small">Sito del fondo</text></g>
    <path d="M100 75h26M154 75h26" class="s-acc" stroke-width="2.6" stroke-dasharray="2 6" stroke-linecap="round"/>
    <path d="M122 70l6 5-6 5M158 70l-6 5 6 5" fill="none" class="s-acc" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="128" y="50" width="24" height="50" rx="6" class="f-acc"/><rect x="134" y="56" width="12" height="3" rx="1.5" class="f-white"/>`),

  stato: svg(`
    ${[['f-ok', 'Aggiornato', ICO_OK, 'Mese completo'], ['f-warn', 'Inserisci', ICO_PLUS, 'Manca un dato'], ['f-bad', 'Inserisci', ICO_PLUS, 'Mancano entrambi']].map((r, i) => `
      <g transform="translate(10 ${18 + i * 42})"><rect width="260" height="34" rx="17" class="f-card s-line" stroke-width="1.5"/>
        <rect x="5" y="5" width="108" height="24" rx="12" class="${r[0]}"/><g transform="translate(20 17)">${r[2]}</g>
        <text x="71" y="21.5" text-anchor="middle" class="t-pill">${r[1]}</text><text x="123" y="21.5" class="t-row">${r[3]}</text></g>`).join('')}`),

  impostazioni: svg(`
    <circle cx="140" cy="78" r="70" class="f-soft"/>
    <g transform="translate(60 30)"><rect width="160" height="96" rx="16" class="f-card s-line" stroke-width="2"/>
      ${[22, 48, 74].map((y, i) => `<rect x="18" y="${y - 3}" width="124" height="6" rx="3" class="f-track"/><rect x="18" y="${y - 3}" width="${[90, 40, 70][i]}" height="6" rx="3" class="f-acc"/><circle cx="${18 + [90, 40, 70][i]}" cy="${y}" r="8" class="f-white s-line" stroke-width="2"/>`).join('')}</g>`),

  promemoria: svg(`
    <circle cx="140" cy="78" r="70" class="f-soft"/>
    <g transform="translate(36 22)"><rect width="208" height="50" rx="14" class="f-card s-line" stroke-width="1.5"/>
      <rect x="12" y="12" width="26" height="26" rx="7" class="f-acc"/><path d="M19 30h12M21 30v-6a4 4 0 0 1 8 0v6M24 33h2" class="s-white" fill="none" stroke-width="2" stroke-linecap="round"/>
      <rect x="48" y="14" width="70" height="6" rx="3" class="f-muted"/><rect x="48" y="28" width="130" height="5" rx="2.5" class="f-track"/></g>
    <g transform="translate(140 112)"><rect x="-58" y="-22" width="116" height="44" rx="22" class="f-hero"/>
      <path d="M-30 0s7-12 18-12S6 0 6 0s-7 12-18 12S-30 0-30 0z" fill="none" class="s-mint" stroke-width="2.4"/><circle cx="-12" r="4.5" class="f-mint"/>
      <text x="12" y="5" class="t-dark">€ •••••</text></g>`),

  pronto: svg(`
    <circle cx="140" cy="76" r="56" class="f-acc"/>
    <path d="M116 77l16 16 32-34" fill="none" class="s-white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    ${[[50, 40, 'f-az'], [222, 34, 'f-vol'], [64, 118, 'f-tfr'], [216, 116, 'f-mint'], [34, 82, 'f-mint'], [246, 76, 'f-az']].map((c, i) => `<rect x="${c[0]}" y="${c[1]}" width="${8 + (i % 2) * 4}" height="${8 + (i % 2) * 4}" rx="2" transform="rotate(${i * 24} ${c[0]} ${c[1]})" class="${c[2]}"/>`).join('')}`),

  installa: svg(`
    <circle cx="140" cy="78" r="70" class="f-soft"/>
    ${phone(34, 14, 92, 128)}
    <rect x="42" y="26" width="76" height="80" rx="8" class="f-track"/>
    <rect x="42" y="112" width="76" height="22" rx="11" class="f-track"/>
    <g transform="translate(80 123)"><circle r="14" class="f-acc"/><path d="M0 4V-6M-4-2l4-4 4 4M-5 0v6h10V0" fill="none" class="s-white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
    <path d="M136 78h22" class="s-acc" stroke-width="2.6" stroke-dasharray="2 6" stroke-linecap="round"/><path d="M152 72l7 6-7 6" fill="none" class="s-acc" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    ${phone(166, 14, 92, 128)}
    ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => (r === 1 && c === 1) ? '' : `<rect x="${178 + c * 24}" y="${32 + r * 26}" width="18" height="18" rx="5" class="f-track"/>`).join('')).join('')}
    <g transform="translate(212 67)"><rect x="-17" y="-17" width="34" height="34" rx="9" class="f-hero"/><polyline points="-10,8 -4,2 1,5 10,-7" fill="none" class="s-mint" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="17" cy="-17" r="8" class="f-ok"/><g transform="translate(17 -17) scale(.75)">${ICO_OK}</g></g>
    <text x="212" y="98" text-anchor="middle" class="t-small">Quota</text>`),

  anni: svg(`
    <g transform="translate(40 18)"><rect width="200" height="116" rx="16" class="f-card s-line" stroke-width="2"/>
      <path d="M0 16a16 16 0 0 1 16-16h168a16 16 0 0 1 16 16v14H0z" class="f-acc"/><text x="100" y="21" text-anchor="middle" class="t-pill">2026</text>
      ${Array.from({ length: 12 }, (_, i) => { const h = [30, 32, 31, 46, 33, 34, 48, 35, 36, 50, 37, 38][i]; return `<rect x="${16 + i * 14.5}" y="${104 - h}" width="9" height="${h}" rx="3" class="${(i + 1) % 3 === 0 ? 'f-az' : 'f-tfr'}"/>`; }).join('')}</g>`),

  pensione: svg(`
    <g transform="translate(30 16)"><rect width="220" height="120" rx="16" class="f-hero"/>
      <path d="M18 100 C80 96 120 78 202 24" fill="none" class="s-mint" stroke-width="3" stroke-linecap="round"/>
      <path d="M18 100 C80 98 130 88 202 58" fill="none" class="s-hero2" stroke-width="2.4" stroke-dasharray="4 5" stroke-linecap="round"/>
      <circle cx="202" cy="24" r="5" class="f-mint"/><rect x="18" y="16" width="70" height="8" rx="4" class="f-hero2"/><rect x="18" y="30" width="46" height="6" rx="3" class="f-hero2"/></g>`),

  backup: svg(`
    ${phone(40, 18, 70, 116)}
    <g transform="translate(75 78)"><rect x="-18" y="-22" width="36" height="44" rx="5" class="f-soft"/><text x="0" y="5" text-anchor="middle" class="t-small">JSON</text></g>
    <path d="M122 76h40" class="s-acc" stroke-width="2.6" stroke-dasharray="2 6" stroke-linecap="round"/><path d="M156 70l7 6-7 6" fill="none" class="s-acc" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <g transform="translate(212 76)"><path d="M-40 18a18 18 0 0 1 4-36 26 26 0 0 1 48-4 18 18 0 0 1 22 40z" class="f-card s-line" stroke-width="2"/>
      <path d="M-14 2h28v14h-28z M-14 2l4-5h8l3 5" class="f-acc"/></g>`),

  confronto: svg(`
    <g transform="translate(46 20)">${[['f-acc', 104, 'Fondo'], ['f-alt', 66, 'TFR'], ['f-alt', 78, 'Aperti'], ['f-alt', 70, 'PIP']].map((b, i) => `
      <rect x="${i * 50}" y="${112 - b[1]}" width="36" height="${b[1]}" rx="8" class="${b[0]}"/><text x="${i * 50 + 18}" y="126" text-anchor="middle" class="t-tiny">${b[2]}</text>`).join('')}</g>`)
};

/* ======================= Contenuti condivisi ======================= */
// Cosa Quota salva e cosa no: stessa lista nell'introduzione e nella guida.
function datiSalvatiHTML() {
  const li = (ok, t) => `<li class="${ok ? 'si' : 'no'}"><span class="mk" aria-hidden="true">${ok ? '✓' : '✕'}</span><span>${t}</span></li>`;
  return `<div class="gl-title">Salva, solo su questo telefono</div><ul class="gl">
      ${li(1, 'Dalla busta paga: mese, imponibile, contributo tuo e dell\'azienda, TFR')}
      ${li(1, 'Dal sito del fondo: numero quote, valore quota, totale versato')}
      ${li(1, 'Comparti, aliquote, giorno di paga, scaglione IRPEF, versamenti fuori busta')}
      ${li(1, 'Se li aggiungi: mese di nascita e i numeri del prospetto annuale')}
    </ul>
    <div class="gl-title">Non salva e non invia</div><ul class="gl">
      ${li(0, 'I PDF di busta paga e prospetto: li legge e li dimentica')}
      ${li(0, 'Nome, codice fiscale, IBAN, indirizzo o altri dati della busta')}
      ${li(0, 'Le credenziali dell\'area riservata: il sito si apre in Safari, Quota non vi accede')}
      ${li(0, 'Nessun account, nessun server, nessuna statistica d\'uso')}
    </ul>`;
}

function comandiHTML() {
  return `<ol class="gsteps">
    <li>Apri l'app <b>Comandi</b> › Automazione › Nuova automazione › <b>Ora del giorno</b>.</li>
    <li>Scegli <b>Mensilmente</b>, il giorno di paga (${data ? giornoPaga() : 1}) e un orario.</li>
    <li>Seleziona <b>Esegui immediatamente</b> e attiva <b>Notifica quando eseguito</b>.</li>
    <li>Come azione aggiungi <b>Apri URL</b> con l'indirizzo dell'app: <span class="num" style="word-break:break-all">${esc(location.origin + location.pathname)}</span></li>
    <li>Ripeti per l'ultimo giorno del mese, quando il fondo pubblica il valore quota.</li></ol>
    <p>La notifica arriva sempre quel giorno, anche se è festivo. Il pulsante Inserisci invece considera la busta arrivata dal primo giorno feriale.</p>`;
}

/* ======================= Introduzione ======================= */
function introSteps() {
  const nuovo = !data;
  // Nel browser: si consiglia di installarla, ma si può continuare (con i rischi spiegati).
  const safariIOS = isIOS() && !isStandalone();
  const s = [
    { id: 'benvenuto', ill: ILL.benvenuto, t: 'Benvenuto in Quota', c: 1,
      b: `<p>Quota tiene d'occhio la tua previdenza complementare. Ogni mese inserisci due dati e vedi quanto vale la posizione, quanto rende e quanto ti ha dato in più rispetto al TFR lasciato in azienda.</p>
          <p>Ci vogliono due minuti al mese. Questa introduzione ne dura uno.</p>` },
  ];
  if (!isStandalone()) s.push({ id: 'installa', ill: ILL.installa, t: 'Salva Quota sul telefono', b: installaHTML(safariIOS) });
  s.push(
    { id: 'privacy', ill: ILL.privacy, t: 'I tuoi dati restano qui', b: datiSalvatiHTML() + '<p class="small">Cancellare l\'icona dalla Home cancella anche i dati: ogni tanto esporta un backup da Impostazioni.</p>' },
    { id: 'fonti', ill: ILL.fonti, t: 'Ogni mese, due fonti',
      b: `<ol class="gsteps">
          <li><b>Busta paga.</b> Carica il PDF con <b>Leggi dalla busta paga</b>: Quota trova da sola mese, imponibile, contributi e TFR. Se il PDF non viene letto, li scrivi a mano.</li>
          <li><b>Sito del fondo.</b> Dall'area riservata copi numero quote, valore quota e totale versato.</li></ol>
          <p class="small">Inserisci i dati del fondo ogni mese: il sito mostra solo la situazione di oggi e i mesi passati non si recuperano più.</p>` },
    { id: 'stato', ill: ILL.stato, t: 'Il pulsante Inserisci',
      b: `<p>In Panoramica e in Anni, accanto al titolo, il pulsante ti dice a che punto sei:</p>
          <ul class="gl"><li class="dotli"><span class="cdot ok"></span><span><b>Verde</b>: il mese è completo.</span></li>
          <li class="dotli"><span class="cdot warn"></span><span><b>Arancione</b>: manca la busta paga o il dato del fondo.</span></li>
          <li class="dotli"><span class="cdot bad"></span><span><b>Rosso</b>: mancano entrambi.</span></li></ul>
          <p class="small">Toccalo per andare all'inserimento: in cima trovi scritto cosa manca.</p>` });
  const promemoria = { id: 'promemoria', ill: ILL.promemoria, t: 'Promemoria e privacy',
    b: `<ul class="gl"><li class="dotli"><span class="cdot acc"></span><span><b>Promemoria.</b> Le web app non mandano notifiche da sole: in Impostazioni › Promemoria trovi come farle arrivare con Comandi Rapidi.</span></li>
        <li class="dotli"><span class="cdot acc"></span><span><b>Modalità privata.</b> Il pulsante a occhio in Panoramica nasconde gli importi e mostra le percentuali, per far vedere l'app senza far vedere quanto hai.</span></li>
        <li class="dotli"><span class="cdot acc"></span><span><b>Backup.</b> Impostazioni › Esporta backup, da salvare in File › iCloud Drive. Serve anche per cambiare telefono.</span></li></ul>` };
  s.push(promemoria);
  if (nuovo) {
    s.push({ id: 'backup', ill: ILL.backup, t: 'Hai già un backup?', c: 1,
      b: `<p>Se hai usato Quota su un altro telefono, o l'hai reinstallata, importa il file <b>quota-backup</b> da File: ritrovi storico e impostazioni e sei pronto.</p>
          <p>Se è la prima volta, imposta l'app in un passo.</p>` });
    s.push({ id: 'setup', ill: ILL.impostazioni, t: 'Impostiamo l\'app', b: introSetupHTML() });
  } else {
    s.push({ id: 'riepilogo', ill: ILL.impostazioni, t: 'Le tue impostazioni', b: introRiepilogoHTML() });
    s.push({ id: 'pronto', ill: ILL.pronto, t: 'Tutto qui', c: 1,
      b: '<p>Puoi rivedere questa introduzione quando vuoi. In Impostazioni trovi anche la guida completa, schermata per schermata.</p>' });
  }
  return s;
}

function installaHTML(safariIOS) {
  const ios = `<ol class="gsteps">
      <li>Tocca <b>Condividi</b>, il quadrato con la freccia in su. Nel Safari nuovo lo trovi anche nel menu <b>⋯</b> accanto all'indirizzo.</li>
      <li>Scorri e scegli <b>Aggiungi alla schermata Home</b>.</li>
      <li>Lascia attivo <b>Apri come app web</b> e tocca <b>Aggiungi</b>.</li>
      <li>Apri Quota dall'icona sulla Home: l'introduzione riparte da lì.</li></ol>`;
  const android = `<ol class="gsteps"><li>Tocca il menu <b>⋮</b> in alto a destra.</li><li>Scegli <b>Installa app</b> o <b>Aggiungi a schermata Home</b>, poi apri Quota dall'icona.</li></ol>`;
  const rischi = safariIOS ? [
    '<b>Dopo 7 giorni</b> in cui usi Safari senza aprire Quota, iOS può cancellare tutti i dati inseriti. È una regola di privacy di Safari: l\'app sulla Home non ce l\'ha.',
    'Cancellando cronologia e dati dei siti di Safari si cancella anche Quota. In navigazione privata non resta niente.',
    'Se la installi più avanti, i dati non passano da soli: l\'app sulla Home ha una memoria separata. Ti servirà esportare un backup e importarlo lì.',
    'Niente schermo intero: resta la barra di Safari.'
  ] : [
    'Cancellando i dati di navigazione del browser si cancella anche Quota. In navigazione in incognito non resta niente.',
    'Se il telefono ha poco spazio, il browser può liberarlo cancellando i dati dei siti.',
    'Niente schermo intero: resta la barra del browser.'
  ];
  return `<p class="small" style="margin-top:0">Così si apre a tutto schermo come un'app, funziona anche senza internet e i dati sono al sicuro.</p>
    ${safariIOS ? ios : `<h4 class="ih">iPhone, in Safari</h4>${ios}<h4 class="ih">Android, in Chrome</h4>${android}`}
    <div class="risk"><div class="risk-t">Se continui nel browser</div>
      <ul>${rischi.map((r) => `<li>${r}</li>`).join('')}</ul>
      <div class="risk-ok">Chiudere la pagina o il browser invece non cancella niente.</div></div>`;
}

function introSetupHTML() {
  const c = ui.intro.cfg;
  return `<p class="small" style="margin-top:0">Li trovi in busta paga e nel modulo di adesione. Puoi cambiarli dopo in Impostazioni.</p>
    <div class="card flush intro-form">
      <div class="field"><label for="w-comp">Comparto attuale</label><select id="w-comp" data-i="comparto">${COMPARTI.map((n) => `<option ${n === c.comparto ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="field"><label for="w-dal">Iscritto dal</label><input id="w-dal" type="month" data-i="dal" value="${esc(c.dal)}"></div>
      <div class="field"><label for="w-vol">Tuo contributo %</label><input id="w-vol" inputmode="decimal" autocomplete="off" data-i="vol" value="${esc(c.vol)}" placeholder="es. 1"></div>
      <div class="field"><label for="w-az">Azienda %</label><input id="w-az" inputmode="decimal" autocomplete="off" data-i="az" value="${esc(c.az)}" placeholder="es. 1,5"></div>
      <div class="field"><label for="w-paga">Giorno di paga</label><select id="w-paga" data-i="paga">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${String(i + 1) === String(c.paga) ? 'selected' : ''}>${i + 1} del mese</option>`).join('')}</select></div>
    </div>
    <p class="small">Le percentuali sono sull'imponibile, come in busta paga. Se non le sai, lasciale vuote: Quota le controlla quando leggi la prima busta e ti propone di aggiornarle.</p>
    <div id="intro-err"></div>`;
}

function introRiepilogoHTML() {
  const k = todayKey(), a = rateFor(k);
  const row = (l, v) => `<div class="row"><div class="row-top"><span>${l}</span><span class="num">${v}</span></div></div>`;
  return `<p class="small" style="margin-top:0">Controlla che siano giusti: da questi dipendono i calcoli.</p>
    <div class="card flush intro-form">
      ${row('Comparto', esc(compartoFor(k)))}
      ${row('Tuo contributo', pctPlain(a.volontario, 1))}
      ${row('Azienda', pctPlain(a.azienda, 1))}
      ${row('Giorno di paga', giornoPaga() + ' del mese')}
      <button type="button" class="listlink" data-act="intro-settings">Cambia in Impostazioni</button>
    </div>`;
}

function introOpen() {
  ui.intro = { step: 0, dir: 0, cfg: { comparto: 'Dinamico', dal: todayKey(), vol: '', az: '', paga: '1' } };
  ui.guida = null;
  renderGuida(true);
}
function introClose() {
  ui.intro = null; ui.introVista = INTRO_VER; savePref();
  renderGuida();
}
function introGo(n) {
  const steps = introSteps();
  if (n < 0 || n >= steps.length) return;
  ui.intro.dir = n > ui.intro.step ? 1 : -1; ui.intro.step = n;
  renderGuida(true);
}
// Crea i dati con le scelte della configurazione iniziale (al posto di "Inizia da zero").
function introStart() {
  const c = ui.intro.cfg, err = (m) => { const e = $('#intro-err'); if (e) e.innerHTML = `<div class="banner bad" style="margin-top:12px;border-radius:12px">${esc(m)}</div>`; };
  const dal = /^\d{4}-\d{2}$/.test(c.dal || '') && c.dal <= todayKey() ? c.dal : null;
  if (!dal) { introGo(introSteps().findIndex((x) => x.id === 'setup')); return err('Scegli il mese di iscrizione (non nel futuro).'); }
  const vol = String(c.vol).trim() === '' ? 0 : parseIt(c.vol), az = String(c.az).trim() === '' ? 0 : parseIt(c.az);
  if (!(vol >= 0 && vol <= 20) || !(az >= 0 && az <= 20)) { introGo(introSteps().findIndex((x) => x.id === 'setup')); return err('Le percentuali devono essere tra 0 e 20.'); }
  const d = emptyData();
  d.comparti = [{ nome: COMPARTI.includes(c.comparto) ? c.comparto : 'Dinamico', dal }];
  d.aliquote = [{ dal, volontario: vol / 100, azienda: az / 100 }];
  d.impostazioni.giornoPaga = Number(c.paga) || 1;
  data = normalize(d); persist();
  ui.tab = 'home'; ui.form = null; ui.insMonth = null;
  ui.intro = null; ui.introVista = INTRO_VER; savePref();
  render(); window.scrollTo(0, 0);
  toast('Quota è pronta: inserisci la prima busta paga');
}

function introHTML() {
  const steps = introSteps(), i = Math.min(ui.intro.step, steps.length - 1), st = steps[i], last = i === steps.length - 1;
  const dots = steps.map((_, n) => `<button type="button" class="idot" data-act="intro-dot" data-v="${n}" ${n === i ? 'aria-current="step"' : ''} aria-label="Passo ${n + 1}"></button>`).join('');
  let foot;
  if (st.id === 'backup') {
    foot = `<label class="btn primary big" for="intro-imp">Importa il backup</label>
      <input id="intro-imp" class="sr" type="file" accept=".json,application/json" data-act="import">
      <div class="btnrow" style="margin-top:10px"><button type="button" class="btn grey" data-act="intro-prev">Indietro</button>
      <button type="button" class="btn soft" data-act="intro-next">No, inizio da zero</button></div>`;
  } else if (st.id === 'setup') {
    foot = `<div class="btnrow" style="margin-top:0"><button type="button" class="btn grey" data-act="intro-prev">Indietro</button>
      <button type="button" class="btn primary" data-act="intro-start">Inizia</button></div>`;
  } else if (st.id === 'installa') {
    foot = `<button type="button" class="btn primary big" data-act="intro-safari">La salvo sulla Home</button>
      <button type="button" class="btn grey big" style="margin-top:10px" data-act="intro-next">Continua nel browser</button>`;
  } else if (last) {
    foot = '<button type="button" class="btn primary big" data-act="intro-skip">Inizia a usare Quota</button>';
  } else {
    foot = `<div class="btnrow" style="margin-top:0">${i > 0 ? '<button type="button" class="btn grey" data-act="intro-prev">Indietro</button>' : ''}
      <button type="button" class="btn primary" data-act="intro-next">${i === 0 ? 'Iniziamo' : 'Avanti'}</button></div>`;
  }
  return `<div class="intro" role="dialog" aria-modal="true" aria-labelledby="intro-t">
    <div class="intro-top"><span class="intro-count">${i + 1} di ${steps.length}</span>
      ${last ? '' : `<button type="button" class="tbtn" data-act="intro-skip">${data ? 'Chiudi' : 'Salta'}</button>`}</div>
    <div class="intro-body ${ui.intro.dir > 0 ? 'in-r' : ui.intro.dir < 0 ? 'in-l' : 'in-f'}" data-step="${st.id}">
      <div class="intro-ill">${st.ill}</div>
      <h2 id="intro-t" tabindex="-1">${st.t}</h2>
      <div class="intro-text${st.c ? ' center' : ''}">${st.b}</div>
    </div>
    <div class="intro-foot"><div class="idots" role="group" aria-label="Passi">${dots}</div>${foot}</div>
  </div>`;
}

/* ======================= Guida completa ======================= */
function guidaSezioni() {
  return [
    { id: 'primi', t: 'Primi passi', s: 'Installazione, impostazioni, il ritmo mensile', ill: ILL.benvenuto, b: `
      <h4>Installa l'app</h4><p>Apri l'indirizzo in <b>Safari</b>, tocca Condividi › <b>Aggiungi alla schermata Home</b> e da lì in poi usa sempre l'icona. I dati dell'app sulla Home e quelli di Safari sono separati.</p>
      <p class="small">Puoi usarla anche in Safari, ma lì i dati sono meno al sicuro: se per 7 giorni usi Safari senza aprire Quota, iOS può cancellarli, e si cancellano anche pulendo cronologia e dati dei siti. L'app sulla Home non ha questi limiti. Chiudere la pagina non cancella niente.</p>
      <h4>Controlla le impostazioni</h4><p>In Impostazioni verifica comparto, aliquote (tuo contributo e azienda, in % dell'imponibile), giorno di paga e scaglione IRPEF. Ogni cambio di comparto o di aliquota vale da quel mese in poi: i mesi passati restano calcolati come all'epoca.</p>
      <h4>Il ritmo</h4><ol class="gsteps"><li>Quando arriva la busta paga, caricala in Inserisci.</li><li>Dopo la fine del mese, quando il fondo ha pubblicato il valore quota, copia i dati dall'area riservata.</li><li>Ogni tanto esporta un backup.</li></ol>
      <div class="btnrow"><button type="button" class="btn soft" data-act="intro-open">Rivedi l'introduzione</button></div>` },

    { id: 'busta', t: 'Inserire la busta paga', s: 'Dal PDF o a mano, e il controllo delle aliquote', ill: ILL.fonti, b: `
      <h4>Dal PDF</h4><ol class="gsteps">
        <li>Tocca <b>Inserisci</b> in Panoramica, poi <b>Leggi dalla busta paga (PDF)</b> e scegli il file in File.</li>
        <li>Quota riconosce il mese di competenza scritto nella busta (non la data di emissione) e passa da sola a quel mese.</li>
        <li>Legge imponibile, contributo dell'azienda, tuo contributo e TFR. Il riquadro verde ti dice quale mese ha trovato.</li>
        <li>Controlla e tocca <b>Salva</b>. Finché non salvi non cambia niente.</li></ol>
      <p>Se il mese aveva già dei dati, il riquadro mostra i valori salvati: puoi usarlo anche per ricontrollare i mesi vecchi. Il PDF viene solo letto e mai conservato.</p>
      <p class="small">Funziona con i PDF con testo, non con scansioni o foto. Le buste di tredicesima e quattordicesima vengono riconosciute e non inserite in automatico. Il modello letto oggi è quello Inaz di Previdenza Cooperativa: voce 721 (imponibile e azienda), 723 (tuo contributo), 786 (TFR).</p>
      <h4>A mano</h4><p>Scrivi i valori nei campi. Se lasci vuoti i contributi, Quota li stima con le aliquote di quel mese. In grigio vedi i valori del mese prima, come suggerimento.</p>
      <h4>Controllo delle aliquote</h4><p>Accanto ai contributi compare <b>✓</b> se tornano con l'aliquota impostata, <b>≠</b> con l'importo atteso se no. Se la busta indica una percentuale nuova, il pulsante <b>Aggiorna l'aliquota da…</b> registra il cambio con un tocco.</p>` },

    { id: 'fondo', t: 'Dati dal sito del fondo', s: 'Quote, valore quota, totale versato', ill: ILL.fonti, b: `
      <ol class="gsteps"><li>In Inserisci tocca <b>Apri l'area riservata</b>: il sito si apre in Safari, fuori da Quota.</li>
        <li>Copia <b>numero quote</b>, <b>valore quota</b> e <b>totale versato</b> della tua posizione.</li>
        <li>Torna in Quota e salva. Il riquadro sotto i campi calcola il valore della posizione e ti segnala se qualcosa non torna.</li></ol>
      <p><b>Fallo ogni mese.</b> Il sito mostra solo la situazione di oggi: i dati dei mesi passati non si possono più recuperare. Per questo il pulsante Inserisci segnala come mancanti solo le buste paga dei mesi passati.</p>
      <p class="small">Il valore quota è quello dell'ultimo giorno del mese: conviene inserirlo dopo che il fondo l'ha pubblicato.</p>` },

    { id: 'inserisci', t: 'Il pulsante Inserisci', s: 'Cosa vogliono dire i colori', ill: ILL.stato, b: `
      <ul class="gl"><li class="dotli"><span class="cdot ok"></span><span><b>Verde, Aggiornato</b>: busta paga e dati del fondo del mese ci sono.</span></li>
        <li class="dotli"><span class="cdot warn"></span><span><b>Arancione</b>: manca uno dei due, oppure la busta paga di un mese precedente.</span></li>
        <li class="dotli"><span class="cdot bad"></span><span><b>Rosso</b>: mancano entrambi.</span></li></ul>
      <p>Il mese nuovo conta dal giorno di paga scelto in Impostazioni. Se cade di sabato, domenica o festivo, dal primo giorno feriale dopo. In cima alla pagina Inserisci un riquadro dice cosa manca.</p>` },

    { id: 'panoramica', t: 'Panoramica', s: 'Il grafico e le schede', ill: ILL.benvenuto, b: `
      <h4>Il grafico</h4><p>Mostra il valore della posizione. <b>Tutto</b> confronta con quanto hai versato dall'adesione; <b>12 mesi</b> mostra il rendimento del comparto senza l'effetto dei versamenti. Tocca o trascina sul grafico per vedere un mese.</p>
      <p>Sotto il grafico, <b>Com'è fatto il valore</b>: quanto del valore di oggi viene dal TFR, dall'azienda, da te e dal rendimento. Le quattro cifre sommate danno il valore della posizione. Il versato è quello già arrivato al fondo: i contributi trattenuti in busta e non ancora accreditati li trovi in Anni.</p>
      <h4>Le schede</h4><ul class="gl">
        <li class="dotli"><span class="cdot acc"></span><span><b>Ogni 1 € di tasca tua</b>: quanto è diventato ogni euro uscito davvero da te, contando contributo dell'azienda, rendimento e IRPEF risparmiata. Il TFR resta fuori, perché sarebbe tuo comunque.</span></li>
        <li class="dotli"><span class="cdot acc"></span><span><b>E se non avessi aderito?</b>: il confronto con il TFR lasciato in azienda e con fondi aperti e PIP.</span></li>
        <li class="dotli"><span class="cdot acc"></span><span><b>Comparto</b>: valore quota, costi, quanto è in azioni e in obbligazioni, il rischio rispetto agli altri comparti del fondo. Con <b>Investimenti e rendimenti</b> vedi in quali Paesi investe e il rendimento anno per anno, confrontato con il benchmark. Sono dati pubblici del fondo, aggiornati una volta l'anno.</span></li>
        <li class="dotli"><span class="cdot acc"></span><span><b>Spazio deducibile</b>: quanto puoi ancora versare nell'anno con il vantaggio fiscale. Da qui aggiungi anche un versamento fuori busta.</span></li></ul>` },

    { id: 'anni', t: 'Anni', s: 'Resoconto, trimestri, deducibilità', ill: ILL.anni, b: `
      <p>Scegli l'anno in alto. Trovi il <b>versato dell'anno</b> (tuo, azienda, TFR, totale) e i mesi uno per uno: tocca un mese per correggerlo.</p>
      <h4>Trimestri</h4><p>I contributi arrivano al fondo ogni tre mesi. Quota confronta quanto risulta dalle buste paga con quanto è arrivato davvero: "Da verificare" vuol dire che le due cifre non tornano, di solito per un dato inserito male o non ancora arrivato.</p>
      <h4>Deducibilità</h4><p>Il versato vale per il mese della busta paga, non per la data in cui arriva al fondo, come per il fisco. Confronta il totale con la Certificazione Unica.</p>
      <h4>Versamenti fuori busta</h4><p>Con <b>+ Aggiungi versamento volontario</b> registri un bonifico fatto da te. Scegli <b>Dedotto</b> se lo porti in dichiarazione, <b>Non dedotto</b> se no: in quel caso va comunicato al fondo entro il 31 dicembre dell'anno dopo, e Quota te lo ricorda finché non lo segni come comunicato.</p>
      <h4>Verifica con il prospetto</h4><p>Se hai aggiunto il prospetto annuale del fondo, Quota confronta la posizione al 31 dicembre e il versato con i tuoi dati.</p>` },

    { id: 'pensione', t: 'Pensione', s: 'La previsione e il calcolatore', ill: ILL.pensione, b: `
      <p>Una stima di quanto potresti avere al pensionamento, in euro di oggi, a partire dalla tua posizione e dalle buste paga.</p>
      <ol class="gsteps"><li>Con <b>Aggiungi dati</b> inserisci il mese di nascita: basta per una prima stima (pensione a 67 anni).</li>
        <li>Per una stima migliore leggi il <b>prospetto annuale</b> del fondo in PDF, o scrivi a mano data, posizione finale e rendita della prima pagina.</li></ol>
      <p>Vedi la rendita lorda e netta (all'anno e al mese), la rendita in % dello stipendio di oggi, <b>Sei in linea?</b> (la tua posizione reale contro le ipotesi) e il confronto con gli altri comparti, il TFR in azienda, i fondi aperti e i PIP. Con <b>E se…</b> provi a cambiare il tuo contributo.</p>
      <p class="small">Sono stime con ipotesi di rendimento, non la proiezione ufficiale e non un consiglio d'investimento. I rendimenti reali possono essere più alti o più bassi.</p>` },

    { id: 'privata', t: 'Modalità privata', s: 'Mostrare l\'app senza mostrare quanto hai', ill: ILL.promemoria, b: `
      <p>Il pulsante a <b>occhio</b> in Panoramica e in Anni nasconde gli importi: al loro posto vedi rendimento %, confronto con TFR, fondi aperti e PIP fatto 100 il tuo fondo, composizione su ogni 100 € versati, spazio deducibile in % del limite.</p>
      <p>In Pensione restano le stime in euro, che sono previsioni, e si nasconde solo la posizione di oggi. Inserimento, Impostazioni e backup non si aprono finché la modalità è attiva. Quota la ricorda anche dopo la chiusura: per uscire tocca di nuovo l'occhio.</p>` },

    { id: 'promemoria', t: 'Promemoria', s: 'Notifiche con Comandi Rapidi', ill: ILL.promemoria, b: `
      <p>Le web app non possono mandare promemoria da sole: li fa <b>Comandi Rapidi</b> di iOS, gratis.</p>${comandiHTML()}` },

    { id: 'confronto', t: 'Dati di confronto', s: 'Costi COVIP e rivalutazione del TFR', ill: ILL.confronto, b: `
      <p>Per il confronto Quota usa i costi medi pubblicati dalla COVIP (ISC a 10 anni) per fondi aperti e PIP, i costi del tuo comparto e la rivalutazione del TFR dell'ISTAT. Sono dati pubblici e si aggiornano da soli quando sei online.</p>
      <h4>Aggiornarli a mano</h4><ol class="gsteps"><li>La relazione annuale COVIP esce a giugno: cerca la tabella "Indicatore sintetico dei costi", colonna 10 anni, valori medi.</li>
        <li>I costi del tuo comparto sono sul sito del fondo, nella Scheda costi.</li>
        <li>In Impostazioni › Dati di confronto tocca <b>Modifica i costi</b>. Puoi sempre tornare ai valori ufficiali.</li></ol>` },

    { id: 'backup', t: 'Backup e cambio telefono', s: 'Non perdere lo storico', ill: ILL.backup, b: `
      <p>I dati sono solo su questo iPhone. Se cancelli l'icona dalla Home o usi Elimina tutti i dati, senza backup non si recuperano.</p>
      <ol class="gsteps"><li>Impostazioni › <b>Esporta backup</b> e salva il file in File › iCloud Drive.</li>
        <li>Sul telefono nuovo apri Quota e scegli <b>Importa un backup</b>. Funziona anche su Android: apri l'indirizzo in Chrome e aggiungi l'app alla schermata Home.</li></ol>
      <p><b>Esporta per foglio di calcolo</b> crea un CSV da aprire in Numbers o Excel. Serve per consultare i dati: per ripristinarli usa il backup.</p>` },

    { id: 'dati', t: 'Cosa salva e cosa no', s: 'Privacy, punto per punto', ill: ILL.privacy, b: datiSalvatiHTML() },

    { id: 'faq', t: 'Domande frequenti', s: 'Aggiornamenti, PDF, numeri ufficiali', ill: null, b: `
      <h4>Il PDF della busta non viene letto</h4><p>Serve il PDF originale con testo, non una foto o una scansione. Se il modello di busta cambia, Quota non lo riconosce: inserisci a mano e il modello nuovo si può aggiungere.</p>
      <h4>Come aggiorno l'app?</h4><p>Si aggiorna da sola. Se non vedi una novità, chiudi Quota dal multitasking e riaprila, anche due volte. In fondo alle Impostazioni leggi la versione.</p>
      <h4>Funziona senza internet?</h4><p>Sì. Servono internet solo per aprire il sito del fondo e per scaricare i dati pubblici aggiornati.</p>
      <h4>I numeri sono ufficiali?</h4><p>No: sono calcoli fatti sul telefono con i tuoi dati. Fanno fede il prospetto annuale del fondo e la Certificazione Unica.</p>` }
  ];
}

function guidaHTML() {
  const S = guidaSezioni(), sec = ui.guida.sec && S.find((x) => x.id === ui.guida.sec);
  const close = '<button type="button" class="tbtn strong" data-act="guida-close">Fine</button>';
  if (!sec) {
    return `<div class="guida" role="dialog" aria-modal="true" aria-labelledby="guida-t">
      <div class="guida-bar"><span></span>${close}</div>
      <div class="head" style="padding-top:4px"><h1 id="guida-t" tabindex="-1">Guida</h1></div>
      <section class="card flush" style="margin-top:4px">${S.map((x) => `<button type="button" class="glink" data-act="guida-sec" data-v="${x.id}"><span><span class="gl-t">${x.t}</span><span class="gl-s">${x.s}</span></span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>`).join('')}</section>
      <section class="card flush"><button type="button" class="listlink" data-act="intro-open">Rivedi l'introduzione</button></section>
      <div class="note" style="margin-bottom:24px">${DISCLAIMER}</div></div>`;
  }
  const i = S.indexOf(sec), next = S[i + 1];
  return `<div class="guida" role="dialog" aria-modal="true" aria-labelledby="guida-t">
    <div class="guida-bar"><button type="button" class="backbtn" style="margin:0" data-act="guida-sec" data-v=""><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Guida</button>${close}</div>
    ${sec.ill ? `<div class="guida-ill">${sec.ill}</div>` : ''}
    <div class="head" style="padding-top:${sec.ill ? 4 : 4}px"><h1 id="guida-t" tabindex="-1">${sec.t}</h1></div>
    <div class="card guida-body">${sec.b}</div>
    ${next ? `<section class="card flush"><button type="button" class="glink" data-act="guida-sec" data-v="${next.id}"><span><span class="gl-s">Avanti</span><span class="gl-t">${next.t}</span></span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></section>` : ''}
    <div style="height:32px"></div></div>`;
}

/* ======================= Rendering ed eventi ======================= */
// focus: sposta VoiceOver sul titolo (solo quando cambia pagina, non a ogni ridisegno).
function renderGuida(focus) {
  const root = $('#guide-root'); if (!root) return;
  const open = !!(ui.intro || ui.guida);
  document.body.classList.toggle('ovl', open);
  root.innerHTML = ui.intro ? introHTML() : ui.guida ? guidaHTML() : '';
  if (open && focus) {
    const box = root.firstElementChild; if (box) box.scrollTop = 0;
    const h = root.querySelector('#intro-t, #guida-t'); if (h) h.focus({ preventScroll: true });
  }
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, v = el.dataset.v;
  switch (act) {
    case 'intro-open': introOpen(); break;
    case 'intro-next': introGo(ui.intro.step + 1); break;
    case 'intro-prev': introGo(ui.intro.step - 1); break;
    case 'intro-dot': introGo(Number(v)); break;
    case 'intro-skip': introClose(); break;
    case 'intro-safari': ui.intro = null; renderGuida(); break;
    case 'intro-start': introStart(); break;
    case 'intro-settings': introClose(); ui.tab = 'impostazioni'; render(); window.scrollTo(0, 0); break;
    case 'guida-open': if (!priv()) { ui.guida = { sec: null }; renderGuida(true); } break;
    case 'guida-sec': if (ui.guida) { ui.guida.sec = v || null; renderGuida(true); } break;
    case 'guida-close': ui.guida = null; renderGuida(); break;
  }
});
document.addEventListener('input', (ev) => { const t = ev.target; if (t.dataset.i && ui.intro) ui.intro.cfg[t.dataset.i] = t.value; });
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.dataset.i && ui.intro) ui.intro.cfg[t.dataset.i] = t.value;
  // Import dal passo finale: chiude l'introduzione, poi app.js legge il file.
  if (t.id === 'intro-imp' && t.files && t.files[0] && ui.intro) { ui.intro = null; ui.introVista = INTRO_VER; savePref(); renderGuida(); }
});
document.addEventListener('keydown', (ev) => {
  if (!ui.intro && !ui.guida) return;
  if (ev.target.closest && ev.target.closest('input, select')) return;
  if (ev.key === 'Escape') { if (ui.intro) introClose(); else { ui.guida = null; renderGuida(); } }
  if (ui.intro && ev.key === 'ArrowRight') introGo(ui.intro.step + 1);
  if (ui.intro && ev.key === 'ArrowLeft') introGo(ui.intro.step - 1);
});
// Scorrimento a destra/sinistra tra i passi dell'introduzione (non sui campi del modulo).
let swipe = null;
document.addEventListener('touchstart', (ev) => {
  if (!ui.intro || !ev.target.closest('.intro') || ev.target.closest('input, select, label, .intro-form')) { swipe = null; return; }
  const p = ev.touches[0]; swipe = { x: p.clientX, y: p.clientY };
}, { passive: true });
document.addEventListener('touchend', (ev) => {
  if (!swipe || !ui.intro) return;
  const p = ev.changedTouches[0], dx = p.clientX - swipe.x, dy = p.clientY - swipe.y; swipe = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) introGo(ui.intro.step + (dx < 0 ? 1 : -1));
}, { passive: true });
