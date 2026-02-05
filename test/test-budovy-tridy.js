/**
 * Testy pro sekci Budovy a třídy (js/budovy-tridy.js).
 */
(function (global) {
  'use strict';

  var BT = global.MSemenyBudovyTridy;
  var T = global.MSemenyTest;
  var S = global.MSemenyStorage;
  var M = global.MSemenyDataModel;
  if (!T || !BT) return;

  var tests = [
    {
      name: 'MSemenyBudovyTridy existuje a má API',
      run: function () {
        T.assert(BT && typeof BT.vykresliHierarchii === 'function', 'vykresliHierarchii');
        T.assert(typeof BT.zobrazFormularBudovu === 'function', 'zobrazFormularBudovu');
        T.assert(typeof BT.zobrazFormularTridu === 'function', 'zobrazFormularTridu');
        T.assert(typeof BT.najdiBudovuProTridu === 'function', 'najdiBudovuProTridu');
        T.assert(typeof BT.najdiTridu === 'function', 'najdiTridu');
      }
    },
    {
      name: 'Přidání budovy přes replaceData se projeví v getData',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.budovy.push(M.vytvorBudovu('Testovací budova'));
          return d;
        });
        var data = S.getData();
        T.assert(data.budovy.length === 1, 'jedna budova');
        T.assert(data.budovy[0].nazev === 'Testovací budova', 'název');
        T.assert(Array.isArray(data.budovy[0].tridy), 'tridy pole');
      }
    },
    {
      name: 'Přidání třídy do budovy se projeví v getData',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        var budova = M.vytvorBudovu('B');
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.budovy.push(budova);
          return d;
        });
        S.replaceData(function (d) {
          var b = d.budovy.filter(function (x) { return x.id === budova.id; })[0];
          if (b) b.tridy.push(M.vytvorTridu('Třída 1'));
          return d;
        });
        var data = S.getData();
        var b = data.budovy.filter(function (x) { return x.id === budova.id; })[0];
        T.assert(b && b.tridy.length === 1, 'jedna třída');
        T.assert(b.tridy[0].nazev === 'Třída 1', 'název třídy');
      }
    },
    {
      name: 'najdiBudovuProTridu vrátí id budovy obsahující třídu',
      run: function () {
        if (!S || !M || !BT) return;
        S.resetCache();
        var budova = M.vytvorBudovu('Budova X');
        var trida = M.vytvorTridu('Třída Y');
        budova.tridy.push(trida);
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.budovy.push(budova);
          return d;
        });
        var id = BT.najdiBudovuProTridu(trida.id);
        T.assert(id === budova.id, 'najdiBudovuProTridu vrací id budovy');
      }
    },
    {
      name: 'najdiTridu vrátí objekt s trida a budova',
      run: function () {
        if (!S || !M || !BT) return;
        S.resetCache();
        var budova = M.vytvorBudovu('B2');
        var trida = M.vytvorTridu('T2');
        budova.tridy.push(trida);
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.budovy.push(budova);
          return d;
        });
        var found = BT.najdiTridu(trida.id);
        T.assert(found && found.trida.id === trida.id, 'trida');
        T.assert(found.budova.id === budova.id, 'budova');
      }
    },
    {
      name: 'Smazání budovy přes replaceData se projeví v getData',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        var budova = M.vytvorBudovu('Na smazání');
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.budovy.push(budova);
          return d;
        });
        T.assert(S.getData().budovy.length === 1, 'před smazáním 1');
        S.replaceData(function (d) {
          d.budovy = d.budovy.filter(function (b) { return b.id !== budova.id; });
          return d;
        });
        T.assert(S.getData().budovy.length === 0, 'po smazání 0');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
