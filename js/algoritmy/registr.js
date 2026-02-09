/**
 * Registr výpočetních algoritmů pro návrh směn.
 * Každý algoritmus je objekt s API: { id: string, nazev: string, vypocet: function(data) }.
 * vypocet(data) vrací { ok: boolean, prirazeni?: Array, chyba?: string, varovani?: Array }.
 */
(function (global) {
  'use strict';

  var VYCHOZI_ID = 'parove-tridy';

  var algoritmy = [];

  if (global.MSemenyAlgoritmusZakladni) {
    algoritmy.push(global.MSemenyAlgoritmusZakladni);
  }
  if (global.MSemenyAlgoritmusParoveTridy) {
    algoritmy.push(global.MSemenyAlgoritmusParoveTridy);
  }

  /**
   * Vrátí seznam dostupných algoritmů pro výběr v UI.
   * @returns {Array<{ id: string, nazev: string }>}
   */
  function dostupneAlgoritmy() {
    return algoritmy.map(function (a) {
      return { id: a.id, nazev: a.nazev };
    });
  }

  /**
   * Vrátí algoritmus podle id. Pokud id chybí nebo neexistuje, vrátí výchozí.
   * @param {string} [id] - id algoritmu (např. 'zakladni')
   * @returns {{ id: string, nazev: string, vypocet: function }|null}
   */
  function getAlgoritmus(id) {
    var hledaneId = id || VYCHOZI_ID;
    for (var i = 0; i < algoritmy.length; i++) {
      if (algoritmy[i].id === hledaneId) return algoritmy[i];
    }
    return algoritmy.length > 0 ? algoritmy[0] : null;
  }

  /**
   * Výchozí id algoritmu (pro UI a fallback).
   * @returns {string}
   */
  function vychoziId() {
    return VYCHOZI_ID;
  }

  global.MSemenyAlgoritmy = {
    dostupneAlgoritmy: dostupneAlgoritmy,
    getAlgoritmus: getAlgoritmus,
    vychoziId: vychoziId
  };
})(typeof window !== 'undefined' ? window : this);
