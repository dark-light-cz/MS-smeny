/**
 * Jednoduchý test runner pro MS-smeny – bez závislostí, běží v prohlížeči.
 * Každý test je funkce, která při selhání hodí výjimku.
 */
(function (global) {
  'use strict';

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  function assertEqual(actual, expected, message) {
    var msg = message || 'Očekáváno ' + JSON.stringify(expected) + ', dostali jsme ' + JSON.stringify(actual);
    if (actual !== expected) {
      throw new Error(msg);
    }
  }

  function assertDeepEqual(actual, expected, message) {
    var actualStr = JSON.stringify(actual);
    var expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error((message || 'Struktura se neshoduje') + ': očekáváno ' + expectedStr + ', dostali jsme ' + actualStr);
    }
  }

  /**
   * Spustí všechny testy v poli. Každý prvek: { name: string, run: function() }.
   * @returns { { passed: number, failed: number, results: Array<{name, ok, error?>} }
   */
  function runTests(tests) {
    var results = [];
    var passed = 0;
    var failed = 0;
    for (var i = 0; i < tests.length; i++) {
      var t = tests[i];
      var name = t.name || ('Test ' + (i + 1));
      try {
        if (typeof t.run === 'function') {
          t.run();
        }
        results.push({ name: name, ok: true });
        passed++;
      } catch (e) {
        results.push({ name: name, ok: false, error: e.message || String(e) });
        failed++;
      }
    }
    return { passed: passed, failed: failed, results: results };
  }

  /**
   * Vypsat výsledky do konzole a vrátit HTML pro zobrazení na stránce.
   */
  function report(result, logToConsole) {
    if (logToConsole !== false) {
      console.log('--- Testy MS-smeny ---');
      console.log('Prošlo: ' + result.passed + ', selhalo: ' + result.failed);
      result.results.forEach(function (r) {
        if (r.ok) {
          console.log('  [OK] ' + r.name);
        } else {
          console.error('  [FAIL] ' + r.name + ': ' + r.error);
        }
      });
      console.log('------------------------');
    }
    var lines = [];
    lines.push('<p><strong>Výsledek: ' + result.passed + ' prošlo, ' + result.failed + ' selhalo.</strong></p>');
    lines.push('<ul>');
    result.results.forEach(function (r) {
      if (r.ok) {
        lines.push('<li class="test-ok">' + escapeHtml(r.name) + '</li>');
      } else {
        lines.push('<li class="test-fail">' + escapeHtml(r.name) + ': ' + escapeHtml(r.error) + '</li>');
      }
    });
    lines.push('</ul>');
    return lines.join('');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  global.MSemenyTest = {
    assert: assert,
    assertEqual: assertEqual,
    assertDeepEqual: assertDeepEqual,
    runTests: runTests,
    report: report
  };
})(typeof window !== 'undefined' ? window : this);
