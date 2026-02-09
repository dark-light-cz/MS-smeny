# Specifikace algoritmu „Párové třídy“ (alternativní výpočet směn)

Dokument popisuje druhou výpočetní logiku – **párové pokrytí tříd se střídáním ranní/odpolední** – jako alternativu k současnému 4fázovému algoritmu. Slouží k domyšlení detailů a k implementaci.

---

## 1. Cíl a vstupní představa

**Cíl:** Na každé třídě v základní pracovní době (7:45–16:00) mít pokrytí **dvojicí** učitelek tak, aby:
- ideálně šlo o **dvojici kmenových** přiřazených k té třídě,
- byla zajištěna **rotace**: jedna vždy začíná v 7:45, druhá končí v 16:00, další den se role prohodí (každá má v týdnu jednu „ranní“ a jednu „odpolední“ směnu třídy),
- případný nedostatek úvazků se doplní kombinací učitelky s nejvyšším neplným úvazkem + 1–2 s nižším úvazkem tak, aby dohromady tvořily potřebný „plný“ úvazek na třídu.

Poté:
- **Ranní/večerní rozšíření:** Každý den na budově jedna učitelka začíná v 7:00, jedna končí v 17:00; přiřadit tak, aby se tyto role v týdnu mezi učitelkami tříd střídaly (každá jednou ranní, jednou odpolední).
- **Doplnění vykrývacími:** Volné časy doplnit vykrývacími úvazky – nejdřív je kategorizovat podle výše úvazku a nedostatku hodin na budovách, pak s nimi pracovat jen v rámci příslušné budovy.
- **Dočerpání úvazků:** Kontrola nedočerpaných úvazků a případné protažení dopoledních směn tak, aby každý vyčerpal svůj úvazek.

---

## 2. Definice a předpoklady

### 2.1 Základní pracovní doba (core window)
- **Výchozí:** 7:45–16:00 (495 minut/den na třídu).
- **První verze:** Jednotné **7:45–16:00 pro všechny třídy** (konstantní, bez ohledu na otevírací dobu budov/tříd). Později lze doplnit parametr z pravidel nebo z otevírací doby.

### 2.2 „Plný úvazek“ na třídu (na týden)
- Potřeba na jednu třídu na týden = 5 × 495 = **2475 minut** (pokud všechny dny Po–Pá).
- **Plný úvazek** pro účely párování: buď **2475 min**, nebo úvazek nejvyšší kmenové na té třídě, nebo globální práh (např. 2400 min). **Doporučení:** Použít **2475 min** jako „potřeba na třídu za týden“; učitelka s úvazkem ≥ 2475 považována za „plnou“ pro jednu třídu. Pro dvojici: součet úvazků dvojice ≥ 2475.

### 2.3 Střídání v páru (ranní / odpolední) – s překryvem
- **Dopolední směna:** 7:45–12:00 (255 min). **Odpolední směna:** 10:00–16:00 (360 min). **Překryv:** 10:00–12:00 (120 min = 2 h) – v tomto čase jsou obě učitelky ve třídě (splňuje minimální překryv).
- **Den 1 (např. Po):** Učitelka A = dopolední (7:45–12:00), Učitelka B = odpolední (10:00–16:00).
- **Den 2 (Út):** Prohodit role: B = dopolední (7:45–12:00), A = odpolední (10:00–16:00).
- **Cíl:** Za týden má každá z dvojice alespoň jednu směnu dopolední a jednu odpolední (střídání dnů).

**Pokrytí třídy za den:** 495 min (7:45–16:00). **Úvazek přiřazený dvojici za den:** dopolední blok 255 min + odpolední blok 360 min = 615 min (překryv 10:00–12:00 obě učitelky „platí“ ze svého úvazku). Dvojice tedy musí mít součet úvazků za týden alespoň 2475 min; při plném obsazení 5 dnů přiřadíme dvojici 5×615 = 3075 min – pokud jejich úvazky jsou menší, některé dny jedna nepracuje nebo se rozdělí jinak.

### 2.4 Nedostupnost (B1d)
- Algoritmus musí respektovat `zamestnanec.nedostupnost` (den, od, do). V daný den do nedostupného intervalu nesmí být umístěn žádný segment.

### 2.5 Omezení „ne dohromady“ a B1e
- Respektovat `omezeniNeDohromady` – dvojice nesmí být ve stejné třídě.
- Respektovat `prirazenoJen` (B1e) – zaměstnanec jen do dané budovy/třídy.

### 2.6 Přechod mezi budovami (D5)
- Zaměstnanec se zákazem přechodu pracuje v jednom dni jen v jedné budově; vykrývací přiřazovat jen na budovu, kde je „nedostatek“.

---

## 3. Fáze algoritmu (návrh kroků)

### Fáze 1: Páry na třídu (7:45–16:00)

