/**
 * Export výsledku návrhu směn jako CSV (D2c).
 * Sloupce: Den, Čas, Místo, Osoby. Oddělovač ; (běžný v CZ Excelu).
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
   * Vrátí návrh směn jako CSV řetězec (sloupce Den, Čas, Místo, Osoby).
   * @param {Array} prirazeni - z vypocetSmen (nebo prázdné)
   * @param {Object} data - konfigurace (pro názvy)
   * @param {{ chybiPozice?: Object }} opts - volitelně chybiPozice pro řádek „Chybějící úvazek“
   * @returns {string} CSV s hlavičkou a řádky
   */
  function navrhToCsv(prirazeni, data, opts) {
    var UI = global.MSemenyNavrhSmenUI;
    if (!UI || !UI.getNavrhRows) {
      return 'Den;Čas;Místo;Osoby\n';
    }
    var rows = UI.getNavrhRows(prirazeni || [], data || {}, opts || {});
    var lines = ['Den;Čas;Místo;Osoby'];
    for (var i = 0; i < rows.length; i += 1) {
      var r = rows[i];
      var osoby = (r.jmena && r.jmena.length) ? r.jmena.join(', ') : '';
      lines.push(csvEscape(r.denLabel) + ';' + csvEscape(r.cas) + ';' + csvEscape(r.misto) + ';' + csvEscape(osoby));
    }
    return lines.join('\n');
  }

  /**
   * Stáhne návrh směn jako CSV soubor.
   * @param {Array} prirazeni - z vypocetSmen
   * @param {Object} data - konfigurace
   * @param {{ chybiPozice?: Object }} opts - volitelně
   * @param {string} [nazevSouboru] - volitelný název souboru
   */
  function stahnoutNavrhCsv(prirazeni, data, opts, nazevSouboru) {
    var nazev = (nazevSouboru && typeof nazevSouboru === 'string') ? nazevSouboru : DEFAULT_NAZEV_SOUBORU;
    var csv = navrhToCsv(prirazeni, data, opts);
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
