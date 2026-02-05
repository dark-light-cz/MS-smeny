/**
 * Pravidlo minimálního překryvu v třídě (C1) – konfigurace a uložení do modelu.
 */
(function (global) {
  'use strict';

  var Storage = global.MSemenyStorage;
  var Model = global.MSemenyDataModel;

  function getData() {
    return Storage ? Storage.getData() : { pravidla: {} };
  }

  function zobrazZpravu(text) {
    var el = document.getElementById('prekryv-zprava');
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    if (text) {
      setTimeout(function () { el.hidden = true; el.textContent = ''; }, 3000);
    }
  }

  /** Načte aktuální hodnotu z dat a vyplní formulář. */
  function vyplnFormular() {
    var data = getData();
    var pravidla = data.pravidla || {};
    var minuty = (pravidla.minimalniPrekryvMinuty != null) ? pravidla.minimalniPrekryvMinuty : (Model && Model.vychoziPravidla ? Model.vychoziPravidla().minimalniPrekryvMinuty : 120);
    var hodiny = minuty / 60;
    var input = document.getElementById('prekryv-hodiny');
    if (input) input.value = hodiny === Math.floor(hodiny) ? hodiny : Math.round(hodiny * 10) / 10;
  }

  function odeslatFormular(e) {
    e.preventDefault();
    var input = document.getElementById('prekryv-hodiny');
    if (!input) return;
    var hodiny = parseFloat(input.value, 10);
    if (isNaN(hodiny) || hodiny < 0) {
      hodiny = 0;
    }
    if (hodiny > 24) {
      hodiny = 24;
    }
    var minuty = Math.round(hodiny * 60);

    if (!Storage || !Storage.replaceData) return;
    Storage.replaceData(function (d) {
      d.pravidla = d.pravidla || {};
      d.pravidla.minimalniPrekryvMinuty = minuty;
      return d;
    });
    zobrazZpravu('Pravidlo překryvu bylo uloženo.');
  }

  function init() {
    if (!Storage) return;
    vyplnFormular();
    var form = document.getElementById('prekryv-form');
    if (form) {
      form.addEventListener('submit', odeslatFormular);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.MSemenyPravidlaPrekryv = {
    vyplnFormular: vyplnFormular
  };
})(typeof window !== 'undefined' ? window : this);
