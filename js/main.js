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
      console.log('Aplikace MS-smeny načtena.');
    });
  }

  init();
})();