1. **Pro každou třídu:**
   - Sebrat kmenové přiřazené k této třídě (`kmenovaVykryvaci === 'kmenová' && tridaId === t.id`).
   - Seřadit je podle úvazku (sestupně).
   - **Ideál:** Dvě kmenové s úvazkem celkem ≥ 2475. Vybrat první dvě (nebo jednu „plnou“ a jednu doplnění).
   - **Pokud jedna kmenová:** Doplň druhou osobou: buď další kmenová z jiné třídy (jen pokud to pravidla dovolí), nebo vykrývací / jiná s nejvyšším úvazkem, která smí do této třídy/budovy. Součet úvazků dvojice ≥ 2475.
   - **Pokud žádná kmenová nebo stále nedostatek:** Sestav dvojici (příp. trojici) z učitelek s nejvyššími úvazky, které smí do třídy (B1e, nedostupnost, ne-dohromady), aby součet ≥ 2475.

2. **Rozvržení minut v týdnu pro dvojici:**
   - Každý den: **dopolední** 7:45–12:00 = 255 min, **odpolední** 10:00–16:00 = 360 min; překryv 10:00–12:00 (třída má 495 min pokrytí).
   - Rozdělit 5 × 495 = 2475 minut potřeby na třídu mezi dvě učitelky podle jejich úvazků. Každá učitelka v daný den dostane buď blok 255 min (dopolední), nebo 360 min (odpolední). Respektovat nedostupnost (v daný den některá nemůže → role přiřadit druhé nebo jiný den).
   - **Střídání:** Pro každý den rozhodnout, kdo má dopolední (7:45–12:00) a kdo odpolední (10:00–16:00). Pravidlo: střídat tak, aby každá měla za týden alespoň 1× dopolední a 1× odpolední. Např. Po: A=dopolední, B=odpolední; Út: B=dopolední, A=odpolední; atd.

3. **Výstup fáze 1:** Pro každý den a každou třídu přiřazení segmentů **7:45–12:00** (dopolední) a **10:00–16:00** (odpolední) konkrétním učitelkám (formát jako stávající `prirazeni`: den, zamestnanecId, segmenty s od, do, tridaId, budovaId).

### Fáze 2: Ranní a večerní rozšíření (7:00 a 17:00)

1. **Zbývající úvazek** po fázi 1: pro každou učitelku spočítat, kolik minut ještě nevyčerpala.

2. **Na každou budovu a každý den:**
   - Vybrat **jednu** učitelku, která ten den v budově už pracuje (z fáze 1), a přidat jí segment **7:00–7:45** (ranní rozšíření).
   - Vybrat **jinou** učitelku z téže budovy a přidat jí segment **16:00–17:00** (večerní rozšíření).
   - Pravidlo střídání: přes týden se role „ranní 7:00“ a „odpolední 17:00“ střídají mezi učitelkami budovy tak, aby každá měla v týdnu jednou ranní a jednou odpolední (pokud to úvazky dovolí).

3. Při výběru kandidátů respektovat nedostupnost a zbývající úvazek (nepřidat víc než kolik zbývá).

### Fáze 3a: Doplnění chybějících směn zbývajícími učitelkami

1. **Chybějící směny:** Po fázi 1 a 2 se pro každou třídu a každý den zjistí, zda je pokryto dopolední (7:45–12:00) a odpolední (10:00–16:00). Kde chybí pokrytí, vzniká „mezera“ (gap).

2. **Zbývající učitelky:** Jsou to všechny učitelky, které nebyly vloženy do žádného páru ve fázi 1 (nejsou v mapě přiřazených k třídě). Mohou být vykrývací i kmenové bez páru.

3. **Vykrytí mezer:** Mezery se řadí prioritně od konce týdne (pátek, čtvrtek, …). Pro každou mezeru se vybere vhodná zbývající učitelka (dostupnost, B1e, zbývající úvazek, omezení „ne dohromady“). **Preferuje se**, aby jedna doplňující učitelka byla přiřazena do **jedné třídy** – tedy při výběru kandidáta se upřednostní ten, kdo už v dané třídě nějakou mezeru vykrývá.

4. **Minimální délka směny:** Z konfigurace se načte `pravidla.minDelkaBlokuMinuty` (např. 120 = 2 h). Mezery kratší než toto pravidlo se nevyplňují (nebo se vyplňují jen segmenty splňující minimální délku). Výchozí hodnota při nevyplněném pravidle: 120 minut.

### Fáze 3: Doplnění vykrývacími úvazky (ranní/večerní)

1. **Kategorizace vykrývacích:** Podle výše úvazku a podle „nedostatku hodin“ na budovách. Nedostatek = součet potřeb (např. 7:00–7:45 a 16:00–17:00 na budovu) minus už přiřazené minuty.

2. **Pro každou budovu:** Seznam vykrývacích, kteří smí na tuto budovu (B1e, přechod mezi budovami). Přiřadit je **jen na tuto budovu** (třídy v ní) – doplnit volné intervaly (např. zbývající ranní/večerní sloty, nebo mezery v pokrytí tříd).

3. Detaily „volných časů“ závisí na tom, jak přesně po fázi 1 a 2 zůstávají nezaplněné sloty; první verze může doplňovat jen 7:00–7:45 a 16:00–17:00 tam, kde ještě není přiřazeno a vykrývací má zbývající úvazek.

