/**
 * Umísťování asistentek – první krok výpočtu směn.
 * Každá asistentka musí mít přiřazenu třídu (tridaId). Úvazek se rovnoměrně rozdělí do 5 dnů
 * (zaokrouhlování na 15 min: první den dolů, zbytek dělíme 4/3/2, pátý den = zbytek).
 * Směna vždy od 7:45, délka = denní minuty.
 */
(function (global) {
  'use strict';

  var M = global.MSemenyDataModel;
  var TYPY_UMISTENI = (M && M.TYPY_UMISTENI) ? M.TYPY_UMISTENI : { ASISTENTI: 'asistenti' };

  function getUvazekAsistenti(z) {
    if (!M || typeof M.getUvazekMinutyZamestnanceProUmisteni !== 'function') return 0;
    return M.getUvazekMinutyZamestnanceProUmisteni(z, TYPY_UMISTENI.ASISTENTI);
  }

  /** Vrátí true, pokud třída tridaId existuje v nějaké budově. */
  function tridaExistuje(budovy, tridaId) {
    if (!tridaId || !budovy) return false;
    for (var i = 0; i < budovy.length; i++) {
      var b = budovy[i];
      if (b.tridy) {
        for (var j = 0; j < b.tridy.length; j++) {
          if (b.tridy[j].id === tridaId) return true;
        }
      }
    }
    return false;
  }

  /** Vrátí id budovy, ve které je třída tridaId. */
  function findBudovaForTrida(budovy, tridaId) {
    if (!tridaId || !budovy) return null;
    for (var i = 0; i < budovy.length; i++) {
      var b = budovy[i];
      if (b.tridy) {
        for (var j = 0; j < b.tridy.length; j++) {
          if (b.tridy[j].id === tridaId) return b.id;
        }
      }
    }
    return null;
  }

  /**
   * Validace: každá asistentka (úvazek v roli asistentka > 0) musí mít přiřazenu třídu (tridaId), která existuje v budovách.
   * @param {Object} data - konfigurace (zamestnanci, budovy)
   * @returns {{ ok: boolean, chyba?: string }}
   */
  function validaceAsistentekHaveTridu(data) {
    var zamestnanci = data.zamestnanci || [];
    var budovy = data.budovy || [];
    for (var i = 0; i < zamestnanci.length; i++) {
      var z = zamestnanci[i];
      var uvazek = getUvazekAsistenti(z);
      if (uvazek <= 0) continue;
      if (!z.tridaId || z.tridaId === '') {
        return { ok: false, chyba: 'Každá asistentka musí mít přiřazenu třídu. U zaměstnance „' + (z.jmeno || z.id) + '“ třída chybí.' };
      }
      if (!tridaExistuje(budovy, z.tridaId)) {
        return { ok: false, chyba: 'Zaměstnanec ' + (z.jmeno || z.id) + ' má přiřazenu třídu, která v budovách neexistuje.' };
      }
    }
    return { ok: true };
  }

  /** Zaokrouhlí minuty dolů na mřížku 15 minut. */
  function roundDown15(m) {
    return Math.floor(m / 15) * 15;
  }

  /** Minuty na HH:mm */
  function minutyToHhmm(minuty) {
    var m = Math.max(0, Math.floor(minuty));
    var h = Math.floor(m / 60);
    var min = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (min < 10 ? '0' : '') + min;
  }

  /**
   * Rozdělí týdenní minuty do 5 dnů: první den zaokrouhleno na 15 min dolů, zbytek dělíme 4/3/2, pátý den = zbytek.
   * @param {number} totalMinuty - celkový úvazek za týden
   * @returns {number[]} [d1, d2, d3, d4, d5] minuty na den
   */
  function rozdelMinutyNaDny(totalMinuty) {
    var d1 = roundDown15(totalMinuty / 5);
    var rest = totalMinuty - d1;
    var d2 = roundDown15(rest / 4);
    rest -= d2;
    var d3 = roundDown15(rest / 3);
    rest -= d3;
    var d4 = roundDown15(rest / 2);
    rest -= d4;
    var d5 = rest;
    return [d1, d2, d3, d4, d5];
  }

  /**
   * Vypočte umísťování asistentek: pro každou asistentku rovnoměrný split do 5 dnů, směna od 7:45 v její přiřazené třídě.
   * @param {Object} data - konfigurace (zamestnanci, budovy)
   * @returns {Array<{ den: number, zamestnanecId: string, segmenty: Array<{ od, do, tridaId, budovaId, typUmisteni }> }>}
   */
  function vypocetUmisteniAsistentek(data) {
    var zamestnanci = data.zamestnanci || [];
    var budovy = data.budovy || [];
    var START_OD = '07:45';
    var startMin = 7 * 60 + 45;
    var prirazeni = [];

    for (var i = 0; i < zamestnanci.length; i++) {
      var z = zamestnanci[i];
      var total = getUvazekAsistenti(z);
      if (total <= 0 || !z.tridaId) continue;

      var budovaId = findBudovaForTrida(budovy, z.tridaId) || null;
      var dny = rozdelMinutyNaDny(total);

      for (var d = 0; d < 5; d++) {
        var den = d + 1;
        var minuty = dny[d];
        if (minuty <= 0) continue;

        var doMin = startMin + minuty;
        var doHhmm = minutyToHhmm(doMin);
        var segmenty = [{
          od: START_OD,
          do: doHhmm,
          tridaId: z.tridaId,
          budovaId: budovaId || undefined,
          typUmisteni: 'asistenti'
        }];
        prirazeni.push({ den: den, zamestnanecId: z.id, segmenty: segmenty });
      }
    }
    return prirazeni;
  }

  global.MSemenyUmisteniAsistentek = {
    validaceAsistentekHaveTridu: validaceAsistentekHaveTridu,
    vypocetUmisteniAsistentek: vypocetUmisteniAsistentek
  };
})(typeof window !== 'undefined' ? window : this);
