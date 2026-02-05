/**
 * Výpočet návrhu směn (D1, D3).
 * Min/max na budovu a třídu, úvazky. D3: překryv v třídě, kmenové/vykrývací, rotace.
 */
(function (global) {
  'use strict';

  function parseTime(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return { h: 0, m: 0 };
    var parts = hhmm.split(':');
    var h = parseInt(parts[0], 10) || 0;
    var m = parseInt(parts[1], 10) || 0;
    return { h: h, m: m };
  }

  function timeToMinuty(hhmm) {
    var t = parseTime(hhmm);
    return t.h * 60 + t.m;
  }

  function minutyToHhmm(minuty) {
    var m = minuty % 60;
    var h = Math.floor(minuty / 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /** Délka slotu v minutách. */
  function slotDurationMinuty(slot) {
    var od = timeToMinuty(slot.od);
    var do_ = timeToMinuty(slot.do);
    var d = do_ - od;
    return d > 0 ? d : 0;
  }

  /** Slot platí pro daný den (1–5). Prázdné dny = všechny. */
  function slotPlatnyProDen(slot, den) {
    var dny = slot.dny;
    if (!Array.isArray(dny) || dny.length === 0) return true;
    return dny.indexOf(den) >= 0;
  }

  /**
   * Vrátí seznam „pozic“ pro slot: každá pozice = jedna osoba na budovu nebo na třídu.
   * @returns {Array<{ budovaId: string|null, tridaId: string|null }>}
   */
  function positionsProSlot(slot, budovy) {
    var list = [];
    var minB = (slot.minNaBudovu != null) ? parseInt(slot.minNaBudovu, 10) : 0;
    var minT = (slot.minNaTridu != null) ? parseInt(slot.minNaTridu, 10) : 0;
    var b, t, i, j;
    if (minB > 0 && Array.isArray(budovy)) {
      for (i = 0; i < budovy.length; i += 1) {
        b = budovy[i];
        if (b && b.id) {
          for (j = 0; j < minB; j += 1) {
            list.push({ budovaId: b.id, tridaId: null });
          }
        }
      }
    }
    if (minT > 0 && Array.isArray(budovy)) {
      for (i = 0; i < budovy.length; i += 1) {
        b = budovy[i];
        if (b && b.tridy) {
          for (j = 0; j < b.tridy.length; j += 1) {
            t = b.tridy[j];
            if (t && t.id) {
              for (var k = 0; k < minT; k += 1) {
                list.push({ budovaId: null, tridaId: t.id });
              }
            }
          }
        }
      }
    }
    return list;
  }

  /** Klíč pozice pro rotaci (stejná pozice = stejný slot + místo). */
  function posKey(pos) {
    return (pos.budovaId || '') + '|' + (pos.tridaId || '');
  }

  /** Popis místa pro hlášku (budovy = data.budovy). */
  function mistoLabel(budovy, pos) {
    if (!pos) return '';
    if (pos.tridaId) {
      for (var bi = 0; bi < (budovy || []).length; bi += 1) {
        var b = budovy[bi];
        if (b.tridy) {
          for (var ti = 0; ti < b.tridy.length; ti += 1) {
            if (b.tridy[ti].id === pos.tridaId) {
              return (b.tridy[ti].nazev || '(třída)') + ' (' + (b.nazev || '') + ')';
            }
          }
        }
      }
      return '(třída ' + pos.tridaId + ')';
    }
    if (pos.budovaId) {
      for (var i = 0; i < (budovy || []).length; i += 1) {
        if (budovy[i].id === pos.budovaId) return budovy[i].nazev || '(budova)';
      }
      return '(budova ' + pos.budovaId + ')';
    }
    return '';
  }

  /**
   * Vybere nejvhodnější osobu pro pozici (D3: kmenová u své třídy, vykrývací max přesun, rotace).
   */
  function vyberOsobu(zamestnanci, pos, assignedThisSlot, remaining, duration, tridaIdsDnes, pravidla, slot, rotacePocet) {
    var maxPresun = (pravidla && pravidla.vykryvaciMaxPresun != null) ? parseInt(pravidla.vykryvaciMaxPresun, 10) : 1;
    var maxTridPerDay = maxPresun + 1;
    var key = slot.id + '|' + posKey(pos);
    var candidates = [];
    zamestnanci.forEach(function (z) {
      if (assignedThisSlot[z.id]) return;
      var r = remaining[z.id] || 0;
      if (r < duration) return;
      if (pos.tridaId) {
        var tridy = tridaIdsDnes[z.id] || [];
        if (z.kmenovaVykryvaci === 'vykrývací' && tridy.indexOf(pos.tridaId) < 0) {
          var uniq = tridy.slice();
          uniq.push(pos.tridaId);
          if (uniq.length > maxTridPerDay) return;
        }
      }
      var kmenovaMatch = pos.tridaId && z.kmenovaVykryvaci === 'kmenová' && z.tridaId === pos.tridaId;
      var rotaceCount = (rotacePocet && rotacePocet[key] && rotacePocet[key][z.id]) ? rotacePocet[key][z.id] : 0;
      candidates.push({
        id: z.id,
        remaining: r,
        kmenovaMatch: !!kmenovaMatch,
        rotaceCount: rotaceCount
      });
    });
    if (candidates.length === 0) return null;
    candidates.sort(function (a, b) {
      if (a.kmenovaMatch !== b.kmenovaMatch) return a.kmenovaMatch ? -1 : 1;
      if (slot.rotace && a.rotaceCount !== b.rotaceCount) return a.rotaceCount - b.rotaceCount;
      return b.remaining - a.remaining;
    });
    return candidates[0].id;
  }

  /**
   * Vypočte jeden návrh směn (D1 + D3).
   * @param {Object} data - konfigurace (zamestnanci, budovy, minMaxSloty, pravidla)
   * @returns {{ ok: boolean, prirazeni?: Array<...>, chyba?: string }}
   */
  function vypocetSmen(data) {
    var zamestnanci = (data.zamestnanci || []).filter(function (z) {
      return z && z.id && (z.uvazekMinutyTyden == null || z.uvazekMinutyTyden > 0);
    });
    var budovy = data.budovy || [];
    var pravidla = data.pravidla || {};
    var sloty = (data.minMaxSloty || []).slice().sort(function (a, b) {
      return (a.od || '').localeCompare(b.od || '');
    });

    var prekryvMin = (pravidla.minimalniPrekryvMinuty != null) ? parseInt(pravidla.minimalniPrekryvMinuty, 10) : 0;
    if (prekryvMin > 0 && budovy.length > 0) {
      var hasTridy = false;
      for (var bi = 0; bi < budovy.length; bi += 1) {
        if (budovy[bi].tridy && budovy[bi].tridy.length > 0) { hasTridy = true; break; }
      }
      if (hasTridy) {
        var odMin = 9 * 60;
        var doMin = odMin + prekryvMin;
        sloty.push({
          id: 'overlap-prekryv',
          od: minutyToHhmm(odMin),
          do: minutyToHhmm(doMin),
          minNaBudovu: 0,
          maxNaBudovu: null,
          minNaTridu: 2,
          maxNaTridu: null,
          dny: [],
          rotace: false
        });
        sloty.sort(function (a, b) { return (a.od || '').localeCompare(b.od || ''); });
      }
    }

    if (zamestnanci.length === 0) {
      return { ok: false, chyba: 'Přidejte alespoň jednoho zaměstnance s úvazkem.' };
    }
    if (sloty.length === 0) {
      return { ok: false, chyba: 'Přidejte alespoň jeden časový slot v Pravidlech.' };
    }

    var remaining = {};
    zamestnanci.forEach(function (z) {
      remaining[z.id] = (z.uvazekMinutyTyden != null) ? parseInt(z.uvazekMinutyTyden, 10) : 0;
    });

    var prirazeni = [];
    var rotacePocet = {};
    var den, slot, duration, positions, pos, assignedThisSlot, bestId, i, j, tridaIdsDnes, pk;

    for (den = 1; den <= 5; den += 1) {
      tridaIdsDnes = {};
      for (i = 0; i < sloty.length; i += 1) {
        slot = sloty[i];
        if (!slotPlatnyProDen(slot, den)) continue;

        duration = slotDurationMinuty(slot);
        positions = positionsProSlot(slot, budovy);
        if (positions.length === 0) continue;

        assignedThisSlot = {};
        for (j = 0; j < positions.length; j += 1) {
          pos = positions[j];
          bestId = vyberOsobu(zamestnanci, pos, assignedThisSlot, remaining, duration, tridaIdsDnes, pravidla, slot, rotacePocet);
          if (bestId == null) {
            var denLabel = den === 1 ? 'Po' : den === 2 ? 'Út' : den === 3 ? 'St' : den === 4 ? 'Čt' : 'Pá';
            var slotCas = (slot.od || '') + '–' + (slot.do || '');
            var misto = mistoLabel(budovy, pos);
            var sVolnymUvazkem = 0;
            var sVolnymANeprirazenych = 0;
            zamestnanci.forEach(function (z) {
              if ((remaining[z.id] || 0) >= duration) {
                sVolnymUvazkem += 1;
                if (!assignedThisSlot[z.id]) sVolnymANeprirazenych += 1;
              }
            });
            var duvod;
            if (sVolnymUvazkem === 0) {
              duvod = 'Žádný zaměstnanec nemá dostatek volného úvazku (pro tento slot je potřeba ' + duration + ' min). Zvažte zvýšení úvazků nebo snížení požadovaných pozic.';
            } else if (sVolnymANeprirazenych === 0) {
              duvod = 'Všechny osoby s dostatkem úvazku jsou v tomto slotu již přiřazeny – požaduje se více pozic než dostupných osob. Snižte min. počet na budovu/třídu nebo přidejte zaměstnance.';
            } else {
              duvod = 'Žádná vhodná osoba (omezení pro vykrývací – max. přesunů mezi třídami, nebo jiné pravidlo). Zkontrolujte pravidla vykrývacích.';
            }
            var chybaText = 'Pro ' + denLabel + ', slot ' + slotCas + (misto ? ', místo „' + misto + '": ' : ': ') + duvod;
            var chybiPozice = {
              den: den,
              slotId: slot.id,
              slotOdDo: slotCas,
              budovaId: pos.budovaId || null,
              tridaId: pos.tridaId || null,
              mistoLabel: misto
            };
            return {
              ok: false,
              chyba: chybaText,
              prirazeni: prirazeni,
              chybiPozice: chybiPozice
            };
          }
          prirazeni.push({
            den: den,
            slotId: slot.id,
            budovaId: pos.budovaId || undefined,
            tridaId: pos.tridaId || undefined,
            zamestnanecId: bestId
          });
          assignedThisSlot[bestId] = true;
          remaining[bestId] -= duration;
          if (pos.tridaId) {
            if (!tridaIdsDnes[bestId]) tridaIdsDnes[bestId] = [];
            if (tridaIdsDnes[bestId].indexOf(pos.tridaId) < 0) tridaIdsDnes[bestId].push(pos.tridaId);
          }
          pk = slot.id + '|' + posKey(pos);
          if (!rotacePocet[pk]) rotacePocet[pk] = {};
          rotacePocet[pk][bestId] = (rotacePocet[pk][bestId] || 0) + 1;
        }
      }
    }

    return { ok: true, prirazeni: prirazeni };
  }

  global.MSemenyVypocetSmen = {
    vypocetSmen: vypocetSmen,
    slotDurationMinuty: slotDurationMinuty,
    positionsProSlot: positionsProSlot
  };
})(typeof window !== 'undefined' ? window : this);
