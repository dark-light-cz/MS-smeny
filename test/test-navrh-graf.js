/**
 * Testy pro grafické zobrazení návrhu (js/navrh-graf.js) – D2b.
 */
(function (global) {
  'use strict';

  var Graf = global.MSemenyNavrhGraf;
  var T = global.MSemenyTest;
  if (!T || !Graf) return;

  var tests = [
    {
      name: 'MSemenyNavrhGraf má vykresliNavrhGraf',
      run: function () {
        T.assert(typeof Graf.vykresliNavrhGraf === 'function', 'vykresliNavrhGraf');
      }
    },
    {
      name: 'vykresliNavrhGraf s prázdnými daty nevyhodí a skryje kontejner',
      run: function () {
        var div = document.createElement('div');
        try {
          Graf.vykresliNavrhGraf([], {}, div, 1);
        } catch (e) {
          T.assert(false, 'nesmí vyhodit: ' + e.message);
        }
        T.assert(div.hidden === true, 'kontejner skryt');
      }
    },
    {
      name: 'vykresliNavrhGraf s přiřazením vykreslí obsah a zobrazí kontejner',
      run: function () {
        var div = document.createElement('div');
        var prirazeni = [
          {
            den: 1,
            zamestnanecId: 'z1',
            segmenty: [{ od: '08:00', do: '12:00', budovaId: 'b1', tridaId: null }]
          }
        ];
        var data = {
          budovy: [{ id: 'b1', nazev: 'Pavilon', tridy: [] }],
          zamestnanci: [{ id: 'z1', jmeno: 'Anna' }]
        };
        Graf.vykresliNavrhGraf(prirazeni, data, div, 1);
        T.assert(div.hidden === false, 'kontejner zobrazen');
        T.assert(div.querySelector('.navrh-graf-blok') !== null, 'blok budovy');
        T.assert(div.querySelector('.navrh-graf-segment') !== null, 'segment na ose');
        T.assert(div.querySelector('.navrh-graf-legenda') !== null, 'legenda');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
