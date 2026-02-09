/**
 * Testy pro sekci Zaměstnanci (js/zamestnanci.js).
 */
(function (global) {
  'use strict';

  var Z = global.MSemenyZamestnanci;
  var T = global.MSemenyTest;
  var S = global.MSemenyStorage;
  var M = global.MSemenyDataModel;
  if (!T || !Z) return;

  var tests = [
    {
      name: 'MSemenyZamestnanci existuje a má API',
      run: function () {
        T.assert(Z && typeof Z.minutyNaHodinyMinuty === 'function', 'minutyNaHodinyMinuty');
        T.assert(typeof Z.seradZamestnance === 'function', 'seradZamestnance');
        T.assert(typeof Z.vykresliSeznam === 'function', 'vykresliSeznam');
        T.assert(typeof Z.zobrazFormular === 'function', 'zobrazFormular');
        T.assert(typeof Z.skryjFormular === 'function', 'skryjFormular');
      }
    },
    {
      name: 'seradZamestnance řadí nejdřív podle role (ředitelka, zástupkyně, učitelka, asistentka, školník), pak podle jména',
      run: function () {
        if (!M || !Z) return;
        var list = [
          M.vytvorZamestnance('Anna', 480, M.ROLE.UCITELKA),
          M.vytvorZamestnance('Béla', 400, M.ROLE.REDITELKA),
          M.vytvorZamestnance('Cécile', 300, M.ROLE.ASISTENTKA)
        ];
        var sorted = Z.seradZamestnance(list);
        T.assert(sorted[0].jmeno === 'Béla' && M.getPrimaryRole(sorted[0]) === M.ROLE.REDITELKA, 'první ředitelka');
        T.assert(sorted[1].jmeno === 'Anna' && M.getPrimaryRole(sorted[1]) === M.ROLE.UCITELKA, 'druhá učitelka');
        T.assert(sorted[2].jmeno === 'Cécile' && M.getPrimaryRole(sorted[2]) === M.ROLE.ASISTENTKA, 'třetí asistentka');
        var list2 = [
          M.vytvorZamestnance('Dana', 480, M.ROLE.UCITELKA),
          M.vytvorZamestnance('Alena', 480, M.ROLE.UCITELKA)
        ];
        var sorted2 = Z.seradZamestnance(list2);
        T.assert(sorted2[0].jmeno === 'Alena' && sorted2[1].jmeno === 'Dana', 'v rámci role podle jména');
      }
    },
    {
      name: 'seradZamestnance s vlastními kritérii (B1c) – řazení jen podle jména sestupně',
      run: function () {
        if (!M || !Z) return;
        var list = [
          M.vytvorZamestnance('Alena', 480, M.ROLE.UCITELKA),
          M.vytvorZamestnance('Béla', 400, M.ROLE.UCITELKA),
          M.vytvorZamestnance('Cyril', 300, M.ROLE.UCITELKA)
        ];
        var sorted = Z.seradZamestnance(list, [{ key: 'jmeno', dir: -1 }]);
        T.assert(sorted[0].jmeno === 'Cyril' && sorted[2].jmeno === 'Alena', 'podle jména sestupně');
      }
    },
    {
      name: 'Trojstavové řazení: nahoru → dolu → neřadit (B1c)',
      run: function () {
        if (!Z || typeof Z.nastavPrimarniRazeni !== 'function' || typeof Z.getRazeniKriteria !== 'function') return;
        var k;
        Z.nastavPrimarniRazeni('jmeno');
        k = Z.getRazeniKriteria();
        T.assert(k.length >= 1 && k[0].key === 'jmeno' && k[0].dir === 1, '1. klik: jméno nahoru (▲)');
        Z.nastavPrimarniRazeni('jmeno');
        k = Z.getRazeniKriteria();
        T.assert(k.length >= 1 && k[0].key === 'jmeno' && k[0].dir === -1, '2. klik: jméno dolu (▼)');
        Z.nastavPrimarniRazeni('jmeno');
        k = Z.getRazeniKriteria();
        var hasJmeno = k.some(function (x) { return x.key === 'jmeno'; });
        T.assert(!hasJmeno, '3. klik: jméno neřadit (odebráno z kritérií)');
        T.assert(k.length >= 1, 'po odebrání zůstávají výchozí nebo jiná kritéria');
      }
    },
    {
      name: 'minutyNaHodinyMinuty(0) vrací 0 h 0 min',
      run: function () {
        var r = Z.minutyNaHodinyMinuty(0);
        T.assert(r.hodiny === 0 && r.minuty === 0, '0 minut');
      }
    },
    {
      name: 'minutyNaHodinyMinuty(90) vrací 1 h 30 min',
      run: function () {
        var r = Z.minutyNaHodinyMinuty(90);
        T.assert(r.hodiny === 1 && r.minuty === 30, '90 minut = 1h 30min');
      }
    },
    {
      name: 'minutyNaHodinyMinuty(480) vrací 8 h 0 min',
      run: function () {
        var r = Z.minutyNaHodinyMinuty(480);
        T.assert(r.hodiny === 8 && r.minuty === 0, '480 minut = 8h');
      }
    },
    {
      name: 'minutyNaHodinyMinuty záporné ošetří jako 0',
      run: function () {
        var r = Z.minutyNaHodinyMinuty(-10);
        T.assert(r.hodiny === 0 && r.minuty === 0, 'záporné → 0');
      }
    },
    {
      name: 'Přidání zaměstnance přes replaceData se projeví v getData',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.zamestnanci.push(M.vytvorZamestnance('Test B1', 480, M.ROLE.UCITELKA));
          return d;
        });
        var data = S.getData();
        T.assert(data.zamestnanci.length === 1, 'jedna osoba');
        T.assert(data.zamestnanci[0].jmeno === 'Test B1', 'jméno');
        var ru = data.zamestnanci[0].roleUvazky;
        T.assert(Array.isArray(ru) && ru.length === 1 && ru[0].role === M.ROLE.UCITELKA && ru[0].uvazekMinutyTyden === 480, 'roleUvazky: učitelka 480 min');
        T.assert(M.getUvazekMinutyZamestnance && M.getUvazekMinutyZamestnance(data.zamestnanci[0]) === 480, 'celkový úvazek 480 min');
      }
    },
    {
      name: 'Smazání zaměstnance přes replaceData se projeví v getData',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        var z = M.vytvorZamestnance('Na smazání', 300, M.ROLE.ASISTENTKA);
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.zamestnanci.push(z);
          return d;
        });
        T.assert(S.getData().zamestnanci.length === 1, 'před smazáním 1');
        S.replaceData(function (d) {
          d.zamestnanci = d.zamestnanci.filter(function (x) { return x.id !== z.id; });
          return d;
        });
        T.assert(S.getData().zamestnanci.length === 0, 'po smazání 0');
      }
    },
    {
      name: 'vytvorZamestnance vytvoří nedostupnost jako prázdné pole (B1d)',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('Test', 480, M.ROLE.UCITELKA);
        T.assert(Array.isArray(z.nedostupnost), 'nedostupnost je pole');
        T.assert(z.nedostupnost.length === 0, 'nedostupnost je prázdná');
      }
    },
    {
      name: 'vytvorZamestnance uloží nedostupnost z parametru (B1d)',
      run: function () {
        if (!M) return;
        var ned = [
          { den: 1, od: '07:00', do: '12:00' },
          { den: 3, od: '13:00', do: '17:00' }
        ];
        var z = M.vytvorZamestnance('Test', 480, M.ROLE.UCITELKA, 'kmenová', null, ned);
        T.assert(z.nedostupnost.length === 2, '2 bloky nedostupnosti');
        T.assert(z.nedostupnost[0].den === 1 && z.nedostupnost[0].od === '07:00', 'první blok: Po 07:00');
        T.assert(z.nedostupnost[1].den === 3 && z.nedostupnost[1].do === '17:00', 'druhý blok: St do 17:00');
      }
    },
    {
      name: 'normalizujNedostupnost odfiltruje neplatné záznamy (B1d)',
      run: function () {
        if (!M || !M.normalizujNedostupnost) return;
        var vstup = [
          { den: 1, od: '07:00', do: '12:00' },  // platný
          { den: 6, od: '07:00', do: '12:00' },  // neplatný den (sobota)
          { den: 0, od: '07:00', do: '12:00' },  // neplatný den
          { den: 2, od: '', do: '12:00' },         // prázdný od
          null,                                     // null
          { den: 3, od: '08:00', do: '16:00' }    // platný
        ];
        var vysledek = M.normalizujNedostupnost(vstup);
        T.assert(vysledek.length === 2, 'pouze 2 platné záznamy');
        T.assert(vysledek[0].den === 1, 'první záznam den 1');
        T.assert(vysledek[1].den === 3, 'druhý záznam den 3');
      }
    },
    {
      name: 'normalizujNedostupnost vrátí prázdné pole pro neplatný vstup (B1d)',
      run: function () {
        if (!M || !M.normalizujNedostupnost) return;
        T.assert(M.normalizujNedostupnost(null).length === 0, 'null → []');
        T.assert(M.normalizujNedostupnost(undefined).length === 0, 'undefined → []');
        T.assert(M.normalizujNedostupnost('text').length === 0, 'string → []');
      }
    },
    {
      name: 'souhrNedostupnosti vrátí textový souhrn (B1d)',
      run: function () {
        if (!Z || !Z.souhrNedostupnosti) return;
        var ned = [
          { den: 3, od: '13:00', do: '17:00' },
          { den: 1, od: '07:00', do: '12:00' }
        ];
        var text = Z.souhrNedostupnosti(ned);
        T.assert(typeof text === 'string' && text.length > 0, 'neprázdný řetězec');
        // Měl by obsahovat Po a St (řazeno podle dne)
        T.assert(text.indexOf('Po') < text.indexOf('St'), 'Po před St (řazeno)');
      }
    },
    {
      name: 'souhrNedostupnosti vrátí prázdný řetězec pro prázdné pole (B1d)',
      run: function () {
        if (!Z || !Z.souhrNedostupnosti) return;
        T.assert(Z.souhrNedostupnosti([]) === '', 'prázdné pole → prázdný řetězec');
        T.assert(Z.souhrNedostupnosti(null) === '', 'null → prázdný řetězec');
      }
    },
    {
      name: 'Nedostupnost se uloží a načte přes replaceData (B1d)',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        var ned = [{ den: 2, od: '07:00', do: '10:00' }];
        var z = M.vytvorZamestnance('Test Ned', 480, M.ROLE.UCITELKA, 'kmenová', null, ned);
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.zamestnanci.push(z);
          return d;
        });
        var data = S.getData();
        T.assert(data.zamestnanci.length === 1, 'jeden zaměstnanec');
        T.assert(Array.isArray(data.zamestnanci[0].nedostupnost), 'nedostupnost je pole');
        T.assert(data.zamestnanci[0].nedostupnost.length === 1, '1 blok nedostupnosti');
        T.assert(data.zamestnanci[0].nedostupnost[0].den === 2, 'den Út');
        T.assert(data.zamestnanci[0].nedostupnost[0].od === '07:00', 'od 07:00');
      }
    },
    {
      name: 'zobrazFormular s nedostupností vykreslí tabulku v DOM (B1d)',
      run: function () {
        if (!Z || !M || !S) return;
        S.resetCache();
        S.setData(M.vychoziStav());
        var ned = [{ den: 1, od: '07:00', do: '12:00' }, { den: 3, od: '13:00', do: '17:00' }];
        var zam = M.vytvorZamestnance('Testovací', 480, M.ROLE.UCITELKA, 'kmenová', null, ned);
        var el = document.getElementById('nedostupnost-seznam');
        T.assert(el != null, 'nedostupnost-seznam existuje v DOM');
        Z.zobrazFormular(zam);
        T.assert(el.innerHTML.indexOf('tabulka-nedostupnost') >= 0, 'nedostupnost-seznam obsahuje tabulku');
        T.assert(el.innerHTML.indexOf('Pondělí') >= 0, 'tabulka obsahuje den Pondělí');
        T.assert(el.innerHTML.indexOf('Středa') >= 0, 'tabulka obsahuje den Středa');
        T.assert(el.innerHTML.indexOf('07:00') >= 0, 'tabulka obsahuje čas 07:00');
        T.assert(el.innerHTML.indexOf('17:00') >= 0, 'tabulka obsahuje čas 17:00');
      }
    },
    {
      name: 'zobrazFormular(null) zobrazí prázdnou nedostupnost (B1d)',
      run: function () {
        if (!Z) return;
        var el = document.getElementById('nedostupnost-seznam');
        T.assert(el != null, 'nedostupnost-seznam existuje v DOM');
        Z.zobrazFormular(null);
        T.assert(el.innerHTML.indexOf('nedostupnost-prazdno') >= 0, 'zobrazí se zpráva „žádná nedostupnost"');
        T.assert(el.innerHTML.indexOf('tabulka-nedostupnost') < 0, 'žádná tabulka');
      }
    },
    {
      name: 'DIAGNOSTIKA: hodnoty nedostupnost vstupů a listener na tlačítku (B1d)',
      run: function () {
        if (!Z) return;
        var denSel = document.getElementById('nedostupnost-den');
        var odInp = document.getElementById('nedostupnost-od');
        var doInp = document.getElementById('nedostupnost-do');
        var btn = document.getElementById('nedostupnost-btn-pridat');
        T.assert(denSel != null, 'nedostupnost-den nalezen');
        T.assert(odInp != null, 'nedostupnost-od nalezen');
        T.assert(doInp != null, 'nedostupnost-do nalezen');
        T.assert(btn != null, 'nedostupnost-btn-pridat nalezen');
        // Ověřit výchozí hodnoty vstupů
        T.assert(denSel.value === '1', 'den select výchozí hodnota je "1", skutečná: "' + denSel.value + '"');
        T.assert(odInp.value === '07:00', 'od výchozí hodnota je "07:00", skutečná: "' + odInp.value + '"');
        T.assert(doInp.value === '17:00', 'do výchozí hodnota je "17:00", skutečná: "' + doInp.value + '"');
        // Ověřit, že čas od < do (string porovnání)
        T.assert(odInp.value < doInp.value, 'od < do (string): "' + odInp.value + '" < "' + doInp.value + '"');
        // Zkusit nastavit hodnoty a ověřit
        denSel.value = '2';
        odInp.value = '08:00';
        doInp.value = '14:00';
        T.assert(denSel.value === '2', 'po nastavení: den je "2", skutečná: "' + denSel.value + '"');
        T.assert(odInp.value === '08:00', 'po nastavení: od je "08:00", skutečná: "' + odInp.value + '"');
        T.assert(doInp.value === '14:00', 'po nastavení: do je "14:00", skutečná: "' + doInp.value + '"');
      }
    },
    {
      name: 'DIAGNOSTIKA: init() zamestnanci.js proběhla (vykresliSeznam zapsal do DOM) (B1d)',
      run: function () {
        var seznam = document.getElementById('zamestnanci-seznam');
        T.assert(seznam != null, 'zamestnanci-seznam existuje');
        var obsah = seznam.innerHTML;
        var initRan = obsah.indexOf('zamestnanci-prazdno') >= 0 || obsah.indexOf('tabulka-zamestnanci') >= 0;
        T.assert(initRan, 'init() proběhla – zamestnanci-seznam má obsah. Skutečný innerHTML: "' + obsah.substring(0, 80) + '"');
      }
    },
    {
      name: 'DIAGNOSTIKA: click event se doručí na tlačítko nedostupnost-btn-pridat (B1d)',
      run: function () {
        var btn = document.getElementById('nedostupnost-btn-pridat');
        T.assert(btn != null, 'tlačítko existuje');
        var testClicked = false;
        var handler = function () { testClicked = true; };
        btn.addEventListener('click', handler);
        btn.click();
        btn.removeEventListener('click', handler);
        T.assert(testClicked, 'click event se doručí na tlačítko (testový listener zavolán)');
        // Pokud testClicked = true ale DOM se nezmění, init() listener buď nebyl připojen, nebo pridatNedostupnost tiše selhala.
      }
    },
    {
      name: 'DIAGNOSTIKA: init() připojila listener na nedostupnost-btn-pridat (B1d)',
      run: function () {
        if (!Z) return;
        var el = document.getElementById('nedostupnost-seznam');
        T.assert(el != null, 'nedostupnost-seznam existuje');
        // Nastavit known state
        Z.zobrazFormular(null);
        var htmlPred = el.innerHTML;
        // Nastavit validní hodnoty
        var denSel = document.getElementById('nedostupnost-den');
        var odInp = document.getElementById('nedostupnost-od');
        var doInp = document.getElementById('nedostupnost-do');
        denSel.value = '3';
        odInp.value = '09:00';
        doInp.value = '15:00';
        // Kliknout
        var btn = document.getElementById('nedostupnost-btn-pridat');
        btn.click();
        var htmlPo = el.innerHTML;
        // Pokud se HTML změnilo, listener z init() funguje
        T.assert(htmlPo !== htmlPred, 'po kliknutí se HTML nedostupnost-seznam změnilo (listener z init() funguje). Před: "' + htmlPred.substring(0, 60) + '…", po: "' + htmlPo.substring(0, 60) + '…"');
      }
    },
    {
      name: 'Klik na „Přidat" v nedostupnosti přidá řádek do tabulky (B1d – DOM test)',
      run: function () {
        if (!Z) return;
        var el = document.getElementById('nedostupnost-seznam');
        var btn = document.getElementById('nedostupnost-btn-pridat');
        var denSel = document.getElementById('nedostupnost-den');
        var odInp = document.getElementById('nedostupnost-od');
        var doInp = document.getElementById('nedostupnost-do');
        T.assert(el != null, 'nedostupnost-seznam existuje');
        T.assert(btn != null, 'tlačítko Přidat existuje');
        T.assert(denSel != null && odInp != null && doInp != null, 'formulářové vstupy existují');
        // Otevřít formulář pro nového zaměstnance – vynuluje nedostupnost
        Z.zobrazFormular(null);
        T.assert(el.innerHTML.indexOf('tabulka-nedostupnost') < 0, 'před klikem: žádná tabulka');
        // Nastavit hodnoty vstupů
        denSel.value = '2'; // Úterý
        odInp.value = '08:00';
        doInp.value = '14:00';
        // Kliknout na tlačítko Přidat
        btn.click();
        // Po kliknutí by se měl v nedostupnost-seznam objevit řádek s tabulkou
        T.assert(el.innerHTML.indexOf('tabulka-nedostupnost') >= 0, 'po kliknutí: tabulka nedostupnosti se zobrazila');
        T.assert(el.innerHTML.indexOf('Úterý') >= 0, 'po kliknutí: tabulka obsahuje den Úterý');
        T.assert(el.innerHTML.indexOf('08:00') >= 0, 'po kliknutí: tabulka obsahuje čas 08:00');
        T.assert(el.innerHTML.indexOf('14:00') >= 0, 'po kliknutí: tabulka obsahuje čas 14:00');
      }
    },
    {
      name: 'Klik na „Celý den" v nedostupnosti přidá řádek 07:00–17:00 (B1d – DOM test)',
      run: function () {
        if (!Z) return;
        var el = document.getElementById('nedostupnost-seznam');
        var btn = document.getElementById('nedostupnost-btn-cely-den');
        var denSel = document.getElementById('nedostupnost-den');
        T.assert(el != null && btn != null && denSel != null, 'DOM elementy existují');
        Z.zobrazFormular(null);
        denSel.value = '5'; // Pátek
        btn.click();
        T.assert(el.innerHTML.indexOf('tabulka-nedostupnost') >= 0, 'po kliknutí Celý den: tabulka se zobrazila');
        T.assert(el.innerHTML.indexOf('Pátek') >= 0, 'po kliknutí: den Pátek');
        T.assert(el.innerHTML.indexOf('07:00') >= 0, 'po kliknutí: od 07:00');
        T.assert(el.innerHTML.indexOf('17:00') >= 0, 'po kliknutí: do 17:00');
      }
    },
    // --- C5: Přechod mezi budovami ---
    {
      name: 'vytvorZamestnance má výchozí prechodMeziBudovami = „výchozí" (C5)',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('Test C5', 480, M.ROLE.UCITELKA);
        T.assert(z.prechodMeziBudovami === 'výchozí', 'výchozí hodnota je „výchozí"');
      }
    },
    {
      name: 'vytvorZamestnance přijme prechodMeziBudovami „zakázat" a „povolit" (C5)',
      run: function () {
        if (!M) return;
        var z1 = M.vytvorZamestnance('Test', 480, M.ROLE.UCITELKA, 'kmenová', null, [], 'zakázat');
        T.assert(z1.prechodMeziBudovami === 'zakázat', 'zakázat');
        var z2 = M.vytvorZamestnance('Test', 480, M.ROLE.UCITELKA, 'kmenová', null, [], 'povolit');
        T.assert(z2.prechodMeziBudovami === 'povolit', 'povolit');
      }
    },
    {
      name: 'vytvorZamestnance normalizuje neplatný prechodMeziBudovami na „výchozí" (C5)',
      run: function () {
        if (!M) return;
        var z1 = M.vytvorZamestnance('Test', 480, M.ROLE.UCITELKA, 'kmenová', null, [], 'neplatna');
        T.assert(z1.prechodMeziBudovami === 'výchozí', 'neplatná → výchozí');
        var z2 = M.vytvorZamestnance('Test', 480, M.ROLE.UCITELKA, 'kmenová', null, [], null);
        T.assert(z2.prechodMeziBudovami === 'výchozí', 'null → výchozí');
      }
    },
    {
      name: 'normalizujPrechodBudovy vrací správné hodnoty (C5)',
      run: function () {
        if (!M || !M.normalizujPrechodBudovy) return;
        T.assert(M.normalizujPrechodBudovy('výchozí') === 'výchozí', 'výchozí');
        T.assert(M.normalizujPrechodBudovy('zakázat') === 'zakázat', 'zakázat');
        T.assert(M.normalizujPrechodBudovy('povolit') === 'povolit', 'povolit');
        T.assert(M.normalizujPrechodBudovy('nesmysl') === 'výchozí', 'neplatná → výchozí');
        T.assert(M.normalizujPrechodBudovy(null) === 'výchozí', 'null → výchozí');
        T.assert(M.normalizujPrechodBudovy(undefined) === 'výchozí', 'undefined → výchozí');
      }
    },
    {
      name: 'PRECHOD_BUDOVY_HODNOTY obsahuje 3 platné hodnoty (C5)',
      run: function () {
        if (!M || !M.PRECHOD_BUDOVY_HODNOTY) return;
        T.assert(Array.isArray(M.PRECHOD_BUDOVY_HODNOTY), 'je pole');
        T.assert(M.PRECHOD_BUDOVY_HODNOTY.length === 3, '3 hodnoty');
        T.assert(M.PRECHOD_BUDOVY_HODNOTY.indexOf('výchozí') >= 0, 'obsahuje výchozí');
        T.assert(M.PRECHOD_BUDOVY_HODNOTY.indexOf('zakázat') >= 0, 'obsahuje zakázat');
        T.assert(M.PRECHOD_BUDOVY_HODNOTY.indexOf('povolit') >= 0, 'obsahuje povolit');
      }
    },
    {
      name: 'souhrPrechodBudovy vrací správné texty (C5)',
      run: function () {
        if (!Z || !Z.souhrPrechodBudovy) return;
        T.assert(Z.souhrPrechodBudovy('výchozí') === 'Výchozí', 'výchozí');
        T.assert(Z.souhrPrechodBudovy('zakázat') === 'Zakázat', 'zakázat');
        T.assert(Z.souhrPrechodBudovy('povolit') === 'Povolit', 'povolit');
        T.assert(Z.souhrPrechodBudovy(undefined) === 'Výchozí', 'undefined → Výchozí');
        T.assert(Z.souhrPrechodBudovy(null) === 'Výchozí', 'null → Výchozí');
      }
    },
    {
      name: 'zobrazFormular vyplní select přechodu mezi budovami (C5)',
      run: function () {
        if (!Z || !M || !S) return;
        S.resetCache();
        S.setData(M.vychoziStav());
        var zam = M.vytvorZamestnance('Test C5', 480, M.ROLE.UCITELKA, 'kmenová', null, [], 'povolit');
        Z.zobrazFormular(zam);
        var sel = document.getElementById('zamestnanci-prechod-budovy');
        T.assert(sel != null, 'select existuje');
        T.assert(sel.value === 'povolit', 'select má hodnotu „povolit"');
      }
    },
    {
      name: 'zobrazFormular(null) nastaví select přechodu na „výchozí" (C5)',
      run: function () {
        if (!Z) return;
        Z.zobrazFormular(null);
        var sel = document.getElementById('zamestnanci-prechod-budovy');
        T.assert(sel != null, 'select existuje');
        T.assert(sel.value === 'výchozí', 'select má hodnotu „výchozí"');
      }
    },
    {
      name: 'prechodMeziBudovami se uloží a načte přes replaceData (C5)',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        var z = M.vytvorZamestnance('Test Prechod', 480, M.ROLE.UCITELKA, 'kmenová', null, [], 'zakázat');
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.zamestnanci.push(z);
          return d;
        });
        var data = S.getData();
        T.assert(data.zamestnanci.length === 1, 'jeden zaměstnanec');
        T.assert(data.zamestnanci[0].prechodMeziBudovami === 'zakázat', 'uloženo zakázat');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
