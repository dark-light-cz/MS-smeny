/**
 * Grafické zobrazení návrhu pracovní doby (D2b).
 * Struktura: každá budova = blok, v bloku každá třída = řádek s časovou osou.
 * Barevné obdélníky = přiřazení osob; tooltip = časový rozsah a jméno.
 */
(function (global) {
  'use strict';

  var NAZVY_DNU = ['', 'Po', 'Út', 'St', 'Čt', 'Pá'];

  /** Paleta barev pro zaměstnance (odlišitelné, ne příliš křiklavé). */
  var BARVY = [
    '#4a90d9', '#7ed56f', '#f5a623', '#bd10e0', '#50e3c2',
    '#d0021b', '#417505', '#f8e71c', '#9013fe', '#b8e986',
    '#8b572a', '#4ecdc4'
  ];

  function timeToMinuty(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return 0;
    var parts = hhmm.split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }

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
          if (b.tridy[j].id === tridaId) return b.tridy[j].nazev || '(bez názvu)';
        }
      }
    }
    return '(?)';
  }

  /** Vrátí id budovy, ve které se nachází třída tridaId, nebo null. */
  function findBudovaIdForTrida(budovy, tridaId) {
    if (!tridaId) return null;
    for (var i = 0; i < (budovy || []).length; i += 1) {
      var b = budovy[i];
      if (b.tridy) {
        for (var j = 0; j < b.tridy.length; j += 1) {
          if (b.tridy[j].id === tridaId) return b.id;
        }
      }
    }
    return null;
  }

  function jmenoZamestnance(zamestnanci, id) {
    for (var i = 0; i < (zamestnanci || []).length; i += 1) {
      if (zamestnanci[i].id === id) return zamestnanci[i].jmeno || '(bez jména)';
    }
    return '(?)';
  }

  /**
   * Rozdělí segmenty do „pruhů“ (lanes) tak, aby se překrývající časy nepřekrývaly vizuálně.
   * @param {Array<{ od, do, ... }>} items - seznam segmentů
   * @returns {Array<Array>} lanes – pole pruhů, každý pruh = pole segmentů bez vzájemného překryvu
   */
  function assignLanes(items) {
    if (!items || items.length === 0) return [];
    var sorted = items.slice().sort(function (a, b) {
      return (a.od || '').localeCompare(b.od || '');
    });
    var lanes = []; // lanes[L] = { end: minuty, segments: [] }
    for (var i = 0; i < sorted.length; i += 1) {
      var it = sorted[i];
      var odM = timeToMinuty(it.od);
      var doM = timeToMinuty(it.do);
      var placed = false;
      for (var L = 0; L < lanes.length; L += 1) {
        if (odM >= lanes[L].end) {
          lanes[L].segments.push(it);
          lanes[L].end = doM;
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes.push({ segments: [it], end: doM });
      }
    }
    return lanes;
  }

  /** Zjistí rozsah času (min od, max do) z otevírací doby budov nebo výchozí 7:00–17:00. */
  function getTimeRange(budovy) {
    var start = 24 * 60;
    var end = 0;
    for (var i = 0; i < (budovy || []).length; i += 1) {
      var o = budovy[i].oteviraciDoba;
      if (o && o.od && o.do) {
        var od = timeToMinuty(o.od);
        var doM = timeToMinuty(o.do);
        if (od < start) start = od;
        if (doM > end) end = doM;
      }
    }
    if (start >= end) {
      start = 7 * 60;
      end = 17 * 60;
    }
    return { start: start, end: end };
  }

  /**
   * Vybere barvu pro zaměstnance: mapa zamestnanecId → barva (pořadí podle prvního výskytu v prirazeni).
   * @param {Array} prirazeni - pro daný den
   * @param {Array} zamestnanci - seznam (pro pořadí)
   * @returns {Object} id → barva
   */
  function mapBarev(prirazeni, zamestnanci) {
    var order = [];
    var seen = {};
    var i, id;
    for (i = 0; i < (prirazeni || []).length; i += 1) {
      id = prirazeni[i].zamestnanecId;
      if (!seen[id]) {
        seen[id] = true;
        order.push(id);
      }
    }
    for (i = 0; i < (zamestnanci || []).length; i += 1) {
      id = zamestnanci[i].id;
      if (!seen[id]) order.push(id);
    }
    var map = {};
    for (i = 0; i < order.length; i += 1) {
      map[order[i]] = BARVY[i % BARVY.length];
    }
    return map;
  }

  /**
   * Vykreslí grafický návrh do kontejneru.
   * @param {Array} prirazeni - celé přiřazení (všechny dny)
   * @param {Object} data - konfigurace (budovy, zamestnanci)
   * @param {HTMLElement} container - prvek, do kterého kreslit
   * @param {number} [vybranyDen] - 1–5, který den zobrazit (default 1)
   */
  function vykresliNavrhGraf(prirazeni, data, container, vybranyDen) {
    if (!container) return;
    var budovy = (data && data.budovy) || [];
    var zamestnanci = (data && data.zamestnanci) || [];
    var den = vybranyDen >= 1 && vybranyDen <= 5 ? vybranyDen : 1;

    if (!prirazeni || prirazeni.length === 0) {
      container.innerHTML = '';
      container.hidden = true;
      return;
    }

    var proDen = prirazeni.filter(function (p) { return p.den === den; });
    if (proDen.length === 0) {
      container.innerHTML = '<p class="navrh-graf-prazdno">Pro tento den nejsou žádná přiřazení.</p>';
      container.hidden = false;
      return;
    }

    var range = getTimeRange(budovy);
    var rangeLen = range.end - range.start;
    var barvyMap = mapBarev(proDen, zamestnanci);

    function leftPct(odHhmm) {
      var m = timeToMinuty(odHhmm) - range.start;
      return Math.max(0, Math.min(100, (m / rangeLen) * 100));
    }
    function widthPct(odHhmm, doHhmm) {
      var odM = timeToMinuty(odHhmm) - range.start;
      var doM = timeToMinuty(doHhmm) - range.start;
      var len = Math.max(0, doM - odM);
      return Math.min(100, (len / rangeLen) * 100);
    }

    function minutyToHhmmLabel(minuty) {
      var h = Math.floor(minuty / 60);
      var m = minuty % 60;
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    /** Časová osa: hodinové značky od range.start do range.end */
    var casovaOsaHtml = [];
    var startH = Math.floor(range.start / 60);
    var endH = Math.ceil(range.end / 60);
    for (var h = startH; h <= endH; h += 1) {
      var minuty = h * 60;
      if (minuty < range.start && h < endH) continue;
      if (minuty > range.end) break;
      var pct = rangeLen > 0 ? ((minuty - range.start) / rangeLen) * 100 : 0;
      casovaOsaHtml.push('<span class="navrh-graf-cas-znacka" style="left:' + pct + '%">' + escapeHtml(minutyToHhmmLabel(minuty)) + '</span>');
    }

    var html = [];
    html.push('<div class="navrh-graf-hlavicka">');
    html.push('<label for="navrh-graf-den" class="navrh-graf-label">Den:</label>');
    html.push('<select id="navrh-graf-den" class="navrh-graf-select">');
    for (var d = 1; d <= 5; d += 1) {
      html.push('<option value="' + d + '"' + (d === den ? ' selected' : '') + '>' + NAZVY_DNU[d] + '</option>');
    }
    html.push('</select>');
    html.push('</div>');

    html.push('<div class="navrh-graf-casova-osa">');
    html.push('<span class="navrh-graf-osa-label">Čas</span>');
    html.push('<div class="navrh-graf-osa-pruh">' + casovaOsaHtml.join('') + '</div>');
    html.push('</div>');

    for (var bi = 0; bi < budovy.length; bi += 1) {
      var b = budovy[bi];
      if (!b.id) continue;
      var tridy = b.tridy || [];
      html.push('<div class="navrh-graf-blok">');
      html.push('<h3 class="navrh-graf-blok-nadpis">' + escapeHtml(nazevBudovy(budovy, b.id)) + '</h3>');

      var rady = [];
      var budovaSegments = [];
      var tridaSegments = {}; // tridaId → [ { od, do, zamestnanecId, jmeno } ]

      for (var pi = 0; pi < proDen.length; pi += 1) {
        var p = proDen[pi];
        var jmeno = jmenoZamestnance(zamestnanci, p.zamestnanecId);
        var segs = p.segmenty || [];
        for (var si = 0; si < segs.length; si += 1) {
          var seg = segs[si];
          var segBudova = seg.budovaId || null;
          var segTrida = seg.tridaId || null;
          var budovaSegmentu = segTrida ? findBudovaIdForTrida(budovy, segTrida) : segBudova;
          if (budovaSegmentu !== b.id) continue;
          var item = { od: seg.od, do: seg.do, zamestnanecId: p.zamestnanecId, jmeno: jmeno };
          if (segTrida) {
            if (!tridaSegments[segTrida]) tridaSegments[segTrida] = [];
            tridaSegments[segTrida].push(item);
          } else {
            budovaSegments.push(item);
          }
        }
      }

      if (budovaSegments.length > 0) {
        rady.push({ label: 'Budova (společně)', items: budovaSegments });
      }
      for (var ti = 0; ti < tridy.length; ti += 1) {
        var t = tridy[ti];
        if (!t.id) continue;
        var items = tridaSegments[t.id] || [];
        rady.push({ label: t.nazev || '(třída)', items: items });
      }
      var zobrazenyTridy = {};
      for (var ti2 = 0; ti2 < tridy.length; ti2 += 1) {
        if (tridy[ti2].id) zobrazenyTridy[tridy[ti2].id] = true;
      }
      for (var tid in tridaSegments) {
        if (tridaSegments.hasOwnProperty(tid) && !zobrazenyTridy[tid]) {
          rady.push({ label: nazevTridy(budovy, tid) || '(třída)', items: tridaSegments[tid] });
        }
      }

      for (var ri = 0; ri < rady.length; ri += 1) {
        var rada = rady[ri];
        var lanes = assignLanes(rada.items);
        html.push('<div class="navrh-graf-rada">');
        html.push('<span class="navrh-graf-rada-label">' + escapeHtml(rada.label) + '</span>');
        html.push('<div class="navrh-graf-rada-pruhy">');
        for (var li = 0; li < lanes.length; li += 1) {
          var laneSegs = lanes[li].segments;
          html.push('<div class="navrh-graf-osa">');
          for (var ii = 0; ii < laneSegs.length; ii += 1) {
            var it = laneSegs[ii];
            var left = leftPct(it.od);
            var w = widthPct(it.od, it.do);
            var barva = barvyMap[it.zamestnanecId] || '#999';
            var title = it.jmeno + ', ' + (it.od || '') + '–' + (it.do || '');
            html.push('<span class="navrh-graf-segment" style="left:' + left + '%;width:' + w + '%;background:' + barva + ';" title="' + escapeAttr(title) + '">' + escapeHtml(it.jmeno) + '</span>');
          }
          html.push('</div>');
        }
        html.push('</div>');
        html.push('</div>');
      }
      html.push('</div>');
    }

    html.push('<div class="navrh-graf-legenda">');
    html.push('<span class="navrh-graf-legenda-nadpis">Legenda:</span> ');
    var orderedIds = [];
    for (var ki = 0; ki < (zamestnanci || []).length; ki += 1) {
      orderedIds.push(zamestnanci[ki].id);
    }
    for (var oi = 0; oi < orderedIds.length; oi += 1) {
      var zid = orderedIds[oi];
      if (!barvyMap[zid]) continue;
      html.push('<span class="navrh-graf-legenda-položka"><span class="navrh-graf-legenda-barvicka" style="background:' + barvyMap[zid] + '"></span> ' + escapeHtml(jmenoZamestnance(zamestnanci, zid)) + '</span>');
    }
    html.push('</div>');

    container.innerHTML = html.join('');
    container.hidden = false;

    var selectEl = container.querySelector('.navrh-graf-select');
    if (selectEl) {
      selectEl.addEventListener('change', function () {
        var newDen = parseInt(selectEl.value, 10);
        if (newDen >= 1 && newDen <= 5) {
          vykresliNavrhGraf(prirazeni, data, container, newDen);
        }
      });
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }
  function escapeAttr(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  global.MSemenyNavrhGraf = {
    vykresliNavrhGraf: vykresliNavrhGraf
  };
})(typeof window !== 'undefined' ? window : this);
