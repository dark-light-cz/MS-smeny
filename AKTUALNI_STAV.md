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

### Plánování směn (charakter rozvrhu)
- **Pedagogové** (učitelky, asistentky, ředitelka, zástupkyně): směny **ideálně stejné** – opakující se týden po týdnu (minimálně u pedagogů).
- **Školníci/školnice:** možnost **krátký–dlouhý týden** – plánování volitelně na **14 dní** (dva týdny v cyklu).

### Výpočet a výstup
- Aplikace podle těchto pravidel **vypočte jeden návrh směn** (kdo kdy kde je).
- Jedno řešení na přepočet; úprava jen změnou konfigurace a znovu spuštěným výpočtem.

---

## Co aplikace aktuálně umí (implementované funkce)

- Zobrazí úvodní stránku s hlavičkou „MS-smeny“, krátkým textem a patičkou (čistě statické HTML + CSS + načtení JS).

---

## Co plánujeme (feature set)

- Ukládání dat do Local Storage, export/import JSON.
- Konfigurace: zaměstnanci (jméno, úvazek v hodinách za týden s přesností na minuty, role), budovy a třídy, otevírací doby, min/max počty osob v čase.
- Role: učitelka, asistentka pedagoga, školník/školnice, ředitelka, zástupkyně (příp. další).
- Omezení typu „tyto 2 osoby ne dohromady“ (později).
- Směny pedagogů ideálně stejné (opakující se); u školníků volitelně plán na 14 dní (krátký–dlouhý týden).
- Výpočet jednoho návrhu směn podle pravidel; změna = úprava konfigurace + přepočet.

_(Seznam může být po vyřešení dotazů upřesněn nebo rozšířen.)_

---

## Poslední aktualizace

- 2025-02-05: Doplněno plánování směn: pedagogové = ideálně stejné směny; školníci = volitelně 14 dní (krátký–dlouhý týden).
- 2025-02-05: Upřesněn úvazek: hodiny za týden, s přesností na minuty.
- 2025-02-05: Zapsána základní představa aplikace (MŠ, směny, konfigurace, Local Storage, JSON, jedno řešení).
- 2025-02-05: Založení dokumentu, výchozí stav (pouze statická úvodní stránka).
