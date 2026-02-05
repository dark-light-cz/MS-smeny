/**
 * Sekce Návrh směn – zobrazení výsledku výpočtu a tlačítko Přepočítat (D2).
 */
(function (global) {
  'use strict';

  var Storage = global.MSemenyStorage;
  var Vypocet = global.MSemenyVypocetSmen;

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

  function casSlotu(sloty, slotId) {
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
   * Vykreslí tabulku návrhu do #navrh-vysledek.
   * @param {Array} prirazeni - z vypocetSmen
   * @param {Object} data - konfigurace (pro názvy)
   */
  function vykresliNavrh(prirazeni, data) {
    var el = document.getElementById('navrh-vysledek');
    if (!el) return;

    if (!prirazeni || prirazeni.length === 0) {
      el.innerHTML = '<p class="navrh-prazdno">Žádné přiřazení (prázdné sloty nebo konfigurace).</p>';
      return;
    }

    var budovy = data.budovy || [];
    var zamestnanci = data.zamestnanci || [];
    var sloty = seradSloty(data.minMaxSloty);

    var group = {};
    var key, item, den, slotId, budovaId, tridaId, ids, names, row, rows = [];

    for (var i = 0; i < prirazeni.length; i += 1) {
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
      for (var si = 0; si < sloty.length; si += 1) {
        if (sloty[si].id === slotId) { slotOrder = si; break; }
      }
      rows.push({
        den: den,
        denLabel: NAZVY_DNU[den],
        cas: casSlotu(sloty, slotId),
        slotOrder: slotOrder,
        misto: misto,
        jmena: names
      });
    }

    rows.sort(function (a, b) {
      if (a.den !== b.den) return a.den - b.den;
      if (a.slotOrder !== b.slotOrder) return a.slotOrder - b.slotOrder;
      return (a.misto || '').localeCompare(b.misto || '');
    });

    var html = [
      '<table class="tabulka-navrh">',
      '<thead><tr><th>Den</th><th>Čas</th><th>Místo</th><th>Osoby</th></tr></thead>',
      '<tbody>'
    ];
    for (i = 0; i < rows.length; i += 1) {
      row = rows[i];
      html.push('<tr>');
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
      vykresliNavrh(result.prirazeni, data);
    } else {
      zobrazChybu(result.chyba || 'Výpočet se nezdařil.');
      document.getElementById('navrh-vysledek').innerHTML = '<p class="navrh-prazdno">' + escapeHtml(result.chyba || '') + '</p>';
    }
  }

  function init() {
    var btn = document.getElementById('navrh-prepocitat');
    if (btn) btn.addEventListener('click', prepocitat);

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
    vykresliNavrh: vykresliNavrh
  };
})(typeof window !== 'undefined' ? window : this);
