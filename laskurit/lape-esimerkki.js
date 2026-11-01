/* Esimerkkilaskuri, joka näyttää laskurin rajapinnan.
   Ei ole vielä oikea työkalu: tästä kasvaa kattolaskurin v1 (vain lappeen mitat, ei kaltevuutta).

   Syöte:  { lappeet: [ { nimi, leveys, korkeus } ], paneelinLeveys }   (mm)
   Tulos:  { kappaleet: [Piece], varoitukset: [], yhteenveto: {} }

   Suorakulmaisen lappeen pellit: leveys jaetaan paneelin levyisiin sarakkeisiin,
   viimeinen sarake on jäännös. Pellin pituus = lappeen korkeus. */
(function (juuri) {
  'use strict';
  var PA = juuri.PA || (juuri.PA = {});
  PA.laskurit = PA.laskurit || {};

  PA.laskurit.lapeEsimerkki = {
    nimi: 'Lape (esimerkki)',
    oletus: { paneelinLeveys: 1000, lappeet: [{ nimi: 'Lape 1', leveys: 6000, korkeus: 4000 }] },

    laske: function (syote) {
      var pw = Number(syote.paneelinLeveys);
      var kappaleet = [], varoitukset = [];
      var kokonaisPituus = 0;

      if (!(pw > 0)) {
        return { kappaleet: [], varoitukset: ['Paneelin leveys puuttuu'], yhteenveto: {} };
      }

      (syote.lappeet || []).forEach(function (lape, i) {
        var l = Number(lape.leveys), k = Number(lape.korkeus);
        if (!(l > 0) || !(k > 0)) {
          varoitukset.push((lape.nimi || 'Lape ' + (i + 1)) + ': mitta puuttuu');
          return;
        }
        var taysia = Math.floor(l / pw);
        var jaannos = l - taysia * pw;

        if (taysia > 0) {
          kappaleet.push({
            id: 'lape' + (i + 1) + '-taysi',
            nimi: (lape.nimi || 'Lape ' + (i + 1)) + ', täysi pelti',
            kpl: taysia,
            ulko: [[0, 0], [pw, 0], [pw, k], [0, k]],
            meta: { ryhma: 'katto' }
          });
          kokonaisPituus += taysia * k;
        }
        if (jaannos > 0.5) {
          kappaleet.push({
            id: 'lape' + (i + 1) + '-jaannos',
            nimi: (lape.nimi || 'Lape ' + (i + 1)) + ', jäännöspelti',
            kpl: 1,
            ulko: [[0, 0], [jaannos, 0], [jaannos, k], [0, k]],
            meta: { ryhma: 'katto' }
          });
          kokonaisPituus += k;
        }
      });

      var kpl = kappaleet.reduce(function (s, p) { return s + p.kpl; }, 0);
      return {
        kappaleet: kappaleet,
        varoitukset: varoitukset,
        yhteenveto: { kpl: kpl, pellinMetrit: kokonaisPituus / 1000 }
      };
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PA;
})(typeof window !== 'undefined' ? window : globalThis);
