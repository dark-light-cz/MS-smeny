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

  function zobrazZpravuVykryvaci(text) {
    var el = document.getElementById('vykryvaci-zprava');
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    if (text) {
      setTimeout(function () { el.hidden = true; el.textContent = ''; }, 3000);
    }
  }

  function vyplnVykryvaciFormular() {
    var data = getData();
    var p = data.pravidla || {};
    var vychozi = Model && Model.vychoziPravidla ? Model.vychoziPravidla() : {};
    var bezMezer = p.vykryvaciBezMezer != null ? p.vykryvaciBezMezer : vychozi.vykryvaciBezMezer !== false;
    var maxPresun = p.vykryvaciMaxPresun != null ? p.vykryvaciMaxPresun : (vychozi.vykryvaciMaxPresun != null ? vychozi.vykryvaciMaxPresun : 1);
    var cb = document.getElementById('vykryvaci-bez-mezer');
    var inp = document.getElementById('vykryvaci-max-presun');
    if (cb) cb.checked = !!bezMezer;
    if (inp) inp.value = Math.max(0, Math.min(10, parseInt(maxPresun, 10) || 0));
  }

  function odeslatVykryvaciFormular(e) {
    e.preventDefault();
    var cb = document.getElementById('vykryvaci-bez-mezer');
    var inp = document.getElementById('vykryvaci-max-presun');
    var bezMezer = cb ? !!cb.checked : true;
    var maxPresun = (inp && inp.value !== '') ? Math.max(0, Math.min(10, parseInt(inp.value, 10) || 0)) : 1;
    if (!Storage || !Storage.replaceData) return;
    Storage.replaceData(function (d) {
      d.pravidla = d.pravidla || {};
      d.pravidla.vykryvaciBezMezer = bezMezer;
      d.pravidla.vykryvaciMaxPresun = maxPresun;
      return d;
    });
    zobrazZpravuVykryvaci('Pravidla pro vykrývací byla uložena.');
  }

  // --- Přechod mezi budovami (C5) ---

  function zobrazZpravuPrechodBudovy(text) {
    var el = document.getElementById('prechod-budovy-zprava');
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    if (text) {
      setTimeout(function () { el.hidden = true; el.textContent = ''; }, 3000);
    }
  }

  function vyplnPrechodBudovyFormular() {
    var data = getData();
    var p = data.pravidla || {};
    var vychozi = Model && Model.vychoziPravidla ? Model.vychoziPravidla() : {};
    var zakazat = p.zakazPrechodMeziBudovami != null ? p.zakazPrechodMeziBudovami : (vychozi.zakazPrechodMeziBudovami !== false);
    var cb = document.getElementById('prechod-budovy-zakazat');
    if (cb) cb.checked = !!zakazat;
  }

  function odeslatPrechodBudovyFormular(e) {
    e.preventDefault();
    var cb = document.getElementById('prechod-budovy-zakazat');
    var zakazat = cb ? !!cb.checked : true;
    if (!Storage || !Storage.replaceData) return;
    Storage.replaceData(function (d) {
      d.pravidla = d.pravidla || {};
      d.pravidla.zakazPrechodMeziBudovami = zakazat;
      return d;
    });
    zobrazZpravuPrechodBudovy('Nastavení přechodu mezi budovami bylo uloženo.');
  }

  // --- Střídání dopoledne/odpoledne (C6) ---

  function zobrazZpravuStridani(text) {
    var el = document.getElementById('stridani-zprava');
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    if (text) {
      setTimeout(function () { el.hidden = true; el.textContent = ''; }, 3000);
    }
  }

  /** Převede minuty od půlnoci na HH:mm. */
  function minutyNaHhmm(minuty) {
    var h = Math.floor(minuty / 60);
    var m = minuty % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /** Převede HH:mm na minuty od půlnoci. */
  function hhmmNaMinuty(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return 720;
    var parts = hhmm.split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }

  function vyplnStridaniFormular() {
    var data = getData();
    var p = data.pravidla || {};
    var vychozi = Model && Model.vychoziPravidla ? Model.vychoziPravidla() : {};
    var zapnuto = p.stridaniDopoledneOdpoledne != null ? !!p.stridaniDopoledneOdpoledne : !!vychozi.stridaniDopoledneOdpoledne;
    var rezim = p.stridaniRezim || vychozi.stridaniRezim || 'preferenční';
    var hraniceMin = p.stridaniHraniceMinuty != null ? p.stridaniHraniceMinuty : (vychozi.stridaniHraniceMinuty || 720);

    var cb = document.getElementById('stridani-zapnuto');
    var sel = document.getElementById('stridani-rezim');
    var inp = document.getElementById('stridani-hranice');
    if (cb) cb.checked = zapnuto;
    if (sel) sel.value = rezim;
    if (inp) inp.value = minutyNaHhmm(hraniceMin);
  }

  function odeslatStridaniFormular(e) {
    e.preventDefault();
    var cb = document.getElementById('stridani-zapnuto');
    var sel = document.getElementById('stridani-rezim');
    var inp = document.getElementById('stridani-hranice');
    var zapnuto = cb ? !!cb.checked : false;
    var rezim = sel ? sel.value : 'preferenční';
    var validniRezimy = Model && Model.STRIDANI_REZIMY ? Model.STRIDANI_REZIMY : ['preferenční', 'tvrdý'];
    if (validniRezimy.indexOf(rezim) < 0) rezim = 'preferenční';
    var hraniceMin = inp ? hhmmNaMinuty(inp.value) : 720;

    if (!Storage || !Storage.replaceData) return;
    Storage.replaceData(function (d) {
      d.pravidla = d.pravidla || {};
      d.pravidla.stridaniDopoledneOdpoledne = zapnuto;
      d.pravidla.stridaniRezim = rezim;
      d.pravidla.stridaniHraniceMinuty = hraniceMin;
      return d;
    });
    zobrazZpravuStridani('Nastavení střídání dopoledne/odpoledne bylo uloženo.');
  }

  // --- Souvislé bloky a méně dnů (C7) ---

  function zobrazZpravuSouvisleBlok(text) {
    var el = document.getElementById('souvisle-bloky-zprava');
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    if (text) {
      setTimeout(function () { el.hidden = true; el.textContent = ''; }, 3000);
    }
  }

  function vyplnSouvisleBlokFormular() {
    var data = getData();
    var p = data.pravidla || {};
    var vychozi = Model && Model.vychoziPravidla ? Model.vychoziPravidla() : {};
    var zapnuto = p.preferSouvisleBlok != null ? !!p.preferSouvisleBlok : !!vychozi.preferSouvisleBlok;
    var minMinuty = p.minDelkaBlokuMinuty != null ? p.minDelkaBlokuMinuty : vychozi.minDelkaBlokuMinuty;

    var cb = document.getElementById('souvisle-bloky-zapnuto');
    var inp = document.getElementById('souvisle-bloky-min-delka');
    if (cb) cb.checked = zapnuto;
    if (inp) {
      if (minMinuty != null && !isNaN(minMinuty)) {
        inp.value = Math.round(minMinuty / 60 * 10) / 10; // minuty → hodiny
      } else {
        inp.value = '';
      }
    }
  }

  function odeslatSouvisleBlokFormular(e) {
    e.preventDefault();
    var cb = document.getElementById('souvisle-bloky-zapnuto');
    var inp = document.getElementById('souvisle-bloky-min-delka');
    var zapnuto = cb ? !!cb.checked : false;
    var hodiny = inp ? parseFloat(inp.value) : NaN;
    var minMinuty = null;
    if (!isNaN(hodiny) && hodiny > 0) {
      minMinuty = Math.round(hodiny * 60);
    }

    if (!Storage || !Storage.replaceData) return;
    Storage.replaceData(function (d) {
      d.pravidla = d.pravidla || {};
      d.pravidla.preferSouvisleBlok = zapnuto;
      d.pravidla.minDelkaBlokuMinuty = minMinuty;
      return d;
    });
    zobrazZpravuSouvisleBlok('Nastavení souvislých bloků bylo uloženo.');
  }

  function init() {
    if (!Storage) return;
    vyplnFormular();
    var form = document.getElementById('prekryv-form');
    if (form) {
      form.addEventListener('submit', odeslatFormular);
    }
    vyplnVykryvaciFormular();
    var formV = document.getElementById('vykryvaci-form');
    if (formV) {
      formV.addEventListener('submit', odeslatVykryvaciFormular);
    }
    vyplnPrechodBudovyFormular();
    var formPB = document.getElementById('prechod-budovy-form');
    if (formPB) {
      formPB.addEventListener('submit', odeslatPrechodBudovyFormular);
    }
    vyplnStridaniFormular();
    var formS = document.getElementById('stridani-form');
    if (formS) {
      formS.addEventListener('submit', odeslatStridaniFormular);
    }
    vyplnSouvisleBlokFormular();
    var formSB = document.getElementById('souvisle-bloky-form');
    if (formSB) {
      formSB.addEventListener('submit', odeslatSouvisleBlokFormular);
    }
  }

  // Skripty jsou na konci <body>, DOM je kompletní – init() voláme ihned.
  init();

  global.MSemenyPravidlaPrekryv = {
    vyplnFormular: vyplnFormular,
    vyplnPrechodBudovyFormular: vyplnPrechodBudovyFormular,
    vyplnStridaniFormular: vyplnStridaniFormular,
    vyplnSouvisleBlokFormular: vyplnSouvisleBlokFormular
  };
})(typeof window !== 'undefined' ? window : this);
