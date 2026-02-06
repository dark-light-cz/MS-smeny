/**
 * Testy pro výpočet návrhu směn (js/vypocet-smen.js).
 * Nový algoritmus: plánuje souvislé směny a ověřuje pravidla.
 */
(function (global) {
  'use strict';

  var V = global.MSemenyVypocetSmen;
  var M = global.MSemenyDataModel;
  var T = global.MSemenyTest;
  if (!T || !V) return;

  var tests = [
    {
      name: 'MSemenyVypocetSmen existuje a má vypocetSmen',
      run: function () {
        T.assert(V && typeof V.vypocetSmen === 'function', 'vypocetSmen');
      }
    },
    {
      name: 'vypocetSmen bez zaměstnanců vrátí ok: false a chybu',
      run: function () {
        var data = {
          zamestnanci: [],
          budovy: [{ id: 'b1', nazev: 'B', tridy: [] }],
          minMaxSloty: M ? M.vychoziMinMaxSloty() : [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0 }]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === false && r.chyba && r.chyba.indexOf('zaměstnanc') !== -1, 'chyba o zaměstnancích');
      }
    },
    {
      name: 'vypocetSmen bez slotů vrátí ok: false a chybu',
      run: function () {
        var data = {
          zamestnanci: M ? [M.vytvorZamestnance('Test', 480, M.ROLE.UCITELKA)] : [],
          budovy: [],
          minMaxSloty: []
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === false && r.chyba && r.chyba.indexOf('slot') !== -1, 'chyba o slotech');
      }
    },
    {
      name: 'vypocetSmen s jedním zaměstnancem, jednou budovou a slotem minNaBudovu 1 vrátí ok a přiřazení',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('Jedna', 480, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Pavilon');
        var slot = { id: 's1', od: '07:00', do: '07:45', minNaBudovu: 1, maxNaBudovu: null, minNaTridu: 0, maxNaTridu: null, dny: [], rotace: false };
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [slot]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true && Array.isArray(r.prirazeni), 'ok a prirazeni');
        T.assert(r.prirazeni.length === 5, '5 přiřazení (5 dnů × 1 zaměstnanec)');
        T.assert(r.prirazeni[0].den >= 1 && r.prirazeni[0].den <= 5 && r.prirazeni[0].zamestnanecId === z.id, 'přiřazení má den a zamestnanecId');
        T.assert(Array.isArray(r.prirazeni[0].segmenty) && r.prirazeni[0].segmenty.length > 0, 'přiřazení má segmenty');
      }
    },
    {
      name: 'Směna zaměstnance je souvislý blok (segmenty navazují bez mezer)',
      run: function () {
        if (!M) return;
        var z1 = M.vytvorZamestnance('A', 1860, M.ROLE.UCITELKA);
        var z2 = M.vytvorZamestnance('B', 1860, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Budova');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var data = {
          zamestnanci: [z1, z2],
          budovy: [b],
          minMaxSloty: [
            { id: 's1', od: '07:00', do: '07:45', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false },
            { id: 's2', od: '07:45', do: '16:00', minNaBudovu: 0, minNaTridu: 1, dny: [], rotace: false },
            { id: 's3', od: '16:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }
          ]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        // Ověřit, že segmenty každého zaměstnance navazují
        for (var i = 0; i < r.prirazeni.length; i++) {
          var p = r.prirazeni[i];
          var segs = p.segmenty;
          for (var j = 1; j < segs.length; j++) {
            T.assert(segs[j].od === segs[j - 1].do,
              p.zamestnanecId + ' den ' + p.den + ': segment ' + j + ' nenavazuje (' + segs[j - 1].do + ' → ' + segs[j].od + ')');
          }
        }
      }
    },
    {
      name: 'Celkový úvazek zaměstnance za týden odpovídá konfiguraci',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('TestUvazek', 1500, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Budova');
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        // Sečíst minuty za celý týden
        var totalMin = 0;
        for (var i = 0; i < r.prirazeni.length; i++) {
          if (r.prirazeni[i].zamestnanecId !== z.id) continue;
          var segs = r.prirazeni[i].segmenty;
          for (var j = 0; j < segs.length; j++) {
            var od = parseInt(segs[j].od.split(':')[0], 10) * 60 + parseInt(segs[j].od.split(':')[1], 10);
            var doM = parseInt(segs[j].do.split(':')[0], 10) * 60 + parseInt(segs[j].do.split(':')[1], 10);
            totalMin += (doM - od);
          }
        }
        // Tolerance ±5 min (zaokrouhlení daily = weekly/5)
        T.assert(Math.abs(totalMin - 1500) <= 5,
          'Celkový úvazek: očekáváno ~1500, dostali jsme ' + totalMin);
      }
    },
    {
      name: 'S překryvem: v každé třídě jsou v čase překryvu alespoň 2 osoby',
      run: function () {
        if (!M) return;
        var zamci = [];
        for (var i = 0; i < 4; i++) zamci.push(M.vytvorZamestnance('Z' + i, 1860, M.ROLE.UCITELKA));
        var b = M.vytvorBudovu('Budova');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var data = {
          zamestnanci: zamci,
          budovy: [b],
          minMaxSloty: [
            { id: 's1', od: '07:00', do: '07:45', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false },
            { id: 's2', od: '07:45', do: '17:00', minNaBudovu: 0, minNaTridu: 1, dny: [], rotace: false }
          ],
          pravidla: { minimalniPrekryvMinuty: 120 }
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        // Ověřit pokrytí: 09:00–11:00 musí mít ≥2 osoby v Třídě 1
        var tridaId = b.tridy[0].id;
        for (var den = 1; den <= 5; den++) {
          var count9to11 = 0;
          for (var pi = 0; pi < r.prirazeni.length; pi++) {
            var p = r.prirazeni[pi];
            if (p.den !== den) continue;
            for (var si = 0; si < p.segmenty.length; si++) {
              var seg = p.segmenty[si];
              if (seg.tridaId === tridaId) {
                var segOd = parseInt(seg.od.split(':')[0], 10) * 60 + parseInt(seg.od.split(':')[1], 10);
                var segDo = parseInt(seg.do.split(':')[0], 10) * 60 + parseInt(seg.do.split(':')[1], 10);
                // Překrývá se s 09:00–11:00?
                if (segOd < 11 * 60 && segDo > 9 * 60) count9to11++;
              }
            }
          }
          T.assert(count9to11 >= 2, 'Den ' + den + ': v třídě 1 v čase překryvu ' + count9to11 + ' osob (potřeba ≥2)');
        }
      }
    },
    {
      name: 'Žádný segment nemá přiřazení na budovu bez třídy (pokud budova má třídy)',
      run: function () {
        if (!M) return;
        var z1 = M.vytvorZamestnance('A', 1860, M.ROLE.UCITELKA);
        var z2 = M.vytvorZamestnance('B', 1860, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Budova');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var data = {
          zamestnanci: [z1, z2],
          budovy: [b],
          minMaxSloty: [
            { id: 's1', od: '07:00', do: '07:45', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false },
            { id: 's2', od: '07:45', do: '16:00', minNaBudovu: 0, minNaTridu: 1, dny: [], rotace: false },
            { id: 's3', od: '16:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }
          ]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        for (var i = 0; i < r.prirazeni.length; i++) {
          var p = r.prirazeni[i];
          for (var j = 0; j < p.segmenty.length; j++) {
            var seg = p.segmenty[j];
            T.assert(seg.tridaId != null,
              'Segment bez třídy: den ' + p.den + ', ' + seg.od + '–' + seg.do + ' (budova: ' + seg.budovaId + ')');
          }
        }
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
