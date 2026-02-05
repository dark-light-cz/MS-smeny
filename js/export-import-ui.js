/**
 * UI pro export a import dat (E1) – tlačítka na Přehledu, obnova pohledů po importu.
 */
(function (global) {
  'use strict';

  function zobrazZpravu(text, jeChyba) {
    var el = document.getElementById('export-import-zprava');
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    el.className = 'export-import-zprava ' + (jeChyba ? 'export-import-chyba' : 'export-import-uspech');
  }

  /** Po úspěšném importu obnoví zobrazení všech sekcí (zaměstnanci, budovy, sloty). */
  function obnovPohledy() {
    if (global.MSemenyZamestnanci && typeof global.MSemenyZamestnanci.vykresliSeznam === 'function') {
      global.MSemenyZamestnanci.vykresliSeznam();
    }
    if (global.MSemenyBudovyTridy && typeof global.MSemenyBudovyTridy.vykresliHierarchii === 'function') {
      global.MSemenyBudovyTridy.vykresliHierarchii();
    }
    if (global.MSemenyMinMaxSloty && typeof global.MSemenyMinMaxSloty.vykresliSeznam === 'function') {
      global.MSemenyMinMaxSloty.vykresliSeznam();
    }
    if (global.MSemenyOmezeniNeDohromady) {
      if (typeof global.MSemenyOmezeniNeDohromady.naplnSelecty === 'function') {
        global.MSemenyOmezeniNeDohromady.naplnSelecty();
      }
      if (typeof global.MSemenyOmezeniNeDohromady.vykresliSeznam === 'function') {
        global.MSemenyOmezeniNeDohromady.vykresliSeznam();
      }
    }
  }

  function init() {
    var EI = global.MSemenyExportImport;
    if (!EI) return;

    var btnExport = document.getElementById('btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', function () {
        try {
          EI.stahnoutExport();
          zobrazZpravu('Data byla exportována a soubor byl stažen.', false);
          setTimeout(function () { zobrazZpravu(''); }, 4000);
        } catch (e) {
          zobrazZpravu('Export se nezdařil: ' + (e.message || e), true);
        }
      });
    }

    var btnImport = document.getElementById('btn-import');
    var inputImport = document.getElementById('input-import');
    if (btnImport && inputImport) {
      btnImport.addEventListener('click', function () {
        inputImport.value = '';
        inputImport.click();
      });
      inputImport.addEventListener('change', function () {
        var file = inputImport.files && inputImport.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var text = typeof reader.result === 'string' ? reader.result : '';
          var ok = EI.importZeJSON(text);
          if (ok) {
            obnovPohledy();
            zobrazZpravu('Data byla naimportována. Zobrazené údaje jsou aktualizované.', false);
            setTimeout(function () { zobrazZpravu(''); }, 5000);
          } else {
            zobrazZpravu('Soubor není platná záloha dat. Zkontrolujte, že jde o JSON export z MS-smeny.', true);
          }
        };
        reader.onerror = function () {
          zobrazZpravu('Soubor se nepodařilo přečíst.', true);
        };
        reader.readAsText(file, 'UTF-8');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : this);
