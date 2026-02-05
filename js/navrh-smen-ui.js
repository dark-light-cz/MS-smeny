/**
 * Sekce Návrh směn – zobrazení výsledku výpočtu a tlačítko Přepočítat (D2).
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

  function casSlotu(sloty, slotId, data) {
    if (slotId === 'overlap-prekryv' && data && data.pravidla) {
      var min = parseInt(data.pravidla.minimalniPrekryvMinuty, 10) || 120;
      var odM = 9 * 60;
      var doM = odM + min;
      var od = (Math.floor(odM / 60) < 10 ? '0' : '') + Math.floor(odM / 60) + ':' + (odM % 60 < 10 ? '0' : '') + (odM % 60);
      var do_ = (Math.floor(doM / 60) < 10 ? '0' : '') + Math.floor(doM / 60) + ':' + (doM % 60 < 10 ? '0' : '') + (doM % 60);
      return 'Překryv (' + od + '–' + do_ + ')';
    }
    for (var i = 0; i < (sloty || []).length; i += 1) {
      if (sloty[i].id === slotId) {
        var s = sloty[i];
        return (s.od || '') + '–' + (s.do || '');
      }
    }
    return slotId || '';
  }

  function jmenoZamestnance(zamestnanci, id) {
    for (var i = 0; i < (zamestnanci || []).length; i += 1) {
      if (zamestnanci[i].id === id) return zamestnanci[i].jmeno || '(bez jména)';
    }
    return '(?)';
  }

  /** Seřadí sloty podle času od. */
  function seradSloty(sloty) {
    return (sloty || []).slice().sort(function (a, b) {
      return (a.od || '').localeCompare(b.od || '');
    });
  }

  /**
   * Vrátí seznam řádků návrhu (pro tabulku i CSV). Bez DOM.
   * @param {Array} prirazeni - z vypocetSmen
   * @param {Object} data - konfigurace (pro názvy)
   * @param {{ chybiPozice?: { den, slotId, slotOdDo, mistoLabel, tridaId } }} opts - volitelně chybějící pozice
   * @returns {Array<{ den, denLabel, cas, misto, jmena, chybiRow }>}
   */
  function getNavrhRows(prirazeni, data, opts) {
    opts = opts || {};
    var chybiPozice = opts.chybiPozice;
    var budovy = (data && data.budovy) || [];
    var zamestnanci = (data && data.zamestnanci) || [];
    var sloty = seradSloty(data && data.minMaxSloty);

    var group = {};
    var key, item, den, slotId, budovaId, tridaId, ids, names, row, rows = [];

    for (var i = 0; i < (prirazeni || []).length; i += 1) {
      item = prirazeni[i];
      den = item.den;
      slotId = item.slotId;
      budovaId = item.budovaId || '';
      tridaId = item.tridaId || '';
      key = den + '|' + slotId + '|' + budovaId + '|' + tridaId;
      if (!group[key]) group[key] = { den: den, slotId: slotId, budovaId: budovaId || null, tridaId: tridaId || null, zamestnanci: [] };
      group[key].zamestnanci.push(item.zamestnanecId);
    }

    for (key in group) {
      if (!group.hasOwnProperty(key)) continue;
      row = group[key];
      den = row.den;
      slotId = row.slotId;
      budovaId = row.budovaId;
      tridaId = row.tridaId;
      ids = row.zamestnanci;
      names = ids.map(function (id) { return jmenoZamestnance(zamestnanci, id); });
      var misto = tridaId
        ? ('Třída: ' + nazevTridy(budovy, tridaId))
        : ('Budova: ' + nazevBudovy(budovy, budovaId));
      var slotOrder = 0;
      if (slotId === 'overlap-prekryv') {
        slotOrder = 1;
      } else {
        for (var si = 0; si < sloty.length; si += 1) {
          if (sloty[si].id === slotId) { slotOrder = si; break; }
        }
      }
      rows.push({
        den: den,
        denLabel: NAZVY_DNU[den],
        cas: casSlotu(sloty, slotId, data),
        slotOrder: slotOrder,
        misto: misto,
        jmena: names,
        chybiRow: false
      });
    }

    if (chybiPozice) {
      var cp = chybiPozice;
      var mistoChybi = cp.tridaId ? ('Třída: ' + (cp.mistoLabel || '')) : ('Budova: ' + (cp.mistoLabel || ''));
      var slotOrderChybi = (cp.slotId === 'overlap-prekryv') ? 1 : 0;
      if (cp.slotId !== 'overlap-prekryv' && sloty.length) {
        for (var s = 0; s < sloty.length; s += 1) {
          if (sloty[s].id === cp.slotId) { slotOrderChybi = s; break; }
        }
      }
      rows.push({
        den: cp.den,
        denLabel: NAZVY_DNU[cp.den],
        cas: cp.slotOdDo || '',
        slotOrder: slotOrderChybi,
        misto: mistoChybi,
        jmena: ['Chybějící úvazek'],
        chybiRow: true
      });
    }

    rows.sort(function (a, b) {
      if (a.den !== b.den) return a.den - b.den;
      if (a.slotOrder !== b.slotOrder) return a.slotOrder - b.slotOrder;
      return (a.misto || '').localeCompare(b.misto || '');
    });
    return rows;
  }

  /**
   * Vykreslí tabulku návrhu do #navrh-vysledek.
   * @param {Array} prirazeni - z vypocetSmen
   * @param {Object} data - konfigurace (pro názvy)
   * @param {{ chybiPozice?: { den, slotId, slotOdDo, mistoLabel, tridaId } }} opts - volitelně chybějící pozice (červený řádek)
   */
  function vykresliNavrh(prirazeni, data, opts) {
    var el = document.getElementById('navrh-vysledek');
    if (!el) return;

    opts = opts || {};
    var chybiPozice = opts.chybiPozice;

    if (!prirazeni || prirazeni.length === 0) {
      if (!chybiPozice) {
        el.innerHTML = '<p class="navrh-prazdno">Žádné přiřazení (prázdné sloty nebo konfigurace).</p>';
        return;
      }
    }

    var rows = getNavrhRows(prirazeni, data, opts);

    var html = [
      '<table class="tabulka-navrh">',
      '<thead><tr><th>Den</th><th>Čas</th><th>Místo</th><th>Osoby</th></tr></thead>',
      '<tbody>'
    ];
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      var trClass = row.chybiRow ? ' class="navrh-radek-chybi"' : '';
      html.push('<tr' + trClass + '>');
      html.push('<td>' + escapeHtml(row.denLabel) + '</td>');
      html.push('<td>' + escapeHtml(row.cas) + '</td>');
      html.push('<td>' + escapeHtml(row.misto) + '</td>');
      html.push('<td>' + escapeHtml(row.jmena.join(', ')) + '</td>');
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
      lastNavrhResult = { prirazeni: result.prirazeni, data: data, opts: {} };
      vykresliNavrh(result.prirazeni, data);
      zobrazTlacitkoCsv(true);
    } else {
      zobrazChybu(result.chyba || 'Výpočet se nezdařil.');
      if (result.chybiPozice) {
        lastNavrhResult = { prirazeni: result.prirazeni || [], data: data, opts: { chybiPozice: result.chybiPozice } };
        vykresliNavrh(result.prirazeni || [], data, { chybiPozice: result.chybiPozice });
        zobrazTlacitkoCsv(true);
      } else {
        lastNavrhResult = null;
        zobrazTlacitkoCsv(false);
        document.getElementById('navrh-vysledek').innerHTML = '<p class="navrh-prazdno">' + escapeHtml(result.chyba || '') + '</p>';
      }
    }
  }

  function stahnoutCsv() {
    if (!lastNavrhResult || !global.MSemenyExportNavrhCsv || !global.MSemenyExportNavrhCsv.stahnoutNavrhCsv) return;
    global.MSemenyExportNavrhCsv.stahnoutNavrhCsv(
      lastNavrhResult.prirazeni,
      lastNavrhResult.data,
      lastNavrhResult.opts
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
      el.innerHTML = '<p class="navrh-prazdno">Klikněte na „Přepočítat“, aby se vygeneroval návrh směn podle aktuální konfigurace.</p>';
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
