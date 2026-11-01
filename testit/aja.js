/* Pikkuäpit: testiajuri. Käyttö: node testit/aja.js  (tiedostot *-ui.js ovat selainkoodia ja jätetään pois)
   1) Yksikkötestit yhteisille funktioille.
   2) Kultaiset testit: testit/syotteet/X.json -> laskuri.laske() -> verrataan testit/odotetut/X.json.
   Odotetut tulokset tarkistetaan käsin oikeaa vastausta vasten, ei generoida koodilla. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const juuri = path.join(__dirname, '..');
const PA = require(path.join(juuri, 'yhteinen', 'ui.js'));
fs.readdirSync(path.join(juuri, 'laskurit')).filter(f => f.endsWith('.js') && !f.endsWith('-ui.js'))
  .forEach(f => require(path.join(juuri, 'laskurit', f)));

let ok = 0, vika = 0;
function testi(nimi, fn) {
  try { fn(); ok++; console.log('  ok   ' + nimi); }
  catch (e) { vika++; console.log('  VIKA ' + nimi + '\n       ' + e.message.split('\n')[0]); }
}

console.log('Yhteiset funktiot');
testi('luku: pilkku desimaalina', () => assert.strictEqual(PA.luku('1 234,5'), 1234.5));
testi('luku: piste desimaalina', () => assert.strictEqual(PA.luku('12.25'), 12.25));
testi('luku: tyhjä ja roska -> 0', () => { assert.strictEqual(PA.luku(''), 0); assert.strictEqual(PA.luku('abc'), 0); });
testi('rd: pyöristys', () => { assert.strictEqual(PA.rd(1.005, 2), 1.01); assert.strictEqual(PA.rd(2.5), 3); });
testi('fmt: pilkku, ei turhia nollia', () => {
  assert.strictEqual(PA.fmt(1234.5), '1234,5');
  assert.strictEqual(PA.fmt(3), '3');
  assert.strictEqual(PA.fmt(2.349, 2), '2,35');
});

console.log('Seinälaskurin alkutila ja piirto');
require(path.join(juuri, 'laskurit', 'seina-piirto.js'));
const SM = PA.laskurit.seina;
testi('alkutilassa kaksi seinää, paneelin leveys tyhjä', () => {
  const t = SM.oletusSeinat();
  assert.deepStrictEqual(t.seinat.map(w => w.nimi), ['Päätyseinä', 'Etuseinä']);
  assert.deepStrictEqual(t.seinat.map(w => w.paneliLeveys), [null, null]);
  assert.deepStrictEqual(t.seinat.map(w => w.aukot.length), [0, 0]);
});
testi('päätyseinä: 8000 leveä, 3500 / 3500, harja 5000 keskellä', () => {
  const w = SM.oletusSeinat().seinat[0];
  const s = SM.syoteTilasta(w);
  assert.strictEqual(s.leveys, 8000); assert.strictEqual(s.korkeusVas, 3500);
  assert.strictEqual(s.korkeusOik, 3500); assert.strictEqual(s.harjaKorkeus, 5000);
  assert.strictEqual(s.harjaX, null);   // null = keskellä (4000)
});
testi('harjaseinän oikea korkeus seuraa vasenta, kunnes sitä muutetaan', () => {
  const w = SM.oletusSeinat().seinat[0];
  w.korkeusVas = 3600;
  assert.strictEqual(SM.syoteTilasta(w).korkeusOik, 3600);
  w.oikAuto = false; w.korkeusOik = 3200;
  assert.strictEqual(SM.syoteTilasta(w).korkeusOik, 3200);
});
testi('ilman paneelin leveyttä ei laskennan tulosta', () => {
  const w = SM.oletusSeinat().seinat[0];
  assert.strictEqual(SM.laske(SM.syoteTilasta(w)).paneelit.length, 0);
});
testi('päätyseinä 1090 mm paneelilla: 8 peltiä, pisin 5000 harjalla', () => {
  const w = SM.oletusSeinat().seinat[0]; w.paneliLeveys = 1090;
  const r = SM.laske(SM.syoteTilasta(w));
  assert.strictEqual(r.paneelit.length, 8);   // 7 täyttä + 370 jäännös
  assert.strictEqual(Math.max(...r.ryhmat.map(g => g.korkeus)), 5000);
});
testi('etuseinä 1090 mm paneelilla: 5 täyttä + jäännös, kaikki 3500', () => {
  const w = SM.oletusSeinat().seinat[1]; w.paneliLeveys = 1090;
  const r = SM.laske(SM.syoteTilasta(w));
  assert.strictEqual(r.paneelit.length, 6);
  assert.deepStrictEqual(r.ryhmat.map(g => g.korkeus), [3500, 3500]);
});
testi('koonti: päätyseinän pellit yhteensä 8 kpl ja 34961 mm, etuseinä 6 kpl ja 21000 mm', () => {
  const t = SM.oletusSeinat();
  t.seinat.forEach(w => { w.paneliLeveys = 1090; });
  const k0 = SM.koonti(SM.laske(SM.syoteTilasta(t.seinat[0])).ryhmat);
  const k1 = SM.koonti(SM.laske(SM.syoteTilasta(t.seinat[1])).ryhmat);
  assert.deepStrictEqual(k0, { kpl: 8, pituusMm: 34961 });
  assert.deepStrictEqual(k1, { kpl: 6, pituusMm: 21000 });
});
testi('piirto tuottaa svg:n ja tyhjän ilman mittoja', () => {
  const w = SM.oletusSeinat().seinat[0]; w.paneliLeveys = 1090;
  const s = SM.syoteTilasta(w), r = SM.laske(s);
  assert.ok(PA.seinaPiirto.ruutu(s, r.paneelit).startsWith('<svg'));
  assert.ok(PA.seinaPiirto.tuloste(s, r.paneelit).startsWith('<svg'));
  assert.strictEqual(PA.seinaPiirto.ruutu(SM.syoteTilasta(SM.uusiSeina(9, 'x', 'suora')), []), '');
});

console.log('Kultaiset testit');
const syoteKansio = path.join(__dirname, 'syotteet');
fs.readdirSync(syoteKansio).filter(f => f.endsWith('.json')).forEach(f => {
  testi(f, () => {
    const s = JSON.parse(fs.readFileSync(path.join(syoteKansio, f), 'utf8'));
    const odotettu = JSON.parse(fs.readFileSync(path.join(__dirname, 'odotetut', f), 'utf8'));
    const laskuri = PA.laskurit[s.laskuri];
    assert.ok(laskuri, 'laskuria ei löydy: ' + s.laskuri);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(laskuri.laske(s.syote))), odotettu);
  });
});

console.log('\n' + ok + ' läpi, ' + vika + ' vikaa');
process.exit(vika ? 1 : 0);
