/**
 * Testy pro import návrhu směn ze CSV (js/import-navrh-csv.js) – D9.
 */
(function (global) {
  'use strict';

  var Import = global.MSemenyImportNavrhCsv;
  var M = global.MSemenyDataModel;
  var T = global.MSemenyTest;
  if (!T || !Import) return;

  var tests = [
    {
      name: 'MSemenyImportNavrhCsv má csvToPrirazeni',
      run: function () {
        T.assert(typeof Import.csvToPrirazeni === 'function', 'csvToPrirazeni');
      }
    },
    {
      name: 'csvToPrirazeni prázdný vstup vrátí chybu',
      run: function () {
        var r = Import.csvToPrirazeni('', {});
        T.assert(r.ok === false && r.chyba, 'prázdný text');
        r = Import.csvToPrirazeni(null, {});
        T.assert(r.ok === false && r.chyba, 'null');
      }
    },
    {
      name: 'csvToPrirazeni jen hlavička vrátí chybu',
      run: function () {
        var r = Import.csvToPrirazeni('Den;Zaměstnanec;Čas;Místo\n', { zamestnanci: [], budovy: [] });
        T.assert(r.ok === false && r.chyba, 'jen hlavička');
      }
    },
    {
      name: 'csvToPrirazeni neplatná hlavička vrátí chybu',
      run: function () {
        var r = Import.csvToPrirazeni('A;B;C;D\nPo,Jana,07:00-12:00,Budova X', { zamestnanci: [], budovy: [] });
        T.assert(r.ok === false && r.chyba, 'špatná hlavička');
      }
    },
    {
      name: 'csvToPrirazeni načte řádek a převede na prirazeni',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('Učitelka A', 600, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Školka X');
        var data = { zamestnanci: [z], budovy: [b] };
        var csv = 'Den;Zaměstnanec;Čas;Místo\nPo;Učitelka A;07:00–12:00;Budova: Školka X';
        var r = Import.csvToPrirazeni(csv, data);
        T.assert(r.ok === true, 'ok');
        T.assert(Array.isArray(r.prirazeni) && r.prirazeni.length === 1, 'jedno přiřazení');
        T.assert(r.prirazeni[0].den === 1 && r.prirazeni[0].zamestnanecId === z.id, 'den a zaměstnanec');
        T.assert(r.prirazeni[0].segmenty.length === 1, 'jeden segment');
        T.assert(r.prirazeni[0].segmenty[0].od === '07:00' && r.prirazeni[0].segmenty[0].do === '12:00', 'čas');
        T.assert(r.prirazeni[0].segmenty[0].budovaId === b.id, 'budova');
      }
    },
    {
      name: 'csvToPrirazeni neznámý zaměstnanec přeskočí řádek a přidá varování',
      run: function () {
        var data = { zamestnanci: [], budovy: [] };
        var csv = 'Den;Zaměstnanec;Čas;Místo\nPo;Neznámý;08:00–10:00;Budova: X';
        var r = Import.csvToPrirazeni(csv, data);
        T.assert(r.ok === false || (r.prirazeni && r.prirazeni.length === 0), 'žádné přiřazení');
        T.assert(r.varovani && r.varovani.length > 0 && r.varovani.some(function (v) { return v.indexOf('neznámý zaměstnanec') >= 0; }), 'varování');
      }
    },
    {
      name: 'csvToPrirazeni BOM je odstraněn',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('B', 60, M.ROLE.UCITELKA);
        var csv = '\uFEFFDen;Zaměstnanec;Čas;Místo\nPo;B;07:00–08:00;Budova: Y';
        var data = { zamestnanci: [z], budovy: [] };
        var r = Import.csvToPrirazeni(csv, data);
        T.assert(r.ok === true && r.prirazeni.length === 1, 'načteno i s BOM');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
