# Quota

Web app personale per tenere sotto controllo la previdenza complementare da iPhone.

> **Progetto personale e indipendente**, non affiliato a Previdenza Cooperativa né ad altri fondi pensione, banche o assicurazioni. Non è un servizio offerto al pubblico. I calcoli sono stime basate su dati pubblici (ISTAT, COVIP) e **non costituiscono consulenza finanziaria**. Il codice non è rilasciato con alcuna licenza: tutti i diritti riservati.

**Indirizzo:** https://btudors.github.io/quota/

## Come si usa
1. Apri l'indirizzo in **Safari** sull'iPhone.
2. Condividi › **Aggiungi alla schermata Home**.
3. Al primo avvio: **Importa il tuo storico** (file `quota-backup` in formato JSON) oppure **Inizia da zero**.

## Privacy
- Tutti i dati personali restano **solo nel telefono** (memoria locale del browser). Nessun server, nessun account.
- In questo repository **non vanno mai caricati** file con dati personali (backup, storico).
- Backup: Impostazioni › Esporta backup, da salvare in File › iCloud Drive.

## File
| File | Cosa contiene |
|---|---|
| `index.html`, `app.css`, `app.js` | l'app |
| `sw.js` | funzionamento offline. **Aumenta `VERSION` a ogni rilascio** |
| `manifest.webmanifest`, `icons/` | installazione sulla schermata Home |
| `data/riferimenti.json` | dati pubblici: coefficienti TFR (ISTAT) e costi medi ISC (COVIP, scheda costi del fondo) |

## Aggiornare i dati pubblici
Modifica `data/riferimenti.json` e cambia il campo `versione` (es. `2027-06-20`): l'app scarica il nuovo file da sola al primo avvio online.
- **TFR**: aggiungi il coefficiente del mese in `tfr.coefficienti` (chiave `AAAA-MM`, valore in %).
- **Costi COVIP** (una volta l'anno, giugno): `isc.fondiAperti`, `isc.pip`, `isc.anno`, `isc.fonte` (valori decimali: 1,36% = `0.0136`).
- **Costi del fondo**: `fondo.iscComparti`.
