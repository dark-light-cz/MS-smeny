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
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
