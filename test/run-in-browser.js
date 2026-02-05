/**
 * Spustí testy v prohlížeči (Playwright) a ukončí proces podle výsledku.
 * Pro spuštění z editoru: npm test
 */
var http = require('http');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var PORT = 17776;

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

function serve(req, res) {
  var url = req.url === '/' ? '/test/index.html' : req.url;
  var file = path.join(ROOT, url.split('?')[0]);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(file, function (err, data) {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    var ext = path.extname(file);
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.end(data);
  });
}

var server = http.createServer(serve);
server.listen(PORT, '127.0.0.1', function () {
  var url = 'http://127.0.0.1:' + PORT + '/test/index.html';
  // Playwright může být nainstalován jen lokálně (node_modules)
  var playwright = require('playwright');
  playwright.chromium.launch({ headless: true }).then(function (browser) {
    return browser.newPage().then(function (page) {
      return page.goto(url, { waitUntil: 'networkidle' }).then(function () {
        return page.waitForSelector('#vysledek', { timeout: 5000 }).then(function () {
          return page.evaluate(function () {
            var r = window.__MSemenyTestResult;
            if (!r) {
              return { hasFail: true, passed: 0, failed: 0, results: [] };
            }
            return {
              hasFail: r.failed > 0,
              passed: r.passed,
              failed: r.failed,
              results: r.results
            };
          });
        });
      }).then(function (result) {
        return browser.close().then(function () {
          server.close();
          if (result.hasFail) {
            console.error('Testy selhaly: ' + result.passed + ' prošlo, ' + result.failed + ' selhalo.');
            result.results.forEach(function (r) {
              if (!r.ok) {
                console.error('  ' + r.name + ': ' + (r.error || ''));
              }
            });
            process.exit(1);
          }
          console.log('Všechny testy prošly (' + result.passed + ').');
          process.exit(0);
        });
      });
    });
  }).catch(function (err) {
    server.close();
    console.error('Chyba při spuštění testů:', err.message);
    process.exit(1);
  });
});
