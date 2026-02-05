/**
 * Testy pro datový model (js/data-model.js).
 */
(function (global) {
  'use strict';

  var M = global.MSemenyDataModel;
  var T = global.MSemenyTest;
  if (!T || !T.assert) return;

  var tests = [
    {
      name: 'Výchozí stav má version, zamestnanci, budovy, minMaxSloty, pravidla',
      run: function () {
        var s = M.vychoziStav();
        T.assert(s.version === 1, 'version');
        T.assert(Array.isArray(s.zamestnanci), 'zamestnanci je pole');
        T.assert(Array.isArray(s.budovy), 'budovy je pole');
        T.assert(s.zamestnanci.length === 0, 'zamestnanci prázdné');
        T.assert(s.budovy.length === 0, 'budovy prázdné');
        T.assert(Array.isArray(s.minMaxSloty), 'minMaxSloty je pole');
        T.assert(s.minMaxSloty.length >= 1, 'minMaxSloty neprázdné');
        T.assert(s.pravidla && typeof s.pravidla === 'object', 'pravidla objekt');
        T.assert(s.pravidla.minimalniPrekryvMinuty === 120, 'minimalniPrekryvMinuty 120');
      }
    },
    {
      name: 'ROLE a ROLE_SEZNAM obsahují očekávané role',
      run: function () {
        T.assert(M.ROLE.UCITELKA === 'učitelka', 'učitelka');
        T.assert(M.ROLE_SEZNAM.indexOf('učitelka') >= 0, 'učitelka v seznamu');
        T.assert(M.ROLE_SEZNAM.indexOf('ředitelka') >= 0, 'ředitelka v seznamu');
        T.assert(M.ROLE_SEZNAM.length >= 5, 'alespoň 5 rolí');
      }
    },
    {
      name: 'generujId vrací řetězec začínající id-',
      run: function () {
        var id = M.generujId();
        T.assert(typeof id === 'string', 'id je string');
        T.assert(id.indexOf('id-') === 0, 'začíná id-');
      }
    },
    {
      name: 'vytvorZamestnance vytvoří objekt s id, jmeno, uvazekMinutyTyden, role',
      run: function () {
        var z = M.vytvorZamestnance('Jan Novák', 600, M.ROLE.UCITELKA);
        T.assert(z.id && z.id.length > 0, 'má id');
        T.assert(z.jmeno === 'Jan Novák', 'jméno');
        T.assert(z.uvazekMinutyTyden === 600, 'úvazek 600 min');
        T.assert(z.role === M.ROLE.UCITELKA, 'role');
      }
    },
    {
      name: 'vytvorZamestnance bez argumentů použije výchozí hodnoty',
      run: function () {
        var z = M.vytvorZamestnance();
        T.assert(z.jmeno === '', 'prázdné jméno');
        T.assert(z.uvazekMinutyTyden === 0, 'úvazek 0');
        T.assert(z.role === M.ROLE.UCITELKA, 'výchozí role učitelka');
      }
    },
    {
      name: 'vytvorBudovu vytvoří budovu s tridy a oteviraciDoba',
      run: function () {
        var b = M.vytvorBudovu('Pavilon A');
        T.assert(b.id && b.nazev === 'Pavilon A', 'id a název');
        T.assert(Array.isArray(b.tridy) && b.tridy.length === 0, 'tridy pole');
        T.assert(b.oteviraciDoba && Array.isArray(b.oteviraciDoba.dny), 'otevírací doba');
        T.assert(b.oteviraciDoba.od === '07:00' && b.oteviraciDoba.do === '17:00', 'čas 7-17');
      }
    },
    {
      name: 'vytvorTridu vytvoří třídu s id a nazev',
      run: function () {
        var t = M.vytvorTridu('Berušky');
        T.assert(t.id && t.nazev === 'Berušky', 'id a název');
      }
    },
    {
      name: 'vychoziOteviraciDoba vrací po-pá 7:00-17:00',
      run: function () {
        var o = M.vychoziOteviraciDoba();
        T.assert(o.dny.length === 5 && o.dny[0] === 1 && o.dny[4] === 5, 'dny 1-5');
        T.assert(o.od === '07:00' && o.do === '17:00', 'od-do');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
