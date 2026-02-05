/**
 * Testy pro časové sloty min/max (js/min-max-sloty.js).
 */
(function (global) {
  'use strict';

  var Sloty = global.MSemenyMinMaxSloty;
  var T = global.MSemenyTest;
  var S = global.MSemenyStorage;
  var M = global.MSemenyDataModel;
  if (!T || !Sloty) return;

  var tests = [
    {
      name: 'MSemenyMinMaxSloty existuje a má API',
      run: function () {
        T.assert(Sloty && typeof Sloty.vykresliSeznam === 'function', 'vykresliSeznam');
        T.assert(typeof Sloty.zobrazFormular === 'function', 'zobrazFormular');
        T.assert(typeof Sloty.validujFormular === 'function', 'validujFormular');
      }
    },
    {
      name: 'Přidání slotu přes replaceData se projeví v getData',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        S.setData(M.vychoziStav());
        var novy = M.vytvorMinMaxSlot('08:00', '12:00', 1, 2, 0, null);
        S.replaceData(function (d) {
          d.minMaxSloty = d.minMaxSloty || [];
          d.minMaxSloty.push(novy);
          return d;
        });
        var data = S.getData();
        var slot = (data.minMaxSloty || []).filter(function (s) { return s.od === '08:00'; })[0];
        T.assert(slot, 'slot existuje');
        T.assert(slot.minNaBudovu === 1 && slot.maxNaBudovu === 2, 'min/max budovu');
      }
    },
    {
      name: 'Slot s dny a rotace se uloží a načte (C3)',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        S.setData(M.vychoziStav());
        var novy = M.vytvorMinMaxSlot('15:30', '17:00', 1, null, 0, null, [5], true);
        S.replaceData(function (d) {
          d.minMaxSloty = d.minMaxSloty || [];
          d.minMaxSloty.push(novy);
          return d;
        });
        var data = S.getData();
        var slot = (data.minMaxSloty || []).filter(function (s) { return s.od === '15:30'; })[0];
        T.assert(slot && slot.dny && slot.dny[0] === 5 && slot.rotace === true, 'dny a rotace uloženy');
      }
    },
    {
      name: 'Smazání slotu přes replaceData se projeví v getData',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        var slot = M.vytvorMinMaxSlot('09:00', '10:00', 0, null, 1, null);
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.minMaxSloty = d.minMaxSloty || [];
          d.minMaxSloty.push(slot);
          return d;
        });
        T.assert((S.getData().minMaxSloty || []).length >= 1, 'před smazáním');
        S.replaceData(function (d) {
          d.minMaxSloty = (d.minMaxSloty || []).filter(function (s) { return s.id !== slot.id; });
          return d;
        });
        var po = (S.getData().minMaxSloty || []).filter(function (s) { return s.id === slot.id; });
        T.assert(po.length === 0, 'po smazání slot není v seznamu');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
