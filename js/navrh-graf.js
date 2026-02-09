/**
 * Grafické zobrazení návrhu pracovní doby (D2b).
 * Struktura: každá budova = blok, v bloku každá třída = řádek s časovou osou.
 * Barevné obdélníky = přiřazení osob; tooltip = časový rozsah a jméno.
 */
(function (global) {
  'use strict';

  var NAZVY_DNU = ['', 'Po', 'Út', 'St', 'Čt', 'Pá'];

  /** Paleta barev pro zaměstnance (odlišitelné, ne příliš křiklavé). Exportována pro doplnBarvyZamestnancum. */
  var BARVY = [
    '#4a90d9', '#7ed56f', '#f5a623', '#bd10e0', '#50e3c2',
    '#d0021b', '#417505', '#f8e71c', '#9013fe', '#b8e986',
    '#8b572a', '#4ecdc4'
  ];

  function jePlatnaBarva(str) {
    return typeof str === 'string' && /^#[0-9a-fA-F]{6}$/.test(str);
  }

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
   * Vybere barvu pro zaměstnance: mapa zamestnanecId → barva. Použije zamestnanec.barva, pokud je platná; jinak z palety.
   * @param {Array} prirazeni - pro daný den (nebo celé pro buildBarvyMapGlobal)
   * @param {Array} zamestnanci - seznam (pro pořadí a barva)
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
    var zamById = {};
    for (i = 0; i < (zamestnanci || []).length; i += 1) {
      zamById[zamestnanci[i].id] = zamestnanci[i];
    }
    for (i = 0; i < order.length; i += 1) {
      var z = zamById[order[i]];
      map[order[i]] = (z && jePlatnaBarva(z.barva)) ? z.barva : BARVY[i % BARVY.length];
    }
    return map;
  }

  /**
   * Sestaví HTML obsah pro jeden den (časová osa + bloky budov/tříd + volitelně legenda).
   * @param {number} den - 1–5
   * @param {Array} prirazeni - celé přiřazení
   * @param {Object} data - konfigurace
   * @param {Object} range - { start, end } v minutách
   * @param {Object} opts - onSegmentClick, onSegmentDrop, skipLegenda (true = nevykreslovat legendu)
   * @returns {{ html: string[], prazdny: boolean }}
   */
  function buildObsahJednohoDne(den, prirazeni, data, range, opts) {
    var budovy = (data && data.budovy) || [];
    var zamestnanci = (data && data.zamestnanci) || [];
    var onSegmentClick = (opts && opts.onSegmentClick);
    var onSegmentDrop = (opts && opts.onSegmentDrop);
    var proDen = (prirazeni || []).filter(function (p) { return p.den === den; });

    if (proDen.length === 0) {
      return { html: ['<p class="navrh-graf-prazdno">Pro tento den nejsou žádná přiřazení.</p>'], prazdny: true };
    }

    var rangeLen = range.end - range.start;
    var barvyMap = (opts && opts.barvyMap) ? opts.barvyMap : mapBarev(proDen, zamestnanci);

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

    var html = [];
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
      var tridaSegments = {};
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
          var item = {
            od: seg.od, do: seg.do, zamestnanecId: p.zamestnanecId, jmeno: jmeno,
            tridaId: segTrida || null, budovaId: segBudova || null, segIndex: si
          };
          if (segTrida) {
            if (!tridaSegments[segTrida]) tridaSegments[segTrida] = [];
            tridaSegments[segTrida].push(item);
          } else {
            budovaSegments.push(item);
          }
        }
      }
      if (budovaSegments.length > 0) {
        rady.push({ label: 'Budova (společně)', items: budovaSegments, budovaId: b.id, tridaId: null });
      }
      for (var ti = 0; ti < tridy.length; ti += 1) {
        var t = tridy[ti];
        if (!t.id) continue;
        rady.push({ label: t.nazev || '(třída)', items: tridaSegments[t.id] || [], budovaId: b.id, tridaId: t.id });
      }
      var zobrazenyTridy = {};
      for (var ti2 = 0; ti2 < tridy.length; ti2 += 1) {
        if (tridy[ti2].id) zobrazenyTridy[tridy[ti2].id] = true;
      }
      for (var tid in tridaSegments) {
        if (tridaSegments.hasOwnProperty(tid) && !zobrazenyTridy[tid]) {
          rady.push({ label: nazevTridy(budovy, tid) || '(třída)', items: tridaSegments[tid], budovaId: findBudovaIdForTrida(budovy, tid) || null, tridaId: tid });
        }
      }
      var canEdit = typeof onSegmentClick === 'function' || typeof onSegmentDrop === 'function';
      for (var ri = 0; ri < rady.length; ri += 1) {
        var rada = rady[ri];
        var lanes = assignLanes(rada.items);
        var dataTrida = rada.tridaId != null ? ' data-trida-id="' + escapeAttr(rada.tridaId) + '"' : '';
        var dataBudova = rada.budovaId != null ? ' data-budova-id="' + escapeAttr(rada.budovaId) + '"' : '';
        html.push('<div class="navrh-graf-rada"' + dataTrida + dataBudova + '>');
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
            var dataAttrs = canEdit ? ' data-den="' + den + '" data-zam-id="' + escapeAttr(it.zamestnanecId) + '" data-seg-index="' + (it.segIndex != null ? it.segIndex : '') + '"' : '';
            var dragAttr = canEdit && typeof onSegmentDrop === 'function' ? ' draggable="true"' : '';
            html.push('<span class="navrh-graf-segment" style="left:' + left + '%;width:' + w + '%;background:' + barva + ';" title="' + escapeAttr(title) + '"' + dataAttrs + dragAttr + '>' + escapeHtml(it.jmeno) + '</span>');
          }
          html.push('</div>');
        }
        html.push('</div></div>');
      }
      html.push('</div>');
    }
    if (!(opts && opts.skipLegenda)) {
      html.push('<div class="navrh-graf-legenda">');
      html.push('<span class="navrh-graf-legenda-nadpis">Legenda:</span> ');
      var orderedIds = [];
      for (var ki = 0; ki < (zamestnanci || []).length; ki += 1) orderedIds.push(zamestnanci[ki].id);
      for (var oi = 0; oi < orderedIds.length; oi += 1) {
        var zid = orderedIds[oi];
        if (!barvyMap[zid]) continue;
        html.push('<span class="navrh-graf-legenda-položka"><span class="navrh-graf-legenda-barvicka" style="background:' + barvyMap[zid] + '"></span> ' + escapeHtml(jmenoZamestnance(zamestnanci, zid)) + '</span>');
      }
      html.push('</div>');
    }
    return { html: html, prazdny: false };
  }

  /**
   * Vrátí HTML řádky pro jednu legendu (pro režim inline – jedna legenda pro všechny dny).
   * @param {Object} barvyMap - id → barva (z mapBarev)
   * @param {Array} zamestnanci
   * @returns {string[]}
   */
  function buildLegendaHtml(barvyMap, zamestnanci) {
    var out = [];
    out.push('<div class="navrh-graf-legenda">');
    out.push('<span class="navrh-graf-legenda-nadpis">Legenda:</span> ');
    var orderedIds = [];
    for (var ki = 0; ki < (zamestnanci || []).length; ki += 1) orderedIds.push(zamestnanci[ki].id);
    for (var oi = 0; oi < orderedIds.length; oi += 1) {
      var zid = orderedIds[oi];
      if (!barvyMap[zid]) continue;
      out.push('<span class="navrh-graf-legenda-položka"><span class="navrh-graf-legenda-barvicka" style="background:' + barvyMap[zid] + '"></span> ' + escapeHtml(jmenoZamestnance(zamestnanci, zid)) + '</span>');
    }
    out.push('</div>');
    return out;
  }

  /**
   * Vykreslí grafický návrh do kontejneru (D2b, D2d: taby + režim Taby/Inline).
   * @param {Array} prirazeni - celé přiřazení (všechny dny)
   * @param {Object} data - konfigurace (budovy, zamestnanci)
   * @param {HTMLElement} container - prvek, do kterého kreslit
   * @param {number} [vybranyDen] - 1–5, který den zobrazit v režimu Taby (default 1)
   * @param {Object} [opts] - rezim: 'taby'|'inline', onSegmentClick, onSegmentDrop, onDenChange(den), onRezimChange(rezim)
   */
  function vykresliNavrhGraf(prirazeni, data, container, vybranyDen, opts) {
    if (!container) return;
    opts = (typeof opts === 'object' && opts !== null) ? opts : {};
    var onSegmentClick = opts.onSegmentClick;
    var onSegmentDrop = opts.onSegmentDrop;
    var onDenChange = opts.onDenChange;
    var onRezimChange = opts.onRezimChange;
    var rezim = (opts.rezim === 'inline') ? 'inline' : 'taby';
    var budovy = (data && data.budovy) || [];
    var zamestnanci = (data && data.zamestnanci) || [];
    var den = vybranyDen >= 1 && vybranyDen <= 5 ? vybranyDen : 1;

    if (!prirazeni || prirazeni.length === 0) {
      container.innerHTML = '';
      container.hidden = true;
      return;
    }

    var range = getTimeRange(budovy);
    var html = [];

    /* Ovládací prvky: režim (Taby / Inline) a taby pro dny (jen v režimu Taby) */
    html.push('<div class="navrh-graf-ovladaci">');
    html.push('<div class="navrh-graf-rezim" role="group" aria-label="Režim zobrazení">');
    html.push('<button type="button" class="navrh-graf-rezim-btn' + (rezim === 'taby' ? ' is-active' : '') + '" data-rezim="taby">Taby</button>');
    html.push('<button type="button" class="navrh-graf-rezim-btn' + (rezim === 'inline' ? ' is-active' : '') + '" data-rezim="inline">Inline</button>');
    html.push('</div>');
    if (rezim === 'taby') {
      html.push('<div class="navrh-graf-taby" role="tablist" aria-label="Výběr dne">');
      for (var d = 1; d <= 5; d += 1) {
        html.push('<button type="button" class="navrh-graf-tab' + (d === den ? ' is-active' : '') + '" role="tab" aria-selected="' + (d === den) + '" data-den="' + d + '">' + escapeHtml(NAZVY_DNU[d]) + '</button>');
      }
      html.push('</div>');
    }
    html.push('</div>');

    if (rezim === 'taby') {
      var jeden = buildObsahJednohoDne(den, prirazeni, data, range, opts);
      html = html.concat(jeden.html);
    } else {
      html.push('<div class="navrh-graf-inline">');
      var barvyMapInline = mapBarev(prirazeni || [], zamestnanci);
      for (var d2 = 1; d2 <= 5; d2 += 1) {
        var optsDen = Object.assign({}, opts || {}, { skipLegenda: true, barvyMap: barvyMapInline });
        html.push('<section class="navrh-graf-inline-den" data-den="' + d2 + '" aria-labelledby="navrh-graf-inline-heading-' + d2 + '">');
        html.push('<h3 id="navrh-graf-inline-heading-' + d2 + '" class="navrh-graf-inline-nadpis">' + escapeHtml(NAZVY_DNU[d2]) + '</h3>');
        var jeden2 = buildObsahJednohoDne(d2, prirazeni, data, range, optsDen);
        html = html.concat(jeden2.html);
        html.push('</section>');
      }
      html = html.concat(buildLegendaHtml(barvyMapInline, zamestnanci));
      html.push('</div>');
    }

    container.innerHTML = html.join('');
    container.hidden = false;

    /* Režim: Taby / Inline */
    var rezimBtns = container.querySelectorAll('.navrh-graf-rezim-btn');
    for (var rb = 0; rb < rezimBtns.length; rb += 1) {
      rezimBtns[rb].addEventListener('click', function () {
        var r = this.getAttribute('data-rezim');
        if (r && typeof onRezimChange === 'function') onRezimChange(r);
      });
    }
    /* Taby: výběr dne */
    var tabBtns = container.querySelectorAll('.navrh-graf-tab');
    for (var tb = 0; tb < tabBtns.length; tb += 1) {
      tabBtns[tb].addEventListener('click', function () {
        var newDen = parseInt(this.getAttribute('data-den'), 10);
        if (newDen >= 1 && newDen <= 5 && typeof onDenChange === 'function') onDenChange(newDen);
      });
    }

    if (typeof onSegmentClick === 'function') {
      container.addEventListener('click', function (ev) {
        var seg = ev.target.closest('.navrh-graf-segment');
        if (!seg || !seg.hasAttribute('data-den')) return;
        var d = parseInt(seg.getAttribute('data-den'), 10);
        var zamId = seg.getAttribute('data-zam-id');
        var segIdx = parseInt(seg.getAttribute('data-seg-index'), 10);
        if (isNaN(d) || !zamId || isNaN(segIdx)) return;
        onSegmentClick(ev, { den: d, zamestnanecId: zamId, segIndex: segIdx });
      });
    }

    if (typeof onSegmentDrop === 'function') {
      container.addEventListener('dragstart', function (ev) {
        var seg = ev.target.closest('.navrh-graf-segment');
        if (!seg || !seg.hasAttribute('data-den')) return;
        ev.dataTransfer.setData('application/json', JSON.stringify({
          den: parseInt(seg.getAttribute('data-den'), 10),
          zamestnanecId: seg.getAttribute('data-zam-id'),
          segIndex: parseInt(seg.getAttribute('data-seg-index'), 10)
        }));
        ev.dataTransfer.effectAllowed = 'move';
        seg.classList.add('dragging');
      });
      container.addEventListener('dragend', function (ev) {
        var seg = ev.target.closest('.navrh-graf-segment');
        if (seg) seg.classList.remove('dragging');
      });
      container.addEventListener('dragover', function (ev) {
        var row = ev.target.closest('.navrh-graf-rada');
        if (!row) return;
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
        row.classList.add('drag-over');
      });
      container.addEventListener('dragleave', function (ev) {
        var row = ev.target.closest('.navrh-graf-rada');
        if (row && !row.contains(ev.relatedTarget)) row.classList.remove('drag-over');
      });
      container.addEventListener('drop', function (ev) {
        var row = ev.target.closest('.navrh-graf-rada');
        if (!row) return;
        ev.preventDefault();
        row.classList.remove('drag-over');
        var json = ev.dataTransfer.getData('application/json');
        if (!json) return;
        try {
          var payload = JSON.parse(json);
          var tid = row.getAttribute('data-trida-id') || null;
          var bid = row.getAttribute('data-budova-id') || null;
          if (payload.den != null && payload.zamestnanecId && payload.segIndex != null) {
            onSegmentDrop(payload, tid, bid);
          }
        } catch (e) { /* ignore */ }
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

  /**
   * Doplní chybějící barvy zaměstnancům (nevyužitá z palety) a uloží do úložiště.
   * Volat po načtení stránky a po importu konfigurace.
   */
  function doplnBarvyZamestnancum() {
    var Storage = global.MSemenyStorage;
    if (!Storage || !Storage.getData || !Storage.replaceData || !Storage.ulozNyni) return;
    var data = Storage.getData();
    var zam = data.zamestnanci || [];
    var used = {};
    var i, z, barva;
    for (i = 0; i < zam.length; i += 1) {
      z = zam[i];
      if (z && jePlatnaBarva(z.barva)) used[z.barva] = true;
    }
    var changed = false;
    for (i = 0; i < zam.length; i += 1) {
      z = zam[i];
      if (!z) continue;
      if (jePlatnaBarva(z.barva)) continue;
      for (var bi = 0; bi < BARVY.length; bi += 1) {
        barva = BARVY[bi];
        if (!used[barva]) {
          z.barva = barva;
          used[barva] = true;
          changed = true;
          break;
        }
      }
      if (!z.barva) {
        z.barva = BARVY[i % BARVY.length];
        changed = true;
      }
    }
    if (changed) {
      Storage.replaceData(function (d) {
        d.zamestnanci = zam;
        return d;
      });
      Storage.ulozNyni();
    }
  }

  global.MSemenyNavrhGraf = {
    BARVY: BARVY,
    vykresliNavrhGraf: vykresliNavrhGraf,
    doplnBarvyZamestnancum: doplnBarvyZamestnancum
  };
})(typeof window !== 'undefined' ? window : this);
