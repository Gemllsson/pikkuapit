# Pikkuäpit: moottoriarkkitehtuuri

Versio 1, 1.11.2026. Tämä on suunnitelma, ei vielä toteutus. Pohjana on kolme olemassa olevaa tiedostoa: laskin.html (seinäpelti), huuva ja kartio.

## 1. Periaatteet

1. **Laskuri tuottaa vain kappaleita.** Jokainen laskuri on pieni geometriageneraattori: syötteet sisään, kappalelista ulos. Sijoittelu, merkintä, piirto ja tulostus tehdään yhteisillä moottoreilla.
2. **Laskenta ei koske sivun elementteihin (DOM).** Moottorit ovat puhtaita funktioita: JSON sisään, JSON ulos. Silloin niitä voi testata Nodella ja käyttää missä tahansa laskurissa.
3. **Yksinkertaisuus ennen kaikkea.** Tavalliset script-tiedostot ilman moduulijärjestelmää, jotta sivut toimivat myös tiedostona avattuina (työmaalla, ilman nettiä).
4. **Yksi uusi laskuri = pieni html + geometriafunktio.** Jos uusi laskuri vaatii yhteisten moottorien muokkausta, rajapinta on väärin.
5. **Ensin toimiva, sitten hienosäätö.** Pyöristykset, aukot ja kaltevuus tulevat vasta, kun perusversio toimii.

## 2. Nykytilanne: mitä toistuu kolmessa tiedostossa

| Osa | laskin.html (seinä) | huuva | kartio |
|---|---|---|---|
| Geometria (vektorit, kierto, rajat) | osittain | oma | oma |
| Samanlaisten kappaleiden ryhmittely | spRyhmittele | ryhmitteleSamat | ryhmat (rakennaOsat) |
| Sijoittelu levylle / rullalle | ei ole | laskeKaistat (kaistat, lomitus) | sijoitaOsa (reuna, vapaa kierto) |
| Merkintä | ei ole | aihioPisteet (pisteet x/y) | ketjuMitat, nelioKulmat |
| Kanttausluvut | ei ole | sivu-, ylä-, alataitokset 3D:stä | taiteKulmat 3D:stä |
| SVG-piirto | spPiirraSeina, spTulostusSvg | levitysSvgSisalto, merkintäSvg | levitysSvg, siirtymaSvg |
| Työkortti / tulostus | spTulostaSeinat | rakennaTyokortit | tulosta, tulostaNelio |
| Teema ja apufunktiot | :root, gn, roundN | :root, num | :root, luku, fmt, rd |

Huomioita: kartiossa laskenta on jo erotettu käyttöliittymästä, huuvassa ei vielä. Laskimen inline-SVG-logo on todennäköisesti suurin yksittäinen tiedostokokoon vaikuttava asia.

## 3. Tavoite: kerrokset

```
Laskuri (geometriageneraattori)
   │  laske(syöte) → { kappaleet[], varoitukset[], yhteenveto }
   ▼
Kappale (Piece): yhteinen tietorakenne
   ▼
Moottorit (yhteiset)
   geom → ryhmittely → sijoittelu → merkintä → kanttaus → menekki
   piirto → työkortti
   ▼
UI (lomake, tallennus, tulostus)
```

### 3.1 Kappale (Piece), yhteinen tietorakenne

Kaikki mitat millimetreinä, kappaleen oma koordinaatisto (alareuna x-akselilla, vasen alakulma origossa).

```json
{
  "id": "sein1-p3",
  "nimi": "Sivuseinä, pelti 3",
  "kpl": 4,
  "ulko": [[0,0],[1090,0],[1090,2980],[0,3240]],
  "viivat": [{"tyyppi":"taite","p":[0,0],"q":[0,100]}],
  "taitokset": [
    {"reuna":"vasen","leveys":20,"kulma":90,"suunta":"sisään","segmentit":[]}
  ],
  "meta": {"ryhma":"seinä","materiaali":"HC25","paksuus":0.6}
}
```

