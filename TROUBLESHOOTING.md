# Řešení problémů (troubleshooting)

Časté potíže při vývoji a spouštění testů MS-smeny.

---

## Nemám nainstalované npm / Node.js

Příkazy `npm install` a `npm test` vyžadují **Node.js** (součástí je **npm**). Pokud terminál hlásí `command not found: npm` nebo `command not found: node`, Node.js není nainstalovaný nebo není v PATH.

### macOS (Mac OS X)

Zvol **jednu** z možností:

**1. Oficiální instalátor (nejjednodušší)**  
- Otevři [https://nodejs.org](https://nodejs.org)  
- Stáhni **LTS** verzi a spusť instalátor  
- Po instalaci **zavři a znovu otevři terminál** (nebo Cursor), pak zkus `node --version` a `npm --version`

**2. Homebrew** (pokud už Homebrew používáš)  
```bash
brew install node
```  
Potom `node --version` a `npm --version`.

**3. nvm (Node Version Manager)** – vhodné, pokud chceš mít více verzí Node vedle sebe  
```bash
# nvm nainstaluješ podle návodu na https://github.com/nvm-sh/nvm
# Pak:
nvm install --lts
nvm use --lts
node --version
npm --version
```

### Ověření

V novém terminálu (nebo po restartu Cursoru) zadej:

```bash
node --version   # např. v20.x.x
npm --version    # např. 10.x.x
```

Pokud oba příkazy vypíší číslo verze, můžeš v kořeni projektu spustit `npm install` a potom `npm test`.

---

## Testy z editoru neběží / „Run Task“ nic nedělá

- Ověř, že máš nainstalovaný Node.js a npm (viz výše).  
- Spusť testy z **integrovaného terminálu** v Cursoru (Terminal → New Terminal), v kořeni projektu:
  ```bash
  npm install
  npm test
  ```
- Pokud funguje `npm test` v terminálu, úloha „Spustit testy“ v Tasks by měla dělat to samé. Zkus Command Palette (Cmd+Shift+P) → **Tasks: Run Task** → **Spustit testy**.

---

## Playwright: „Executable doesn't exist“ / prohlížeč nenalezen

Pokud `npm test` hlásí, že executable neexistuje (např. `chrome-headless-shell-mac-arm64`), prohlížeč pro Playwright ještě není nainstalovaný nebo byl nainstalovaný v jiném prostředí.

**Řešení:** V **terminálu** (ideálně v integrovaném terminálu Cursoru, v kořeni projektu) spusť jednou:

```bash
npx playwright install chromium
```

Po stažení Chromia znovu spusť `npm test` **ve stejném typu terminálu** (vlastní / integrovaný), kde jsi instalaci spustil.

Na Apple Silicon (M1/M2/M3) se stáhne varianta `mac-arm64`; v jiném prostředí může být nainstalovaná jiná architektura.

## Playwright stahuje prohlížeč při prvním spuštění

Při prvním `npm test` může Playwright stáhnout binární soubory prohlížeče Chromium (desítky MB). Je to normální a stačí jednou. Pokud běžíš za proxy nebo firewallem, může být potřeba nastavení proxy pro npm.

---

## Testy můžu spustit jen v prohlížeči

Pokud nechceš instalovat Node.js, testy stále můžeš spouštět **ručně v prohlížeči**: otevři soubor `test/index.html` (dvojklik nebo z menu Soubor → Otevřít). Na stránce uvidíš výsledek testů. Pro automatické spuštění z editoru je potřeba Node.js a `npm test`.

---

## Testy po změně kódu selhávají

Pokud jsi změnil aplikaci nebo datový model a testy najednou padají:

1. **Ověř, že jsi před dokončením úkolu spustil existující testy** a pro novou funkci přidal nové testy (viz pravidla v `.cursor/rules/projekt.mdc` a README).
2. **Rozliš:** selhání může znamenat, že změna **rozbiła očekávané chování** (pak je třeba opravit kód nebo vrátit změnu), nebo že **očekávání testu už neplatí** (změnilo se chování záměrně). V druhém případě je úprava testu přípustná, ale **nikdy ji nedělej svévolně**: zdůvodni, proč má být test změněn, a nech si úpravu **potvrdit** (uživatelem / v code review).
3. **Existující testy neměň bez zdůvodnění a potvrzení** – viz pravidla projektu.

---

## Další problémy

- **Port 17776 už je použitý** – skript `test/run-in-browser.js` používá port 17776. Zavři jinou aplikaci, která ho používá, nebo v souboru změň konstantu `PORT` na jiné číslo.  
- **Testy selhávají** – podívej se na výstup v terminálu nebo na stránce `test/index.html` (který konkrétní test a jaká chyba). Konzole prohlížeče (F12) u testovací stránky může ukázat víc detailů.
