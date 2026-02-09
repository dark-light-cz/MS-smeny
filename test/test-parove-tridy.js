/**
 * Testy pro algoritmus „Párové třídy“ (js/algoritmy/parove-tridy.js).
 */
(function (global) {
  'use strict';

  var R = global.MSemenyAlgoritmy;
  var V = global.MSemenyVypocetSmen;
  var M = global.MSemenyDataModel;
  var T = global.MSemenyTest;
  if (!T || !R) return;

  function timeToMinuty(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return 0;
    var parts = hhmm.split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }

  var tests = [
    {
      name: 'getAlgoritmus("parove-tridy") vrací algoritmus',
      run: function () {
        var algo = R.getAlgoritmus('parove-tridy');
        T.assert(algo && algo.id === 'parove-tridy' && typeof algo.vypocet === 'function', 'algoritmus Párové třídy');
      }
    },
    {
      name: 'Párové třídy: bez tříd vrátí chybu',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('Z', 2400, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('B');
        var data = { zamestnanci: [z], budovy: [b] };
        var r = V.vypocetSmen(data, 'parove-tridy');
        T.assert(r.ok === false && r.chyba && r.chyba.indexOf('tříd') !== -1, 'chyba o třídách');
      }
    },
    {
      name: 'Párové třídy: 1 budova, 1 třída, 2 kmenové s úvazkem – vrátí přiřazení',
      run: function () {
        if (!M) return;
        var b = M.vytvorBudovu('Pavilon');
        var t = M.vytvorTridu('Třída 1');
        b.tridy.push(t);
        var z1 = M.vytvorZamestnance('Kmenová A', 1860, M.ROLE.UCITELKA, 'kmenová', t.id);
        var z2 = M.vytvorZamestnance('Kmenová B', 1860, M.ROLE.UCITELKA, 'kmenová', t.id);
        var data = {
          zamestnanci: [z1, z2],
          budovy: [b],
          pravidla: {},
          omezeniNeDohromady: []
        };
        var r = V.vypocetSmen(data, 'parove-tridy');
        T.assert(r.ok === true && Array.isArray(r.prirazeni) && r.prirazeni.length > 0, 'ok a přiřazení');
        var den1 = r.prirazeni.filter(function (p) { return p.den === 1; });
        T.assert(den1.length >= 1, 'alespoň jeden záznam na den 1');
        var hasDopoledni = false;
        var hasOdpoledni = false;
        for (var i = 0; i < r.prirazeni.length; i++) {
          var segs = r.prirazeni[i].segmenty || [];
          for (var j = 0; j < segs.length; j++) {
            var odM = timeToMinuty(segs[j].od);
            var doM = timeToMinuty(segs[j].do);
            if (odM <= 7 * 60 + 45 && doM >= 12 * 60) hasDopoledni = true;
            if (odM <= 10 * 60 && doM >= 16 * 60) hasOdpoledni = true;
          }
        }
        T.assert(hasDopoledni && hasOdpoledni, 'segmenty dopolední (do 12) a odpolední (od 10 do 16/17)');
      }
    },
    {
      name: 'Párové třídy: střídání dnů – různé osoby dopolední/odpolední v Po vs Út',
      run: function () {
        if (!M) return;
        var b = M.vytvorBudovu('Pavilon');
        var t = M.vytvorTridu('T1');
        b.tridy.push(t);
        var z1 = M.vytvorZamestnance('A', 1860, M.ROLE.UCITELKA, 'kmenová', t.id);
        var z2 = M.vytvorZamestnance('B', 1860, M.ROLE.UCITELKA, 'kmenová', t.id);
        var data = {
          zamestnanci: [z1, z2],
          budovy: [b],
          pravidla: {},
          omezeniNeDohromady: []
        };
        var r = V.vypocetSmen(data, 'parove-tridy');
        T.assert(r.ok === true, 'výpočet ok');
        var dopoledniPo = [];
        var dopoledniUt = [];
        for (var i = 0; i < r.prirazeni.length; i++) {
          var p = r.prirazeni[i];
          var segs = p.segmenty || [];
          for (var j = 0; j < segs.length; j++) {
            var odM = timeToMinuty(segs[j].od);
            var doM = timeToMinuty(segs[j].do);
            if (odM <= 7 * 60 + 45 && doM >= 12 * 60) {
              if (p.den === 1) dopoledniPo.push(p.zamestnanecId);
              if (p.den === 2) dopoledniUt.push(p.zamestnanecId);
            }
          }
        }
        T.assert(dopoledniPo.length >= 1 && dopoledniUt.length >= 1, 'dopolední v Po i Út');
        var stridaji = (dopoledniPo[0] !== dopoledniUt[0]);
        T.assert(stridaji, 'střídání dopolední (různá osoba v Po a Út)');
      }
    },
    {
      name: 'Párové třídy: jedna učitelka jen v jedné třídě (dvojice ukotvená na celý týden)',
      run: function () {
        if (!M) return;
        var b = M.vytvorBudovu('B');
        b.tridy.push(M.vytvorTridu('T1'));
        b.tridy.push(M.vytvorTridu('T2'));
        var z1 = M.vytvorZamestnance('A', 1860, M.ROLE.UCITELKA, 'kmenová', b.tridy[0].id);
        var z2 = M.vytvorZamestnance('B', 1860, M.ROLE.UCITELKA, 'kmenová', b.tridy[0].id);
        var z3 = M.vytvorZamestnance('C', 1860, M.ROLE.UCITELKA, 'kmenová', b.tridy[1].id);
        var z4 = M.vytvorZamestnance('D', 1860, M.ROLE.UCITELKA, 'kmenová', b.tridy[1].id);
        var r = V.vypocetSmen(
          { zamestnanci: [z1, z2, z3, z4], budovy: [b], pravidla: {}, omezeniNeDohromady: [] },
          'parove-tridy'
        );
        T.assert(r.ok === true, 'výpočet ok');
        var tridyByZam = {};
        for (var i = 0; i < r.prirazeni.length; i++) {
          var p = r.prirazeni[i];
          var zamId = p.zamestnanecId;
          if (!tridyByZam[zamId]) tridyByZam[zamId] = {};
          for (var j = 0; j < (p.segmenty || []).length; j++) {
            var tid = p.segmenty[j].tridaId;
            if (tid) tridyByZam[zamId][tid] = true;
          }
        }
        for (var zamId in tridyByZam) {
          var count = Object.keys(tridyByZam[zamId]).length;
          T.assert(count <= 1, 'učitelka ' + zamId + ' jen v jedné třídě (počet tříd: ' + count + ')');
        }
      }
    },
    {
      name: 'Párové třídy: žádný segment není jen „Budova (společně)“ – vždy tridaId',
      run: function () {
        if (!M) return;
        var b = M.vytvorBudovu('B');
        b.tridy.push(M.vytvorTridu('T'));
        var z1 = M.vytvorZamestnance('Z1', 2500, M.ROLE.UCITELKA, 'kmenová', b.tridy[0].id);
        var z2 = M.vytvorZamestnance('Z2', 2500, M.ROLE.UCITELKA, 'kmenová', b.tridy[0].id);
        var r = V.vypocetSmen(
          { zamestnanci: [z1, z2], budovy: [b], pravidla: {}, omezeniNeDohromady: [] },
          'parove-tridy'
        );
        T.assert(r.ok === true, 'výpočet ok');
        for (var i = 0; i < r.prirazeni.length; i++) {
          var segs = r.prirazeni[i].segmenty || [];
          for (var j = 0; j < segs.length; j++) {
            T.assert(segs[j].tridaId != null, 'každý segment má tridaId (ne jen Budova společně)');
          }
        }
      }
    },
    {
      name: 'Párové třídy: výstup má formát prirazeni s den, zamestnanecId, segmenty',
      run: function () {
        if (!M) return;
        var b = M.vytvorBudovu('B');
        b.tridy.push(M.vytvorTridu('T'));
        var z1 = M.vytvorZamestnance('Z1', 2500, M.ROLE.UCITELKA, 'kmenová', b.tridy[0].id);
        var z2 = M.vytvorZamestnance('Z2', 2500, M.ROLE.UCITELKA, 'kmenová', b.tridy[0].id);
        var r = V.vypocetSmen(
          { zamestnanci: [z1, z2], budovy: [b], pravidla: {}, omezeniNeDohromady: [] },
          'parove-tridy'
        );
        T.assert(r.ok === true, 'ok');
        for (var i = 0; i < r.prirazeni.length; i++) {
          var p = r.prirazeni[i];
          T.assert(typeof p.den === 'number' && p.den >= 1 && p.den <= 5, 'den 1–5');
          T.assert(p.zamestnanecId && Array.isArray(p.segmenty), 'zamestnanecId a segmenty');
          for (var s = 0; s < p.segmenty.length; s++) {
            T.assert(p.segmenty[s].od && p.segmenty[s].do, 'segment má od a do');
          }
        }
      }
    },
    {
      name: 'Párové třídy: chybějící směny doplněny zbývající učitelkou (např. pátek)',
      run: function () {
        if (!M) return;
        var b = M.vytvorBudovu('B');
        var t = M.vytvorTridu('T1');
        b.tridy.push(t);
        var z1 = M.vytvorZamestnance('Kmenová A', 1860, M.ROLE.UCITELKA, 'kmenová', t.id, [{ den: 5, od: '07:00', do: '17:00' }]);
        var z2 = M.vytvorZamestnance('Kmenová B', 1860, M.ROLE.UCITELKA, 'kmenová', t.id);
        var z3 = M.vytvorZamestnance('Doplňující', 1200, M.ROLE.UCITELKA, 'vykrývací');
        var data = { zamestnanci: [z1, z2, z3], budovy: [b], pravidla: {}, omezeniNeDohromady: [] };
        var r = V.vypocetSmen(data, 'parove-tridy');
        T.assert(r.ok === true, 'výpočet ok');
        var den5Z3 = r.prirazeni.filter(function (p) { return p.den === 5 && p.zamestnanecId === z3.id; });
        T.assert(den5Z3.length >= 1, 'zbývající učitelka (z3) má alespoň jeden segment v pátek');
        var hasT1 = false;
        for (var i = 0; i < (den5Z3[0].segmenty || []).length; i++) {
          if (den5Z3[0].segmenty[i].tridaId === t.id) hasT1 = true;
        }
        T.assert(hasT1, 'doplnění je přiřazeno do třídy T1');
      }
    },
    {
      name: 'Párové třídy: doplňující učitelka ideálně v jedné třídě',
      run: function () {
        if (!M) return;
        var b = M.vytvorBudovu('B');
        b.tridy.push(M.vytvorTridu('T1'));
        b.tridy.push(M.vytvorTridu('T2'));
        var z1 = M.vytvorZamestnance('A', 1860, M.ROLE.UCITELKA, 'kmenová', b.tridy[0].id);
        var z2 = M.vytvorZamestnance('B', 1860, M.ROLE.UCITELKA, 'kmenová', b.tridy[0].id);
        var z3 = M.vytvorZamestnance('C', 2400, M.ROLE.UCITELKA, 'vykrývací');
        var data = { zamestnanci: [z1, z2, z3], budovy: [b], pravidla: {}, omezeniNeDohromady: [] };
        var r = V.vypocetSmen(data, 'parove-tridy');
        T.assert(r.ok === true, 'výpočet ok');
        var tridyZ3 = {};
        for (var i = 0; i < r.prirazeni.length; i++) {
          var p = r.prirazeni[i];
          if (p.zamestnanecId !== z3.id) continue;
          for (var s = 0; s < (p.segmenty || []).length; s++) {
            var tid = p.segmenty[s].tridaId;
            if (tid) tridyZ3[tid] = true;
          }
        }
        var pocetTrid = Object.keys(tridyZ3).length;
        T.assert(pocetTrid >= 1, 'doplňující má alespoň jednu třídu');
        T.assert(pocetTrid <= 2, 'doplňující nejvýše dvě třídy (T1 má pár, T2 mezery – může vykrýt jen T2 nebo obě)');
      }
    },
    {
      name: 'Párové třídy: minDelkaBlokuMinuty z konfigurace – vyplňují se jen dostatečně dlouhé směny',
      run: function () {
        if (!M) return;
        var b = M.vytvorBudovu('B');
        b.tridy.push(M.vytvorTridu('T'));
        var z = M.vytvorZamestnance('Jediná', 2400, M.ROLE.UCITELKA, 'vykrývací');
        var data = {
          zamestnanci: [z],
          budovy: [b],
          pravidla: { minDelkaBlokuMinuty: 300 },
          omezeniNeDohromady: []
        };
        var r = V.vypocetSmen(data, 'parove-tridy');
        T.assert(r.ok === true, 'výpočet ok');
        var dopoledniCount = 0;
        for (var i = 0; i < r.prirazeni.length; i++) {
          var segs = r.prirazeni[i].segmenty || [];
          for (var j = 0; j < segs.length; j++) {
            var odM = timeToMinuty(segs[j].od);
            var doM = timeToMinuty(segs[j].do);
            if (odM <= 7 * 60 + 45 && doM >= 12 * 60) dopoledniCount++;
          }
        }
        T.assert(dopoledniCount === 0, 'při minDelkaBlokuMinuty 300 se nevyplňuje dopolední 7:45–12 (255 min < 300)');
        var odpoledniCount = 0;
        for (var i = 0; i < r.prirazeni.length; i++) {
          var segs = r.prirazeni[i].segmenty || [];
          for (var j = 0; j < segs.length; j++) {
            var odM = timeToMinuty(segs[j].od);
            var doM = timeToMinuty(segs[j].do);
            if (odM <= 10 * 60 && doM >= 16 * 60) odpoledniCount++;
          }
        }
        T.assert(odpoledniCount >= 1, 'vyplňují se odpolední směny 10–16 (360 min >= 300)');
      }
    },
    {
      name: 'Párové třídy: odpolední blok zkrácen zprava při nedostatku zbývajícího úvazku',
      run: function () {
        if (!M) return;
        var b = M.vytvorBudovu('B');
        b.tridy.push(M.vytvorTridu('T'));
        var z = M.vytvorZamestnance('Jediná', 480, M.ROLE.UCITELKA, 'vykrývací');
        var data = {
          zamestnanci: [z],
          budovy: [b],
          pravidla: { minDelkaBlokuMinuty: 120 },
          omezeniNeDohromady: []
        };
        var r = V.vypocetSmen(data, 'parove-tridy');
        T.assert(r.ok === true, 'výpočet ok');
        var odpoledniZkracene = [];
        for (var i = 0; i < r.prirazeni.length; i++) {
          var segs = r.prirazeni[i].segmenty || [];
          for (var j = 0; j < segs.length; j++) {
            var odM = timeToMinuty(segs[j].od);
            var doM = timeToMinuty(segs[j].do);
            if (odM <= 10 * 60 && doM >= 10 * 60 && (doM - odM) < 360) {
              odpoledniZkracene.push(doM - odM);
            }
          }
        }
        T.assert(odpoledniZkracene.length >= 1, 'alespoň jeden odpolední blok je zkrácen (kratší než 360 min)');
        T.assert(odpoledniZkracene.some(function (len) { return len >= 120; }), 'zkrácený blok má délku alespoň minDelkaBlokuMinuty (120)');
      }
    },
    {
      name: 'Párové třídy: žádný přečerpaný úvazek (anonymizovaná konfigurace z chybového reportu)',
      run: function () {
        if (!M || !V || !R) return;
        var Validace = global.MSemenyValidaceNavrhu;
        if (!Validace || typeof Validace.validujNavrh !== 'function') return;

        var b1 = M.vytvorBudovu('budova1');
        var b2 = M.vytvorBudovu('budova2');
        b1.tridy.push(M.vytvorTridu('trida1'));
        b1.tridy.push(M.vytvorTridu('trida2'));
        b1.tridy.push(M.vytvorTridu('trida3'));
        b2.tridy.push(M.vytvorTridu('trida4'));
        b2.tridy.push(M.vytvorTridu('trida5'));

        var zam = [];
        zam.push(M.vytvorZamestnance('zastupkyne1', 1200, M.ROLE.UCITELKA, 'vykrývací'));
        zam.push(M.vytvorZamestnance('reditelka1', 720, M.ROLE.UCITELKA, 'vykrývací'));
        var tid = [b1.tridy[0].id, b1.tridy[0].id, b1.tridy[1].id, b1.tridy[1].id, b1.tridy[2].id, b1.tridy[2].id, b2.tridy[0].id, b2.tridy[0].id, b2.tridy[1].id, b2.tridy[1].id];
        for (var i = 0; i < 10; i++) {
          zam.push(M.vytvorZamestnance('ucitelka' + (i + 1), 1860, M.ROLE.UCITELKA, 'kmenová', tid[i]));
        }
        zam.push(M.vytvorZamestnance('ucitelka9b', 1590, M.ROLE.UCITELKA, 'vykrývací'));
        zam.push(M.vytvorZamestnance('ucitelka5', 150, M.ROLE.UCITELKA, 'vykrývací'));
        zam.push(M.vytvorZamestnance('ucitelka3', 210, M.ROLE.UCITELKA, 'vykrývací'));
        zam.push(M.vytvorZamestnance('ucitelka4', 480, M.ROLE.UCITELKA, 'vykrývací'));

        var data = {
          zamestnanci: zam,
          budovy: [b1, b2],
          pravidla: { minimalniPrekryvMinuty: 120, zakazPrechodMeziBudovami: true },
          omezeniNeDohromady: []
        };
        var r = V.vypocetSmen(data, 'parove-tridy');
        T.assert(r.ok === true, 'výpočet ok');
        var val = Validace.validujNavrh(r.prirazeni, data);
        var precerpane = (val.polozky || []).filter(function (p) { return p.typ === 'chyba' && p.pravidlo === 'Přečerpaný úvazek'; });
        T.assert(precerpane.length === 0, 'žádný přečerpaný úvazek: ' + (precerpane.map(function (p) { return p.kontext; }).join('; ') || 'ok'));
      }
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    window.MSemenyTestList.push(tests[i]);
  }
})(typeof window !== 'undefined' ? window : this);
