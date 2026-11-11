# Quota

Web app personale per tenere sotto controllo la previdenza complementare da iPhone.

> **Progetto personale e indipendente**, non affiliato a Previdenza Cooperativa né ad altri fondi pensione, banche o assicurazioni. Non è un servizio offerto al pubblico. I calcoli sono stime basate su dati pubblici (ISTAT, COVIP) e **non costituiscono consulenza finanziaria**. Il codice non è rilasciato con alcuna licenza: tutti i diritti riservati.

**Indirizzo:** https://btudors.github.io/quota/

## Come si usa
1. Apri l'indirizzo in **Safari** sull'iPhone.
2. Condividi › **Aggiungi alla schermata Home**.
3. Al primo avvio: **Importa il tuo storico** (file `quota-backup` in formato JSON) oppure **Inizia da zero**.

## Busta paga in PDF
Pulsante **Inserisci** in Panoramica › **Leggi dalla busta paga (PDF)**: l'app legge mese, imponibile, contributo azienda, contributo volontario e TFR e compila il modulo; poi controlli e salvi. I contributi vengono confrontati con le aliquote impostate (Impostazioni › Aliquote): se la busta indica una percentuale diversa (es. azienda 2% invece di 1,5%), il pulsante **Aggiorna l'aliquota da …** registra il cambio da quel mese con un tocco. Il PDF non viene caricato né conservato. Funziona con i PDF con testo (non con scansioni/foto).

### Modelli di busta paga
La lettura è divisa in due parti:
- `busta.js` è il **motore generico**: trasforma il PDF in righe e colonne. Non si tocca.
- `busta-profili.js` contiene i **profili**: per ogni modello di cedolino dice in quale voce, riga e colonna si trova ogni dato. L'app sceglie da sola il profilo in base ai testi di `riconoscimento`.

Profilo attuale (Inaz Stampe.net, Previdenza Cooperativa):
| Dato | Voce | Riga | Colonna |
|---|---|---|---|
| Imponibile | 721 | `*** c/Azienda` | Dato Base |
| Contributo azienda | 721 | `*** c/Azienda` | Dato Figurativo |
| Contributo volontario | 723 | `Ctr.Filcoop Dip.` | Competenze/Ritenute |
| TFR al fondo | 786 | `Smobilitazione. % su Tfr` | Dato Figurativo (o Dato Base) |

Per un modello nuovo: copia il profilo esistente in `busta-profili.js`, cambia `id`, `nome`, `riconoscimento`, i nomi delle `colonne` e le voci dei `campi`, poi aumenta `VERSION` in `sw.js`.

## Spazio deducibile
In Panoramica la card **Spazio deducibile** somma contributo volontario e contributo azienda dell'anno (per mese di competenza della busta paga; il TFR non conta) e li confronta con il limite di legge. Il limite è in `data/riferimenti.json` › `deducibilita.limiti` (chiave = anno da cui vale): 5.164,57 € fino al 2025, 5.300 € dal 2026. Da metà novembre la card ricorda quanto si può ancora versare entro il 31 dicembre. Il dettaglio per anno è in Anni › Deducibilità.

## Versamenti volontari fuori busta
Pulsante **+ Aggiungi versamento volontario** nella card Spazio deducibile e in Anni › Deducibilità: data, importo, note e **Dedotto / Non dedotto**. In Anni il versamento compare tra i mesi, alla sua data (verde se dedotto, rosso se no). I dedotti contano nello spazio deducibile, i non dedotti no. Finché un versamento non dedotto non è segnato come comunicato, in cima ad Anni c'è un avviso con la scadenza per comunicarlo al fondo (31 dicembre dell'anno dopo, D.Lgs. 252/2005 art. 8 c. 4). Nei trimestri, un versamento fatto tra due valori del fondo viene sommato all'accredito atteso. Contano anche in "E se non avessi aderito?" e in "Ogni 1 € di tasca tua"; restano fuori dalle proiezioni della pagina Pensione (sono una tantum). Salvati nel backup.

## Giorno di paga
Impostazioni › Promemoria › **Giorno di paga** (1–31, salvato anche nel backup). Da quel giorno il pulsante della Panoramica considera arrivata la busta del mese; se cade di sabato, domenica o festivo, dal primo giorno feriale successivo. Nei mesi più corti vale l'ultimo giorno del mese. Festivi considerati: 1 e 6 gennaio, Lunedì dell'Angelo (calcolato), 25 aprile, 1 maggio, 2 giugno, 15 agosto, 4 ottobre (dal 2026, L. 151/2025), 1 novembre, 8, 25 e 26 dicembre. Le notifiche di Comandi Rapidi restano a giorno fisso.

## Modalità privata
In Panoramica e in Anni il pulsante a **occhio** nasconde tutti gli importi: per mostrare l'app a qualcuno senza far vedere quanto c'è nel fondo. L'app resta come l'hai lasciata anche dopo averla chiusa.
- Al posto degli euro: rendimento %, confronto con TFR in azienda, fondi aperti e PIP in base 100 (il tuo fondo = 100), composizione "su ogni 100 € versati", spazio deducibile in % del limite. In Anni, in alto, solo "Versato nell'anno" e i mesi registrati.
- Restano visibili valore quota e costi del comparto (dati pubblici del fondo); il numero di quote no.
- Pensione mostra le previsioni in euro (capitale, rendita, scenari, calcolatore): sono stime future. Restano nascosti solo posizione di oggi e guadagno del fondo, e "Sei in linea?" resta in %. Inserimento, Impostazioni, backup ed export non sono raggiungibili finché la modalità è attiva.
- Tecnica: ogni importo passa da `eur()`/`eurS()` (la pagina Pensione usa di proposito `eurF()`/`eurFS()`, sempre visibili), che in modalità privata restituiscono sempre `€ •••••` (5 pallini, mai il numero di cifre vero). Nuove schermate: usare sempre questi formattatori, mai `num()` per importi.

