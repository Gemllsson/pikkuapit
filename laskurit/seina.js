/* Seinäpeltilaskuri: laskenta.
   HUOMIO: funktiot spHarjaX ... spRyhmittele on kopioitu sellaisenaan laskin.html:stä
   (rivit 2809-2964, 1.11.2026) ilman muutoksia. Tarkoitus on ensin lukita nykyinen
   toiminta testeillä ja vasta sitten siivota. Älä muuta näitä ennen kuin testit ovat paikallaan. */
(function (juuri) {
  'use strict';
  var PA = juuri.PA || (juuri.PA = {});
  PA.laskurit = PA.laskurit || {};

// Harjan sijainti vasemmasta reunasta — käyttäjä voi siirtää sitä, mutta oletuksena
// (tai jos arvo puuttuu/on seinän ulkopuolella) harja on keskellä seinää.
function spHarjaX(s) {
  if (s.harjaX != null && s.harjaX > 0 && s.harjaX < s.leveys) return s.harjaX;
  return s.leveys / 2;
}

function spKorkeusKohdassa(s, x) {
  if (s.tyyppi === 'suora') return s.korkeus;
  if (s.tyyppi === 'harja') {
    const hx = spHarjaX(s);
    if (x <= hx) {
      const t = hx > 0 ? x / hx : 0;
      return s.korkeusVas + (s.harjaKorkeus - s.korkeusVas) * t;
    }
    const t = (s.leveys - hx) > 0 ? (x - hx) / (s.leveys - hx) : 0;
    return s.harjaKorkeus + (s.korkeusOik - s.harjaKorkeus) * t;
  }
  const t = s.leveys > 0 ? x / s.leveys : 0;
  return s.korkeusVas + (s.korkeusOik - s.korkeusVas) * t;
}

// Korkein tarvittava korkeus välillä [x0, x1]. Suora/Vino-seinällä korkeus muuttuu
// aina tasaisesti, joten reunat riittävät — mutta Harja-seinällä katto NOUSEE ensin
// ja LASKEE sitten, joten jos harjan huippu osuu pellin leveyden SISÄÄN (ei vain
// reunalle), pelkät reunakorkeudet eivät riitä: pelti pitää silloin mitoittaa itse
// huipun korkeuden mukaan, muuten se jäisi liian lyhyeksi eikä yltäisi harjalle asti.
function spMaxKorkeusValilla(s, x0, x1) {
  let maxH = Math.max(spKorkeusKohdassa(s, x0), spKorkeusKohdassa(s, x1));
  if (s.tyyppi === 'harja') {
    const hx = spHarjaX(s);
    if (hx > x0 + 0.01 && hx < x1 - 0.01) maxH = Math.max(maxH, s.harjaKorkeus);
  }
  return maxH;
}

// Jatkuvan paneeliruudukon rajat koko seinän yli — TÄYSIN riippumaton aukoista.
// Näin paneelien "vaihe" (mistä kohtaa 1180mm-jako lähtee) ei koskaan hyppää
// aukon reunalla, vaan pysyy samana koko seinän matkalta.
function spGridRajat(s) {
  const leveys = s.leveys;
  const panelW = s.paneliLeveys;
  const rajat = [0];
  if (s.aloitus === 'vasen') {
    let x = 0;
    while (x < leveys - 0.01) {
      x = Math.min(x + panelW, leveys);
      rajat.push(x);
    }
  } else {
    // Rakennetaan oikealta, sitten käännetään kasvavaan järjestykseen.
    rajat.length = 0;
    let x = leveys;
    rajat.push(leveys);
    while (x > 0.01) {
      x = Math.max(x - panelW, 0);
      rajat.push(x);
    }
    rajat.reverse();
  }
  return rajat;
}

// Seinäpellit ovat AINA täyttä vakioleveyttä (esim. 1090mm) — niitä ei koskaan
// tehdä kapeampina, vaan leveyssuuntainen sovitus oviin/ikkunoihin tehdään
// työmaalla leikkaamalla ylimääräinen pois. Peltilaskenta käy siis läpi
// paneeliruudukon SARAKE kerrallaan (spGridRajat — aina täysleveä, paitsi
// seinän päässä oleva jäännössarake), ja jokainen sarake päätyy JOKO:
//  - normaaliksi täyspitkäksi pelliksi (jos mikään aukko ei peitä sitä KOKONAAN
//    koko sarakkeen leveydeltä — osittainen aukon "puraisu" reunasta ei vaikuta,
//    se vain leikataan pois työmaalla), TAI
//  - yhdeksi lyhyemmäksi header-pelliksi (jos OVI peittää koko sarakkeen — ovi
//    ulottuu lattiaan, joten pellin tarvitsee kattaa vain oven yläpuoli), TAI
//  - KAHDEKSI pelliksi, ala- ja yläpuoli (jos IKKUNA peittää koko sarakkeen —
//    ikkuna ei ulotu lattiaan eikä kattoon, joten sarakkeeseen jää sekä ikkunan
//    alle että yläpuolelle oma pelti).
// Tämä on vahvistettu käyttäjän CAD-piirroksesta: kaikki 9 mittalukua (3660,
// 1423, 3386, 3250, 1313, 2976, 800, 2839, 2703) täsmäävät tähän malliin
// millin tarkkuudella, kun ovi on 1000–3000 ja ikkuna 4000–6000.
function spLaskeSeina(s) {
  if (!s.leveys || s.leveys <= 0) return null;
  if (!s.paneliLeveys || s.paneliLeveys <= 0) return null;
  if (s.tyyppi === 'suora' && (!s.korkeus || s.korkeus <= 0)) return null;
  if (s.tyyppi === 'vino' && (!s.korkeusVas || !s.korkeusOik || s.korkeusVas <= 0 || s.korkeusOik <= 0)) return null;
  if (s.tyyppi === 'harja' && (!s.korkeusVas || !s.korkeusOik || !s.harjaKorkeus || s.korkeusVas <= 0 || s.korkeusOik <= 0 || s.harjaKorkeus <= 0)) return null;

  const aukot = (s.aukot || [])
    .filter(a => a.x != null && a.leveys > 0 && a.korkeus > 0)
    .map(a => ({
      tyyppi: a.tyyppi,
      korkeus: a.korkeus,
      alaKorkeus: (a.tyyppi === 'ikkuna' && a.alaKorkeus > 0) ? a.alaKorkeus : 0,
      alku: Math.max(0, a.x),
      loppu: Math.min(s.leveys, a.x + a.leveys)
    }))
    .filter(a => a.loppu - a.alku > 0.01)
    .sort((a, b) => a.alku - b.alku);

  const EPS = 0.5; // toleranssi liukulukupyöristyksille sarakerajan ja aukon reunan täsmätessä
  const gridRajat = spGridRajat(s);
  const paneelit = [];

  for (let i = 0; i < gridRajat.length - 1; i++) {
    const cx0 = gridRajat[i], cx1 = gridRajat[i + 1];
    if (cx1 - cx0 <= 0.01) continue;
    const leveys = cx1 - cx0;

    // Peittääkö jokin aukko TÄYSIN tämän sarakkeen (molemmista reunoista asti)?
    // Osittainen peitto (aukko koskettaa vain toista reunaa) EI vaikuta — se
    // jää normaalin pellin sisään ja leikataan työmaalla.
    const kattavaAukko = aukot.find(a => a.alku <= cx0 + EPS && a.loppu >= cx1 - EPS);

    if (!kattavaAukko) {
      const korkeus = spMaxKorkeusValilla(s, cx0, cx1);
      paneelit.push({ x: cx0, leveys, korkeus, yPohja: 0 });
      continue;
    }

    const ylaraja = kattavaAukko.alaKorkeus + kattavaAukko.korkeus;
    const ylaKorkeus = spMaxKorkeusValilla(s, cx0, cx1) - ylaraja;
    if (ylaKorkeus > 1) {
      paneelit.push({ x: cx0, leveys, korkeus: ylaKorkeus, yPohja: ylaraja, aukonYla: true });
    }
    if (kattavaAukko.alaKorkeus > 1) {
      paneelit.push({ x: cx0, leveys, korkeus: kattavaAukko.alaKorkeus, yPohja: 0, aukonAla: true });
    }
  }

  paneelit.sort((a, b) => a.x - b.x);

  // Tilausleveys = leveys, jonka verstaalla oikeasti tehdään/tilataan.
  // Jos seinän jäännöspala-asetus EI ole 'tarkka' (eli oletus 'tayslevea'),
  // kapeampi reuna-/jäännöspala tehdään silti täyteen paneelin leveyteen asti
  // ja leikataan oikeaan mittaansa vasta työmaalla — joillain profiileilla
  // (esim. KP-20) kapeampaa ei voi muovata koneesta lainkaan.
  paneelit.forEach(p => {
    p.tilausLeveys = (s.jaannos !== 'tarkka' && p.leveys < s.paneliLeveys - 0.5)
      ? s.paneliLeveys
      : p.leveys;
  });

  return paneelit;
}

function spRyhmittele(paneelit) {
  const map = new Map();
  for (const p of paneelit) {
    const tilausLeveys = Math.round(p.tilausLeveys != null ? p.tilausLeveys : p.leveys);
    const leveys = Math.round(p.leveys);
    const korkeus = Math.round(p.korkeus);
    const key = tilausLeveys + 'x' + leveys + 'x' + korkeus;
    if (!map.has(key)) map.set(key, { tilausLeveys, leveys, korkeus, kpl: 0 });
    map.get(key).kpl++;
  }
  return Array.from(map.values()).sort((a, b) => b.korkeus - a.korkeus || b.tilausLeveys - a.tilausLeveys);
}

  PA.laskurit.seina = {
    nimi: 'Seinäpellit',
    oletus: { tyyppi: 'suora', leveys: null, korkeus: null, korkeusVas: null, korkeusOik: null,
              harjaKorkeus: null, harjaX: null, paneliLeveys: 1090, aloitus: 'vasen',
              jaannos: 'tayslevea', aukot: [] },

    // syote = yhden seinän tiedot samassa muodossa kuin laskin.html:n seinat[]-taulukossa
    laske: function (syote) {
      var s = Object.assign({}, this.oletus, syote);
      var paneelit = spLaskeSeina(s);
      if (!paneelit) {
        return { paneelit: [], ryhmat: [], varoitukset: ['Puuttuvia tai virheellisiä mittoja'], yhteenveto: { kpl: 0 } };
      }
      return {
        paneelit: paneelit,
        ryhmat: spRyhmittele(paneelit),
        varoitukset: [],
        yhteenveto: { kpl: paneelit.length }
      };
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PA;
})(typeof window !== 'undefined' ? window : globalThis);
