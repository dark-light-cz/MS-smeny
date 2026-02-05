/**
 * Datový model aplikace MS-smeny.
 * Definice struktury dat, konstant a výchozího stavu.
 */
(function (global) {
  'use strict';

  /** Verze schématu dat (pro budoucí migrace). */
  var SCHEMA_VERSION = 1;

  /** Dostupné role zaměstnanců. */
  var ROLE = {
    UCITELKA: 'učitelka',
    ASISTENTKA: 'asistentka pedagoga',
    SKOLNIK: 'školník/školnice',
    REDITELKA: 'ředitelka',
    ZASTUPKYNE: 'zástupkyně'
  };

  /** Seznam rolí pro výběr (pořadí). */
  var ROLE_SEZNAM = [
    ROLE.UCITELKA,
    ROLE.ASISTENTKA,
    ROLE.SKOLNIK,
    ROLE.REDITELKA,
    ROLE.ZASTUPKYNE
  ];

  /**
   * Vygeneruje jednoduché unikátní id (pro použití v modelu).
   * @returns {string}
   */
  function generujId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  /**
   * Výchozí otevírací doba: po–pá 7:00–17:00.
   * @returns {Object} { dny: [1,2,3,4,5], od: "07:00", do: "17:00" }
   */
  function vychoziOteviraciDoba() {
    return {
      dny: [1, 2, 3, 4, 5],
      od: '07:00',
      do: '17:00'
    };
  }

  /**
   * Výchozí časové sloty pro min/max počet osob (příklad: ráno jedna na budovu, od 7:45 jedna na třídu).
   * @returns {Array<Object>}
   */
  function vychoziMinMaxSloty() {
    return [
      { id: generujId(), od: '07:00', do: '07:45', minNaBudovu: 1, maxNaBudovu: null, minNaTridu: 0, maxNaTridu: null },
      { id: generujId(), od: '07:45', do: '17:00', minNaTridu: 1, maxNaTridu: null, minNaBudovu: 0, maxNaBudovu: null }
    ];
  }

  /**
   * Výchozí pravidla (minimální překryv v minutách, atd.).
   * @returns {Object}
   */
  function vychoziPravidla() {
    return {
      minimalniPrekryvMinuty: 120
    };
  }

  /**
   * Prázdný výchozí stav aplikace – všechny entity prázdné, pravidla a sloty s výchozími hodnotami.
   * @returns {Object} Kompletní objekt dat pro uložení / načtení
   */
  function vychoziStav() {
    return {
      version: SCHEMA_VERSION,
      zamestnanci: [],
      budovy: [],
      minMaxSloty: vychoziMinMaxSloty(),
      pravidla: vychoziPravidla()
    };
  }

  /**
   * Struktura jedné budovy: id, název, volitelná otevírací doba, seznam tříd.
   * Třída: { id, nazev }.
   */
  function vytvorBudovu(nazev) {
    return {
      id: generujId(),
      nazev: nazev || '',
      oteviraciDoba: vychoziOteviraciDoba(),
      tridy: []
    };
  }

  function vytvorTridu(nazev) {
    return {
      id: generujId(),
      nazev: nazev || '',
      oteviraciDoba: vychoziOteviraciDoba()
    };
  }

  /**
   * Struktura zaměstnance: id, jméno, úvazek v minutách za týden, role.
   */
  function vytvorZamestnance(jmeno, uvazekMinutyTyden, role) {
    return {
      id: generujId(),
      jmeno: jmeno || '',
      uvazekMinutyTyden: uvazekMinutyTyden != null ? uvazekMinutyTyden : 0,
      role: role || ROLE.UCITELKA
    };
  }

  // Export do globálního objektu (bez build stepu)
  global.MSemenyDataModel = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    ROLE: ROLE,
    ROLE_SEZNAM: ROLE_SEZNAM,
    generujId: generujId,
    vychoziStav: vychoziStav,
    vychoziOteviraciDoba: vychoziOteviraciDoba,
    vychoziMinMaxSloty: vychoziMinMaxSloty,
    vychoziPravidla: vychoziPravidla,
    vytvorBudovu: vytvorBudovu,
    vytvorTridu: vytvorTridu,
    vytvorZamestnance: vytvorZamestnance
  };
})(typeof window !== 'undefined' ? window : this);
