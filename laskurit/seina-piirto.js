/* Seinäpeltien piirto (SVG-merkkijonoja). Ei koske DOMiin.
   ruutu(s, paneelit)   -> kuva ruudulle (vaalea teema)
   tuloste(s, paneelit) -> mustavalkoinen kuva tulostukseen, mitat mukana
   s = PA.laskurit.seina.syoteTilasta(w) (täydellinen syöte), paneelit = laskennan tulos.
   Logiikka on siirretty laskin.html:n spPiirraSeina / spTulostusSvg -funktioista. */
(function (juuri) {
  'use strict';
  var PA = juuri.PA || (juuri.PA = {});
  var MONO = 'ui-monospace, SFMono-Regular, Consolas, monospace';

  function apu() { return PA.laskurit.seina._apu; }

  function mitatOk(s) {
    return s.leveys > 0 && (
      (s.tyyppi === 'suora' && s.korkeus > 0) ||
      (s.tyyppi === 'vino' && s.korkeusVas > 0 && s.korkeusOik > 0) ||
      (s.tyyppi === 'harja' && s.korkeusVas > 0 && s.korkeusOik > 0 && s.harjaKorkeus > 0));
  }

  function maxKorkeus(s) {
    return s.tyyppi === 'suora' ? s.korkeus
      : s.tyyppi === 'harja' ? Math.max(s.korkeusVas, s.korkeusOik, s.harjaKorkeus)
      : Math.max(s.korkeusVas, s.korkeusOik);
  }

  // Ääriviivan pisteet (x, korkeus) vastapäivään lattialta
  function ulkopisteet(s) {
    if (s.tyyppi === 'suora') return [[0, 0], [0, s.korkeus], [s.leveys, s.korkeus], [s.leveys, 0]];
    if (s.tyyppi === 'harja') return [[0, 0], [0, s.korkeusVas], [apu().harjaX(s), s.harjaKorkeus], [s.leveys, s.korkeusOik], [s.leveys, 0]];
    return [[0, 0], [0, s.korkeusVas], [s.leveys, s.korkeusOik], [s.leveys, 0]];
  }

  function rajat(s) { return s.paneliLeveys > 0 ? apu().gridRajat(s) : []; }

  // Harjalla mitta kirjoitetaan todelliseen huippukohtaan, jos huippu osuu pellin sisään
  function etiketinX(s, p) {
    var lx = p.x + p.leveys / 2;
    if (s.tyyppi === 'harja') {
      var hx = apu().harjaX(s);
      if (hx > p.x + 0.01 && hx < p.x + p.leveys - 0.01) lx = hx;
    }
    return lx;
  }

  function ruutu(s, paneelit) {
    if (!mitatOk(s)) return '';
    var W = 640, H = 300, m = 24;
    var scale = Math.min((W - 2 * m) / s.leveys, (H - 2 * m) / maxKorkeus(s));
    var originX = (W - s.leveys * scale) / 2, baseY = H - m;
    var px = function (x) { return originX + x * scale; };
    var py = function (h) { return baseY - h * scale; };
    var c = '';

    var pts = ulkopisteet(s).map(function (q) { return px(q[0]).toFixed(1) + ',' + py(q[1]).toFixed(1); }).join(' ');
    c += '<polygon points="' + pts + '" fill="#fff7ea" stroke="#d97706" stroke-width="2" stroke-linejoin="round"/>';

    rajat(s).forEach(function (x) {
      if (x <= 0.01 || x >= s.leveys - 0.01) return;
      c += '<line x1="' + px(x) + '" y1="' + baseY + '" x2="' + px(x) + '" y2="' + py(apu().korkeusKohdassa(s, x)) + '" stroke="#cfc0ac" stroke-width="1"/>';
    });

    (s.aukot || []).forEach(function (a) {
      if (a.x == null || !a.leveys || !a.korkeus) return;
      var ala = (a.tyyppi === 'ikkuna' && a.alaKorkeus > 0) ? a.alaKorkeus : 0;
      var ax0 = px(Math.max(0, a.x)), ax1 = px(Math.min(s.leveys, a.x + a.leveys));
      var ay0 = py(ala + a.korkeus), ay1 = py(ala);
      var col = a.tyyppi === 'ovi' ? '#2563eb' : '#16a34a';
      c += '<rect x="' + ax0 + '" y="' + ay0 + '" width="' + (ax1 - ax0) + '" height="' + (ay1 - ay0) + '" fill="#fff"/>';
      c += '<rect x="' + ax0 + '" y="' + ay0 + '" width="' + (ax1 - ax0) + '" height="' + (ay1 - ay0) + '" fill="' + col + '" fill-opacity="0.15" stroke="' + col + '" stroke-width="1.5"/>';
    });

    // Pituusmitta jokaiselle pellille; vierekkäisistä samanpituisista vain ensimmäiselle
    var edellinen = null;
    (paneelit || []).forEach(function (p) {
      var normaali = !p.aukonYla && !p.aukonAla, piilota = false;
      if (normaali) {
        if (edellinen && Math.abs(edellinen.oikea - p.x) < 0.5 && Math.round(edellinen.korkeus) === Math.round(p.korkeus)) piilota = true;
        edellinen = { oikea: p.x + p.leveys, korkeus: p.korkeus };
      } else { edellinen = null; }
      if (piilota) return;
      var xp = px(etiketinX(s, p));
      var ty = py((p.yPohja || 0) + p.korkeus) + 14;
      c += '<text x="' + xp + '" y="' + ty + '" font-size="11" font-family="' + MONO + '" fill="#6b4f38" text-anchor="middle" transform="rotate(-90 ' + xp + ' ' + ty + ')">' + Math.round(p.korkeus) + '</text>';
    });

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Seinäkuva">' + c + '</svg>';
  }

  function tuloste(s, paneelit) {
    if (!mitatOk(s)) return '';
    var W = 1000, H = 640, mL = 24, mR = 24, mT = 36, mB = 96;
    var maxH = maxKorkeus(s);
    var scale = Math.min((W - mL - mR) / s.leveys, (H - mT - mB) / maxH);
    var originX = mL + ((W - mL - mR) - s.leveys * scale) / 2;
    var baseY = mT + maxH * scale;
    var px = function (x) { return originX + x * scale; };
    var py = function (h) { return baseY - h * scale; };
    var F = 'font-family="' + MONO + '" fill="#000"';
    var c = '<rect width="' + W + '" height="' + H + '" fill="#fff"/>';

    var pts = ulkopisteet(s).map(function (q) { return px(q[0]).toFixed(1) + ',' + py(q[1]).toFixed(1); }).join(' ');
    c += '<polygon points="' + pts + '" fill="none" stroke="#000" stroke-width="2.6" stroke-linejoin="miter"/>';

    var rj = rajat(s);
    rj.forEach(function (x) {
      if (x <= 0.01 || x >= s.leveys - 0.01) return;
      c += '<line x1="' + px(x) + '" y1="' + baseY + '" x2="' + px(x) + '" y2="' + py(apu().korkeusKohdassa(s, x)) + '" stroke="#000" stroke-width="1"/>';
    });

    (s.aukot || []).forEach(function (a) {
      if (a.x == null || !a.leveys || !a.korkeus) return;
      var ala = (a.tyyppi === 'ikkuna' && a.alaKorkeus > 0) ? a.alaKorkeus : 0;
      var x0 = px(Math.max(0, a.x)), x1 = px(Math.min(s.leveys, a.x + a.leveys));
      var y0 = py(ala + a.korkeus), y1 = py(ala);
      c += '<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" fill="#fff" stroke="#000" stroke-width="2"' + (a.tyyppi === 'ovi' ? '' : ' stroke-dasharray="8 4"') + '/>';
      if (a.tyyppi === 'ikkuna') {
        c += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="#000" stroke-width="0.8"/><line x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y0 + '" stroke="#000" stroke-width="0.8"/>';
      }
      var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, fs = Math.max(9, Math.min(15, (x1 - x0) / 7));
      var t = Math.round(a.leveys) + ' × ' + Math.round(a.korkeus);
      c += '<rect x="' + (cx - t.length * fs * 0.32) + '" y="' + (cy - fs * 0.9) + '" width="' + (t.length * fs * 0.64) + '" height="' + (fs * (ala > 0 ? 2.5 : 1.4)) + '" fill="#fff"/>';
      c += '<text x="' + cx + '" y="' + cy + '" font-size="' + fs + '" font-weight="600" text-anchor="middle" ' + F + '>' + t + '</text>';
      if (ala > 0) c += '<text x="' + cx + '" y="' + (cy + fs * 1.2) + '" font-size="' + fs + '" text-anchor="middle" ' + F + '>↑ ' + Math.round(ala) + '</text>';
    });

    (paneelit || []).forEach(function (p) {
      var lx = etiketinX(s, p);
      var ylaH = Math.min((p.yPohja || 0) + p.korkeus, apu().korkeusKohdassa(s, lx));
      var tilaPx = (ylaH - (p.yPohja || 0)) * scale - 14;
      var nStr = String(Math.round(p.korkeus)).length;
      var fs = Math.max(7, Math.min(16, p.leveys * scale * 0.34, tilaPx / (nStr * 0.62)));
      var xp = px(lx), yp = py(ylaH) + 8;
      if (tilaPx / (nStr * 0.62) < 11) {
        var yk = (py(ylaH) + py(p.yPohja || 0)) / 2 + 4;
        c += '<text x="' + xp + '" y="' + yk + '" font-size="12" font-weight="600" text-anchor="middle" ' + F + '>' + Math.round(p.korkeus) + '</text>';
        return;
      }
      c += '<g transform="rotate(-90 ' + xp + ' ' + yp + ')"><text x="' + xp + '" y="' + (yp + fs * 0.35) + '" font-size="' + fs + '" font-weight="600" text-anchor="end" ' + F + '>' + Math.round(p.korkeus) + '</text></g>';
    });

    var yDim = baseY + 22, yTot = baseY + 62;
    rj.forEach(function (x) { c += '<line x1="' + px(x) + '" y1="' + (baseY + 6) + '" x2="' + px(x) + '" y2="' + (yDim + 6) + '" stroke="#000" stroke-width="0.8"/>'; });
    if (rj.length) c += '<line x1="' + px(0) + '" y1="' + yDim + '" x2="' + px(s.leveys) + '" y2="' + yDim + '" stroke="#000" stroke-width="0.8"/>';
    for (var i = 0; i < rj.length - 1; i++) {
      var w = rj[i + 1] - rj[i], fs2 = Math.max(8, Math.min(14, w * scale * 0.3));
      c += '<text x="' + ((px(rj[i]) + px(rj[i + 1])) / 2) + '" y="' + (yDim - 4) + '" font-size="' + fs2 + '" text-anchor="middle" ' + F + '>' + Math.round(w) + '</text>';
    }
    c += '<line x1="' + px(0) + '" y1="' + (baseY + 6) + '" x2="' + px(0) + '" y2="' + (yTot + 6) + '" stroke="#000" stroke-width="0.8"/><line x1="' + px(s.leveys) + '" y1="' + (baseY + 6) + '" x2="' + px(s.leveys) + '" y2="' + (yTot + 6) + '" stroke="#000" stroke-width="0.8"/>';
    c += '<line x1="' + px(0) + '" y1="' + yTot + '" x2="' + px(s.leveys) + '" y2="' + yTot + '" stroke="#000" stroke-width="1.4"/>';
    c += '<text x="' + px(s.leveys / 2) + '" y="' + (yTot + 22) + '" font-size="18" font-weight="600" text-anchor="middle" ' + F + '>' + Math.round(s.leveys) + '</text>';

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">' + c + '</svg>';
  }

  PA.seinaPiirto = { ruutu: ruutu, tuloste: tuloste, mitatOk: mitatOk };
  if (typeof module !== 'undefined' && module.exports) module.exports = PA;
})(typeof window !== 'undefined' ? window : globalThis);
