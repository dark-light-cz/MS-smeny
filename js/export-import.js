/**
 * Export a import dat aplikace MS-smeny do/z JSON.
 * Bez UI – volatelné z konzole (později napojit na tlačítka).
 */
(function (global) {
  'use strict';

  var DEFAULT_NAZEV_SOUBORU = 'ms-smeny-export.json';

  /**
   * Vrátí aktuální data jako JSON řetězec.
   * @returns {string} JSON string celých dat
   */
  function exportData() {
    var Storage = global.MSemenyStorage;
    if (!Storage || !Storage.getData) {
      throw new Error('MS-smeny: export-import vyžaduje načtený storage.js');
    }
    var data = Storage.getData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Stáhne aktuální data jako JSON soubor do prohlížeče.
   * @param {string} [nazevSouboru] Volitelný název souboru (default: ms-smeny-export.json)
   */
  function stahnoutExport(nazevSouboru) {
    var nazev = nazevSouboru && typeof nazevSouboru === 'string' ? nazevSouboru : DEFAULT_NAZEV_SOUBORU;
    var json = exportData();
    var blob = new Blob([json], { type: 'application/json' });
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

  /**
   * Ověří, že objekt má platnou strukturu dat (zamestnanci a budovy jsou pole).
   * @param {*} obj
   * @returns {boolean}
   */
  function jePlatnaStruktura(obj) {
    return obj &&
      typeof obj === 'object' &&
      Array.isArray(obj.zamestnanci) &&
      Array.isArray(obj.budovy);
  }

  /**
   * Doplní chybějící pole (version, minMaxSloty, pravidla) z výchozího stavu.
   * @param {Object} data Naimportovaná data (mají mít alespoň zamestnanci a budovy)
   * @returns {Object} Data připravená k uložení
   */
  function doplnVychoziPole(data) {
    var Model = global.MSemenyDataModel;
    var vychozi = Model && Model.vychoziStav ? Model.vychoziStav() : null;
    var vychoziOteviraci = Model && Model.vychoziOteviraciDoba ? Model.vychoziOteviraciDoba() : { dny: [1, 2, 3, 4, 5], od: '07:00', do: '17:00' };
    if (!vychozi) {
      return data;
    }
    var budovy = (data.budovy || []).map(function (b) {
      var budova = { id: b.id, nazev: b.nazev != null ? b.nazev : '', oteviraciDoba: (b.oteviraciDoba && b.oteviraciDoba.dny) ? b.oteviraciDoba : vychoziOteviraci, tridy: [] };
      (b.tridy || []).forEach(function (t) {
        budova.tridy.push({
          id: t.id,
          nazev: t.nazev != null ? t.nazev : '',
          oteviraciDoba: (t.oteviraciDoba && t.oteviraciDoba.dny) ? t.oteviraciDoba : vychoziOteviraci
        });
      });
      return budova;
    });
    var normNedost = Model && Model.normalizujNedostupnost ? Model.normalizujNedostupnost : function (n) { return Array.isArray(n) ? n : []; };
    var normPrechod = Model && Model.normalizujPrechodBudovy ? Model.normalizujPrechodBudovy : function (v) { return v === 'zakázat' || v === 'povolit' ? v : 'výchozí'; };
    var normPrirazenoJen = Model && Model.normalizujPrirazenoJen ? Model.normalizujPrirazenoJen : function (v) { return (typeof v === 'string' && (v.indexOf('b:') === 0 || v.indexOf('t:') === 0)) ? v : null; };
    var budovyList = data.budovy || [];
    var validBudovyIds = {};
    var validTridyIds = {};
    budovyList.forEach(function (b) {
      if (b && b.id) validBudovyIds[b.id] = true;
      (b.tridy || []).forEach(function (t) {
        if (t && t.id) validTridyIds[t.id] = true;
      });
    });
    var zamestnanci = (data.zamestnanci || []).map(function (z) {
      var k = z.kmenovaVykryvaci === 'vykrývací' ? 'vykrývací' : 'kmenová';
      var tid = (k === 'kmenová' && z.tridaId) ? z.tridaId : null;
      var pj = normPrirazenoJen(z.prirazenoJen);
      if (pj) {
        if (pj.indexOf('b:') === 0) {
          var bid = pj.slice(2);
          if (!validBudovyIds[bid]) pj = null;
        } else if (pj.indexOf('t:') === 0) {
          var trid = pj.slice(2);
          if (!validTridyIds[trid]) pj = null;
        }
      }
      var barva = (z.barva && typeof z.barva === 'string' && /^#[0-9a-fA-F]{6}$/.test(z.barva)) ? z.barva : undefined;
      return {
        id: z.id,
        jmeno: z.jmeno != null ? z.jmeno : '',
        uvazekMinutyTyden: z.uvazekMinutyTyden != null ? z.uvazekMinutyTyden : 0,
        role: z.role != null ? z.role : 'učitelka',
        kmenovaVykryvaci: k,
        tridaId: tid,
        nedostupnost: normNedost(z.nedostupnost),
        prechodMeziBudovami: normPrechod(z.prechodMeziBudovami),
        prirazenoJen: pj,
        barva: barva
      };
    });
    var out = {
      zamestnanci: zamestnanci,
      budovy: budovy
    };
    out.version = data.version != null ? data.version : vychozi.version;
    var sloty = Array.isArray(data.minMaxSloty) && data.minMaxSloty.length > 0
      ? data.minMaxSloty
      : vychozi.minMaxSloty;
    out.minMaxSloty = sloty.map(function (s) {
      return {
        id: s.id,
        od: s.od,
        do: s.do,
        minNaBudovu: s.minNaBudovu,
        maxNaBudovu: s.maxNaBudovu,
        minNaTridu: s.minNaTridu,
        maxNaTridu: s.maxNaTridu,
        dny: Array.isArray(s.dny) ? s.dny.slice() : [],
        rotace: !!s.rotace
      };
    });
    var p = data.pravidla && typeof data.pravidla === 'object' ? data.pravidla : {};
    // C6: Normalizace režimu střídání
    var stridaniRezimy = Model && Model.STRIDANI_REZIMY ? Model.STRIDANI_REZIMY : ['preferenční', 'tvrdý'];
    var stridaniRezim = (p.stridaniRezim && stridaniRezimy.indexOf(p.stridaniRezim) >= 0)
      ? p.stridaniRezim : vychozi.pravidla.stridaniRezim;
    // C7: Normalizace min délky bloku
    var minDelkaBloku = (p.minDelkaBlokuMinuty != null && p.minDelkaBlokuMinuty !== '' && !isNaN(parseInt(p.minDelkaBlokuMinuty, 10)))
      ? parseInt(p.minDelkaBlokuMinuty, 10) : vychozi.pravidla.minDelkaBlokuMinuty;
    out.pravidla = {
      minimalniPrekryvMinuty: p.minimalniPrekryvMinuty != null ? p.minimalniPrekryvMinuty : vychozi.pravidla.minimalniPrekryvMinuty,
      vykryvaciBezMezer: p.vykryvaciBezMezer != null ? p.vykryvaciBezMezer : vychozi.pravidla.vykryvaciBezMezer,
      vykryvaciMaxPresun: p.vykryvaciMaxPresun != null ? p.vykryvaciMaxPresun : vychozi.pravidla.vykryvaciMaxPresun,
      minKmenovychNaTridu: p.minKmenovychNaTridu != null ? p.minKmenovychNaTridu : vychozi.pravidla.minKmenovychNaTridu,
      maxKmenovychNaTridu: p.maxKmenovychNaTridu != null ? p.maxKmenovychNaTridu : vychozi.pravidla.maxKmenovychNaTridu,
      zakazPrechodMeziBudovami: p.zakazPrechodMeziBudovami != null ? !!p.zakazPrechodMeziBudovami : vychozi.pravidla.zakazPrechodMeziBudovami,
      // C6: Střídání dopoledne/odpoledne
      stridaniDopoledneOdpoledne: p.stridaniDopoledneOdpoledne != null ? !!p.stridaniDopoledneOdpoledne : vychozi.pravidla.stridaniDopoledneOdpoledne,
      stridaniRezim: stridaniRezim,
      stridaniHraniceMinuty: p.stridaniHraniceMinuty != null ? parseInt(p.stridaniHraniceMinuty, 10) || 720 : vychozi.pravidla.stridaniHraniceMinuty,
      // C7: Souvislé bloky a méně dnů
      preferSouvisleBlok: p.preferSouvisleBlok != null ? !!p.preferSouvisleBlok : vychozi.pravidla.preferSouvisleBlok,
      minDelkaBlokuMinuty: minDelkaBloku
    };
    var ond = Array.isArray(data.omezeniNeDohromady) ? data.omezeniNeDohromady : [];
    out.omezeniNeDohromady = ond
      .filter(function (o) {
        return o && o.osoba1Id && o.osoba2Id && o.osoba1Id !== o.osoba2Id;
      })
      .map(function (o) {
        return {
          id: o.id || (Model && Model.generujId ? Model.generujId() : 'ond-' + Date.now()),
          osoba1Id: String(o.osoba1Id),
          osoba2Id: String(o.osoba2Id)
        };
      });
    return out;
  }

  /**
   * Naimportuje data z JSON řetězce a nahradí aktuální stav v úložišti.
   * @param {string} jsonString Platný JSON s daty (zamestnanci, budovy; volitelně version, minMaxSloty, pravidla)
   * @returns {boolean} true při úspěchu, false při neplatném vstupu (data se nezmění)
   */
  function importZeJSON(jsonString) {
    var Storage = global.MSemenyStorage;
    if (!Storage || !Storage.setData) {
      throw new Error('MS-smeny: export-import vyžaduje načtený storage.js');
    }
    if (jsonString == null || typeof jsonString !== 'string') {
      return false;
    }
    var trimmed = jsonString.trim();
    if (trimmed === '') {
      return false;
    }
    try {
      var parsed = JSON.parse(trimmed);
      if (!jePlatnaStruktura(parsed)) {
        return false;
      }
      var data = doplnVychoziPole(parsed);
      Storage.setData(data);
      if (global.MSemenyNavrhGraf && typeof global.MSemenyNavrhGraf.doplnBarvyZamestnancum === 'function') {
        global.MSemenyNavrhGraf.doplnBarvyZamestnancum();
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  global.MSemenyExportImport = {
    exportData: exportData,
    stahnoutExport: stahnoutExport,
    importZeJSON: importZeJSON
  };
})(typeof window !== 'undefined' ? window : this);
