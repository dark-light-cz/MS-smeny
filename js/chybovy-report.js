/**
 * Chybový report pro AI – anonymizovaný výstup konfigurace, návrhu a chyb validace (D10c).
 * Slouží k předání kontextu AI pro nápravu chyb (nejdřív test, pak oprava kódu).
 */
(function (global) {
  'use strict';

  var NAZVY_DNU = ['', 'Po', 'Út', 'St', 'Čt', 'Pá'];
  var ROLE_PREFIX = {
    'ředitelka': 'reditelka',
    'zástupkyně': 'zastupkyne',
    'učitelka': 'ucitelka',
    'asistentka pedagoga': 'asistentka',
    'školník/školnice': 'skolnik'
  };

  /**
   * Sestaví anonymizéry: mapy id -> label a funkci pro nahrazení textu.
   * @param {Object} data - { zamestnanci, budovy }
   * @returns {{ zamIdToLabel: Object, budovaIdToLabel: Object, tridaIdToLabel: Object, replaceInText: function(string):string }}
   */
  function buildAnonymizer(data) {
    var zamestnanci = (data && data.zamestnanci) || [];
    var budovy = (data && data.budovy) || [];
    var zamIdToLabel = {};
    var budovaIdToLabel = {};
    var tridaIdToLabel = {};
    var counts = { reditelka: 0, zastupkyne: 0, ucitelka: 0, asistentka: 0, skolnik: 0 };

    var getPrimaryRole = (global.MSemenyDataModel && typeof global.MSemenyDataModel.getPrimaryRole === 'function')
      ? global.MSemenyDataModel.getPrimaryRole
      : function (z) { return z.role || ''; };
    var order = ['ředitelka', 'zástupkyně', 'učitelka', 'asistentka pedagoga', 'školník/školnice'];
    var sorted = zamestnanci.slice().sort(function (a, b) {
      var ia = order.indexOf(getPrimaryRole(a));
      var ib = order.indexOf(getPrimaryRole(b));
      if (ia !== ib) return ia - ib;
      return (a.jmeno || '').localeCompare(b.jmeno || '');
    });
    for (var i = 0; i < sorted.length; i += 1) {
      var z = sorted[i];
      var prefix = ROLE_PREFIX[getPrimaryRole(z)] || 'osoba';
      if (counts[prefix] == null) counts[prefix] = 0;
      counts[prefix] += 1;
      zamIdToLabel[z.id] = prefix + counts[prefix];
    }

    for (var b = 0; b < budovy.length; b += 1) {
      budovaIdToLabel[budovy[b].id] = 'budova' + (b + 1);
    }
    var tridaIdx = 0;
    for (var b2 = 0; b2 < budovy.length; b2 += 1) {
      var tridy = budovy[b2].tridy || [];
      for (var t = 0; t < tridy.length; t += 1) {
        tridaIdx += 1;
        tridaIdToLabel[tridy[t].id] = 'trida' + tridaIdx;
      }
    }

    function nazevTridyFull(budovy, tridaId) {
      for (var i = 0; i < (budovy || []).length; i += 1) {
        var b = budovy[i];
        if (b.tridy) {
          for (var j = 0; j < b.tridy.length; j += 1) {
            if (b.tridy[j].id === tridaId) {
              return (b.tridy[j].nazev || '') + ' (' + (b.nazev || '') + ')';
            }
          }
        }
      }
      return '';
    }
    var replacePairs = [];
    for (var ti = 0; ti < budovy.length; ti += 1) {
      var bud = budovy[ti];
      var tridy = bud.tridy || [];
      for (var tj = 0; tj < tridy.length; tj += 1) {
        var tr = tridy[tj];
        var orig = (tr.nazev || '') + ' (' + (bud.nazev || '') + ')';
        if (orig.length > 0) {
          replacePairs.push({ orig: orig, repl: tridaIdToLabel[tr.id] + ' (' + budovaIdToLabel[bud.id] + ')' });
        }
      }
    }
    for (var zi = 0; zi < sorted.length; zi += 1) {
      var jmeno = sorted[zi].jmeno || '';
      if (jmeno.length > 0) {
        replacePairs.push({ orig: jmeno, repl: zamIdToLabel[sorted[zi].id] });
      }
    }
    for (var bi = 0; bi < budovy.length; bi += 1) {
      var bn = budovy[bi].nazev || '';
      if (bn.length > 0) {
        replacePairs.push({ orig: bn, repl: budovaIdToLabel[budovy[bi].id] });
      }
    }
    replacePairs.sort(function (a, b) { return b.orig.length - a.orig.length; });

    function replaceInText(text) {
      if (text == null) return '';
      var s = String(text);
      for (var r = 0; r < replacePairs.length; r += 1) {
        s = s.split(replacePairs[r].orig).join(replacePairs[r].repl);
      }
      return s;
    }

    return {
      zamIdToLabel: zamIdToLabel,
      budovaIdToLabel: budovaIdToLabel,
      tridaIdToLabel: tridaIdToLabel,
      replaceInText: replaceInText,
      nazevTridyFull: nazevTridyFull
    };
  }

  /**
   * Vygeneruje anonymizovaný chybový report (Markdown).
   * @param {Object} data - konfigurace
   * @param {Array} prirazeni - vygenerovaný návrh
   * @param {Array} polozky - výsledek validace (pravidlo, kontext, typ)
   * @returns {string} Markdown text reportu
   */
  function generateReport(data, prirazeni, polozky) {
    var anon = buildAnonymizer(data);
    var lines = [];
    lines.push('# Chybový report – Návrh směn');
    lines.push('');
    lines.push('Viz dokumentace **CHYBOVY_REPORT.md** – jak report použít a jak postupovat při nápravě (test → oprava kódu).');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 1. Konfigurace (anonymizovaná)');
    lines.push('');

    var zamestnanci = (data && data.zamestnanci) || [];
    lines.push('### Zaměstnanci');
    var getUvazek = (global.MSemenyDataModel && typeof global.MSemenyDataModel.getUvazekMinutyZamestnance === 'function')
      ? global.MSemenyDataModel.getUvazekMinutyZamestnance
      : function (z) { return (z.uvazekMinutyTyden != null && z.uvazekMinutyTyden !== '') ? parseInt(z.uvazekMinutyTyden, 10) : 0; };
    for (var i = 0; i < zamestnanci.length; i += 1) {
      var z = zamestnanci[i];
      var label = anon.zamIdToLabel[z.id] || ('osoba' + (i + 1));
      var uvazek = getUvazek(z);
      var roleText = '';
      if (Array.isArray(z.roleUvazky) && z.roleUvazky.length > 0) {
        roleText = z.roleUvazky.map(function (r) { return (r.role || '') + ' ' + (r.uvazekMinutyTyden != null ? r.uvazekMinutyTyden : 0) + ' min'; }).join(', ');
      } else {
        roleText = (z.role || '') + ' „' + (z.uvazekMinutyTyden != null ? z.uvazekMinutyTyden : 0) + ' min"';
      }
      lines.push('- ' + label + ': úvazek celkem ' + uvazek + ' min/týden, role a úvazky: ' + roleText);
    }
    lines.push('');

    var budovy = (data && data.budovy) || [];
    lines.push('### Budovy a třídy');
    for (var b = 0; b < budovy.length; b += 1) {
      var bud = budovy[b];
      var bLabel = anon.budovaIdToLabel[bud.id] || ('budova' + (b + 1));
      var tridy = bud.tridy || [];
      var tLabels = [];
      for (var t = 0; t < tridy.length; t += 1) {
        tLabels.push(anon.tridaIdToLabel[tridy[t].id] || ('trida' + (t + 1)));
      }
      lines.push('- ' + bLabel + ': ' + (tLabels.length ? tLabels.join(', ') : '(bez tříd)'));
    }
    lines.push('');

    var sloty = (data && data.minMaxSloty) || [];
    lines.push('### Požadavky na počet osob v čase (minMaxSloty)');
    for (var s = 0; s < sloty.length; s += 1) {
      var slot = sloty[s];
      var dnyStr = (slot.dny && slot.dny.length) ? slot.dny.join(',') : 'všechny';
      lines.push('- ' + (slot.od || '') + '–' + (slot.do || '') + ': minNaBudovu=' + (slot.minNaBudovu ?? '') + ', maxNaBudovu=' + (slot.maxNaBudovu ?? '') + ', minNaTridu=' + (slot.minNaTridu ?? '') + ', maxNaTridu=' + (slot.maxNaTridu ?? '') + ', dny=[' + dnyStr + ']');
    }
    lines.push('');

    lines.push('### Pravidla (výběr)');
    var pravidla = (data && data.pravidla) || {};
    lines.push('- minimalniPrekryvMinuty: ' + (pravidla.minimalniPrekryvMinuty ?? ''));
    lines.push('- zakazPrechodMeziBudovami: ' + (pravidla.zakazPrechodMeziBudovami ?? ''));
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('## 2. Vygenerovaný přehled (anonymizovaný)');
    lines.push('');
    lines.push('Formát: Den | Zaměstnanec (label) | Čas od–do | Místo (třída/budova label).');
    lines.push('');

    for (var pi = 0; pi < (prirazeni || []).length; pi += 1) {
      var p = prirazeni[pi];
      var zLabel = anon.zamIdToLabel[p.zamestnanecId] || p.zamestnanecId;
      var segs = p.segmenty || [];
      for (var si = 0; si < segs.length; si += 1) {
        var seg = segs[si];
        var misto = seg.tridaId ? (anon.tridaIdToLabel[seg.tridaId] + ' (' + (seg.budovaId ? anon.budovaIdToLabel[seg.budovaId] : '') + ')') : (seg.budovaId ? anon.budovaIdToLabel[seg.budovaId] : '—');
        lines.push('- ' + NAZVY_DNU[p.den] + ' | ' + zLabel + ' | ' + (seg.od || '') + '–' + (seg.do || '') + ' | ' + misto);
      }
    }
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('## 3. Nalezené chyby');
    lines.push('');
    for (var ei = 0; ei < (polozky || []).length; ei += 1) {
      var pol = polozky[ei];
      lines.push('- **' + pol.pravidlo + '** (' + pol.typ + '): ' + anon.replaceInText(pol.kontext));
      lines.push('');
    }
    lines.push('---');
    lines.push('');
    lines.push('*Konec reportu. Postup nápravy: 1) Napsat test z anonymizované konfigurace a přehledu, který chybu odhalí. 2) Upravit kód tak, aby test prošel.*');
    return lines.join('\n');
  }

  /**
   * Stáhne chybový report jako soubor .md.
   */
  function stahnoutChybovyReport(data, prirazeni, polozky, nazevSouboru) {
    var nazev = (nazevSouboru && typeof nazevSouboru === 'string') ? nazevSouboru : 'chybovy-report-navrh-smen.md';
    var text = generateReport(data || {}, prirazeni || [], polozky || []);
    var blob = new Blob(['\uFEFF' + text], { type: 'text/markdown; charset=utf-8' });
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

  global.MSemenyChybovyReport = {
    buildAnonymizer: buildAnonymizer,
    generateReport: generateReport,
    stahnoutChybovyReport: stahnoutChybovyReport
  };
})(typeof window !== 'undefined' ? window : this);
