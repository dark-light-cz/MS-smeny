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
   * Seřadí zaměstnance: nejdřív podle role (ROLE_RAZENI), v rámci role podle jména.
   */
  function seradZamestnance(list) {
    return (list || []).slice().sort(function (a, b) {
      var ra = indexRole(a.role);
      var rb = indexRole(b.role);
      if (ra !== rb) return ra - rb;
      return (a.jmeno || '').localeCompare(b.jmeno || '', 'cs');
    });
  }

  /**
   * Vykreslí tabulku zaměstnanců do #zamestnanci-seznam (řazenou podle role a jména).
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

    var html = ['<table class="tabulka-zamestnanci"><thead><tr><th>Jméno</th><th>Úvazek (týden)</th><th>Role</th><th>Akce</th></tr></thead><tbody>'];
    var i, z, uv, btnUpravit, btnSmazat;
    for (i = 0; i < list.length; i += 1) {
      z = list[i];
      uv = minutyNaHodinyMinuty(z.uvazekMinutyTyden);
      btnUpravit = '<button type="button" class="btn btn-mala" data-akce="upravit" data-id="' + escapeAttr(z.id) + '">Upravit</button>';
      btnSmazat = '<button type="button" class="btn btn-mala" data-akce="smazat" data-id="' + escapeAttr(z.id) + '">Smazat</button>';
      html.push('<tr><td>' + escapeHtml(z.jmeno || '') + '</td><td>' + uv.hodiny + ' h ' + uv.minuty + ' min</td><td>' + escapeHtml(z.role || '') + '</td><td>' + btnUpravit + ' ' + btnSmazat + '</td></tr>');
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

    if (!Storage || !Storage.replaceData) return;
    if (!Model || !Model.vytvorZamestnance) return;

    if (id) {
      Storage.replaceData(function (d) {
        var zam = d.zamestnanci || [];
        var i;
        for (i = 0; i < zam.length; i += 1) {
          if (zam[i].id === id) {
            zam[i].jmeno = jmeno;
            zam[i].uvazekMinutyTyden = minuty;
            zam[i].role = role;
            break;
          }
        }
        return d;
      });
    } else {
      var novy = Model.vytvorZamestnance(jmeno, minuty, role);
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
   * Delegace kliknutí v seznamu (Upravit / Smazat).
   */
  function naKlikSeznam(e) {
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

    var seznam = document.getElementById('zamestnanci-seznam');
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

  global.MSemenyZamestnanci = {
    minutyNaHodinyMinuty: minutyNaHodinyMinuty,
    seradZamestnance: seradZamestnance,
    vykresliSeznam: vykresliSeznam,
    zobrazFormular: zobrazFormular,
    skryjFormular: skryjFormular
  };
})(typeof window !== 'undefined' ? window : this);
