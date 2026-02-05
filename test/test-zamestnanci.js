/**
 * Testy pro sekci Zaměstnanci (js/zamestnanci.js).
 */
(function (global) {
  'use strict';

  var Z = global.MSemenyZamestnanci;
  var T = global.MSemenyTest;
  var S = global.MSemenyStorage;
  var M = global.MSemenyDataModel;
  if (!T || !Z) return;

  var tests = [
    {
      name: 'MSemenyZamestnanci existuje a má API',
      run: function () {
        T.assert(Z && typeof Z.minutyNaHodinyMinuty === 'function', 'minutyNaHodinyMinuty');
        T.assert(typeof Z.vykresliSeznam === 'function', 'vykresliSeznam');
        T.assert(typeof Z.zobrazFormular === 'function', 'zobrazFormular');
        T.assert(typeof Z.skryjFormular === 'function', 'skryjFormular');
      }
    },
    {
      name: 'minutyNaHodinyMinuty(0) vrací 0 h 0 min',
      run: function () {
        var r = Z.minutyNaHodinyMinuty(0);
        T.assert(r.hodiny === 0 && r.minuty === 0, '0 minut');
      }
    },
    {
      name: 'minutyNaHodinyMinuty(90) vrací 1 h 30 min',
      run: function () {
        var r = Z.minutyNaHodinyMinuty(90);
        T.assert(r.hodiny === 1 && r.minuty === 30, '90 minut = 1h 30min');
      }
    },
    {
      name: 'minutyNaHodinyMinuty(480) vrací 8 h 0 min',
      run: function () {
        var r = Z.minutyNaHodinyMinuty(480);
        T.assert(r.hodiny === 8 && r.minuty === 0, '480 minut = 8h');
      }
    },
    {
      name: 'minutyNaHodinyMinuty záporné ošetří jako 0',
      run: function () {
        var r = Z.minutyNaHodinyMinuty(-10);
        T.assert(r.hodiny === 0 && r.minuty === 0, 'záporné → 0');
      }
    },
    {
      name: 'Přidání zaměstnance přes replaceData se projeví v getData',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.zamestnanci.push(M.vytvorZamestnance('Test B1', 480, M.ROLE.UCITELKA));
          return d;
        });
        var data = S.getData();
        T.assert(data.zamestnanci.length === 1, 'jedna osoba');
        T.assert(data.zamestnanci[0].jmeno === 'Test B1', 'jméno');
        T.assert(data.zamestnanci[0].uvazekMinutyTyden === 480, 'úvazek 480 min');
        T.assert(data.zamestnanci[0].role === M.ROLE.UCITELKA, 'role');
      }
    },
    {
      name: 'Smazání zaměstnance přes replaceData se projeví v getData',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        var z = M.vytvorZamestnance('Na smazání', 300, M.ROLE.ASISTENTKA);
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.zamestnanci.push(z);
          return d;
        });
        T.assert(S.getData().zamestnanci.length === 1, 'před smazáním 1');
        S.replaceData(function (d) {
          d.zamestnanci = d.zamestnanci.filter(function (x) { return x.id !== z.id; });
          return d;
        });
        T.assert(S.getData().zamestnanci.length === 0, 'po smazání 0');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
