/**
 * Testy pro export návrhu směn jako CSV (js/export-navrh-csv.js) – D2c.
 */
(function (global) {
  'use strict';

  var EI = global.MSemenyExportNavrhCsv;
  var UI = global.MSemenyNavrhSmenUI;
  var V = global.MSemenyVypocetSmen;
  var M = global.MSemenyDataModel;
  var T = global.MSemenyTest;
  if (!T || !EI) return;

  var tests = [
    {
      name: 'MSemenyExportNavrhCsv má navrhToCsv a stahnoutNavrhCsv',
      run: function () {
        T.assert(typeof EI.navrhToCsv === 'function', 'navrhToCsv');
        T.assert(typeof EI.stahnoutNavrhCsv === 'function', 'stahnoutNavrhCsv');
      }
    },
    {
      name: 'navrhToCsv vrací CSV s hlavičkou Den;Čas;Místo;Osoby',
      run: function () {
        var csv = EI.navrhToCsv([], {});
        T.assert(csv.indexOf('Den;Čas;Místo;Osoby') === 0, 'hlavička');
      }
    },
    {
      name: 'navrhToCsv s přiřazením obsahuje řádek s daty',
      run: function () {
        if (!M || !UI) return;
        var z = M.vytvorZamestnance('Test CSV', 480, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Budova A');
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '08:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true && r.prirazeni.length > 0, 'výpočet vrátil přiřazení');
        var csv = EI.navrhToCsv(r.prirazeni, data);
        T.assert(csv.indexOf('Test CSV') >= 0, 'CSV obsahuje jméno zaměstnance');
        T.assert(csv.indexOf('Po') >= 0 || csv.indexOf('Budova') >= 0, 'CSV obsahuje den nebo místo');
      }
    },
    {
      name: 'stahnoutNavrhCsv nevyhodí',
      run: function () {
        try {
          EI.stahnoutNavrhCsv([], { zamestnanci: [], budovy: [], minMaxSloty: [] });
        } catch (e) {
          T.assert(false, 'stahnoutNavrhCsv nesmí vyhodit: ' + e.message);
        }
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
