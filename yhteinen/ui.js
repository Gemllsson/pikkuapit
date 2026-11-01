/* Pikkuäpit: yhteiset apufunktiot.
   Tavallinen script-tiedosto (ei moduuli), jotta sivu toimii myös tiedostona avattuna.
   Puhtaat funktiot (luku, fmt, rd) eivät koske DOMiin, joten ne toimivat myös Nodessa. */
(function (juuri) {
  'use strict';

  var PA = juuri.PA || (juuri.PA = {});
  PA.laskurit = PA.laskurit || {};

  /* ---------- Luvut (suomalainen desimaalipilkku) ---------- */

  // "1 234,5" / "1234.5" / 1234.5 -> 1234.5. Tyhjä tai virheellinen -> 0.
  PA.luku = function (arvo) {
    if (typeof arvo === 'number') return isFinite(arvo) ? arvo : 0;
    if (arvo == null) return 0;
    var s = String(arvo).replace(/\s| /g, '').replace(',', '.');
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  };

  // Pyöristys n desimaaliin (oletus 0).
  PA.rd = function (x, n) {
    var k = Math.pow(10, n || 0);
    return Math.round((x + Number.EPSILON) * k) / k;
  };

  // Muotoilu suomalaisittain: 1234.5 -> "1234,5". Ei turhia nollia.
  PA.fmt = function (x, desimaalit) {
    if (x == null || !isFinite(x)) return '';
    var d = desimaalit == null ? 1 : desimaalit;
    var s = PA.rd(x, d).toFixed(d);
    if (d > 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('.', ',');
  };

  /* ---------- Tallennus selaimeen (localStorage) ---------- */
  // Kaikki kutsut try/catch-suojassa: yksityinen selaus tai estetty tallennus ei saa kaataa sivua.

  PA.tallenna = function (avain, arvo) {
    try { localStorage.setItem('pa:' + avain, JSON.stringify(arvo)); return true; }
    catch (e) { return false; }
  };

  PA.lataa = function (avain, oletus) {
    try {
      var s = localStorage.getItem('pa:' + avain);
      return s == null ? oletus : JSON.parse(s);
    } catch (e) { return oletus; }
  };

  PA.poista = function (avain) {
    try { localStorage.removeItem('pa:' + avain); } catch (e) { /* ei väliä */ }
  };

  /* ---------- Asetukset (esim. yrityksen nimi tulosteisiin) ---------- */
  // Ei kovakoodattua yrityksen nimeä: jokainen käyttäjä asettaa omansa.

  PA.asetukset = function () {
    return Object.assign({ yritys: '', logo: '' }, PA.lataa('asetukset', {}));
  };

  PA.asetaAsetus = function (avain, arvo) {
    var a = PA.lataa('asetukset', {});
    a[avain] = arvo;
    return PA.tallenna('asetukset', a);
  };

  /* ---------- Avattavat kortit (vain selaimessa) ---------- */
  // Käyttö: <div class="kortti"><div class="kortti-otsikko">..</div><div class="kortti-sisalto">..</div></div>

  PA.alustaKortit = function (juuriElementti) {
    if (typeof document === 'undefined') return;
    var ala = juuriElementti || document;
    var otsikot = ala.querySelectorAll('.kortti-otsikko');
    for (var i = 0; i < otsikot.length; i++) {
      otsikot[i].addEventListener('click', function () {
        this.parentNode.classList.toggle('kiinni');
      });
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PA;
})(typeof window !== 'undefined' ? window : globalThis);
