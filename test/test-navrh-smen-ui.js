/**
 * Testy pro sekci Návrh směn – UI (js/navrh-smen-ui.js).
 * Ověřují mj. že vykresliNavrh nevyhodí při vykreslování řádků tabulky (např. „row is not defined“).
 */
(function (global) {
  'use strict';

  var UI = global.MSemenyNavrhSmenUI;
  var V = global.MSemenyVypocetSmen;
  var M = global.MSemenyDataModel;
  var T = global.MSemenyTest;
  if (!T || !UI) return;

  var tests = [
    {
      name: 'vykresliNavrh s alespoň jedním řádkem vykreslí tabulku a nevyhodí (row je definovaná)',
      run: function () {
        if (!M || !V) return;
        var el = document.getElementById('navrh-vysledek');
        if (!el) {
          el = document.createElement('div');
          el.id = 'navrh-vysledek';
          document.body.appendChild(el);
        }
        var z = M.vytvorZamestnance('Test UI', 480, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Budova A');
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '08:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true && r.prirazeni.length > 0, 'výpočet vrátil přiřazení');
        UI.vykresliNavrh(r.prirazeni, data);
        T.assert(el.innerHTML.indexOf('tabulka-navrh') >= 0, 'vykreslena tabulka s třídou tabulka-navrh');
        T.assert(el.innerHTML.indexOf('Test UI') >= 0, 'tabulka obsahuje jméno zaměstnance');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
