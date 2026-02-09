/**
 * Hlavní vstupní bod aplikace MS-smeny.
 * Čistý JavaScript, žádné frameworky.
 */
(function () {
  'use strict';

  function init() {
    document.addEventListener('DOMContentLoaded', function () {
      // Načtení dat z Local Storage (nebo výchozí stav)
      if (window.MSemenyStorage) {
        window.MSemenyStorage.nacti();
      }
      // Doplní chybějící barvy zaměstnancům (pro graf návrhu) a uloží
      if (window.MSemenyNavrhGraf && typeof window.MSemenyNavrhGraf.doplnBarvyZamestnancum === 'function') {
        window.MSemenyNavrhGraf.doplnBarvyZamestnancum();
      }
      console.log('Aplikace MS-smeny načtena.');
    });
  }

  init();
})();
