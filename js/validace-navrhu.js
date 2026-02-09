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

  var TYPY_UMISTENI = (global.MSemenyDataModel && global.MSemenyDataModel.TYPY_UMISTENI)
    ? global.MSemenyDataModel.TYPY_UMISTENI
    : { PEDAGOGOVE: 'pedagogove', ASISTENTI: 'asistenti', SKOLNICE: 'skolnice' };

  /**
   * Spočítá součet minut v návrhu pro každého zaměstnance (podle zamestnanecId).
   * @param {Array} prirazeni - [{ den, zamestnanecId, segmenty: [{ od, do }] }]
   * @returns {Object} mapa zamestnanecId -> celkové minuty
   */
  function sumMinutyPerZamestnanec(prirazeni) {
    var byType = sumMinutyPerZamestnanecPoType(prirazeni);
    var sum = {};
    for (var zamId in byType) {
      if (!Object.prototype.hasOwnProperty.call(byType, zamId)) continue;
      var t = byType[zamId];
      sum[zamId] = (t.pedagogove || 0) + (t.asistenti || 0) + (t.skolnice || 0);
    }
    return sum;
  }

  /**
   * Spočítá součet minut v návrhu pro každého zaměstnance a typ umísťování (pedagogové / asistenti / školnice).
   * Segment bez typUmisteni se počítá jako pedagogove.
   * @param {Array} prirazeni - [{ den, zamestnanecId, segmenty: [{ od, do, typUmisteni? }] }]
   * @returns {Object} mapa zamestnanecId -> { pedagogove, asistenti, skolnice }
   */
  function sumMinutyPerZamestnanecPoType(prirazeni) {
    var sum = {};
    for (var i = 0; i < (prirazeni || []).length; i += 1) {
      var p = prirazeni[i];
      var id = p.zamestnanecId;
      if (!id) continue;
      if (!sum[id]) sum[id] = { pedagogove: 0, asistenti: 0, skolnice: 0 };
      var segs = p.segmenty || [];
      for (var j = 0; j < segs.length; j += 1) {
        var seg = segs[j];
        var odM = timeToMinuty(seg.od);
        var doM = timeToMinuty(seg.do);
        var minuty = (doM > odM) ? (doM - odM) : 0;
        var typ = seg.typUmisteni === TYPY_UMISTENI.ASISTENTI ? 'asistenti'
          : seg.typUmisteni === TYPY_UMISTENI.SKOLNICE ? 'skolnice'
          : 'pedagogove';
        sum[id][typ] = (sum[id][typ] || 0) + minuty;
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
    prirazeni = prirazeni || [];

    var minutyPerZam = sumMinutyPerZamestnanec(prirazeni);
    var minutyPerZamPoType = sumMinutyPerZamestnanecPoType(prirazeni);
    var getUvazekProUmisteni = (typeof global.MSemenyDataModel !== 'undefined' && global.MSemenyDataModel.getUvazekMinutyZamestnanceProUmisteni)
      ? global.MSemenyDataModel.getUvazekMinutyZamestnanceProUmisteni
      : null;
    var typyProKontrolu = [TYPY_UMISTENI.PEDAGOGOVE, TYPY_UMISTENI.ASISTENTI, TYPY_UMISTENI.SKOLNICE];
    var typLabel = function (t) {
      if (t === TYPY_UMISTENI.ASISTENTI) return 'asistentka';
      if (t === TYPY_UMISTENI.SKOLNICE) return 'školnice';
      return 'pedagog';
    };

    if (prirazeni.length > 0) {

    for (var i = 0; i < zamestnanci.length; i += 1) {
      var z = zamestnanci[i];
      var id = z.id;
      if (!getUvazekProUmisteni) {
        var uvazek = (global.MSemenyDataModel && global.MSemenyDataModel.getUvazekMinutyZamestnance)
          ? global.MSemenyDataModel.getUvazekMinutyZamestnance(z)
          : ((z.uvazekMinutyTyden != null && z.uvazekMinutyTyden !== '') ? parseInt(z.uvazekMinutyTyden, 10) : 0);
        if (isNaN(uvazek)) uvazek = 0;
        var vNavrhu = minutyPerZam[id] || 0;
        if (vNavrhu > uvazek) {
          polozky.push({ typ: 'chyba', pravidlo: 'Přečerpaný úvazek', kontext: jmenoZamestnance(zamestnanci, id) + ': v návrhu ' + vNavrhu + ' min, úvazek max ' + uvazek + ' min', zamestnanecId: id });
        } else if (uvazek > 0 && vNavrhu < uvazek) {
          var zbyvaMin = uvazek - vNavrhu;
          polozky.push({ typ: 'varovani', pravidlo: 'Nevyčerpaný úvazek', kontext: jmenoZamestnance(zamestnanci, id) + ': v návrhu ' + vNavrhu + ' min, úvazek ' + uvazek + ' min, což odpovídá ' + Math.floor(zbyvaMin / 60) + ':' + ((zbyvaMin % 60) < 10 ? '0' : '') + (zbyvaMin % 60), zamestnanecId: id });
        }
        continue;
      }
      for (var ti = 0; ti < typyProKontrolu.length; ti += 1) {
        var typU = typyProKontrolu[ti];
        var uvazek = getUvazekProUmisteni(z, typU);
        if (isNaN(uvazek)) uvazek = 0;
        if (uvazek <= 0) continue;
        var byType = minutyPerZamPoType[id] || {};
        var vNavrhu = byType[typU] || 0;
        if (vNavrhu > uvazek) {
          polozky.push({
            typ: 'chyba',
            pravidlo: 'Přečerpaný úvazek',
            kontext: jmenoZamestnance(zamestnanci, id) + ' (' + typLabel(typU) + '): v návrhu ' + vNavrhu + ' min, úvazek max ' + uvazek + ' min',
            zamestnanecId: id,
            typUmisteni: typU
          });
        } else if (vNavrhu < uvazek) {
          var zbyvaMin = uvazek - vNavrhu;
          var zbyvaText = Math.floor(zbyvaMin / 60) + ':' + ((zbyvaMin % 60) < 10 ? '0' : '') + (zbyvaMin % 60);
          polozky.push({
            typ: 'varovani',
            pravidlo: 'Nevyčerpaný úvazek',
            kontext: jmenoZamestnance(zamestnanci, id) + ' (' + typLabel(typU) + '): v návrhu ' + vNavrhu + ' min, úvazek ' + uvazek + ' min, což odpovídá ' + zbyvaText,
            zamestnanecId: id,
            typUmisteni: typU
          });
        }
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

    // Překryv směn: jedna osoba na dvou místech současně (editací lze dosáhnout)
    var budovyOver = (data && data.budovy) || [];
    for (var po = 0; po < prirazeni.length; po += 1) {
      var pp = prirazeni[po];
      var segsOver = pp.segmenty || [];
      for (var i = 0; i < segsOver.length; i += 1) {
        for (var j = i + 1; j < segsOver.length; j += 1) {
          var odI = timeToMinuty(segsOver[i].od);
          var doI = timeToMinuty(segsOver[i].do);
          var odJ = timeToMinuty(segsOver[j].od);
          var doJ = timeToMinuty(segsOver[j].do);
          if (odI < doJ && odJ < doI) {
            var s1 = segsOver[i], s2 = segsOver[j];
            var seg1Label = (s1.od || '') + '–' + (s1.do || '') + ' ' + mistoLabelSegment(budovyOver, s1);
            var seg2Label = (s2.od || '') + '–' + (s2.do || '') + ' ' + mistoLabelSegment(budovyOver, s2);
            var jmenoOver = jmenoZamestnance(zamestnanci, pp.zamestnanecId);
            polozky.push({
              typ: 'chyba',
              pravidlo: 'Překryv směn',
              kontext: jmenoOver + ': současně ' + seg1Label + ' a ' + seg2Label,
              zamestnanecId: pp.zamestnanecId,
              den: pp.den,
              segIndex1: i,
              segIndex2: j,
              seg1Label: seg1Label,
              seg2Label: seg2Label
            });
          }
        }
      }
    }
    }

    // B1e: Kontrola „přiřazen pouze do“ – zaměstnanec smí být jen v povolené budově/třídě
    if (prirazeni.length > 0) {
      var budovyB1e = (data && data.budovy) || [];
      for (var piB = 0; piB < prirazeni.length; piB += 1) {
        var pB = prirazeni[piB];
        var zIdB = pB.zamestnanecId;
        if (!zIdB) continue;
        var empB = null;
        for (var ziB = 0; ziB < zamestnanci.length; ziB += 1) {
          if (zamestnanci[ziB].id === zIdB) { empB = zamestnanci[ziB]; break; }
        }
        if (!empB || !empB.prirazenoJen) continue;
        var pjB = empB.prirazenoJen;
        var segsB = pB.segmenty || [];
        for (var siB = 0; siB < segsB.length; siB += 1) {
          var segB = segsB[siB];
          var okB = false;
          if (pjB.indexOf('t:') === 0) {
            okB = (segB.tridaId === pjB.slice(2));
          } else if (pjB.indexOf('b:') === 0) {
            var allowedBudovaB = pjB.slice(2);
            var segBudovaB = segB.budovaId || (segB.tridaId ? tridaJeVBudove(budovyB1e, segB.tridaId) : null);
            okB = (segBudovaB === allowedBudovaB);
          }
          if (!okB) {
            polozky.push({
              typ: 'chyba',
              pravidlo: 'Přiřazení jen do budovy/třídy (B1e)',
              kontext: jmenoZamestnance(zamestnanci, zIdB) + ': přiřazen do jiného místa než povoleno (den ' + (pB.den || '?') + ', ' + (segB.od || '') + '–' + (segB.do || '') + ')',
              zamestnanecId: zIdB
            });
          }
        }
      }
    }

    // D10b: Kontrola min/max na třídu a budovu (časové sloty z Pravidel) – jen když existuje návrh
    if (prirazeni.length > 0) {
    var budovy = (data && data.budovy) || [];
    var minMaxSloty = (data && data.minMaxSloty) || [];
    var NAZVY_DNU = ['', 'Po', 'Út', 'St', 'Čt', 'Pá'];
    for (var si = 0; si < minMaxSloty.length; si += 1) {
      var slot = minMaxSloty[si];
      var slotOdM = timeToMinuty(slot.od);
      var slotDoM = timeToMinuty(slot.do);
      if (slotOdM >= slotDoM) continue;
      var dnySlot = (slot.dny && slot.dny.length > 0) ? slot.dny : [1, 2, 3, 4, 5];
      var minNaBudovu = (slot.minNaBudovu != null && slot.minNaBudovu !== '') ? parseInt(slot.minNaBudovu, 10) : 0;
      var maxNaBudovu = (slot.maxNaBudovu != null && slot.maxNaBudovu !== '') ? parseInt(slot.maxNaBudovu, 10) : null;
      var minNaTridu = (slot.minNaTridu != null && slot.minNaTridu !== '') ? parseInt(slot.minNaTridu, 10) : 0;
      var maxNaTridu = (slot.maxNaTridu != null && slot.maxNaTridu !== '') ? parseInt(slot.maxNaTridu, 10) : null;
      var casLabel = (slot.od || '') + '–' + (slot.do || '');

      if (minNaTridu > 0 || maxNaTridu !== null) {
        for (var di = 0; di < dnySlot.length; di += 1) {
          var den = dnySlot[di];
          for (var bi = 0; bi < budovy.length; bi += 1) {
            var bud = budovy[bi];
            var tridy = bud.tridy || [];
            for (var ti = 0; ti < tridy.length; ti += 1) {
              var tr = tridy[ti];
              var mm = minMaxPocetOsobVTridVCase(prirazeni, den, tr.id, slotOdM, slotDoM);
              if (minNaTridu > 0 && mm.min < minNaTridu) {
                polozky.push({
                  typ: 'chyba',
                  pravidlo: 'Min/max na třídu',
                  kontext: 'Den ' + NAZVY_DNU[den] + ', ' + casLabel + ', třída ' + nazevTridy(budovy, tr.id) + ': ' + mm.min + ' osob (min ' + minNaTridu + ')',
                  den: den,
                  tridaId: tr.id
                });
              }
              if (maxNaTridu !== null && mm.max > maxNaTridu) {
                polozky.push({
                  typ: 'chyba',
                  pravidlo: 'Min/max na třídu',
                  kontext: 'Den ' + NAZVY_DNU[den] + ', ' + casLabel + ', třída ' + nazevTridy(budovy, tr.id) + ': ' + mm.max + ' osob (max ' + maxNaTridu + ')',
                  den: den,
                  tridaId: tr.id
                });
              }
            }
          }
        }
      }
      if (minNaBudovu > 0 || maxNaBudovu !== null) {
        for (var di2 = 0; di2 < dnySlot.length; di2 += 1) {
          var den2 = dnySlot[di2];
          for (var bi2 = 0; bi2 < budovy.length; bi2 += 1) {
            var bud2 = budovy[bi2];
            var mmB = minMaxPocetOsobVBudoveVCase(prirazeni, den2, bud2.id, budovy, slotOdM, slotDoM);
            if (minNaBudovu > 0 && mmB.min < minNaBudovu) {
              polozky.push({
                typ: 'chyba',
                pravidlo: 'Min/max na budovu',
                kontext: 'Den ' + NAZVY_DNU[den2] + ', ' + casLabel + ', budova ' + nazevBudovy(budovy, bud2.id) + ': ' + mmB.min + ' osob (min ' + minNaBudovu + ')',
                den: den2,
                budovaId: bud2.id
              });
            }
            if (maxNaBudovu !== null && mmB.max > maxNaBudovu) {
              polozky.push({
                typ: 'chyba',
                pravidlo: 'Min/max na budovu',
                kontext: 'Den ' + NAZVY_DNU[den2] + ', ' + casLabel + ', budova ' + nazevBudovy(budovy, bud2.id) + ': ' + mmB.max + ' osob (max ' + maxNaBudovu + ')',
                den: den2,
                budovaId: bud2.id
              });
            }
          }
        }
      }
    }
    }

    var hasChyba = polozky.some(function (p) { return p.typ === 'chyba'; });
    return { ok: !hasChyba, polozky: polozky };
  }

  function nazevTridy(budovy, tridaId) {
    if (!tridaId) return '(?)';
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

  function nazevBudovy(budovy, id) {
    if (!id) return '';
    for (var i = 0; i < (budovy || []).length; i += 1) {
      if (budovy[i].id === id) return budovy[i].nazev || '(bez názvu)';
    }
    return '(?)';
  }

  /** Popisek místa segmentu pro hlášku (Třída: X (Y) nebo Budova: Z). */
  function mistoLabelSegment(budovy, seg) {
    if (seg.tridaId) return 'Třída: ' + nazevTridy(budovy, seg.tridaId);
    if (seg.budovaId) return 'Budova: ' + nazevBudovy(budovy, seg.budovaId);
    return '';
  }

  /** Zda se segment započítává do min/max na třídu a budovu (jen pedagogické úvazky, asistenti a školnice se ignorují). */
  function segmentPatriDoMinMaxPedagog(seg) {
    return seg.typUmisteni !== TYPY_UMISTENI.ASISTENTI && seg.typUmisteni !== TYPY_UMISTENI.SKOLNICE;
  }

  /**
   * Pro každou minutu v [odMin, doMin) spočítá počet osob v dané třídě (jen pedagogické segmenty); vrátí min a max (D10b).
   */
  function minMaxPocetOsobVTridVCase(prirazeni, den, tridaId, odMin, doMin) {
    var minCount = Infinity;
    var maxCount = 0;
    for (var m = odMin; m < doMin; m += 1) {
      var count = 0;
      for (var pi = 0; pi < (prirazeni || []).length; pi += 1) {
        var p = prirazeni[pi];
        if (p.den !== den) continue;
        for (var si = 0; si < (p.segmenty || []).length; si += 1) {
          var seg = p.segmenty[si];
          if (!segmentPatriDoMinMaxPedagog(seg)) continue;
          if (seg.tridaId !== tridaId) continue;
          var segOd = timeToMinuty(seg.od);
          var segDo = timeToMinuty(seg.do);
          if (segOd <= m && m < segDo) { count += 1; break; }
        }
      }
      if (count < minCount) minCount = count;
      if (count > maxCount) maxCount = count;
    }
    return { min: minCount === Infinity ? 0 : minCount, max: maxCount };
  }

  /**
   * Vrátí id budovy, ve které je třída tridaId, nebo null.
   */
  function tridaJeVBudove(budovy, tridaId) {
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
   * Pro každou minutu v [odMin, doMin) spočítá počet osob v dané budově (jen pedagogické segmenty); vrátí min a max (D10b).
   */
  function minMaxPocetOsobVBudoveVCase(prirazeni, den, budovaId, budovy, odMin, doMin) {
    var minCount = Infinity;
    var maxCount = 0;
    for (var m = odMin; m < doMin; m += 1) {
      var count = 0;
      for (var pi = 0; pi < (prirazeni || []).length; pi += 1) {
        var p = prirazeni[pi];
        if (p.den !== den) continue;
        for (var si = 0; si < (p.segmenty || []).length; si += 1) {
          var seg = p.segmenty[si];
          if (!segmentPatriDoMinMaxPedagog(seg)) continue;
          var inBudova = (seg.budovaId === budovaId) || (seg.tridaId && tridaJeVBudove(budovy, seg.tridaId) === budovaId);
          if (!inBudova) continue;
          var segOd = timeToMinuty(seg.od);
          var segDo = timeToMinuty(seg.do);
          if (segOd <= m && m < segDo) { count += 1; break; }
        }
      }
      if (count < minCount) minCount = count;
      if (count > maxCount) maxCount = count;
    }
    return { min: minCount === Infinity ? 0 : minCount, max: maxCount };
  }

  global.MSemenyValidaceNavrhu = {
    validujNavrh: validujNavrh,
    sumMinutyPerZamestnanec: sumMinutyPerZamestnanec,
    sumMinutyPerZamestnanecPoType: sumMinutyPerZamestnanecPoType
  };
})(typeof window !== 'undefined' ? window : this);
