# Seznam implementačních úkolů

Postupná implementace funkcí a částí aplikace MS-smeny. Úkoly plníme v pořadí (nebo v logických blocích); po každém dokončeném úkolu aktualizujeme AKTUALNI_STAV.md.

---

## Blok A: Data a kostra aplikace

| # | Úkol | Stav | Poznámka |
|---|------|------|----------|
| A1 | **Datový model a Local Storage** – definice struktury dat (zaměstnanci: id, jméno, úvazek v minutách/týden, role; budovy, třídy, otevírací doby, pravidla). Načtení a uložení do Local Storage při změně. | [x] | data-model.js, storage.js; načtení při startu, setData/replaceData/ulozNyni. |
| A2 | **Export a import JSON** – funkce exportu celých dat do JSON souboru a importu z JSON (obnovení dat). Bez UI zatím jen volatelné z konzole nebo později napojit na tlačítka. | [x] | export-import.js: exportData(), stahnoutExport(), importZeJSON(); test-export-import.js. |
| A3 | **Kostra stránky a navigace** – základní rozložení aplikace: hlavička, navigace mezi sekcemi (např. Přehled / Zaměstnanci / Budovy a třídy / Pravidla / Návrh směn), obsahová oblast. Jedna stránka, sekce přepínané v JS (ne více HTML). | [x] | index.html: hlavička + nav + 5 sekcí; js/navigace.js: zobrazSekci, hash; test-navigace.js. |

---

## Blok B: Konfigurace – základy

| # | Úkol | Stav | Poznámka |
|---|------|------|----------|
| B1 | **Zaměstnanci – seznam a formulář** – zobrazení seznamu zaměstnanců, přidat / upravit / smazat. Pole: jméno, úvazek (hodiny + minuty za týden), role (výběr: učitelka, asistentka pedagoga, školník/školnice, ředitelka, zástupkyně). Ukládání do modelu a Local Storage. | [x] | Sekce Zaměstnanci: tabulka, formulář, tlačítka; js/zamestnanci.js; test-zamestnanci.js. |
| B1b | **Zaměstnanci – řazení tabulky** – na pohledu Zaměstnanci automaticky řadit tabulku: nejdřív podle role (pořadí: ředitelka, zástupkyně, učitelka, asistentka pedagoga, školník/školnice), v rámci role podle jména. | [x] | seradZamestnance() v zamestnanci.js, vykresliSeznam volá řazení; test-zamestnanci.js. |
| B1c | **Zaměstnanci – řazení sloupců uživatelem** – u tabulky zaměstnanců umožnit řazení podle sloupců zvolených uživatelem; podpora řazení podle více parametrů (více sloupců). Jednoduchá vizualizace ikonkou (např. šipka nahoru/dolů podle směru, případně pořadí kritérií); ovládání co nejběžnější a uživatelsky známé (typicky klik na záhlaví sloupce, případně Shift+klik pro sekundární řazení). | [ ] | |
| B2 | **Budovy a třídy – struktura** – CRUD budov, v každé budově CRUD tříd. U budovy/třídy: název. Zobrazení hierarchie (budova → třídy). Ukládání do modelu a Local Storage. | [x] | Sekce Budovy a třídy: hierarchie, formuláře budov/tříd; js/budovy-tridy.js; test-budovy-tridy.js. |
| B3 | **Otevírací doba** – u budovy nebo třídy nastavení otevírací doby (např. den v týdnu + od–do, nebo jednoduchý model „po–pá 7:00–17:00“). Uložení do modelu. | [x] | Formuláře budov a tříd: fieldset Otevírací doba (dny Po–Ne, od/do); třída má oteviraciDoba v modelu; import doplní chybějící. |
| B4 | **Min/max počet osob v čase** – konfigurace časových slotů (od–do) a pro každý slot min/max počet osob (na třídu nebo na budovu). Příklad: 7:00–7:45 min 1 na budovu; od 7:45 min 1 na třídu. Uložení do modelu. | [x] | Sekce Pravidla: časové sloty, formulář s nápovědami, validace, zprávy bez alertů; js/min-max-sloty.js, vytvorMinMaxSlot v modelu; test-min-max-sloty.js. |
| B4b | **Požadavky na počet osob – duplikovat řádek** – v tabulce „Požadavky na počet osob v čase“ přidat možnost duplikovat řádek: obsah řádku se předvyplní do formuláře nového záznamu (uživatel může upravit a uložit jako nový slot). | [ ] | |

---

## Blok C: Konfigurace – pokročilá pravidla

