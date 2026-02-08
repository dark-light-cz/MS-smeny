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
  /** Platné hodnoty pro režim střídání dopoledne/odpoledne (C6). */
  var STRIDANI_REZIMY = ['preferenční', 'tvrdý'];

  function vychoziPravidla() {
    return {
      minimalniPrekryvMinuty: 120,
      vykryvaciBezMezer: true,
      vykryvaciMaxPresun: 1,
      minKmenovychNaTridu: 2,
      maxKmenovychNaTridu: 3,
      zakazPrechodMeziBudovami: true,
      // C6: Střídání dopoledne/odpoledne
      stridaniDopoledneOdpoledne: false,
      stridaniRezim: 'preferenční',
      stridaniHraniceMinuty: 720, // 12:00 = 720 min od půlnoci
      // C7: Preferovat souvislé bloky a méně dnů
      preferSouvisleBlok: false,
      minDelkaBlokuMinuty: null
    };
  }

  /** Platné hodnoty pro pole prechodMeziBudovami u zaměstnance. */
  var PRECHOD_BUDOVY_HODNOTY = ['výchozí', 'zakázat', 'povolit'];

  /**
   * Vytvoří záznam omezení „ne dohromady“ – dvojice osob, které nemají být spolu v jedné třídě/směně.
   * Id osob se uloží v kanonickém pořadí (osoba1Id ≤ osoba2Id) pro snadné porovnávání dvojic.
   * @param {string} osoba1Id - id prvního zaměstnance
   * @param {string} osoba2Id - id druhého zaměstnance
   * @returns {{ id: string, osoba1Id: string, osoba2Id: string }}
   */
  function vytvorOmezeniNeDohromady(osoba1Id, osoba2Id) {
    var id1 = (osoba1Id && typeof osoba1Id === 'string') ? osoba1Id : '';
    var id2 = (osoba2Id && typeof osoba2Id === 'string') ? osoba2Id : '';
    if (id1 > id2) {
      var t = id1;
      id1 = id2;
      id2 = t;
    }
    return {
      id: generujId(),
      osoba1Id: id1,
      osoba2Id: id2
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
      pravidla: vychoziPravidla(),
      omezeniNeDohromady: []
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
   * Normalizuje hodnotu „přiřazen pouze do“ (B1e): 'b:budovaId' nebo 't:tridaId', jinak null.
   * @param {string|*} hodnota
   * @returns {string|null}
   */
  function normalizujPrirazenoJen(hodnota) {
    if (typeof hodnota !== 'string' || hodnota.length < 4) return null;
    if (hodnota.indexOf('b:') === 0 || hodnota.indexOf('t:') === 0) return hodnota;
    return null;
  }

  /**
   * Struktura zaměstnance: id, jméno, úvazek, role, kmenová/vykrývací, přiřazená třída, nedostupnost, přechod mezi budovami, přiřazen pouze do (B1e).
   * kmenovaVykryvaci: 'kmenová' | 'vykrývací'. tridaId: id třídy (pouze u kmenové).
   * nedostupnost: pole objektů { den: 1–5 (Po–Pá), od: "HH:mm", do: "HH:mm" } – časová období v týdnu, kdy zaměstnanec nemůže pracovat.
   * prechodMeziBudovami: 'výchozí' | 'zakázat' | 'povolit' – lokální nastavení přechodu mezi budovami v jednom dni.
   * prirazenoJen: null | 'b:budovaId' | 't:tridaId' – zaměstnanec smí být přiřazen pouze do této budovy nebo pouze do této třídy (B1e).
   */
  function vytvorZamestnance(jmeno, uvazekMinutyTyden, role, kmenovaVykryvaci, tridaId, nedostupnost, prechodMeziBudovami, prirazenoJen) {
    return {
      id: generujId(),
      jmeno: jmeno || '',
      uvazekMinutyTyden: uvazekMinutyTyden != null ? uvazekMinutyTyden : 0,
      role: role || ROLE.UCITELKA,
      kmenovaVykryvaci: kmenovaVykryvaci === 'vykrývací' ? 'vykrývací' : 'kmenová',
      tridaId: (kmenovaVykryvaci === 'kmenová' && tridaId) ? tridaId : null,
      nedostupnost: normalizujNedostupnost(nedostupnost),
      prechodMeziBudovami: normalizujPrechodBudovy(prechodMeziBudovami),
      prirazenoJen: normalizujPrirazenoJen(prirazenoJen)
    };
  }

  /**
   * Normalizuje hodnotu přechodu mezi budovami.
   * @param {string|*} hodnota
   * @returns {'výchozí'|'zakázat'|'povolit'}
   */
  function normalizujPrechodBudovy(hodnota) {
    return PRECHOD_BUDOVY_HODNOTY.indexOf(hodnota) >= 0 ? hodnota : 'výchozí';
  }

  /**
   * Normalizuje pole nedostupnosti – ověří strukturu a vrátí čisté pole.
   * @param {Array|*} nedostupnost
   * @returns {Array<{den: number, od: string, do: string}>}
   */
  function normalizujNedostupnost(nedostupnost) {
    if (!Array.isArray(nedostupnost)) return [];
    return nedostupnost
      .filter(function (n) {
        return n && typeof n === 'object' &&
          typeof n.den === 'number' && n.den >= 1 && n.den <= 5 &&
          typeof n.od === 'string' && n.od.length >= 4 &&
          typeof n.do === 'string' && n.do.length >= 4;
      })
      .map(function (n) {
        return { den: n.den, od: n.od, do: n.do };
      });
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
    vytvorMinMaxSlot: vytvorMinMaxSlot,
    vytvorOmezeniNeDohromady: vytvorOmezeniNeDohromady,
    normalizujNedostupnost: normalizujNedostupnost,
    normalizujPrechodBudovy: normalizujPrechodBudovy,
    normalizujPrirazenoJen: normalizujPrirazenoJen,
    PRECHOD_BUDOVY_HODNOTY: PRECHOD_BUDOVY_HODNOTY,
    STRIDANI_REZIMY: STRIDANI_REZIMY
  };
})(typeof window !== 'undefined' ? window : this);
