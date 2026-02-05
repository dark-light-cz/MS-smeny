/**
 * Sekce Budovy a třídy – hierarchie, CRUD budov a tříd.
 * Ukládání přes MSemenyStorage.replaceData a model MSemenyDataModel.
 */
(function (global) {
  'use strict';

  var Storage = global.MSemenyStorage;
  var Model = global.MSemenyDataModel;

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

  function getData() {
    return Storage ? Storage.getData() : { budovy: [] };
  }

  /**
   * Vyplní select budov (pro formulář třídy).
   */
  function naplnSelectBudov(vybranId) {
    var sel = document.getElementById('tridy-budova');
    if (!sel) return;
    var budovy = getData().budovy || [];
    sel.innerHTML = '';
    var i, opt;
    for (i = 0; i < budovy.length; i += 1) {
      opt = document.createElement('option');
      opt.value = budovy[i].id;
      opt.textContent = budovy[i].nazev || '(bez názvu)';
      if (budovy[i].id === vybranId) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  /**
   * Zobrazí formulář budovy (přidat nebo upravit).
   */
  function zobrazFormularBudovu(budova) {
    document.getElementById('budovy-form-id').value = budova ? budova.id : '';
    document.getElementById('budovy-nazev').value = budova ? (budova.nazev || '') : '';
    document.getElementById('budovy-formular').hidden = false;
  }

  function skryjFormularBudovu() {
    document.getElementById('budovy-formular').hidden = true;
  }

  /**
   * Zobrazí formulář třídy. Při přidání lze předat id budovy pro předvybrání.
   */
  function zobrazFormularTridu(trida, budovaId) {
    naplnSelectBudov(budovaId || (trida ? najdiBudovuProTridu(trida.id) : null));
    document.getElementById('tridy-form-id').value = trida ? trida.id : '';
    document.getElementById('tridy-nazev').value = trida ? (trida.nazev || '') : '';
    document.getElementById('tridy-formular').hidden = false;
  }

  function skryjFormularTridu() {
    document.getElementById('tridy-formular').hidden = true;
  }

  /** Vrátí id budovy, která obsahuje třídu s daným id. */
  function najdiBudovuProTridu(tridaId) {
    var budovy = getData().budovy || [];
    var b, t, i, j;
    for (i = 0; i < budovy.length; i += 1) {
      b = budovy[i];
      for (j = 0; j < (b.tridy || []).length; j += 1) {
        if (b.tridy[j].id === tridaId) return b.id;
      }
    }
    return null;
  }

  /** Vrátí objekt třídy podle id (a její budovy). */
  function najdiTridu(tridaId) {
    var budovy = getData().budovy || [];
    var b, t, i, j;
    for (i = 0; i < budovy.length; i += 1) {
      for (j = 0; j < (budovy[i].tridy || []).length; j += 1) {
        t = budovy[i].tridy[j];
        if (t.id === tridaId) return { trida: t, budova: budovy[i] };
      }
    }
    return null;
  }

  function odeslatFormularBudovu(e) {
    e.preventDefault();
    var idEl = document.getElementById('budovy-form-id');
    var id = idEl && idEl.value ? idEl.value.trim() : '';
    var nazevEl = document.getElementById('budovy-nazev');
    var nazev = nazevEl ? nazevEl.value.trim() : '';
    if (!Storage || !Storage.replaceData) return;
    if (!Model || !Model.vytvorBudovu) return;

    if (id) {
      Storage.replaceData(function (d) {
        var i;
        for (i = 0; i < (d.budovy || []).length; i += 1) {
          if (d.budovy[i].id === id) {
            d.budovy[i].nazev = nazev;
            break;
          }
        }
        return d;
      });
    } else {
      var nova = Model.vytvorBudovu(nazev);
      Storage.replaceData(function (d) {
        d.budovy = d.budovy || [];
        d.budovy.push(nova);
        return d;
      });
    }
    skryjFormularBudovu();
    vykresliHierarchii();
  }

  function odeslatFormularTridu(e) {
    e.preventDefault();
    var idEl = document.getElementById('tridy-form-id');
    var id = idEl && idEl.value ? idEl.value.trim() : '';
    var budovaIdEl = document.getElementById('tridy-budova');
    var budovaId = budovaIdEl ? budovaIdEl.value : '';
    var nazevEl = document.getElementById('tridy-nazev');
    var nazev = nazevEl ? nazevEl.value.trim() : '';
    if (!Storage || !Storage.replaceData) return;
    if (!Model || !Model.vytvorTridu) return;

    if (id) {
      var found = najdiTridu(id);
      if (!found) return;
      Storage.replaceData(function (d) {
        var src = (d.budovy || []).filter(function (x) { return x.id === found.budova.id; })[0];
        var dst = (d.budovy || []).filter(function (x) { return x.id === budovaId; })[0];
        if (!src || !dst) return d;
        var idx = -1, k;
        for (k = 0; k < (src.tridy || []).length; k += 1) {
          if (src.tridy[k].id === id) { idx = k; break; }
        }
        if (idx === -1) return d;
        var trida = src.tridy.splice(idx, 1)[0];
        trida.nazev = nazev;
        if (src.id === dst.id) {
          src.tridy.splice(idx, 0, trida);
        } else {
          dst.tridy = dst.tridy || [];
          dst.tridy.push(trida);
        }
        return d;
      });
    } else {
      var nova = Model.vytvorTridu(nazev);
      Storage.replaceData(function (d) {
        var b = (d.budovy || []).filter(function (x) { return x.id === budovaId; })[0];
        if (b) {
          b.tridy = b.tridy || [];
          b.tridy.push(nova);
        }
        return d;
      });
    }
    skryjFormularTridu();
    vykresliHierarchii();
  }

  function smazatBudovu(id) {
    if (!global.confirm('Opravdu smazat tuto budovu i se všemi třídami?')) return;
    if (!Storage || !Storage.replaceData) return;
    Storage.replaceData(function (d) {
      d.budovy = (d.budovy || []).filter(function (b) { return b.id !== id; });
      return d;
    });
    vykresliHierarchii();
  }

  function smazatTridu(tridaId) {
    if (!global.confirm('Opravdu smazat tuto třídu?')) return;
    var found = najdiTridu(tridaId);
    if (!found) return;
    if (!Storage || !Storage.replaceData) return;
    Storage.replaceData(function (d) {
      var b = (d.budovy || []).filter(function (x) { return x.id === found.budova.id; })[0];
      if (b && b.tridy) b.tridy = b.tridy.filter(function (t) { return t.id !== tridaId; });
      return d;
    });
    vykresliHierarchii();
  }

  /**
   * Vykreslí hierarchii budov a tříd do #budovy-hierarchie.
   */
  function vykresliHierarchii() {
    var el = document.getElementById('budovy-hierarchie');
    if (!el) return;
    var budovy = getData().budovy || [];

    if (budovy.length === 0) {
      el.innerHTML = '<p class="budovy-prazdno">Zatím nejsou žádné budovy. Přidejte první tlačítkem výše.</p>';
      return;
    }

    var html = [];
    var i, j, b, t;
    for (i = 0; i < budovy.length; i += 1) {
      b = budovy[i];
      html.push('<div class="budova-blok" data-budova-id="' + escapeAttr(b.id) + '">');
      html.push('<div class="budova-hlavicka">');
      html.push('<strong>' + escapeHtml(b.nazev || '(bez názvu)') + '</strong> ');
      html.push('<button type="button" class="btn btn-mala" data-akce="upravit-budovu" data-id="' + escapeAttr(b.id) + '">Upravit</button> ');
      html.push('<button type="button" class="btn btn-mala" data-akce="smazat-budovu" data-id="' + escapeAttr(b.id) + '">Smazat</button>');
      html.push('</div>');
      html.push('<ul class="budova-tridy">');
      for (j = 0; j < (b.tridy || []).length; j += 1) {
        t = b.tridy[j];
        html.push('<li>');
        html.push(escapeHtml(t.nazev || '(bez názvu)'));
        html.push(' <button type="button" class="btn btn-mala" data-akce="upravit-tridu" data-id="' + escapeAttr(t.id) + '">Upravit</button> ');
        html.push('<button type="button" class="btn btn-mala" data-akce="smazat-tridu" data-id="' + escapeAttr(t.id) + '">Smazat</button>');
        html.push('</li>');
      }
      html.push('</ul>');
      html.push('<button type="button" class="btn btn-mala" data-akce="pridat-tridu" data-budova-id="' + escapeAttr(b.id) + '">Přidat třídu</button>');
      html.push('</div>');
    }
    el.innerHTML = html.join('');
  }

  function naKlikHierarchie(e) {
    var akce = e.target && e.target.getAttribute && e.target.getAttribute('data-akce');
    var id = e.target && e.target.getAttribute && e.target.getAttribute('data-id');
    var budovaId = e.target && e.target.getAttribute && e.target.getAttribute('data-budova-id');
    if (!akce) return;

    if (akce === 'upravit-budovu' && id) {
      var budovy = getData().budovy || [];
      var b = budovy.filter(function (x) { return x.id === id; })[0];
      if (b) zobrazFormularBudovu(b);
      return;
    }
    if (akce === 'smazat-budovu' && id) {
      smazatBudovu(id);
      return;
    }
    if (akce === 'pridat-tridu' && budovaId) {
      zobrazFormularTridu(null, budovaId);
      return;
    }
    if (akce === 'upravit-tridu' && id) {
      var found = najdiTridu(id);
      if (found) zobrazFormularTridu(found.trida, found.budova.id);
      return;
    }
    if (akce === 'smazat-tridu' && id) {
      smazatTridu(id);
      return;
    }
  }

  function init() {
    if (!Storage || !Model) return;

    var btnPridat = document.getElementById('budovy-pridat');
    if (btnPridat) btnPridat.addEventListener('click', function () { zobrazFormularBudovu(null); });

    var btnZrusitB = document.getElementById('budovy-form-zrusit');
    if (btnZrusitB) btnZrusitB.addEventListener('click', skryjFormularBudovu);

    var formB = document.getElementById('budovy-form');
    if (formB) formB.addEventListener('submit', odeslatFormularBudovu);

    var btnZrusitT = document.getElementById('tridy-form-zrusit');
    if (btnZrusitT) btnZrusitT.addEventListener('click', skryjFormularTridu);

    var formT = document.getElementById('tridy-form');
    if (formT) formT.addEventListener('submit', odeslatFormularTridu);

    var hierarchie = document.getElementById('budovy-hierarchie');
    if (hierarchie) hierarchie.addEventListener('click', naKlikHierarchie);

    vykresliHierarchii();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.MSemenyBudovyTridy = {
    vykresliHierarchii: vykresliHierarchii,
    zobrazFormularBudovu: zobrazFormularBudovu,
    zobrazFormularTridu: zobrazFormularTridu,
    najdiBudovuProTridu: najdiBudovuProTridu,
    najdiTridu: najdiTridu
  };
})(typeof window !== 'undefined' ? window : this);
