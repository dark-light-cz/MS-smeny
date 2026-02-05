# Checklist – stav úkolů

Použití: u každého úkolu je stav `[ ]` (k vykonání) nebo `[x]` (hotovo). Po dokončení úkolu zaškrtni a případně doplň krátkou poznámku.

---

## Co dál (doporučený postup)

**Právě teď:** Specifikace máme; následuje **implementace** podle **IMPLEMENTACE_UKOLY.md**.

1. Konkrétní pořadí úkolů je v **IMPLEMENTACE_UKOLY.md** (bloky A → B → C → D → E).
2. Začínáme **Blokem A** (datový model, Local Storage, export/import JSON, kostra stránky a navigace).
3. Po každém dokončeném úkolu: zaškrtnout v IMPLEMENTACE_UKOLY.md a aktualizovat **AKTUALNI_STAV.md** (co aplikace umí).
4. Otevřené dotazy (např. období a časová granularita) lze vyřešit průběžně a zapracovat do specifikace.

V každém okamžiku držíme **AKTUALNI_STAV.md** aktuální – je to přehled toho, co už aplikace umí.

---

## Fáze 0: Příprava

- [x] **0.1 Založení a propojení s GitHub repozitářem**
  - Vytvořit repozitář na GitHubu (osobní účet)
  - Propojit lokální projekt s remote (origin)
  - Ověřit push (např. README nebo první commit)
  - Poznámka: Repozitář https://github.com/dark-light-cz/MS-smeny, push přes SSH proběhl.

- [x] **0.2 Základní struktura projektu**
  - Složky a soubory: index.html, css/, js/
  - Minimální funkční stránka
  - Poznámka: vytvořeno v rámci úvodního setupu

- [x] **0.3 Konfigurace Cursor AI**
  - Pravidla v .cursor/rules/ (jazyk, stack, workflow dotazů)
  - Poznámka: viz .cursor/rules/

- [x] **0.4 Dokumentace plánu a workflow**
  - PLAN.md, CHECKLIST.md, OPEN_QUESTIONS.md
  - Poznámka: vytvořeno

---

## Fáze 1: Specifikace a návrh

- [x] **1.1 Popis účelu aplikace**
  - Doplnit v AKTUALNI_STAV.md sekci „Co aplikace je“ (1–2 věty)
  - Poznámka: Zapsána kompletní základní představa (MŠ, směny, konfigurace, výstup).

- [ ] **1.2 Vyřešení otevřených dotazů**
  - Zapsat nejasnosti do OPEN_QUESTIONS.md, zodpovědět postupně jeden po druhém, zapracovat do specifikace
  - Poznámka: _

- [ ] **1.3 Definice feature setu**
  - Doplnit v AKTUALNI_STAV.md sekci „Co plánujeme“ – seznam funkcí a chování aplikace (po vyřešení dotazů)
  - Poznámka: _

---

## Fáze 2: Implementace jádra

Úkoly jsou rozepsány v **IMPLEMENTACE_UKOLY.md** (bloky A–E). Plníme je v pořadí; každý dokončený úkol zaškrtneme tam a aktualizujeme AKTUALNI_STAV.md.

- [ ] **2.1 Blok A** – Datový model, Local Storage, export/import JSON, kostra stránky a navigace (úkoly A1–A3)
- [ ] **2.2 Blok B** – Konfigurace: zaměstnanci, budovy a třídy, otevírací doba, min/max v čase (B1–B4)
- [ ] **2.3 Blok C** – Pravidla: překryv, kmenové/vykrývací, speciální sloty a rotace (C1–C4)
- [ ] **2.4 Blok D** – Výpočet návrhu směn a zobrazení výsledku (D1–D4)
- [ ] **2.5 Blok E** – Export/import UI, validace, doladění UX, zobrazovaný název aplikace, vylepšení vzhledu (E1–E5)

---

## Fáze 3: Testování a úpravy

- [ ] **3.1** Ověření funkčnosti a opravy
- [ ] **3.2** Doladění UX/dokumentace

---

## Fáze 4: Publikace

- [ ] **4.1** Výběr hostingu
- [ ] **4.2** Nasazení a ověření

---

## Poznámky k průběhu

_Sem lze průběžně doplňovat krátké poznámky k rozhodnutím nebo změnám plánu._