- `ulko`: ääriviivan kulmat vastapäivään. Suorakulmio on neljä pistettä, kolmio kolme, kartion kaari taulukko pisteitä.
- `taitokset`: valinnainen. Jos laskuri osaa antaa kanttausluvut, ne tulevat tässä. Muuten työkortti jättää sarakkeen pois.
- `viivat`: sisäiset merkintäviivat (taitolinjat, saumat).
- Samanlaisuuden vertailu (ryhmittely) tehdään `ulko`, `taitokset` ja `meta`-kenttien perusteella.

### 3.2 Moottorit

| Tiedosto | Tehtävä | Lähtökohta nykykoodissa |
|---|---|---|
| geom.js | vektorit, kierto, rajat, kupera kuori, monikulmioiden yhdistäminen ja leikkaus | huuvan vektorit, kartion kierraPisteet/rajat, kuperaKuori, yhdistaMonikulmiot |
| ryhmittely.js | samanlaiset kappaleet yhteen (kpl) | kolme eri versiota |
| sijoittelu.js | kappaleet leikattavaksi levylle tai rullasta: reunasijoittelu, vapaa kierto, kaistat ja lomitus | kartion sijoitaOsa + huuvan laskeKaistat |
| merkinta.js | pisteet x/y, ketjumitat, leikkauskulmat | huuvan aihioPisteet, kartion ketjuMitat/nelioKulmat |
| kantaus.js | kanttausluvut 3D-tasoista | huuva + kartion taiteKulmat (yhdistettävä) |
| menekki.js | kpl, rullametrit, m², paino, hinta | uusi (tarjousrivi ERP:iin) |
| piirto.js | SVG: levitys, merkintä, sijoittelu; kaksi teemaa (ruutu, paperi) | kolme eri piirtokoodia |
| tyokortti.js | A4-sivupohjat ja tulostus | kolme eri tulostusta |
| ui.js | luku/fmt/rd (suomalainen desimaali), localStorage, avattavat kortit | toistuu jokaisessa |
| tyylit.css | `:root`-värit ja yhteiset komponentit | toistuu jokaisessa |

Huuvan ja kartion kanttausluvut ovat eri tavoin tehtyjä. Yhdistäminen on moottoreista haastavin, joten sen voi jättää loppuun: kanttausluvut ovat aluksi laskurikohtaisia ja `taitokset`-kenttä on valinnainen.

### 3.3 Laskurin rajapinta

```js
// Jokainen laskuri tarjoaa:
PA.laskurit.seina = {
  nimi: 'Seinäpellit',
  oletus: { /* syötteiden oletusarvot */ },
  laske(syote) { return { kappaleet: [...], varoitukset: [...], yhteenveto: {...} }; }
};
```

- Syöte ja tulos ovat pelkkää JSONia (ei DOM-viittauksia). Tämä mahdollistaa testit Nodella ja tallennuksen sellaisenaan.
- Nimiavaruus `PA` on yksi globaali olio. Jokainen moottori lisää siihen oman osansa.

## 4. Kattolaskuri tämän rakenteen päällä

Seinälaskurin sarakelogiikka on jo lappeen laskentaa, kun seinä käännetään kyljelleen.

- **Lape on monikulmio** (pistejono mm), ei erillinen tyyppi suora/vino/harja. Suorakulmio, kolmio, puolisuunnikas ja suunnikas ovat kaikki sama laskenta.
- **Sarakkeet:** `sarakkeet(monikulmio, paneelinLeveys, aloitus)` jakaa lappeen paneelin levyisiin sarakkeisiin. Pellin pituus on monikulmion korkeus sarakkeen kohdalla (suurin arvo sarakkeen leveydeltä, kuten spMaxKorkeusValilla).
- **Mallit ovat pikavalintoja:** pulpetti, harja, aumakatto, puoliaumakatto, L-talo ja tornikatto lisäävät valmiit lappeet-kortit oletusmuodoilla. Jokaisen lappeen voi muokata käsin.
- **Versio 1:** vain lappeiden mitat (ei kaltevuutta, ei aukkoja, ei pyöristystä). Rakennuksen mitat ja kaltevuus tulevat valinnaiseksi syöttötavaksi myöhemmin.
- **Seinälaskuri ja vaakalaudoitus** käyttävät samaa sarakelogiikkaa. Vaakalaudoitus on seinälaskuri, jossa paneelin leveys on laudan leveys (esim. 125 mm).

