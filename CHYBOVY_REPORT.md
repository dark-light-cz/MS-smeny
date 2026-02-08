# Chybový report – návod pro AI a vývojáře

## Co je chybový report

**Chybový report** je anonymizovaný soubor (Markdown), který aplikace MS-smeny vygeneruje po kliku na **Přepočítat** na záložce **Návrh směn**, pokud validace návrhu najde chyby nebo varování. Report slouží k předání kontextu **AI (nebo jinému řešiteli)** tak, aby mohl chybu napravit v kódu, aniž by měl přístup k reálným datům (jména osob, názvy budov a tříd jsou anonymizována).

### Kdy se report vygeneruje

- Po **Přepočítat** se automaticky spustí **Validovat**.
- Pokud validace vrátí alespoň jednu položku (chyba nebo varování), zobrazí se tlačítko **„Stáhnout chybový report pro AI“**.
- Uživatel stáhne soubor `.md` a ten může předat AI jako zadání k nápravě.

Tlačítko **„Stáhnout chybový report pro AI“** se zobrazí i po ručním kliku na **Validovat**, pokud jsou nalezeny chyby/varování.

---

## Obsah reportu

Report obsahuje tři oddíly (všechna data jsou **anonymizována**):

### 1. Konfigurace (anonymizovaná)

- **Zaměstnanci:** místo jmen jsou labely podle role a pořadí: `ucitelka1`, `ucitelka2`, `reditelka1`, `zastupkyne1`, `asistentka1`, `skolnik1` atd. U každého je úvazek (min/týden) a role.
- **Budovy a třídy:** `budova1`, `budova2`, … a u každé budovy seznam tříd: `trida1`, `trida2`, …
- **Požadavky na počet osob v čase (minMaxSloty):** časové sloty (od–do), min/max na budovu a na třídu, dny platnosti.
- **Pravidla:** výběr relevantních pravidel (minimální překryv, přechod mezi budovami atd.).

### 2. Vygenerovaný přehled (anonymizovaný)

Seznam přiřazení ve formátu:

- **Den | Zaměstnanec (label) | Čas od–do | Místo (třída/budova label)**

Příklad:

- Po | ucitelka1 | 07:00–12:00 | trida1 (budova1)
- Po | ucitelka2 | 09:00–17:00 | trida2 (budova1)

### 3. Nalezené chyby

Každá položka obsahuje:

- **Pravidlo** (např. „Přečerpaný úvazek“, „Min/max na třídu“)
- **Typ:** chyba / varovani
- **Kontext:** text popisující porušení, s anonymizovanými jmény a názvy (např. „ucitelka1: v návrhu 500 min, úvazek max 480 min“)

---

## Jak s reportem pracovat (postup pro AI)

Report je určen k tomu, aby **AI (nebo vývojář)** mohl chybu **systematicky opravit** v repozitáři MS-smeny. Doporučený postup:

### Krok 1: Reprodukce chyby – napsat test

1. Z oddílu **Konfigurace** a **Vygenerovaný přehled** sestav **anonymizovaná testovací data** v souladu s datovým modelem aplikace (viz `js/data-model.js`, testy v `test/`).
2. Napiš **nový test** (nebo rozšiř existující v `test/test-vypocet-smen.js`, `test/test-validace-navrhu.js` apod.), který:
   - naplní konfiguraci podle oddílu 1 (zaměstnanci s úvazky a rolemi, budovy, třídy, minMaxSloty, pravidla),
   - spustí výpočet návrhu (`MSemenyVypocetSmen.vypocetSmen(data)`), případně validaci (`MSemenyValidaceNavrhu.validujNavrh(prirazeni, data)`),
   - a **ověří**, že chyba z oddílu 3 reportu nastane (např. že validace vrátí očekávanou chybu, nebo že výpočet splňuje požadavky tam, kde report hlásí porušení).
3. Cíl: test by měl **selhat** (červený), protože aktuální kód chybu ještě generuje.

### Krok 2: Náprava kódu

1. Uprav **algoritmus nebo logiku** v příslušném modulu (např. `js/vypocet-smen.js`, `js/validace-navrhu.js`) tak, aby:
   - chyba z reportu **nastávala co možná nejméně** (splnění pravidel, úvazků, min/max na třídu a budovu),
   - výstup zůstal konzistentní s datovým modelem a zbytkem aplikace.
2. Spusť testy (`npm test`). Nový test z kroku 1 by měl **projít** (zelený).
3. Ověř, že **ostatní existující testy** stále procházejí. Pokud nějaký padne, buď oprav regresi, nebo (po dohodě s uživatelem) uprav/odstraň test podle pravidel projektu.

### Shrnutí pro AI

- **Vstup:** chybový report (soubor .md se třemi oddíly).
- **Výstup:**  
  1) test, který chybu z reportu odhalí (na anonymizovaných datech),  
  2) úprava kódu tak, aby test prošel a chyba se negenerovala.
- **Pravidla projektu:** viz `.cursor/rules/projekt.mdc` – komentáře a commity v češtině, existující testy neměnit svévolně, po změně spustit `npm test`.

---

## Technické poznámky

- Report generuje modul **`js/chybovy-report.js`** (funkce `generateReport`, `stahnoutChybovyReport`).
- Anonymizace mapuje: zaměstnance na `role + číslo` (podle role a pořadí), budovy na `budova1`, `budova2`, …, třídy na `trida1`, `trida2`, … (globální pořadí).
- Formát souboru: UTF-8, Markdown, s BOM při ukládání do souboru.
