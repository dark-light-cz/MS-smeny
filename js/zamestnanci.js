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

  /** Z jednoho řádku role/úvazek vrátí úvazek v minutách (hodiny * 60 + minuty). */
  function radkaNaMinuty(hodinyEl, minutyEl) {
    var h = parseInt(hodinyEl && hodinyEl.value ? hodinyEl.value : 0, 10) || 0;
    var min = parseInt(minutyEl && minutyEl.value ? minutyEl.value : 0, 10) || 0;
    if (h < 0) h = 0;
    if (min < 0) min = 0;
    if (min > 59) min = 59;
    return h * 60 + min;
  }

  /** Z formuláře vrátí pole { role, uvazekMinutyTyden } z řádků role/úvazek. */
  function formNaRoleUvazky() {
    var container = document.getElementById('zamestnanci-role-uvazky-seznam');
    if (!container) return [{ role: (Model && Model.ROLE ? Model.ROLE.UCITELKA : 'učitelka'), uvazekMinutyTyden: 0 }];
    var rows = container.querySelectorAll('.role-uvazky-radek');
    var out = [];
    for (var i = 0; i < rows.length; i += 1) {
      var sel = rows[i].querySelector('.role-uvazky-role');
      var hInp = rows[i].querySelector('.role-uvazky-hodiny');
      var mInp = rows[i].querySelector('.role-uvazky-minuty');
      var role = (sel && sel.value) ? sel.value : (Model && Model.ROLE ? Model.ROLE.UCITELKA : 'učitelka');
      var min = radkaNaMinuty(hInp, mInp);
      out.push({ role: role, uvazekMinutyTyden: min });
    }
    return out.length > 0 ? out : [{ role: (Model && Model.ROLE ? Model.ROLE.UCITELKA : 'učitelka'), uvazekMinutyTyden: 0 }];
  }

  /** Přidá jeden řádek role/úvazek do formuláře. */
  function pridalRadekRoleUvazky(role, uvazekMinutyTyden) {
    var container = document.getElementById('zamestnanci-role-uvazky-seznam');
    if (!container) return;
    var uv = minutyNaHodinyMinuty(uvazekMinutyTyden != null ? uvazekMinutyTyden : 0);
    var roleSeznam = (Model && Model.ROLE_SEZNAM) ? Model.ROLE_SEZNAM : ['učitelka', 'asistentka pedagoga', 'školník/školnice', 'ředitelka', 'zástupkyně'];
    var row = document.createElement('div');
    row.className = 'role-uvazky-radek';
    var sel = document.createElement('select');
    sel.className = 'role-uvazky-role';
    sel.setAttribute('aria-label', 'Role');
    var i, opt;
    for (i = 0; i < roleSeznam.length; i += 1) {
      opt = document.createElement('option');
      opt.value = roleSeznam[i];
      opt.textContent = roleSeznam[i];
      if (roleSeznam[i] === (role || '')) opt.selected = true;
      sel.appendChild(opt);
    }
    var hInp = document.createElement('input');
    hInp.type = 'number';
    hInp.className = 'role-uvazky-hodiny';
    hInp.min = 0;
    hInp.max = 168;
    hInp.value = uv.hodiny;
    hInp.setAttribute('aria-label', 'Hodiny týdně');
    var mInp = document.createElement('input');
    mInp.type = 'number';
    mInp.className = 'role-uvazky-minuty';
    mInp.min = 0;
    mInp.max = 59;
    mInp.value = uv.minuty;
    mInp.setAttribute('aria-label', 'Minuty týdně');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-mala role-uvazky-odebrat';
    btn.textContent = 'Odebrat';
    btn.addEventListener('click', function () {
      if (container.querySelectorAll('.role-uvazky-radek').length <= 1) return;
      row.remove();
    });
    row.appendChild(sel);
    row.appendChild(document.createTextNode(' '));
    row.appendChild(hInp);
    row.appendChild(document.createTextNode(' h '));
    row.appendChild(mInp);
    row.appendChild(document.createTextNode(' min '));
    row.appendChild(btn);
    container.appendChild(row);
  }

  /** Vyplní seznam rolí/úvazků ve formuláři podle z.roleUvazky. */
  function vykresliRoleUvazkyFormular(roleUvazky) {
    var container = document.getElementById('zamestnanci-role-uvazky-seznam');
    if (!container) return;
    container.innerHTML = '';
    var list = Array.isArray(roleUvazky) && roleUvazky.length > 0 ? roleUvazky : [{ role: (Model && Model.ROLE ? Model.ROLE.UCITELKA : 'učitelka'), uvazekMinutyTyden: 0 }];
    for (var i = 0; i < list.length; i += 1) {
      pridalRadekRoleUvazky(list[i].role, list[i].uvazekMinutyTyden);
    }
  }

  /** Vrátí všechny budovy jako pole { id, nazev }. */
  function vsechnyBudovy() {
    var data = Storage ? Storage.getData() : { budovy: [] };
    return (data.budovy || []).map(function (b) {
      return { id: b.id, nazev: b.nazev || '(bez názvu)' };
    });
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

  /** Vrátí název budovy podle id (nebo prázdný řetězec). */
  function nazevBudovy(budovaId) {
    if (!budovaId) return '';
    var budovy = vsechnyBudovy();
    var i;
    for (i = 0; i < budovy.length; i += 1) {
      if (budovy[i].id === budovaId) return budovy[i].nazev;
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

  /** Naplní select „Přiřazen pouze do“ (B1e): žádné, budovy, třídy. Nastaví vybranou hodnotu ('' | 'b:id' | 't:id'). */
  function naplnSelectPrirazenoJen(vybranaVal) {
    var sel = document.getElementById('zamestnanci-prirazeno-jen');
    if (!sel) return;
    var budovy = vsechnyBudovy();
    var tridy = vsechnyTridy();
    sel.innerHTML = '';
    var opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = '— žádné —';
    opt0.selected = !vybranaVal;
    sel.appendChild(opt0);
    var i, opt;
    for (i = 0; i < budovy.length; i += 1) {
      opt = document.createElement('option');
      opt.value = 'b:' + budovy[i].id;
      opt.textContent = 'Budova: ' + budovy[i].nazev;
      if (vybranaVal === opt.value) opt.selected = true;
      sel.appendChild(opt);
    }
    for (i = 0; i < tridy.length; i += 1) {
      opt = document.createElement('option');
      opt.value = 't:' + tridy[i].id;
      opt.textContent = 'Třída: ' + tridy[i].nazev + (tridy[i].budovaNazev ? ' (' + tridy[i].budovaNazev + ')' : '');
      if (vybranaVal === opt.value) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  /** Zobrazí nebo skryje blok „Přiřazená třída“ podle kategorie. */
  function toggleTridaWrapper() {
    var kmenova = document.getElementById('zamestnanci-kmenova');
    var wrap = document.getElementById('zamestnanci-trida-wrapper');
    var roleUvazky = (Model && Model.normalizujRoleUvazky) ? Model.normalizujRoleUvazky(formNaRoleUvazky()) : formNaRoleUvazky();
    var maAsistentku = false;
    if (Array.isArray(roleUvazky)) {
      for (var r = 0; r < roleUvazky.length; r++) {
        if (roleUvazky[r].role === (Model && Model.ROLE && Model.ROLE.ASISTENTKA) && (roleUvazky[r].uvazekMinutyTyden || 0) > 0) {
          maAsistentku = true;
          break;
        }
      }
    }
    if (wrap) wrap.hidden = !(kmenova && kmenova.checked) && !maAsistentku;
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
   * Vrátí textový popis „přiřazen pouze do“ (B1e) pro tabulku.
   * @param {Object} z - zaměstnanec (z.prirazenoJen = null | 'b:budovaId' | 't:tridaId')
   * @returns {string}
   */
  function souhrPrirazenoJen(z) {
    if (!z || !z.prirazenoJen) return '';
    var pj = z.prirazenoJen;
    if (pj.indexOf('b:') === 0) return nazevBudovy(pj.slice(2)) || pj;
    if (pj.indexOf('t:') === 0) {
      var tn = nazevTridy(pj.slice(2));
      return tn ? tn : pj;
    }
    return '';
  }

  /**
   * Vyplní formulář hodnotami zaměstnance (nebo prázdný při přidávání).
   * @param {Object|null} z - zaměstnanec nebo null
   */
  function vyplnFormular(z) {
    document.getElementById('zamestnanci-form-id').value = z ? z.id : '';
    document.getElementById('zamestnanci-jmeno').value = z ? z.jmeno : '';
    var roleUvazky = (z && Array.isArray(z.roleUvazky) && z.roleUvazky.length > 0) ? z.roleUvazky : [{ role: (Model && Model.ROLE ? Model.ROLE.UCITELKA : 'učitelka'), uvazekMinutyTyden: 0 }];
    vykresliRoleUvazkyFormular(roleUvazky);
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
    // Přiřazen pouze do (B1e)
    naplnSelectPrirazenoJen(z && z.prirazenoJen ? z.prirazenoJen : '');
    // Barva v grafu návrhu (D2e)
    var barvaEl = document.getElementById('zamestnanci-barva');
    if (barvaEl) {
      var barvaVal = (z && z.barva && typeof z.barva === 'string' && /^#[0-9a-fA-F]{6}$/.test(z.barva)) ? z.barva : prvniVolnaBarva(z ? z.id : null);
      barvaEl.value = barvaVal;
    }
  }

  /** Vrátí první nevyužitou barvu z palety (pro nového zaměstnance nebo když barva chybí). */
  function prvniVolnaBarva(vyloucitId) {
    var BARVY = (global.MSemenyNavrhGraf && global.MSemenyNavrhGraf.BARVY) ? global.MSemenyNavrhGraf.BARVY : ['#4a90d9'];
    var data = Storage ? Storage.getData() : { zamestnanci: [] };
    var used = {};
    var i, z;
    for (i = 0; i < (data.zamestnanci || []).length; i += 1) {
      z = data.zamestnanci[i];
      if (z && z.barva && z.id !== vyloucitId) used[z.barva] = true;
    }
    for (i = 0; i < BARVY.length; i += 1) {
      if (!used[BARVY[i]]) return BARVY[i];
    }
    return BARVY[0];
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

  var getUvazek = (Model && Model.getUvazekMinutyZamestnance) ? Model.getUvazekMinutyZamestnance : function (z) {
    if (Array.isArray(z.roleUvazky) && z.roleUvazky.length > 0) {
      var s = 0;
      for (var i = 0; i < z.roleUvazky.length; i += 1) s += (z.roleUvazky[i].uvazekMinutyTyden != null ? parseInt(z.roleUvazky[i].uvazekMinutyTyden, 10) : 0) || 0;
      return s;
    }
    return (z.uvazekMinutyTyden != null) ? parseInt(z.uvazekMinutyTyden, 10) || 0 : 0;
  };
  var getPrimaryRole = (Model && Model.getPrimaryRole) ? Model.getPrimaryRole : function (z) {
    if (Array.isArray(z.roleUvazky) && z.roleUvazky.length > 0) return z.roleUvazky[0].role || '';
    return z.role || '';
  };

  function getCompareForKey(key) {
    switch (key) {
      case 'jmeno':
        return function (a, b) { return (a.jmeno || '').localeCompare(b.jmeno || '', 'cs'); };
      case 'uvazek':
        return function (a, b) { return getUvazek(a) - getUvazek(b); };
      case 'role':
        return function (a, b) { return indexRole(getPrimaryRole(a)) - indexRole(getPrimaryRole(b)); };
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
      '<th>Přiřazen pouze do</th>',
      '<th>Akce</th>',
      '</tr></thead><tbody>'
    ];
    var i, z, uv, roleText, kategText, nedostText, prechodText, prirazenoText, btnUpravit, btnSmazat, ru;
    for (i = 0; i < list.length; i += 1) {
      z = list[i];
      uv = minutyNaHodinyMinuty(getUvazek(z));
      roleText = '';
      if (Array.isArray(z.roleUvazky) && z.roleUvazky.length > 0) {
        var parts = [];
        for (var ri = 0; ri < z.roleUvazky.length; ri += 1) {
          ru = z.roleUvazky[ri];
          var ruMin = (ru.uvazekMinutyTyden != null ? parseInt(ru.uvazekMinutyTyden, 10) : 0) || 0;
          var ruh = minutyNaHodinyMinuty(ruMin);
          parts.push(escapeHtml(ru.role || '') + (ruMin > 0 ? ' ' + ruh.hodiny + ' h' + (ruh.minuty > 0 ? ' ' + ruh.minuty + ' min' : '') : ''));
        }
        roleText = parts.join(', ');
      }
      if (!roleText && z.role) roleText = escapeHtml(z.role);
      if (!roleText) roleText = '—';
      kategText = (z.kmenovaVykryvaci === 'vykrývací') ? 'Vykrývací' : ('Kmenová' + (z.tridaId ? ' (' + escapeHtml(nazevTridy(z.tridaId)) + ')' : ''));
      nedostText = souhrNedostupnosti(z.nedostupnost);
      prechodText = souhrPrechodBudovy(z.prechodMeziBudovami);
      prirazenoText = souhrPrirazenoJen(z);
      btnUpravit = '<button type="button" class="btn btn-mala" data-akce="upravit" data-id="' + escapeAttr(z.id) + '">Upravit</button>';
      btnSmazat = '<button type="button" class="btn btn-mala" data-akce="smazat" data-id="' + escapeAttr(z.id) + '">Smazat</button>';
      html.push('<tr><td>' + escapeHtml(z.jmeno || '') + '</td><td>' + uv.hodiny + ' h ' + uv.minuty + ' min</td><td>' + roleText + '</td><td>' + kategText + '</td><td class="td-nedostupnost">' + (nedostText ? escapeHtml(nedostText) : '<span class="hint">—</span>') + '</td><td>' + escapeHtml(prechodText) + '</td><td>' + (prirazenoText ? escapeHtml(prirazenoText) : '<span class="hint">—</span>') + '</td><td>' + btnUpravit + ' ' + btnSmazat + '</td></tr>');
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
   * Zobrazí formulář v popup modalu (pro přidání nebo úpravu).
   * @param {Object|null} z - zaměstnanec při úpravě, null při přidání
   */
  function zobrazFormular(z) {
    vyplnFormular(z);
    var modal = document.getElementById('zamestnanci-modal');
    if (modal) {
      modal.hidden = false;
      var firstInput = document.getElementById('zamestnanci-jmeno');
      if (firstInput) firstInput.focus();
    }
  }

  /**
   * Skryje popup s formulářem.
   */
  function skryjFormular() {
    var modal = document.getElementById('zamestnanci-modal');
    if (modal) modal.hidden = true;
  }

  /**
   * Odešle formulář – přidá nebo upraví zaměstnance.
   */
  function odeslatFormular(e) {
    e.preventDefault();
    var idEl = document.getElementById('zamestnanci-form-id');
    var id = (idEl && idEl.value) ? idEl.value.trim() : '';
    var jmeno = (document.getElementById('zamestnanci-jmeno') && document.getElementById('zamestnanci-jmeno').value) ? document.getElementById('zamestnanci-jmeno').value.trim() : '';
    var roleUvazky = (Model && Model.normalizujRoleUvazky) ? Model.normalizujRoleUvazky(formNaRoleUvazky()) : formNaRoleUvazky();
    var kmenovaEl = document.getElementById('zamestnanci-kmenova');
    var kateg = (kmenovaEl && kmenovaEl.checked) ? 'kmenová' : 'vykrývací';
    var tridaEl = document.getElementById('zamestnanci-trida');
    var tridaId = (tridaEl && tridaEl.value) ? tridaEl.value.trim() : null;

    if (!Storage || !Storage.replaceData) return;
    if (!Model || !Model.vytvorZamestnance) return;

    var nedost = (Model && Model.normalizujNedostupnost) ? Model.normalizujNedostupnost(formNedostupnost) : formNedostupnost.slice();
    var prechodEl = document.getElementById('zamestnanci-prechod-budovy');
    var prechod = (prechodEl && prechodEl.value) ? prechodEl.value : 'výchozí';
    if (Model && Model.normalizujPrechodBudovy) prechod = Model.normalizujPrechodBudovy(prechod);
    var prirazenoEl = document.getElementById('zamestnanci-prirazeno-jen');
    var prirazenoVal = (prirazenoEl && prirazenoEl.value) ? prirazenoEl.value.trim() : '';
    var prirazenoJen = (prirazenoVal && (prirazenoVal.indexOf('b:') === 0 || prirazenoVal.indexOf('t:') === 0)) ? prirazenoVal : null;
    if (Model && Model.normalizujPrirazenoJen) prirazenoJen = Model.normalizujPrirazenoJen(prirazenoJen);

    var barvaEl = document.getElementById('zamestnanci-barva');
    var barva = (barvaEl && typeof barvaEl.value === 'string' && /^#[0-9a-fA-F]{6}$/.test(barvaEl.value)) ? barvaEl.value : undefined;

    if (id) {
      Storage.replaceData(function (d) {
        var zam = d.zamestnanci || [];
        var i;
        for (i = 0; i < zam.length; i += 1) {
          if (zam[i].id === id) {
            zam[i].jmeno = jmeno;
            zam[i].roleUvazky = roleUvazky;
            zam[i].kmenovaVykryvaci = kateg;
            zam[i].tridaId = tridaId;
            zam[i].nedostupnost = nedost;
            zam[i].prechodMeziBudovami = prechod;
            zam[i].prirazenoJen = prirazenoJen;
            zam[i].barva = barva;
            if (zam[i].hasOwnProperty('uvazekMinutyTyden')) delete zam[i].uvazekMinutyTyden;
            if (zam[i].hasOwnProperty('role')) delete zam[i].role;
            break;
          }
        }
        return d;
      });
    } else {
      var novy = Model.vytvorZamestnance(jmeno, roleUvazky, null, kateg, tridaId, nedost, prechod, prirazenoJen);
      if (barva) novy.barva = barva;
      Storage.replaceData(function (d) {
        d.zamestnanci = d.zamestnanci || [];
        d.zamestnanci.push(novy);
        return d;
      });
    }
    if (global.MSemenyNavrhGraf && typeof global.MSemenyNavrhGraf.doplnBarvyZamestnancum === 'function') {
      global.MSemenyNavrhGraf.doplnBarvyZamestnancum();
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

    var modal = document.getElementById('zamestnanci-modal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) skryjFormular();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var m = document.getElementById('zamestnanci-modal');
        if (m && !m.hidden) skryjFormular();
      }
    });

    var form = document.getElementById('zamestnanci-form');
    if (form) {
      form.addEventListener('submit', odeslatFormular);
    }

    var btnPridatRoli = document.getElementById('zamestnanci-pridat-roli');
    if (btnPridatRoli) {
      btnPridatRoli.addEventListener('click', function () {
        pridalRadekRoleUvazky(Model && Model.ROLE ? Model.ROLE.UCITELKA : 'učitelka', 0);
      });
    }

    var kmenovaEl = document.getElementById('zamestnanci-kmenova');
    var vykryvaciEl = document.getElementById('zamestnanci-vykryvaci');
    if (kmenovaEl) kmenovaEl.addEventListener('change', toggleTridaWrapper);
    if (vykryvaciEl) vykryvaciEl.addEventListener('change', toggleTridaWrapper);
    var roleUvazkyContainer = document.getElementById('zamestnanci-role-uvazky-seznam');
    if (roleUvazkyContainer) {
      roleUvazkyContainer.addEventListener('change', toggleTridaWrapper);
      roleUvazkyContainer.addEventListener('input', toggleTridaWrapper);
    }

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
