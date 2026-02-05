/**
 * Sekce Pravidla – časové sloty min/max počet osob (na budovu, na třídu).
 * Přehledné formuláře, validace a srozumitelné hlášky pro běžné uživatele.
 */
(function (global) {
  'use strict';

  var Storage = global.MSemenyStorage;
  var Model = global.MSemenyDataModel;

  function getData() {
    return Storage ? Storage.getData() : { minMaxSloty: [] };
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** Zobrazí chybovou zprávu uživateli (bez alert). */
  function zobrazChybu(text) {
    var el = document.getElementById('sloty-chyba');
    var ok = document.getElementById('sloty-uspech');
    if (el) {
      el.textContent = text || '';
      el.hidden = !text;
    }
    if (ok) ok.hidden = true;
  }

  /** Zobrazí úspěšnou zprávu. */
  function zobrazUspech(text) {
    var el = document.getElementById('sloty-uspech');
    var err = document.getElementById('sloty-chyba');
    if (el) {
      el.textContent = text || '';
      el.hidden = !text;
    }
    if (err) err.hidden = true;
  }

  /** Skryje obě zprávy. */
  function skryjZpravy() {
    zobrazChybu('');
    zobrazUspech('');
  }

  /**
   * Validace formuláře. Vrátí řetězec s chybou nebo prázdný řetězec.
   */
  function validujFormular() {
    var od = (document.getElementById('sloty-od') && document.getElementById('sloty-od').value) || '';
    var do_ = (document.getElementById('sloty-do') && document.getElementById('sloty-do').value) || '';
    var minB = document.getElementById('sloty-min-budova');
    var maxB = document.getElementById('sloty-max-budova');
    var minT = document.getElementById('sloty-min-trida');
    var maxT = document.getElementById('sloty-max-trida');
    minB = minB && minB.value !== '' ? parseInt(minB.value, 10) : 0;
    maxB = maxB && maxB.value !== '' ? parseInt(maxB.value, 10) : null;
    minT = minT && minT.value !== '' ? parseInt(minT.value, 10) : 0;
    maxT = maxT && maxT.value !== '' ? parseInt(maxT.value, 10) : null;

    if (!od || !do_) {
      return 'Vyplňte prosím čas „Od“ i „Do“.';
    }
    if (od >= do_) {
      return 'Čas „Do“ musí být později než „Od“.';
    }
    if (minB < 0 || (maxB != null && maxB < 0) || minT < 0 || (maxT != null && maxT < 0)) {
      return 'Počty osob nemohou být záporné.';
    }
    if (maxB != null && minB > maxB) {
      return 'Na budovu: minimální počet nemůže být větší než maximální.';
    }
    if (maxT != null && minT > maxT) {
      return 'Na třídu: minimální počet nemůže být větší než maximální.';
    }
    return '';
  }

  /** Přečte hodnoty z formuláře (pro uložení). */
  function ctiFormular() {
    var odEl = document.getElementById('sloty-od');
    var doEl = document.getElementById('sloty-do');
    var minB = document.getElementById('sloty-min-budova');
    var maxB = document.getElementById('sloty-max-budova');
    var minT = document.getElementById('sloty-min-trida');
    var maxT = document.getElementById('sloty-max-trida');
    var dny = [];
    var i, cb;
    for (i = 1; i <= 5; i += 1) {
      cb = document.getElementById('sloty-den-' + i);
      if (cb && cb.checked) dny.push(i);
    }
    var rotaceEl = document.getElementById('sloty-rotace');
    return {
      od: odEl ? odEl.value : '07:00',
      do: doEl ? doEl.value : '17:00',
      minNaBudovu: minB && minB.value !== '' ? parseInt(minB.value, 10) : 0,
      maxNaBudovu: (maxB && maxB.value !== '') ? parseInt(maxB.value, 10) : null,
      minNaTridu: minT && minT.value !== '' ? parseInt(minT.value, 10) : 0,
      maxNaTridu: (maxT && maxT.value !== '') ? parseInt(maxT.value, 10) : null,
      dny: dny,
      rotace: !!(rotaceEl && rotaceEl.checked)
    };
  }

  /** Vyplní formulář hodnotami slotu (nebo výchozími při přidávání). */
  function vyplnFormular(slot) {
    var vychozi = (getData().minMaxSloty || []).length > 0
      ? { od: '07:00', do: '17:00', minNaBudovu: 0, maxNaBudovu: null, minNaTridu: 0, maxNaTridu: null, dny: [], rotace: false }
      : (Model && Model.vychoziMinMaxSloty ? Model.vychoziMinMaxSloty()[0] : null);
    var s = slot || vychozi;
    if (!s) s = { od: '07:00', do: '17:00', minNaBudovu: 0, maxNaBudovu: null, minNaTridu: 0, maxNaTridu: null, dny: [], rotace: false };
    var dny = Array.isArray(s.dny) ? s.dny : [];

    document.getElementById('sloty-form-id').value = slot ? slot.id : '';
    document.getElementById('sloty-od').value = s.od || '07:00';
    document.getElementById('sloty-do').value = s.do || '17:00';
    document.getElementById('sloty-min-budova').value = (s.minNaBudovu != null) ? s.minNaBudovu : 0;
    document.getElementById('sloty-max-budova').value = (s.maxNaBudovu != null && s.maxNaBudovu !== '') ? s.maxNaBudovu : '';
    document.getElementById('sloty-min-trida').value = (s.minNaTridu != null) ? s.minNaTridu : 0;
    document.getElementById('sloty-max-trida').value = (s.maxNaTridu != null && s.maxNaTridu !== '') ? s.maxNaTridu : '';
    var i, cb;
    for (i = 1; i <= 5; i += 1) {
      cb = document.getElementById('sloty-den-' + i);
      if (cb) cb.checked = dny.indexOf(i) !== -1;
    }
    var rotaceEl = document.getElementById('sloty-rotace');
    if (rotaceEl) rotaceEl.checked = !!s.rotace;
  }

  function zobrazFormular(slot) {
    skryjZpravy();
    vyplnFormular(slot);
    document.getElementById('sloty-formular').hidden = false;
  }

  function skryjFormular() {
    document.getElementById('sloty-formular').hidden = true;
    skryjZpravy();
  }

  /** Formát max hodnoty pro zobrazení (prázdné = „—"). */
  function formatMax(val) {
    return (val != null && val !== '') ? String(val) : '—';
  }

  /** Názvy dnů (1 = Po … 5 = Pá). */
  var NAZVY_DNU = ['', 'Po', 'Út', 'St', 'Čt', 'Pá'];

  /** Formát pole dnů pro zobrazení: prázdné = „Po–Pá“, jinak výpis nebo rozsah. */
  function formatDny(dny) {
    var arr = Array.isArray(dny) ? dny.filter(function (d) { return d >= 1 && d <= 5; }).sort() : [];
    if (arr.length === 0 || arr.length === 5) return 'Po–Pá';
    if (arr.length === 1) return NAZVY_DNU[arr[0]];
    return arr.map(function (d) { return NAZVY_DNU[d]; }).join(', ');
  }

  function odeslatFormular(e) {
    e.preventDefault();
    var chyba = validujFormular();
    if (chyba) {
      zobrazChybu(chyba);
      return;
    }
    if (!Storage || !Storage.replaceData) return;
    if (!Model || !Model.vytvorMinMaxSlot) return;

    var idEl = document.getElementById('sloty-form-id');
    var id = idEl && idEl.value ? idEl.value.trim() : '';
    var vals = ctiFormular();

    if (id) {
      Storage.replaceData(function (d) {
        var sloty = d.minMaxSloty || [];
        for (var i = 0; i < sloty.length; i += 1) {
          if (sloty[i].id === id) {
            sloty[i].od = vals.od;
            sloty[i].do = vals.do;
            sloty[i].minNaBudovu = vals.minNaBudovu;
            sloty[i].maxNaBudovu = vals.maxNaBudovu;
            sloty[i].minNaTridu = vals.minNaTridu;
            sloty[i].maxNaTridu = vals.maxNaTridu;
            sloty[i].dny = Array.isArray(vals.dny) ? vals.dny.slice() : [];
            sloty[i].rotace = !!vals.rotace;
            break;
          }
        }
        return d;
      });
      zobrazUspech('Časový slot byl upraven.');
    } else {
      var novy = Model.vytvorMinMaxSlot(
        vals.od, vals.do,
        vals.minNaBudovu, vals.maxNaBudovu,
        vals.minNaTridu, vals.maxNaTridu,
        vals.dny, vals.rotace
      );
      Storage.replaceData(function (d) {
        d.minMaxSloty = d.minMaxSloty || [];
        d.minMaxSloty.push(novy);
        return d;
      });
      zobrazUspech('Časový slot byl přidán.');
    }
    skryjFormular();
    vykresliSeznam();
    setTimeout(skryjZpravy, 3000);
  }

  function smazatSlot(id) {
    if (!global.confirm('Opravdu smazat tento časový slot? Požadavky na počet osob v tomto čase pak nebudou platit.')) {
      return;
    }
    if (!Storage || !Storage.replaceData) return;
    Storage.replaceData(function (d) {
      d.minMaxSloty = (d.minMaxSloty || []).filter(function (s) { return s.id !== id; });
      return d;
    });
    vykresliSeznam();
    zobrazUspech('Slot byl smazán.');
    setTimeout(skryjZpravy, 3000);
  }

  /**
   * Vykreslí seznam slotů (řazený podle času „od“).
   */
  function vykresliSeznam() {
    var el = document.getElementById('sloty-seznam');
    if (!el) return;
    var sloty = (getData().minMaxSloty || []).slice();
    sloty.sort(function (a, b) { return (a.od || '').localeCompare(b.od || ''); });

    if (sloty.length === 0) {
      el.innerHTML = '<p class="sloty-prazdno">Zatím nemáte žádné časové sloty. Klikněte na „Přidat časový slot“ a nastavte např. ráno jednu osobu na budovu a od 7:45 alespoň jednu na každou třídu.</p>';
      return;
    }

    var html = [
      '<table class="tabulka-sloty">',
      '<thead><tr>',
      '<th>Čas</th>',
      '<th>Dny</th>',
      '<th>Min. na budovu</th>',
      '<th>Max. na budovu</th>',
      '<th>Min. na třídu</th>',
      '<th>Max. na třídu</th>',
      '<th>Rotace</th>',
      '<th>Akce</th>',
      '</tr></thead><tbody>'
    ];
    var i, s;
    for (i = 0; i < sloty.length; i += 1) {
      s = sloty[i];
      html.push('<tr>');
      html.push('<td>' + escapeHtml(s.od || '') + ' – ' + escapeHtml(s.do || '') + '</td>');
      html.push('<td>' + escapeHtml(formatDny(s.dny)) + '</td>');
      html.push('<td>' + (s.minNaBudovu != null ? s.minNaBudovu : 0) + '</td>');
      html.push('<td>' + escapeHtml(formatMax(s.maxNaBudovu)) + '</td>');
      html.push('<td>' + (s.minNaTridu != null ? s.minNaTridu : 0) + '</td>');
      html.push('<td>' + escapeHtml(formatMax(s.maxNaTridu)) + '</td>');
      html.push('<td>' + (s.rotace ? 'Ano' : 'Ne') + '</td>');
      html.push('<td><button type="button" class="btn btn-mala" data-akce="upravit" data-id="' + escapeAttr(s.id) + '">Upravit</button> ');
      html.push('<button type="button" class="btn btn-mala" data-akce="smazat" data-id="' + escapeAttr(s.id) + '">Smazat</button></td>');
      html.push('</tr>');
    }
    html.push('</tbody></table>');
    el.innerHTML = html.join('');
  }

  function naKlikSeznam(e) {
    var akce = e.target && e.target.getAttribute && e.target.getAttribute('data-akce');
    var id = e.target && e.target.getAttribute && e.target.getAttribute('data-id');
    if (!akce || !id) return;
    var sloty = getData().minMaxSloty || [];
    var slot = sloty.filter(function (s) { return s.id === id; })[0];
    if (akce === 'smazat') {
      smazatSlot(id);
      return;
    }
    if (akce === 'upravit' && slot) {
      zobrazFormular(slot);
    }
  }

  function init() {
    if (!Storage || !Model) return;

    var btnPridat = document.getElementById('sloty-pridat');
    if (btnPridat) {
      btnPridat.addEventListener('click', function () {
        zobrazFormular(null);
      });
    }

    var btnZrusit = document.getElementById('sloty-form-zrusit');
    if (btnZrusit) {
      btnZrusit.addEventListener('click', skryjFormular);
    }

    var form = document.getElementById('sloty-form');
    if (form) {
      form.addEventListener('submit', odeslatFormular);
    }

    var seznam = document.getElementById('sloty-seznam');
    if (seznam) {
      seznam.addEventListener('click', naKlikSeznam);
    }

    vykresliSeznam();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.MSemenyMinMaxSloty = {
    vykresliSeznam: vykresliSeznam,
    zobrazFormular: zobrazFormular,
    skryjFormular: skryjFormular,
    validujFormular: validujFormular
  };
})(typeof window !== 'undefined' ? window : this);
