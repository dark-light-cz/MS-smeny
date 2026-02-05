/**
 * Navigace mezi sekcemi aplikace MS-smeny.
 * Jedna stránka – sekce se přepínají v JS (zobrazení/skrytí).
 */
(function () {
  'use strict';

  var ID_SEKCÍ = ['prehled', 'zamestnanci', 'budovy-tridy', 'pravidla', 'navrh-smen'];
  var AKTIVNI_TRIDA = 'aktivni';

  /**
   * Zobrazí jen zadanou sekci, ostatní skryje. Aktualizuje aktivní stav v navigaci.
   * @param {string} idSekce - id sekce (prehled, zamestnanci, …)
   */
  function zobrazSekci(idSekce) {
    if (ID_SEKCÍ.indexOf(idSekce) === -1) {
      idSekce = 'prehled';
    }
    var i;
    var sekce;
    var odkaz;
    for (i = 0; i < ID_SEKCÍ.length; i += 1) {
      sekce = document.getElementById(ID_SEKCÍ[i]);
      if (sekce) {
        sekce.hidden = ID_SEKCÍ[i] !== idSekce;
      }
      odkaz = document.querySelector('.nav-odkaz[data-sekce="' + ID_SEKCÍ[i] + '"]');
      if (odkaz) {
        if (ID_SEKCÍ[i] === idSekce) {
          odkaz.classList.add(AKTIVNI_TRIDA);
          odkaz.setAttribute('aria-current', 'page');
        } else {
          odkaz.classList.remove(AKTIVNI_TRIDA);
          odkaz.removeAttribute('aria-current');
        }
      }
    }
    try {
      window.history.replaceState(null, '', '#' + idSekce);
    } catch (e) {
      // replaceState nemusí být dostupné ve všech prostředích
    }
  }

  /**
   * Vrátí id sekce z aktuálního hash (#prehled → prehled). Pokud hash neodpovídá žádné sekci, vrátí 'prehled'.
   */
  function sekceZHash() {
    var hash = (window.location.hash || '').replace(/^#/, '');
    return ID_SEKCÍ.indexOf(hash) !== -1 ? hash : 'prehled';
  }

  /**
   * Inicializuje navigaci: naváže posluchače na odkazy a nastaví zobrazenou sekci podle hash nebo Přehled.
   */
  function init() {
    var odkazy = document.querySelectorAll('.nav-odkaz[data-sekce]');
    var i;
    var idSekce;

    for (i = 0; i < odkazy.length; i += 1) {
      odkazy[i].addEventListener('click', function (e) {
        idSekce = e.currentTarget.getAttribute('data-sekce');
        if (idSekce) {
          e.preventDefault();
          zobrazSekci(idSekce);
        }
      });
    }

    window.addEventListener('hashchange', function () {
      zobrazSekci(sekceZHash());
    });

    zobrazSekci(sekceZHash());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.MSemenyNavigace = {
    zobrazSekci: zobrazSekci,
    sekceZHash: sekceZHash,
    getIdSekci: function () { return ID_SEKCÍ.slice(); }
  };
})();
