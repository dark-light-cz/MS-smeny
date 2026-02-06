/**
 * Testy pro pravidlo minimálního překryvu (C1) – uložení do modelu.
 */
(function (global) {
  'use strict';

  var T = global.MSemenyTest;
  var S = global.MSemenyStorage;
  var M = global.MSemenyDataModel;
  if (!T || !S) return;

  var tests = [
    {
      name: 'Výchozí stav má pravidla.minimalniPrekryvMinuty 120',
      run: function () {
        if (!M) return;
        var p = M.vychoziPravidla();
        T.assert(p && p.minimalniPrekryvMinuty === 120, 'minimalniPrekryvMinuty 120');
      }
    },
    {
      name: 'replaceData může změnit pravidla.minimalniPrekryvMinuty',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.pravidla = d.pravidla || {};
          d.pravidla.minimalniPrekryvMinuty = 90;
          return d;
        });
        var data = S.getData();
        T.assert(data.pravidla && data.pravidla.minimalniPrekryvMinuty === 90, 'uloženo 90 min');
      }
    },
    // --- C5: Přechod mezi budovami – globální pravidlo ---
    {
      name: 'Výchozí pravidla mají zakazPrechodMeziBudovami = true (C5)',
      run: function () {
        if (!M) return;
        var p = M.vychoziPravidla();
        T.assert(p && p.zakazPrechodMeziBudovami === true, 'zakazPrechodMeziBudovami true');
      }
    },
    {
      name: 'replaceData může změnit pravidla.zakazPrechodMeziBudovami (C5)',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.pravidla = d.pravidla || {};
          d.pravidla.zakazPrechodMeziBudovami = false;
          return d;
        });
        var data = S.getData();
        T.assert(data.pravidla && data.pravidla.zakazPrechodMeziBudovami === false, 'uloženo false');
      }
    },
    {
      name: 'Výchozí stav obsahuje zakazPrechodMeziBudovami v pravidlech (C5)',
      run: function () {
        if (!M) return;
        var stav = M.vychoziStav();
        T.assert(stav.pravidla && stav.pravidla.zakazPrechodMeziBudovami === true, 'výchozí stav má zakazPrechodMeziBudovami true');
      }
    },
    // --- C6: Střídání dopoledne/odpoledne ---
    {
      name: 'Výchozí pravidla mají stridaniDopoledneOdpoledne = false (C6)',
      run: function () {
        if (!M) return;
        var p = M.vychoziPravidla();
        T.assert(p && p.stridaniDopoledneOdpoledne === false, 'stridaniDopoledneOdpoledne false');
      }
    },
    {
      name: 'Výchozí pravidla mají stridaniRezim = preferenční (C6)',
      run: function () {
        if (!M) return;
        var p = M.vychoziPravidla();
        T.assert(p && p.stridaniRezim === 'preferenční', 'stridaniRezim preferenční');
      }
    },
    {
      name: 'Výchozí pravidla mají stridaniHraniceMinuty = 720 (C6)',
      run: function () {
        if (!M) return;
        var p = M.vychoziPravidla();
        T.assert(p && p.stridaniHraniceMinuty === 720, 'stridaniHraniceMinuty 720 (12:00)');
      }
    },
    {
      name: 'STRIDANI_REZIMY obsahuje preferenční a tvrdý (C6)',
      run: function () {
        if (!M) return;
        T.assert(Array.isArray(M.STRIDANI_REZIMY), 'STRIDANI_REZIMY je pole');
        T.assert(M.STRIDANI_REZIMY.indexOf('preferenční') >= 0, 'obsahuje preferenční');
        T.assert(M.STRIDANI_REZIMY.indexOf('tvrdý') >= 0, 'obsahuje tvrdý');
      }
    },
    {
      name: 'replaceData může změnit pravidla střídání (C6)',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.pravidla = d.pravidla || {};
          d.pravidla.stridaniDopoledneOdpoledne = true;
          d.pravidla.stridaniRezim = 'tvrdý';
          d.pravidla.stridaniHraniceMinuty = 660;
          return d;
        });
        var data = S.getData();
        T.assert(data.pravidla.stridaniDopoledneOdpoledne === true, 'zapnuto true');
        T.assert(data.pravidla.stridaniRezim === 'tvrdý', 'režim tvrdý');
        T.assert(data.pravidla.stridaniHraniceMinuty === 660, 'hranice 660 (11:00)');
      }
    },
    // --- C7: Souvislé bloky a méně dnů ---
    {
      name: 'Výchozí pravidla mají preferSouvisleBlok = false (C7)',
      run: function () {
        if (!M) return;
        var p = M.vychoziPravidla();
        T.assert(p && p.preferSouvisleBlok === false, 'preferSouvisleBlok false');
      }
    },
    {
      name: 'Výchozí pravidla mají minDelkaBlokuMinuty = null (C7)',
      run: function () {
        if (!M) return;
        var p = M.vychoziPravidla();
        T.assert(p && p.minDelkaBlokuMinuty === null, 'minDelkaBlokuMinuty null');
      }
    },
    {
      name: 'replaceData může změnit pravidla souvislých bloků (C7)',
      run: function () {
        if (!S || !M) return;
        S.resetCache();
        S.setData(M.vychoziStav());
        S.replaceData(function (d) {
          d.pravidla = d.pravidla || {};
          d.pravidla.preferSouvisleBlok = true;
          d.pravidla.minDelkaBlokuMinuty = 180;
          return d;
        });
        var data = S.getData();
        T.assert(data.pravidla.preferSouvisleBlok === true, 'zapnuto true');
        T.assert(data.pravidla.minDelkaBlokuMinuty === 180, 'min délka 180 min');
      }
    }
  ];

  tests.forEach(function (t) {
    global.MSemenyTestList.push(t);
  });
})(typeof window !== 'undefined' ? window : this);