## 5. Tiedostorakenne ja koko

```
pikkuapit/
  yhteinen/
    tyylit.css  ui.js  geom.js  ryhmittely.js  sijoittelu.js
    merkinta.js  kantaus.js  menekki.js  piirto.js  tyokortti.js
  laskurit/
    seina.html  katto.html  huuva.html  kartio.html  ...
  testit/
    syotteet/*.json  odotetut/*.json  aja.js
```

- Jokainen laskuri-html lataa vain tarvitsemansa moottorit tavallisilla script-tageilla ja versiotunnuksella (`?v=`).
- Yhteiset tiedostot ladataan kerran ja jäävät selaimen välimuistiin. Arvio: 15–40 kB per laskuri-html (arvio, ei mitattu).
- Fontit: paikalliset kopiot, ei Google Fonts -kutsuja, jotta sivu toimii ilman nettiä.
- Yrityksen nimi ja logo tulevat asetuksista, ei kovakoodattuna. Nykyisissä tiedostoissa teksti "KALAJOEN PELTITYÖ" on kiinteä.

## 6. Testit ensin

1. Ennen refaktorointia otetaan nykyisistä laskimista **kultaiset tulokset**: noin 20 syötettä per laskuri, ja tulos tallennetaan tiedostoon.
2. Jokaisen muutoksen jälkeen ajetaan sama syötesarja ja tulokset verrataan. Ero kertoo heti, mikä meni rikki.
3. Moottorit ovat DOM-vapaita, joten testi ajetaan Nodella ilman selainta.
4. Testit suojaavat myös vastuun: jos laskuri antaa väärän materiaalimäärän, joku maksaa. Jokaiselle laskurille kerätään testikokoelma oikeilla työmaaesimerkeillä.

## 7. Siirtymä: vaiheet, joista jokainen jättää kaiken toimivaksi

0. **Kultaiset testit** nykyisille tiedostoille.
1. **Erota laskenta käyttöliittymästä** huuvassa (kartio on jo valmis). Poista laskimen kuolleet funktiot.
2. **Siirrä yhteiset apufunktiot ja tyylit** kansioon `yhteinen/` (ui.js, tyylit.css, geom.js).
3. **Yhdistä ryhmittely ja sijoittelu** (huuvan kaistat + kartion reunasijoittelu).
4. **Yhdistä merkintä** (pisteet ja ketjumitat).
5. **Yleistä seinän sarakelogiikka monikulmioksi** → kattolaskuri v1 ja vaakalaudoitus.
6. **Piirto ja työkortti** yhteisiksi.
7. **Kanttausluvut** yhdistetään vasta lopuksi, jos hyöty on selvä.

## 8. Avoimet asiat

- Tallennuspaikat: GitHub (koodi), Supabase (tilit, tilaukset, mahdollinen maksu), selain (syötteet). Suunnitellaan erikseen.
- Laskutus ja hinnoittelu: kuukausimaksu, merchant of record -palvelu vs. oma laskutus. Päätetään myöhemmin.
- Pyöristys (käyttäjän valinta), aukot (piippu, ikkuna), kaltevuus syöttötapana: myöhemmin.
- Ensimmäinen julkaistava työkalu: seinäpeltilaskuri. Siivottava ennen julkaisua: logo pois, kuolleet funktiot pois, siivujen 4–10 kpl-kenttä päivittämään leveyden yhteissumma, fontit paikallisiksi.
