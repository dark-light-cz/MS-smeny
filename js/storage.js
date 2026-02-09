/**
 * Úložiště dat aplikace MS-smeny – Local Storage.
 * Načtení při startu, uložení při každé změně dat.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'ms-smeny-data';

  /** Aktuální data v paměti (jediný zdroj pravdy). */
  var data = null;

  /**
   * Načte data z Local Storage. Pokud nejsou nebo jsou neplatná, vrátí výchozí stav.
   * @returns {Object} Objekt dat (odkaz na vnitřní stav)
   */
  function nacti() {
    if (data !== null) {
      return data;
    }
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.zamestnanci) && Array.isArray(parsed.budovy)) {
          data = parsed;
          var Model = global.MSemenyDataModel;
          if (Model && typeof Model.normalizujZamestnance === 'function') {
            for (var zi = 0; zi < data.zamestnanci.length; zi += 1) {
              Model.normalizujZamestnance(data.zamestnanci[zi]);
            }
          }
          return data;
        }
      }
    } catch (e) {
      console.warn('MS-smeny: Nepodařilo se načíst data z Local Storage, použijí se výchozí.', e);
    }
    var Model = global.MSemenyDataModel;
    if (!Model || !Model.vychoziStav) {
      throw new Error('MS-smeny: data-model.js musí být načten před storage.js');
    }
    data = Model.vychoziStav();
    return data;
  }

  /**
   * Uloží aktuální data do Local Storage.
   */
  function uloz() {
    if (data === null) {
      return;
    }
    try {
      if (global.localStorage) {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('MS-smeny: Nepodařilo se uložit data do Local Storage.', e);
    }
  }

  /**
   * Vrátí aktuální data (načte je při prvním volání).
   * @returns {Object} Odkaz na vnitřní objekt dat – úpravy se projeví v modelu, ale pro persistenci je potřeba volat setData nebo uloz().
   */
  function getData() {
    return nacti();
  }

  /**
   * Nahradí celá data novým objektem a uloží do Local Storage.
   * @param {Object} novyStav Celý objekt dat (zamestnanci, budovy, minMaxSloty, pravidla, version)
   */
  function setData(novyStav) {
    if (!novyStav || typeof novyStav !== 'object') {
      return;
    }
    data = novyStav;
    uloz();
  }

  /**
   * Upraví data pomocí funkce a výsledek uloží.
   * Vhodné pro imutabilní úpravy: replaceData(function (d) { return { ...d, zamestnanci: [...]; }; });
   * @param {function(Object): Object} fn Funkce přijme aktuální data, vrátí nová data.
   */
  function replaceData(fn) {
    nacti();
    if (typeof fn === 'function') {
      data = fn(data);
      uloz();
    }
  }

  /**
   * Vynutí uložení aktuálního stavu do Local Storage (např. po přímé úpravě getData()).
   */
  function ulozNyni() {
    if (data !== null) {
      uloz();
    }
  }

  /**
   * Zruší cache v paměti – další getData()/nacti() načte z Local Storage nebo výchozí stav.
   * Užitečné pro testy a pro reload po importu dat.
   */
  function resetCache() {
    data = null;
  }

  // Export API
  global.MSemenyStorage = {
    getData: getData,
    setData: setData,
    replaceData: replaceData,
    ulozNyni: ulozNyni,
    nacti: nacti,
    resetCache: resetCache
  };
})(typeof window !== 'undefined' ? window : this);
