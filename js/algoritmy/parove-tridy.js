/**
 * Algoritmus „Párové třídy“ – výpočet směn s dvojicemi na třídu a střídáním dopolední/odpolední.
 * Specifikace: ALGORITMUS-PAROVE-TRIDY-SPEC.md.
 * Fáze 1: Páry na třídu (7:45–12:00 a 10:00–16:00 s překryvem), střídání dnů.
 * Fáze 2: Ranní 7:00–7:45 a večerní 16:00–17:00 na budovu, střídání.
 * Fáze 3a: Doplnění chybějících směn zbývajícími učitelkami (ideálně jedna třída), min. délka směny z konfigurace.
 * Fáze 3: Doplnění vykrývacími (ranní/večerní). Fáze 4: Dočerpání úvazků (varování / protažení).
 * API: { id, nazev, vypocet(data) }.
 */
(function (global) {
  'use strict';

  var DOPOLEDNI_OD = '07:45';
  var DOPOLEDNI_DO = '12:00';
  var ODOPOLEDNI_OD = '10:00';
  var ODOPOLEDNI_DO = '16:00';
  var RANNI_EXT_OD = '07:00';
  var RANNI_EXT_DO = '07:45';
  var VECERNI_OD = '16:00';
  var VECERNI_DO = '17:00';

  var MIN_DOPOLEDNI = 255;   // 7:45–12:00
  var MIN_ODOPOLEDNI = 360;  // 10:00–16:00
  var MIN_RANNI_EXT = 45;
  var MIN_VECERNI = 60;
  var POTREBA_NA_TRIDU_TYDEN = 5 * 495; // 2475

  function timeToMinuty(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return 0;
    var parts = hhmm.split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }

  function minutyToHhmm(minuty) {
    var m = minuty % 60;
    var h = Math.floor(minuty / 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /** Je zaměstnanec dostupný v daný den v intervalu [odMin, doMin] (minuty od půlnoci)? */
  function isAvailable(zamestnanec, den, odMin, doMin) {
    var nedostupnost = zamestnanec.nedostupnost || [];
    for (var i = 0; i < nedostupnost.length; i++) {
      var n = nedostupnost[i];
      if (n.den !== den) continue;
      var nOd = timeToMinuty(n.od);
      var nDo = timeToMinuty(n.do);
      if (doMin <= nOd || odMin >= nDo) continue;
      return false;
    }
    return true;
  }

  function maZakazPrechodu(zamestnanec, pravidla) {
    var local = zamestnanec.prechodMeziBudovami;
    if (local === 'zakázat') return true;
    if (local === 'povolit') return false;
    return !!(pravidla && pravidla.zakazPrechodMeziBudovami);
  }

  /** Smí být zaměstnanec přiřazen do dané třídy/budovy (B1e)? */
  function canAssignToLocation(zamestnanec, tridaId, budovaId) {
    var pj = zamestnanec.prirazenoJen;
    if (!pj) return true;
    if (pj.indexOf('t:') === 0) return tridaId === pj.slice(2);
    if (pj.indexOf('b:') === 0) {
      var allowed = pj.slice(2);
      var resolved = tridaId ? budovaId : budovaId;
      return resolved === allowed;
    }
    return true;
  }

  function findBudovaForTrida(budovy, tridaId) {
    for (var i = 0; i < (budovy || []).length; i++) {
      var b = budovy[i];
      if (b.tridy) {
        for (var j = 0; j < b.tridy.length; j++) {
          if (b.tridy[j].id === tridaId) return b.id;
        }
      }
    }
    return null;
  }

  /** Vrátí pole id osob, které nesmí být s zamId ve stejné třídě. */
  function getNeDohromady(omezeni, zamId) {
    var out = [];
    for (var i = 0; i < (omezeni || []).length; i++) {
      var o = omezeni[i];
      if (o.osoba1Id === zamId) out.push(o.osoba2Id);
      else if (o.osoba2Id === zamId) out.push(o.osoba1Id);
    }
    return out;
  }

  /** Přidá segment do mapy přiřazení. Map: key "den|zamestnanecId" -> pole segmentů. */
  function addSegment(map, den, zamId, od, do_, tridaId, budovaId) {
    var key = den + '|' + zamId;
    if (!map[key]) map[key] = [];
    map[key].push({ od: od, do: do_, tridaId: tridaId || undefined, budovaId: budovaId || undefined });
  }

  /**
   * Pro danou třídu vrátí seznam kandidátů (zaměstnanců), kteří smí a mohou pracovat v této třídě.
   * Seřazeno: kmenové přiřazené k této třídě (sestupně úvazek), pak ostatní (sestupně úvazek).
   */
  function getCandidatesForTrida(tridaId, budovaId, zamestnanci, pravidla, omezeni, tridaBudovaMap) {
    var list = [];
    var neDohromadyByZam = {};
    for (var i = 0; i < zamestnanci.length; i++) {
      var z = zamestnanci[i];
      var uv = parseInt(z.uvazekMinutyTyden, 10) || 0;
      if (uv <= 0) continue;
      if (!canAssignToLocation(z, tridaId, budovaId)) continue;
      var forbidden = getNeDohromady(omezeni, z.id);
      neDohromadyByZam[z.id] = forbidden;
      list.push({
        zam: z,
        uvazek: uv,
        isKmenovaForThis: z.kmenovaVykryvaci === 'kmenová' && z.tridaId === tridaId,
        forbidden: forbidden
      });
    }
    list.sort(function (a, b) {
      if (a.isKmenovaForThis !== b.isKmenovaForThis) return a.isKmenovaForThis ? -1 : 1;
      return b.uvazek - a.uvazek;
    });
    return { list: list, neDohromadyByZam: neDohromadyByZam };
  }

  /** Vybere dvojici z kandidátů tak, aby součet úvazků >= POTREBA_NA_TRIDU_TYDEN a ne-dohromady jsou splněny. */
  function pickPair(candidatesList, neDohromadyByZam) {
    var list = candidatesList;
    for (var i = 0; i < list.length; i++) {
      for (var j = i + 1; j < list.length; j++) {
        var a = list[i];
        var b = list[j];
        if ((a.forbidden && a.forbidden.indexOf(b.zam.id) >= 0) || (b.forbidden && b.forbidden.indexOf(a.zam.id) >= 0)) continue;
        if (a.uvazek + b.uvazek >= POTREBA_NA_TRIDU_TYDEN) return [a.zam, b.zam];
      }
    }
    return null;
  }

  /** Překrývá se segment [seg.od, seg.do] s intervalem [odMin, doMin] (minuty od půlnoci)? */
  function segmentOverlaps(seg, odMin, doMin) {
    var segOd = timeToMinuty(seg.od);
    var segDo = timeToMinuty(seg.do);
    return !(segDo <= odMin || segOd >= doMin);
  }

  /** V daný den mají zaměstnanci alespoň jeden segment v dané třídě? Vrátí pole zamId. */
  function getZamInTridaOnDay(assignmentMap, den, tridaId) {
    var out = [];
    var prefix = den + '|';
    for (var key in assignmentMap) {
      if (!assignmentMap.hasOwnProperty(key) || key.indexOf(prefix) !== 0) continue;
      var segs = assignmentMap[key];
      for (var s = 0; s < segs.length; s++) {
        if (segs[s].tridaId === tridaId) {
          out.push(key.split('|')[1]);
          break;
        }
      }
    }
    return out;
  }

  /** Fáze 1: Páry na třídu – dopolední 7:45–12, odpolední 10–16, střídání dnů. Každá učitelka je ukotvená v jedné třídě na celý týden (nejvýše jedna dvojice/třída). */
  function phase1(assignmentMap, budovy, zamestnanci, pravidla, omezeni, outAssignedZamToTrida) {
    var tridaBudova = {};
    var d, t, b, i;
    for (b = 0; b < budovy.length; b++) {
      var bud = budovy[b];
      var tridy = bud.tridy || [];
      for (t = 0; t < tridy.length; t++) {
        tridaBudova[tridy[t].id] = bud.id;
      }
    }

    /** Učitelka již přiřazená k nějaké třídě v tomto týdnu – nemůže do jiné třídy. zamId -> tridaId */
    var assignedZamToTrida = {};
    /** Během fáze 1: součet již přiřazených minut za týden (aby nedošlo k přečerpání úvazku). */
    var phase1Assigned = {};

    for (b = 0; b < budovy.length; b++) {
      var budova = budovy[b];
      var tridy = budova.tridy || [];
      for (t = 0; t < tridy.length; t++) {
        var trida = tridy[t];
        var tridaId = trida.id;
        var budovaId = budova.id;
        var cand = getCandidatesForTrida(tridaId, budovaId, zamestnanci, pravidla, omezeni, tridaBudova);
        var listWithoutUsed = cand.list.filter(function (c) { return !assignedZamToTrida[c.zam.id]; });
        var pair = pickPair(listWithoutUsed, cand.neDohromadyByZam);
        if (!pair || pair.length < 2) continue;

        var zamA = pair[0];
        var zamB = pair[1];
        var uvazekA = parseInt(zamA.uvazekMinutyTyden, 10) || 0;
        var uvazekB = parseInt(zamB.uvazekMinutyTyden, 10) || 0;
        assignedZamToTrida[zamA.id] = tridaId;
        assignedZamToTrida[zamB.id] = tridaId;
        var dopOd = timeToMinuty(DOPOLEDNI_OD);
        var dopDo = timeToMinuty(DOPOLEDNI_DO);
        var odopOd = timeToMinuty(ODOPOLEDNI_OD);
        var odopDo = timeToMinuty(ODOPOLEDNI_DO);

        for (d = 1; d <= 5; d++) {
          var aDopOk = isAvailable(zamA, d, dopOd, dopDo);
          var aOdopOk = isAvailable(zamA, d, odopOd, odopDo);
          var bDopOk = isAvailable(zamB, d, dopOd, dopDo);
          var bOdopOk = isAvailable(zamB, d, odopOd, odopDo);

          var aDopoledni = (d % 2 === 1);
          if (!aDopoledni && !bDopOk) aDopoledni = true;
          if (aDopoledni && !aDopOk) aDopoledni = false;

          var asgA = phase1Assigned[zamA.id] || 0;
          var asgB = phase1Assigned[zamB.id] || 0;

          if (aDopoledni) {
            if (aDopOk && asgA + MIN_DOPOLEDNI <= uvazekA) {
              addSegment(assignmentMap, d, zamA.id, DOPOLEDNI_OD, DOPOLEDNI_DO, tridaId, budovaId);
              phase1Assigned[zamA.id] = asgA + MIN_DOPOLEDNI;
              asgA = phase1Assigned[zamA.id];
            }
            if (bOdopOk && asgB + MIN_ODOPOLEDNI <= uvazekB) {
              addSegment(assignmentMap, d, zamB.id, ODOPOLEDNI_OD, ODOPOLEDNI_DO, tridaId, budovaId);
              phase1Assigned[zamB.id] = (phase1Assigned[zamB.id] || 0) + MIN_ODOPOLEDNI;
              asgB = phase1Assigned[zamB.id];
            }
          } else {
            if (bDopOk && asgB + MIN_DOPOLEDNI <= uvazekB) {
              addSegment(assignmentMap, d, zamB.id, DOPOLEDNI_OD, DOPOLEDNI_DO, tridaId, budovaId);
              phase1Assigned[zamB.id] = (phase1Assigned[zamB.id] || 0) + MIN_DOPOLEDNI;
              asgB = phase1Assigned[zamB.id];
            }
            if (aOdopOk && asgA + MIN_ODOPOLEDNI <= uvazekA) {
              addSegment(assignmentMap, d, zamA.id, ODOPOLEDNI_OD, ODOPOLEDNI_DO, tridaId, budovaId);
              phase1Assigned[zamA.id] = (phase1Assigned[zamA.id] || 0) + MIN_ODOPOLEDNI;
            }
          }
        }
      }
    }
    if (outAssignedZamToTrida && typeof outAssignedZamToTrida === 'object') {
      for (var id in assignedZamToTrida) { if (assignedZamToTrida.hasOwnProperty(id)) outAssignedZamToTrida[id] = assignedZamToTrida[id]; }
    }
  }

  /** Vrátí seznam chybějících směn: pro každou třídu a den, kde chybí dopolední nebo odpolední pokrytí. */
  function buildGaps(assignmentMap, budovy) {
    var dopOd = timeToMinuty(DOPOLEDNI_OD);
    var dopDo = timeToMinuty(DOPOLEDNI_DO);
    var odopOd = timeToMinuty(ODOPOLEDNI_OD);
    var odopDo = timeToMinuty(ODOPOLEDNI_DO);
    var gaps = [];
    for (var b = 0; b < budovy.length; b++) {
      var budova = budovy[b];
      var tridy = budova.tridy || [];
      for (var t = 0; t < tridy.length; t++) {
        var tridaId = tridy[t].id;
        var budovaId = budova.id;
        for (var d = 1; d <= 5; d++) {
          var hasDop = false;
          var hasOdop = false;
          var prefix = d + '|';
          for (var key in assignmentMap) {
            if (!assignmentMap.hasOwnProperty(key) || key.indexOf(prefix) !== 0) continue;
            var segs = assignmentMap[key];
            for (var s = 0; s < segs.length; s++) {
              if (segs[s].tridaId !== tridaId) continue;
              if (segmentOverlaps(segs[s], dopOd, dopDo)) hasDop = true;
              if (segmentOverlaps(segs[s], odopOd, odopDo)) hasOdop = true;
            }
          }
          if (!hasDop) {
            gaps.push({ den: d, tridaId: tridaId, budovaId: budovaId, slot: 'dopoledni', od: DOPOLEDNI_OD, do: DOPOLEDNI_DO, odMin: dopOd, doMin: dopDo, lengthMin: dopDo - dopOd });
          }
          if (!hasOdop) {
            gaps.push({ den: d, tridaId: tridaId, budovaId: budovaId, slot: 'odpoledni', od: ODOPOLEDNI_OD, do: ODOPOLEDNI_DO, odMin: odopOd, doMin: odopDo, lengthMin: odopDo - odopOd });
          }
        }
      }
    }
    return gaps;
  }

  /** Spočítá přiřazené minuty za týden pro každého zaměstnance. */
  function sumAssignedMinutes(assignmentMap, zamestnanci) {
    var sum = {};
    for (var i = 0; i < zamestnanci.length; i++) sum[zamestnanci[i].id] = 0;
    for (var key in assignmentMap) {
      if (!assignmentMap.hasOwnProperty(key)) continue;
      var zamId = key.split('|')[1];
      if (!sum[zamId]) sum[zamId] = 0;
      var segs = assignmentMap[key];
      for (var s = 0; s < segs.length; s++) {
        var od = timeToMinuty(segs[s].od);
        var doM = timeToMinuty(segs[s].do);
        sum[zamId] += Math.max(0, doM - od);
      }
    }
    return sum;
  }

  /** Vrátí seznam zaměstnanců, kteří v daný den mají alespoň jeden segment v dané budově. */
  function getZamInBuildingOnDay(assignmentMap, den, budovaId, budovy) {
    var out = [];
    var prefix = den + '|';
    for (var key in assignmentMap) {
      if (!assignmentMap.hasOwnProperty(key) || key.indexOf(prefix) !== 0) continue;
      var zamId = key.split('|')[1];
      var segs = assignmentMap[key];
      for (var s = 0; s < segs.length; s++) {
        var segBudova = segs[s].budovaId || (budovy && segs[s].tridaId ? findBudovaForTrida(budovy, segs[s].tridaId) : null);
        if (segBudova === budovaId) {
          out.push(zamId);
          break;
        }
      }
    }
    return out;
  }

  /** Prodlouží segment končící v currentDo na newDo (na daný den a zaměstnance). Vrátí true pokud se našel a prodloužil. */
  function extendSegmentEnd(assignmentMap, den, zamId, currentDo, newDo, budovaId, budovy) {
    var key = den + '|' + zamId;
    var segs = assignmentMap[key];
    if (!segs) return false;
    for (var s = 0; s < segs.length; s++) {
      var seg = segs[s];
      if (seg.do !== currentDo) continue;
      var segBudova = seg.budovaId || (seg.tridaId && budovy ? findBudovaForTrida(budovy, seg.tridaId) : null);
      if (segBudova !== budovaId) continue;
      seg.do = newDo;
      return true;
    }
    return false;
  }

  /** Prodlouží segment začínající v currentOd na newOd (na daný den a zaměstnance). Vrátí true pokud se našel a prodloužil. */
  function extendSegmentStart(assignmentMap, den, zamId, currentOd, newOd, budovaId, budovy) {
    var key = den + '|' + zamId;
    var segs = assignmentMap[key];
    if (!segs) return false;
    for (var s = 0; s < segs.length; s++) {
      var seg = segs[s];
      if (seg.od !== currentOd) continue;
      var segBudova = seg.budovaId || (seg.tridaId && budovy ? findBudovaForTrida(budovy, seg.tridaId) : null);
      if (segBudova !== budovaId) continue;
      seg.od = newOd;
      return true;
    }
    return false;
  }

  /** Vrátí zaměstnance v budově v daný den, kteří mají segment končící v endDo (např. 16:00). */
  function getZamWithSegmentEndInBuilding(assignmentMap, den, budovaId, endDo, budovy) {
    var out = [];
    var prefix = den + '|';
    for (var key in assignmentMap) {
      if (!assignmentMap.hasOwnProperty(key) || key.indexOf(prefix) !== 0) continue;
      var segs = assignmentMap[key];
      for (var s = 0; s < segs.length; s++) {
        if (segs[s].do !== endDo) continue;
        var segBudova = segs[s].budovaId || (segs[s].tridaId && budovy ? findBudovaForTrida(budovy, segs[s].tridaId) : null);
        if (segBudova === budovaId) {
          out.push(key.split('|')[1]);
          break;
        }
      }
    }
    return out;
  }

  /** Vrátí zaměstnance v budově v daný den, kteří mají segment začínající v startOd (např. 07:45). */
  function getZamWithSegmentStartInBuilding(assignmentMap, den, budovaId, startOd, budovy) {
    var out = [];
    var prefix = den + '|';
    for (var key in assignmentMap) {
      if (!assignmentMap.hasOwnProperty(key) || key.indexOf(prefix) !== 0) continue;
      var segs = assignmentMap[key];
      for (var s = 0; s < segs.length; s++) {
        if (segs[s].od !== startOd) continue;
        var segBudova = segs[s].budovaId || (segs[s].tridaId && budovy ? findBudovaForTrida(budovy, segs[s].tridaId) : null);
        if (segBudova === budovaId) {
          out.push(key.split('|')[1]);
          break;
        }
      }
    }
    return out;
  }

  /** Fáze 2: Prodloužení směn – primárně prodloužit dopolední (7:45→7:00) a odpolední (16:00→17:00) u někoho, kdo už v budově ten den pracuje. Žádné nové bloky „Budova (společně)“. */
  function phase2(assignmentMap, budovy, zamestnanci, pravidla, assignedSum) {
    var ranniOd = timeToMinuty(RANNI_EXT_OD);
    var ranniDo = timeToMinuty(RANNI_EXT_DO);
    var vecOd = timeToMinuty(VECERNI_OD);
    var vecDo = timeToMinuty(VECERNI_DO);

    for (var b = 0; b < budovy.length; b++) {
      var budovaId = budovy[b].id;
      var ranniIndex = 0;
      var vecerniIndex = 0;

      for (var d = 1; d <= 5; d++) {
        var canRanni = getZamWithSegmentStartInBuilding(assignmentMap, d, budovaId, DOPOLEDNI_OD, budovy);
        var canVecerni = getZamWithSegmentEndInBuilding(assignmentMap, d, budovaId, ODOPOLEDNI_DO, budovy);

        canRanni = canRanni.filter(function (zamId) {
          var z = zamestnanci.filter(function (x) { return x.id === zamId; })[0];
          return z && (parseInt(z.uvazekMinutyTyden, 10) || 0) - (assignedSum[zamId] || 0) >= MIN_RANNI_EXT && isAvailable(z, d, ranniOd, ranniDo);
        });
        canVecerni = canVecerni.filter(function (zamId) {
          var z = zamestnanci.filter(function (x) { return x.id === zamId; })[0];
          return z && (parseInt(z.uvazekMinutyTyden, 10) || 0) - (assignedSum[zamId] || 0) >= MIN_VECERNI && isAvailable(z, d, vecOd, vecDo);
        });

        var pickRanni = canRanni.length > 0 ? canRanni[ranniIndex % canRanni.length] : null;
        var pickVec = canVecerni.length > 0 ? canVecerni[vecerniIndex % canVecerni.length] : null;
        if (pickRanni === pickVec && canVecerni.length > 1) pickVec = canVecerni[(vecerniIndex + 1) % canVecerni.length];
        if (pickRanni && pickRanni === pickVec) pickVec = null;

        if (pickRanni) {
          if (extendSegmentStart(assignmentMap, d, pickRanni, DOPOLEDNI_OD, RANNI_EXT_OD, budovaId, budovy)) {
            assignedSum[pickRanni] = (assignedSum[pickRanni] || 0) + MIN_RANNI_EXT;
            ranniIndex++;
          }
        }
        if (pickVec) {
          if (extendSegmentEnd(assignmentMap, d, pickVec, ODOPOLEDNI_DO, VECERNI_DO, budovaId, budovy)) {
            assignedSum[pickVec] = (assignedSum[pickVec] || 0) + MIN_VECERNI;
            vecerniIndex++;
          }
        }
      }
    }
  }

  /** Fáze 3a: Doplnění chybějících směn (dopolední/odpolední) zbývajícími učitelkami, které zatím nejsou přiřazené. Preferuje přiřazení do jedné třídy. Respektuje pravidla.minDelkaBlokuMinuty. */
  function phase3a(assignmentMap, budovy, zamestnanci, pravidla, omezeni, assignedZamToTrida, assignedSum) {
    var minDelka = (pravidla.minDelkaBlokuMinuty != null && pravidla.minDelkaBlokuMinuty !== '')
      ? parseInt(pravidla.minDelkaBlokuMinuty, 10) : 120;
    if (isNaN(minDelka) || minDelka < 0) minDelka = 120;

    var unassigned = zamestnanci.filter(function (z) { return !assignedZamToTrida[z.id]; });
    if (unassigned.length === 0) return;

    var gaps = buildGaps(assignmentMap, budovy).filter(function (g) { return g.lengthMin >= minDelka; });
    gaps.sort(function (a, b) { return b.den - a.den; }); // nejdřív konec týdne (pátek…)

    var tridaByDoplnujiciZam = {};

    for (var gi = 0; gi < gaps.length; gi++) {
      var gap = gaps[gi];
      var alreadyInTrida = getZamInTridaOnDay(assignmentMap, gap.den, gap.tridaId);
      var neDohromadySet = {};
      for (var ai = 0; ai < alreadyInTrida.length; ai++) {
        var neIds = getNeDohromady(omezeni, alreadyInTrida[ai]);
        for (var ni = 0; ni < neIds.length; ni++) neDohromadySet[neIds[ni]] = true;
      }

      var candidates = [];
      for (var u = 0; u < unassigned.length; u++) {
        var z = unassigned[u];
        if (neDohromadySet[z.id]) continue;
        if (!canAssignToLocation(z, gap.tridaId, gap.budovaId)) continue;
        if (!isAvailable(z, gap.den, gap.odMin, gap.doMin)) continue;
        var rem = (parseInt(z.uvazekMinutyTyden, 10) || 0) - (assignedSum[z.id] || 0);
        if (gap.slot === 'dopoledni') {
          if (rem < gap.lengthMin) continue;
        } else {
          if (rem < minDelka) continue;
        }
        var alreadyInThisClass = tridaByDoplnujiciZam[z.id] === gap.tridaId;
        candidates.push({ z: z, alreadyInThisClass: alreadyInThisClass, rem: rem });
      }

      candidates.sort(function (a, b) {
        if (a.alreadyInThisClass && !b.alreadyInThisClass) return -1;
        if (!a.alreadyInThisClass && b.alreadyInThisClass) return 1;
        return 0;
      });

      if (candidates.length === 0) continue;
      var chosen = candidates[0];
      var actualOd = gap.od;
      var actualDo = gap.do;
      var actualLength = gap.lengthMin;
      if (gap.slot === 'odpoledni' && chosen.rem >= minDelka && chosen.rem < gap.lengthMin) {
        actualLength = chosen.rem;
        actualDo = minutyToHhmm(gap.odMin + chosen.rem);
      }
      addSegment(assignmentMap, gap.den, chosen.z.id, actualOd, actualDo, gap.tridaId, gap.budovaId);
      assignedSum[chosen.z.id] = (assignedSum[chosen.z.id] || 0) + actualLength;
      tridaByDoplnujiciZam[chosen.z.id] = gap.tridaId;
    }
  }

  /** V daný den má zaměstnanec již segment v nějaké budově? Pokud ano, vrátí její id (pro D5). */
  function getBudovaZamNaDen(assignmentMap, den, zamId, budovy) {
    var key = den + '|' + zamId;
    var segs = assignmentMap[key];
    if (!segs || segs.length === 0) return null;
    var first = segs[0];
    if (first.budovaId) return first.budovaId;
    if (first.tridaId && budovy) return findBudovaForTrida(budovy, first.tridaId);
    return null;
  }

  /** Fáze 3: Doplnění 7:00–7:45 a 16:00–17:00 vykrývacími jen tam, kde po fázi 2 stále chybí. Vždy přiřadit do konkrétní třídy (ne „Budova společně“). */
  function phase3(assignmentMap, budovy, zamestnanci, pravidla, assignedSum) {
    var vykryvaci = zamestnanci.filter(function (z) {
      return z.kmenovaVykryvaci === 'vykrývací' && (parseInt(z.uvazekMinutyTyden, 10) || 0) > 0;
    });
    if (vykryvaci.length === 0) return;

    var ranniOd = timeToMinuty(RANNI_EXT_OD);
    var ranniDo = timeToMinuty(RANNI_EXT_DO);
    var vecOd = timeToMinuty(VECERNI_OD);
    var vecDo = timeToMinuty(VECERNI_DO);

    for (var b = 0; b < budovy.length; b++) {
      var budovaId = budovy[b].id;
      var tridy = budovy[b].tridy || [];
      if (tridy.length === 0) continue;
      var tridaIdFallback = tridy[0].id;

      for (var d = 1; d <= 5; d++) {
        var hasRanni = false;
        var hasVec = false;
        var prefix = d + '|';
        for (var key in assignmentMap) {
          if (!assignmentMap.hasOwnProperty(key) || key.indexOf(prefix) !== 0) continue;
          var segs = assignmentMap[key];
          for (var s = 0; s < segs.length; s++) {
            var segBudova = segs[s].budovaId || (segs[s].tridaId ? findBudovaForTrida(budovy, segs[s].tridaId) : null);
            if (segBudova !== budovaId) continue;
            if (segs[s].od === RANNI_EXT_OD || timeToMinuty(segs[s].od) <= ranniOd) hasRanni = true;
            if (segs[s].do === VECERNI_DO || timeToMinuty(segs[s].do) >= vecDo) hasVec = true;
          }
        }

        for (var v = 0; v < vykryvaci.length; v++) {
          var z = vykryvaci[v];
          if (!canAssignToLocation(z, tridaIdFallback, budovaId)) continue;
          var budovaNaDen = getBudovaZamNaDen(assignmentMap, d, z.id, budovy);
          if (budovaNaDen !== null && budovaNaDen !== budovaId && maZakazPrechodu(z, pravidla)) continue;
          var rem = (parseInt(z.uvazekMinutyTyden, 10) || 0) - (assignedSum[z.id] || 0);
          if (!hasRanni && rem >= MIN_RANNI_EXT && isAvailable(z, d, ranniOd, ranniDo)) {
            addSegment(assignmentMap, d, z.id, RANNI_EXT_OD, RANNI_EXT_DO, tridaIdFallback, budovaId);
            assignedSum[z.id] = (assignedSum[z.id] || 0) + MIN_RANNI_EXT;
            hasRanni = true;
          }
          if (!hasVec && rem >= MIN_VECERNI && isAvailable(z, d, vecOd, vecDo)) {
            addSegment(assignmentMap, d, z.id, VECERNI_OD, VECERNI_DO, tridaIdFallback, budovaId);
            assignedSum[z.id] = (assignedSum[z.id] || 0) + MIN_VECERNI;
            hasVec = true;
          }
        }
      }
    }
  }

  /** Převede mapu na pole prirazeni (den, zamestnanecId, segmenty). */
  function buildPrirazeni(assignmentMap) {
    var byDenZam = {};
    for (var key in assignmentMap) {
      if (!assignmentMap.hasOwnProperty(key)) continue;
      var parts = key.split('|');
      var den = parseInt(parts[0], 10);
      var zamId = parts[1];
      if (!byDenZam[key]) byDenZam[key] = { den: den, zamestnanecId: zamId, segmenty: assignmentMap[key] };
    }
    var out = [];
    for (var k in byDenZam) {
      if (byDenZam.hasOwnProperty(k)) out.push(byDenZam[k]);
    }
    out.sort(function (a, b) {
      if (a.den !== b.den) return a.den - b.den;
      return (a.zamestnanecId || '').localeCompare(b.zamestnanecId || '');
    });
    return out;
  }

  function vypocet(data) {
    var zamestnanci = (data.zamestnanci || []).filter(function (z) {
      return z && z.id && (z.uvazekMinutyTyden == null || parseInt(z.uvazekMinutyTyden, 10) > 0);
    });
    var budovy = data.budovy || [];
    var pravidla = data.pravidla || {};
    var omezeni = data.omezeniNeDohromady || [];

    if (zamestnanci.length === 0) {
      return { ok: false, chyba: 'Přidejte alespoň jednoho zaměstnance s úvazkem.' };
    }
    if (budovy.length === 0) {
      return { ok: false, chyba: 'Přidejte alespoň jednu budovu.' };
    }
    var hasTridy = false;
    for (var i = 0; i < budovy.length; i++) {
      if (budovy[i].tridy && budovy[i].tridy.length > 0) { hasTridy = true; break; }
    }
    if (!hasTridy) {
      return { ok: false, chyba: 'Algoritmus „Párové třídy“ vyžaduje alespoň jednu třídu v budovách.' };
    }

    var assignmentMap = {};
    var assignedZamToTrida = {};
    phase1(assignmentMap, budovy, zamestnanci, pravidla, omezeni, assignedZamToTrida);

    var assignedSum = sumAssignedMinutes(assignmentMap, zamestnanci);
    phase2(assignmentMap, budovy, zamestnanci, pravidla, assignedSum);
    assignedSum = sumAssignedMinutes(assignmentMap, zamestnanci);
    phase3a(assignmentMap, budovy, zamestnanci, pravidla, omezeni, assignedZamToTrida, assignedSum);
    assignedSum = sumAssignedMinutes(assignmentMap, zamestnanci);
    phase3(assignmentMap, budovy, zamestnanci, pravidla, assignedSum);

    var prirazeni = buildPrirazeni(assignmentMap);
    var varovani = [];
    assignedSum = sumAssignedMinutes(assignmentMap, zamestnanci);
    for (var z = 0; z < zamestnanci.length; z++) {
      var zam = zamestnanci[z];
      var uv = parseInt(zam.uvazekMinutyTyden, 10) || 0;
      var asg = assignedSum[zam.id] || 0;
      if (asg < uv) varovani.push('Nevyčerpaný úvazek: ' + (zam.jmeno || zam.id) + ' (chybí ' + (uv - asg) + ' min).');
      if (asg > uv) varovani.push('Přečerpaný úvazek: ' + (zam.jmeno || zam.id) + ' (+' + (asg - uv) + ' min).');
    }

    if (prirazeni.length === 0) {
      return { ok: false, chyba: 'Nepodařilo se vytvořit žádné přiřazení. Zkontrolujte konfiguraci (kmenové přiřazené k třídám, úvazky).' };
    }

    return {
      ok: true,
      prirazeni: prirazeni,
      varovani: varovani.length > 0 ? varovani : undefined
    };
  }

  global.MSemenyAlgoritmusParoveTridy = {
    id: 'parove-tridy',
    nazev: 'Párové třídy (7:45–12 / 10–16)',
    vypocet: vypocet
  };
})(typeof window !== 'undefined' ? window : this);
