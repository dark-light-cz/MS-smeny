/**
 * Export výsledku návrhu směn jako CSV (D2c).
 * Sloupce: Den, Zaměstnanec, Čas, Místo. Oddělovač ; (běžný v CZ Excelu).
 */
(function (global) {
  'use strict';

  var DEFAULT_NAZEV_SOUBORU = 'navrh-smen.csv';

  /**
   * Escapuje hodnotu pro CSV (obalí do uvozovek, zdvojí uvozovky uvnitř).
   * @param {string} val
   * @returns {string}
   */
  function csvEscape(val) {
    var s = val == null ? '' : String(val);
    if (s.indexOf(';') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  /**
   * Vrátí návrh směn jako CSV řetězec.
   * Sloupce: Den;Zaměstnanec;Čas;Místo
   * @param {Array} prirazeni - z vypocetSmen (nový formát: { den, zamestnanecId, segmenty })
   * @param {Object} data - konfigurace (pro názvy)
   * @returns {string} CSV s hlavičkou a řádky
   */
  function navrhToCsv(prirazeni, data) {
    var UI = global.MSemenyNavrhSmenUI;
    if (!UI || !UI.getNavrhRows) {
      return 'Den;Zaměstnanec;Čas;Místo\n';
    }
    var rows = UI.getNavrhRows(prirazeni || [], data || {});
    var lines = ['Den;Zaměstnanec;Čas;Místo'];
    for (var i = 0; i < rows.length; i += 1) {
      var r = rows[i];
      lines.push(
        csvEscape(r.denLabel) + ';' +
        csvEscape(r.zamestnanec) + ';' +
        csvEscape(r.cas) + ';' +
        csvEscape(r.misto)
      );
    }
    return lines.join('\n');
  }

  /**
   * Stáhne návrh směn jako CSV soubor.
   * @param {Array} prirazeni - z vypocetSmen
   * @param {Object} data - konfigurace
   * @param {string} [nazevSouboru] - volitelný název souboru
   */
  function stahnoutNavrhCsv(prirazeni, data, nazevSouboru) {
    var nazev = (nazevSouboru && typeof nazevSouboru === 'string') ? nazevSouboru : DEFAULT_NAZEV_SOUBORU;
    var csv = navrhToCsv(prirazeni, data);
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv; charset=utf-8' });
    var url = global.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nazev;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    global.URL.revokeObjectURL(url);
  }

  global.MSemenyExportNavrhCsv = {
    navrhToCsv: navrhToCsv,
    stahnoutNavrhCsv: stahnoutNavrhCsv
  };
})(typeof window !== 'undefined' ? window : this);
