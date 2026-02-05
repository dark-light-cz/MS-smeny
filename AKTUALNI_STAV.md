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
- **Zaměstnanci – řazení tabulky (B1b):**
  - Tabulka zaměstnanců se automaticky řadí: nejdřív podle role (ředitelka, zástupkyně, učitelka, asistentka pedagoga, školník/školnice), v rámci role podle jména (localeCompare cs).
- **Zaměstnanci – řazení sloupců uživatelem (B1c):**
  - Klik na záhlaví sloupce (Jméno, Úvazek, Role, Kategorie) nastaví řazení podle tohoto sloupce (opakovaný klik přepne směr). Shift+klik přidá sloupec jako další kritérium. V záhlaví se zobrazí šipka ▲/▼ a pořadí kritérií (1, 2, …).
- **Budovy a třídy – struktura (B2):**
  - V sekci Budovy a třídy: hierarchie budova → třídy. CRUD budov (název), v každé budově CRUD tříd (název). Formuláře pro přidání/úpravu budovy a třídy, u třídy výběr budovy (při úpravě lze přesunout do jiné budovy). Smazání budovy (i se třídami) a smazání třídy s potvrzením. Ukládání do modelu a Local Storage (js/budovy-tridy.js).
- **Otevírací doba (B3):**
  - U budovy i u třídy lze v příslušném formuláři nastavit otevírací dobu: výběr dnů (Po–Ne), čas Od a Do (model „po–pá 7:00–17:00“). Uložení do modelu (oteviraciDoba: { dny, od, do }). Třída má v modelu oteviraciDoba (vytvorTridu ji vytvoří s výchozí hodnotou). Při importu JSON se chybějící oteviraciDoba u budov a tříd doplní výchozí hodnotou.
- **Minimální překryv v třídě (C1):**
  - V sekci Pravidla: blok „Minimální překryv v třídě“ – konfigurovatelná délka překryvu dvou pedagogů (v hodinách, např. 2). Uložení do modelu (pravidla.minimalniPrekryvMinuty v minutách). Formulář s nápovědou a tlačítkem Uložit (js/pravidla-prekryv.js).
- **Kmenové vs. vykrývací (C2):**
  - U zaměstnance: kategorie **kmenová** / **vykrývací**; u kmenové volitelný výběr **přiřazené třídy**. V modelu: zaměstnanec má `kmenovaVykryvaci` ('kmenová' | 'vykrývací') a `tridaId` (id třídy nebo null). Pravidla v modelu: `vykryvaciBezMezer`, `vykryvaciMaxPresun`, `minKmenovychNaTridu`, `maxKmenovychNaTridu`. V sekci Pravidla: blok „Pravidla pro vykrývací“ – checkbox „Bez mezer“, pole „Max. přesunů mezi třídami“ (0–10). Formulář zaměstnance rozšířen o kategorii a select třídy (zobrazí se jen u kmenové). Export/import doplňuje u zaměstnanců chybějící kmenovaVykryvaci a tridaId a sloučí pravidla (js/zamestnanci.js, js/pravidla-prekryv.js).
- **Speciální sloty a rotace (C3):**
  - Časový slot má volitelná pole **dny** (pole čísel 1–5: Po–Pá; prázdné = platí všechny pracovní dny) a **rotace** (boolean: požadovat střídání osob v tomto slotu). V sekci Pravidla u „Požadavky na počet osob v čase“: formulář rozšířen o fieldset „Platí ve dnech“ (checkboxy Po–Pá) a checkbox „Požadovat střídání (rotace)“. Tabulka slotů má sloupce Dny a Rotace. Import normalizuje u každého slotu dny a rotace (js/data-model.js, js/min-max-sloty.js).
- **Omezení „ne dohromady“ (C4):**
  - Dvojice osob, které nemají být spolu v jedné třídě ani ve stejné směně. V modelu: **omezeniNeDohromady** (pole objektů { id, osoba1Id, osoba2Id } v kanonickém pořadí). Model: vytvorOmezeniNeDohromady(osoba1Id, osoba2Id). V sekci Pravidla: blok „Omezení „ne dohromady““ – výběr dvou osob (selecty), tlačítko „Přidat dvojici“, seznam dvojic se smazáním. Validace: dvě různé osoby, bez duplicit. Po importu se seznam a výběry obnoví (js/omezeni-ne-dohromady.js).
- **Min/max počet osob v čase (B4):**
  - V sekci Pravidla: konfigurace časových slotů (od–do) a pro každý slot minimální a maximální počet osob na budovu a na třídu. Přehledné formuláře s nápovědami („Prázdné = bez omezení“), validace (čas Do později než Od, nezáporné počty, min ≤ max). Chyby a potvrzení se zobrazují na stránce (bez alertů), úspěch mizí po 3 s. Tabulka slotů řazená podle času, přidat / upravit / **duplikovat** / smazat. Model: vytvorMinMaxSlot(), minMaxSloty v úložišti.
- **Požadavky na počet osob – duplikovat řádek (B4b):**
  - U každého časového slotu tlačítko „Duplikovat“: otevře formulář s předvyplněnými hodnotami daného řádku pro uložení jako nový slot (uživatel může upravit a uložit).
