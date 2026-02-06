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

    // Aplikovat slot requirements
    for (i = 0; i < sloty.length; i++) {
      var slot = sloty[i];
      if (!slotPlatnyProDen(slot, den)) continue;
      var od = Math.max(0, timeToMinuty(slot.od) - range.start);
      var doM = Math.min(dayLen, timeToMinuty(slot.do) - range.start);
      var minB = parseInt(slot.minNaBudovu, 10) || 0;
      var minT = parseInt(slot.minNaTridu, 10) || 0;

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
      tridaBudova: tridaBudova
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
   */
  function placeShifts(empDaily, curve, dayLen, availMasks) {
    var sorted = empDaily.slice().sort(function (a, b) {
      return b.dailyMin - a.dailyMin;
    });

    var coverage = makeArray(dayLen, 0);
    var shifts = [];

    for (var ei = 0; ei < sorted.length; ei++) {
      var z = sorted[ei];
      var dm = z.dailyMin;
      if (dm <= 0) continue;
      if (dm > dayLen) dm = dayLen;

      var mask = (availMasks && availMasks[z.id]) ? availMasks[z.id] : null;

      var bestStart = -1;
      var bestScore = -Infinity;

      // Zkusit pozice s krokem STEP
      for (var s = 0; s <= dayLen - dm; s += STEP) {
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
        }
        if (score > bestScore) {
          bestScore = score;
          bestStart = s;
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

    return { shifts: shifts, coverage: coverage };
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

    // Hlavní smyčka: po minutách
    for (m = 0; m < dayLen; m++) {
      // Kdo je ve směně
      var onShift = [];
      for (i = 0; i < shifts.length; i++) {
        if (m >= shifts[i].start && m < shifts[i].end) onShift.push(shifts[i].zamestnanecId);
      }
      if (onShift.length === 0) continue;

      // Aktuální demand
      var classDem = {};
      for (i = 0; i < tridaIds.length; i++) classDem[tridaIds[i]] = demandInfo.tridaDemand[tridaIds[i]][m] || 0;
      var buildDem = {};
      for (i = 0; i < budovaIds.length; i++) buildDem[budovaIds[i]] = demandInfo.budovaDemand[budovaIds[i]][m] || 0;

      // Tracking přiřazení
      var assigned = {};      // zamestnanecId → { budovaId, tridaId }
      var classCount = {};    // tridaId → počet přiřazených
      var buildingCount = {}; // budovaId → počet přiřazených (přímo + přes třídy)
      for (i = 0; i < tridaIds.length; i++) classCount[tridaIds[i]] = 0;
      for (i = 0; i < budovaIds.length; i++) buildingCount[budovaIds[i]] = 0;

      function doAssign(zId, bId, tId) {
        assigned[zId] = { budovaId: bId || null, tridaId: tId || null };
        if (tId) {
          classCount[tId] = (classCount[tId] || 0) + 1;
          var parentBud = demandInfo.tridaBudova[tId];
          if (parentBud) buildingCount[parentBud] = (buildingCount[parentBud] || 0) + 1;
        } else if (bId) {
          buildingCount[bId] = (buildingCount[bId] || 0) + 1;
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

        // Najít dostupné zaměstnance
        var avail = [];
        for (j = 0; j < onShift.length; j++) {
          var zIdA = onShift[j];
          if (assigned[zIdA]) continue;
          // Ne-dohromady
          var forbidden = false;
          if (neDohromady[zIdA]) {
            for (var fi = 0; fi < neDohromady[zIdA].length; fi++) {
              var forbId = neDohromady[zIdA][fi];
              if (assigned[forbId] && assigned[forbId].tridaId === tIdFill) { forbidden = true; break; }
            }
          }
          if (forbidden) continue;
          // Vykrývací max přesunů
          var empA = empMap[zIdA];
          if (empA && empA.kmenovaVykryvaci === 'vykrývací') {
            var prevA = (m > 0 && assignments[zIdA]) ? assignments[zIdA][m - 1] : null;
            if (prevA && prevA.tridaId !== tIdFill && (transitions[zIdA] || 0) >= maxPresun) continue;
          }
          avail.push(zIdA);
        }

        // Seřadit: nedávno v této třídě → kmenová → méně přesunů
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

      // Krok 5: Zbylí nepřiřazení → zůstat kde byli (v třídě), nebo přiřadit do třídy
      for (i = 0; i < onShift.length; i++) {
        var zIdR = onShift[i];
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
          doAssign(zIdR, null, tridaIds[0]);
        } else if (budovaIds.length > 0) {
          doAssign(zIdR, budovaIds[0], null);
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

    for (den = 1; den <= 5; den++) {
      var demandInfo = buildDemand(den, sloty, budovy, pravidla);
      var curve = totalDemandCurve(demandInfo, budovy);

      // Sestavit empDaily s ohledem na nedostupnost
      var empDaily = [];
      var availMasks = {};
      for (var ei = 0; ei < zamestnanci.length; ei++) {
        var zE = zamestnanci[ei];
        var weekly = empWeekly[zE.id];
        var info = availInfo[zE.id];

        // Celkový dostupný čas zaměstnance přes všechny dny (suma maxBlock)
        var totalAvailMin = 0;
        for (var dd = 1; dd <= 5; dd++) {
          totalAvailMin += info[dd].maxBlock;
        }

        var dailyMin = 0;
        if (totalAvailMin > 0 && info[den].maxBlock > 0) {
          // Rozdělit úvazek proporčně podle dostupného času
          dailyMin = Math.round(weekly * info[den].maxBlock / totalAvailMin);
          // Omezit na skutečně dostupný blok
          if (dailyMin > info[den].maxBlock) dailyMin = info[den].maxBlock;
        }

        empDaily.push({ id: zE.id, dailyMin: dailyMin });
        availMasks[zE.id] = info[den].mask;
      }

      var placed = placeShifts(empDaily, curve, demandInfo.dayLen, availMasks);
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
    // Interní helpery exportované pro testy (B1d)
    _buildAvailMask: buildAvailMask,
    _longestAvailBlock: longestAvailBlock
  };
})(typeof window !== 'undefined' ? window : this);
