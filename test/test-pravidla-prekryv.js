/**
 * Testy pro pravidlo minimálního překryvu (C1) – uložení do modelu.
 */
(function (global) {
  'use strict';

  var T = global.MSemenyTest;
  var S = global.MSemenyStorage;
  var M = global.MSemenyDataModel;
  if (!T || !S) return;

  var tests = [
    {
      name: 'Výchozí stav má pravidla.minimalniPrekryvMinuty 120',
      run: function () {
        if (!M) return;
        var p = M.vychoziPravidla();
        T.assert(p && p.minimalniPrekryvMinuty === 120, 'minimalniPrekryvMinuty 120');
      }
    },
    {
      name: 'replaceData může změnit pravidla.minimalniPrekryvMinuty',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.pravidla = d.pravidla || {};
          d.pravidla.minimalniPrekryvMinuty = 90;
          return d;
        });
        var data = S.getData();
        T.assert(data.pravidla && data.pravidla.minimalniPrekryvMinuty === 90, 'uloženo 90 min');
      }
    },
    // --- C5: Přechod mezi budovami – globální pravidlo ---
    {
      name: 'Výchozí pravidla mají zakazPrechodMeziBudovami = true (C5)',
      run: function () {
        if (!M) return;
        var p = M.vychoziPravidla();
        T.assert(p && p.zakazPrechodMeziBudovami === true, 'zakazPrechodMeziBudovami true');
      }
    },
    {
      name: 'replaceData může změnit pravidla.zakazPrechodMeziBudovami (C5)',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.pravidla = d.pravidla || {};
          d.pravidla.zakazPrechodMeziBudovami = false;
          return d;
        });
        var data = S.getData();
        T.assert(data.pravidla && data.pravidla.zakazPrechodMeziBudovami === false, 'uloženo false');
      }
    },
    {
      name: 'Výchozí stav obsahuje zakazPrechodMeziBudovami v pravidlech (C5)',
      run: function () {
        if (!M) return;
        var stav = M.vychoziStav();
        T.assert(stav.pravidla && stav.pravidla.zakazPrechodMeziBudovami === true, 'výchozí stav má zakazPrechodMeziBudovami true');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
