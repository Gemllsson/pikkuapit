/* Seinäpellit: käyttöliittymä (lomake, tallennus, tulostus).
   Laskenta on tiedostossa seina.js ja piirto tiedostossa seina-piirto.js. */
(function () {
  'use strict';
  var PA = window.PA, M = PA.laskurit.seina, P = PA.seinaPiirto;
  var AVAIN = 'seina-tila-v1';
  var tila;

  /* ---------- Apufunktiot ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function etsi(id) { return tila.seinat.filter(function (w) { return w.id === id; })[0]; }
  function luku(v) { v = String(v).trim().replace(',', '.'); return v === '' ? null : (isFinite(parseFloat(v)) ? parseFloat(v) : null); }
  function tallenna() { PA.tallenna(AVAIN, tila); }
  function $(sel, juuri) { return (juuri || document).querySelector(sel); }

  function lataa() {
    var t = PA.lataa(AVAIN, null);
    tila = (t && Array.isArray(t.seinat) && t.seinat.length >= 0 && t.seq) ? t : M.oletusSeinat();
  }

  /* ---------- Laskenta yhdelle seinälle ---------- */
  function laske(w) {
    var s = M.syoteTilasta(w);
    return { s: s, r: M.laske(s) };
  }

  /* ---------- Tulokset ---------- */
  function ryhmaRivit(ryhmat) {
    return ryhmat.map(function (g) {
      var leik = g.tilausLeveys !== g.leveys ? ' <span class="leikkaus">(leikataan ' + PA.fmt(g.leveys, 0) + ' mm leveäksi)</span>' : '';
      return '<div class="tulos-rivi"><span>' + PA.fmt(g.tilausLeveys, 0) + ' × ' + PA.fmt(g.korkeus, 0) + ' mm' + leik + '</span><span>' + g.kpl + ' kpl</span></div>';
    }).join('');
  }

  function tulosHTML(w, r) {
    if (!w.paneliLeveys) return '<div class="tulos"><div class="tulos-otsikko">Pellintarve</div><div class="vihje">Syötä paneelin leveys, niin pellit lasketaan.</div></div>';
    if (!r.paneelit.length) return '<div class="tulos"><div class="tulos-otsikko">Pellintarve</div><div class="vihje">Syötä seinän mitat.</div></div>';
    return '<div class="tulos"><div class="tulos-otsikko">Pellintarve</div>' + ryhmaRivit(r.ryhmat) +
      '<div class="tulos-yht"><span>Peltejä yhteensä</span><span>' + r.paneelit.length + ' kpl</span></div></div>';
  }

  function yhteenvetoHTML() {
    var html = '', yht = 0;
    tila.seinat.forEach(function (w) {
      var r = laske(w).r;
      if (!r.paneelit.length) return;
      yht += r.paneelit.length;
      html += '<h3>' + esc(w.nimi) + '</h3>' + ryhmaRivit(r.ryhmat);
    });
    if (!html) return '<div class="vihje">Yhteenveto näkyy, kun seinien mitat ja paneelin leveys on syötetty.</div>';
    return html + '<div class="tulos-yht"><span>Peltejä yhteensä</span><span>' + yht + ' kpl</span></div>';
  }

  /* ---------- Päivitys syötön jälkeen (ei piirrä korttia uudelleen) ---------- */
  function paivitaAuto(w) {
    var kortti = $('[data-wall="' + w.id + '"]');
    if (!kortti) return;
    var oik = $('[data-k="korkeusOik"]', kortti);
    if (oik && document.activeElement !== oik) {
      oik.value = w.oikAuto ? (w.korkeusVas == null ? '' : w.korkeusVas) : (w.korkeusOik == null ? '' : w.korkeusOik);
    }
    var tagOik = $('[data-tag="korkeusOik"]', kortti);
    if (tagOik) tagOik.textContent = w.oikAuto ? '(sama kuin vasen)' : '';
    var hx = $('[data-k="harjaX"]', kortti);
    if (hx && document.activeElement !== hx) {
      hx.value = w.harjaX != null ? w.harjaX : (w.leveys > 0 ? Math.round(w.leveys / 2) : '');
    }
    var tagHx = $('[data-tag="harjaX"]', kortti);
    if (tagHx) tagHx.textContent = w.harjaX == null ? '(keskellä)' : '';
  }

  function paivita(w) {
    var x = laske(w);
    var kuva = $('#kuva-' + w.id), tulos = $('#tulos-' + w.id);
    if (kuva) kuva.innerHTML = P.mitatOk(x.s) ? P.ruutu(x.s, x.r.paneelit) : '<div class="tyhja">Syötä seinän mitat, niin kuva piirtyy tähän.</div>';
    if (tulos) tulos.innerHTML = tulosHTML(w, x.r);
    $('#yhteenveto').innerHTML = yhteenvetoHTML();
    paivitaAuto(w);
    tallenna();
  }

  /* ---------- Kortin HTML ---------- */
  function kentta(w, k, otsikko, auto) {
    var v = w[k];
    return '<div><label>' + otsikko + (auto ? ' <span class="auto-tag" data-tag="' + k + '"></span>' : '') + '</label>' +
      '<input type="number" inputmode="numeric" data-id="' + w.id + '" data-k="' + k + '" value="' + (v == null ? '' : esc(v)) + '"></div>';
  }
  function seg(w, act, valinnat, nykyinen) {
    return '<div class="seg">' + valinnat.map(function (o) {
      return '<button type="button" class="' + (nykyinen === o[0] ? 'on' : '') + '" data-id="' + w.id + '" data-act="' + act + '" data-v="' + o[0] + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }

  function aukkoHTML(w, a) {
    var ikk = a.tyyppi === 'ikkuna';
    function f(k, otsikko) {
      return '<div><label>' + otsikko + '</label><input type="number" inputmode="numeric" data-id="' + w.id + '" data-a="' + a.id + '" data-k="' + k + '" value="' + (a[k] == null ? '' : esc(a[k])) + '"></div>';
    }
    return '<div class="aukko"><div><label>Tyyppi</label><select data-id="' + w.id + '" data-a="' + a.id + '" data-k="tyyppi">' +
      '<option value="ovi"' + (ikk ? '' : ' selected') + '>Ovi</option><option value="ikkuna"' + (ikk ? ' selected' : '') + '>Ikkuna</option></select></div>' +
      f('x', 'Vas. reunasta') + f('leveys', 'Leveys') + f('korkeus', 'Korkeus') + (ikk ? f('alaKorkeus', 'Lattiasta') : '') +
      '<button type="button" class="vaara poista" data-id="' + w.id + '" data-act="poista-aukko" data-v="' + a.id + '" title="Poista aukko">×</button></div>';
  }

  function korttiHTML(w) {
    var harja = w.tyyppi === 'harja', vino = w.tyyppi === 'vino';
    var mitat;
    if (harja) {
      mitat = '<div class="rivi k3">' + kentta(w, 'leveys', 'Leveys mm') + kentta(w, 'korkeusVas', 'Korkeus vas. mm') + kentta(w, 'korkeusOik', 'Korkeus oik. mm', true) + '</div>' +
        '<div class="rivi k2">' + kentta(w, 'harjaKorkeus', 'Harjan korkeus mm') + kentta(w, 'harjaX', 'Harjan sijainti vas. reunasta mm', true) + '</div>';
    } else if (vino) {
      mitat = '<div class="rivi k3">' + kentta(w, 'leveys', 'Leveys mm') + kentta(w, 'korkeusVas', 'Korkeus vas. mm') + kentta(w, 'korkeusOik', 'Korkeus oik. mm') + '</div>';
    } else {
      mitat = '<div class="rivi k2">' + kentta(w, 'leveys', 'Leveys mm') + kentta(w, 'korkeus', 'Korkeus mm') + '</div>';
    }
    var peili = (harja || vino) ? '<button type="button" class="pieni" data-id="' + w.id + '" data-act="peili">⎘ Peilikuva</button>' : '';

    return '<section class="kortti" data-wall="' + w.id + '">' +
      '<div class="seina-otsikko"><input class="nimi" data-id="' + w.id + '" data-k="nimi" value="' + esc(w.nimi) + '" aria-label="Seinän nimi">' +
      '<div class="toiminnot"><button type="button" class="pieni" data-id="' + w.id + '" data-act="kopioi">⎘ Kopioi</button>' + peili +
      '<button type="button" class="pieni" data-id="' + w.id + '" data-act="tulosta">🖨 Tulosta kuva</button>' +
      '<button type="button" class="pieni vaara" data-id="' + w.id + '" data-act="poista">Poista</button></div></div>' +
      '<div class="seina-sisus"><div class="lomake">' +
      '<div class="ryhma"><label>Seinän tyyppi</label>' + seg(w, 'tyyppi', [['suora', 'Suora'], ['vino', 'Vino'], ['harja', 'Harja']], w.tyyppi) + '</div>' +
      mitat +
      '<div class="rivi k2">' + kentta(w, 'paneliLeveys', 'Paneelin leveys mm') +
      '<div><label>Pikavalinta</label>' + seg(w, 'pw', [['1090', '1090'], ['1180', '1180']], String(w.paneliLeveys)) + '</div></div>' +
      '<div class="ryhma"><label>Täydet pellit aloitetaan</label>' + seg(w, 'aloitus', [['vasen', 'Vasemmalta'], ['oikea', 'Oikealta']], w.aloitus) + '</div>' +
      '<div class="ryhma"><label>Viimeinen (jäännös)pelti</label>' + seg(w, 'jaannos', [['tayslevea', 'Täysleveä'], ['tarkka', 'Tarkka mitta']], w.jaannos !== 'tarkka' ? 'tayslevea' : 'tarkka') +
      '<p class="vihje">Täysleveä: reunaan tulee kokonainen pelti, joka leikataan työmaalla. Tarkka mitta: kapea pelti tehdään verstaalla oikeaan leveyteen. Joitakin profiileja (esim. KP-20) ei voi muovata kapeana.</p></div>' +
      '<div class="ryhma"><label>Ovet ja ikkunat</label>' +
      ((w.aukot || []).length ? w.aukot.map(function (a) { return aukkoHTML(w, a); }).join('') : '<p class="vihje">Ei aukkoja. Oven tai ikkunan kohdalle lasketaan pellit aukon ylä- ja alapuolelle.</p>') +
      '<button type="button" class="pieni" data-id="' + w.id + '" data-act="lisaa-aukko">+ Lisää aukko</button></div>' +
      '</div><div class="kuva"><div id="kuva-' + w.id + '"></div><div id="tulos-' + w.id + '"></div></div></div></section>';
  }

  function piirraKaikki() {
    var cont = $('#seinat');
    cont.innerHTML = tila.seinat.length ? tila.seinat.map(korttiHTML).join('') : '<div class="kortti"><div class="kortti-sisalto" style="padding-top:14px">Ei seiniä. Lisää seinä ylhäältä.</div></div>';
    tila.seinat.forEach(paivita);
    if (!tila.seinat.length) { $('#yhteenveto').innerHTML = yhteenvetoHTML(); tallenna(); }
  }

  /* ---------- Toiminnot ---------- */
  function lisaaSeina() {
    tila.seinat.push(M.uusiSeina(tila.seq++, 'Seinä ' + (tila.seinat.length + 1), 'suora'));
    piirraKaikki();
    var kortit = document.querySelectorAll('[data-wall]');
    if (kortit.length) kortit[kortit.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function kopioi(w, peili) {
    var k = JSON.parse(JSON.stringify(w));
    k.id = tila.seq++;
    k.nimi = w.nimi + ' (kopio)';
    k.aukot = []; k.aukkoSeq = 1;               // kopio ei tuo aukkoja mukaan
    if (peili) {
      var tmp = k.korkeusVas; k.korkeusVas = k.korkeusOik; k.korkeusOik = tmp;
      if (w.tyyppi === 'harja' && w.oikAuto) { k.korkeusOik = k.korkeusVas; }
      if (k.harjaX != null && k.leveys) k.harjaX = k.leveys - k.harjaX;
    }
    tila.seinat.splice(tila.seinat.indexOf(w) + 1, 0, k);
    piirraKaikki();
    var kortti = $('[data-wall="' + k.id + '"]');
    if (kortti) kortti.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function vaihdaTyyppi(w, uusi) {
    if (w.tyyppi === 'harja' && uusi !== 'harja' && w.oikAuto) w.korkeusOik = w.korkeusVas;
    if (uusi === 'harja') w.oikAuto = (w.korkeusOik == null || w.korkeusOik === w.korkeusVas);
    if (uusi === 'suora' && w.korkeus == null && w.korkeusVas != null) w.korkeus = Math.max(w.korkeusVas, w.korkeusOik || 0);
    w.tyyppi = uusi;
  }

  function tulosta(lista) {
    var sivut = '', yritys = PA.asetukset().yritys, pvm = new Date().toLocaleDateString('fi-FI');
    lista.forEach(function (w) {
      var x = laske(w);
      if (!x.r.paneelit.length) return;
      sivut += '<div class="tulostesivu"><div class="tulosteotsikko"><b>' + esc(w.nimi) + '</b><span>' + esc(yritys) + (yritys ? ' · ' : '') + pvm + '</span></div>' + P.tuloste(x.s, x.r.paneelit) + '</div>';
    });
    if (!sivut) { alert('Syötä seinän mitat ja paneelin leveys ensin.'); return; }
    $('#tuloste').innerHTML = sivut;
    var tyyli = $('#sivutyyli');
    tyyli.textContent = '@page { size: A4 landscape; margin: 10mm; }';
    function siivoa() { document.body.classList.remove('tulostetaan'); tyyli.textContent = ''; window.removeEventListener('afterprint', siivoa); }
    window.addEventListener('afterprint', siivoa);
    document.body.classList.add('tulostetaan');
    window.print();
  }

  /* ---------- Tapahtumat ---------- */
  document.addEventListener('input', function (e) {
    var t = e.target, id = +t.getAttribute('data-id');
    if (!id || t.tagName === 'SELECT') return;
    var w = etsi(id); if (!w) return;
    var k = t.getAttribute('data-k'), aid = t.getAttribute('data-a');
    if (aid) {
      var a = w.aukot.filter(function (q) { return q.id === +aid; })[0];
      if (a) a[k] = luku(t.value);
    } else if (k === 'nimi') {
      w.nimi = t.value;
    } else if (k === 'korkeusOik') {
      var v = luku(t.value);
      if (v == null) w.oikAuto = true; else { w.oikAuto = false; w.korkeusOik = v; }
    } else {
      w[k] = luku(t.value);              // tyhjä harjaX = keskellä
    }
    paivita(w);
  });

  // Kun kenttä jätetään, automaattiset arvot (sama kuin vasen, keskellä) päivittyvät näkyviin
  document.addEventListener('focusout', function (e) {
    var id = +e.target.getAttribute && +e.target.getAttribute('data-id');
    var w = id && etsi(id); if (w) paivitaAuto(w);
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.tagName !== 'SELECT' || t.getAttribute('data-k') !== 'tyyppi') return;
    var w = etsi(+t.getAttribute('data-id')); if (!w) return;
    var a = w.aukot.filter(function (q) { return q.id === +t.getAttribute('data-a'); })[0];
    if (a) { a.tyyppi = t.value; piirraKaikki(); }
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b) return;
    var act = b.getAttribute('data-act'), v = b.getAttribute('data-v'), id = +b.getAttribute('data-id'), w = id ? etsi(id) : null;
    if (act === 'uusi') return lisaaSeina();
    if (act === 'tulosta-kaikki') return tulosta(tila.seinat);
    if (act === 'alkutila') {
      if (confirm('Palautetaanko alkutila? Kaikki nykyiset seinät ja syötteet poistetaan.')) { tila = M.oletusSeinat(); piirraKaikki(); }
      return;
    }
    if (!w) return;
    if (act === 'tyyppi') vaihdaTyyppi(w, v);
    else if (act === 'pw') w.paneliLeveys = +v;
    else if (act === 'aloitus') w.aloitus = v;
    else if (act === 'jaannos') w.jaannos = v;
    else if (act === 'lisaa-aukko') w.aukot.push({ id: w.aukkoSeq++, tyyppi: 'ovi', x: null, leveys: null, korkeus: null, alaKorkeus: null });
    else if (act === 'poista-aukko') w.aukot = w.aukot.filter(function (a) { return a.id !== +v; });
    else if (act === 'kopioi') return kopioi(w, false);
    else if (act === 'peili') return kopioi(w, true);
    else if (act === 'tulosta') return tulosta([w]);
    else if (act === 'poista') {
      if (confirm('Poistetaanko "' + w.nimi + '"?')) { tila.seinat = tila.seinat.filter(function (q) { return q !== w; }); piirraKaikki(); }
      return;
    }
    piirraKaikki();
  });

  lataa();
  piirraKaikki();
})();
