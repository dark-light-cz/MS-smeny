/**
 * Výpočet návrhu směn (D1).
 * Zjednodušená verze: min/max na budovu a na třídu v časových slotech, úvazky.
 * Bez překryvu, kmenových a rotace.
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

  /**
   * Vypočte jeden návrh směn.
   * @param {Object} data - konfigurace (zamestnanci, budovy, minMaxSloty)
   * @returns {{ ok: boolean, prirazeni?: Array<{ den: number, slotId: string, budovaId?: string, tridaId?: string, zamestnanecId: string }>, chyba?: string }}
   */
  function vypocetSmen(data) {
    var zamestnanci = (data.zamestnanci || []).filter(function (z) {
      return z && z.id && (z.uvazekMinutyTyden == null || z.uvazekMinutyTyden > 0);
    });
    var budovy = data.budovy || [];
    var sloty = (data.minMaxSloty || []).slice().sort(function (a, b) {
      return (a.od || '').localeCompare(b.od || '');
    });

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
    var den, slot, duration, positions, pos, assignedThisSlot, person, bestId, bestRem, i, j;

    for (den = 1; den <= 5; den += 1) {
      for (i = 0; i < sloty.length; i += 1) {
        slot = sloty[i];
        if (!slotPlatnyProDen(slot, den)) continue;

        duration = slotDurationMinuty(slot);
        positions = positionsProSlot(slot, budovy);
        if (positions.length === 0) continue;

        assignedThisSlot = {};
        for (j = 0; j < positions.length; j += 1) {
          pos = positions[j];
          bestId = null;
          bestRem = -1;
          zamestnanci.forEach(function (z) {
            if (assignedThisSlot[z.id]) return;
            var r = remaining[z.id] || 0;
            if (r >= duration && r > bestRem) {
              bestRem = r;
              bestId = z.id;
            }
          });
          if (bestId == null) {
            return {
              ok: false,
              chyba: 'Nedostatek osob nebo úvazků pro ' + (den === 1 ? 'Po' : den === 2 ? 'Út' : den === 3 ? 'St' : den === 4 ? 'Čt' : 'Pá') + ', slot ' + (slot.od || '') + '–' + (slot.do || '') + '.'
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
