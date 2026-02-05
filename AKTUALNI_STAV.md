# Aktuální stav aplikace

**Živý dokument** – jediný zdroj pravdy pro to, co aplikace je a co aktuálně umí. Pro vibe coding ho udržujeme vždy aktuální: po každé dokončené funkci sem doplníme/upravíme popis.

---

## Co aplikace je

**MS-smeny** je webová aplikace pro **vedení mateřské školy**: slouží k rozdělování zaměstnanců do tříd a budov a k **návrhu směn** podle zadaných pravidel. Cílová skupina: ředitelky a zástupkyně MŠ.

**Hlavní výstup:** vždy jedno konkrétní řešení – návrh směn. Když chce zadavatel něco změnit, upraví konfiguraci a aplikace celé řešení přepočítá.

---

## Základní představa (specifikace)

### Ukládání dat
- **Úložiště:** Local Storage (v prohlížeči).
- **Export / import:** JSON (záloha, přenos dat mezi zařízeními).

### Co se konfiguruje

1. **Zaměstnanci**
   - Jméno, **úvazek:** počet hodin za týden (lze zadat i s přesností na minuty).
   - Role: učitelka, asistentka pedagoga, školník/školnice, ředitelka, zástupkyně (speciální role pro vedení MŠ). Další role podle potřeby.

2. **Struktura míst**
   - **Budovy** → v každé budově **třídy**.
   - U budov/tříd: **otevírací doba**.
   - U budov/tříd (nebo v čase): **minimální a maximální počet osob** v daném čase.  
     Příklad: ráno 7:00–7:45 stačí jedna učitelka na celou budovu; od 7:45 musí být v každé třídě alespoň jedna učitelka.

3. **Omezení (plánujeme později)**
   - Např. „tyto dvě osoby ne dohromady v jedné třídě / v jedné směně“.

4. **Střídání v určitých slotech (rotace)**
   - Pro vybrané časové sloty (a místo: třída/budova) lze nastavit **snížený počet osob** (např. v daném čase stačí jedna osoba na budovu místo na třídu).
   - U takových slotů lze požadovat **střídání**: stejná osoba by neměla být v tomto slotu vždy – má se střídat více lidí, aby nebyl pořád stejný člověk (např. pátek 15:30–17:00, jedna učitelka na budovu, ale každý týden jiná).

5. **Minimální překryv dvou pedagogů v třídě**
   - Každý den musí v každé třídě po **konfigurovatelnou dobu** (např. alespoň 2 hodiny) být **překryv dvou učitelek** – tedy současně přítomné minimálně dvě učitelky (pedagogové).

6. **Kmenové vs. vykrývací učitelky na třídu**
   - **Kmenové učitelky:** na třídu ideálně 2–3, přiřazené k jedné třídě, ideálně nechodí do jiných tříd.
   - **Vykrývací učitelka:** může existovat učitelka s kratším úvazkem, která jen doplňuje (není kmenová v jedné třídě). Konfigurovatelné, které role mohou být kmenové / vykrývací.
   - **Bez mezer:** nemělo by docházet k volným mezerám mezi bloky práce v různých třídách (pracovní doba souvislá nebo s jedním přesunem).
   - **Jeden přesun:** u vykrývací kategorie je **jeden přesun** ze třídy do jiné v rámci směny přijatelný; víc přesunů už ne.

### Plánování směn (charakter rozvrhu)
- **Pedagogové** (učitelky, asistentky, ředitelka, zástupkyně): směny **ideálně stejné** – opakující se týden po týdnu (minimálně u pedagogů).
- **Školníci/školnice:** možnost **krátký–dlouhý týden** – plánování volitelně na **14 dní** (dva týdny v cyklu).

### Výpočet a výstup
- Aplikace podle těchto pravidel **vypočte jeden návrh směn** (kdo kdy kde je).
- Jedno řešení na přepočet; úprava jen změnou konfigurace a znovu spuštěným výpočtem.

---

## Co aplikace aktuálně umí (implementované funkce)

- Zobrazí úvodní stránku s hlavičkou „MS-smeny“, krátkým textem a patičkou (čistě statické HTML + CSS + načtení JS).
- **Datový model a Local Storage (A1):**
  - Definice struktury dat: zaměstnanci (id, jméno, úvazek v minutách/týden, role), budovy s třídami (id, název, otevírací doba), časové sloty min/max osob, pravidla (např. minimální překryv). Role: učitelka, asistentka pedagoga, školník/školnice, ředitelka, zástupkyně.
  - Při startu se načtou data z Local Storage, nebo se použije výchozí prázdný stav.
  - API pro úpravu dat: `MSemenyStorage.getData()`, `MSemenyStorage.setData()`, `MSemenyStorage.replaceData()`, `MSemenyStorage.ulozNyni()`, `MSemenyStorage.resetCache()` – při setData/replaceData se automaticky ukládá do Local Storage.
