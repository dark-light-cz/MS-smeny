/**
 * Testy pro výpočet návrhu směn (js/vypocet-smen.js).
 * Nový algoritmus: plánuje souvislé směny a ověřuje pravidla.
 */
(function (global) {
  'use strict';

  var V = global.MSemenyVypocetSmen;
  var M = global.MSemenyDataModel;
  var T = global.MSemenyTest;
  if (!T || !V) return;

  var tests = [
    {
      name: 'MSemenyVypocetSmen existuje a má vypocetSmen',
      run: function () {
        T.assert(V && typeof V.vypocetSmen === 'function', 'vypocetSmen');
      }
    },
    {
      name: 'vypocetSmen bez zaměstnanců vrátí ok: false a chybu',
      run: function () {
        var data = {
          zamestnanci: [],
          budovy: [{ id: 'b1', nazev: 'B', tridy: [] }],
          minMaxSloty: M ? M.vychoziMinMaxSloty() : [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0 }]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === false && r.chyba && r.chyba.indexOf('zaměstnanc') !== -1, 'chyba o zaměstnancích');
      }
    },
    {
      name: 'vypocetSmen bez slotů vrátí ok: false a chybu',
      run: function () {
        var data = {
          zamestnanci: M ? [M.vytvorZamestnance('Test', 480, M.ROLE.UCITELKA)] : [],
          budovy: [],
          minMaxSloty: []
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === false && r.chyba && r.chyba.indexOf('slot') !== -1, 'chyba o slotech');
      }
    },
    {
      name: 'vypocetSmen s jedním zaměstnancem, jednou budovou a slotem minNaBudovu 1 vrátí ok a přiřazení',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('Jedna', 480, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Pavilon');
        var slot = { id: 's1', od: '07:00', do: '07:45', minNaBudovu: 1, maxNaBudovu: null, minNaTridu: 0, maxNaTridu: null, dny: [], rotace: false };
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [slot]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true && Array.isArray(r.prirazeni), 'ok a prirazeni');
        T.assert(r.prirazeni.length === 5, '5 přiřazení (5 dnů × 1 zaměstnanec)');
        T.assert(r.prirazeni[0].den >= 1 && r.prirazeni[0].den <= 5 && r.prirazeni[0].zamestnanecId === z.id, 'přiřazení má den a zamestnanecId');
        T.assert(Array.isArray(r.prirazeni[0].segmenty) && r.prirazeni[0].segmenty.length > 0, 'přiřazení má segmenty');
      }
    },
    {
      name: 'Směna zaměstnance je souvislý blok (segmenty navazují bez mezer)',
      run: function () {
        if (!M) return;
        var z1 = M.vytvorZamestnance('A', 1860, M.ROLE.UCITELKA);
        var z2 = M.vytvorZamestnance('B', 1860, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Budova');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var data = {
          zamestnanci: [z1, z2],
          budovy: [b],
          minMaxSloty: [
            { id: 's1', od: '07:00', do: '07:45', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false },
            { id: 's2', od: '07:45', do: '16:00', minNaBudovu: 0, minNaTridu: 1, dny: [], rotace: false },
            { id: 's3', od: '16:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }
          ]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        // Ověřit, že segmenty každého zaměstnance navazují
        for (var i = 0; i < r.prirazeni.length; i++) {
          var p = r.prirazeni[i];
          var segs = p.segmenty;
          for (var j = 1; j < segs.length; j++) {
            T.assert(segs[j].od === segs[j - 1].do,
              p.zamestnanecId + ' den ' + p.den + ': segment ' + j + ' nenavazuje (' + segs[j - 1].do + ' → ' + segs[j].od + ')');
          }
        }
      }
    },
    {
      name: 'Celkový úvazek zaměstnance za týden odpovídá konfiguraci',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('TestUvazek', 1500, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Budova');
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        // Sečíst minuty za celý týden
        var totalMin = 0;
        for (var i = 0; i < r.prirazeni.length; i++) {
          if (r.prirazeni[i].zamestnanecId !== z.id) continue;
          var segs = r.prirazeni[i].segmenty;
          for (var j = 0; j < segs.length; j++) {
            var od = parseInt(segs[j].od.split(':')[0], 10) * 60 + parseInt(segs[j].od.split(':')[1], 10);
            var doM = parseInt(segs[j].do.split(':')[0], 10) * 60 + parseInt(segs[j].do.split(':')[1], 10);
            totalMin += (doM - od);
          }
        }
        // Tolerance ±5 min (zaokrouhlení daily = weekly/5)
        T.assert(Math.abs(totalMin - 1500) <= 5,
          'Celkový úvazek: očekáváno ~1500, dostali jsme ' + totalMin);
      }
    },
    {
      name: 'S překryvem: v každé třídě jsou v čase překryvu alespoň 2 osoby',
      run: function () {
        if (!M) return;
        var zamci = [];
        for (var i = 0; i < 4; i++) zamci.push(M.vytvorZamestnance('Z' + i, 1860, M.ROLE.UCITELKA));
        var b = M.vytvorBudovu('Budova');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var data = {
          zamestnanci: zamci,
          budovy: [b],
          minMaxSloty: [
            { id: 's1', od: '07:00', do: '07:45', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false },
            { id: 's2', od: '07:45', do: '17:00', minNaBudovu: 0, minNaTridu: 1, dny: [], rotace: false }
          ],
          pravidla: { minimalniPrekryvMinuty: 120 }
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        // Ověřit pokrytí: 09:00–11:00 musí mít ≥2 osoby v Třídě 1
        var tridaId = b.tridy[0].id;
        for (var den = 1; den <= 5; den++) {
          var count9to11 = 0;
          for (var pi = 0; pi < r.prirazeni.length; pi++) {
            var p = r.prirazeni[pi];
            if (p.den !== den) continue;
            for (var si = 0; si < p.segmenty.length; si++) {
              var seg = p.segmenty[si];
              if (seg.tridaId === tridaId) {
                var segOd = parseInt(seg.od.split(':')[0], 10) * 60 + parseInt(seg.od.split(':')[1], 10);
                var segDo = parseInt(seg.do.split(':')[0], 10) * 60 + parseInt(seg.do.split(':')[1], 10);
                // Překrývá se s 09:00–11:00?
                if (segOd < 11 * 60 && segDo > 9 * 60) count9to11++;
              }
            }
          }
          T.assert(count9to11 >= 2, 'Den ' + den + ': v třídě 1 v čase překryvu ' + count9to11 + ' osob (potřeba ≥2)');
        }
      }
    },
    {
      name: 'Žádný segment nemá přiřazení na budovu bez třídy (pokud budova má třídy)',
      run: function () {
        if (!M) return;
        var z1 = M.vytvorZamestnance('A', 1860, M.ROLE.UCITELKA);
        var z2 = M.vytvorZamestnance('B', 1860, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Budova');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var data = {
          zamestnanci: [z1, z2],
          budovy: [b],
          minMaxSloty: [
            { id: 's1', od: '07:00', do: '07:45', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false },
            { id: 's2', od: '07:45', do: '16:00', minNaBudovu: 0, minNaTridu: 1, dny: [], rotace: false },
            { id: 's3', od: '16:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }
          ]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        for (var i = 0; i < r.prirazeni.length; i++) {
          var p = r.prirazeni[i];
          for (var j = 0; j < p.segmenty.length; j++) {
            var seg = p.segmenty[j];
            T.assert(seg.tridaId != null,
              'Segment bez třídy: den ' + p.den + ', ' + seg.od + '–' + seg.do + ' (budova: ' + seg.budovaId + ')');
          }
        }
      }
    },

    /* === Testy nedostupnosti (B1d) === */

    {
      name: '_buildAvailMask vrátí plně dostupnou masku bez nedostupnosti',
      run: function () {
        if (!V._buildAvailMask) return;
        var z = { id: 'x', nedostupnost: [] };
        var mask = V._buildAvailMask(z, 1, 420, 600); // 7:00–17:00 = 600 min
        T.assert(mask.length === 600, 'délka masky = 600');
        var allTrue = true;
        for (var i = 0; i < mask.length; i++) { if (!mask[i]) { allTrue = false; break; } }
        T.assert(allTrue, 'vše dostupné');
      }
    },
    {
      name: '_buildAvailMask označí nedostupný blok jako false',
      run: function () {
        if (!V._buildAvailMask) return;
        // Nedostupnost: Po 09:00–12:00 (den 1)
        var z = { id: 'x', nedostupnost: [{ den: 1, od: '09:00', do: '12:00' }] };
        var mask = V._buildAvailMask(z, 1, 420, 600); // range start 7:00 = 420 min
        // 09:00 = min 120 od startu, 12:00 = min 300 od startu
        T.assert(mask[119] === true, 'min 119 (08:59) dostupná');
        T.assert(mask[120] === false, 'min 120 (09:00) nedostupná');
        T.assert(mask[299] === false, 'min 299 (11:59) nedostupná');
        T.assert(mask[300] === true, 'min 300 (12:00) dostupná');
      }
    },
    {
      name: '_buildAvailMask ignoruje jiný den',
      run: function () {
        if (!V._buildAvailMask) return;
        var z = { id: 'x', nedostupnost: [{ den: 3, od: '09:00', do: '12:00' }] };
        // Ptáme se na den 1 (Po), nedostupnost je jen ve St (den 3) → vše dostupné
        var mask = V._buildAvailMask(z, 1, 420, 600);
        var allTrue = true;
        for (var i = 0; i < mask.length; i++) { if (!mask[i]) { allTrue = false; break; } }
        T.assert(allTrue, 'den 1 plně dostupný (nedostupnost je jen den 3)');
      }
    },
    {
      name: '_longestAvailBlock najde nejdelší souvislý blok',
      run: function () {
        if (!V._longestAvailBlock) return;
        // [true × 120, false × 180, true × 300] → longest = 300
        var mask = [];
        var i;
        for (i = 0; i < 120; i++) mask.push(true);
        for (i = 0; i < 180; i++) mask.push(false);
        for (i = 0; i < 300; i++) mask.push(true);
        T.assert(V._longestAvailBlock(mask) === 300, 'nejdelší blok = 300');
      }
    },
    {
      name: 'Zaměstnanec nedostupný celý den v Po nemá přiřazení v Po',
      run: function () {
        if (!M) return;
        // Nedostupnost: celý den v Po (den 1)
        var z = M.vytvorZamestnance('Anna', 2400, M.ROLE.UCITELKA, 'kmenová', null,
          [{ den: 1, od: '07:00', do: '17:00' }]);
        var b = M.vytvorBudovu('Budova');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        // V pondělí nesmí být Anna přiřazena
        var poPrirazeni = r.prirazeni.filter(function (p) { return p.den === 1 && p.zamestnanecId === z.id; });
        T.assert(poPrirazeni.length === 0, 'Anna nemá přiřazení v pondělí (celý den nedostupná)');
        // V jiných dnech musí být přiřazena (úvazek se přerozdělí)
        var utPrirazeni = r.prirazeni.filter(function (p) { return p.den === 2 && p.zamestnanecId === z.id; });
        T.assert(utPrirazeni.length > 0, 'Anna má přiřazení v úterý');
      }
    },
    {
      name: 'Zaměstnanec nedostupný odpoledne pracuje jen dopoledne',
      run: function () {
        if (!M) return;
        // Nedostupnost: každý den odpoledne 12:00–17:00
        var nedostupnost = [];
        for (var d = 1; d <= 5; d++) nedostupnost.push({ den: d, od: '12:00', do: '17:00' });
        var z = M.vytvorZamestnance('Béla', 1500, M.ROLE.UCITELKA, 'kmenová', null, nedostupnost);
        var b = M.vytvorBudovu('Budova');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        // Ověřit, že žádný segment nepřesahuje 12:00
        for (var i = 0; i < r.prirazeni.length; i++) {
          var p = r.prirazeni[i];
          if (p.zamestnanecId !== z.id) continue;
          for (var j = 0; j < p.segmenty.length; j++) {
            var seg = p.segmenty[j];
            var doH = parseInt(seg.do.split(':')[0], 10);
            var doMin = parseInt(seg.do.split(':')[1], 10);
            var doTotal = doH * 60 + doMin;
            T.assert(doTotal <= 12 * 60,
              'Den ' + p.den + ': segment končí ' + seg.do + ' (očekáváno ≤ 12:00)');
          }
        }
      }
    },
    {
      name: 'Nedostupnost přerozdělí úvazek: zaměstnanec bez Po pracuje v Út–Pá déle',
      run: function () {
        if (!M) return;
        // Úvazek 2000 min/týden, nedostupný celé Po → 2000/4 = 500 min/den (Út–Pá)
        var z = M.vytvorZamestnance('Cecil', 2000, M.ROLE.UCITELKA, 'kmenová', null,
          [{ den: 1, od: '07:00', do: '17:00' }]);
        var b = M.vytvorBudovu('Budova');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        // Sečíst minuty za Út–Pá
        var totalMin = 0;
        for (var i = 0; i < r.prirazeni.length; i++) {
          var p = r.prirazeni[i];
          if (p.zamestnanecId !== z.id) continue;
          for (var j = 0; j < p.segmenty.length; j++) {
            var od = parseInt(p.segmenty[j].od.split(':')[0], 10) * 60 + parseInt(p.segmenty[j].od.split(':')[1], 10);
            var doM = parseInt(p.segmenty[j].do.split(':')[0], 10) * 60 + parseInt(p.segmenty[j].do.split(':')[1], 10);
            totalMin += (doM - od);
          }
        }
        // Celkový úvazek by měl odpovídat ~2000 min (±5 tolerance na zaokrouhlení)
        T.assert(Math.abs(totalMin - 2000) <= 5,
          'Celkový úvazek za týden: očekáváno ~2000, dostali ' + totalMin);
      }
    },
    {
      name: 'Směna nezasahuje do nedostupného bloku uprostřed dne',
      run: function () {
        if (!M) return;
        // Nedostupnost: Po 10:00–11:00 (uprostřed dne)
        var z = M.vytvorZamestnance('Dana', 1500, M.ROLE.UCITELKA, 'kmenová', null,
          [{ den: 1, od: '10:00', do: '11:00' }]);
        var b = M.vytvorBudovu('Budova');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        // V Po: segmenty nesmí překrývat 10:00–11:00
        var poPrirazeni = r.prirazeni.filter(function (p) { return p.den === 1 && p.zamestnanecId === z.id; });
        for (var pi = 0; pi < poPrirazeni.length; pi++) {
          var segs = poPrirazeni[pi].segmenty;
          for (var j = 0; j < segs.length; j++) {
            var segOd = parseInt(segs[j].od.split(':')[0], 10) * 60 + parseInt(segs[j].od.split(':')[1], 10);
            var segDo = parseInt(segs[j].do.split(':')[0], 10) * 60 + parseInt(segs[j].do.split(':')[1], 10);
            // Segment nesmí zasahovat do 10:00–11:00 (600–660 min)
            var overlap = !(segDo <= 600 || segOd >= 660);
            T.assert(!overlap,
              'Den 1: segment ' + segs[j].od + '–' + segs[j].do + ' zasahuje do nedostupného bloku 10:00–11:00');
          }
        }
      }
    },
    {
      name: 'Kmenová zaměstnankyně je vždy ve své třídě, i ve slotu s požadavkem jen na budovu (B1e regrese)',
      run: function () {
        if (!M) return;
        // Reprodukce reálné chyby: Zuzka (kmenová, Berušky/Jednička) je algoritmem
        // umístěna do Sluníčka/Dvojka v čase 16:00–17:00, kdy je požadavek pouze
        // minNaBudovu=1, minNaTridu=0.
        // Použita přesná konfigurace z exportu.
        var data = {
          zamestnanci: [
            { id: 'z-maja', jmeno: 'Mája', uvazekMinutyTyden: 1200, role: 'zástupkyně',
              kmenovaVykryvaci: 'kmenová', tridaId: 't-mysky',
              nedostupnost: [{ den: 5, od: '07:00', do: '17:00' }] },
            { id: 'z-zuzka', jmeno: 'Zuzka', uvazekMinutyTyden: 720, role: 'ředitelka',
              kmenovaVykryvaci: 'kmenová', tridaId: 't-berusky',
              nedostupnost: [{ den: 5, od: '07:00', do: '17:00' }] },
            { id: 'z-alena', jmeno: 'Alena', uvazekMinutyTyden: 1860, role: 'učitelka' },
            { id: 'z-terezka', jmeno: 'Terezka', uvazekMinutyTyden: 1860, role: 'učitelka' },
            { id: 'z-vera', jmeno: 'Věra', uvazekMinutyTyden: 1860, role: 'učitelka' },
            { id: 'z-martinaS', jmeno: 'Martina Š.', uvazekMinutyTyden: 1860, role: 'učitelka' },
            { id: 'z-martinaM', jmeno: 'Martina M.', uvazekMinutyTyden: 1860, role: 'učitelka',
              kmenovaVykryvaci: 'kmenová', tridaId: null },
            { id: 'z-lucka', jmeno: 'Lucka', uvazekMinutyTyden: 1860, role: 'učitelka' },
            { id: 'z-blanka', jmeno: 'Blanka', uvazekMinutyTyden: 1860, role: 'učitelka' },
            { id: 'z-sylva', jmeno: 'Sylva', uvazekMinutyTyden: 1590, role: 'učitelka',
              kmenovaVykryvaci: 'vykrývací', tridaId: null },
            { id: 'z-kamila', jmeno: 'Kamila', uvazekMinutyTyden: 150, role: 'učitelka',
              kmenovaVykryvaci: 'vykrývací', tridaId: null },
            { id: 'z-eva', jmeno: 'Eva', uvazekMinutyTyden: 210, role: 'učitelka',
              kmenovaVykryvaci: 'vykrývací', tridaId: null },
            { id: 'z-hanka', jmeno: 'Hanka', uvazekMinutyTyden: 480, role: 'učitelka',
              kmenovaVykryvaci: 'vykrývací', tridaId: null }
          ],
          budovy: [
            { id: 'b-jednicka', nazev: 'Jednička',
              oteviraciDoba: { dny: [1,2,3,4,5], od: '07:00', do: '17:00' },
              tridy: [
                { id: 't-mysky', nazev: 'Myšky' },
                { id: 't-berusky', nazev: 'Berušky' },
                { id: 't-jezci', nazev: 'Ježci' }
              ] },
            { id: 'b-dvojka', nazev: 'Dvojka',
              oteviraciDoba: { dny: [1,2,3,4,5], od: '07:00', do: '17:00' },
              tridy: [
                { id: 't-slunicka', nazev: 'Sluníčka' },
                { id: 't-zabky', nazev: 'Žabky' }
              ] }
          ],
          minMaxSloty: [
            { id: 's1', od: '07:00', do: '07:45', minNaBudovu: 1, maxNaBudovu: null,
              minNaTridu: 0, maxNaTridu: null, dny: [], rotace: false },
            { id: 's2', od: '07:45', do: '16:00', minNaTridu: 1, maxNaTridu: null,
              minNaBudovu: 0, maxNaBudovu: null, dny: [], rotace: false },
            { id: 's3', od: '16:00', do: '17:00', minNaBudovu: 1, maxNaBudovu: null,
              minNaTridu: 0, maxNaTridu: null, dny: [1,2,3,4], rotace: false },
            { id: 's4', od: '16:00', do: '17:00', minNaBudovu: 1, maxNaBudovu: null,
              minNaTridu: 0, maxNaTridu: null, dny: [5], rotace: true }
          ],
          pravidla: { minimalniPrekryvMinuty: 120, vykryvaciBezMezer: true, vykryvaciMaxPresun: 1 },
          omezeniNeDohromady: [
            { id: 'o1', osoba1Id: 'z-alena', osoba2Id: 'z-lucka' },
            { id: 'o2', osoba1Id: 'z-maja', osoba2Id: 'z-martinaM' },
            { id: 'o3', osoba1Id: 'z-maja', osoba2Id: 'z-zuzka' }
          ]
        };

        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');

        // Ověřit: VŠECHNY segmenty Zuzky musí být v třídě Berušky (t-berusky).
        // Aktuální chyba: algoritmus ji v 16:00–17:00 umístí do Sluníčka (Dvojka).
        var chyby = [];
        for (var pi = 0; pi < r.prirazeni.length; pi++) {
          var p = r.prirazeni[pi];
          if (p.zamestnanecId !== 'z-zuzka') continue;
          for (var si = 0; si < p.segmenty.length; si++) {
            var seg = p.segmenty[si];
            if (seg.tridaId !== 't-berusky') {
              chyby.push('Den ' + p.den + ', ' + seg.od + '–' + seg.do +
                ': třída=' + (seg.tridaId || 'null'));
            }
          }
        }
        T.assert(chyby.length === 0,
          'Zuzka (kmenová Berušky) je v jiné třídě: ' + chyby.join('; '));
      }
    },

    {
      name: 'Bez nedostupnosti se chování nemění (stávající zaměstnanci bez pole nedostupnost)',
      run: function () {
        if (!M) return;
        // Zaměstnanec bez nedostupnosti (prázdné pole nebo undefined)
        var z1 = M.vytvorZamestnance('A', 1500, M.ROLE.UCITELKA);
        var z2 = { id: 'z2-test', jmeno: 'B', uvazekMinutyTyden: 1500, role: 'učitelka' }; // bez nedostupnost klíče
        var b = M.vytvorBudovu('Budova');
        var data = {
          zamestnanci: [z1, z2],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }]
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        // Oba zaměstnanci musí mít přiřazení ve všech 5 dnech
        for (var den = 1; den <= 5; den++) {
          var found1 = r.prirazeni.filter(function (p) { return p.den === den && p.zamestnanecId === z1.id; });
          var found2 = r.prirazeni.filter(function (p) { return p.den === den && p.zamestnanecId === z2.id; });
          T.assert(found1.length > 0, 'A má přiřazení den ' + den);
          T.assert(found2.length > 0, 'B má přiřazení den ' + den);
        }
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
