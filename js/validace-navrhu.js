/**
 * Validace návrhu směn (D10).
 * Kontrola úvazků (přečerpaný / nevyčerpaný) a výstup seznamu chyb a varování.
 */
(function (global) {
  'use strict';

  function timeToMinuty(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return 0;
    var parts = hhmm.split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }

  function jmenoZamestnance(zamestnanci, id) {
    for (var i = 0; i < (zamestnanci || []).length; i += 1) {
      if (zamestnanci[i].id === id) return zamestnanci[i].jmeno || '(bez jména)';
    }
    return '(?)';
  }

  /**
   * Spočítá součet minut v návrhu pro každého zaměstnance (podle zamestnanecId).
   * @param {Array} prirazeni - [{ den, zamestnanecId, segmenty: [{ od, do }] }]
   * @returns {Object} mapa zamestnanecId -> celkové minuty
   */
  function sumMinutyPerZamestnanec(prirazeni) {
    var sum = {};
    for (var i = 0; i < (prirazeni || []).length; i += 1) {
      var p = prirazeni[i];
      var id = p.zamestnanecId;
      if (!id) continue;
      if (!sum[id]) sum[id] = 0;
      var segs = p.segmenty || [];
      for (var j = 0; j < segs.length; j += 1) {
        var seg = segs[j];
        var odM = timeToMinuty(seg.od);
        var doM = timeToMinuty(seg.do);
        if (doM > odM) sum[id] += (doM - odM);
      }
    }
    return sum;
  }

  /**
   * Zvaliduje návrh vůči úvazkům a vrátí seznam chyb/varování.
   * @param {Array} prirazeni - návrh (vygenerovaný nebo načtený z CSV)
   * @param {Object} data - konfigurace { zamestnanci }
   * @returns {{ ok: boolean, polozky: Array<{ typ: string, pravidlo: string, kontext: string }> }}
   */
  function validujNavrh(prirazeni, data) {
    var polozky = [];
    var zamestnanci = (data && data.zamestnanci) || [];

    if (!prirazeni || prirazeni.length === 0) {
      return { ok: true, polozky: [] };
    }

    var minutyPerZam = sumMinutyPerZamestnanec(prirazeni);

    for (var i = 0; i < zamestnanci.length; i += 1) {
      var z = zamestnanci[i];
      var id = z.id;
      var uvazek = (z.uvazekMinutyTyden != null && z.uvazekMinutyTyden !== '') ? parseInt(z.uvazekMinutyTyden, 10) : 0;
      if (isNaN(uvazek)) uvazek = 0;
      var vNavrhu = minutyPerZam[id] || 0;

      if (vNavrhu > uvazek) {
        polozky.push({
          typ: 'chyba',
          pravidlo: 'Přečerpaný úvazek',
          kontext: jmenoZamestnance(zamestnanci, id) + ': v návrhu ' + vNavrhu + ' min, úvazek max ' + uvazek + ' min'
        });
      } else if (uvazek > 0 && vNavrhu < uvazek) {
        polozky.push({
          typ: 'varovani',
          pravidlo: 'Nevyčerpaný úvazek',
          kontext: jmenoZamestnance(zamestnanci, id) + ': v návrhu ' + vNavrhu + ' min, úvazek ' + uvazek + ' min'
        });
      }
    }

    // Zaměstnanci, kteří jsou v návrhu ale ne v konfiguraci (např. po smazání z konfigurace)
    for (var zamId in minutyPerZam) {
      if (!Object.prototype.hasOwnProperty.call(minutyPerZam, zamId)) continue;
      var found = false;
      for (var k = 0; k < zamestnanci.length; k += 1) {
        if (zamestnanci[k].id === zamId) { found = true; break; }
      }
      if (!found) {
        polozky.push({
          typ: 'varovani',
          pravidlo: 'Neznámý zaměstnanec v návrhu',
          kontext: 'ID „' + zamId + '“: v návrhu ' + minutyPerZam[zamId] + ' min (není v aktuální konfiguraci)'
        });
      }
    }

    var hasChyba = polozky.some(function (p) { return p.typ === 'chyba'; });
    return { ok: !hasChyba, polozky: polozky };
  }

  global.MSemenyValidaceNavrhu = {
    validujNavrh: validujNavrh,
    sumMinutyPerZamestnanec: sumMinutyPerZamestnanec
  };
})(typeof window !== 'undefined' ? window : this);
