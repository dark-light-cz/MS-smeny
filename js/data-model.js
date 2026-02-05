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
      { id: generujId(), od: '07:00', do: '07:45', minNaBudovu: 1, maxNaBudovu: null, minNaTridu: 0, maxNaTridu: null, dny: [], rotace: false },
      { id: generujId(), od: '07:45', do: '17:00', minNaTridu: 1, maxNaTridu: null, minNaBudovu: 0, maxNaBudovu: null, dny: [], rotace: false }
    ];
  }

  /**
   * Vytvoří nový časový slot pro min/max počet osob.
   * Volitelně: dny (1=Po … 5=Pá; prázdné = platí všechny pracovní dny), rotace (požadovat střídání osob).
   * @param {string} od - čas od (HH:mm)
   * @param {string} do_ - čas do (HH:mm)
   * @param {number|null} minNaBudovu - minimální počet osob na budovu (null/undefined → 0)
   * @param {number|null} maxNaBudovu - maximální počet na budovu (null/undefined → neomezeno)
   * @param {number|null} minNaTridu - minimální počet na třídu
   * @param {number|null} maxNaTridu - maximální počet na třídu
   * @param {number[]} [dny] - dny v týdnu (1–5); prázdné/undefined = všechny
   * @param {boolean} [rotace] - požadovat střídání (aby v slotu nebyla pořád stejná osoba)
   * @returns {Object}
   */
  function vytvorMinMaxSlot(od, do_, minNaBudovu, maxNaBudovu, minNaTridu, maxNaTridu, dny, rotace) {
    var dnyNorm = Array.isArray(dny) ? dny.filter(function (d) { return d >= 1 && d <= 5; }) : [];
    return {
      id: generujId(),
      od: od || '07:00',
      do: do_ || '17:00',
      minNaBudovu: minNaBudovu != null && minNaBudovu !== '' ? parseInt(minNaBudovu, 10) : 0,
      maxNaBudovu: (maxNaBudovu != null && maxNaBudovu !== '') ? parseInt(maxNaBudovu, 10) : null,
      minNaTridu: minNaTridu != null && minNaTridu !== '' ? parseInt(minNaTridu, 10) : 0,
      maxNaTridu: (maxNaTridu != null && maxNaTridu !== '') ? parseInt(maxNaTridu, 10) : null,
      dny: dnyNorm,
      rotace: !!rotace
    };
  }

  /**
   * Výchozí pravidla (minimální překryv, kmenové/vykrývací, atd.).
   * @returns {Object}
   */
  function vychoziPravidla() {
    return {
      minimalniPrekryvMinuty: 120,
      vykryvaciBezMezer: true,
      vykryvaciMaxPresun: 1,
      minKmenovychNaTridu: 2,
      maxKmenovychNaTridu: 3
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
   * Struktura zaměstnance: id, jméno, úvazek, role, kmenová/vykrývací, přiřazená třída.
   * kmenovaVykryvaci: 'kmenová' | 'vykrývací'. tridaId: id třídy (pouze u kmenové).
   */
  function vytvorZamestnance(jmeno, uvazekMinutyTyden, role, kmenovaVykryvaci, tridaId) {
    return {
      id: generujId(),
      jmeno: jmeno || '',
      uvazekMinutyTyden: uvazekMinutyTyden != null ? uvazekMinutyTyden : 0,
      role: role || ROLE.UCITELKA,
      kmenovaVykryvaci: kmenovaVykryvaci === 'vykrývací' ? 'vykrývací' : 'kmenová',
      tridaId: (kmenovaVykryvaci === 'kmenová' && tridaId) ? tridaId : null
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
    vytvorZamestnance: vytvorZamestnance,
    vytvorMinMaxSlot: vytvorMinMaxSlot
  };
})(typeof window !== 'undefined' ? window : this);
