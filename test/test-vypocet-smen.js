/**
 * Testy pro výpočet návrhu směn (js/vypocet-smen.js) – D1.
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
        T.assert(r.prirazeni.length === 5, '5 přiřazení (5 dnů × 1 budova, slot 45 min)');
        T.assert(r.prirazeni[0].den >= 1 && r.prirazeni[0].den <= 5 && r.prirazeni[0].zamestnanecId === z.id, 'přiřazení má den a zamestnanecId');
      }
    },
    {
      name: 'D3: s minimalniPrekryvMinuty a třídami se přidá překryvový slot a přiřazení',
      run: function () {
        if (!M) return;
        var z1 = M.vytvorZamestnance('A', 800, M.ROLE.UCITELKA);
        var z2 = M.vytvorZamestnance('B', 800, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Pavilon');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var slot = { id: 's1', od: '07:00', do: '08:00', minNaTridu: 1, minNaBudovu: 0, dny: [], rotace: false };
        var data = {
          zamestnanci: [z1, z2],
          budovy: [b],
          minMaxSloty: [slot],
          pravidla: { minimalniPrekryvMinuty: 120 }
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true && r.prirazeni.length > 0, 'ok a přiřazení');
        var overlap = r.prirazeni.filter(function (p) { return p.slotId === 'overlap-prekryv'; });
        T.assert(overlap.length >= 10, 'překryv: 5 dnů × 2 osoby na třídu = 10 přiřazení');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
