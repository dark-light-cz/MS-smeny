/**
 * Testy pro úložiště – Local Storage (js/storage.js).
 */
(function (global) {
  'use strict';

  var S = global.MSemenyStorage;
  var M = global.MSemenyDataModel;
  var T = global.MSemenyTest;
  if (!T || !S) return;

  var STORAGE_KEY = 'ms-smeny-data';

  var tests = [
    {
      name: 'getData vrací objekt s zamestnanci a budovy',
      run: function () {
        S.resetCache();
        var d = S.getData();
        T.assert(d && typeof d === 'object', 'getData vrací objekt');
        T.assert(Array.isArray(d.zamestnanci), 'zamestnanci pole');
        T.assert(Array.isArray(d.budovy), 'budovy pole');
      }
    },
    {
      name: 'setData nastaví data, getData je vrátí',
      run: function () {
        S.resetCache();
        var stav = M.vychoziStav();
        stav.zamestnanci.push(M.vytvorZamestnance('Test', 480, M.ROLE.UCITELKA));
        S.setData(stav);
        var d = S.getData();
        T.assert(d.zamestnanci.length === 1, 'jedna osoba');
        T.assert(d.zamestnanci[0].jmeno === 'Test', 'jméno Test');
      }
    },
    {
      name: 'replaceData upraví data a uloží',
      run: function () {
        S.resetCache();
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.zamestnanci.push(M.vytvorZamestnance('Replace', 300, M.ROLE.ASISTENTKA));
          return d;
        });
        var d = S.getData();
        T.assert(d.zamestnanci.length === 1 && d.zamestnanci[0].jmeno === 'Replace', 'replaceData projevil změnu');
      }
    },
    {
      name: 'replaceData uloží pravidla vykrývací (vykryvaciBezMezer, vykryvaciMaxPresun)',
      run: function () {
        S.resetCache();
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.pravidla = d.pravidla || {};
          d.pravidla.vykryvaciBezMezer = false;
          d.pravidla.vykryvaciMaxPresun = 2;
          return d;
        });
        var d = S.getData();
        T.assert(d.pravidla.vykryvaciBezMezer === false, 'vykryvaciBezMezer uloženo');
        T.assert(d.pravidla.vykryvaciMaxPresun === 2, 'vykryvaciMaxPresun uloženo');
      }
    },
    {
      name: 'Po setData je obsah v Local Storage',
      run: function () {
        S.resetCache();
        var stav = M.vychoziStav();
        stav.zamestnanci = [{ id: 'x', jmeno: 'LS Test', uvazekMinutyTyden: 0, role: 'učitelka' }];
        S.setData(stav);
        var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
        T.assert(raw && raw.length > 0, 'v localStorage něco je');
        var parsed = JSON.parse(raw);
        T.assert(parsed.zamestnanci.length === 1 && parsed.zamestnanci[0].jmeno === 'LS Test', 'obsah odpovídá');
      }
    },
    {
      name: 'Po resetCache a prázdném Local Storage getData vrátí výchozí stav',
      run: function () {
        if (!global.localStorage) return;
        S.resetCache();
        global.localStorage.removeItem(STORAGE_KEY);
        var d = S.getData();
        T.assert(d.zamestnanci.length === 0 && d.budovy.length === 0, 'výchozí prázdný stav');
        T.assert(d.version === 1 && d.pravidla, 'version a pravidla');
      }
    },
    {
      name: 'setData s null/neobjektem nic nezmění',
      run: function () {
        S.resetCache();
        S.setData(M.vychoziStav());
        S.getData().zamestnanci.push(M.vytvorZamestnance('Před', 0, M.ROLE.UCITELKA));
        S.setData(null);
        S.setData(undefined);
        var d = S.getData();
        T.assert(d.zamestnanci.length === 1, 'data zůstala po setData(null)');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
