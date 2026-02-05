/**
 * Testy pro navigaci mezi sekcemi (js/navigace.js).
 */
(function (global) {
  'use strict';

  var Nav = global.MSemenyNavigace;
  var T = global.MSemenyTest;
  if (!T || !Nav) return;

  var tests = [
    {
      name: 'MSemenyNavigace existuje a má API',
      run: function () {
        T.assert(Nav && typeof Nav.zobrazSekci === 'function', 'zobrazSekci');
        T.assert(typeof Nav.sekceZHash === 'function', 'sekceZHash');
        T.assert(typeof Nav.getIdSekci === 'function', 'getIdSekci');
      }
    },
    {
      name: 'getIdSekci vrací všech 5 sekcí',
      run: function () {
        var id = Nav.getIdSekci();
        T.assert(Array.isArray(id), 'vrací pole');
        T.assertEqual(id.length, 5, '5 sekcí');
        T.assert(id.indexOf('prehled') !== -1 && id.indexOf('zamestnanci') !== -1 &&
          id.indexOf('budovy-tridy') !== -1 && id.indexOf('pravidla') !== -1 &&
          id.indexOf('navrh-smen') !== -1, 'obsahuje prehled, zamestnanci, budovy-tridy, pravidla, navrh-smen');
      }
    },
    {
      name: 'sekceZHash vrací platné id sekce',
      run: function () {
        var id = Nav.sekceZHash();
        T.assert(typeof id === 'string', 'vrací řetězec');
        T.assert(Nav.getIdSekci().indexOf(id) !== -1, 'id je z výčtu sekcí');
      }
    },
    {
      name: 'zobrazSekci s neplatným id nehodí a zobrazí prehled',
      run: function () {
        Nav.zobrazSekci('neexistujici-sekce');
        var id = Nav.sekceZHash();
        T.assert(id === 'prehled', 'po neplatném id je aktivní prehled');
      }
    },
    {
      name: 'zobrazSekci přepne na zadanou sekci',
      run: function () {
        Nav.zobrazSekci('zamestnanci');
        T.assertEqual(window.location.hash, '#zamestnanci', 'hash je #zamestnanci');
        Nav.zobrazSekci('pravidla');
        T.assertEqual(window.location.hash, '#pravidla', 'hash je #pravidla');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
