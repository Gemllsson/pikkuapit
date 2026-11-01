# Pikkuäpit

Pieniä selaimessa toimivia laskureita ammattilaisten arkeen, laskimen käytön sijaan. Alkuun peltisepän työkaluja (seinäpelti, kattopelti, savuhuuva, kartio), myöhemmin muita aloja.

Tila: **testivaihe**. Kaikki on ilmaista ja kehitteillä.

## Periaatteet

- Tavallista HTML:ää, JavaScriptiä ja CSS:ää. Ei rakennustyökaluja, ei moduuleja. Sivut toimivat myös tiedostona avattuina (työmaalla ilman nettiä).
- Laskenta ja käyttöliittymä on erotettu: laskuri tuottaa kappaleita (JSON), yhteiset moottorit hoitavat loput. Katso `docs/ARKKITEHTUURI.md`.
- Yrityksen nimi ja logo tulevat asetuksista, eivät koodista.
- Syötteet tallentuvat käyttäjän omaan selaimeen (localStorage). Palvelinta ei vielä ole.

## Kansiot

```
index.html          etusivu, työkalulista ja asetukset
yhteinen/           yhteiset tiedostot (tyylit.css, ui.js, myöhemmin geom.js, sijoittelu.js ...)
laskurit/           yksittäiset laskurit
testit/             testisyötteet, odotetut tulokset ja ajuri
docs/               suunnitteludokumentit
```

## Testit

Tarvitaan Node.js. Ajo repon juuressa:

```
node testit/aja.js
```

Testit ajetaan aina ennen kuin laskuria muutetaan ja sen jälkeen. Jos tulos muuttuu, ero näkyy heti.

## Uuden laskurin lisääminen

1. Tee `laskurit/nimi.js`, joka lisää `PA.laskurit.nimi = { nimi, oletus, laske(syote) }`. `laske` palauttaa `{ kappaleet, varoitukset, yhteenveto }`. Esimerkki: `laskurit/lape-esimerkki.js`.
2. Lisää testisyöte `testit/syotteet/` ja käsin tarkistettu odotettu tulos `testit/odotetut/` samalla tiedostonimellä.
3. Lisää laskurin kortti etusivun työkalulistaan.

## Julkaisu

GitHub Pages: Settings → Pages → Branch `main`, kansio `/ (root)`. Ilmainen Pages vaatii julkisen repon, joten tänne ei laiteta salaisuuksia, asiakastietoja eikä yrityksen sisäistä koodia.
