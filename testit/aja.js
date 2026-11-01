/* Pikkuäpit: testiajuri. Käyttö: node testit/aja.js
   1) Yksikkötestit yhteisille funktioille.
   2) Kultaiset testit: testit/syotteet/X.json -> laskuri.laske() -> verrataan testit/odotetut/X.json.
   Odotetut tulokset tarkistetaan käsin oikeaa vastausta vasten, ei generoida koodilla. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const juuri = path.join(__dirname, '..');
const PA = require(path.join(juuri, 'yhteinen', 'ui.js'));
fs.readdirSync(path.join(juuri, 'laskurit')).filter(f => f.endsWith('.js'))
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
