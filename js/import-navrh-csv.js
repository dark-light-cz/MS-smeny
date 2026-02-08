/**
 * Import návrhu směn ze CSV (D9).
 * Formát jako u exportu: Den;Zaměstnanec;Čas;Místo (oddělovač ;, UTF-8).
 */
(function (global) {
  'use strict';

  var NAZVY_DNU = ['', 'Po', 'Út', 'St', 'Čt', 'Pá'];

  /** Mapování label dne na index 1–5. */
  function denLabelToIndex(label) {
    var s = (label || '').trim();
    for (var i = 1; i <= 5; i += 1) {
      if (NAZVY_DNU[i] === s) return i;
    }
    return null;
  }

  /** Z CSV řádku vrátí pole hodnot (jednoduchý split podle ;, odstraní uvozovky kolem hodnot). */
  function parseCsvRadek(radek) {
    var out = [];
    var val = '';
    var inQuotes = false;
    for (var i = 0; i < radek.length; i += 1) {
      var c = radek[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ';' && !inQuotes) {
        out.push(val.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
        val = '';
      } else {
        val += c;
      }
    }
    out.push(val.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    return out;
  }

  /** Najde zamestnanecId podle jména. */
  function findZamestnanecId(zamestnanci, jmeno) {
    var j = (jmeno || '').trim();
    for (var i = 0; i < (zamestnanci || []).length; i += 1) {
      if ((zamestnanci[i].jmeno || '').trim() === j) return zamestnanci[i].id;
    }
    return null;
  }

  /** Najde tridaId podle názvu třídy a názvu budovy. */
  function findTridaId(budovy, tridaNazev, budovaNazev) {
    var tn = (tridaNazev || '').trim();
    var bn = (budovaNazev || '').trim();
    for (var i = 0; i < (budovy || []).length; i += 1) {
      if ((budovy[i].nazev || '').trim() !== bn) continue;
      var tridy = budovy[i].tridy || [];
      for (var j = 0; j < tridy.length; j += 1) {
        if ((tridy[j].nazev || '').trim() === tn) return tridy[j].id;
      }
    }
    return null;
  }

  /** Najde budovaId podle názvu budovy. */
  function findBudovaId(budovy, budovaNazev) {
    var bn = (budovaNazev || '').trim();
    for (var i = 0; i < (budovy || []).length; i += 1) {
      if ((budovy[i].nazev || '').trim() === bn) return budovy[i].id;
    }
    return null;
  }

  /**
   * Parsuje Místo z exportu: "Třída: X (Y)" nebo "Budova: Z".
   * @returns {{ tridaId: string|null, budovaId: string|null }}
   */
  function parseMisto(misto, budovy) {
    var m = (misto || '').trim();
    if (!m) return { tridaId: null, budovaId: null };
    if (m.indexOf('Třída:') === 0) {
      var rest = m.slice(6).trim();
      var idx = rest.indexOf(' (');
      if (idx >= 0 && rest.slice(-1) === ')') {
        var tridaNazev = rest.slice(0, idx).trim();
        var budovaNazev = rest.slice(idx + 2, -1).trim();
        var tridaId = findTridaId(budovy, tridaNazev, budovaNazev);
        var budovaId = tridaId ? findBudovaId(budovy, budovaNazev) : null;
        return { tridaId: tridaId, budovaId: budovaId };
      }
    }
    if (m.indexOf('Budova:') === 0) {
      var bNazev = m.slice(7).trim();
      var bid = findBudovaId(budovy, bNazev);
      return { tridaId: null, budovaId: bid };
    }
    return { tridaId: null, budovaId: null };
  }

  /**
   * Parsuje Čas "HH:MM–HH:MM" (pomlčka může být – nebo -).
   * @returns {{ od: string, do: string }|null}
   */
  function parseCas(cas) {
    var c = (cas || '').trim();
    var sep = c.indexOf('–') >= 0 ? '–' : '-';
    var parts = c.split(sep);
    if (parts.length !== 2) return null;
    var od = parts[0].trim();
    var do_ = parts[1].trim();
    if (/^\d{1,2}:\d{2}$/.test(od) && /^\d{1,2}:\d{2}$/.test(do_)) {
      return { od: od, do: do_ };
    }
    return null;
  }

  /**
   * Načte návrh ze CSV řetězce a převede na prirazeni (formát jako výstup vypocetSmen).
   * @param {string} csvText - obsah souboru (UTF-8, může začínat BOM)
   * @param {Object} data - konfigurace { zamestnanci, budovy }
   * @returns {{ ok: boolean, prirazeni?: Array, chyba?: string, varovani?: string[] }}
   */
  function csvToPrirazeni(csvText, data) {
    var zamestnanci = (data && data.zamestnanci) || [];
    var budovy = (data && data.budovy) || [];
    var varovani = [];

    if (!csvText || typeof csvText !== 'string') {
      return { ok: false, chyba: 'Prázdný soubor nebo neplatná data.' };
    }

    var text = csvText.replace(/^\uFEFF/, '');
    var radky = text.split(/\r?\n/).filter(function (r) { return r.trim(); });
    if (radky.length < 2) {
      return { ok: false, chyba: 'CSV musí obsahovat hlavičku a alespoň jeden řádek dat.' };
    }

    var hl = parseCsvRadek(radky[0]);
    if (hl.length < 4 || (hl[0] !== 'Den' && hl[0] !== 'den')) {
      return { ok: false, chyba: 'Očekávaná hlavička: Den;Zaměstnanec;Čas;Místo' };
    }

    var map = {}; // klíč "den_zamId" -> { den, zamestnanecId, segmenty: [] }
    for (var r = 1; r < radky.length; r += 1) {
      var cols = parseCsvRadek(radky[r]);
      if (cols.length < 4) continue;
      var denLabel = cols[0];
      var jmeno = cols[1];
      var casStr = cols[2];
      var mistoStr = cols[3];

      var den = denLabelToIndex(denLabel);
      if (den == null) {
        varovani.push('Řádek ' + (r + 1) + ': neplatný den „' + denLabel + '“. Řádek přeskočen.');
        continue;
      }
      var zamId = findZamestnanecId(zamestnanci, jmeno);
      if (!zamId) {
        varovani.push('Řádek ' + (r + 1) + ': neznámý zaměstnanec „' + jmeno + '“. Řádek přeskočen.');
        continue;
      }
      var cas = parseCas(casStr);
      if (!cas) {
        varovani.push('Řádek ' + (r + 1) + ': neplatný čas „' + casStr + '“. Řádek přeskočen.');
        continue;
      }
      var misto = parseMisto(mistoStr, budovy);
      var seg = { od: cas.od, do: cas.do };
      if (misto.tridaId) seg.tridaId = misto.tridaId;
      if (misto.budovaId) seg.budovaId = misto.budovaId;
      if (!misto.tridaId && !misto.budovaId && mistoStr.trim()) {
        varovani.push('Řádek ' + (r + 1) + ': místo „' + mistoStr + '“ nebylo rozpoznáno.');
      }

      var key = den + '_' + zamId;
      if (!map[key]) {
        map[key] = { den: den, zamestnanecId: zamId, segmenty: [] };
      }
      map[key].segmenty.push(seg);
    }

    var prirazeni = [];
    for (var k in map) {
      if (Object.prototype.hasOwnProperty.call(map, k)) {
        prirazeni.push(map[k]);
      }
    }
    if (prirazeni.length === 0 && radky.length > 1) {
      return { ok: false, chyba: 'Žádný řádek se nepodařilo načíst. Zkontrolujte formát a názvy (den Po–Pá, jména zaměstnanců, místa).', varovani: varovani };
    }

    return { ok: true, prirazeni: prirazeni, varovani: varovani };
  }

  global.MSemenyImportNavrhCsv = {
    csvToPrirazeni: csvToPrirazeni
  };
})(typeof window !== 'undefined' ? window : this);
