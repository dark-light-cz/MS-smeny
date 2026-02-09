/**
 * Facade výpočtu směn – deleguje na vybraný algoritmus z registru.
 * Zachovává API MSemenyVypocetSmen.vypocetSmen(data, algorithmId?) a helpery pro testy.
 */
(function (global) {
  'use strict';

  /**
   * Sloučí přiřazení asistentek s přiřazením z pedagogického algoritmu (podle den + zamestnanecId).
   * @param {Array} prirazeniAsistentek
   * @param {Array} prirazeniPedagog
   * @returns {Array} sloučené prirazeni
   */
  function sloucPrirazeni(prirazeniAsistentek, prirazeniPedagog) {
    var map = {}; // key "den|zamestnanecId" -> { den, zamestnanecId, segmenty: [] }
    function addToMap(arr) {
      for (var i = 0; i < (arr || []).length; i++) {
        var p = arr[i];
        var key = p.den + '|' + (p.zamestnanecId || '');
        if (!map[key]) map[key] = { den: p.den, zamestnanecId: p.zamestnanecId, segmenty: [] };
        var segs = p.segmenty || [];
        for (var j = 0; j < segs.length; j++) map[key].segmenty.push(segs[j]);
      }
    }
    addToMap(prirazeniAsistentek);
    addToMap(prirazeniPedagog);
    var out = [];
    for (var k in map) {
      if (map.hasOwnProperty(k)) out.push(map[k]);
    }
    out.sort(function (a, b) {
      if (a.den !== b.den) return a.den - b.den;
      return (a.zamestnanecId || '').localeCompare(b.zamestnanecId || '');
    });
    return out;
  }

  /**
   * Vypočte návrh směn: nejprve validace asistentek (třída), pak umístění asistentek, pak zvolený algoritmus pro pedagogy, sloučení.
   * @param {Object} data - konfigurace (zamestnanci, budovy, minMaxSloty, pravidla, omezeniNeDohromady)
   * @param {string} [algorithmId] - id algoritmu (např. 'zakladni'); nepovinné = výchozí
   * @returns {{ ok: boolean, prirazeni?: Array, chyba?: string, varovani?: Array }}
   */
  function vypocetSmen(data, algorithmId) {
    var UmisteniAsistentek = global.MSemenyUmisteniAsistentek;
    if (UmisteniAsistentek && typeof UmisteniAsistentek.validaceAsistentekHaveTridu === 'function') {
      var val = UmisteniAsistentek.validaceAsistentekHaveTridu(data);
      if (!val.ok) return { ok: false, chyba: val.chyba };
    }

    var prirazeniAsistentek = [];
    if (UmisteniAsistentek && typeof UmisteniAsistentek.vypocetUmisteniAsistentek === 'function') {
      prirazeniAsistentek = UmisteniAsistentek.vypocetUmisteniAsistentek(data);
    }

    var Algoritmy = global.MSemenyAlgoritmy;
    if (!Algoritmy || !Algoritmy.getAlgoritmus) {
      return { ok: false, chyba: 'Registr algoritmů není k dispozici.' };
    }
    var algo = Algoritmy.getAlgoritmus(algorithmId);
    if (!algo || typeof algo.vypocet !== 'function') {
      return { ok: false, chyba: 'Algoritmus "' + (algorithmId || Algoritmy.vychoziId()) + '" není k dispozici.' };
    }
    var result = algo.vypocet(data);
    if (!result.ok) return result;

    var prirazeni = sloucPrirazeni(prirazeniAsistentek, result.prirazeni || []);
    result.prirazeni = prirazeni;
    return result;
  }

  var Helpers = global.MSemenyAlgoritmusZakladniHelpers || {};

  global.MSemenyVypocetSmen = {
    vypocetSmen: vypocetSmen,
    slotDurationMinuty: Helpers.slotDurationMinuty,
    positionsProSlot: Helpers.positionsProSlot,
    _buildAvailMask: Helpers._buildAvailMask,
    _longestAvailBlock: Helpers._longestAvailBlock,
    _maZakazPrechodu: Helpers._maZakazPrechodu,
    _getShiftTypeFromSegmenty: Helpers._getShiftTypeFromSegmenty,
    _validujStridaniTvrdy: Helpers._validujStridaniTvrdy
  };
})(typeof window !== 'undefined' ? window : this);
