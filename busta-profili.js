/* Quota – modelli di busta paga riconosciuti.
   Ogni profilo descrive DOVE si trovano i dati in un certo modello di cedolino.
   Per aggiungere un modello nuovo basta aggiungere un oggetto a questo elenco: il motore di lettura (busta.js) non cambia.
   Nei profili ci sono solo etichette, codici voce e nomi di colonna: mai dati personali.

   Campi di un profilo
   - id, nome          identificativo e nome leggibile
   - riconoscimento    testi che devono comparire nel PDF (senza badare a spazi e maiuscole); vince il profilo che ne trova di più
   - colonne           intestazioni delle colonne numeriche: { chiave: 'Testo intestazione' }
   - periodo           etichetta vicino a cui cercare mese e anno di competenza ("MM AAAA")
   - campi             per ogni dato: voce (codice), riga (testo che identifica la riga dentro la voce, facoltativo),
                       colonne (in ordine di preferenza), senzaIntestazioni ('primo' | 'ultimo': cosa prendere se le colonne non si leggono)
   Dati letti: imponibile, azienda (contributo a carico azienda), volontario (contributo a carico lavoratore), tfr. */
(function (root) {
  'use strict';

  const PROFILI = [
    {
      id: 'inaz-cooperativa',
      nome: 'Inaz Stampe.net · Previdenza Cooperativa',
      riconoscimento: ['c/Azienda', 'Filcoop', 'Dato Figurativo'],
      colonne: { base: 'Dato Base', fig: 'Dato Figurativo', comp: 'Competenze', rit: 'Ritenute' },
      periodo: 'COMPETENZA',
      campi: {
        imponibile: { voce: '721', riga: 'c/Azienda', colonne: ['base'], senzaIntestazioni: 'primo' },
        azienda:    { voce: '721', riga: 'c/Azienda', colonne: ['fig'] },
        volontario: { voce: '723', riga: 'Filcoop',   colonne: ['comp', 'rit'], senzaIntestazioni: 'ultimo' },
        tfr:        { voce: '786', colonne: ['fig', 'base'], senzaIntestazioni: 'primo' }
      }
    }
  ];

  if (typeof module === 'object' && module.exports) module.exports = PROFILI; else root.QuotaProfili = PROFILI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
