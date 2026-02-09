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
    },
    {
      name: 'D10b: validujNavrh min/max na třídu – méně než min = chyba',
      run: function () {
        if (!M) return;
        var b = M.vytvorBudovu('Školka');
        b.tridy = b.tridy || [];
        b.tridy.push(M.vytvorTridu('Třída A'));
        var z = M.vytvorZamestnance('Učitelka', 480, M.ROLE.UCITELKA);
        var prirazeni = [
          { den: 1, zamestnanecId: z.id, segmenty: [{ od: '07:00', do: '12:00', tridaId: b.tridy[0].id, budovaId: b.id }] }
        ];
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [
            { id: 's1', od: '09:30', do: '11:00', minNaTridu: 2, maxNaTridu: null, minNaBudovu: 0, maxNaBudovu: null, dny: [1], rotace: false }
          ]
        };
        var r = Validace.validujNavrh(prirazeni, data);
        var minMaxTridy = r.polozky.filter(function (p) { return p.pravidlo === 'Min/max na třídu'; });
        T.assert(minMaxTridy.length >= 1 && minMaxTridy[0].kontext.indexOf('1 osob') >= 0 && minMaxTridy[0].kontext.indexOf('min 2') >= 0, 'chyba min na třídu');
      }
    },
    {
      name: 'D10b: validujNavrh min/max na budovu – méně než min = chyba',
      run: function () {
        if (!M) return;
        var b = M.vytvorBudovu('Pavilon');
        b.tridy = b.tridy || [];
        var data = {
          zamestnanci: [],
          budovy: [b],
          minMaxSloty: [
            { id: 's1', od: '07:00', do: '08:00', minNaBudovu: 1, maxNaBudovu: null, minNaTridu: 0, maxNaTridu: null, dny: [], rotace: false }
          ]
        };
        var r = Validace.validujNavrh([], data);
        T.assert(r.ok === true && r.polozky.length === 0, 'prázdný návrh bez slotů nehlásí min na budovu');
        var prirazeni = [];
        var r2 = Validace.validujNavrh(prirazeni, data);
        T.assert(r2.ok === true, 'prázdný návrh ok');
        var z = M.vytvorZamestnance('Uč', 60, M.ROLE.UCITELKA);
        var prirazeni2 = [
          { den: 1, zamestnanecId: z.id, segmenty: [{ od: '10:00', do: '11:00', budovaId: b.id }] }
        ];
        var data2 = { zamestnanci: [z], budovy: [b], minMaxSloty: data.minMaxSloty };
        var r3 = Validace.validujNavrh(prirazeni2, data2);
        var minMaxBudovy = r3.polozky.filter(function (p) { return p.pravidlo === 'Min/max na budovu'; });
        T.assert(minMaxBudovy.length >= 1, 'v 07:00–08:00 nikdo v budově = chyba min na budovu');
      }
    },
    {
      name: 'validujNavrh překryv směn (jedna osoba na dvou místech současně) = chyba',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('Učitelka', 480, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Školka');
        b.tridy = b.tridy || [];
        b.tridy.push(M.vytvorTridu('A'));
        b.tridy.push(M.vytvorTridu('B'));
        var prirazeni = [
          {
            den: 1,
            zamestnanecId: z.id,
            segmenty: [
              { od: '07:00', do: '10:00', tridaId: b.tridy[0].id, budovaId: b.id },
              { od: '09:00', do: '12:00', tridaId: b.tridy[1].id, budovaId: b.id }
            ]
          }
        ];
        var data = { zamestnanci: [z], budovy: [b] };
        var r = Validace.validujNavrh(prirazeni, data);
        var prekryv = r.polozky.filter(function (p) { return p.pravidlo === 'Překryv směn'; });
        T.assert(prekryv.length >= 1, 'překryv směn hlásí chybu');
        T.assert(prekryv[0].segIndex1 === 0 && prekryv[0].segIndex2 === 1 && prekryv[0].den === 1 && prekryv[0].zamestnanecId === z.id, 'polozka obsahuje den, zamestnanecId, segIndex1, segIndex2');
        T.assert(prekryv[0].seg1Label && prekryv[0].seg2Label && prekryv[0].kontext.indexOf('současně') >= 0, 'kontext a labely obou směn');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
