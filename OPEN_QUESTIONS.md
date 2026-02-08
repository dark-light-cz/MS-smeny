# Otevřené dotazy

Nejasnosti a rozhodnutí, která musí padnout na tvou stranu. Workflow:

1. **Jeden dotaz** – vždy se řeší jen jeden dotaz; na ostatní se neodpovídá najednou.
2. **Po odpovědi** – zreviduj zbývající dotazy: dávají ještě smysl, nebo už byly odpovědí nepřímo vyřešeny?
3. **Nový dotaz** – pokud odpověď vyvolá další nejasnost, přidej ji na konec seznamu.
4. **Po vyřešení všech** – krok „zapracování“: seznam dotazů a odpovědí zapracujeme do dokumentace (specifikace, feature set). Důležitý je finální stav a důvody, ne detailní cesta k řešení.

---

## Aktuální seznam dotazů

1. **Období a časová granularita:** Návrh směn se má vztahovat na jaké období – jeden den, týden, měsíc (nebo to má být konfigurovatelné)? A v jakých časových blocích se to řeší – po hodinách, po 15 minutách (např. 7:00, 7:15, 7:30…), nebo jinak?

2. **Slot minNaTridu 2 v daném čase (např. 9:30–11:00):** V reálné konfiguraci byl požadavek „v každé třídě 2 učitelky mezi 9:30 a 11:00“. Algoritmus někdy vygeneruje návrh, kde v některé třídě je v tomto okně jen 1 osoba. Byl přidaný **regresní test** (test-vypocet-smen.js: „Slot 09:30–11:00 minNaTridu 2…“), který tuto chybu odhalí; test zatím padá. V algoritmu byly zkoušeny úpravy (redistribuce lidí s kladnými minutami, bonus za pokrytí špičky, omezení krátkých směn na špičku, opravný krok přesunu směny do špičky) – test stále nesplněn. **Otevřeno:** Jak má být chyba vyřešena? Možnosti: (a) **dvoufázové plánování** – nejdřív vynucení pokrytí špičky (slotů s minNaTridu ≥ 2 v daném čase), pak zbytek; (b) **validace po výpočtu** – po výpočtu zkontrolovat, že v každé minutě a každé třídě je coverage ≥ demand, a pokud ne, vrátit `ok: false` se srozumitelnou chybou („Nedostatek osob v čase 9:30–11:00 v třídě X“); (c) jiný postup po dohodě.

---

## Vyřešené (pro referenci po zapracování)

_Po zapracování do specifikace lze sekci vyčistit nebo zkrátit._

_(prázdné)_
