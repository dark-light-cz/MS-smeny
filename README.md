# MS-smeny

Webová aplikace (HTML, čistý JavaScript, CSS). Projekt je v přípravě.

## Struktura

- `index.html` – vstupní stránka
- `css/main.css` – hlavní styly
- `js/main.js` – hlavní skript
- `test/index.html` – stránka s testy (otevřít v prohlížeči pro spuštění)
- **`AKTUALNI_STAV.md`** – živý přehled: co aplikace je, co umí, co plánujeme (udržovat aktuální)
- **`IMPLEMENTACE_UKOLY.md`** – seznam implementačních úkolů v pořadí (bloky A–E)
- `PLAN.md` – plán implementace a fáze
- `CHECKLIST.md` – stav úkolů a doporučený postup „Co dál“
- `OPEN_QUESTIONS.md` – otevřené dotazy a workflow
- **`TROUBLESHOOTING.md`** – řešení častých problémů (např. instalace Node.js/npm na macOS)

## Spuštění

Aplikaci můžeš otevřít přímo souborem `index.html` v prohlížeči, nebo ji servírovat přes lokální webový server (vhodné kvůli Local Storage a relativním cestám).

### Lokální webový server

V kořeni projektu spusť **jeden** z následujících příkazů. Pak otevři v prohlížeči uvedenou adresu (např. `http://localhost:8765`).

**Varianta 1 – npm (doporučeno)**  
Potřebuješ Node.js (viz TROUBLESHOOTING.md, pokud nemáš).
```bash
npm start
```
Servíruje kořen projektu na **http://localhost:8765**. Ukončení: Ctrl+C.

**Varianta 2 – bez instalace (npx)**  
```bash
npx serve -l 8765
```
Stejně jako `npm start` – port 8765 (serve se při prvním spuštění dočasně stáhne).

**Varianta 3 – Python**  
Máš-li v systému Python 3:
```bash
python3 -m http.server 8000
```
Otevři **http://localhost:8000**. Ukončení: Ctrl+C.

## Testy

Testy běží v prohlížeči bez build stepu.

**Pravidla:** Po implementaci nové funkce vždy spusť existující testy (`npm test`) a doplň nové testy pro tuto funkci. Existující testy neupravuj svévolně – úpravu vždy zdůvodni a nech si ji potvrdit (viz též `.cursor/rules/projekt.mdc`).

### Spuštění z editoru (Cursor / VS Code)

1. Potřebuješ **Node.js** (a tím i **npm**). Pokud je nemáš, viz **`TROUBLESHOOTING.md`** – tam je návod např. pro instalaci na macOS.  
2. V kořeni projektu spusť **jednou** instalaci závislostí (Playwright):
   ```bash
   npm install
   ```
   *(Při prvním spuštění testů Playwright stáhne prohlížeč Chromium.)*

2. Testy pak spusť přímo z editoru:
   - **Command Palette** (Cmd+Shift+P / Ctrl+Shift+P) → „Tasks: Run Task“ → **Spustit testy**
   - nebo v terminálu: `npm test`

   Úloha je definovaná v `.vscode/tasks.json` a je nastavená jako výchozí testovací úloha (lze přiřadit zkratku v „Tasks: Run Build Task“ / test).

### Spuštění v prohlížeči

Otevři soubor `test/index.html` v prohlížeči (nebo přes HTTP server z kořene projektu). Na stránce uvidíš počet prošlých/selhávajících testů a seznam; v konzoli (F12) je stejný výstup.

### Soubory testů

- `test/test-runner.js` – jednoduchý runner a pomocné funkce (`assert`, `runTests`, `report`)
- `test/test-data-model.js` – testy datového modelu (výchozí stav, role, vytváření zaměstnanců, budov, tříd)
- `test/test-storage.js` – testy úložiště (načtení, setData, replaceData, zápis do Local Storage, reset cache)
- `test/run-in-browser.js` – Node skript pro `npm test` (spustí stránku v Chromiu a podle výsledku ukončí s kódem 0/1)

**Troubleshooting:** viz **TROUBLESHOOTING.md** (Node.js/npm, Playwright, spuštění z editoru).

## Repozitář

GitHub (osobní účet) – propojení viz úkol 0.1 v CHECKLIST.md.