| # | Úkol | Stav | Poznámka |
|---|------|------|----------|
| C1 | **Minimální překryv v třídě** – konfigurovatelná délka (např. 2 hodiny) překryvu dvou pedagogů v každé třídě každý den. Uložení do modelu. | [x] | Sekce Pravidla: blok „Minimální překryv v třídě“, formulář (hodiny), js/pravidla-prekryv.js; pravidla.minimalniPrekryvMinuty; test-pravidla-prekryv.js. |
| C2 | **Kmenové vs. vykrývací** – u zaměstnance označení kmenová/vykrývací; přiřazení kmenových k jedné třídě (2–3 na třídu). Pravidlo „bez mezer“, „max 1 přesun“ u vykrývací – uložení do modelu, výpočet využije později. | [x] | Model: kmenovaVykryvaci, tridaId; pravidla: vykryvaciBezMezer, vykryvaciMaxPresun, min/maxKmenovychNaTridu. Formulář zaměstnance: kategorie + select třídy. Sekce Pravidla: blok „Pravidla pro vykrývací“. Export/import doplňuje a sloučí. |
| C3 | **Speciální sloty a rotace** – definice slotů se sníženým počtem osob (např. pátek 15:30–17, 1 osoba na budovu) a příznak „požadovat střídání“ (rotace). Uložení do modelu. | [x] | Slot: volitelná pole dny (1–5), rotace (boolean). Formulář: výběr dnů (Po–Pá), checkbox rotace. Tabulka: sloupce Dny, Rotace. Import normalizuje dny/rotace. |
| C4 | **Omezení „ne dohromady“** (volitelně později) – výběr dvojic osob, které nemají být spolu v jedné třídě/směně. Uložení do modelu. | [ ] | |

---

## Blok D: Výpočet a zobrazení návrhu

| # | Úkol | Stav | Poznámka |
|---|------|------|----------|
| D1 | **Výpočet – první verze** – algoritmus: na vstupu konfigurace (zaměstnanci, budovy, třídy, otevírací doba, min/max v čase). Výstup: jedno řešení – přiřazení „kdo kdy kde“ tak, aby byly splněny min/max požadavky a úvazky. Zjednodušená verze bez překryvu, kmenových a rotace je OK. | [ ] | |
| D2 | **Zobrazení návrhu směn** – stránka/sekce „Návrh směn“: zobrazení výsledku výpočtu (tabulka nebo přehled podle dnů/tříd/osob). Tlačítko „Přepočítat“. | [ ] | |
| D3 | **Rozšíření výpočtu** – zapojení dalších pravidel: minimální překryv v třídě, kmenové/vykrývací (bez mezer, max 1 přesun), rotace ve speciálních slotech. | [ ] | |
| D4 | **Plánování na týden vs. 14 dní** – pedagogové týdenní opakující se směny; školníci volitelně plán na 14 dní (krátký–dlouhý týden). Zapojit do výpočtu a zobrazení. | [ ] | |

---

## Blok E: Dokončení a UX

| # | Úkol | Stav | Poznámka |
|---|------|------|----------|
| E1 | **Export/import – UI** – tlačítka nebo menu „Exportovat data“ (stáhnout JSON) a „Importovat data“ (nahrát JSON, nahradit/ sloučit dle dohody). | [x] | Sekce Přehled: blok Záloha a obnova dat, tlačítka Exportovat data / Importovat data; js/export-import-ui.js; po importu obnova pohledů. |
| E2 | **Validace a hlášení chyb** – kontrola vstupů (úvazek, časy, povinná pole), zobrazení srozumitelných hlášek. Při výpočtu např. „nelze najít řešení“ + důvod pokud možno. | [ ] | |
| E3 | **Doladění UX** – konzistentní styly, přehlednost formulářů a tabulek, základní responzivita. | [ ] | |
| E4 | **Zobrazovaný název aplikace** – upravit lidský název aplikace zobrazený v hlavičce stránky a v titulku prohlížeče (`<title>`). Jde o to, jak se aplikace jmenuje pro uživatele v UI, ne o název repozitáře na GitHubu. | [ ] | |
| E5 | **Vylepšit vzhled** – vzhled aplikace: barevné schéma, typografie, vizuální hierarchie a čitelnost; konzistentní vzhled formulářů, tabulek a navigace tak, aby byl celkový dojem přehledný a přívětivý. | [ ] | |

---

## Jak s dokumentem pracovat

- **Zaškrtnutí:** po dokončení úkolu změň `[ ]` na `[x]` a doplň krátkou poznámku.
- **Po každém dokončeném úkolu:** aktualizuj **AKTUALNI_STAV.md** – sekci „Co aplikace aktuálně umí“.
- **Testy:** před uzavřením úkolu spusť `npm test`. Pro novou funkci přidej nové testy (v příslušném souboru v `test/` nebo nový testovací soubor). Existující testy měň jen po zdůvodnění a po potvrzení uživatelem – viz pravidla v `.cursor/rules/projekt.mdc`.
- **Odkaz z CHECKLIST.md:** Fáze 2 (Implementace jádra) se plní podle tohoto seznamu; úkol 2.1 = např. A1–A3, pak B1.
