/**
 * Sekce Návrh směn – zobrazení výsledku výpočtu a tlačítko Přepočítat (D2).
 * Přizpůsobeno novému formátu výstupu: prirazeni = [{ den, zamestnanecId, segmenty }].
 */
(function (global) {
  'use strict';

  var Storage = global.MSemenyStorage;
  var Vypocet = global.MSemenyVypocetSmen;
  /** Poslední zobrazený výsledek návrhu (pro export CSV). */
  var lastNavrhResult = null;

  function getData() {
    return Storage ? Storage.getData() : { zamestnanci: [], budovy: [], minMaxSloty: [] };
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  var NAZVY_DNU = ['', 'Po', 'Út', 'St', 'Čt', 'Pá'];

  function nazevBudovy(budovy, id) {
    if (!id) return '';
    for (var i = 0; i < (budovy || []).length; i += 1) {
      if (budovy[i].id === id) return budovy[i].nazev || '(bez názvu)';
    }
    return '(?)';
  }

  function nazevTridy(budovy, tridaId) {
    if (!tridaId) return '';
    for (var i = 0; i < (budovy || []).length; i += 1) {
      var b = budovy[i];
      if (b.tridy) {
        for (var j = 0; j < b.tridy.length; j += 1) {
          if (b.tridy[j].id === tridaId) {
            return (b.tridy[j].nazev || '(bez názvu)') + ' (' + (b.nazev || '') + ')';
          }
        }
      }
    }
    return '(?)';
  }

  function jmenoZamestnance(zamestnanci, id) {
    for (var i = 0; i < (zamestnanci || []).length; i += 1) {
      if (zamestnanci[i].id === id) return zamestnanci[i].jmeno || '(bez jména)';
    }
    return '(?)';
  }

  function mistoLabel(budovy, seg) {
    if (seg.tridaId) return 'Třída: ' + nazevTridy(budovy, seg.tridaId);
    if (seg.budovaId) return 'Budova: ' + nazevBudovy(budovy, seg.budovaId);
    return '';
  }

  /**
   * Vrátí seznam řádků návrhu (pro tabulku i CSV). Bez DOM.
   * Nový formát: jeden řádek = jeden segment jednoho zaměstnance.
   * @param {Array} prirazeni - z vypocetSmen (nový formát: { den, zamestnanecId, segmenty })
   * @param {Object} data - konfigurace (pro názvy)
   * @returns {Array<{ den, denLabel, zamestnanec, cas, misto }>}
   */
  function getNavrhRows(prirazeni, data) {
    var budovy = (data && data.budovy) || [];
    var zamestnanci = (data && data.zamestnanci) || [];
    var rows = [];

    for (var i = 0; i < (prirazeni || []).length; i += 1) {
      var p = prirazeni[i];
      var jmeno = jmenoZamestnance(zamestnanci, p.zamestnanecId);
      var segs = p.segmenty || [];
      for (var j = 0; j < segs.length; j += 1) {
        var seg = segs[j];
        rows.push({
          den: p.den,
          denLabel: NAZVY_DNU[p.den] || '',
          zamestnanec: jmeno,
          cas: (seg.od || '') + '–' + (seg.do || ''),
          misto: mistoLabel(budovy, seg),
          // Pomocné pro řazení
          _od: seg.od || '',
          _zamId: p.zamestnanecId
        });
      }
    }

    // Řazení: den → čas od → jméno
    rows.sort(function (a, b) {
      if (a.den !== b.den) return a.den - b.den;
      if (a._od !== b._od) return a._od.localeCompare(b._od);
      return a.zamestnanec.localeCompare(b.zamestnanec);
    });

    return rows;
  }

  /**
   * Vykreslí tabulku návrhu do #navrh-vysledek.
   * @param {Array} prirazeni - z vypocetSmen (nový formát)
   * @param {Object} data - konfigurace (pro názvy)
   */
  function vykresliNavrh(prirazeni, data) {
    var el = document.getElementById('navrh-vysledek');
    if (!el) return;

    if (!prirazeni || prirazeni.length === 0) {
      el.innerHTML = '<p class="navrh-prazdno">Žádné přiřazení (prázdné sloty nebo konfigurace).</p>';
      return;
    }

    var rows = getNavrhRows(prirazeni, data);

    var html = [
      '<table class="tabulka-navrh">',
      '<thead><tr><th>Den</th><th>Zaměstnanec</th><th>Čas</th><th>Místo</th></tr></thead>',
      '<tbody>'
    ];
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      html.push('<tr>');
      html.push('<td>' + escapeHtml(row.denLabel) + '</td>');
      html.push('<td>' + escapeHtml(row.zamestnanec) + '</td>');
      html.push('<td>' + escapeHtml(row.cas) + '</td>');
      html.push('<td>' + escapeHtml(row.misto) + '</td>');
      html.push('</tr>');
    }
    html.push('</tbody></table>');
    el.innerHTML = html.join('');
  }

  function zobrazChybu(text) {
    var el = document.getElementById('navrh-zprava');
    var ok = document.getElementById('navrh-uspech');
    if (el) {
      el.textContent = text || '';
      el.hidden = !text;
    }
    if (ok) ok.hidden = true;
  }

  function zobrazUspech(text) {
    var el = document.getElementById('navrh-uspech');
    var err = document.getElementById('navrh-zprava');
    if (el) {
      el.textContent = text || '';
      el.hidden = !text;
      if (text) setTimeout(function () { el.hidden = true; el.textContent = ''; }, 4000);
    }
    if (err) err.hidden = true;
  }

  function prepocitat() {
    if (!Storage || !Vypocet || !Vypocet.vypocetSmen) return;
    var data = getData();
    var result = Vypocet.vypocetSmen(data);

    if (result.ok) {
      zobrazUspech('Návrh byl přepočítán.');
      lastNavrhResult = { prirazeni: result.prirazeni, data: data };
      vykresliNavrh(result.prirazeni, data);
      zobrazTlacitkoCsv(true);
    } else {
      zobrazChybu(result.chyba || 'Výpočet se nezdařil.');
      lastNavrhResult = null;
      zobrazTlacitkoCsv(false);
      var vysledekEl = document.getElementById('navrh-vysledek');
      if (vysledekEl) {
        vysledekEl.innerHTML = '<p class="navrh-prazdno">' + escapeHtml(result.chyba || '') + '</p>';
      }
    }
  }

  function stahnoutCsv() {
    if (!lastNavrhResult || !global.MSemenyExportNavrhCsv || !global.MSemenyExportNavrhCsv.stahnoutNavrhCsv) return;
    global.MSemenyExportNavrhCsv.stahnoutNavrhCsv(
      lastNavrhResult.prirazeni,
      lastNavrhResult.data
    );
  }

  function zobrazTlacitkoCsv(zobrazit) {
    var btn = document.getElementById('navrh-stahnout-csv');
    if (btn) btn.hidden = !zobrazit;
  }

  function init() {
    var btn = document.getElementById('navrh-prepocitat');
    if (btn) btn.addEventListener('click', prepocitat);

    var btnCsv = document.getElementById('navrh-stahnout-csv');
    if (btnCsv) {
      btnCsv.addEventListener('click', stahnoutCsv);
      btnCsv.hidden = true;
    }

    var el = document.getElementById('navrh-vysledek');
    if (el && !el.innerHTML.trim()) {
      el.innerHTML = '<p class="navrh-prazdno">Klikněte na „Přepočítat", aby se vygeneroval návrh směn podle aktuální konfigurace.</p>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.MSemenyNavrhSmenUI = {
    prepocitat: prepocitat,
    vykresliNavrh: vykresliNavrh,
    getNavrhRows: getNavrhRows
  };
})(typeof window !== 'undefined' ? window : this);
