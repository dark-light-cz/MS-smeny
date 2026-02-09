/**
 * Facade výpočtu směn – deleguje na vybraný algoritmus z registru.
 * Zachovává API MSemenyVypocetSmen.vypocetSmen(data, algorithmId?) a helpery pro testy.
 */
(function (global) {
  'use strict';

  /**
   * Vypočte návrh směn pomocí zvoleného (nebo výchozího) algoritmu.
   * @param {Object} data - konfigurace (zamestnanci, budovy, minMaxSloty, pravidla, omezeniNeDohromady)
   * @param {string} [algorithmId] - id algoritmu (např. 'zakladni'); nepovinné = výchozí
   * @returns {{ ok: boolean, prirazeni?: Array, chyba?: string, varovani?: Array }}
   */
  function vypocetSmen(data, algorithmId) {
    var Algoritmy = global.MSemenyAlgoritmy;
    if (!Algoritmy || !Algoritmy.getAlgoritmus) {
      return { ok: false, chyba: 'Registr algoritmů není k dispozici.' };
    }
    var algo = Algoritmy.getAlgoritmus(algorithmId);
    if (!algo || typeof algo.vypocet !== 'function') {
      return { ok: false, chyba: 'Algoritmus "' + (algorithmId || Algoritmy.vychoziId()) + '" není k dispozici.' };
    }
    return algo.vypocet(data);
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
