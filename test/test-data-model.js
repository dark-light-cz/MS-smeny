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
        T.assert(Array.isArray(s.omezeniNeDohromady) && s.omezeniNeDohromady.length === 0, 'omezeniNeDohromady prázdné (C4)');
      }
    },
    {
      name: 'vytvorOmezeniNeDohromady vrací dvojici v kanonickém pořadí (C4)',
      run: function () {
        var o = M.vytvorOmezeniNeDohromady('id-b', 'id-a');
        T.assert(o.id && o.osoba1Id === 'id-a' && o.osoba2Id === 'id-b', 'osoba1Id ≤ osoba2Id');
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
      name: 'vytvorZamestnance vytvoří objekt s id, jmeno, roleUvazky',
      run: function () {
        var z = M.vytvorZamestnance('Jan Novák', 600, M.ROLE.UCITELKA);
        T.assert(z.id && z.id.length > 0, 'má id');
        T.assert(z.jmeno === 'Jan Novák', 'jméno');
        T.assert(Array.isArray(z.roleUvazky) && z.roleUvazky.length === 1, 'roleUvazky má jeden záznam');
        T.assert(z.roleUvazky[0].role === M.ROLE.UCITELKA && z.roleUvazky[0].uvazekMinutyTyden === 600, 'úvazek 600 min, role učitelka');
        T.assert(M.getUvazekMinutyZamestnance(z) === 600, 'celkový úvazek 600 min');
      }
    },
    {
      name: 'vytvorZamestnance bez argumentů použije výchozí hodnoty',
      run: function () {
        var z = M.vytvorZamestnance();
        T.assert(z.jmeno === '', 'prázdné jméno');
        T.assert(Array.isArray(z.roleUvazky) && z.roleUvazky.length === 1 && z.roleUvazky[0].uvazekMinutyTyden === 0, 'úvazek 0');
        T.assert(M.getPrimaryRole(z) === M.ROLE.UCITELKA, 'výchozí role učitelka');
      }
    },
    {
      name: 'vytvorZamestnance s kmenová/vykrývací a tridaId (C2)',
      run: function () {
        var zK = M.vytvorZamestnance('Kmenová', 480, M.ROLE.UCITELKA, 'kmenová', 'trida-1');
        T.assert(zK.kmenovaVykryvaci === 'kmenová', 'kmenová kategorie');
        T.assert(zK.tridaId === 'trida-1', 'přiřazená třída');
        var zV = M.vytvorZamestnance('Vykrývací', 300, M.ROLE.UCITELKA, 'vykrývací');
        T.assert(zV.kmenovaVykryvaci === 'vykrývací', 'vykrývací kategorie');
        T.assert(zV.tridaId === null, 'vykrývací bez třídy');
      }
    },
    {
      name: 'vychoziPravidla obsahuje pravidla pro vykrývací a kmenové (C2)',
      run: function () {
        var p = M.vychoziPravidla();
        T.assert(p.vykryvaciBezMezer === true, 'vykryvaciBezMezer');
        T.assert(p.vykryvaciMaxPresun === 1, 'vykryvaciMaxPresun');
        T.assert(p.minKmenovychNaTridu === 2 && p.maxKmenovychNaTridu === 3, 'min/max kmenových na třídu');
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
      name: 'vytvorTridu obsahuje oteviraciDoba',
      run: function () {
        var t = M.vytvorTridu('Sluníčka');
        T.assert(t.oteviraciDoba && Array.isArray(t.oteviraciDoba.dny), 'oteviraciDoba');
        T.assert(t.oteviraciDoba.od === '07:00' && t.oteviraciDoba.do === '17:00', 'od-do');
      }
    },
    {
      name: 'vychoziOteviraciDoba vrací po-pá 7:00-17:00',
      run: function () {
        var o = M.vychoziOteviraciDoba();
        T.assert(o.dny.length === 5 && o.dny[0] === 1 && o.dny[4] === 5, 'dny 1-5');
        T.assert(o.od === '07:00' && o.do === '17:00', 'od-do');
      }
    },
    {
      name: 'vytvorMinMaxSlot vytvoří slot s od, do a min/max na budovu a třídu',
      run: function () {
        var s = M.vytvorMinMaxSlot('07:00', '07:45', 1, null, 0, null);
        T.assert(s.id && s.od === '07:00' && s.do === '07:45', 'id a časy');
        T.assert(s.minNaBudovu === 1 && s.maxNaBudovu === null, 'budova min 1 max neomezeno');
        T.assert(s.minNaTridu === 0 && s.maxNaTridu === null, 'třída');
      }
    },
    {
      name: 'vytvorMinMaxSlot s dny a rotace (C3)',
      run: function () {
        var s = M.vytvorMinMaxSlot('15:30', '17:00', 1, 1, 0, null, [5], true);
        T.assert(Array.isArray(s.dny) && s.dny.length === 1 && s.dny[0] === 5, 'dny pouze pátek');
        T.assert(s.rotace === true, 'rotace zapnuta');
        var s2 = M.vytvorMinMaxSlot('08:00', '12:00', 0, null, 1, null);
        T.assert(Array.isArray(s2.dny) && s2.dny.length === 0, 'bez dny = prázdné pole');
        T.assert(s2.rotace === false, 'rotace vypnuta');
      }
    },
    {
      name: 'vychoziMinMaxSloty sloty mají dny a rotace (C3)',
      run: function () {
        var sloty = M.vychoziMinMaxSloty();
        T.assert(sloty.length >= 1, 'alespoň jeden slot');
        sloty.forEach(function (s) {
          T.assert(Array.isArray(s.dny), 'slot má dny');
          T.assert(typeof s.rotace === 'boolean', 'slot má rotace');
        });
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