## Ogni 1 € di tasca tua
Card in Panoramica: (contributo volontario + contributo azienda + rendimento maturato su questi due) ÷ (contributo volontario − IRPEF risparmiata con la deduzione). Il TFR e il suo rendimento restano fuori: sarebbero tuoi comunque. La deduzione conta il volontario fino al limite dell'anno (dopo il contributo azienda), all'aliquota dello scaglione scelto in Impostazioni › Tasse (`data/riferimenti.json` › `irpef.aliquote`, chiave = anno da cui vale).

## Rendimento della posizione
In Panoramica: **Tutto** mostra il rendimento sul versato dall'adesione; **12 mesi** il rendimento ponderato nel tempo (variazione del valore quota, senza l'effetto dei versamenti) e, fuori dalla modalità privata, il guadagno del periodo. Il controllo busta paga contro accrediti è in Anni › Trimestri.

## Pulsante Inserisci
In Panoramica, al posto della scheda "mese da completare": **verde "Aggiornato"** se busta paga e dati del fondo del mese in corso ci sono; **arancione** se ne manca uno o manca la busta paga di un mese precedente; **rosso** se mancano entrambi. In cima alla pagina Inserisci un riquadro dice cosa manca. I dati del fondo dei mesi passati non vengono segnalati: dal sito non si recuperano più.

## Pensione
Scheda nella barra in basso. Previsione al pensionamento, in euro di oggi, a tre livelli:
1. senza dati: la pagina chiede il **mese di nascita** (pensione di vecchiaia a 67 anni);
2. con il mese di nascita: stima di Quota, con un coefficiente di rendita generico;
3. con il **prospetto annuale del fondo** (PDF letto e non salvato, oppure data, posizione finale e rendita a mano): data e rendita ufficiali, confronto con la previsione del fondo e, in Anni, **verifica dell'anno** (posizione al 31/12 e versato arrivato al fondo).

Contenuti: capitale, rendita lorda e netta (anno e mese), rendita in % dello stipendio lordo di oggi (imponibili delle ultime 12 buste), versato da oggi (tu, azienda, TFR), guadagno del fondo, "Sei in linea?" (posizione reale contro le ipotesi), grafico dei tre comparti e del TFR in azienda, classifica con fondo aperto e PIP, calcolatore "E se…", avviso sul rischio, link e declaratoria.

Ipotesi in `data/riferimenti.json` › `proiezioni`: rendimenti reali lordi per comparto della metodologia del fondo (Sicuro 2%, Bilanciato 2,6%, Dinamico 3%), meno ISC del comparto, meno la quota di tasse `quotaTasse` (calibrata perché il Dinamico ricostruisca il prospetto 2025: 2,55% reale netto); crescita dei contributi 1% reale; 12 € di costo fisso l'anno; imposta sulla prestazione dal 15% al 9% (−0,3 punti per anno oltre il 15°) sulla sola parte di contributi e TFR. Fondi aperti e PIP: stesso rendimento lordo del tuo comparto meno l'ISC medio COVIP, senza contributo dell'azienda. TFR in azienda: 1,5% + 75% dell'inflazione (2%), tassato al 17%.

## Privacy
- Tutti i dati personali restano **solo nel telefono** (memoria locale del browser). Nessun server, nessun account.
- In questo repository **non vanno mai caricati** file con dati personali (backup, storico).
- Backup: Impostazioni › Esporta backup, da salvare in File › iCloud Drive. È anche il file per passare a un altro telefono (Android compreso): sul nuovo dispositivo si fa Importa backup.
- Foglio di calcolo: Impostazioni › Esporta per foglio di calcolo (CSV). Una riga per mese, separatore `;` e virgola decimale; si apre in Excel, Numbers e Google Fogli. Solo esportazione: per ripristinare i dati si usa il backup JSON.

## File
| File | Cosa contiene |
|---|---|
| `index.html`, `app.css`, `app.js` | l'app |
| `busta.js` | motore di lettura della busta paga in PDF, tutto nel telefono |
| `busta-profili.js` | modelli di busta paga riconosciuti (voci, righe, colonne) |
| `vendor/pdfjs/` | pdf.js 3.2.146 di Mozilla (Apache 2.0), caricato solo quando leggi un PDF |
| `sw.js` | funzionamento offline. **Aumenta `VERSION` a ogni rilascio** |
| `manifest.webmanifest`, `icons/` | installazione sulla schermata Home |
| `data/riferimenti.json` | dati pubblici: coefficienti TFR (ISTAT), costi medi ISC (COVIP, scheda costi del fondo) e ipotesi delle proiezioni |

## Aggiornare i dati pubblici
Modifica `data/riferimenti.json` e cambia il campo `versione` (es. `2027-06-20`): l'app scarica il nuovo file da sola al primo avvio online.
- **Limite deducibile**: aggiungi in `deducibilita.limiti` l'anno da cui vale il nuovo importo.
- **TFR**: aggiungi il coefficiente del mese in `tfr.coefficienti` (chiave `AAAA-MM`, valore in %).
- **Costi COVIP** (una volta l'anno, giugno): `isc.fondiAperti`, `isc.pip`, `isc.anno`, `isc.fonte` (valori decimali: 1,36% = `0.0136`).
- **Costi del fondo**: `fondo.iscComparti`.