- **Výpočet návrhu směn – první verze (D1) a rozšíření (D3):**
  - Algoritmus na vstupu bere konfiguraci (zaměstnanci, budovy, minMaxSloty, pravidla). Výstup: přiřazení „kdo kdy kde“. D1: min/max v slotech, úvazky. D3: (1) **Minimální překryv** – pokud jsou třídy a pravidla.minimalniPrekryvMinuty > 0, přidá se syntetický slot (např. 09:00–11:00) s minNaTridu 2 v každé třídě. (2) **Kmenové/vykrývací** – při výběru osoby pro třídu se preferuje kmenová přiřazená k té třídě; u vykrývací se respektuje max počet tříd za den (vykryvaciMaxPresun + 1). (3) **Rotace** – u slotu s rotace: true se preferují osoby s menším počtem přiřazení do daného slotu/místa v týdnu. API: `MSemenyVypocetSmen.vypocetSmen(data)` (js/vypocet-smen.js). V návrhu směn se překryv zobrazí jako „Překryv (09:00–11:00)“.
- **Zobrazení návrhu směn (D2):**
  - Sekce „Návrh směn“: popis, tlačítko „Přepočítat“, po výpočtu tabulka s sloupci Den, Čas, Místo, Osoby. Chyba výpočtu (např. nedostatek úvazků) se zobrazí pod tlačítkem. Prázdný stav před prvním výpočtem (js/navrh-smen-ui.js).
- **Export návrhu směn jako CSV (D2c):**
  - Po přepočtu se v sekci Návrh směn zobrazí tlačítko „Stáhnout CSV“. Stáhne aktuální návrh jako soubor navrh-smen.csv (sloupce Den, Čas, Místo, Osoby; oddělovač ;, UTF-8 s BOM). API: `MSemenyExportNavrhCsv.navrhToCsv(prirazeni, data, opts)`, `MSemenyExportNavrhCsv.stahnoutNavrhCsv(...)` (js/export-navrh-csv.js). UI používá `MSemenyNavrhSmenUI.getNavrhRows()` pro sdílenou přípravu řádků.
- **Rozšířené nastavení D3 (propojení Pravidla ↔ výpočet):**
  - V sekci Pravidla: úvodní text vysvětluje, že nastavení (časové sloty včetně rotace, minimální překryv, pravidla pro vykrývací) ovlivňují výpočet návrhu směn. Na konci sekce odkaz na Návrh směn místo zastaralé poznámky „blok D“.
- **Export/import – UI (E1):**
  - V sekci Přehled: blok „Záloha a obnova dat“ s textem, že při importu se data nahradí. Tlačítko „Exportovat data“ stáhne JSON soubor. Tlačítko „Importovat data“ otevře výběr souboru; po nahrání platného JSON se data nahradí a zobrazení zaměstnanců, budov a časových slotů se automaticky obnoví. Úspěch a chyby (neplatný soubor) se zobrazují pod tlačítky (js/export-import-ui.js).
- **Testy:** v prohlížeči se spouštějí otevřením `test/index.html`, nebo `npm test` (Playwright). Testují datový model, Local Storage, export/import JSON, navigaci, zaměstnance, budovy/třídy, časové sloty min/max a pravidlo překryvu; po každém úkolu je vhodné testy znovu spustit a ověřit, že nic nerozbilo.

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

- 2025-02-05: Implementován D2c – export výsledku návrhu směn jako CSV (tlačítko Stáhnout CSV, js/export-navrh-csv.js, testy).
- 2025-02-05: Rozšířené nastavení D3 – v sekci Pravidla úvodní text propojující nastavení s výpočtem návrhu směn; závěrečný odkaz na Návrh směn.
- 2025-02-05: Implementován D3 – rozšíření výpočtu: minimální překryv v třídě (syntetický slot), preferování kmenových u své třídy a omezení přesunů u vykrývacích, rotace u slotů. Zobrazení překryvu v tabulce návrhu.
- 2025-02-05: Implementovány D1 a D2 – výpočet návrhu směn (algoritmus min/max a úvazky, výstup přiřazení) a zobrazení v sekci Návrh směn (tabulka Den/Čas/Místo/Osoby, tlačítko Přepočítat).
- 2025-02-05: Implementovány úkoly B1c (řazení sloupců zaměstnanců – klik / Shift+klik, ▲/▼ a pořadí kritérií) a B4b (duplikovat řádek u časových slotů – předvyplnění formuláře pro nový slot).
- 2025-02-05: Implementován úkol C4 – omezení „ne dohromady“: dvojice osob (model omezeniNeDohromady, vytvorOmezeniNeDohromady); sekce Pravidla – přidat/smazat dvojice; import normalizuje; testy doplněny.
- 2025-02-05: Implementován úkol C3 – speciální sloty a rotace: u časového slotu pole dny (Po–Pá) a rotace; formulář a tabulka v sekci Pravidla; import normalizuje sloty; testy doplněny.
- 2025-02-05: Implementován úkol C2 – kmenové vs. vykrývací: u zaměstnance kategorie a přiřazená třída; v Pravidlech blok „Pravidla pro vykrývací“ (bez mezer, max. přesunů); model a export/import doplněny; testy rozšířeny.
- 2025-02-05: Implementován úkol C1 – minimální překryv v třídě (konfigurace v sekci Pravidla, uložení pravidla.minimalniPrekryvMinuty).
- 2025-02-05: Implementován úkol B1b – řazení tabulky zaměstnanců podle role a jména.
- 2025-02-05: Implementován úkol E1 – export/import UI (tlačítka na Přehledu, obnova pohledů po importu).
- 2025-02-05: Implementován úkol B4 – min/max počet osob v čase (časové sloty v sekci Pravidla, validace, srozumitelné zprávy, js/min-max-sloty.js).
- 2025-02-05: Implementován úkol B3 – otevírací doba u budov a tříd (formuláře: dny Po–Ne, od/do; model třídy rozšířen o oteviraciDoba; import doplňuje chybějící).
- 2025-02-05: Implementován úkol B2 – budovy a třídy: CRUD budov a tříd, hierarchie, ukládání do modelu a Local Storage (js/budovy-tridy.js, test-budovy-tridy.js).
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
