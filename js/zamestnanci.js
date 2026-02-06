/**
 * Sekce Zaměstnanci – seznam, formulář přidat/upravit/smazat.
 * Ukládání přes MSemenyStorage.replaceData a model MSemenyDataModel.
 */
(function (global) {
  'use strict';

  var Storage = global.MSemenyStorage;
  var Model = global.MSemenyDataModel;

  /**
   * Převede minuty za týden na objekt { hodiny, minuty } pro zobrazení.
   * @param {number} minuty
   * @returns {{ hodiny: number, minuty: number }}
   */
  function minutyNaHodinyMinuty(minuty) {
    var m = parseInt(minuty, 10) || 0;
    if (m < 0) m = 0;
    return {
      hodiny: Math.floor(m / 60),
      minuty: m % 60
    };
  }

  /**
   * Z formuláře vrátí úvazek v minutách za týden (hodiny * 60 + minuty).
   */
  function formNaMinuty() {
    var h = parseInt(document.getElementById('zamestnanci-hodiny').value, 10) || 0;
    var min = parseInt(document.getElementById('zamestnanci-minuty').value, 10) || 0;
    if (h < 0) h = 0;
    if (min < 0) min = 0;
    if (min > 59) min = 59;
    return h * 60 + min;
  }

  /** Vrátí všechny třídy z budov jako pole { id, nazev, budovaNazev }. */
  function vsechnyTridy() {
    var data = Storage ? Storage.getData() : { budovy: [] };
    var out = [];
    var b, t, i, j;
    for (i = 0; i < (data.budovy || []).length; i += 1) {
      b = data.budovy[i];
      for (j = 0; j < (b.tridy || []).length; j += 1) {
        t = b.tridy[j];
        out.push({ id: t.id, nazev: t.nazev || '(bez názvu)', budovaNazev: b.nazev || '' });
      }
    }
    return out;
  }

  /** Vrátí název třídy podle id (nebo prázdný řetězec). */
  function nazevTridy(tridaId) {
    if (!tridaId) return '';
    var tridy = vsechnyTridy();
    var i;
    for (i = 0; i < tridy.length; i += 1) {
      if (tridy[i].id === tridaId) return tridy[i].nazev;
    }
    return '';
  }

  /** Naplní select „Přiřazená třída“ a nastaví vybranou hodnotu. */
  function naplnSelectTridy(vybranId) {
    var sel = document.getElementById('zamestnanci-trida');
    if (!sel) return;
    var tridy = vsechnyTridy();
    sel.innerHTML = '';
    var opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = '— žádná —';
    sel.appendChild(opt0);
    var i, opt;
    for (i = 0; i < tridy.length; i += 1) {
      opt = document.createElement('option');
      opt.value = tridy[i].id;
      opt.textContent = tridy[i].budovaNazev ? tridy[i].nazev + ' (' + tridy[i].budovaNazev + ')' : tridy[i].nazev;
      if (tridy[i].id === vybranId) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  /** Zobrazí nebo skryje blok „Přiřazená třída“ podle kategorie. */
  function toggleTridaWrapper() {
    var kmenova = document.getElementById('zamestnanci-kmenova');
    var wrap = document.getElementById('zamestnanci-trida-wrapper');
    if (wrap) wrap.hidden = !(kmenova && kmenova.checked);
  }

  // --- Nedostupnost – dočasný stav při úpravě formuláře ---

  /** Dočasné pole nedostupnosti (platné během editace formuláře). */
  var formNedostupnost = [];

  /** Názvy dnů pro zobrazení. */
  var DNY_NAZVY = { 1: 'Po', 2: 'Út', 3: 'St', 4: 'Čt', 5: 'Pá' };
  var DNY_NAZVY_DLOUHE = { 1: 'Pondělí', 2: 'Úterý', 3: 'Středa', 4: 'Čtvrtek', 5: 'Pátek' };

  /**
   * Vykreslí seznam nedostupnosti ve formuláři.
   */
  function vykresliNedostupnostFormular() {
    var el = document.getElementById('nedostupnost-seznam');
    if (!el) return;
    if (formNedostupnost.length === 0) {
      el.innerHTML = '<p class="nedostupnost-prazdno">Žádná nedostupnost – zaměstnanec je k dispozici celý týden.</p>';
      return;
    }
    // Seřadit podle dne a času
    var sorted = formNedostupnost.slice().sort(function (a, b) {
      if (a.den !== b.den) return a.den - b.den;
      return a.od.localeCompare(b.od);
    });
    var html = ['<table class="tabulka-nedostupnost"><thead><tr><th>Den</th><th>Od</th><th>Do</th><th>Akce</th></tr></thead><tbody>'];
    for (var i = 0; i < sorted.length; i++) {
      var n = sorted[i];
      html.push('<tr><td>' + escapeHtml(DNY_NAZVY_DLOUHE[n.den] || String(n.den)) + '</td>');
      html.push('<td>' + escapeHtml(n.od) + '</td>');
      html.push('<td>' + escapeHtml(n.do) + '</td>');
      html.push('<td><button type="button" class="btn btn-mala" data-akce="nedostupnost-smazat" data-nd-den="' + n.den + '" data-nd-od="' + escapeAttr(n.od) + '" data-nd-do="' + escapeAttr(n.do) + '">Odebrat</button></td>');
      html.push('</tr>');
    }
    html.push('</tbody></table>');
    el.innerHTML = html.join('');
  }

  /**
   * Přidá blok nedostupnosti do formNedostupnost a překreslí.
   */
  function pridatNedostupnost(den, od, do_) {
    den = parseInt(den, 10);
    if (den < 1 || den > 5 || !od || !do_) return;
    if (od >= do_) return; // čas „od" musí být před „do"
    // Kontrola duplicity
    var dup = formNedostupnost.some(function (n) {
      return n.den === den && n.od === od && n.do === do_;
    });
    if (dup) return;
    formNedostupnost.push({ den: den, od: od, do: do_ });
    vykresliNedostupnostFormular();
  }

  /**
   * Odebere blok nedostupnosti z formNedostupnost a překreslí.
   */
  function odebratNedostupnost(den, od, do_) {
    den = parseInt(den, 10);
    formNedostupnost = formNedostupnost.filter(function (n) {
      return !(n.den === den && n.od === od && n.do === do_);
    });
    vykresliNedostupnostFormular();
  }

  /**
   * Vrátí krátký textový souhrn nedostupnosti pro tabulku zaměstnanců.
   * @param {Array} nedostupnost
   * @returns {string}
   */
  function souhrNedostupnosti(nedostupnost) {
    if (!Array.isArray(nedostupnost) || nedostupnost.length === 0) return '';
    var sorted = nedostupnost.slice().sort(function (a, b) {
      if (a.den !== b.den) return a.den - b.den;
      return a.od.localeCompare(b.od);
    });
    var parts = [];
    for (var i = 0; i < sorted.length; i++) {
      var n = sorted[i];
      parts.push((DNY_NAZVY[n.den] || String(n.den)) + ' ' + n.od + '\u2013' + n.do);
    }
    return parts.join(', ');
  }

  /**
   * Vrátí textový popis nastavení přechodu mezi budovami pro tabulku.
   * @param {string|undefined} hodnota - 'výchozí' | 'zakázat' | 'povolit'
   * @returns {string}
   */
  function souhrPrechodBudovy(hodnota) {
    if (hodnota === 'zakázat') return 'Zakázat';
    if (hodnota === 'povolit') return 'Povolit';
    return 'Výchozí';
  }

  /**
   * Vyplní formulář hodnotami zaměstnance (nebo prázdný při přidávání).
   * @param {Object|null} z - zaměstnanec nebo null
   */
  function vyplnFormular(z) {
    document.getElementById('zamestnanci-form-id').value = z ? z.id : '';
    document.getElementById('zamestnanci-jmeno').value = z ? z.jmeno : '';
    var uv = minutyNaHodinyMinuty(z ? z.uvazekMinutyTyden : 0);
    document.getElementById('zamestnanci-hodiny').value = uv.hodiny;
    document.getElementById('zamestnanci-minuty').value = uv.minuty;
    document.getElementById('zamestnanci-role').value = z ? z.role : (Model && Model.ROLE ? Model.ROLE.UCITELKA : 'učitelka');
    var kateg = (z && z.kmenovaVykryvaci === 'vykrývací') ? 'vykrývací' : 'kmenová';
    var kmenovaEl = document.getElementById('zamestnanci-kmenova');
    var vykryvaciEl = document.getElementById('zamestnanci-vykryvaci');
    if (kmenovaEl) kmenovaEl.checked = (kateg === 'kmenová');
    if (vykryvaciEl) vykryvaciEl.checked = (kateg === 'vykrývací');
    naplnSelectTridy(z && z.tridaId ? z.tridaId : null);
    toggleTridaWrapper();
    // Nedostupnost
    formNedostupnost = (z && Array.isArray(z.nedostupnost)) ? z.nedostupnost.slice() : [];
    vykresliNedostupnostFormular();
    // Přechod mezi budovami (C5)
    var prechodEl = document.getElementById('zamestnanci-prechod-budovy');
    if (prechodEl) {
      var prechodVal = (z && z.prechodMeziBudovami) ? z.prechodMeziBudovami : 'výchozí';
      prechodEl.value = prechodVal;
    }
  }

  /**
   * Smaže zaměstnance s daným id a překreslí seznam.
   * @param {string} id
   */
  function smazat(id) {
    if (!global.confirm('Opravdu smazat tohoto zaměstnance?')) {
      return;
    }
    if (!Storage || !Storage.replaceData) return;
    Storage.replaceData(function (d) {
      d.zamestnanci = (d.zamestnanci || []).filter(function (z) { return z.id !== id; });
      return d;
    });
    vykresliSeznam();
  }

  /** Pořadí rolí pro řazení tabulky: ředitelka, zástupkyně, učitelka, asistentka pedagoga, školník/školnice. */
  var ROLE_RAZENI = ['ředitelka', 'zástupkyně', 'učitelka', 'asistentka pedagoga', 'školník/školnice'];

  function indexRole(role) {
    var idx = ROLE_RAZENI.indexOf(role || '');
    return idx >= 0 ? idx : ROLE_RAZENI.length;
  }

  /**
   * Uživatelské řazení – seznam kritérií (B1c). Každé: { key: string, dir: number } (dir 1 = vzestupně, -1 = sestupně).
   */
  var razeniKriteria = [
    { key: 'role', dir: 1 },
    { key: 'jmeno', dir: 1 }
  ];

  function getCompareForKey(key) {
    switch (key) {
      case 'jmeno':
        return function (a, b) { return (a.jmeno || '').localeCompare(b.jmeno || '', 'cs'); };
      case 'uvazek':
        return function (a, b) {
          var ua = (a.uvazekMinutyTyden != null) ? a.uvazekMinutyTyden : 0;
          var ub = (b.uvazekMinutyTyden != null) ? b.uvazekMinutyTyden : 0;
          return ua - ub;
        };
      case 'role':
        return function (a, b) { return indexRole(a.role) - indexRole(b.role); };
      case 'kategorie':
        return function (a, b) {
          var ka = (a.kmenovaVykryvaci === 'vykrývací') ? 1 : 0;
          var kb = (b.kmenovaVykryvaci === 'vykrývací') ? 1 : 0;
          if (ka !== kb) return ka - kb;
          return (nazevTridy(a.tridaId) || '').localeCompare(nazevTridy(b.tridaId) || '', 'cs');
        };
      default:
        return function () { return 0; };
    }
  }

  /**
   * Seřadí zaměstnance podle zadaných kritérií (nebo výchozích: role, jméno).
   */
  function seradZamestnance(list, kriteria) {
    var k = kriteria && kriteria.length > 0 ? kriteria : razeniKriteria;
    return (list || []).slice().sort(function (a, b) {
      var i, cmp, res;
      for (i = 0; i < k.length; i += 1) {
        cmp = getCompareForKey(k[i].key)(a, b);
        res = cmp * (k[i].dir || 1);
        if (res !== 0) return res;
      }
      return 0;
    });
  }

  /** Výchozí kritéria, když uživatel všechna odebere (neřadit). */
  function vychoziRazeniKriteria() {
    return [{ key: 'role', dir: 1 }, { key: 'jmeno', dir: 1 }];
  }

  /**
   * Klik na záhlaví (primární): cyklus nahoru → dolu → neřadit → nahoru …
   * Je-li sloupec už primární a je dolu (▼), další klik ho odebere z kritérií.
   */
  function nastavPrimarniRazeni(key) {
    var idx = -1;
    for (var i = 0; i < razeniKriteria.length; i += 1) {
      if (razeniKriteria[i].key === key) { idx = i; break; }
    }
    if (idx === 0) {
      if (razeniKriteria[0].dir === 1) {
        razeniKriteria[0].dir = -1;
      } else {
        razeniKriteria.splice(0, 1);
        if (razeniKriteria.length === 0) {
          razeniKriteria = vychoziRazeniKriteria();
        }
      }
    } else {
      if (idx > 0) razeniKriteria.splice(idx, 1);
      razeniKriteria.unshift({ key: key, dir: 1 });
      if (razeniKriteria.length > 4) razeniKriteria.pop();
    }
  }

  /**
   * Shift+klik: přidat jako další kritérium nebo u již řazeného sloupce cyklus nahoru → dolu → neřadit.
   */
  function pridejSekundarniRazeni(key) {
    var idx = -1;
    for (var i = 0; i < razeniKriteria.length; i += 1) {
      if (razeniKriteria[i].key === key) { idx = i; break; }
    }
    if (idx >= 0) {
      if (razeniKriteria[idx].dir === 1) {
        razeniKriteria[idx].dir = -1;
      } else {
        razeniKriteria.splice(idx, 1);
        if (razeniKriteria.length === 0) {
          razeniKriteria = vychoziRazeniKriteria();
        }
      }
    } else {
      razeniKriteria.push({ key: key, dir: 1 });
      if (razeniKriteria.length > 4) razeniKriteria.shift();
    }
  }

  function thRazeni(key, label) {
    var order = -1;
    var dir = 0;
    for (var i = 0; i < razeniKriteria.length; i += 1) {
      if (razeniKriteria[i].key === key) {
        order = i + 1;
        dir = razeniKriteria[i].dir;
        break;
      }
    }
    var title = 'Klik: nahoru → dolu → neřadit. Shift+klik: přidat další kritérium (nebo stejný cyklus).';
    var arrow = dir === 1 ? ' ▲' : (dir === -1 ? ' ▼' : '');
    var orderStr = order >= 0 ? ' <span class="sort-order">' + order + '</span>' : '';
    var neřaditHint = order < 0 ? ' <span class="sort-none" aria-hidden="true">—</span>' : '';
    return '<th class="th-sortable" data-sort="' + escapeAttr(key) + '" title="' + escapeAttr(title) + '">' + escapeHtml(label) + orderStr + arrow + neřaditHint + '</th>';
  }

  /**
   * Vykreslí tabulku zaměstnanců do #zamestnanci-seznam (řazenou podle aktuálních kritérií).
   */
  function vykresliSeznam() {
    var el = document.getElementById('zamestnanci-seznam');
    if (!el) return;
    var data = Storage ? Storage.getData() : { zamestnanci: [] };
    var list = seradZamestnance(data.zamestnanci || []);

    if (list.length === 0) {
      el.innerHTML = '<p class="zamestnanci-prazdno">Zatím nejsou žádní zaměstnanci. Přidejte prvního tlačítkem výše.</p>';
      return;
    }

    var html = [
      '<table class="tabulka-zamestnanci">',
      '<thead><tr>',
      thRazeni('jmeno', 'Jméno'),
      thRazeni('uvazek', 'Úvazek (týden)'),
      thRazeni('role', 'Role'),
      thRazeni('kategorie', 'Kategorie'),
      '<th>Nedostupnost</th>',
      '<th>Přechod budovy</th>',
      '<th>Akce</th>',
      '</tr></thead><tbody>'
    ];
    var i, z, uv, kategText, nedostText, prechodText, btnUpravit, btnSmazat;
    for (i = 0; i < list.length; i += 1) {
      z = list[i];
      uv = minutyNaHodinyMinuty(z.uvazekMinutyTyden);
      kategText = (z.kmenovaVykryvaci === 'vykrývací') ? 'Vykrývací' : ('Kmenová' + (z.tridaId ? ' (' + escapeHtml(nazevTridy(z.tridaId)) + ')' : ''));
      nedostText = souhrNedostupnosti(z.nedostupnost);
      prechodText = souhrPrechodBudovy(z.prechodMeziBudovami);
      btnUpravit = '<button type="button" class="btn btn-mala" data-akce="upravit" data-id="' + escapeAttr(z.id) + '">Upravit</button>';
      btnSmazat = '<button type="button" class="btn btn-mala" data-akce="smazat" data-id="' + escapeAttr(z.id) + '">Smazat</button>';
      html.push('<tr><td>' + escapeHtml(z.jmeno || '') + '</td><td>' + uv.hodiny + ' h ' + uv.minuty + ' min</td><td>' + escapeHtml(z.role || '') + '</td><td>' + kategText + '</td><td class="td-nedostupnost">' + (nedostText ? escapeHtml(nedostText) : '<span class="hint">—</span>') + '</td><td>' + escapeHtml(prechodText) + '</td><td>' + btnUpravit + ' ' + btnSmazat + '</td></tr>');
    }
    html.push('</tbody></table>');
    el.innerHTML = html.join('');
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

  /**
   * Zobrazí formulář (pro přidání nebo úpravu).
   * @param {Object|null} z - zaměstnanec při úpravě, null při přidání
   */
  function zobrazFormular(z) {
    vyplnFormular(z);
    var f = document.getElementById('zamestnanci-formular');
    if (f) f.hidden = false;
  }

  /**
   * Skryje formulář.
   */
  function skryjFormular() {
    var f = document.getElementById('zamestnanci-formular');
    if (f) f.hidden = true;
  }

  /**
   * Odešle formulář – přidá nebo upraví zaměstnance.
   */
  function odeslatFormular(e) {
    e.preventDefault();
    var idEl = document.getElementById('zamestnanci-form-id');
    var id = (idEl && idEl.value) ? idEl.value.trim() : '';
    var jmeno = (document.getElementById('zamestnanci-jmeno') && document.getElementById('zamestnanci-jmeno').value) ? document.getElementById('zamestnanci-jmeno').value.trim() : '';
    var minuty = formNaMinuty();
    var roleEl = document.getElementById('zamestnanci-role');
    var role = roleEl ? roleEl.value : (Model && Model.ROLE ? Model.ROLE.UCITELKA : 'učitelka');
    var kmenovaEl = document.getElementById('zamestnanci-kmenova');
    var kateg = (kmenovaEl && kmenovaEl.checked) ? 'kmenová' : 'vykrývací';
    var tridaEl = document.getElementById('zamestnanci-trida');
    var tridaId = (tridaEl && tridaEl.value && kateg === 'kmenová') ? tridaEl.value.trim() : null;

    if (!Storage || !Storage.replaceData) return;
    if (!Model || !Model.vytvorZamestnance) return;

    // Normalizovat nedostupnost z formuláře
    var nedost = (Model && Model.normalizujNedostupnost) ? Model.normalizujNedostupnost(formNedostupnost) : formNedostupnost.slice();
    // Přechod mezi budovami (C5)
    var prechodEl = document.getElementById('zamestnanci-prechod-budovy');
    var prechod = (prechodEl && prechodEl.value) ? prechodEl.value : 'výchozí';
    if (Model && Model.normalizujPrechodBudovy) prechod = Model.normalizujPrechodBudovy(prechod);

    if (id) {
      Storage.replaceData(function (d) {
        var zam = d.zamestnanci || [];
        var i;
        for (i = 0; i < zam.length; i += 1) {
          if (zam[i].id === id) {
            zam[i].jmeno = jmeno;
            zam[i].uvazekMinutyTyden = minuty;
            zam[i].role = role;
            zam[i].kmenovaVykryvaci = kateg;
            zam[i].tridaId = tridaId;
            zam[i].nedostupnost = nedost;
            zam[i].prechodMeziBudovami = prechod;
            break;
          }
        }
        return d;
      });
    } else {
      var novy = Model.vytvorZamestnance(jmeno, minuty, role, kateg, tridaId, nedost, prechod);
      Storage.replaceData(function (d) {
        d.zamestnanci = d.zamestnanci || [];
        d.zamestnanci.push(novy);
        return d;
      });
    }
    skryjFormular();
    vykresliSeznam();
  }

  /**
   * Klik na záhlaví sloupce – řazení (B1c). Klik = primární, Shift+klik = sekundární kritérium.
   */
  function naKlikZahlavi(e) {
    var th = e.target && e.target.closest && e.target.closest('th.th-sortable');
    if (!th) return;
    var key = th.getAttribute('data-sort');
    if (!key) return;
    e.preventDefault();
    if (e.shiftKey) {
      pridejSekundarniRazeni(key);
    } else {
      nastavPrimarniRazeni(key);
    }
    vykresliSeznam();
  }

  /**
   * Delegace kliknutí v seznamu (Upravit / Smazat).
   */
  function naKlikSeznam(e) {
    if (e.target && e.target.closest && e.target.closest('th.th-sortable')) {
      naKlikZahlavi(e);
      return;
    }
    var btn = e.target && e.target.getAttribute && e.target.getAttribute('data-akce');
    var id = e.target && e.target.getAttribute && e.target.getAttribute('data-id');
    if (!btn || !id) return;
    if (btn === 'smazat') {
      smazat(id);
      return;
    }
    if (btn === 'upravit') {
      var data = Storage ? Storage.getData() : { zamestnanci: [] };
      var list = data.zamestnanci || [];
      var i;
      for (i = 0; i < list.length; i += 1) {
        if (list[i].id === id) {
          zobrazFormular(list[i]);
          return;
        }
      }
    }
  }

  /**
   * Inicializace: navázání posluchačů a první vykreslení seznamu.
   */
  function init() {
    if (!Storage || !Model) return;

    var btnPridat = document.getElementById('zamestnanci-pridat');
    if (btnPridat) {
      btnPridat.addEventListener('click', function () {
        zobrazFormular(null);
      });
    }

    var btnZrusit = document.getElementById('zamestnanci-form-zrusit');
    if (btnZrusit) {
      btnZrusit.addEventListener('click', skryjFormular);
    }

    var form = document.getElementById('zamestnanci-form');
    if (form) {
      form.addEventListener('submit', odeslatFormular);
    }

    var kmenovaEl = document.getElementById('zamestnanci-kmenova');
    var vykryvaciEl = document.getElementById('zamestnanci-vykryvaci');
    if (kmenovaEl) kmenovaEl.addEventListener('change', toggleTridaWrapper);
    if (vykryvaciEl) vykryvaciEl.addEventListener('change', toggleTridaWrapper);

    // Nedostupnost – tlačítko „Přidat"
    var btnNedostPridat = document.getElementById('nedostupnost-btn-pridat');
    if (btnNedostPridat) {
      btnNedostPridat.addEventListener('click', function () {
        var denEl = document.getElementById('nedostupnost-den');
        var odEl = document.getElementById('nedostupnost-od');
        var doEl = document.getElementById('nedostupnost-do');
        if (denEl && odEl && doEl) {
          pridatNedostupnost(denEl.value, odEl.value, doEl.value);
        }
      });
    }

    // Nedostupnost – tlačítko „Celý den"
    var btnCelyDen = document.getElementById('nedostupnost-btn-cely-den');
    if (btnCelyDen) {
      btnCelyDen.addEventListener('click', function () {
        var denEl = document.getElementById('nedostupnost-den');
        if (denEl) {
          pridatNedostupnost(denEl.value, '07:00', '17:00');
        }
      });
    }

    // Nedostupnost – delegace kliku na „Odebrat" v seznamu
    var ndSeznam = document.getElementById('nedostupnost-seznam');
    if (ndSeznam) {
      ndSeznam.addEventListener('click', function (e) {
        var btn = e.target;
        if (btn && btn.getAttribute && btn.getAttribute('data-akce') === 'nedostupnost-smazat') {
          var den = btn.getAttribute('data-nd-den');
          var od = btn.getAttribute('data-nd-od');
          var do_ = btn.getAttribute('data-nd-do');
          if (den && od && do_) {
            odebratNedostupnost(den, od, do_);
          }
        }
      });
    }

    var seznam = document.getElementById('zamestnanci-seznam');
    if (seznam) {
      seznam.addEventListener('click', naKlikSeznam);
    }

    vykresliSeznam();
  }

  // Skripty jsou na konci <body>, DOM je kompletní – init() voláme ihned.
  init();

  global.MSemenyZamestnanci = {
    minutyNaHodinyMinuty: minutyNaHodinyMinuty,
    seradZamestnance: seradZamestnance,
    vykresliSeznam: vykresliSeznam,
    zobrazFormular: zobrazFormular,
    skryjFormular: skryjFormular,
    getRazeniKriteria: function () { return razeniKriteria.slice(); },
    nastavPrimarniRazeni: nastavPrimarniRazeni,
    souhrNedostupnosti: souhrNedostupnosti,
    souhrPrechodBudovy: souhrPrechodBudovy
  };
})(typeof window !== 'undefined' ? window : this);
