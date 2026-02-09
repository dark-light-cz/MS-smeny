/**
 * Testy pro registr výpočetních algoritmů (js/algoritmy/registr.js) a API algoritmů.
 */
(function (global) {
  'use strict';

  var R = global.MSemenyAlgoritmy;
  var V = global.MSemenyVypocetSmen;
  var M = global.MSemenyDataModel;
  var T = global.MSemenyTest;
  if (!T || !R) return;

  var tests = [
    {
      name: 'MSemenyAlgoritmy existuje a má dostupneAlgoritmy, getAlgoritmus, vychoziId',
      run: function () {
        T.assert(R && typeof R.dostupneAlgoritmy === 'function', 'dostupneAlgoritmy');
        T.assert(typeof R.getAlgoritmus === 'function', 'getAlgoritmus');
        T.assert(typeof R.vychoziId === 'function', 'vychoziId');
      }
    },
    {
      name: 'dostupneAlgoritmy vrací alespoň dva algoritmy (Základní, Párové třídy)',
      run: function () {
        var seznam = R.dostupneAlgoritmy();
        T.assert(Array.isArray(seznam) && seznam.length >= 2, 'alespoň dva algoritmy');
        var zakladni = seznam.filter(function (a) { return a.id === 'zakladni'; })[0];
        var parove = seznam.filter(function (a) { return a.id === 'parove-tridy'; })[0];
        T.assert(zakladni && zakladni.nazev && zakladni.nazev.indexOf('Základní') !== -1, 'Základní algoritmus v seznamu');
        T.assert(parove && parove.nazev && parove.nazev.indexOf('Párové') !== -1, 'Párové třídy v seznamu');
      }
    },
    {
      name: 'getAlgoritmus("zakladni") vrací objekt s metodou vypocet',
      run: function () {
        var algo = R.getAlgoritmus('zakladni');
        T.assert(algo && algo.id === 'zakladni' && typeof algo.vypocet === 'function', 'objekt s vypocet');
      }
    },
    {
      name: 'vypocetSmen(data) bez algorithmId odpovídá výchozímu algoritmu',
      run: function () {
        if (!M || !V) return;
        var z = M.vytvorZamestnance('Test', 480, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Pavilon');
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }]
        };
        var r1 = V.vypocetSmen(data);
        var algo = R.getAlgoritmus(R.vychoziId());
        var r2 = algo.vypocet(data);
        T.assert(r1.ok === r2.ok && (!r1.prirazeni || r1.prirazeni.length === r2.prirazeni.length), 'stejný výsledek jako výchozí algoritmus');
      }
    },
    {
      name: 'vypocetSmen(data, "zakladni") volá základní algoritmus',
      run: function () {
        if (!M || !V) return;
        var z = M.vytvorZamestnance('Algo', 240, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('B');
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '08:00', do: '12:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }]
        };
        var r = V.vypocetSmen(data, 'zakladni');
        T.assert(r.ok === true && Array.isArray(r.prirazeni), 'explicitní zakladni vrátí přiřazení');
      }
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    window.MSemenyTestList.push(tests[i]);
  }
})(typeof window !== 'undefined' ? window : this);
