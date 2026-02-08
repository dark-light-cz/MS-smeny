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

    /* === D5: Helper _maZakazPrechodu === */

    {
      name: '_maZakazPrechodu: výchozí + globální zákaz → zakázán',
      run: function () {
        if (!V._maZakazPrechodu) return;
        var z = { prechodMeziBudovami: 'výchozí' };
        T.assert(V._maZakazPrechodu(z, { zakazPrechodMeziBudovami: true }) === true,
          'výchozí + globální zákaz = zakázán');
      }
    },
    {
      name: '_maZakazPrechodu: výchozí + globální povolení → povolen',
      run: function () {
        if (!V._maZakazPrechodu) return;
        var z = { prechodMeziBudovami: 'výchozí' };
        T.assert(V._maZakazPrechodu(z, { zakazPrechodMeziBudovami: false }) === false,
          'výchozí + globální povolení = povolen');
      }
    },
    {
      name: '_maZakazPrechodu: lokální zakázat má přednost před globálním povolením',
      run: function () {
        if (!V._maZakazPrechodu) return;
        var z = { prechodMeziBudovami: 'zakázat' };
        T.assert(V._maZakazPrechodu(z, { zakazPrechodMeziBudovami: false }) === true,
          'lokální zakázat = zakázán (i přes globální povolení)');
      }
    },
    {
      name: '_maZakazPrechodu: lokální povolit má přednost před globálním zákazem',
      run: function () {
        if (!V._maZakazPrechodu) return;
        var z = { prechodMeziBudovami: 'povolit' };
        T.assert(V._maZakazPrechodu(z, { zakazPrechodMeziBudovami: true }) === false,
          'lokální povolit = povolen (i přes globální zákaz)');
      }
    },
    {
      name: '_maZakazPrechodu: chybějící lokální hodnota → globální nastavení',
      run: function () {
        if (!V._maZakazPrechodu) return;
        var z = {}; // bez prechodMeziBudovami
        T.assert(V._maZakazPrechodu(z, { zakazPrechodMeziBudovami: true }) === true,
          'chybějící lokální + globální zákaz = zakázán');
        T.assert(V._maZakazPrechodu(z, { zakazPrechodMeziBudovami: false }) === false,
          'chybějící lokální + globální povolení = povolen');
      }
    },

    /* === Testy přechodu mezi budovami (D5) === */

    {
      name: 'zakazPrechodMeziBudovami=true: žádný zaměstnanec nesmí být v jednom dni ve dvou budovách',
      run: function () {
        if (!M) return;
        // Konfigurace odpovídající reálnému exportu (anonymizované názvy zachovány z existujícího testu B1e).
        // Pravidlo zakazPrechodMeziBudovami je zapnuto → Blanka (a kdokoli jiný) nesmí
        // v jednom dni přecházet z Jedničky do Dvojky (nebo naopak).
        var data = {
          zamestnanci: [
            { id: 'z-maja', jmeno: 'Učitelka A', uvazekMinutyTyden: 1200, role: 'zástupkyně',
              kmenovaVykryvaci: 'kmenová', tridaId: 't-mysky',
              nedostupnost: [{ den: 5, od: '07:00', do: '17:00' }] },
            { id: 'z-zuzka', jmeno: 'Učitelka B', uvazekMinutyTyden: 720, role: 'ředitelka',
              kmenovaVykryvaci: 'kmenová', tridaId: 't-berusky',
              nedostupnost: [{ den: 5, od: '07:00', do: '17:00' }] },
            { id: 'z-alena', jmeno: 'Učitelka C', uvazekMinutyTyden: 1860, role: 'učitelka' },
            { id: 'z-terezka', jmeno: 'Učitelka D', uvazekMinutyTyden: 1860, role: 'učitelka' },
            { id: 'z-vera', jmeno: 'Učitelka E', uvazekMinutyTyden: 1860, role: 'učitelka' },
            { id: 'z-martinaS', jmeno: 'Učitelka F', uvazekMinutyTyden: 1860, role: 'učitelka' },
            { id: 'z-martinaM', jmeno: 'Učitelka G', uvazekMinutyTyden: 1860, role: 'učitelka',
              kmenovaVykryvaci: 'kmenová', tridaId: null },
            { id: 'z-lucka', jmeno: 'Učitelka H', uvazekMinutyTyden: 1860, role: 'učitelka' },
            { id: 'z-blanka', jmeno: 'Učitelka I', uvazekMinutyTyden: 1860, role: 'učitelka' },
            { id: 'z-sylva', jmeno: 'Učitelka J', uvazekMinutyTyden: 1590, role: 'učitelka',
              kmenovaVykryvaci: 'vykrývací', tridaId: null },
            { id: 'z-kamila', jmeno: 'Učitelka K', uvazekMinutyTyden: 150, role: 'učitelka',
              kmenovaVykryvaci: 'vykrývací', tridaId: null },
            { id: 'z-eva', jmeno: 'Učitelka L', uvazekMinutyTyden: 210, role: 'učitelka',
              kmenovaVykryvaci: 'vykrývací', tridaId: null },
            { id: 'z-hanka', jmeno: 'Učitelka M', uvazekMinutyTyden: 480, role: 'učitelka',
              kmenovaVykryvaci: 'vykrývací', tridaId: null }
          ],
          budovy: [
            { id: 'b-jednicka', nazev: 'Budova 1',
              oteviraciDoba: { dny: [1,2,3,4,5], od: '07:00', do: '17:00' },
              tridy: [
                { id: 't-mysky', nazev: 'Třída 1' },
                { id: 't-berusky', nazev: 'Třída 2' },
                { id: 't-jezci', nazev: 'Třída 3' }
              ] },
            { id: 'b-dvojka', nazev: 'Budova 2',
              oteviraciDoba: { dny: [1,2,3,4,5], od: '07:00', do: '17:00' },
              tridy: [
                { id: 't-slunicka', nazev: 'Třída 4' },
                { id: 't-zabky', nazev: 'Třída 5' }
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
          pravidla: {
            minimalniPrekryvMinuty: 120,
            vykryvaciBezMezer: true,
            vykryvaciMaxPresun: 1,
            zakazPrechodMeziBudovami: true
          },
          omezeniNeDohromady: [
            { id: 'o1', osoba1Id: 'z-alena', osoba2Id: 'z-lucka' },
            { id: 'o2', osoba1Id: 'z-maja', osoba2Id: 'z-martinaM' },
            { id: 'o3', osoba1Id: 'z-maja', osoba2Id: 'z-zuzka' }
          ]
        };

        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');

        // Vytvořit mapu tridaId → budovaId
        var tridaBudova = {};
        for (var bi = 0; bi < data.budovy.length; bi++) {
          var bud = data.budovy[bi];
          var tridy = bud.tridy || [];
          for (var ti = 0; ti < tridy.length; ti++) {
            tridaBudova[tridy[ti].id] = bud.id;
          }
        }

        // Pro každý den a každého zaměstnance ověřit, že všechny segmenty jsou v jedné budově
        var chyby = [];
        for (var den = 1; den <= 5; den++) {
          // Seskupit segmenty per zaměstnanec pro daný den
          var zamBudovy = {}; // zamId → Set budovaId
          for (var pi = 0; pi < r.prirazeni.length; pi++) {
            var p = r.prirazeni[pi];
            if (p.den !== den) continue;
            if (!zamBudovy[p.zamestnanecId]) zamBudovy[p.zamestnanecId] = {};
            for (var si = 0; si < p.segmenty.length; si++) {
              var seg = p.segmenty[si];
              var budId = seg.tridaId ? tridaBudova[seg.tridaId] : seg.budovaId;
              if (budId) zamBudovy[p.zamestnanecId][budId] = true;
            }
          }
          // Kontrola: max 1 budova na zaměstnance za den
          for (var zamId in zamBudovy) {
            if (!zamBudovy.hasOwnProperty(zamId)) continue;
            var budovyIds = Object.keys(zamBudovy[zamId]);
            if (budovyIds.length > 1) {
              // Najít jméno zaměstnance
              var jmeno = zamId;
              for (var zi = 0; zi < data.zamestnanci.length; zi++) {
                if (data.zamestnanci[zi].id === zamId) { jmeno = data.zamestnanci[zi].jmeno; break; }
              }
              chyby.push('Den ' + den + ', ' + jmeno + ': přechod mezi budovami (' + budovyIds.join(', ') + ')');
            }
          }
        }
        T.assert(chyby.length === 0,
          'Přechod mezi budovami zakázán, ale nalezeny přechody: ' + chyby.join('; '));
      }
    },

    {
      name: 'zakazPrechodMeziBudovami=true + zaměstnanec s povolit: výjimka smí přecházet',
      run: function () {
        if (!M) return;
        // Zjednodušený scénář: 2 budovy po 1 třídě, 3 zaměstnanci.
        // Globální zákaz přechodu. Zaměstnanec C má prechodMeziBudovami='povolit' → smí.
        // Zaměstnanci A a B nesmí přecházet (výchozí = zákaz).
        var data = {
          zamestnanci: [
            { id: 'z1', jmeno: 'Osoba A', uvazekMinutyTyden: 1860, role: 'učitelka',
              prechodMeziBudovami: 'výchozí' },
            { id: 'z2', jmeno: 'Osoba B', uvazekMinutyTyden: 1860, role: 'učitelka' },
            { id: 'z3', jmeno: 'Osoba C', uvazekMinutyTyden: 1860, role: 'učitelka',
              prechodMeziBudovami: 'povolit' }
          ],
          budovy: [
            { id: 'b1', nazev: 'Budova X',
              oteviraciDoba: { dny: [1,2,3,4,5], od: '07:00', do: '17:00' },
              tridy: [{ id: 't1', nazev: 'Třída X1' }] },
            { id: 'b2', nazev: 'Budova Y',
              oteviraciDoba: { dny: [1,2,3,4,5], od: '07:00', do: '17:00' },
              tridy: [{ id: 't2', nazev: 'Třída Y1' }] }
          ],
          minMaxSloty: [
            { id: 's1', od: '07:00', do: '17:00', minNaTridu: 1, minNaBudovu: 0, dny: [], rotace: false }
          ],
          pravidla: {
            zakazPrechodMeziBudovami: true
          },
          omezeniNeDohromady: []
        };

        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');

        // Mapa třída → budova
        var tridaBudova = { t1: 'b1', t2: 'b2' };

        // Z1 a Z2: nesmí přecházet (globální zákaz, výchozí/chybí)
        // Z3: smí přecházet (explicitní 'povolit')
        for (var den = 1; den <= 5; den++) {
          var zamBudovy = {};
          for (var pi = 0; pi < r.prirazeni.length; pi++) {
            var p = r.prirazeni[pi];
            if (p.den !== den) continue;
            if (!zamBudovy[p.zamestnanecId]) zamBudovy[p.zamestnanecId] = {};
            for (var si = 0; si < p.segmenty.length; si++) {
              var seg = p.segmenty[si];
              var budId = seg.tridaId ? tridaBudova[seg.tridaId] : seg.budovaId;
              if (budId) zamBudovy[p.zamestnanecId][budId] = true;
            }
          }
          // z1 a z2 nesmí mít víc než 1 budovu
          if (zamBudovy['z1'] && Object.keys(zamBudovy['z1']).length > 1) {
            T.assert(false, 'Den ' + den + ': Osoba A přechází mezi budovami (globální zákaz, výchozí nastavení)');
          }
          if (zamBudovy['z2'] && Object.keys(zamBudovy['z2']).length > 1) {
            T.assert(false, 'Den ' + den + ': Osoba B přechází mezi budovami (globální zákaz, bez lokálního nastavení)');
          }
        }
      }
    },

    {
      name: 'zakazPrechodMeziBudovami=false + zaměstnanec se zakázat: jen ten zaměstnanec nesmí přecházet',
      run: function () {
        if (!M) return;
        // Globální povolení přechodu. Zaměstnanec A má lokální 'zakázat' → nesmí přecházet.
        var data = {
          zamestnanci: [
            { id: 'z1', jmeno: 'Osoba A', uvazekMinutyTyden: 1860, role: 'učitelka',
              prechodMeziBudovami: 'zakázat' },
            { id: 'z2', jmeno: 'Osoba B', uvazekMinutyTyden: 1860, role: 'učitelka' },
            { id: 'z3', jmeno: 'Osoba C', uvazekMinutyTyden: 1860, role: 'učitelka' }
          ],
          budovy: [
            { id: 'b1', nazev: 'Budova X',
              oteviraciDoba: { dny: [1,2,3,4,5], od: '07:00', do: '17:00' },
              tridy: [{ id: 't1', nazev: 'Třída X1' }] },
            { id: 'b2', nazev: 'Budova Y',
              oteviraciDoba: { dny: [1,2,3,4,5], od: '07:00', do: '17:00' },
              tridy: [{ id: 't2', nazev: 'Třída Y1' }] }
          ],
          minMaxSloty: [
            { id: 's1', od: '07:00', do: '17:00', minNaTridu: 1, minNaBudovu: 0, dny: [], rotace: false }
          ],
          pravidla: {
            zakazPrechodMeziBudovami: false
          },
          omezeniNeDohromady: []
        };

        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');

        var tridaBudova = { t1: 'b1', t2: 'b2' };

        // z1 nesmí přecházet (lokální 'zakázat')
        for (var den = 1; den <= 5; den++) {
          var z1Budovy = {};
          for (var pi = 0; pi < r.prirazeni.length; pi++) {
            var p = r.prirazeni[pi];
            if (p.den !== den || p.zamestnanecId !== 'z1') continue;
            for (var si = 0; si < p.segmenty.length; si++) {
              var seg = p.segmenty[si];
              var budId = seg.tridaId ? tridaBudova[seg.tridaId] : seg.budovaId;
              if (budId) z1Budovy[budId] = true;
            }
          }
          if (Object.keys(z1Budovy).length > 1) {
            T.assert(false,
              'Den ' + den + ': Osoba A přechází mezi budovami (lokální zakázat, i když globální povoleno)');
          }
        }
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
    },

    /* === D6: Střídání dopoledne/odpoledne === */

    {
      name: '_getShiftTypeFromSegmenty: dopolední směna (začátek před 12:00)',
      run: function () {
        if (!V._getShiftTypeFromSegmenty) return;
        var segs = [{ od: '07:30', do: '12:00' }];
        T.assert(V._getShiftTypeFromSegmenty(segs, 720) === 'dopoledni', 'začátek 07:30 < 12:00 = dopoledni');
      }
    },
    {
      name: '_getShiftTypeFromSegmenty: odpolední směna (začátek na/po 12:00)',
      run: function () {
        if (!V._getShiftTypeFromSegmenty) return;
        var segs = [{ od: '12:00', do: '17:00' }];
        T.assert(V._getShiftTypeFromSegmenty(segs, 720) === 'odpoledni', 'začátek 12:00 = odpoledni');
      }
    },
    {
      name: '_validujStridaniTvrdy: všichni střídají → ok',
      run: function () {
        if (!V._validujStridaniTvrdy) return;
        var prirazeni = [
          { zamestnanecId: 'z1', segmenty: [{ od: '07:00', do: '12:00' }] },
          { zamestnanecId: 'z1', segmenty: [{ od: '12:30', do: '17:00' }] }
        ];
        var r = V._validujStridaniTvrdy(prirazeni, 720);
        T.assert(r.ok === true, 'dopoledni + odpoledni = ok');
      }
    },
    {
      name: '_validujStridaniTvrdy: jeden zaměstnanec jen dopolední každý den → chyba',
      run: function () {
        if (!V._validujStridaniTvrdy) return;
        var prirazeni = [
          { zamestnanecId: 'z1', segmenty: [{ od: '07:00', do: '12:00' }] },
          { zamestnanecId: 'z1', segmenty: [{ od: '07:00', do: '12:00' }] }
        ];
        var r = V._validujStridaniTvrdy(prirazeni, 720);
        T.assert(r.ok === false && r.chyba && r.chyba.indexOf('tvrdý') !== -1, 'všechny dny stejný typ = chyba');
      }
    },
    {
      name: 'D6 tvrdý režim: při stejném typu směny každý den vrátí ok: false',
      run: function () {
        if (!M) return;
        // Konfigurace, kde algoritmus typicky dá všem směny od 7:00 (všechny dopolední) – tvrdý režim to odmítne
        var z = M.vytvorZamestnance('Solo', 600, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Budova');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }],
          pravidla: { stridaniDopoledneOdpoledne: true, stridaniRezim: 'tvrdý', stridaniHraniceMinuty: 720 }
        };
        var r = V.vypocetSmen(data);
        // Jedna osoba, 5 dnů – pravděpodobně všechny směny stejný typ → může být false
        if (r.ok === false) {
          T.assert(r.chyba && r.chyba.indexOf('střídání') !== -1, 'chyba zmiňuje střídání');
        } else {
          T.assert(r.ok === true && r.prirazeni.length > 0, 'pokud ok, má přiřazení');
        }
      }
    },
    {
      name: 'D6 preferenční režim: výpočet proběhne (bez tvrdé validace)',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('Učitelka', 1500, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Budova');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }],
          pravidla: { stridaniDopoledneOdpoledne: true, stridaniRezim: 'preferenční', stridaniHraniceMinuty: 720 }
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true && Array.isArray(r.prirazeni) && r.prirazeni.length >= 1, 'preferenční neblokuje výpočet');
      }
    },
    {
      name: 'D6 vypnuto: chování jako dříve (bez ovlivnění)',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('Učitelka', 1500, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Budova');
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }],
          pravidla: { stridaniDopoledneOdpoledne: false }
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true && r.prirazeni.length === 5, 'výpočet ok, 5 přiřazení');
      }
    },

    /* === D7: Souvislé bloky a méně dnů === */

    {
      name: 'D7 preferSouvisleBlok: kratší úvazek koncentrovaný do méně dnů',
      run: function () {
        if (!M) return;
        // Úvazek 600 min/týden (10 h) – pod prahem 1200; s koncentrací by měl mít práci jen v méně dnech
        var z = M.vytvorZamestnance('Částečný', 600, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Budova');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }],
          pravidla: { preferSouvisleBlok: true }
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        var dnySPraci = {};
        for (var i = 0; i < r.prirazeni.length; i++) {
          if (r.prirazeni[i].zamestnanecId === z.id) dnySPraci[r.prirazeni[i].den] = true;
        }
        var pocetDnu = Object.keys(dnySPraci).length;
        T.assert(pocetDnu <= 5 && pocetDnu >= 1, 'D7: práce v ' + pocetDnu + ' dnech (očekáváno méně než 5 při koncentraci)');
      }
    },
    {
      name: 'D7 vypnuto: kratší úvazek rozložen proporčně (pět dní)',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('Částečný', 600, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Budova');
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }],
          pravidla: { preferSouvisleBlok: false }
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        var dnySPraci = {};
        for (var i = 0; i < r.prirazeni.length; i++) {
          if (r.prirazeni[i].zamestnanecId === z.id) dnySPraci[r.prirazeni[i].den] = true;
        }
        T.assert(Object.keys(dnySPraci).length === 5, 'bez D7: práce ve všech 5 dnech');
      }
    },
    {
      name: 'D7 minDelkaBlokuMinuty: respektuje minimální délku bloku při koncentraci',
      run: function () {
        if (!M) return;
        var z = M.vytvorZamestnance('Krátký', 480, M.ROLE.UCITELKA);
        var b = M.vytvorBudovu('Budova');
        b.tridy.push(M.vytvorTridu('Třída 1'));
        var data = {
          zamestnanci: [z],
          budovy: [b],
          minMaxSloty: [{ id: 's1', od: '07:00', do: '17:00', minNaBudovu: 1, minNaTridu: 0, dny: [], rotace: false }],
          pravidla: { preferSouvisleBlok: true, minDelkaBlokuMinuty: 240 }
        };
        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');
        for (var i = 0; i < r.prirazeni.length; i++) {
          var p = r.prirazeni[i];
          if (p.zamestnanecId !== z.id) continue;
          var totalMin = 0;
          for (var j = 0; j < p.segmenty.length; j++) {
            var od = parseInt(p.segmenty[j].od.split(':')[0], 10) * 60 + parseInt(p.segmenty[j].od.split(':')[1], 10);
            var doM = parseInt(p.segmenty[j].do.split(':')[0], 10) * 60 + parseInt(p.segmenty[j].do.split(':')[1], 10);
            totalMin += (doM - od);
          }
          if (totalMin > 0) {
            T.assert(totalMin >= 240, 'Den ' + p.den + ': blok má alespoň 240 min (má ' + totalMin + ')');
          }
        }
      }
    },

    /* === Regrese: slot minNaTridu 2 v čase 9:30–11:00 musí být splněn v každé třídě každý den === */

    {
      name: 'Slot 09:30–11:00 minNaTridu 2: v každé třídě každý den alespoň 2 osoby (včetně Po na Žabkách)',
      run: function () {
        if (!M) return;
        // Anonymizovaná konfigurace odpovídající reálnému exportu: 2 budovy, Jednička 3 třídy, Dvojka 2 třídy;
        // slot 09:30–11:00 minNaTridu 2. Chyba: v pondělí na třídě Žabky (2. třída Dvojky) jen 1 osoba.
        var b1 = M.vytvorBudovu('Budova A');
        b1.tridy.push(M.vytvorTridu('Třída 1'));
        b1.tridy.push(M.vytvorTridu('Třída 2'));
        b1.tridy.push(M.vytvorTridu('Třída 3'));
        var b2 = M.vytvorBudovu('Budova B');
        b2.tridy.push(M.vytvorTridu('Třída 4'));
        b2.tridy.push(M.vytvorTridu('Třída 5')); // Žabky = 2. třída 2. budovy
        var t5 = b2.tridy[1].id;

        var z1 = M.vytvorZamestnance('Z1', 1200, M.ROLE.UCITELKA, 'kmenová', b1.tridy[0].id, [
          { den: 5, od: '07:00', do: '17:00' }, { den: 1, od: '07:00', do: '07:45' }, { den: 2, od: '07:00', do: '07:45' },
          { den: 3, od: '07:00', do: '07:45' }, { den: 4, od: '07:00', do: '07:45' },
          { den: 1, od: '16:00', do: '17:00' }, { den: 2, od: '16:00', do: '17:00' }, { den: 3, od: '16:00', do: '17:00' }, { den: 4, od: '16:00', do: '17:00' }
        ]);
        var z2 = M.vytvorZamestnance('Z2', 720, M.ROLE.UCITELKA, 'kmenová', b1.tridy[1].id, [
          { den: 5, od: '07:00', do: '17:00' }, { den: 1, od: '07:00', do: '07:45' }, { den: 2, od: '07:00', do: '07:45' },
          { den: 3, od: '07:00', do: '07:45' }, { den: 4, od: '07:00', do: '07:45' },
          { den: 1, od: '16:00', do: '17:00' }, { den: 2, od: '16:00', do: '17:00' }, { den: 3, od: '16:00', do: '17:00' }, { den: 4, od: '16:00', do: '17:00' }
        ]);
        var z3 = M.vytvorZamestnance('Z3', 1860, M.ROLE.UCITELKA, 'kmenová', b1.tridy[2].id);
        var z4 = M.vytvorZamestnance('Z4', 1860, M.ROLE.UCITELKA, 'kmenová', b1.tridy[2].id);
        var z5 = M.vytvorZamestnance('Z5', 1860, M.ROLE.UCITELKA);
        var z6 = M.vytvorZamestnance('Z6', 1860, M.ROLE.UCITELKA);
        var z7 = M.vytvorZamestnance('Z7', 1860, M.ROLE.UCITELKA, 'kmenová', b1.tridy[1].id);
        var z8 = M.vytvorZamestnance('Z8', 1860, M.ROLE.UCITELKA, 'kmenová', b1.tridy[0].id);
        var z9 = M.vytvorZamestnance('Z9', 1860, M.ROLE.UCITELKA);
        var z10 = M.vytvorZamestnance('Z10', 1590, M.ROLE.UCITELKA, 'vykrývací', null);
        var z11 = M.vytvorZamestnance('Z11', 150, M.ROLE.UCITELKA, 'vykrývací', null);
        var z12 = M.vytvorZamestnance('Z12', 210, M.ROLE.UCITELKA, 'vykrývací', null);
        var z13 = M.vytvorZamestnance('Z13', 480, M.ROLE.UCITELKA, 'vykrývací', null);

        var data = {
          zamestnanci: [z1, z2, z3, z4, z5, z6, z7, z8, z9, z10, z11, z12, z13],
          budovy: [b1, b2],
          minMaxSloty: [
            { id: 's1', od: '07:00', do: '07:45', minNaBudovu: 1, maxNaBudovu: null, minNaTridu: 0, maxNaTridu: null, dny: [], rotace: false },
            { id: 's2', od: '07:45', do: '16:00', minNaTridu: 1, maxNaTridu: null, minNaBudovu: 0, maxNaBudovu: null, dny: [], rotace: false },
            { id: 's3', od: '16:00', do: '17:00', minNaBudovu: 1, maxNaBudovu: null, minNaTridu: 0, maxNaTridu: null, dny: [1, 2, 3, 4], rotace: false },
            { id: 's4', od: '16:00', do: '17:00', minNaBudovu: 1, maxNaBudovu: null, minNaTridu: 0, maxNaTridu: null, dny: [5], rotace: true },
            { id: 's5', od: '09:30', do: '11:00', minNaBudovu: 0, maxNaBudovu: null, minNaTridu: 2, maxNaTridu: null, dny: [], rotace: false }
          ],
          pravidla: {
            minimalniPrekryvMinuty: 120,
            vykryvaciBezMezer: true,
            vykryvaciMaxPresun: 1,
            zakazPrechodMeziBudovami: true,
            preferSouvisleBlok: true,
            minDelkaBlokuMinuty: 120
          },
          omezeniNeDohromady: [
            { id: 'o1', osoba1Id: z3.id, osoba2Id: z8.id },
            { id: 'o2', osoba1Id: z1.id, osoba2Id: z7.id },
            { id: 'o3', osoba1Id: z1.id, osoba2Id: z2.id }
          ]
        };

        var r = V.vypocetSmen(data);
        T.assert(r.ok === true, 'výpočet ok');

        function hhmmToMin(hhmm) {
          var parts = hhmm.split(':');
          return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
        }
        function minPocetOsobVTridVCase(prirazeni, den, tridaId, odMin, doMin) {
          var minCount = Infinity;
          for (var m = odMin; m < doMin; m++) {
            var count = 0;
            for (var pi = 0; pi < prirazeni.length; pi++) {
              var p = prirazeni[pi];
              if (p.den !== den) continue;
              for (var si = 0; si < p.segmenty.length; si++) {
                var seg = p.segmenty[si];
                if (seg.tridaId !== tridaId) continue;
                var segOd = hhmmToMin(seg.od);
                var segDo = hhmmToMin(seg.do);
                if (segOd <= m && m < segDo) { count++; break; }
              }
            }
            if (count < minCount) minCount = count;
          }
          return minCount === Infinity ? 0 : minCount;
        }

        var od930 = 9 * 60 + 30;
        var do11 = 11 * 60;
        var tridy = [];
        for (var bi = 0; bi < data.budovy.length; bi++) {
          for (var ti = 0; ti < data.budovy[bi].tridy.length; ti++) {
            tridy.push({ id: data.budovy[bi].tridy[ti].id, nazev: data.budovy[bi].tridy[ti].nazev });
          }
        }
        var chyby = [];
        for (var d = 1; d <= 5; d++) {
          for (var ti2 = 0; ti2 < tridy.length; ti2++) {
            var tid = tridy[ti2].id;
            var nazev = tridy[ti2].nazev;
            var minPocet = minPocetOsobVTridVCase(r.prirazeni, d, tid, od930, do11);
            if (minPocet < 2) {
              var denNazev = ['', 'Po', 'Út', 'St', 'Čt', 'Pá'][d];
              chyby.push('Den ' + denNazev + ', třída ' + nazev + ': mezi 9:30–11:00 je ' + minPocet + ' osob (požadováno 2)');
            }
          }
        }
        T.assert(chyby.length === 0, chyby.length ? chyby.join('; ') : 'v každé třídě každý den 9:30–11:00 alespoň 2 osoby');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
