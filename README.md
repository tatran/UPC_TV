# UPC TV pre Samsung Smart TV (Tizen OS)

Profesionálna televízna aplikácia určená pre **Samsung Smart TV** so systémom **Tizen OS** (modely 2016 – 2025+), ktorá umožňuje priame sledovanie živého televízneho vysielania **UPC TV** s kompletným TV programom (EPG) a ovládaním cez diaľkový ovládač Samsung Smart Remote.

---

## 🌟 Hlavné funkcie

* **220+ televíznych staníc** v HD kvalite priamo z oficiálnych serverov UPC (Spark platforma).
* **10-Foot Living Room UI**: Moderné rozhranie pre TV (1920×1080 / 4K UHD) v tmavej OLED estetike.
* **Plná podpora diaľkového ovládača Samsung TV**:
  * Štvorsmerový D-pad (Hore / Dole / Doľava / Doprava) a tlačidlo **OK / Enter**.
  * Tlačidlo **BACK / RETURN** pre návrat do ponuky.
  * Tlačidlá **CH ▲ / CH ▼** pre okamžité prepínanie kanálov.
  * **Číselná klávesnica (0–9)**: Priame prepnutie na číslo kanálu (napr. stlačením `2` pre Jednotku HD, `4` pre Markízu HD).
  * **Farebné tlačidlá**:
    * 🔴 **Červené**: Rýchly skok na kategórie (Všetky, Filmy, Šport, Správy, Detské, Dokumenty, Hudba).
    * 🟢 **Zelené**: Zobrazenie TV Programu (EPG časová os).
    * 🟡 **Žlté**: Obľúbené stanice (pridanie / odobratie aktuálnej stanice do obľúbených).
    * 🔵 **Modré**: Nastavenia účtu a diagnostika pripojenia.
* **Živý TV Program (EPG)**: Zobrazuje aktuálne a nasledujúce relácie s časom a ukazovateľom uplynutého času.
* **Prehrávací engine**: Podpora Google Shaka Player (DASH CENC s Widevine / PlayReady) aj natívneho hardvérového dekodéra Samsung Tizen AVPlay (`webapis.avplay`).
* **Automatická obnova relácie**: Udržiavanie streamovacieho tokenu na pozadí pre neprerušované sledovanie.

---

## 📦 Pripravené inštalačné súbory

V koreňovom adresári projektu sú pre Vás vygenerované:
1. **`UPC_TV.wgt`**: Oficiálny Tizen Web Application balíček pre inštaláciu do TV.
2. **`userwidget.zip`** a priečinok **`userwidget/UPC_TV.wgt`**: Pripravený balíček pre USB kľúč.

---

## 🚀 Spôsoby inštalácie na Samsung Smart TV

### Metóda 1: Inštalácia cez USB kľúč (Najjednoduchšia)

1. **Pripravte USB kľúč**:
   * Naformátujte USB kľúč na systém súborov **FAT32**.
   * Rozbaľte súbor `userwidget.zip` na USB kľúč (v koreňovom adresári USB kľúča bude priečinok `userwidget/` obsahujúci `UPC_TV.wgt`).
2. **Zapnite Developer Mode na Vašom Samsung televízore**:
   * Na televízore prejdite do ponuky **Apps** (Aplikácie).
   * Na diaľkovom ovládači stlačte postupne čísla: **`1` `2` `3` `4` `5`**.
   * Zobrazí sa okno *Developer Mode*. Prepnite ho na **ON**.
   * Do poľa **Host PC IP** zadajte IP adresu Vášho počítača (zistíte ju v aplikácii alebo spustením `ipconfig`, napr. `192.168.1.50`) a stlačte **OK**.
   * Reštartujte TV podržaním tlačidla **Power** na ovládači po dobu 3 sekúnd (kým sa TV znova nespustí).
3. **Inštalácia**:
   * Zasuňte USB kľúč do USB portu televízora.
   * Televízor automaticky rozpozná aplikáciu a nainštaluje **UPC TV** do lišty aplikácií Smart Hub.

---

### Metóda 2: Inštalácia cez sieť (SDB / Tizen CLI)

Ak máte nainštalovaný nástroj **SDB** (Samsung Device Bridge) z Tizen Studia:
1. Skontrolujte IP adresu televízora v TV menu: *Nastavenia -> Všeobecné -> Sieť -> Stav siete*.
2. V termináli spustite:
   ```bash
   sdb connect <IP_TELEVIZORA>:26101
   sdb install UPC_TV.wgt
   ```
3. Aplikácia sa okamžite nainštaluje a objaví na obrazovke TV.

---

### Metóda 3: Spustenie priamo vo Webovom prehliadači Samsung TV (Bez inštalácie)

1. Na počítači spustite server:
   ```bash
   npm start
   ```
2. Na televízore Samsung otvorte vstavanú aplikáciu **Internet (Webový prehliadač)**.
3. Zadajte sieťovú adresu počítača, napr.:
   ```text
   http://<IP_VASHOPOCITACA>:3000
   ```
4. Prepnite prehliadač na celú obrazovku (**Full Screen**).
5. Aplikácia bude plne funkčná vrátane ovládania TV ovládačom.

---

## 💻 Spustenie a vývoj

```bash
# Inštalácia závislostí
npm install

# Zostavenie nového .wgt balíčka
npm run build:wgt

# Spustenie lokálneho servera a sprievodcu
npm start
```

Webový sprievodca inštaláciou a sťahovanie balíčkov:
* `http://localhost:3000/setup`
