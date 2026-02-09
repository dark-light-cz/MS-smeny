/**
 * Výpočet návrhu směn (přepracovaná verze).
 * Plánuje souvislé směny zaměstnanců a přiřazuje je na místa (třídy/budovy).
 * Sloty (minMaxSloty) jsou kontrolní pravidla (ne přímá přiřazení):
 *   „v každém okamžiku daného úseku musí být splněn min. počet osob".
 * Zaměstnanec pracuje v rámci dne jeden souvislý blok bez mezer.
 */
(function (global) {
  'use strict';

  var STEP = 15; // granularita posunu začátku směny (minuty)

  /* === Utility funkce === */

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

  /** Slot platí pro daný den (1–5). Prázdné dny = všechny pracovní dny. */
  function slotPlatnyProDen(slot, den) {
    var dny = slot.dny;
    if (!Array.isArray(dny) || dny.length === 0) return true;
    return dny.indexOf(den) >= 0;
  }

  /** Délka slotu v minutách (legacy helper). */
  function slotDurationMinuty(slot) {
    var od = timeToMinuty(slot.od);
    var doM = timeToMinuty(slot.do);
    return Math.max(0, doM - od);
  }

  /** Vytvoří pole délky n naplněné hodnotou val. */
  function makeArray(n, val) {
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(val);
    return arr;
  }

  /* === Dostupnost zaměstnanců (nedostupnost B1d) === */

  /**
   * Sestaví masku dostupnosti zaměstnance pro daný den.
   * Vrací pole boolean délky dayLen (true = zaměstnanec je dostupný v dané minutě).
   * @param {Object} zamestnanec - záznam zaměstnance (s polem nedostupnost)
   * @param {number} den - den v týdnu (1=Po … 5=Pá)
   * @param {number} rangeStart - začátek pracovního dne v minutách (absolutně)
   * @param {number} dayLen - délka pracovního dne v minutách
   * @returns {boolean[]}
   */
  function buildAvailMask(zamestnanec, den, rangeStart, dayLen) {
    var mask = makeArray(dayLen, true);
    var nedostupnost = zamestnanec.nedostupnost || [];
    for (var i = 0; i < nedostupnost.length; i++) {
      var n = nedostupnost[i];
      if (n.den !== den) continue;
      var od = Math.max(0, timeToMinuty(n.od) - rangeStart);
      var doM = Math.min(dayLen, timeToMinuty(n.do) - rangeStart);
      for (var m = od; m < doM; m++) {
        mask[m] = false;
      }
    }
    return mask;
  }

  /**
   * Najde délku nejdelšího souvislého bloku true v masce.
   * Slouží ke zjištění, jak dlouhou směnu může zaměstnanec v daný den mít.
   * @param {boolean[]} mask
   * @returns {number} délka nejdelšího bloku v minutách
   */
  function longestAvailBlock(mask) {
    var max = 0, current = 0;
    for (var i = 0; i < mask.length; i++) {
      if (mask[i]) {
        current++;
        if (current > max) max = current;
      } else {
        current = 0;
      }
    }
    return max;
  }

  /* === Fáze 0: Otevírací doba === */

  /** Zjistí rozsah otevírací doby (min od, max do) ze všech budov. */
  function getOpeningRange(budovy) {
    var start = 24 * 60, end = 0;
    for (var i = 0; i < (budovy || []).length; i++) {
      var b = budovy[i];
      if (b.oteviraciDoba) {
        var od = timeToMinuty(b.oteviraciDoba.od);
        var doM = timeToMinuty(b.oteviraciDoba.do);
        if (od < start) start = od;
        if (doM > end) end = doM;
      }
    }
    if (start >= end) { start = 7 * 60; end = 17 * 60; }
    return { start: start, end: end };
  }

  /* === Fáze 1: Požadavky na obsazení (demand) === */

  /**
   * Vytvoří per-minute demand pole pro daný den.
   * Pro každou budovu a třídu: kolik osob tam musí být v každé minutě.
   */
  function buildDemand(den, sloty, budovy, pravidla) {
    var range = getOpeningRange(budovy);
    var dayLen = range.end - range.start;

    // Init demand arrays (index = minuta relativně k range.start)
    var budovaDemand = {}; // budovaId → [dayLen]
    var tridaDemand = {};  // tridaId → [dayLen]
    var tridaBudova = {};  // tridaId → budovaId
    var i, j, m;

    for (i = 0; i < budovy.length; i++) {
      budovaDemand[budovy[i].id] = makeArray(dayLen, 0);
      var tridy = budovy[i].tridy || [];
      for (j = 0; j < tridy.length; j++) {
        tridaDemand[tridy[j].id] = makeArray(dayLen, 0);
        tridaBudova[tridy[j].id] = budovy[i].id;
      }
    }

    // Init max arrays (index = minuta relativně k range.start)
    var budovaMax = {}; // budovaId → [dayLen]
    var tridaMax = {};  // tridaId → [dayLen]
    for (i = 0; i < budovy.length; i++) {
      budovaMax[budovy[i].id] = makeArray(dayLen, null);
      var tridy = budovy[i].tridy || [];
      for (j = 0; j < tridy.length; j++) {
        tridaMax[tridy[j].id] = makeArray(dayLen, null);
      }
    }

    // Aplikovat slot requirements
    for (i = 0; i < sloty.length; i++) {
      var slot = sloty[i];
      if (!slotPlatnyProDen(slot, den)) continue;
      var od = Math.max(0, timeToMinuty(slot.od) - range.start);
      var doM = Math.min(dayLen, timeToMinuty(slot.do) - range.start);
      var minB = parseInt(slot.minNaBudovu, 10) || 0;
      var minT = parseInt(slot.minNaTridu, 10) || 0;
      var maxB = (slot.maxNaBudovu != null && slot.maxNaBudovu !== '') ? parseInt(slot.maxNaBudovu, 10) : null;
      var maxT = (slot.maxNaTridu != null && slot.maxNaTridu !== '') ? parseInt(slot.maxNaTridu, 10) : null;

      for (m = od; m < doM; m++) {
        if (minB > 0) {
          for (j = 0; j < budovy.length; j++) {
            var bId = budovy[j].id;
            if (budovaDemand[bId][m] < minB) budovaDemand[bId][m] = minB;
          }
        }
        if (minT > 0) {
          for (var tId in tridaDemand) {
            if (tridaDemand.hasOwnProperty(tId)) {
              if (tridaDemand[tId][m] < minT) tridaDemand[tId][m] = minT;
            }
          }
        }
        // Nastavit maximální limity (nejpřísnější limit platí)
        if (maxB !== null) {
          for (j = 0; j < budovy.length; j++) {
            var bId2 = budovy[j].id;
            if (budovaMax[bId2][m] === null || budovaMax[bId2][m] > maxB) {
              budovaMax[bId2][m] = maxB;
            }
          }
        }
        if (maxT !== null) {
          for (var tId2 in tridaDemand) {
            if (tridaDemand.hasOwnProperty(tId2)) {
              if (tridaMax[tId2][m] === null || tridaMax[tId2][m] > maxT) {
                tridaMax[tId2][m] = maxT;
              }
            }
          }
        }
      }
    }

    // Překryv: min 2 na třídu po stanovenou dobu (od 9:00)
    var prekryvMin = parseInt((pravidla && pravidla.minimalniPrekryvMinuty) || 0, 10);
    if (prekryvMin > 0) {
      var overlapOd = Math.max(0, 9 * 60 - range.start);
      var overlapDo = Math.min(dayLen, 9 * 60 + prekryvMin - range.start);
      for (var tId2 in tridaDemand) {
        if (tridaDemand.hasOwnProperty(tId2)) {
          for (m = overlapOd; m < overlapDo; m++) {
            if (tridaDemand[tId2][m] < 2) tridaDemand[tId2][m] = 2;
          }
        }
      }
    }

    return {
      range: range,
      dayLen: dayLen,
      budovaDemand: budovaDemand,
      tridaDemand: tridaDemand,
      tridaBudova: tridaBudova,
      budovaMax: budovaMax,
      tridaMax: tridaMax
    };
  }

  /**
   * Spočítá celkovou křivku poptávky (kolik lidí celkem potřeba v každé minutě).
   * Osoba ve třídě pokrývá i požadavek na budovu.
   */
  function totalDemandCurve(demandInfo, budovy) {
    var dayLen = demandInfo.dayLen;
    var curve = makeArray(dayLen, 0);
    var m, i, j;

    for (m = 0; m < dayLen; m++) {
      var total = 0;
      for (i = 0; i < budovy.length; i++) {
        var b = budovy[i];
        var bDem = demandInfo.budovaDemand[b.id][m] || 0;
        var classSum = 0;
        var tridy = b.tridy || [];
        for (j = 0; j < tridy.length; j++) {
          var td = demandInfo.tridaDemand[tridy[j].id];
          if (td) classSum += td[m];
        }
        // Osoby ve třídách pokrývají i budovu → efektivní potřeba = max(budova, součet tříd)
        total += Math.max(bDem, classSum);
      }
      curve[m] = total;
    }
    return curve;
  }

  /* === Fáze 2: Umístění směn (kdy pracují) === */

  /**
   * Greedy: seřadí zaměstnance od nejdelší směny, každému přiřadí optimální začátek
   * tak, aby co nejlépe pokryl zbývající poptávku.
   * @param {Array} empDaily - zaměstnanci s dailyMin
   * @param {number[]} curve - křivka poptávky
   * @param {number} dayLen - délka dne v minutách
   * @param {Object} [availMasks] - zamestnanecId → boolean[] maska dostupnosti (B1d)
   * @param {Object} [stridaniOpt] - D6: { preferredType: { zamId: 'dopoledni'|'odpoledni' }, boundaryRelative: number }
   */
  function placeShifts(empDaily, curve, dayLen, availMasks, stridaniOpt) {
    var sorted = empDaily.slice().sort(function (a, b) {
      return b.dailyMin - a.dailyMin;
    });

    var coverage = makeArray(dayLen, 0);
    var shifts = [];
    var maxCurve = 0;
    for (var mc = 0; mc < curve.length; mc++) {
      if (curve[mc] > maxCurve) maxCurve = curve[mc];
    }
    var peakStart = -1;
    var peakEnd = -1;
    if (maxCurve > 0) {
      for (var ps = 0; ps < curve.length; ps++) {
        if (curve[ps] >= maxCurve) { peakStart = ps; break; }
      }
      for (var pe = curve.length - 1; pe >= 0; pe--) {
        if (curve[pe] >= maxCurve) { peakEnd = pe + 1; break; }
      }
    }

    for (var ei = 0; ei < sorted.length; ei++) {
      var z = sorted[ei];
      var dm = z.dailyMin;
      if (dm <= 0) continue;
      if (dm > dayLen) dm = dayLen;

      var mask = (availMasks && availMasks[z.id]) ? availMasks[z.id] : null;

      var bestStart = -1;
      var bestScore = -Infinity;

      var stepStart = 0;
      var stepEnd = dayLen - dm;
      var usePeakOnly = false;
      if (maxCurve > 0 && peakStart >= 0 && dm <= 180) {
        var overlapStart = Math.max(0, peakStart - dm + 1);
        var overlapEnd = Math.min(dayLen - dm, peakEnd - 1);
        if (overlapEnd >= overlapStart) {
          stepStart = overlapStart;
          stepEnd = overlapEnd;
          usePeakOnly = true;
        }
      }

      // Zkusit pozice s krokem STEP (nejdřív případně jen špička pro krátké směny)
      for (var s = stepStart; s <= stepEnd; s += STEP) {
        // Kontrola dostupnosti: směna nesmí zasahovat do nedostupných minut
        if (mask) {
          var avail = true;
          for (var cm = s; cm < s + dm; cm++) {
            if (!mask[cm]) { avail = false; break; }
          }
          if (!avail) continue;
        }

        var score = 0;
        for (var m = s; m < s + dm; m++) {
          var residual = curve[m] - coverage[m];
          score += (residual > 0) ? residual : -1;
          if (residual > 0 && maxCurve > 0 && curve[m] >= maxCurve) score += 50;
        }
        // D6 preferenční: bonus za souhlas s preferovaným typem směny
        if (stridaniOpt && stridaniOpt.preferredType && stridaniOpt.preferredType[z.id] && stridaniOpt.boundaryRelative != null) {
          var isDopoledni = s < stridaniOpt.boundaryRelative;
          if ((stridaniOpt.preferredType[z.id] === 'dopoledni' && isDopoledni) ||
              (stridaniOpt.preferredType[z.id] === 'odpoledni' && !isDopoledni)) {
            score += 0.5;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestStart = s;
        }
      }

      if (bestStart < 0 && usePeakOnly) {
        for (var s2 = 0; s2 <= dayLen - dm; s2 += STEP) {
          if (mask) {
            var avail2 = true;
            for (var cm2 = s2; cm2 < s2 + dm; cm2++) {
              if (!mask[cm2]) { avail2 = false; break; }
            }
            if (!avail2) continue;
          }
          var score3 = 0;
          for (var m3 = s2; m3 < s2 + dm; m3++) {
            var res3 = curve[m3] - coverage[m3];
            score3 += (res3 > 0) ? res3 : -1;
            if (res3 > 0 && maxCurve > 0 && curve[m3] >= maxCurve) score3 += 50;
          }
          if (stridaniOpt && stridaniOpt.preferredType && stridaniOpt.preferredType[z.id] && stridaniOpt.boundaryRelative != null) {
            var isDop = s2 < stridaniOpt.boundaryRelative;
            if ((stridaniOpt.preferredType[z.id] === 'dopoledni' && isDop) || (stridaniOpt.preferredType[z.id] === 'odpoledni' && !isDop)) score3 += 0.5;
          }
          if (score3 > bestScore) { bestScore = score3; bestStart = s2; }
        }
      }

      // Zkusit i pozici zarovnanou na konec dne
      var lastStart = dayLen - dm;
      if (lastStart >= 0 && lastStart % STEP !== 0) {
        var validLast = true;
        if (mask) {
          for (var cm2 = lastStart; cm2 < lastStart + dm; cm2++) {
            if (!mask[cm2]) { validLast = false; break; }
          }
        }
        if (validLast) {
          var score2 = 0;
          for (var m2 = lastStart; m2 < lastStart + dm; m2++) {
            var r2 = curve[m2] - coverage[m2];
            score2 += (r2 > 0) ? r2 : -1;
            if (r2 > 0 && maxCurve > 0 && curve[m2] >= maxCurve) score2 += 50;
          }
          if (stridaniOpt && stridaniOpt.preferredType && stridaniOpt.preferredType[z.id] && stridaniOpt.boundaryRelative != null) {
            var isDopoledniLast = lastStart < stridaniOpt.boundaryRelative;
            if ((stridaniOpt.preferredType[z.id] === 'dopoledni' && isDopoledniLast) ||
                (stridaniOpt.preferredType[z.id] === 'odpoledni' && !isDopoledniLast)) {
              score2 += 0.5;
            }
          }
          if (score2 > bestScore) {
            bestStart = lastStart;
          }
        }
      }

      // Pokud nebylo nalezeno žádné platné umístění (plně nedostupný), přeskočit
      if (bestStart < 0) continue;

      // Umístit směnu
      for (var m3 = bestStart; m3 < bestStart + dm; m3++) {
        coverage[m3] += 1;
      }
      shifts.push({ zamestnanecId: z.id, start: bestStart, end: bestStart + dm });
    }

    // Oprava: pokud v špičce chybí pokrytí, přesunout krátkou směnu z oblasti s přebytkem do špičky
    if (maxCurve > 0 && peakStart >= 0 && peakEnd > peakStart) {
      var minPeakCov = Infinity;
      for (var pc = peakStart; pc < peakEnd; pc++) {
        if (coverage[pc] < minPeakCov) minPeakCov = coverage[pc];
      }
      while (minPeakCov < maxCurve) {
        var moved = false;
        for (var ri = 0; ri < shifts.length && !moved; ri++) {
          var sh = shifts[ri];
          var dmR = sh.end - sh.start;
          if (dmR > 120) continue;
          if (sh.start < peakEnd && sh.end > peakStart) continue;
          var maskR = (availMasks && availMasks[sh.zamestnanecId]) ? availMasks[sh.zamestnanecId] : null;
          var newStart = -1;
          for (var ns = peakStart; ns <= peakEnd - dmR; ns++) {
            var ok = true;
            if (maskR) {
              for (var nm = ns; nm < ns + dmR; nm++) { if (!maskR[nm]) { ok = false; break; } }
            }
            if (ok) { newStart = ns; break; }
          }
          if (newStart < 0) continue;
          var hasSlack = true;
          for (var sm = sh.start; sm < sh.end; sm++) {
            if (coverage[sm] - 1 < curve[sm]) { hasSlack = false; break; }
          }
          if (!hasSlack) continue;
          for (var m = sh.start; m < sh.end; m++) coverage[m]--;
          for (var m = newStart; m < newStart + dmR; m++) coverage[m]++;
          sh.start = newStart;
          sh.end = newStart + dmR;
          moved = true;
        }
        if (!moved) break;
        minPeakCov = Infinity;
        for (var pc2 = peakStart; pc2 < peakEnd; pc2++) {
          if (coverage[pc2] < minPeakCov) minPeakCov = coverage[pc2];
        }
      }
    }

    return { shifts: shifts, coverage: coverage };
  }

  /* === D6: Střídání dopoledne/odpoledne === */

  /**
   * Zjistí typ směny z prvního segmentu (dopolední = začátek před hranicí, odpolední = na/po hranici).
   * @param {Array<{od: string}>} segmenty - segmenty v HH:mm
   * @param {number} hraniceMinuty - hranice v minutách od půlnoci (např. 720 = 12:00)
   * @returns {'dopoledni'|'odpoledni'|null}
   */
  function getShiftTypeFromSegmenty(segmenty, hraniceMinuty) {
    if (!segmenty || segmenty.length === 0) return null;
    var startMin = timeToMinuty(segmenty[0].od);
    return startMin < hraniceMinuty ? 'dopoledni' : 'odpoledni';
  }

  /**
   * Ověří pravidlo střídání (tvrdý režim): žádný zaměstnanec nesmí mít každý den stejný typ směny.
   * @param {Array} prirazeni - výsledná přiřazení { den, zamestnanecId, segmenty }
   * @param {number} hraniceMinuty
   * @returns {{ ok: boolean, chyba?: string }}
   */
  function validujStridaniTvrdy(prirazeni, hraniceMinuty) {
    var typesPerZam = {}; // zamId → { dopoledni: count, odpoledni: count }
    for (var i = 0; i < prirazeni.length; i++) {
      var p = prirazeni[i];
      var t = getShiftTypeFromSegmenty(p.segmenty, hraniceMinuty);
      if (t == null) continue;
      if (!typesPerZam[p.zamestnanecId]) typesPerZam[p.zamestnanecId] = { dopoledni: 0, odpoledni: 0 };
      typesPerZam[p.zamestnanecId][t]++;
    }
    for (var zId in typesPerZam) {
      if (!typesPerZam.hasOwnProperty(zId)) continue;
      var c = typesPerZam[zId];
      var total = c.dopoledni + c.odpoledni;
      if (total >= 2 && (c.dopoledni === 0 || c.odpoledni === 0)) {
        return { ok: false, chyba: 'Pravidlo střídání dopoledne/odpoledne (tvrdý režim): zaměstnanec má každý den stejný typ směny. Změňte režim na preferenční nebo upravte konfiguraci.' };
      }
    }
    return { ok: true };
  }

  /* === D5: Přechod mezi budovami === */

  /**
   * Zjistí, zda zaměstnanec má zakázaný přechod mezi budovami v jednom dni.
   * Rozhodnutí: lokální nastavení u zaměstnance má přednost; 'výchozí' → globální pravidlo.
   * @param {Object} zamestnanec
   * @param {Object} pravidla
   * @returns {boolean} true = přechod je zakázán
   */
  function maZakazPrechodu(zamestnanec, pravidla) {
    var local = zamestnanec.prechodMeziBudovami;
    if (local === 'zakázat') return true;
    if (local === 'povolit') return false;
    // 'výchozí' nebo chybí → globální nastavení
    return !!(pravidla && pravidla.zakazPrechodMeziBudovami);
  }

  /* === Fáze 3: Přiřazení míst (kde pracují) === */

  /**
   * Minute-by-minute přiřazení zaměstnanců na místa (třída/budova).
   * Preferuje kontinuitu (kdo byl ve třídě, zůstane tam).
   */
  function assignLocations(shifts, demandInfo, budovy, zamestnanci, pravidla, omezeni) {
    var dayLen = demandInfo.dayLen;
    var empMap = {};
    var i, j, m;
    for (i = 0; i < zamestnanci.length; i++) empMap[zamestnanci[i].id] = zamestnanci[i];

    // Ne-dohromady lookup
    var neDohromady = {};
    for (i = 0; i < (omezeni || []).length; i++) {
      var o = omezeni[i];
      if (!neDohromady[o.osoba1Id]) neDohromady[o.osoba1Id] = [];
      neDohromady[o.osoba1Id].push(o.osoba2Id);
      if (!neDohromady[o.osoba2Id]) neDohromady[o.osoba2Id] = [];
      neDohromady[o.osoba2Id].push(o.osoba1Id);
    }

    var maxPresun = (pravidla && pravidla.vykryvaciMaxPresun != null)
      ? parseInt(pravidla.vykryvaciMaxPresun, 10) : 1;

    // zamestnanecId → Array[dayLen] of { budovaId, tridaId } | null
    var assignments = {};
    for (i = 0; i < shifts.length; i++) {
      assignments[shifts[i].zamestnanecId] = makeArray(dayLen, null);
    }

    // Množina tříd a budov
    var tridaIds = [];
    for (var tk in demandInfo.tridaDemand) {
      if (demandInfo.tridaDemand.hasOwnProperty(tk)) tridaIds.push(tk);
    }
    var budovaIds = [];
    for (var bk in demandInfo.budovaDemand) {
      if (demandInfo.budovaDemand.hasOwnProperty(bk)) budovaIds.push(bk);
    }

    // Mapa budovaId → [tridaId, ...]
    var tridyProBudovu = {};
    for (i = 0; i < budovy.length; i++) {
      var bTridy = budovy[i].tridy || [];
      tridyProBudovu[budovy[i].id] = [];
      for (j = 0; j < bTridy.length; j++) {
        tridyProBudovu[budovy[i].id].push(bTridy[j].id);
      }
    }

    // D5: Omezení přechodu mezi budovami – pro každého zaměstnance sledujeme,
    //     do které budovy byl dnes přiřazen (první přiřazení určí budovu na celý den).
    var zamDenBudova = {}; // zamestnanecId → budovaId (první budova v tomto dni)
    var zakazPrechodu = {}; // zamestnanecId → boolean (true = přechod zakázán)
    for (i = 0; i < zamestnanci.length; i++) {
      zakazPrechodu[zamestnanci[i].id] = maZakazPrechodu(zamestnanci[i], pravidla);
    }

    /** D5: Kontrola, zda zaměstnanec smí pracovat v dané budově. */
    function canGoToBuilding(zId, budovaId) {
      if (!budovaId) return true;
      if (!zakazPrechodu[zId]) return true;
      if (!zamDenBudova[zId]) return true; // ještě nebyl nikde → může kamkoli
      return zamDenBudova[zId] === budovaId;
    }

    // Vybere třídu v budově pro zaměstnance (preferuje předchozí třídu, pak nejméně obsazenou)
    function pickClassInBuilding(bId, zId, currentM) {
      var candidates = tridyProBudovu[bId] || [];
      if (candidates.length === 0) return null;
      // Preferovat třídu, kde zaměstnanec nedávno byl
      for (var ci = 0; ci < candidates.length; ci++) {
        if (wasRecentlyAt(zId, candidates[ci], 'trida', currentM)) return candidates[ci];
      }
      // Jinak třídu s nejmenším obsazením
      var bestTid = candidates[0];
      var bestCount = classCount[candidates[0]] || 0;
      for (var ci2 = 1; ci2 < candidates.length; ci2++) {
        var cnt = classCount[candidates[ci2]] || 0;
        if (cnt < bestCount) {
          bestCount = cnt;
          bestTid = candidates[ci2];
        }
      }
      return bestTid;
    }

    // Sledování přesunů za den
    var transitions = {}; // zamestnanecId → počet změn lokace
    for (i = 0; i < shifts.length; i++) transitions[shifts[i].zamestnanecId] = 0;

    // Pomocná: byl zaměstnanec nedávno na daném místě?
    function wasRecentlyAt(zId, locId, type, currentM) {
      if (!assignments[zId]) return false;
      var lookback = Math.min(currentM, 60);
      for (var k = currentM - 1; k >= currentM - lookback; k--) {
        var a = assignments[zId][k];
        if (!a) continue;
        if (type === 'trida' && a.tridaId === locId) return true;
        if (type === 'budova' && a.budovaId === locId) return true;
      }
      return false;
    }

    // B1e: smí být zaměstnanec přiřazen do (budovaId, tridaId)? tridaBudova = map tridaId → budovaId
    function canAssignEmpToLocation(emp, budovaId, tridaId, tridaBudova) {
      if (!emp || !emp.prirazenoJen) return true;
      var pj = emp.prirazenoJen;
      if (pj.indexOf('t:') === 0) {
        return tridaId === pj.slice(2);
      }
      if (pj.indexOf('b:') === 0) {
        var allowedBudova = pj.slice(2);
        var resolved = tridaId ? (tridaBudova[tridaId] || null) : (budovaId || null);
        return resolved === allowedBudova;
      }
      return true;
    }

    // Hlavní smyčka: po minutách
    for (m = 0; m < dayLen; m++) {
      // Kdo je ve směně
      var onShift = [];
      for (i = 0; i < shifts.length; i++) {
        if (m >= shifts[i].start && m < shifts[i].end) onShift.push(shifts[i].zamestnanecId);
      }
      if (onShift.length === 0) continue;

      // Aktuální demand a max limity
      var classDem = {};
      for (i = 0; i < tridaIds.length; i++) classDem[tridaIds[i]] = demandInfo.tridaDemand[tridaIds[i]][m] || 0;
      var buildDem = {};
      for (i = 0; i < budovaIds.length; i++) buildDem[budovaIds[i]] = demandInfo.budovaDemand[budovaIds[i]][m] || 0;
      var classMax = {};
      for (i = 0; i < tridaIds.length; i++) classMax[tridaIds[i]] = demandInfo.tridaMax && demandInfo.tridaMax[tridaIds[i]] ? demandInfo.tridaMax[tridaIds[i]][m] : null;
      var buildMax = {};
      for (i = 0; i < budovaIds.length; i++) buildMax[budovaIds[i]] = demandInfo.budovaMax && demandInfo.budovaMax[budovaIds[i]] ? demandInfo.budovaMax[budovaIds[i]][m] : null;

      // Tracking přiřazení
      var assigned = {};      // zamestnanecId → { budovaId, tridaId }
      var classCount = {};    // tridaId → počet přiřazených
      var buildingCount = {}; // budovaId → počet přiřazených (přímo + přes třídy)
      for (i = 0; i < tridaIds.length; i++) classCount[tridaIds[i]] = 0;
      for (i = 0; i < budovaIds.length; i++) buildingCount[budovaIds[i]] = 0;

      function doAssign(zId, bId, tId) {
        var emp = empMap[zId];
        if (emp && !canAssignEmpToLocation(emp, bId, tId, demandInfo.tridaBudova)) return;
        // Kontrola maximálních limitů před přiřazením
        if (tId) {
          var newClassCount = (classCount[tId] || 0) + 1;
          if (classMax[tId] !== null && newClassCount > classMax[tId]) return; // Překročení max limitu třídy
          var parentBud = demandInfo.tridaBudova[tId];
          if (parentBud) {
            var newBuildCount = (buildingCount[parentBud] || 0) + 1;
            if (buildMax[parentBud] !== null && newBuildCount > buildMax[parentBud]) return; // Překročení max limitu budovy
          }
        } else if (bId) {
          var newBuildCount2 = (buildingCount[bId] || 0) + 1;
          if (buildMax[bId] !== null && newBuildCount2 > buildMax[bId]) return; // Překročení max limitu budovy
        }
        assigned[zId] = { budovaId: bId || null, tridaId: tId || null };
        var resolvedBud = null;
        if (tId) {
          classCount[tId] = (classCount[tId] || 0) + 1;
          var parentBud2 = demandInfo.tridaBudova[tId];
          if (parentBud2) {
            buildingCount[parentBud2] = (buildingCount[parentBud2] || 0) + 1;
            resolvedBud = parentBud2;
          }
        } else if (bId) {
          buildingCount[bId] = (buildingCount[bId] || 0) + 1;
          resolvedBud = bId;
        }
        // D5: Zaznamenat budovu zaměstnance (první přiřazení určí budovu na celý den)
        if (resolvedBud && !zamDenBudova[zId]) {
          zamDenBudova[zId] = resolvedBud;
        }
      }

      // Krok 1: Kmenové → jejich třída (mají absolutní přednost)
      // Kmenová zaměstnankyně je VŽDY ve své třídě, bez ohledu na poptávku.
      for (i = 0; i < onShift.length; i++) {
        var zId1 = onShift[i];
        var emp1 = empMap[zId1];
        if (emp1 && emp1.kmenovaVykryvaci === 'kmenová' && emp1.tridaId) {
          doAssign(zId1, null, emp1.tridaId);
        }
      }

      // Krok 2: Sticky — pokračovat v předchozí lokaci, pokud tam je stále demand
      // Ale nepřekročit potřebný počet (uvolnit přebytečné)
      if (m > 0) {
        // Spočítat sticky zájemce per lokace
        var stickyPerLoc = {}; // 't:id' nebo 'b:id' → [zamIds]
        for (i = 0; i < onShift.length; i++) {
          var zIdS = onShift[i];
          if (assigned[zIdS]) continue;
          var prev = assignments[zIdS] ? assignments[zIdS][m - 1] : null;
          if (!prev) continue;
          var locKey = prev.tridaId ? 't:' + prev.tridaId : 'b:' + prev.budovaId;
          if (!stickyPerLoc[locKey]) stickyPerLoc[locKey] = [];
          stickyPerLoc[locKey].push(zIdS);
        }
        // Pro každou lokaci: přiřadit jen tolik, kolik je potřeba (s ohledem na již přiřazené)
        for (var locKey2 in stickyPerLoc) {
          if (!stickyPerLoc.hasOwnProperty(locKey2)) continue;
          var isClass = locKey2.charAt(0) === 't';
          var locId = locKey2.substring(2);
          var demand = isClass ? (classDem[locId] || 0) : (buildDem[locId] || 0);
          var alreadyAssigned = isClass ? (classCount[locId] || 0) : (buildingCount[locId] || 0);
          var stickyList = stickyPerLoc[locKey2];
          var keepCount = Math.max(0, demand - alreadyAssigned);

          // Seřadit: kmenové první, pak podle přesunů (méně = lepší)
          stickyList.sort(function (a, b) {
            var za = empMap[a], zb = empMap[b];
            var aK = za && za.kmenovaVykryvaci === 'kmenová' && isClass && za.tridaId === locId;
            var bK = zb && zb.kmenovaVykryvaci === 'kmenová' && isClass && zb.tridaId === locId;
            if (aK !== bK) return aK ? -1 : 1;
            return (transitions[a] || 0) - (transitions[b] || 0);
          });

          for (var si = 0; si < keepCount && si < stickyList.length; si++) {
            if (isClass) {
              doAssign(stickyList[si], null, locId);
            } else {
              // Budova-only sticky: převést na třídu v budově
              var stickyClass = pickClassInBuilding(locId, stickyList[si], m);
              if (stickyClass) {
                doAssign(stickyList[si], null, stickyClass);
              } else {
                doAssign(stickyList[si], locId, null);
              }
            }
          }
        }
      }

      // Krok 3: Zaplnit neobsazené třídy
      for (i = 0; i < tridaIds.length; i++) {
        var tIdFill = tridaIds[i];
        var need = (classDem[tIdFill] || 0) - (classCount[tIdFill] || 0);
        if (need <= 0) continue;

        var avail = [];
        for (j = 0; j < onShift.length; j++) {
          var zIdA = onShift[j];
          if (assigned[zIdA]) continue;
          var forbidden = false;
          if (neDohromady[zIdA]) {
            for (var fi = 0; fi < neDohromady[zIdA].length; fi++) {
              var forbId = neDohromady[zIdA][fi];
              if (assigned[forbId] && assigned[forbId].tridaId === tIdFill) { forbidden = true; break; }
            }
          }
          if (forbidden) continue;
          if (!canGoToBuilding(zIdA, demandInfo.tridaBudova[tIdFill])) continue;
          var empA = empMap[zIdA];
          if (empA && !canAssignEmpToLocation(empA, demandInfo.tridaBudova[tIdFill] || null, tIdFill, demandInfo.tridaBudova)) continue;
          if (empA && empA.kmenovaVykryvaci === 'vykrývací') {
            var prevA = (m > 0 && assignments[zIdA]) ? assignments[zIdA][m - 1] : null;
            if (prevA && prevA.tridaId !== tIdFill && (transitions[zIdA] || 0) >= maxPresun) continue;
          }
          avail.push(zIdA);
        }

        avail.sort(function (a, b) {
          var aR = wasRecentlyAt(a, tIdFill, 'trida', m) ? 0 : 1;
          var bR = wasRecentlyAt(b, tIdFill, 'trida', m) ? 0 : 1;
          if (aR !== bR) return aR - bR;
          return (transitions[a] || 0) - (transitions[b] || 0);
        });

        for (j = 0; j < need && j < avail.length; j++) {
          doAssign(avail[j], null, tIdFill);
        }
      }

      // Krok 4: Zaplnit neobsazené budovy — přiřadit do TŘÍDY v budově (ne na budovu bez třídy)
      for (i = 0; i < budovaIds.length; i++) {
        var bIdFill = budovaIds[i];
        var bNeed = (buildDem[bIdFill] || 0) - (buildingCount[bIdFill] || 0);
        if (bNeed <= 0) continue;
        for (j = 0; j < onShift.length; j++) {
          if (bNeed <= 0) break;
          if (!assigned[onShift[j]]) {
            // D5: Omezení přechodu mezi budovami
            if (!canGoToBuilding(onShift[j], bIdFill)) continue;
            var classForBuild = pickClassInBuilding(bIdFill, onShift[j], m);
            if (classForBuild) {
              doAssign(onShift[j], null, classForBuild);
            } else {
              // Fallback: budova bez tříd (výjimečný případ)
              doAssign(onShift[j], bIdFill, null);
            }
            bNeed--;
          }
        }
      }

      // Krok 5: Zbylí nepřiřazení → prioritně zaplnit nevyplněné minimální požadavky
      var unassigned = [];
      for (i = 0; i < onShift.length; i++) {
        if (!assigned[onShift[i]]) unassigned.push(onShift[i]);
      }
      // Najít místa s nevyplněnými minimálními požadavky
      var unmetDemand = [];
      for (i = 0; i < tridaIds.length; i++) {
        var tIdUnmet = tridaIds[i];
        var needT = (classDem[tIdUnmet] || 0) - (classCount[tIdUnmet] || 0);
        if (needT > 0) {
          unmetDemand.push({ type: 'trida', id: tIdUnmet, need: needT });
        }
      }
      for (i = 0; i < budovaIds.length; i++) {
        var bIdUnmet = budovaIds[i];
        var needB = (buildDem[bIdUnmet] || 0) - (buildingCount[bIdUnmet] || 0);
        if (needB > 0) {
          unmetDemand.push({ type: 'budova', id: bIdUnmet, need: needB });
        }
      }
      // Seřadit podle potřeby (největší potřeba první)
      unmetDemand.sort(function (a, b) { return b.need - a.need; });
      // Přiřadit nepřiřazené do míst s nevyplněnými požadavky
      for (var ud = 0; ud < unmetDemand.length && unassigned.length > 0; ud++) {
        var unmet = unmetDemand[ud];
        var assignedCount = 0;
        for (var ua = 0; ua < unassigned.length && assignedCount < unmet.need; ua++) {
          var zIdUnmet = unassigned[ua];
          if (assigned[zIdUnmet]) continue;
          if (unmet.type === 'trida') {
            var budovaForTrida = demandInfo.tridaBudova[unmet.id];
            if (!canGoToBuilding(zIdUnmet, budovaForTrida)) continue;
            var empUnmet = empMap[zIdUnmet];
            if (empUnmet && !canAssignEmpToLocation(empUnmet, budovaForTrida || null, unmet.id, demandInfo.tridaBudova)) continue;
            doAssign(zIdUnmet, null, unmet.id);
            assignedCount++;
          } else {
            if (!canGoToBuilding(zIdUnmet, unmet.id)) continue;
            var classForUnmet = pickClassInBuilding(unmet.id, zIdUnmet, m);
            if (classForUnmet) {
              doAssign(zIdUnmet, null, classForUnmet);
            } else {
              doAssign(zIdUnmet, unmet.id, null);
            }
            assignedCount++;
          }
        }
      }
      // Zbylí nepřiřazení → zůstat kde byli (v třídě), nebo přiřadit do třídy
      for (i = 0; i < unassigned.length; i++) {
        var zIdR = unassigned[i];
        if (assigned[zIdR]) continue;
        var prevR = (m > 0 && assignments[zIdR]) ? assignments[zIdR][m - 1] : null;
        if (prevR && prevR.tridaId) {
          // Pokračovat v předchozí třídě
          doAssign(zIdR, null, prevR.tridaId);
        } else if (prevR && prevR.budovaId) {
          // Předchozí bylo na budově (nemělo by se stát) → převést na třídu
          var classConvert = pickClassInBuilding(prevR.budovaId, zIdR, m);
          if (classConvert) {
            doAssign(zIdR, null, classConvert);
          } else {
            doAssign(zIdR, prevR.budovaId, null);
          }
        } else if (tridaIds.length > 0) {
          // D5: Respektovat omezení přechodu mezi budovami
          var tridaProZbyle = null;
          if (zamDenBudova[zIdR] && zakazPrechodu[zIdR]) {
            tridaProZbyle = pickClassInBuilding(zamDenBudova[zIdR], zIdR, m);
          }
          if (!tridaProZbyle) tridaProZbyle = tridaIds[0];
          doAssign(zIdR, null, tridaProZbyle);
        } else if (budovaIds.length > 0) {
          // D5: Respektovat omezení přechodu mezi budovami
          var budovaProZbyle = (zamDenBudova[zIdR] && zakazPrechodu[zIdR])
            ? zamDenBudova[zIdR] : budovaIds[0];
          doAssign(zIdR, budovaProZbyle, null);
        }
      }

      // Uložit a sledovat přesuny
      for (i = 0; i < onShift.length; i++) {
        var zIdW = onShift[i];
        var asg = assigned[zIdW] || null;
        assignments[zIdW][m] = asg;
        if (m > 0 && asg) {
          var prevW = assignments[zIdW][m - 1];
          if (prevW && (prevW.tridaId !== asg.tridaId || prevW.budovaId !== asg.budovaId)) {
            transitions[zIdW] = (transitions[zIdW] || 0) + 1;
          }
        }
      }
    }

    return assignments;
  }

  /* === Fáze 4: Převod na segmenty === */

  /** Převede minutové přiřazení na seznam segmentů per zaměstnanec. */
  function buildSegments(assignments, shifts, dayStart) {
    var result = [];
    for (var si = 0; si < shifts.length; si++) {
      var s = shifts[si];
      var ass = assignments[s.zamestnanecId];
      if (!ass) continue;
      var segments = [];
      var current = null;

      for (var m = s.start; m < s.end; m++) {
        var a = ass[m];
        if (!a) continue;
        var sameLoc = current
          && current.budovaId === (a.budovaId || null)
          && current.tridaId === (a.tridaId || null);
        if (sameLoc) {
          current.doM = m + 1;
        } else {
          if (current) segments.push(current);
          current = { odM: m, doM: m + 1, budovaId: a.budovaId || null, tridaId: a.tridaId || null };
        }
      }
      if (current) segments.push(current);

      var segmentyHhmm = [];
      for (var si2 = 0; si2 < segments.length; si2++) {
        segmentyHhmm.push({
          od: minutyToHhmm(segments[si2].odM + dayStart),
          do: minutyToHhmm(segments[si2].doM + dayStart),
          budovaId: segments[si2].budovaId,
          tridaId: segments[si2].tridaId
        });
      }
      if (segmentyHhmm.length > 0) {
        result.push({ zamestnanecId: s.zamestnanecId, segmenty: segmentyHhmm });
      }
    }
    return result;
  }

  /* === Hlavní funkce === */

  /**
   * Vypočte návrh směn.
   * @param {Object} data - konfigurace (zamestnanci, budovy, minMaxSloty, pravidla, omezeniNeDohromady)
   * @returns {{ ok: boolean, prirazeni?: Array, chyba?: string, varovani?: Array }}
   *
   * Nový formát prirazeni:
   *   [{ den: 1–5, zamestnanecId: string, segmenty: [{ od, do, budovaId, tridaId }] }]
   */
  function vypocetSmen(data) {
    var zamestnanci = (data.zamestnanci || []).filter(function (z) {
      return z && z.id && (z.uvazekMinutyTyden == null || z.uvazekMinutyTyden > 0);
    });
    var budovy = data.budovy || [];
    var pravidla = data.pravidla || {};
    var sloty = data.minMaxSloty || [];
    var omezeni = data.omezeniNeDohromady || [];

    if (zamestnanci.length === 0) {
      return { ok: false, chyba: 'Přidejte alespoň jednoho zaměstnance s úvazkem.' };
    }
    if (sloty.length === 0) {
      return { ok: false, chyba: 'Přidejte alespoň jeden časový slot v Pravidlech.' };
    }
    if (budovy.length === 0) {
      return { ok: false, chyba: 'Přidejte alespoň jednu budovu.' };
    }

    // Příprava dostupnosti (B1d): pro každého zaměstnance a den zjistit masku a max. blok
    var range = getOpeningRange(budovy);
    var dayLen0 = range.end - range.start;

    // availInfo[zamId][den] = { mask: boolean[], maxBlock: number }
    var availInfo = {};
    for (var ai = 0; ai < zamestnanci.length; ai++) {
      var zAvail = zamestnanci[ai];
      availInfo[zAvail.id] = {};
      for (var ad = 1; ad <= 5; ad++) {
        var mask = buildAvailMask(zAvail, ad, range.start, dayLen0);
        availInfo[zAvail.id][ad] = {
          mask: mask,
          maxBlock: longestAvailBlock(mask)
        };
      }
    }

    // Pro každého zaměstnance spočítat denní minuty s ohledem na dostupnost.
    // Minuty se rozdělí proporčně podle dostupného času v jednotlivých dnech.
    var empWeekly = {};
    for (var ew = 0; ew < zamestnanci.length; ew++) {
      empWeekly[zamestnanci[ew].id] = parseInt(zamestnanci[ew].uvazekMinutyTyden, 10) || 0;
    }

    var prirazeni = [];
    var allWarnings = [];
    var den;
    // Sledování celkového počtu minut přiřazených každému zaměstnanci za týden
    var weeklyAssigned = {};
    for (var wa = 0; wa < zamestnanci.length; wa++) {
      weeklyAssigned[zamestnanci[wa].id] = 0;
    }

    // D6: střídání dopoledne/odpoledne – pravidla a sledování typů pro preferenční režim
    var stridaniZapnuto = !!(pravidla.stridaniDopoledneOdpoledne);
    var stridaniRezim = (pravidla.stridaniRezim === 'tvrdý') ? 'tvrdý' : 'preferenční';
    var stridaniHraniceMinuty = parseInt(pravidla.stridaniHraniceMinuty, 10);
    if (isNaN(stridaniHraniceMinuty)) stridaniHraniceMinuty = 720;
    var zamTypesSoFar = {};
    for (var zi0 = 0; zi0 < zamestnanci.length; zi0++) {
      zamTypesSoFar[zamestnanci[zi0].id] = [];
    }

    // D7: předpočítat koncentrované denní minuty pro kratší úvazky (méně dnů, delší bloky)
    var preferSouvisle = !!(pravidla.preferSouvisleBlok);
    var minDelkaBloku = (pravidla.minDelkaBlokuMinuty != null && pravidla.minDelkaBlokuMinuty !== '')
      ? parseInt(pravidla.minDelkaBlokuMinuty, 10) : null;
    if (preferSouvisle && isNaN(minDelkaBloku)) minDelkaBloku = null;
    var UVAZEK_KRATKY_PRAH = 1200; // 20 h/týden – pod tím aplikujeme koncentraci
    var empDailyPrecomputed = {}; // zamId → { 1: min, 2: min, ... }
    if (preferSouvisle) {
      for (var ep = 0; ep < zamestnanci.length; ep++) {
        var zP = zamestnanci[ep];
        var weeklyP = empWeekly[zP.id];
        if (weeklyP >= UVAZEK_KRATKY_PRAH) continue;
        var infoP = availInfo[zP.id];
        // Seřadit dny podle maxBlock (nejdelší blok první)
        var dnySBlokem = [];
        for (var dp = 1; dp <= 5; dp++) {
          dnySBlokem.push({ den: dp, maxBlock: infoP[dp].maxBlock });
        }
        dnySBlokem.sort(function (a, b) { return b.maxBlock - a.maxBlock; });
        var remaining = weeklyP;
        var denniMin = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (var di = 0; di < dnySBlokem.length && remaining > 0; di++) {
          var d = dnySBlokem[di].den;
          var maxB = dnySBlokem[di].maxBlock;
          if (maxB <= 0) continue;
          var assign = Math.min(remaining, maxB);
          if (minDelkaBloku != null && assign > 0 && assign < minDelkaBloku && (remaining - assign) > 0) {
            // Nepřiřazovat příliš krátký blok, pokud ještě můžeme vyplnit další dny
            continue;
          }
          denniMin[d] = assign;
          remaining -= assign;
        }
        if (remaining > 0) {
          // Koncentrace nevyčerpala úvazek – nepoužít předpočítané, v hlavní smyčce zůstane proporční rozdělení
          continue;
        }
        empDailyPrecomputed[zP.id] = denniMin;
      }
    }

    for (den = 1; den <= 5; den++) {
      var demandInfo = buildDemand(den, sloty, budovy, pravidla);
      var curve = totalDemandCurve(demandInfo, budovy);

      // Sestavit empDaily: nedostupnost (B1d) + volitelně D7 koncentrace
      var empDaily = [];
      var availMasks = {};
      for (var ei = 0; ei < zamestnanci.length; ei++) {
        var zE = zamestnanci[ei];
        var weekly = empWeekly[zE.id];
        var info = availInfo[zE.id];

        var dailyMin = 0;
        if (empDailyPrecomputed[zE.id]) {
          dailyMin = empDailyPrecomputed[zE.id][den] || 0;
        } else {
          var totalAvailMin = 0;
          for (var dd = 1; dd <= 5; dd++) {
            totalAvailMin += info[dd].maxBlock;
          }
          if (totalAvailMin > 0 && info[den].maxBlock > 0) {
            var remainingWeekly = weekly - weeklyAssigned[zE.id];
            var remainingDays = 6 - den; // Zbývající dny včetně dnešního
            var proportional = Math.round(weekly * info[den].maxBlock / totalAvailMin);
            // Omezit na zbývající úvazek rozdělený mezi zbývající dny (s rezervou)
            var maxFromRemaining = remainingDays > 0 ? Math.ceil(remainingWeekly / remainingDays) : 0;
            dailyMin = Math.min(proportional, info[den].maxBlock);
            // Zajistit, že nepřekročíme celkový úvazek
            if (weeklyAssigned[zE.id] + dailyMin > weekly) {
              dailyMin = Math.max(0, weekly - weeklyAssigned[zE.id]);
            }
            // Také omezit na maxFromRemaining, pokud je to přísnější
            if (maxFromRemaining > 0 && dailyMin > maxFromRemaining) {
              dailyMin = maxFromRemaining;
            }
          }
        }

        empDaily.push({ id: zE.id, dailyMin: dailyMin });
        availMasks[zE.id] = info[den].mask;
      }

      // Zajistit dostatek lidí na pokrytí poptávky: v každé minutě musí být alespoň curve[m] osob.
      // Pokud D7 nebo proporční rozdělení dá 0 minut příliš mnoha lidem, placeShifts nemůže pokrýt sloty (např. 9:30–11 minNaTridu 2).
      var maxCurve = 0;
      for (var ci = 0; ci < curve.length; ci++) {
        if (curve[ci] > maxCurve) maxCurve = curve[ci];
      }
      var countPositive = 0;
      for (var cpi = 0; cpi < empDaily.length; cpi++) {
        if (empDaily[cpi].dailyMin > 0) countPositive++;
      }
      if (maxCurve > 0 && countPositive < maxCurve + 1) {
        var needMore = Math.max(0, maxCurve + 1 - countPositive);
        var toGive = Math.max(STEP, 60);
        var peakStartR = 0;
        var peakEndR = curve.length;
        for (var pr = 0; pr < curve.length; pr++) {
          if (curve[pr] >= maxCurve) { peakStartR = pr; break; }
        }
        for (var pr2 = curve.length - 1; pr2 >= 0; pr2--) {
          if (curve[pr2] >= maxCurve) { peakEndR = pr2 + 1; break; }
        }
        function canWorkInPeak(empIdx, len) {
          var mask = availMasks[empDaily[empIdx].id];
          if (!mask || mask.length < peakEndR) return false;
          for (var ss = peakStartR; ss <= peakEndR - len; ss++) {
            var ok = true;
            for (var mm = ss; mm < ss + len; mm++) { if (!mask[mm]) { ok = false; break; } }
            if (ok) return true;
          }
          return false;
git         }
        var donors = [];
        var zeros = [];
        for (var di = 0; di < empDaily.length; di++) {
          if (empDaily[di].dailyMin >= toGive) donors.push(di);
          else if (empDaily[di].dailyMin === 0 && canWorkInPeak(di, toGive)) zeros.push(di);
        }
        donors.sort(function (a, b) { return empDaily[b].dailyMin - empDaily[a].dailyMin; });
        var toTransfer = Math.min(needMore, donors.length, zeros.length);
        for (var tt = 0; tt < toTransfer; tt++) {
          var donorId = empDaily[donors[tt]].id;
          var zeroId = empDaily[zeros[tt]].id;
          var donorWeekly = weeklyAssigned[donorId] || 0;
          var zeroWeekly = weeklyAssigned[zeroId] || 0;
          var donorWeeklyMax = empWeekly[donorId] || 0;
          var zeroWeeklyMax = empWeekly[zeroId] || 0;
          // Kontrola, že nepřekročíme úvazek při přerozdělování
          if (donorWeekly >= donorWeeklyMax || zeroWeekly + toGive > zeroWeeklyMax) continue;
          empDaily[donors[tt]].dailyMin -= toGive;
          empDaily[zeros[tt]].dailyMin = toGive;
        }
      }

      // D6 preferenční: preferovaný typ pro tento den (opačný než většina předchozích dnů)
      var stridaniOpt = null;
      if (stridaniZapnuto && stridaniRezim === 'preferenční') {
        var boundaryRel = stridaniHraniceMinuty - demandInfo.range.start;
        var preferredType = {};
        for (var ptId in zamTypesSoFar) {
          if (!zamTypesSoFar.hasOwnProperty(ptId)) continue;
          var hist = zamTypesSoFar[ptId];
          if (hist.length === 0) continue;
          var dop = 0, od = 0;
          for (var hi = 0; hi < hist.length; hi++) {
            if (hist[hi] === 'dopoledni') dop++; else od++;
          }
          preferredType[ptId] = dop >= od ? 'odpoledni' : 'dopoledni';
        }
        stridaniOpt = { preferredType: preferredType, boundaryRelative: boundaryRel };
      }

      var placed = placeShifts(empDaily, curve, demandInfo.dayLen, availMasks, stridaniOpt);
      var locAssignments = assignLocations(
        placed.shifts, demandInfo, budovy, zamestnanci, pravidla, omezeni
      );
      var segments = buildSegments(locAssignments, placed.shifts, demandInfo.range.start);

      for (var si = 0; si < segments.length; si++) {
        prirazeni.push({
          den: den,
          zamestnanecId: segments[si].zamestnanecId,
          segmenty: segments[si].segmenty
        });
        // Aktualizovat celkový počet přiřazených minut za týden
        var segZamId = segments[si].zamestnanecId;
        var dayMinutes = 0;
        for (var segi = 0; segi < segments[si].segmenty.length; segi++) {
          var seg = segments[si].segmenty[segi];
          var segOd = timeToMinuty(seg.od);
          var segDo = timeToMinuty(seg.do);
          dayMinutes += (segDo - segOd);
        }
        weeklyAssigned[segZamId] = (weeklyAssigned[segZamId] || 0) + dayMinutes;
      }

      // D6: zaznamenat typ směny pro tento den (pro preferenční v dalších dnech a pro tvrdý validation)
      if (stridaniZapnuto) {
        for (var si2 = 0; si2 < segments.length; si2++) {
          var zId2 = segments[si2].zamestnanecId;
          var typ = getShiftTypeFromSegmenty(segments[si2].segmenty, stridaniHraniceMinuty);
          if (typ && zamTypesSoFar[zId2]) zamTypesSoFar[zId2].push(typ);
        }
      }
    }

    // D6 tvrdý režim: ověřit, že nikdo nemá každý den stejný typ směny
    if (stridaniZapnuto && stridaniRezim === 'tvrdý') {
      var validTvrdy = validujStridaniTvrdy(prirazeni, stridaniHraniceMinuty);
      if (!validTvrdy.ok) {
        return { ok: false, chyba: validTvrdy.chyba };
      }
    }

    if (prirazeni.length === 0) {
      return { ok: false, chyba: 'Nepodařilo se vytvořit žádné přiřazení. Zkontrolujte konfiguraci.' };
    }

    return {
      ok: true,
      prirazeni: prirazeni,
      varovani: allWarnings.length > 0 ? allWarnings : undefined
    };
  }

  /** Legacy: positions for slot (pro zpětnou kompatibilitu). */
  function positionsProSlot(slot, budovy) {
    var list = [];
    var minB = (slot.minNaBudovu != null) ? parseInt(slot.minNaBudovu, 10) : 0;
    var minT = (slot.minNaTridu != null) ? parseInt(slot.minNaTridu, 10) : 0;
    var i, j, k, b, t;
    if (minB > 0 && Array.isArray(budovy)) {
      for (i = 0; i < budovy.length; i++) {
        b = budovy[i];
        if (b && b.id) {
          for (j = 0; j < minB; j++) list.push({ budovaId: b.id, tridaId: null });
        }
      }
    }
    if (minT > 0 && Array.isArray(budovy)) {
      for (i = 0; i < budovy.length; i++) {
        b = budovy[i];
        if (b && b.tridy) {
          for (j = 0; j < b.tridy.length; j++) {
            t = b.tridy[j];
            if (t && t.id) {
              for (k = 0; k < minT; k++) list.push({ budovaId: null, tridaId: t.id });
            }
          }
        }
      }
    }
    return list;
  }

  global.MSemenyVypocetSmen = {
    vypocetSmen: vypocetSmen,
    slotDurationMinuty: slotDurationMinuty,
    positionsProSlot: positionsProSlot,
    // Interní helpery exportované pro testy (B1d, D5, D6)
    _buildAvailMask: buildAvailMask,
    _longestAvailBlock: longestAvailBlock,
    _maZakazPrechodu: maZakazPrechodu,
    _getShiftTypeFromSegmenty: getShiftTypeFromSegmenty,
    _validujStridaniTvrdy: validujStridaniTvrdy
  };
})(typeof window !== 'undefined' ? window : this);