### Fáze 4: Dočerpání úvazků (protažení směn)

1. Spočítat pro každou učitelku součet přiřazených minut za týden.
2. Pokud < uvazekMinutyTyden: **protažení** – u dopoledních segmentů (7:45–12:00 nebo 7:00–12:00) prodloužit konec, nebo u odpoledních (12:00–16:00 nebo 12:00–17:00) prodloužit začátek, tak aby součet = uvazekMinutyTyden. Respektovat otevírací dobu třídy a nedostupnost.

3. Pokud > uvazekMinutyTyden: **zkrácení** (přečerpání) – v první verzi vrátit varování; případně automaticky zkrátit poslední segmenty.

---

## 4. Výstup a kompatibilita

- **Formát výstupu:** Stejný jako stávající algoritmus: `{ ok: true, prirazeni: [ { den, zamestnanecId, segmenty: [ { od, do, budovaId, tridaId } ] } ], varovani?: [] }`.
- Validace (D10, D10b) a zobrazení (tabulka, graf, export CSV) zůstávají beze změny.

---

## 5. Oponentura a rizika

### 5.1 Silné stránky návrhu
- Logika je **srozumitelná** a odpovídá běžné praxi MŠ (dvojice na třídu, střídání ranní/odpolední).
- **Deterministické** přiřazení párů (kmenové první, pak doplnění) usnadňuje ladění a testy.
- Oddělené fáze (páry → ranní/večer → vykrývací → dočerpání) umožňují implementovat a testovat po částech.

### 5.2 Nejistoty a doporučení

1. **Různé otevírací doby tříd**  
   **Rozhodnuto pro 1. verzi:** Jednotné 7:45–16:00 pro všechny třídy. Později lze brát rozsah z otevírací doby třídy nebo budovy.

2. **Více než dvě učitelky na třídu**  
   Pokud úvazky nedávají přesně dvojice (např. tři částečné), musí algoritmus umět přiřadit třetí (čtvrtou) osobu a stále střídat ranní/odpolední. **Doporučení:** Fáze 1 rozšířit o „skupinu“ na třídu (2–3 osoby), rozdělit 2475 min mezi ně a střídání rolí definovat pro všechny.

3. **Konflikt s minMaxSloty**  
   Stávající aplikace má Pravidla → časové sloty (min/max na budovu/třídu). Tento algoritmus sloty přímo neřeší; výsledek může v některém slotu porušit min/max. **Doporučení:** Po výpočtu spustit stávající validaci (D10b); při nesplnění vrátit varování nebo „doplnění“ fáze, která sloty kontroluje a mírně upraví přiřazení (nebo to nechat na uživateli).

4. **Minimální překryv (D3)**  
   **Rozvržení s překryvem:** Dopolední 7:45–12:00, odpolední 10:00–16:00 → překryv 10:00–12:00 (2 h). Tím je pravidlo minimálního překryvu v základní době splněno bez další úpravy.

5. **Ředitelka / zástupkyně**  
   Obvykle nejsou „na třídě“ celý den. **Doporučení:** Buď je z výpočtu vynechat (nebo přiřazovat jen do ranních/večerních rozšíření), nebo mít příznak „nepřiřazovat do páru na třídu“.

### 5.3 Zjednodušení pro první implementaci

- **Fáze 1:** Jedna budova, více tříd; pouze kmenové s plným nebo částečným úvazkem; dvojice vždy přesně dvě osoby; **dopolední 7:45–12:00, odpolední 10:00–16:00** (překryv 10:00–12:00) se střídáním dnů. Jednotné 7:45–16:00 pro všechny třídy.
- **Fáze 2:** Jedna „ranní“ a jedna „odpolední“ na budovu na den; střídání mezi učitelkami, které už na budově pracují.
- **Fáze 3:** Jednoduché doplnění: vykrývací přiřazovat jen do 7:00–7:45 a 16:00–17:00 na budovu, kde je volno a kde vykrývací smí (B1e, přechod).
- **Fáze 4:** Pouze protažení (ne zkrácení); při přečerpání vrátit varování.

---

## 6. Návazné kroky

1. **Potvrzeno:** Plný úvazek na třídu 2475 min/týden. **Půlení s překryvem:** dopolední 7:45–12:00, odpolední 10:00–16:00 (překryv 2 h). Jednotné 7:45–16:00 pro všechny třídy v 1. verzi.
2. **Přidat úkol** do IMPLEMENTACE_UKOLY.md (nový algoritmus „Párové třídy“).
3. **Implementovat** v `js/algoritmy/parove-tridy.js` po fázích; registrovat v `registr.js`.
4. **Testy:** Minimálně: 1 budova, 1 třída, 2 kmenové s plným úvazkem → přiřazení 7:45–12:00 a 12:00–16:00 se střídáním; 1 budova, 2 třídy, 4 kmenové → dvě dvojice; doplnění ranní 7:00 a večer 17:00; respekt nedostupnosti.

Pokud něco z úvahy chápu jinak (zejména střídání v páru nebo rozsah „plného úvazku“), napiš a specifikaci doplním.
