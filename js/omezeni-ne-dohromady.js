/**
 * Omezení „ne dohromady“ (C4) – dvojice osob, které nemají být spolu v jedné třídě/směně.
 * Sekce Pravidla: seznam dvojic, formulář přidat, smazat. Uložení do modelu (omezeniNeDohromady).
 */
(function (global) {
  'use strict';

  var Storage = global.MSemenyStorage;
  var Model = global.MSemenyDataModel;

  function getData() {
    return Storage ? Storage.getData() : { zamestnanci: [], omezeniNeDohromady: [] };
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

  function jmenoZamestnance(id) {
    var data = getData();
    var z = (data.zamestnanci || []).filter(function (z) { return z.id === id; })[0];
    return z ? (z.jmeno || '(bez jména)') : '(neznámá osoba)';
  }

  function zobrazZpravu(text) {
    var el = document.getElementById('ne-dohromady-zprava');
    if (el) {
      el.textContent = text || '';
      el.hidden = !text;
      if (text) setTimeout(function () { el.hidden = true; el.textContent = ''; }, 3000);
    }
  }

  function zobrazChybu(text) {
    var el = document.getElementById('ne-dohromady-chyba');
    var ok = document.getElementById('ne-dohromady-zprava');
    if (el) {
      el.textContent = text || '';
      el.hidden = !text;
    }
    if (ok) ok.hidden = true;
  }

  function skryjZpravy() {
    zobrazZpravu('');
    zobrazChybu('');
  }

  /** Naplní selecty zaměstnanci (id, jméno). */
  function naplnSelecty() {
    var data = getData();
    var zam = (data.zamestnanci || []).slice();
    zam.sort(function (a, b) { return (a.jmeno || '').localeCompare(b.jmeno || '', 'cs'); });
    var opts = '<option value="">— vyberte —</option>' + zam.map(function (z) {
      return '<option value="' + escapeAttr(z.id) + '">' + escapeHtml(z.jmeno || '') + '</option>';
    }).join('');
    var s1 = document.getElementById('ne-dohromady-osoba1');
    var s2 = document.getElementById('ne-dohromady-osoba2');
    if (s1) s1.innerHTML = opts;
    if (s2) s2.innerHTML = opts;
  }

  /** Vykreslí seznam dvojic. */
  function vykresliSeznam() {
    var el = document.getElementById('ne-dohromady-seznam');
    if (!el) return;
    var data = getData();
    var ond = data.omezeniNeDohromady || [];

    if (ond.length === 0) {
      el.innerHTML = '<p class="omezeni-prazdno">Zatím nemáte žádné omezení „ne dohromady“. Vyberte dvě osoby a klikněte na „Přidat dvojici“.</p>';
      return;
    }

    var html = '<ul class="omezeni-list">';
    ond.forEach(function (o) {
      var j1 = jmenoZamestnance(o.osoba1Id);
      var j2 = jmenoZamestnance(o.osoba2Id);
      html += '<li>';
      html += escapeHtml(j1) + ' – ' + escapeHtml(j2);
      html += ' <button type="button" class="btn btn-mala" data-akce="smazat" data-id="' + escapeAttr(o.id) + '">Smazat</button>';
      html += '</li>';
    });
    html += '</ul>';
    el.innerHTML = html;
  }

  /** Je dvojice (id1, id2) již v seznamu? (kanonické pořadí.) */
  function jeDuplicitni(id1, id2, bezId) {
    var a = id1;
    var b = id2;
    if (a > b) { var t = a; a = b; b = t; }
    var ond = (getData().omezeniNeDohromady || []).filter(function (o) { return o.id !== bezId; });
    return ond.some(function (o) {
      var o1 = o.osoba1Id;
      var o2 = o.osoba2Id;
      return (o1 === a && o2 === b) || (o1 === b && o2 === a);
    });
  }

  function odeslatFormular(e) {
    e.preventDefault();
    skryjZpravy();
    var s1 = document.getElementById('ne-dohromady-osoba1');
    var s2 = document.getElementById('ne-dohromady-osoba2');
    var id1 = s1 && s1.value ? s1.value.trim() : '';
    var id2 = s2 && s2.value ? s2.value.trim() : '';

    if (!id1 || !id2) {
      zobrazChybu('Vyberte obě osoby.');
      return;
    }
    if (id1 === id2) {
      zobrazChybu('Vyberte dvě různé osoby.');
      return;
    }
    if (jeDuplicitni(id1, id2, null)) {
      zobrazChybu('Tato dvojice už v seznamu je.');
      return;
    }

    if (!Storage || !Storage.replaceData || !Model || !Model.vytvorOmezeniNeDohromady) return;
    var novy = Model.vytvorOmezeniNeDohromady(id1, id2);
    Storage.replaceData(function (d) {
      d.omezeniNeDohromady = d.omezeniNeDohromady || [];
      d.omezeniNeDohromady.push(novy);
      return d;
    });
    naplnSelecty();
    vykresliSeznam();
    zobrazZpravu('Dvojice byla přidána.');
    if (s1) s1.value = '';
    if (s2) s2.value = '';
  }

  function smazat(id) {
    if (!global.confirm('Opravdu odebrat toto omezení „ne dohromady“?')) return;
    if (!Storage || !Storage.replaceData) return;
    Storage.replaceData(function (d) {
      d.omezeniNeDohromady = (d.omezeniNeDohromady || []).filter(function (o) { return o.id !== id; });
      return d;
    });
    vykresliSeznam();
    zobrazZpravu('Omezení bylo odebráno.');
    setTimeout(skryjZpravy, 3000);
  }

  function naKlikSeznam(e) {
    var akce = e.target && e.target.getAttribute && e.target.getAttribute('data-akce');
    var id = e.target && e.target.getAttribute && e.target.getAttribute('data-id');
    if (akce === 'smazat' && id) smazat(id);
  }

  function init() {
    if (!Storage || !Model) return;
    naplnSelecty();
    vykresliSeznam();

    var form = document.getElementById('ne-dohromady-form');
    if (form) form.addEventListener('submit', odeslatFormular);

    var seznam = document.getElementById('ne-dohromady-seznam');
    if (seznam) seznam.addEventListener('click', naKlikSeznam);
  }

  // Skripty jsou na konci <body>, DOM je kompletní – init() voláme ihned.
  init();

  global.MSemenyOmezeniNeDohromady = {
    vykresliSeznam: vykresliSeznam,
    naplnSelecty: naplnSelecty
  };
})(typeof window !== 'undefined' ? window : this);
