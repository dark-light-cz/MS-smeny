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
  /** Poslední výsledek validace s chybami (pro chybový report). */
  var lastValidaceResult = null;
  /** D2d: režim grafu – 'taby' (jeden den, přepínání záložkami) nebo 'inline' (všechny dny pod sebou). */
  var grafRezim = 'taby';
  /** D2d: vybraný den v režimu Taby (1–5). */
  var grafVybranyDen = 1;
  /** ID vybraných budov pro zobrazení v grafu (null = všechny, jinak objekt { id: true }). */
  var grafVybraneBudovyIds = null;

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

  function getVybranyAlgoritmusId() {
    var sel = document.getElementById('navrh-algoritmus');
    return (sel && sel.value) ? sel.value : null;
  }

  function prepocitat() {
    if (!Storage || !Vypocet || !Vypocet.vypocetSmen) return;
    var data = getData();
    var algorithmId = getVybranyAlgoritmusId();
    var result = Vypocet.vypocetSmen(data, algorithmId);

    if (result.ok) {
      zobrazUspech('Návrh byl přepočítán.');
      lastNavrhResult = { prirazeni: result.prirazeni, data: data };
      grafVybraneBudovyIds = null;
      vykresliNavrh(result.prirazeni, data);
      zobrazGraf(result.prirazeni, data, { onSegmentClick: handleSegmentClick, onSegmentDrop: handleSegmentDrop });
      zobrazTlacitkoCsv(true);
      var Validace = global.MSemenyValidaceNavrhu;
      var vResult = (Validace && Validace.validujNavrh) ? Validace.validujNavrh(result.prirazeni, data) : { ok: true, polozky: [] };
      validovat(vResult);
      if (vResult.polozky && vResult.polozky.length > 0) {
        lastValidaceResult = { data: data, prirazeni: result.prirazeni, polozky: vResult.polozky };
        zobrazTlacitkoChybovyReport(true);
      } else {
        lastValidaceResult = null;
        zobrazTlacitkoChybovyReport(false);
      }
    } else {
      zobrazChybu(result.chyba || 'Výpočet se nezdařil.');
      lastNavrhResult = null;
      zobrazGraf([], null);
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

  function zobrazTlacitkoChybovyReport(zobrazit) {
    var btn = document.getElementById('navrh-stahnout-chybovy-report');
    if (btn) btn.hidden = !zobrazit;
  }

  function stahnoutChybovyReport() {
    if (!lastValidaceResult || !global.MSemenyChybovyReport || !global.MSemenyChybovyReport.stahnoutChybovyReport) return;
    global.MSemenyChybovyReport.stahnoutChybovyReport(
      lastValidaceResult.data,
      lastValidaceResult.prirazeni,
      lastValidaceResult.polozky
    );
  }

  function nahratCsv() {
    var input = document.getElementById('navrh-csv-input');
    if (input) input.click();
  }

  /**
   * Spustí validaci a zobrazí výsledek. Volitelně přijme předpočítaný výsledek (např. po Přepočítat).
   * @param {Object} [optionalResult] - { ok, polozky } z Validace.validujNavrh
   */
  function validovat(optionalResult) {
    var container = document.getElementById('navrh-validace-vysledek');
    if (!container) return;

    if (!lastNavrhResult) {
      container.hidden = false;
      container.innerHTML = '<p class="navrh-validace-zadny">Nejprve přepočítejte nebo načtěte návrh z CSV.</p>';
      lastValidaceResult = null;
      zobrazTlacitkoChybovyReport(false);
      return;
    }

    var Validace = global.MSemenyValidaceNavrhu;
    if (!Validace || !Validace.validujNavrh) {
      container.hidden = false;
      container.innerHTML = '<p class="navrh-validace-zadny">Modul validace není k dispozici.</p>';
      lastValidaceResult = null;
      zobrazTlacitkoChybovyReport(false);
      return;
    }

    var result = (optionalResult && optionalResult.polozky) ? optionalResult : Validace.validujNavrh(lastNavrhResult.prirazeni, lastNavrhResult.data);
    container.hidden = false;

    if (result.polozky && result.polozky.length > 0) {
      lastValidaceResult = { data: lastNavrhResult.data, prirazeni: lastNavrhResult.prirazeni, polozky: result.polozky };
      zobrazTlacitkoChybovyReport(true);
    } else {
      lastValidaceResult = null;
      zobrazTlacitkoChybovyReport(false);
    }

    if (!result.polozky || result.polozky.length === 0) {
      container.innerHTML = '<p class="navrh-validace-ok">Návrh vyhovuje zadaným pravidlům (úvazky v pořádku).</p>';
      return;
    }

    var html = ['<table class="tabulka-validace"><thead><tr><th>Pravidlo</th><th>Kontext</th></tr></thead><tbody>'];
    for (var i = 0; i < result.polozky.length; i += 1) {
      var p = result.polozky[i];
      var trClass = p.typ === 'chyba' ? ' class="validace-chyba"' : ' class="validace-varovani"';
      var kontextHtml = escapeHtml(p.kontext);
      if (p.pravidlo === 'Nevyčerpaný úvazek' && p.zamestnanecId) {
        var colonIdx = p.kontext.indexOf(': ');
        if (colonIdx >= 0) {
          var jmenoPart = p.kontext.slice(0, colonIdx);
          var restPart = p.kontext.slice(colonIdx);
          kontextHtml = '<span class="validace-jmeno-link" data-zam-id="' + escapeAttr(p.zamestnanecId) + '" role="button" tabindex="0">' + escapeHtml(jmenoPart) + '</span>' + escapeHtml(restPart);
        }
      } else if (p.pravidlo === 'Překryv směn' && p.seg1Label != null && p.seg2Label != null) {
        var jmenoPrekryv = jmenoZamestnance(lastNavrhResult.data.zamestnanci, p.zamestnanecId);
        kontextHtml = escapeHtml(jmenoPrekryv) + ': současně <span class="validace-segment-link" data-den="' + escapeAttr(p.den) + '" data-zam-id="' + escapeAttr(p.zamestnanecId) + '" data-seg-index="' + escapeAttr(p.segIndex1) + '" role="button" tabindex="0">' + escapeHtml(p.seg1Label) + '</span> a <span class="validace-segment-link" data-den="' + escapeAttr(p.den) + '" data-zam-id="' + escapeAttr(p.zamestnanecId) + '" data-seg-index="' + escapeAttr(p.segIndex2) + '" role="button" tabindex="0">' + escapeHtml(p.seg2Label) + '</span>';
      }
      html.push('<tr' + trClass + '><td>' + escapeHtml(p.pravidlo) + '</td><td>' + kontextHtml + '</td></tr>');
    }
    html.push('</tbody></table>');
    container.innerHTML = html.join('');
    var linkEls = container.querySelectorAll('.validace-jmeno-link');
    for (var li = 0; li < linkEls.length; li += 1) {
      linkEls[li].addEventListener('click', function () {
        var zamId = this.getAttribute('data-zam-id');
        if (zamId) openDoplnitModal(zamId);
      });
      linkEls[li].addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var zamId = this.getAttribute('data-zam-id');
          if (zamId) openDoplnitModal(zamId);
        }
      });
    }
    var segmentLinkEls = container.querySelectorAll('.validace-segment-link');
    for (var sl = 0; sl < segmentLinkEls.length; sl += 1) {
      segmentLinkEls[sl].addEventListener('click', function () {
        var den = parseInt(this.getAttribute('data-den'), 10);
        var zamId = this.getAttribute('data-zam-id');
        var segIdx = parseInt(this.getAttribute('data-seg-index'), 10);
        if (!isNaN(den) && zamId && !isNaN(segIdx)) openSegmentEditModal(den, zamId, segIdx);
      });
      segmentLinkEls[sl].addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var den = parseInt(this.getAttribute('data-den'), 10);
          var zamId = this.getAttribute('data-zam-id');
          var segIdx = parseInt(this.getAttribute('data-seg-index'), 10);
          if (!isNaN(den) && zamId && !isNaN(segIdx)) openSegmentEditModal(den, zamId, segIdx);
        }
      });
    }
  }

  function escapeAttr(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function onCsvFileSelected(event) {
    var input = event.target;
    var file = input.files && input.files[0];
    if (!file) return;
    input.value = '';

    var ImportCsv = global.MSemenyImportNavrhCsv;
    if (!ImportCsv || !ImportCsv.csvToPrirazeni) {
      zobrazChybu('Import CSV není k dispozici.');
      return;
    }
    var data = getData();
    var reader = new FileReader();
    reader.onload = function () {
      var result = ImportCsv.csvToPrirazeni(reader.result, data);
      if (result.ok) {
        lastNavrhResult = { prirazeni: result.prirazeni, data: data };
        grafVybraneBudovyIds = null;
        vykresliNavrh(result.prirazeni, data);
        zobrazGraf(result.prirazeni, data, { onSegmentClick: handleSegmentClick, onSegmentDrop: handleSegmentDrop });
        zobrazTlacitkoCsv(true);
        if (result.varovani && result.varovani.length > 0) {
          zobrazUspech('CSV načteno. Varování: ' + result.varovani.join(' '));
        } else {
          zobrazUspech('Návrh byl načten z CSV.');
        }
      } else {
        lastNavrhResult = null;
        vykresliNavrh([], data);
        zobrazGraf([], null);
        zobrazTlacitkoCsv(false);
        var msg = result.chyba || 'Import se nezdařil.';
        if (result.varovani && result.varovani.length > 0) {
          msg += ' ' + result.varovani.join(' ');
        }
        zobrazChybu(msg);
      }
    };
    reader.onerror = function () {
      zobrazChybu('Soubor se nepodařilo přečíst.');
    };
    reader.readAsText(file, 'UTF-8');
  }

  /** Sestaví z výsledku validace mapy budov/tříd s varováním Min/max pro každý den (pro graf). */
  function buildValidaceVarovaniProGraf(prirazeni, data) {
    var Validace = global.MSemenyValidaceNavrhu;
    if (!Validace || !Validace.validujNavrh || !prirazeni || !data) return { budovy: {}, tridy: {} };
    var result = Validace.validujNavrh(prirazeni, data);
    var budovy = {};
    var tridy = {};
    (result.polozky || []).forEach(function (p) {
      if (p.pravidlo === 'Min/max na budovu' && p.den != null && p.budovaId) {
        if (!budovy[p.den]) budovy[p.den] = {};
        budovy[p.den][p.budovaId] = true;
      }
      if (p.pravidlo === 'Min/max na třídu' && p.den != null && p.tridaId) {
        if (!tridy[p.den]) tridy[p.den] = {};
        tridy[p.den][p.tridaId] = true;
      }
    });
    var budovyArr = {};
    var tridyArr = {};
    for (var d = 1; d <= 5; d += 1) {
      budovyArr[d] = budovy[d] ? Object.keys(budovy[d]) : [];
      tridyArr[d] = tridy[d] ? Object.keys(tridy[d]) : [];
    }
    return { budovy: budovyArr, tridy: tridyArr };
  }

  function zobrazGraf(prirazeni, data, grafOpts) {
    var Graf = global.MSemenyNavrhGraf;
    var container = document.getElementById('navrh-graf');
    if (!Graf || !Graf.vykresliNavrhGraf || !container) return;
    var budovy = (data && data.budovy) || [];
    if (budovy.length > 0 && grafVybraneBudovyIds === null) {
      grafVybraneBudovyIds = {};
      budovy.forEach(function (b) { if (b.id) grafVybraneBudovyIds[b.id] = true; });
    }
    var vybraneIds = grafVybraneBudovyIds == null ? [] : Object.keys(grafVybraneBudovyIds).filter(function (id) { return grafVybraneBudovyIds[id]; });
    var dataProGraf = data ? { zamestnanci: data.zamestnanci || [], budovy: vybraneIds.length === 0 ? budovy : budovy.filter(function (b) { return grafVybraneBudovyIds[b.id]; }) } : {};
    var validaceVarovani = buildValidaceVarovaniProGraf(prirazeni || [], data || {});
    var opts = Object.assign({}, grafOpts || {}, {
      validaceVarovani: validaceVarovani,
      rezim: grafRezim,
      vsechnyBudovy: budovy,
      vybraneBudovyIds: vybraneIds.length > 0 ? vybraneIds : budovy.map(function (b) { return b.id; }),
      onBudovyChange: function (selectedIds) {
        grafVybraneBudovyIds = {};
        (selectedIds || []).forEach(function (id) { grafVybraneBudovyIds[id] = true; });
        if (lastNavrhResult) zobrazGraf(lastNavrhResult.prirazeni, lastNavrhResult.data, grafOpts);
      },
      onDenChange: function (d) {
        grafVybranyDen = d;
        if (lastNavrhResult) zobrazGraf(lastNavrhResult.prirazeni, lastNavrhResult.data, grafOpts);
      },
      onRezimChange: function (r) {
        grafRezim = r;
        if (lastNavrhResult) zobrazGraf(lastNavrhResult.prirazeni, lastNavrhResult.data, grafOpts);
      }
    });
    opts.onSegmentResize = handleSegmentResize;
    opts.onSegmentEdit = openSegmentEditModal;
    opts.onSegmentDelete = deleteSegmentByIndex;
    Graf.vykresliNavrhGraf(prirazeni || [], dataProGraf, container, grafVybranyDen, opts);
  }

  /** Hluboká kopie prirazeni pro úpravy. */
  function clonePrirazeni(prirazeni) {
    return JSON.parse(JSON.stringify(prirazeni || []));
  }

  /**
   * Aplikuje změněný návrh (po editaci na grafu nebo doplnění úvazku) a obnoví zobrazení.
   * @param {Array} prirazeni - nové přiřazení
   */
  function applyNavrhChange(prirazeni) {
    if (!lastNavrhResult) return;
    lastNavrhResult = { prirazeni: prirazeni, data: lastNavrhResult.data };
    vykresliNavrh(prirazeni, lastNavrhResult.data);
    zobrazGraf(prirazeni, lastNavrhResult.data, { onSegmentClick: handleSegmentClick, onSegmentDrop: handleSegmentDrop });
    var validaceEl = document.getElementById('navrh-validace-vysledek');
    if (validaceEl && !validaceEl.hidden) validovat();
  }

  function handleSegmentDrop(payload, targetTridaId, targetBudovaId) {
    if (!lastNavrhResult) return;
    var prirazeni = clonePrirazeni(lastNavrhResult.prirazeni);
    var p = prirazeni.find(function (x) { return x.den === payload.den && x.zamestnanecId === payload.zamestnanecId; });
    if (!p || !p.segmenty || !p.segmenty[payload.segIndex]) return;
    var seg = p.segmenty[payload.segIndex];
    seg.tridaId = targetTridaId || undefined;
    seg.budovaId = targetBudovaId || undefined;
    applyNavrhChange(prirazeni);
  }

  var segmentEditState = null; // { den, zamestnanecId, segIndex } při otevřeném modalu

  /**
   * Otevře modal editace segmentu pro daný den, zaměstnance a index segmentu.
   * Volá se z grafu (handleSegmentClick) i z tabulky validace (řádek „Překryv směn“).
   */
  function openSegmentEditModal(den, zamestnanecId, segIndex) {
    if (!lastNavrhResult) return;
    var p = lastNavrhResult.prirazeni.find(function (x) { return x.den === den && x.zamestnanecId === zamestnanecId; });
    if (!p || !p.segmenty || !p.segmenty[segIndex]) return;
    var seg = p.segmenty[segIndex];
    segmentEditState = { den: den, zamestnanecId: zamestnanecId, segIndex: segIndex };
    var modal = document.getElementById('navrh-segment-modal');
    var jmenoEl = document.getElementById('navrh-segment-jmeno');
    var denSelect = document.getElementById('navrh-segment-den');
    var odInput = document.getElementById('navrh-segment-od');
    var doInput = document.getElementById('navrh-segment-do');
    var mistoSelect = document.getElementById('navrh-segment-misto');
    if (!modal || !jmenoEl || !denSelect) return;

    jmenoEl.textContent = jmenoZamestnance(lastNavrhResult.data.zamestnanci, zamestnanecId);
    denSelect.innerHTML = '';
    for (var d = 1; d <= 5; d += 1) {
      var opt = document.createElement('option');
      opt.value = d;
      opt.textContent = NAZVY_DNU[d];
      if (d === den) opt.selected = true;
      denSelect.appendChild(opt);
    }
    odInput.value = seg.od || '';
    doInput.value = seg.do || '';
    mistoSelect.innerHTML = '';
    var budovy = lastNavrhResult.data.budovy || [];
    for (var bi = 0; bi < budovy.length; bi += 1) {
      var b = budovy[bi];
      var optB = document.createElement('option');
      optB.value = 'b:' + (b.id || '');
      optB.textContent = 'Budova: ' + (b.nazev || '(bez názvu)');
      if (!seg.tridaId && seg.budovaId === b.id) optB.selected = true;
      mistoSelect.appendChild(optB);
      var tridy = b.tridy || [];
      for (var ti = 0; ti < tridy.length; ti += 1) {
        var t = tridy[ti];
        var optT = document.createElement('option');
        optT.value = 't:' + (t.id || '');
        optT.textContent = (t.nazev || '(třída)') + ' (' + (b.nazev || '') + ')';
        if (seg.tridaId === t.id) optT.selected = true;
        mistoSelect.appendChild(optT);
      }
    }
    modal.hidden = false;
  }

  function handleSegmentClick(ev, info) {
    openSegmentEditModal(info.den, info.zamestnanecId, info.segIndex);
  }

  /**
   * Změna času směny tažením okraje v grafu (D11b). Volá se po dokončení tažení.
   */
  function handleSegmentResize(den, zamestnanecId, segIndex, newOd, newDo) {
    if (!lastNavrhResult) return;
    var prirazeni = clonePrirazeni(lastNavrhResult.prirazeni);
    var p = prirazeni.find(function (x) { return x.den === den && x.zamestnanecId === zamestnanecId; });
    if (!p || !p.segmenty || !p.segmenty[segIndex]) return;
    p.segmenty[segIndex].od = newOd;
    p.segmenty[segIndex].do = newDo;
    applyNavrhChange(prirazeni);
  }

  function closeSegmentModal() {
    var modal = document.getElementById('navrh-segment-modal');
    if (modal) modal.hidden = true;
    segmentEditState = null;
  }

  function saveSegmentEdit() {
    if (!segmentEditState || !lastNavrhResult) return;
    var denSelect = document.getElementById('navrh-segment-den');
    var odInput = document.getElementById('navrh-segment-od');
    var doInput = document.getElementById('navrh-segment-do');
    var mistoSelect = document.getElementById('navrh-segment-misto');
    if (!denSelect || !odInput || !doInput || !mistoSelect) return;
    var prirazeni = clonePrirazeni(lastNavrhResult.prirazeni);
    var p = prirazeni.find(function (x) { return x.den === segmentEditState.den && x.zamestnanecId === segmentEditState.zamestnanecId; });
    if (!p || !p.segmenty || !p.segmenty[segmentEditState.segIndex]) { closeSegmentModal(); return; }
    var seg = p.segmenty[segmentEditState.segIndex];
    seg.od = odInput.value || seg.od;
    seg.do = doInput.value || seg.do;
    var val = mistoSelect.value || '';
    if (val.indexOf('t:') === 0) {
      seg.tridaId = val.slice(2);
      seg.budovaId = findBudovaIdForTrida(lastNavrhResult.data.budovy, seg.tridaId) || undefined;
    } else if (val.indexOf('b:') === 0) {
      seg.budovaId = val.slice(2);
      seg.tridaId = undefined;
    }
    applyNavrhChange(prirazeni);
    closeSegmentModal();
  }

  function findBudovaIdForTrida(budovy, tridaId) {
    if (!tridaId || !budovy) return null;
    for (var i = 0; i < budovy.length; i += 1) {
      var b = budovy[i];
      if (b.tridy) {
        for (var j = 0; j < b.tridy.length; j += 1) {
          if (b.tridy[j].id === tridaId) return b.id;
        }
      }
    }
    return null;
  }

  /**
   * Smaže segment v návrhu (den, zamestnanecId, segIndex). Volá se z modalu i z kontextového menu v grafu (D11c).
   */
  function deleteSegmentByIndex(den, zamestnanecId, segIndex) {
    if (!lastNavrhResult) return;
    var prirazeni = clonePrirazeni(lastNavrhResult.prirazeni);
    var idx = prirazeni.findIndex(function (x) { return x.den === den && x.zamestnanecId === zamestnanecId; });
    if (idx < 0) return;
    var p = prirazeni[idx];
    if (!p.segmenty || !p.segmenty[segIndex]) return;
    p.segmenty.splice(segIndex, 1);
    if (p.segmenty.length === 0) prirazeni.splice(idx, 1);
    applyNavrhChange(prirazeni);
  }

  function deleteSegmentEdit() {
    if (!segmentEditState || !lastNavrhResult) return;
    deleteSegmentByIndex(segmentEditState.den, segmentEditState.zamestnanecId, segmentEditState.segIndex);
    closeSegmentModal();
  }

  /* ---------- D12: Doplnění nevyčerpaného úvazku ---------- */
  var doplnitModalZamId = null;

  function openDoplnitModal(zamestnanecId) {
    if (!lastNavrhResult || !zamestnanecId) return;
    var zam = lastNavrhResult.data.zamestnanci.find(function (z) { return z.id === zamestnanecId; });
    if (!zam) return;
    doplnitModalZamId = zamestnanecId;
    var modal = document.getElementById('navrh-doplnit-modal');
    var jmenoEl = document.getElementById('navrh-doplnit-jmeno');
    var denSelect = document.getElementById('navrh-doplnit-den');
    var odInput = document.getElementById('navrh-doplnit-od');
    var doInput = document.getElementById('navrh-doplnit-do');
    var tridaSelect = document.getElementById('navrh-doplnit-trida');
    if (!modal || !jmenoEl || !denSelect || !odInput || !doInput || !tridaSelect) return;

    jmenoEl.textContent = zam.jmeno || '(bez jména)';
    denSelect.innerHTML = '';
    for (var d = 1; d <= 5; d += 1) {
      var opt = document.createElement('option');
      opt.value = d;
      opt.textContent = NAZVY_DNU[d];
      denSelect.appendChild(opt);
    }
    tridaSelect.innerHTML = '<option value="">— vyberte třídu —</option>';
    var budovy = lastNavrhResult.data.budovy || [];
    for (var bi = 0; bi < budovy.length; bi += 1) {
      var b = budovy[bi];
      var tridy = b.tridy || [];
      for (var ti = 0; ti < tridy.length; ti += 1) {
        var t = tridy[ti];
        var opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = (t.nazev || '(třída)') + ' (' + (b.nazev || '') + ')';
        opt.setAttribute('data-budova-id', b.id || '');
        tridaSelect.appendChild(opt);
      }
    }
    odInput.value = '08:00';
    doInput.value = '';
    updateDoplnitCasDo();
    modal.hidden = false;
  }

  function getOteviraciDoTridy(tridaId) {
    var budovy = lastNavrhResult && lastNavrhResult.data && lastNavrhResult.data.budovy ? lastNavrhResult.data.budovy : [];
    for (var i = 0; i < budovy.length; i += 1) {
      var b = budovy[i];
      if (b.tridy) {
        for (var j = 0; j < b.tridy.length; j += 1) {
          if (b.tridy[j].id === tridaId) {
            var o = b.tridy[j].oteviraciDoba || b.oteviraciDoba;
            return o && o.od && o.do ? { od: o.od, do: o.do } : { od: '07:00', do: '17:00' };
          }
        }
      }
    }
    return { od: '07:00', do: '17:00' };
  }

  function timeToMinuty(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return 0;
    var parts = hhmm.split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }
  function minutyToHhmm(m) {
    var h = Math.floor(m / 60);
    var mm = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
  }

  function updateDoplnitCasDo() {
    if (!doplnitModalZamId || !lastNavrhResult) return;
    var odInput = document.getElementById('navrh-doplnit-od');
    var doInput = document.getElementById('navrh-doplnit-do');
    var tridaSelect = document.getElementById('navrh-doplnit-trida');
    var denSelect = document.getElementById('navrh-doplnit-den');
    if (!odInput || !doInput || !tridaSelect || !denSelect) return;
    var tridaId = tridaSelect.value || null;
    var odStr = odInput.value || '';
    if (!odStr || !tridaId) { doInput.value = ''; return; }
    var Validace = global.MSemenyValidaceNavrhu;
    var sum = Validace && Validace.sumMinutyPerZamestnanec ? Validace.sumMinutyPerZamestnanec(lastNavrhResult.prirazeni) : {};
    var vNavrhu = sum[doplnitModalZamId] || 0;
    var zam = lastNavrhResult.data.zamestnanci.find(function (z) { return z.id === doplnitModalZamId; });
    var uvazek = (zam && zam.uvazekMinutyTyden != null && zam.uvazekMinutyTyden !== '') ? parseInt(zam.uvazekMinutyTyden, 10) : 0;
    if (isNaN(uvazek)) uvazek = 0;
    var zbyvajici = Math.max(0, uvazek - vNavrhu);
    var maxBlok = Math.min(zbyvajici, 8 * 60);
    var otev = getOteviraciDoTridy(tridaId);
    var odM = timeToMinuty(odStr);
    var doMaxM = timeToMinuty(otev.do);
    var odStartDne = timeToMinuty(otev.od);
    if (odM < odStartDne) odM = odStartDne;
    var doM = Math.min(odM + maxBlok, doMaxM);
    if (doM <= odM) doM = odM + Math.min(maxBlok, 60);
    doInput.value = minutyToHhmm(doM);
  }

  function closeDoplnitModal() {
    var modal = document.getElementById('navrh-doplnit-modal');
    if (modal) modal.hidden = true;
    doplnitModalZamId = null;
  }

  function saveDoplnitUvazek() {
    if (!doplnitModalZamId || !lastNavrhResult) return;
    var denSelect = document.getElementById('navrh-doplnit-den');
    var odInput = document.getElementById('navrh-doplnit-od');
    var doInput = document.getElementById('navrh-doplnit-do');
    var tridaSelect = document.getElementById('navrh-doplnit-trida');
    if (!denSelect || !odInput || !doInput || !tridaSelect) return;
    var den = parseInt(denSelect.value, 10);
    var tridaId = tridaSelect.value || null;
    if (isNaN(den) || den < 1 || den > 5 || !tridaId) {
      zobrazChybu('Vyberte den a třídu.');
      return;
    }
    var prirazeni = clonePrirazeni(lastNavrhResult.prirazeni);
    var p = prirazeni.find(function (x) { return x.den === den && x.zamestnanecId === doplnitModalZamId; });
    if (!p) {
      p = { den: den, zamestnanecId: doplnitModalZamId, segmenty: [] };
      prirazeni.push(p);
    }
    var budovaId = findBudovaIdForTrida(lastNavrhResult.data.budovy, tridaId);
    p.segmenty.push({
      od: odInput.value,
      do: doInput.value,
      tridaId: tridaId,
      budovaId: budovaId || undefined
    });
    applyNavrhChange(prirazeni);
    closeDoplnitModal();
    zobrazUspech('Blok byl přidán.');
  }

  function initAlgoritmusSelect() {
    var sel = document.getElementById('navrh-algoritmus');
    var Algoritmy = global.MSemenyAlgoritmy;
    if (!sel || !Algoritmy || !Algoritmy.dostupneAlgoritmy) return;
    var seznam = Algoritmy.dostupneAlgoritmy();
    sel.innerHTML = '';
    for (var i = 0; i < seznam.length; i++) {
      var opt = document.createElement('option');
      opt.value = seznam[i].id;
      opt.textContent = seznam[i].nazev;
      if (seznam[i].id === (Algoritmy.vychoziId ? Algoritmy.vychoziId() : 'zakladni')) {
        opt.selected = true;
      }
      sel.appendChild(opt);
    }
  }

  function init() {
    initAlgoritmusSelect();

    var btn = document.getElementById('navrh-prepocitat');
    if (btn) btn.addEventListener('click', prepocitat);

    var btnCsv = document.getElementById('navrh-stahnout-csv');
    if (btnCsv) {
      btnCsv.addEventListener('click', stahnoutCsv);
      btnCsv.hidden = true;
    }

    var btnNahrat = document.getElementById('navrh-nahrat-csv');
    var inputCsv = document.getElementById('navrh-csv-input');
    if (btnNahrat) btnNahrat.addEventListener('click', nahratCsv);
    if (inputCsv) inputCsv.addEventListener('change', onCsvFileSelected);

    var btnValidovat = document.getElementById('navrh-validovat');
    if (btnValidovat) btnValidovat.addEventListener('click', function () { validovat(); });

    var btnChybovyReport = document.getElementById('navrh-stahnout-chybovy-report');
    if (btnChybovyReport) btnChybovyReport.addEventListener('click', stahnoutChybovyReport);

    var segmentForm = document.getElementById('navrh-segment-form');
    if (segmentForm) {
      segmentForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        saveSegmentEdit();
      });
    }
    var segmentSmazat = document.getElementById('navrh-segment-smazat');
    if (segmentSmazat) segmentSmazat.addEventListener('click', deleteSegmentEdit);
    var segmentZrusit = document.getElementById('navrh-segment-zrusit');
    if (segmentZrusit) segmentZrusit.addEventListener('click', closeSegmentModal);

    var doplnitForm = document.getElementById('navrh-doplnit-form');
    if (doplnitForm) {
      doplnitForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        saveDoplnitUvazek();
      });
    }
    var doplnitZrusit = document.getElementById('navrh-doplnit-zrusit');
    if (doplnitZrusit) doplnitZrusit.addEventListener('click', closeDoplnitModal);
    var doplnitOd = document.getElementById('navrh-doplnit-od');
    var doplnitTrida = document.getElementById('navrh-doplnit-trida');
    if (doplnitOd) doplnitOd.addEventListener('change', updateDoplnitCasDo);
    if (doplnitTrida) doplnitTrida.addEventListener('change', updateDoplnitCasDo);

    var el = document.getElementById('navrh-vysledek');
    if (el && !el.innerHTML.trim()) {
      el.innerHTML = '<p class="navrh-prazdno">Klikněte na „Přepočítat", aby se vygeneroval návrh směn podle aktuální konfigurace.</p>';
    }
  }

  // Skripty jsou na konci <body>, DOM je kompletní – init() voláme ihned.
  init();

  global.MSemenyNavrhSmenUI = {
    prepocitat: prepocitat,
    vykresliNavrh: vykresliNavrh,
    getNavrhRows: getNavrhRows,
    applyNavrhChange: applyNavrhChange
  };
})(typeof window !== 'undefined' ? window : this);