- **Export a import JSON (A2):**
  - `MSemenyExportImport.exportData()` – vrátí aktuální data jako JSON řetězec.
  - `MSemenyExportImport.stahnoutExport(nazevSouboru)` – stáhne data jako JSON soubor (volitelně název, default `ms-smeny-export.json`).
  - `MSemenyExportImport.importZeJSON(jsonString)` – naimportuje data z JSON řetězce, ověří strukturu (zamestnanci, budovy pole), doplní chybějící version/minMaxSloty/pravidla a nahradí stav v Local Storage. Vrátí `true` při úspěchu, `false` při neplatném vstupu. Zatím bez UI – volatelné z konzole.
- **Kostra stránky a navigace (A3):**
  - Jedna stránka s hlavičkou (název MS-smeny), hlavní navigací (Přehled, Zaměstnanci, Budovy a třídy, Pravidla, Návrh směn) a obsahovou oblastí s pěti sekcemi. Sekce se přepínají v JS (zobrazení/skrytí), URL hash (#prehled, #zamestnanci, …) se při přepnutí aktualizuje. API: `MSemenyNavigace.zobrazSekci(id)`, `MSemenyNavigace.sekceZHash()`, `MSemenyNavigace.getIdSekci()` (js/navigace.js).
- **Zaměstnanci – seznam a formulář (B1):**
  - V sekci Zaměstnanci: tabulka zaměstnanců (jméno, úvazek v h/min za týden, role), tlačítko „Přidat zaměstnance“, formulář (jméno, hodiny + minuty týdně, role – učitelka, asistentka pedagoga, školník/školnice, ředitelka, zástupkyně). Akce: přidat, upravit, smazat (s potvrzením). Data se ukládají do modelu a Local Storage (js/zamestnanci.js).
- **Testy:** v prohlížeči se spouštějí otevřením `test/index.html`, nebo `npm test` (Playwright). Testují datový model, Local Storage, export/import JSON, navigaci a zaměstnance; po každém úkolu je vhodné testy znovu spustit a ověřit, že nic nerozbilo.

---

## Co plánujeme (feature set)

- Ukládání dat do Local Storage, export/import JSON.
- Konfigurace: zaměstnanci (jméno, úvazek v hodinách za týden s přesností na minuty, role), budovy a třídy, otevírací doby, min/max počty osob v čase.
- Role: učitelka, asistentka pedagoga, školník/školnice, ředitelka, zástupkyně (příp. další).
- Omezení typu „tyto 2 osoby ne dohromady“ (později).
- Pro vybrané sloty: snížený počet osob + požadavek střídání (rotace), aby v daném slotu nebyla pořád stejná osoba.
- Minimální překryv dvou pedagogů v každé třídě každý den (konfigurovatelná délka, např. 2 h).
- Na třídu: kmenové učitelky (2–3, ideálně jen ta třída) vs. vykrývací (doplňuje, kratší úvazek); bez mezer mezi bloky, max. jeden přesun mezi třídami ve směně u vykrývací.
- Směny pedagogů ideálně stejné (opakující se); u školníků volitelně plán na 14 dní (krátký–dlouhý týden).
- Výpočet jednoho návrhu směn podle pravidel; změna = úprava konfigurace + přepočet.

_(Seznam může být po vyřešení dotazů upřesněn nebo rozšířen.)_

---

## Poslední aktualizace

- 2025-02-05: Implementován úkol B1 – zaměstnanci: seznam, formulář přidat/upravit/smazat, ukládání do modelu a Local Storage (js/zamestnanci.js, test-zamestnanci.js).
- 2025-02-05: Implementován úkol A3 – kostra stránky a navigace (hlavička, nav s 5 sekcemi, přepínání v JS, hash; js/navigace.js, test-navigace.js).
- 2025-02-05: Implementován úkol A2 – export a import JSON (js/export-import.js): exportData(), stahnoutExport(), importZeJSON(); testy v test-export-import.js.
- 2025-02-05: Přidány testy – test/index.html, test-runner a testy pro datový model a storage; spuštění v prohlížeči. Do storage doplněn resetCache() pro testy a reload.
- 2025-02-05: Implementován úkol A1 – datový model (js/data-model.js) a Local Storage (js/storage.js), načtení při startu, ukládání při změně.
- 2025-02-05: Pravidla: minimální překryv 2 pedagogů v třídě (konfig. délka); kmenové vs. vykrývací učitelky, bez mezer, max. 1 přesun u vykrývací.
- 2025-02-05: Pravidlo střídání v slotech: snížený počet osob v konkrétním čase + rotace (ne pořád stejná osoba), příklad pátek 15:30–17.
- 2025-02-05: Doplněno plánování směn: pedagogové = ideálně stejné směny; školníci = volitelně 14 dní (krátký–dlouhý týden).
- 2025-02-05: Upřesněn úvazek: hodiny za týden, s přesností na minuty.
- 2025-02-05: Zapsána základní představa aplikace (MŠ, směny, konfigurace, Local Storage, JSON, jedno řešení).
- 2025-02-05: Založení dokumentu, výchozí stav (pouze statická úvodní stránka).
