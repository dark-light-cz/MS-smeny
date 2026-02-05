/**
 * Testy pro export a import JSON (js/export-import.js).
 */
(function (global) {
  'use strict';

  var EI = global.MSemenyExportImport;
  var S = global.MSemenyStorage;
  var M = global.MSemenyDataModel;
  var T = global.MSemenyTest;
  if (!T || !EI || !S) return;

  var tests = [
    {
      name: 'exportData vrací řetězec s platným JSON (zamestnanci, budovy)',
      run: function () {
        S.resetCache();
        S.setData(M.vychoziStav());
        var json = EI.exportData();
        T.assert(typeof json === 'string' && json.length > 0, 'exportData vrací neprázdný řetězec');
        var parsed = JSON.parse(json);
        T.assert(Array.isArray(parsed.zamestnanci), 'parsed má zamestnanci');
        T.assert(Array.isArray(parsed.budovy), 'parsed má budovy');
      }
    },
    {
      name: 'exportData obsahuje aktuálně uložená data',
      run: function () {
        S.resetCache();
        var stav = M.vychoziStav();
        stav.zamestnanci.push(M.vytvorZamestnance('Export Test', 480, M.ROLE.UCITELKA));
        S.setData(stav);
        var json = EI.exportData();
        var parsed = JSON.parse(json);
        T.assert(parsed.zamestnanci.length === 1, 'jedna osoba v exportu');
        T.assert(parsed.zamestnanci[0].jmeno === 'Export Test', 'jméno v exportu');
      }
    },
    {
      name: 'importZeJSON s platným JSON nahradí data',
      run: function () {
        S.resetCache();
        S.setData(M.vychoziStav());
        var importData = {
          version: 1,
          zamestnanci: [{ id: 'imp-1', jmeno: 'Importovaná', uvazekMinutyTyden: 360, role: 'učitelka' }],
          budovy: [],
          minMaxSloty: M.vychoziMinMaxSloty(),
          pravidla: M.vychoziPravidla()
        };
        var ok = EI.importZeJSON(JSON.stringify(importData));
        T.assert(ok === true, 'import vrátí true');
        var d = S.getData();
        T.assert(d.zamestnanci.length === 1 && d.zamestnanci[0].jmeno === 'Importovaná', 'data po importu odpovídají');
      }
    },
    {
      name: 'importZeJSON s neplatným JSON nezmění data a vrátí false',
      run: function () {
        S.resetCache();
        var stav = M.vychoziStav();
        stav.zamestnanci.push(M.vytvorZamestnance('Před importem', 0, M.ROLE.UCITELKA));
        S.setData(stav);
        T.assert(EI.importZeJSON('{ neplatný }') === false, 'neplatný JSON vrátí false');
        T.assert(EI.importZeJSON('') === false, 'prázdný řetězec vrátí false');
        T.assert(EI.importZeJSON('null') === false, 'null vrátí false');
        var d = S.getData();
        T.assert(d.zamestnanci.length === 1 && d.zamestnanci[0].jmeno === 'Před importem', 'data zůstala beze změny');
      }
    },
    {
      name: 'importZeJSON doplní chybějící version, minMaxSloty, pravidla',
      run: function () {
        S.resetCache();
        var minimalni = { zamestnanci: [], budovy: [] };
        var ok = EI.importZeJSON(JSON.stringify(minimalni));
        T.assert(ok === true, 'minimální objekt se naimportuje');
        var d = S.getData();
        T.assert(d.version != null, 'version doplněna');
        T.assert(Array.isArray(d.minMaxSloty) && d.minMaxSloty.length > 0, 'minMaxSloty doplněny');
        T.assert(d.pravidla && typeof d.pravidla === 'object', 'pravidla doplněna');
      }
    },
    {
      name: 'stahnoutExport nevyhodí (volá se bez UI)',
      run: function () {
        S.resetCache();
        S.setData(M.vychoziStav());
        try {
          EI.stahnoutExport('test-export.json');
        } catch (e) {
          T.assert(false, 'stahnoutExport nesmí vyhodit: ' + e.message);
        }
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
