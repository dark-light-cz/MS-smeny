/**
 * Testy pro validaci návrhu směn (js/validace-navrhu.js) – D10.
 */
(function (global) {
  'use strict';

  var Validace = global.MSemenyValidaceNavrhu;
  var M = global.MSemenyDataModel;
  var T = global.MSemenyTest;
  if (!T || !Validace) return;

  var tests = [
    {
      name: 'MSemenyValidaceNavrhu má validujNavrh a sumMinutyPerZamestnanec',
      run: function () {
        T.assert(typeof Validace.validujNavrh === 'function', 'validujNavrh');
        T.assert(typeof Validace.sumMinutyPerZamestnanec === 'function', 'sumMinutyPerZamestnanec');
      }
    },
    {
      name: 'validujNavrh prázdný návrh vrátí ok bez položek',
      run: function () {
        var r = Validace.validujNavrh([], { zamestnanci: [] });
        T.assert(r.ok === true && r.polozky.length === 0, 'prázdný');
      }
    },
    {
      name: 'validujNavrh přečerpaný úvazek = chyba',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('Zaměstnanec A', 300, M.ROLE.UCITELKA); // 5 h
        var prirazeni = [
          { den: 1, zamestnanecId: z.id, segmenty: [{ od: '07:00', do: '12:30' }] } // 5,5 h = 330 min
        ];
        var data = { zamestnanci: [z] };
        var r = Validace.validujNavrh(prirazeni, data);
        T.assert(r.ok === false, 'neok');
        var chyba = r.polozky.filter(function (p) { return p.pravidlo === 'Přečerpaný úvazek'; });
        T.assert(chyba.length === 1 && chyba[0].kontext.indexOf('330') >= 0, 'přečerpaný úvazek');
      }
    },
    {
      name: 'validujNavrh nevyčerpaný úvazek = varování',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('Zaměstnanec B', 480, M.ROLE.UCITELKA); // 8 h
        var prirazeni = [
          { den: 1, zamestnanecId: z.id, segmenty: [{ od: '07:00', do: '09:00' }] } // 2 h = 120 min
        ];
        var data = { zamestnanci: [z] };
        var r = Validace.validujNavrh(prirazeni, data);
        T.assert(r.ok === true, 'ok (jen varování)');
        var varovani = r.polozky.filter(function (p) { return p.pravidlo === 'Nevyčerpaný úvazek'; });
        T.assert(varovani.length === 1 && varovani[0].kontext.indexOf('120') >= 0 && varovani[0].kontext.indexOf('480') >= 0, 'nevyčerpaný');
      }
    },
    {
      name: 'validujNavrh úvazek přesně naplněn = žádná položka',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('Zaměstnanec C', 300, M.ROLE.UCITELKA);
        var prirazeni = [
          { den: 1, zamestnanecId: z.id, segmenty: [{ od: '07:00', do: '12:00' }] } // 300 min
        ];
        var data = { zamestnanci: [z] };
        var r = Validace.validujNavrh(prirazeni, data);
        T.assert(r.ok === true && r.polozky.length === 0, 'bez chyb a varování');
      }
    },
    {
      name: 'sumMinutyPerZamestnanec sčítá segmenty',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('X', 600, M.ROLE.UCITELKA);
        var prirazeni = [
          { den: 1, zamestnanecId: z.id, segmenty: [{ od: '07:00', do: '09:00' }, { od: '10:00', do: '12:00' }] }
        ];
        var sum = Validace.sumMinutyPerZamestnanec(prirazeni);
        T.assert(sum[z.id] === 240, '120 + 120 = 240 min');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
