# UPC TV – Prehľad verzií (Changelog)

Všetky podstatné zmeny v projekte UPC TV pre Samsung Smart TV (Tizen OS) sú zaznamenávané v tomto dokumente.

## [1.5.5] - 2026-11-05

### 🚪 Potvrdzovacie dialógové okno pri ukončení aplikácie (Exit Confirmation Modal)
- **Bezpečný odchod na domovskú obrazovku televízora**:
  - Pridané potvrdzovacie dialógové okno `#exitModal` pri stlačení tlačidla `Späť` (Return / Back) na hlavnej obrazovke aplikácie.
  - Zabraňuje náhodnému nechcenému ukončeniu aplikácie a okamžitému pádu na domovskú obrazovku Samsung Tizen TV.
  - Možnosti voľby: **Zrušiť** (návrat a obnovenie pôvodného focusu) alebo **Ukončiť aplikáciu** (`tizen.application.getCurrentApplication().exit()`).
  - Podpora pre diaľkový ovládač s automatickým zachytením navigácie (šípky doľava/doprava, potvrdenie klávesom Enter/OK, zrušenie opätovným stlačením Back).
- **Aktualizácia verzie na 1.5.5**:
  - Verzia zvýšená na `1.5.5` v `config.xml`, `index.html`, `js/app.js`, `js/telemetry.js` a `install-to-tv.bat`.
  - Vygenerovaný nový balík `UPC_TV.wgt` a USB widget `userwidget.zip`.

---

## [1.5.4] - 2026-11-05

### 📊 Integrácia telemetrie Neon Postgres a odstránenie záložky Filmy (Movies)
- **Kompletná telemetria štartovacích akcií do tabuľky `upc_tv_telemetry`**:
  - Implementovaný modul `js/telemetry.js` s priamym zabezpečeným zápisom do databázy Neon Postgres cez Serverless SQL HTTP API (`ep-broad-mode-ba2zewd1-pooler.c-8.eu-central-1.aws.neon.tech`).
  - Zaznamenávanie každej štartovacej akcie s kompletnými metadátami (`device_id`, `app_version`, `user_agent`, `ip`, `event_type`, `payload`, `created_at`):
    - Štart aplikácie (`start_app` a `start`) s rozlíšením obrazovky a verziou systému.
    - Štart živého TV vysielania (`start_channel` a `start`) s ID stanice, názvom a LCN.
    - Štart TV Archívu (`start_replay` a `start`) s ID relácie, názvom programu a offsetom preskočenia.
    - Štart živej webkamery (`start_webcam` a `start`) s ID kamery, názvom a kategóriou.
    - Štart rádia (`start_radio` a `start`) s ID stanice, názvom a žánrom.
  - Automatická detekcia a zapamätanie DUID televízora (`webapis.productinfo.getDuid()`) a verejnej IP adresy (`api.ipify.org`).
- **Odstránenie nefunkčnej záložky Filmy (Movies)**:
  - Odstránená karta Movies z hlavnej navigačnej lišty a sekcia `moviesView`.
  - Vyčistený aplikačný kód od obsluhy prehrávania experimentálnych VOD filmov.
- **Aktualizácia verzie na 1.5.4**:
  - Verzia zvýšená na `1.5.4` v `config.xml`, `index.html`, `js/telemetry.js`, `install-to-tv.bat`.
  - Vygenerovaný nový podpísaný balíček `UPC_TV.wgt` a USB balík `userwidget.zip`.

---

## [1.5.3] - 2026-11-03

### 🚀 Odstránenie čiernej obrazovky – FastStart MP4 (H.264 + AAC Stereo) a bezpečný AVPlay/HTML5 failover
- **Vytvorenie optimalizovaného FastStart MP4 streamu**:
  - Remuxovaný film do progresívneho MP4 (`movie.mp4`, 9.38 GB) s presunom indexového `moov` atómu na začiatok súboru (`+faststart`).
  - Zvuková stopa prevedená z formátu E-AC-3 do univerzálneho stereo AAC (192 kbps), ktorý je na 100% hardvérovo podporovaný každým prehliadačom a televízorom Samsung (Tizen 3.0 – 8.0) bez nutnosti transmuxovania cez `mux.js`.
- **Eliminácia čiernej obrazovky v AVPlay (`player.js`)**:
  - `self.enableAvplayUi(true)` sa už neaktivuje predčasne v `IDLE` stave, ale až po potvrdení úspešnej prípravy streamu (`prepareAsync`). Tým sa zabránilo situácii, kedy sa HTML vrstva spriehľadnila do čierneho pozadia pred spustením videa.
  - Pridaný 3.5-sekundový poistný časovač (timeout) na `prepareAsync` – ak hardvérový AVPlay neodpovie do 3.5s, prehrávač okamžite a hladko prepne na HTML5 `<video>` element.
  - Opravené poradie `webapis.avplay.seekTo()` – volá sa výlučne po `play()`, čím sa predchádza výnimke `INVALID_OPERATION` v stave `READY`.
- **Aktívny HTTP Range streaming na porte 3001**:
  - Lokálny mostík servuje `movie.mp4` cez HTTP s plnou podporou `206 Partial Content` a `Accept-Ranges: bytes`, čo zabezpečuje bleskové okamžité pretáčanie na TV.
- **Nová verzia aplikácie v1.5.3**:
  - Zvýšená verzia v `config.xml`, `index.html` a `install-to-tv.bat`.

### 🛡️ Definitívne prepojenie na HLS mostík a dvojitý AVPlay + Shaka fallback
- **Priame nasmerovanie `streamUrl` na lokálny HLS mostík**:
  - V `movies-data.js` bola definitívne prepísaná primárna hodnota `streamUrl` na `http://192.168.100.2:3001/hls/movie.m3u8` (odstránené akékoľvek riziko volania vypršaného Webshare linku aj pri fallbackoch).
- **Zdokonalený AVPlay -> Shaka Player HLS fallback**:
  - Ak na staršom televízore hardvérový AVPlay hlási akýkoľvek problém (`onerror`, výnimka pri `prepareAsync`), prehrávač nepadá do natívneho HTML5 tagu (ktorý na Tizen Chromium 69 nepozná HLS), ale okamžite odovzdáva stream osvedčenému `shakaPlayer` HLS enginu.
- **Nový balíček pre Samsung TV**:
  - Zvýšená verzia na `v1.5.2` v `config.xml`, `index.html` aj inštalačnom skripte `install-to-tv.bat`.
  - Vygenerovaný nový USB archív `userwidget.zip` a podpísaný balíček `UPC_TV.wgt`.

---

## [1.5.1] - 2026-11-03

### 🎬 Podpora MKV formátu, 9.8 GB edície filmu a optimalizácia VOD HLS
- **Podpora pre MKV kontajner a plnohodnotné lokálne vydanie**:
  - Mostík `UPC_TV_Bridge` teraz automaticky deteguje lokálny súbor `movie.mkv` (vrátane priameho rozpoznania stiahnutého vydania `Rivalové z Oklahomy 2025 CZ TITULKY NOVINKA.mkv` v zložke Downloads) bez závislosti na vypršaných CDN odkazoch.
  - Ošetrené presné mapovanie audio/video stôp (`-map 0:v:0 -map 0:a:0 -c:v copy -c:a copy`), ktoré zabraňuje chybám muxovania SRT titulkov do MPEG-TS kontajnera a zachováva plný 5.1 priestorový zvuk Dolby Digital Plus (EAC3).
- **VOD HLS playlist s podporou pretáčania celej stopáže**:
  - Prepnutie generovaného playlistu na formát `#EXT-X-PLAYLIST-TYPE:VOD` s pevnou dĺžkou segmentov (4s) a zakončením `#EXT-X-ENDLIST`.
  - Umožňuje hardvérovému enginu AVPlay na televízore okamžite skákať na ľubovoľnú sekundu z celých 2 hodín a 10 minút filmu (1 962 segmentov) bez bufferovania.
- **Detekcia hotového exportu v mostíku**:
  - Mostík pri štarte automaticky overí, či už súbor `movie.m3u8` obsahuje kompletný zoznam segmentov; ak áno, stream okamžite servuje bez opakovanej konverzie.
- **Aktualizácia verzie aplikácie**:
  - Zvýšená verzia na `v1.5.1` v `config.xml`, `index.html` a inštalačnom skripte `install-to-tv.bat`.

---

## [1.5.0] - 2026-11-03

### 🚀 Windows HLS Movie Bridge pre lokálne streamovanie filmov do TV
- **Architektúra lokálneho HLS Bridge servera (`UPC_TV_Bridge`)**:
  - Vytvorený dedikovaný Node.js Express server na porte 3001, ktorý rieši limity prehrávača Tizen 5.5 Chromium 69 pri načítavaní veľkých (5+ GB) MP4/MKV súborov cez sieť.
  - Bleskové rozsekávanie video súboru na MPEG-TS segmenty pomocou FFmpeg v režime Stream Copy (0% záťaž procesora, rýchlosť 200x–350x).
  - CORS-enabled endpointy pre HLS playlist (`/hls/movie.m3u8`), video segmenty (`/hls/segment_XXXX.ts`) a české titulky (`/hls/subtitles.vtt`).
- **Integrácia s prehrávačom aplikácie (`player.js`)**:
  - Prioritné nasmerovanie prehrávania filmov na lokálnu HLS adresu (`movie.hlsStreamUrl`) cez hardvérový engine `webapis.avplay`.
  - Záložný mechanizmus pre Shaka Player a HTML5 video pri testovaní na PC v prehliadači.
- **Oprava zostavovacieho skriptu balíčkov (`build-wgt.js`)**:
  - Pridaná automatická záloha na PowerShell `Compress-Archive` pri absencii npm balíčka `archiver`, vďaka čomu skript `install-to-tv.bat` nezlyhá na chýbajúcom module.

---

## [1.4.9] - 2026-11-03

### 🔧 Oprava prehrávania filmov a potlačenie falošnej hlášky rádia
- **Oprava falošnej hlášky „Chyba streamu rádia: Rádio“**:
  - Pri spustení filmu sa volala funkcia `stopRadio()`, ktorá resetovala `src` elementu rádia, čo vyvolávalo falošný chybový event prehrávača rádií.
  - Event listener pre rádio teraz striktne ignoruje chyby pri zastavení alebo uvoľnení audio streamu.
- **Robustný AVPlay engine pre MP4 filmy (HTTPS + HTTP fallback)**:
  - Odstránené volanie `setDisplayRect()` v neplatnom stave `IDLE`, ktoré spôsobovalo pád inicializácie na Tizen TV.
  - Nastavenie rozmerov obrazovky a zobrazenia (`LETTER_BOX`) sa teraz vykonáva v korektnom stave `READY` vnútri `prepareAsync` callbacku.
  - Implementovaný automatický fallback: ak AVPlay zlyhá pri HTTPS overení SSL certifikátu na starších televízoroch, automaticky skúsi priamy HTTP stream (`http://prg-c3-storage6...`) a následne HTML5 video element.
- **Priame streamovacie URL bez 302 presmerovania**:
  - Nastavená priama CDN adresa pre film aj titulky na `prg-c3-storage6.premiumcdn.net`.

---

## [1.4.8] - 2026-11-03

### 🎬 Nová záložka „Movies 🎬“ s prehrávaním filmov a českými VTT titulkami
- **Nová sekcia „Movies 🎬“ v hlavnej navigácii**:
  - Pridaná nová záložka **Movies 🎬** hneď vedľa `TV Archív ↺`.
  - Prehľadné rozloženie s kartami filmov, filtrom kategórií (*Všetky filmy*, *720p HD*, *💬 CZ Titulky*) a detailným informačným panelom (plagát, hodnotenie, rok, dĺžka, réžia, obsadenie, synopsa a tlačidlá rýchleho štartu).
- **Implementácia filmu „The Rivals of Amziah King“ (720p MP4) + České titulky (WebVTT)**:
  - Integrovaný priamy 720p HD MP4 stream filmu *The Rivals of Amziah King (Rivali Amziaha Kinga)*.
  - Synchronizovaný parser a vykresľovač českých WebVTT titulkov (2 161 titulkových replík) s vlastným TV overlayom (`#movieSubtitleOverlay`), ktorý funguje nezávisle od CORS obmedzení a automaticky sa posúva nad OSD lištu, keď je zobrazená.
  - Plná podpora zapínania/vypínania titulkov cez tlačidlo `💬 Titulky` v OSD prehrávači aj cez tlačidlo `SUBTITLE` / `CAPTION` na diaľkovom ovládači, ako aj pretáčania (`◄`/`►` ±30s, `CH ▲`/`CH ▼` ±2 minúty) a pamätania poslednej pozície rozpozeraného filmu.

---

## [1.4.7] - 2026-10-26

### 🌙 Funkcia „Picture Off + sound“ (Vypnutie obrazu pri počúvaní rádia)
- **Automatické vypnutie obrazu po 1 minúte nečinnosti**:
  - Keď hrá rádio, po 60 sekundách bez stlačenia tlačidla na diaľkovom ovládači sa automaticky vypne obraz (aktivuje sa celoobrazovkový čierny režim pre úsporu energie a ochranu OLED panelu).
  - Stream rádia pokračuje v plnej kvalite na pozadí bez prerušenia.
- **Ignorovanie tlačidiel hlasitosti (Volume Up / Down / Mute)**:
  - Stláčanie hlasitosti (Volume +, Volume -, Mute) obrazovku nezobudí – hlasitosť sa reguluje v tme pri vypnutom obraze.
- **Okamžité prebudenie ľubovoľným iným tlačidlom**:
  - Stlačenie akéhokoľvek iného tlačidla na ovládači (napr. OK / Enter, Späť / Return, Šípky, Číselník, Farebné klávesy) okamžite prebudí obrazovku (Picture On).
- **Tlačidlo „🌙 Picture Off + sound“ v lište rádia**:
  - V spodnej lište prehrávača rádií pribudlo tlačidlo pre okamžité manuálne vypnutie obrazovky bez nutnosti čakať 1 minútu.

---

## [1.4.6] - 2026-10-26

### 🕒 Inteligentné ukladanie histórie vyhľadávania (iba finálny výraz)
- **Konsolidácia a čistenie medzistupňov písania**:
  - Pri písaní výrazu na TV ovládači (napr. *zah* ➔ *zaha* ➔ *zahad* ➔ *zahady*) sa v histórii posledných hľadaní ukladá výhradne **finálny výraz** (*zahady*).
  - Všetky neúplné prefixové medzistupne sú automaticky kolapsované a odstránené nielen pri novom hľadaní, ale aj zo staršej uloženej histórie.
  - Implementovaný 1,5s debounce pri písaní v kombinácii s okamžitým uložením pri potvrdení (Enter), opustení poľa (blur), prepnutí rozsahu alebo výbere relácie.

---

## [1.4.5] - 2026-10-26

### 🔍 Filtrovanie výsledkov vyhľadávania v TV Archíve (iba spustiteľné relácie)
- **Vylúčenie relácií s označením „Naplánované“ z výsledkov hľadania**:
  - Pri vyhľadávaní v archíve sa vo výsledkoch už nezobrazujú relácie, ktoré sú len naplánované do budúcna (`ev.startTime > now`), pretože sa ešte neodvysielali a nedajú sa prehrať.
  - Vo výsledkoch vyhľadávania (pre všetky rozsahy: *Táto stanica*, *Celý deň*, *7-dňový archív*) sa zobrazujú výhradne spustiteľné relácie:
    - Odvysielané relácie v archíve (`ev.endTime <= now`) označené badgeom `↺ V archíve`.
    - Aktuálne bežiace relácie (`ev.startTime <= now && ev.endTime >= now`) označené badgeom `● Práve vysielané (Restart)` s možnosťou spustenia od začiatku.
  - Počítadlo nájdených relácií a náhľadový panel teraz presne odrážajú iba relácie pripravené na prehratie.

---

## [1.4.4] - 2026-10-26

### 🔍 Presunutie vyhľadávania v TV Archíve a odstránenie rýchleho filtra
- **Nahradenie riadku filtra priamym vyhľadávaním**:
  - Odstránený riadok „Rýchly filter“ s tagmi kategórií (*Správy, Film, Seriál, Šport, Pre deti, Dokument, Krimi*).
  - Vyhľadávací panel v archíve (`archive-search-toolbar`) bol presunutý zo zúženého baneru stanice priamo na uvoľnené miesto na samostatný prehľadný riadok.
  - Baner stanice (`archive-channel-banner`) teraz zobrazuje čisté informácie o vybranej stanici a dni.
  - Vyhľadávacie pole má optimalizovanú šírku a priamo vedľa neho sú dostupné prepínače rozsahu (*Táto stanica*, *Celý deň*, *7-dňový archív*).
- **Povýšenie verzie na 1.4.4**:
  - Verzie zjednotené v `config.xml`, `index.html`, `js/api.js` a inštalačných balíčkoch.

---

## [1.4.3] - 2026-10-20

### 📻 Nová sekcia Rádiá (Slovenské a České rádiá podľa hranosti)
- **Tlačidlo „Rádiá 📻“ v hlavnej navigačnej lište**:
  - Pridané nové tlačidlo `tabRadios` umiestnené presne medzi `Webkamery 📷` a `Obľúbené`.
- **Prehľadný mriežkový grid staníc zoradených podľa počúvanosti**:
  - Integrovaná databáza 47 najpočúvanejších staníc na Slovensku a v Česku podľa oficiálnych prieskumov počúvanosti (Radioprojekt SK / Radioprojekt CZ).
  - Východiskové zoraďovanie podľa hranosti (1. Rádio Expres, 2. Rádio Slovensko, 3. Rádio Vlna, 4. Fun Rádio, 5. Europa 2, ČRo Radiožurnál, Rádio Impuls, Frekvence 1, Rádio Blaník, Rádio Beat, Rádio Kiss, atď.).
  - Filtrovanie podľa kategórií: *Všetky rádiá*, *🇸🇰 Slovenské*, *🇨🇿 České*, *Pop & Hity*, *Rock*, *Spravodajstvo & Talk*, *Oldies & Retro*, *Chillout & Jazz*.
- **Prehrávanie najkvalitnejšieho streamu (HD Audio 128k - 256k)**:
  - Po kliknutí na zvolené rádio sa okamžite spustí najkvalitnejší dostupný stream cez natívny audio engine s automatickou záložnou URL (backupUrl) v prípade výpadku.
  - Na karte stanice sa aktivuje animovaný ekvalizér zvuku (soundwave) a indikátor „🟢 Práve hrá“.
  - V spodnej časti sekcie sa zobrazuje moderný plávajúci prehrávač (Radio Player Bar) s logom stanice, názvom, odznakom poradia, bitrateom a ovládaním (Pozastaviť / Pokračovať / Zastaviť).
  - Pri spustení TV kanála alebo webkamery sa rádio automaticky korektne zastaví bez prelínania zvukov.
  - Podpora automatického spustenia naposledy počúvaného rádia pri štarte aplikácie (`localStorage`).

---

## [1.4.2] - 2026-10-20

### 🔍 Predvolené vyhľadávanie v 7-dňovom TV archíve
- **Optimalizácia rozsahu vyhľadávania**:
  - Predvolený rozsah hľadania v TV Archíve je nastavený na **7-dňový archív** (`week`).
  - Tlačidlo „7-dňový archív“ (`#btnScopeWeek`) je po vstupe do archívu automaticky aktívne a hľadanie bez nutnosti prepínania prehľadáva relácie za posledných 7 dní na všetkých staniciach.

### ⏩ Automatické preskočenie úvodných 60 sekúnd v TV archíve
- **Eliminácia zbytočného čakania na začiatok relácie**:
  - Pri výbere akejkoľvek relácie v TV archíve (zo zoznamu relácií, z výsledkov vyhľadávania alebo tlačidlom „Prehrať z archívu“) sa prehrávanie automaticky spustí s posunom **+60 sekúnd** (+1:00).
  - Tým sa preskočia zvučky stanice, reklamy a časové nepresnosti začiatkov vysielania.
  - Na obrazovke sa zobrazí informatívna správa: `⏩ Spúšťam archív s preskočením 60s úvodu (+1:00)`.
  - Reštartovanie aktuálne bežiacej relácie z live vysielania (Restart) zostáva nastavené od presného začiatku (0 s).

### 🚀 Automatické spustenie naposledy sledovaného programu pri štarte aplikácie
- **Okamžité prehrávanie pri spustení**:
  - Aplikácia si do úložiska `localStorage` ukladá naposledy sledovanú TV stanicu, reláciu z archívu alebo webkameru.
  - Pri štarte aplikácie a načítaní zoznamu staníc sa okamžite automaticky spustí naposledy sledovaný program (pri prvom spustení sa spustí 1. stanica v zozname), takže používateľ nemusí manuálne vyberať kanál.

### 📦 Povýšenie verzie na 1.4.2
- Zjednotená verzia 1.4.2 v `config.xml`, `index.html`, `js/api.js`, inštalátore `install-to-tv.bat` a balíčkoch `UPC_TV.wgt` a `userwidget.zip`.

---

## [1.4.1] - 2026-10-20

### 🛡️ Oprava prekrývania prehrávanej webkamery mriežkou kamier
- **Skrytie hlavného používateľského rozhrania počas aktívneho prehrávača**:
  - Vyriešený problém, kedy pri spustení webkamery zostávala mriežka so zoznamom kamier (`#webcamsView`) viditeľná a prekrývala video.
  - Keďže hardvérové prehrávanie Samsung AVPlay vyžaduje priehľadné pozadie webovej aplikácie (`.avplay-active`), položky zoznamu kamier, záhlavie aplikácie a navigačné lišty presvitali cez priehľadné vrstvy priamo do obrazu.
  - V `js/app.js` bola pridaná globálna trieda `.player-active` riadená metódami `openPlayerView()` a `closePlayerView()`.
  - V `css/style.css` sa pri aktívnom prehrávači (`.player-active` / `.avplay-active`) striktne skryjú prvky `.header-bar`, `.categories-bar`, `.main-view`, `.remote-legend` a `#webcamsView` (`display: none !important; visibility: hidden !important;`), čím má prehrávaná webkamera celú obrazovku k dispozícii bez akýchkoľvek prekrývajúcich prvkov.
  - Pri zatvorení prehrávača (tlačidlo Späť / Escape) sa zoznam webkamier plynulo znova zobrazí a zachováva vybranú kartu.

---

## [1.4.0] - 2026-10-20

### 📻 Úplné odstránenie Rádia Expres z webkamier
- **Kompletné vyčistenie všetkých prvkov a logiky Rádia Expres**:
  - Odstránené tlačidlá z panela nástrojov (`btnWebcamRadioToggle`), z OSD lišty prehrávača (`btnOsdRadio`) a tag `<audio id="radioAudio">`.
  - Odstránené audio streamy Bauer Media, automatické zapínanie/obnovovanie pri zmene kamier, prepínanie zvuku a súvisiaci stav v aplikácii.
  - Odstránené všetky zmieňovania rádia z informačných toastov a OSD vrstvy.

### 🎥 Oprava načítania obrazu webkamier na Samsung Smart TV (Tizen 5.5)
- **Samsung AVPlay ako prioritný hardvérový engine pre webkamery**:
  - Na televízoroch Samsung Tizen (`webapis.avplay`) sa webkamery spúšťajú prioritne priamo cez natívny hardvérový dekodér AVPlay namiesto spoliehania sa na MSE transmuxer v prehliadači Chromium 69, ktorý pri video-only TS streamoch zamŕzal bez vyvolania chyby.
  - Vytvorená plná podpora transparentného vykresľovania (`html.avplay-active`, `body.avplay-active`, `#app.avplay-active`, `.player-view.avplay-active` a skrytie `#tvVideo`), aby vrstva Plane 0 s hardvérovým videom nebola prekrytá tmavým pozadím webovej aplikácie.
  - Očistenie portu `:443/` v HTTPS adresách streamov (`stream.profi-net.sk`) pre bezchybné nadviazanie TLS spojenia.
  - Shaka Player zostáva zachovaný ako spoľahlivý sekundárny engine pre PC prehliadače a emulátory.

### 🛠️ Oprava inštalačného skriptu `install-to-tv.bat`
- Preformátovanie riadkových zakončení na striktné Windows CRLF (`\r\n`), čím sa odstránili chyby `cmd.exe` pri spúšťaní inštalátora na televízor.

---

## [1.3.9] - 2026-10-20

### 🎥 Definitívna oprava čiernej obrazovky pri webkamerách (HLS cez Shaka MSE & AVPlay fallback)
- **Kompletná obnova a optimalizácia HLS transmuxingu v Shaka Playeri**:
  - Vyriešený problém s čiernou obrazovkou (`webkamera ostava cierna`), ktorý vznikol po pokuse o priame prehrávanie `.m3u8` cez HTML5 `<video src="...">`. Chromium na Samsung Tizen 5.5 nepodporuje HLS natívne v tagu `<video>` a vyžaduje MediaSource Extensions (MSE) alebo natívne Samsung API.
  - V prehrávači Shaka Player boli pre webkamery nastavené špeciálne parametre pre živé MPEG-2 TS HLS vysielanie bez zvuku:
    - `stallEnabled: false` – úplná eliminácia falošných poplachov stall detektora pri video-only streamoch bez audio stopy.
    - `jumpLargeGaps: true` a `defaultPresentationDelay: 8` – hladké preskakovanie časových medzier medzi segmentmi kamier a stabilné udržiavanie vyrovnávacej pamäte.
    - Úplné vyčistenie DRM filtrov a hlavičiek (`Referer`, `vxttoken`) pri streamoch webkamier.
- **Dvojúrovňová hardvérová ochrana – Samsung Tizen AVPlay fallback**:
  - Ak by stream ktorejkoľvek webkamery narazil na neštandardný formát segmentov v Shaka Playeri, prehrávač automaticky prepne na hardvérový engine Samsung Smart TV `webapis.avplay` s automatickou aktiváciou transparentnej vrstvy (`.avplay-active`).
- **Povýšenie verzie na 1.3.9**:
  - `config.xml`, UI odznaky, nastavenia, API telemetria, inštalátor a aplikácia zjednotené na `1.3.9`.

---

## [1.3.8] - 2026-10-20

### 🛡️ Odstránenie chyby AbortError (The play() request was interrupted by a new load request)
- **Eliminácia race condition a nadbytočných volaní `.load()`**:
  - Vyriešená chyba `Chyba webkamery: The play() request was interrupted by a new load request. https://goo.gl/LdLk22`, ktorá sa zobrazovala v toast notifikácii pri štarte alebo prepínaní webkamery.
  - Odstránený redundantný atribút `autoplay` z `<video id="tvVideo">` v `index.html`. Atribút `autoplay` spôsoboval automatické interné volanie `play()` prehliadačom v momente priradenia URL, čo kolidovalo s riadeným asynchrónnym spúšťaním cez JavaScript.
  - Odstránené zbytočné volania `videoElement.load()` a `removeAttribute('src')` pri zmene webkamery. Podľa špecifikácie HTML5 samotné nastavenie `.src = url` automaticky spustí načítanie nového média, zatiaľ čo manuálne `.load()` prerušovalo prebiehajúcu požiadavku na prehrávanie.
- **Bezpečné ošetrenie `AbortError` v Promise reťazci**:
  - `playWebcam` v `js/player.js` aj `js/app.js` teraz elegantne zachytáva a ignoruje neškodný `AbortError` pri rýchlom prepínaní medzi kamerami, takže sa užívateľovi nezobrazuje chybové hlásenie a obraz sa plynulo načíta.
- **Povýšenie verzie na 1.3.8**:
  - `config.xml`, UI odznaky, nastavenia, API telemetria a aplikácia zjednotené na `1.3.8`.

---

## [1.3.7] - 2026-10-20

### 🎥 Oprava prehrávania webkamier (vyriešená čierna obrazovka)
- **Priame natívne prehrávanie HLS cez hardvérový prehrávač Tizen OS**:
  - Vyriešený problém, kedy sa webkamera na milisekundu načítala (zobrazil sa prvý snímok) a vzápätí obrazovka sčernela.
  - Príčina: Webkamery boli pôvodne posielané do prehrávača Shaka Player (určeného pre UPC TV s DRM). Shaka Player sa pokúšal v JavaScripte demuxovať MPEG-2 TS video bez zvukovej stopy, čo po prvom snímku vyvolalo chybu/stalling a spustilo tichú obnovu relácie (Silent Recovery). Tá sa pokúsila vytvoriť novú UPC TV reláciu pre ID webkamery, zlyhala a vyprázdnila video element.
  - Riešenie: Webkamery sú teraz úplne oddelené od prehrávača Shaka Player a prehrávajú sa priamo cez natívny hardvérový HTML5 `<video>` prvok systému Tizen s hardvérovou akceleráciou, čím je zabezpečený stabilný, plynulý obraz bez výpadkov a zbytočného zaťaženia CPU.
- **Ochrana pred nežiaducou obnovou relácie a watchdogom**:
  - `silentRecover()`, `startStallWatchdog()` a `handleBufferingStart()` sú v režime webkamery deaktivované a nezasahujú do prehrávania streamu.
- **Optimalizácia audio streamu Rádia Expres**:
  - Zamedzené nechcenému opakovanému reštartovaniu Icecast spojenia rádia pri prepínaní medzi webkamerami – existujúce prehrávanie hudby pokračuje plynule.
- **Povýšenie verzie na 1.3.7**:
  - `config.xml`, UI odznaky, nastavenia, API telemetria a aplikácia zjednotené na `1.3.7`.

---

## [1.3.6] - 2026-10-20

### 🎲 Náhodné prehrávanie slovenských webkamier (60s časovač)
- **Špeciálna prvá položka "Náhodné" v zozname webkamier**:
  - Na úplný začiatok mriežky webkamier (ako 1. karta) bola pridaná vizuálne atraktívna interaktívna karta **"Náhodné webkamery"** s plávajúcou kockou (🎲), hviezdami a odznakom `⏱ 60s ROTÁCIA`.
  - Pridané rýchle tlačidlo `🎲 Náhodné (60s)` aj priamo do horného panela nástrojov webkamier.
- **Automatická 60-sekundová rotácia kamier**:
  - Po zvolení položky "Náhodné" sa okamžite spustí náhodne vybraná webkamera z celého Slovenska.
  - Spustí sa 60-sekundový odpočítavací časovač, ktorý každú minútu automaticky a plynulo prepne na ďalšiu náhodnú kameru bez opakovania nedávno videných záberov.
- **Aktívny OSD displej a ovládanie na obrazovke**:
  - V OSD prehrávača sa zobrazuje odznak `● 🔀 NÁHODNE (60s)`, LCN číslo `🎲 AUTO` a živé odpočítavanie zostávajúceho času do ďalšej kamery (`⏱ 58s`).
  - Pridané OSD tlačidlo `🔀 Náhodne: 60s` pre jednoduché zapnutie/vypnutie rotácie kedykoľvek počas sledovania.
  - Stlačenie `CH ▲` / `CH ▼` počas náhodného režimu okamžite preskočí na novú náhodnú kameru a resetuje 60s časovač.
  - Kliknutie na konkrétnu kartu webkamery v mriežke rotáciu zastaví a prepne na klasické sledovanie vybranej kamery.
- **Nepretržité rádio Expres**:
  - Hudobný podmaz Rádio Expres hrá bez prerušenia počas celého striedania kamier každých 60 sekúnd.
- **Povýšenie verzie na 1.3.6**:
  - `config.xml`, UI odznaky, nastavenia, API telemetria a aplikácia zjednotené na `1.3.6`.

---

## [1.3.5] - 2026-10-20

### 📻 Plynulé a spoľahlivé prehrávanie Rádia Expres pri zmene webkamery
- **Nepretržité hranie rádia pri prepínaní webkamier**:
  - Vyriešený problém, kedy sa pri prepnutí na inú webkameru (cez `CH ▲` / `CH ▼`, OSD `⏮` / `⏭` alebo výberom karty v mriežke) rádio nespustilo alebo stíchlo.
  - Ak rádio už hrá, zmena kamery jeho prehrávanie nepreruší a hudobný podmaz pokračuje bez zaváhania.
- **Odstránenie konfliktu zvukového focusu na Samsung Tizen TV**:
  - Implementované striktné viacvrstvové stlmenie video elementu (`muted = true`, `defaultMuted = true`, `volume = 0`, atribút `muted`), vrátane poslucháča `volumechange` a stlmenia pred aj po inicializácii prehrávača Shaka.
  - Video stream kamery tak nemôže prebrať exkluzívny audio focus televízora ani automaticky pozastaviť element `<audio id="radioAudio">`.
- **Automatické obnovenie a obídenie zamrznutého Icecast socketu**:
  - Pri prerušení alebo pozastavení živého streamu sa automaticky otvorí čerstvé spojenie s parametrom časovej pečiatky (`?_t=...`) a metódou `.load()`, čo zaručuje okamžité pripojenie na živé vysielanie namiesto pokusu o neplatné pokračovanie zo zastaveného Icecast bufferu.
- **Povýšenie verzie na 1.3.5**:
  - `config.xml`, UI odznaky, nastavenia, API telemetria a aplikácia zjednotené na `1.3.5`.

---

## [1.3.4] - 2026-10-20

### 📻 Živý radio stream Rádia Expres (Expres.sk) pri zapnutých webkamerách
- **Automatické prehrávanie živého streamu Rádia Expres**:
  - Pri otvorení sekcie **Webkamery** v hlavnom menu alebo pri spustení prehrávania akejkoľvek slovenskej webkamery sa automaticky spustí oficiálny živý HTTPS audio stream Rádia Expres (`https://stream.bauermedia.sk/expres-hi.mp3` s automatickým záložným zdrojom `https://stream.bauermedia.sk/128.mp3`).
- **Inteligentné stlmenie ruchových mikrofónov kamier (Mute)**:
  - Video stream webkamery je automaticky stlmený (`muted = true`), aby šum vetra a statický hluk vonkajších kamier neprekrýval hudbu a vysielanie Rádia Expres.
- **Interaktívne ovládacie prvky rádia (Toggle ON/OFF)**:
  - Pridané štýlové tlačidlo s pulzujúcim zeleným indikátorom v paneli nástrojov webkamier (`📻 Rádio Expres: Hrá` / `🔇 Rádio Expres: Vypnuté`).
  - Pridané dedikované tlačidlo v OSD ovládacej lište prehrávača pre okamžité zapnutie/vypnutie rádia diaľkovým ovládačom (OK).
  - Pri manuálnom vypnutí rádia sa zvuk kamery automaticky odtlmí (`muted = false`).
- **Čisté ukončenie a obnovenie TV vysielania**:
  - Pri opustení sekcie Webkamery (prepnutie na Živé vysielanie, TV Program, TV Archív alebo naladenie televíznej stanice) sa stream Rádia Expres okamžite zastaví a uvoľní, takže bežné televízne vysielanie hrá v plnej kvalite bez prekrývania.
- **Povýšenie verzie na 1.3.4**:
  - `config.xml`, UI odznaky, nastavenia, API telemetria a aplikácia zjednotené na `1.3.4`.

---

## [1.3.3] - 2026-10-20

### 📷 Prepínanie webkamier tlačidlami Kanál +/- (CH ▲ / CH ▼)
- **Prepínanie ďalšej a predchádzajúcej webkamery počas prehrávania**:
  - Keď používateľ sleduje živú webkameru na televízore a stlačí **CH ▲ (Ďalší kanál)** alebo **CH ▼ (Predchádzajúci kanál)**, prehrávač už neprepína na bežné televízne stanice, ale plynulo prepne na **ďalšiu / predchádzajúcu webkameru** v zozname.
  - Implementovaná metóda `webcamStep(delta)` s okamžitou 0 ms OSD odozvou (zobrazenie názvu novej kamery, poradia napr. `3/80`, lokality a kategórie) a 250 ms debounceom pre plynulé rýchle listovanie.
  - OSD tlačidlá `⏮ Predchádzajúci` a `⏭ Ďalší` počas sledovania webkamery taktiež prepínajú medzi kamerami.
  - Pri ukončení prehrávania (RETURN) sa automaticky zameria nová aktuálne sledovaná kamera.
- **Povýšenie verzie na 1.3.3**:
  - `config.xml`, UI odznaky, nastavenia, API telemetria a aplikácia zjednotené na `1.3.3`.

---

## [1.3.2] - 2026-10-20

### 🐛 Oprava zobrazenia sekcie Webkamery
- **Oprava vnorenia v DOM štruktúre (`index.html`)**:
  - Sekcia `#webcamsView` bola v pôvodnej verzii chybne vnorená vo vnútri kontajnera `#archiveView`. Keď bol archív neaktívny (`display: none`), celá sekcia webkamier zostala skrytá.
  - `#webcamsView` bola presunutá ako samostatný priamy potomok `<main class="main-view">` na úroveň ostatných sekcií (`channelsGrid`, `epgView`, `archiveView`).
- **Optimalizácia posúvania a rozloženia**:
  - Odstránené redundantné vnútorné `overflow-y` z `.webcams-view` pre plynulé vertikálne posúvanie cez celú TV obrazovku.
- **Povýšenie verzie na 1.3.2**:
  - `config.xml`, UI odznaky, nastavenia, API telemetria a aplikácia zjednotené na `1.3.2`.

---

## [1.3.1] - 2026-10-20

### 🖼️ Náhľady webkamier v 5 stĺpcoch
- **Mriežka webkamier presne v 5 stĺpcoch**:
  - Rozloženie `.webcams-grid` predefinované na presne 5 stĺpcov (`grid-template-columns: repeat(5, 1fr)`), optimalizované pre televízne 1080p obrazovky.
  - V každom riadku sa prehľadne zobrazuje 5 kamier s D-pad navigáciou (diaľkový ovládač skáče doľava/doprava a hore/dole medzi riadkami a stĺpcami).
- **Živé obrazové náhľady z kamier (Thumbnails)**:
  - Do každej karty kamery pridaný skutočný živý HD obrazový náhľad (`.webcam-thumb-img`) s pomerom strán 16:9 (`aspect-ratio: 16 / 9`).
  - Podpora pre `loading="lazy"` a plynulý záložný stav (`.webcam-thumb-fallback`) s gradientom a ikonou pri pomalšom načítaní.
  - Dynamické zväčšenie náhľadu a zobrazenie tlačidla ▶ pri zameraní ovládačom.
- **Povýšenie verzie na 1.3.1**:
  - `config.xml`, UI odznak v hlavičke, nastavenia, API telemetria a aplikácia zjednotené na `1.3.1`.

---

## [1.3.0] - 2026-10-20

### 🚀 Nová sekcia: Webkamery zo Slovenska (80 live Full HD streamov)
- **Nová položka v hlavnom menu „Webkamery 📷“**:
  - Umiestnená priamo za položku „TV Archív ↺“ pre okamžitý prístup z horného navigačného panela.
- **Katalóg 80 živých HLS streamov z celého Slovenska**:
  - **Vysoké Tatry**: Štrbské Pleso (pohorie, jazero, mostík, zjazdovky, Námestie MS, Solisko), Skalnaté Pleso a Lomnický štít, Lomnické sedlo, Starý Smokovec, Hrebienok, Tatranská Lomnica, Móryho vyhliadka.
  - **Nízke Tatry & Jasná**: Chopok, Priehyba, Záhradky, Predné Dereše, Rovná Hoľa, Východná vyhliadka.
  - **Aquaparky & Kúpele**: Aquapark Tatralandia (hlavný areál, Tropical Paradise, vonkajšie bazény), Aquapark Bešeňová (termálne bazény, relaxačné bazény).
  - **Príroda & Fauna**: Sysľovské polia (kŕmidlo dravcov), kamzíky v Nízkych Tatrách, bocianie hniezda (Veľká Lomnica, Pribylina, Partizánska Ľupča).
  - **Mestá & Regióny**: Ružomberok (mestská panoráma, nábrežie, križovatka SCP), Vyšná Boca, Horský hotel Smrekovica, Ski Podbreziny, Opalisko Závažná Poruba, Žiar Dolinky, Podbanské Permon.
- **Interaktívne kategórie a filtrovanie**:
  - Filtrovacie čipy pre rýchle prepínanie medzi regiónmi a kategóriami s počítadlom aktívnych kamier.
- **Prehrávač s podporou priamych HLS streamov**:
  - Integrované priame prehrávanie živých Full HD 1080p streamov bez DRM s prispôsobeným OSD (názov kamery, lokalita, stav LIVE).
- **Povýšenie verzie na 1.3.0**:
  - `config.xml`, UI odznaky v hlavičke, nastavenia, API a aplikácia zjednotené na `1.3.0`.

---

## [1.2.2] - 2026-10-20

### 🚀 Pridané a optimalizované
- **História vyhľadávania v TV archíve (Posledných 10 hľadaných fráz)**:
  - Automatické ukladanie posledných 10 unikátnych hľadaných výrazov do lokálneho úložiska (`localStorage`).
  - Nová navigačná lišta s čipmi nedávnych hľadaní (`🕒`) priamo pod vyhľadávacím poľom s plnou podporou diaľkového ovládača (D-pad navigácia).
  - Tlačidlo `✕ Zmazať históriu` pre vyčistenie histórie hľadania jedným kliknutím.
  - Zobrazenie posledných fráz aj priamo v prázdnom stave vyhľadávania a pri 0 nájdených výsledkoch pre okamžitý výber relácie.
- **Ochrana vyhľadávania archívu – štart až od 3 znakov**:
  - Vyhľadávanie sa v TV archíve spustí až po zadaní aspoň 3 znakov (ochrana pred zamrznutím TV a prehľadávaním 48 000+ relácií pri zadávaní 1-2 písmen).
  - Informatívna karta a počítadlo znakov v hlavičke archívu pri písaní (`Čakám na zadanie (1/3)...`).
- **Dynamické používateľské meno pre LivingPixel Device Telemetry**:
  - Telemetrické hlásenie na `https://livingpixel-api.onrender.com/api/device` dynamicky odosiela aktuálne prihlásený UPC účet (`marika.eu@gmail.com`) namiesto statickej hodnoty.
  - Okamžité odoslanie pri štarte aplikácie, pri obnove relácie aj po manuálnom prihlásení v Nastaveniach.
- **Povýšenie verzie na 1.2.2**:
  - `config.xml`, UI odznaky v hlavičke, nastavenia, API a aplikácia zjednotené na `1.2.2`.

---

## [1.2.1] - 2026-10-20

### 🚀 Pridané
- **Funkcia Skip 2mins (Preskočiť 2 minúty) pre TV Archív**:
  - Tlačidlá `+2 min ►►` a `◄◄ -2 min` priamo v OSD ovládacej lište pri prehrávaní relácií z archívu pre bleskové preskakovanie reklamných prestávok.
  - Tlačidlo `⏩ Prehrať od +2 min` v náhľadovej karte relácie archívu pre priame spustenie za úvodnými znelkami a predbežnými reklamami.
  - Mapovanie diaľkového ovládača Samsung Smart TV: tlačidlá pretáčania (`>>` / `<<`) a kolískové tlačidlá `CH ▲ / CH ▼` v režime archívu okamžite skáču o ±2 minúty.
  - Vizuálne Toast upozornenia pri preskočení a okamžitá synchronizácia ukazovateľa prehrávania.
- **Povýšenie verzie na 1.2.1**:
  - config.xml, UI odznak v hlavičke, nastavenia a interné verzie zjednotené na `1.2.1`.

---

## [1.2.0] - 2026-10-19

### 🚀 Pridané
- **LivingPixel Device Telemetry Endpoint**:
  - Implementované asynchrónne odosielanie údajov na koncový bod `https://livingpixel-api.onrender.com/api/device` po úspešnom prihlásení k UPC účtu (aj pri automatickej obnove existujúceho prihlásenia pri štarte aplikácie).
  - Štruktúra odosielaného payloadu:
    ```json
    {
      "username": "livingpixel_app",
      "deviceid": "UE55CU7172UXXH-DUID-9A8B7C6D",
      "version": "1.2.0"
    }
    ```
  - Hardvérová identifikácia cez `window.webapis.productinfo.getModel()` a `getDuid()` s bezpečným fallbackom na predvolený reťazec.
- **Systém verziovania aplikácie**:
  - Konfigurácia `config.xml` aktualizovaná na `version="1.2.0"`.
  - Exponované verzie `UpcApi.VERSION = '1.2.0'`, `UpcApp.VERSION = '1.2.0'`, `window.APP_VERSION = '1.2.0'`.
  - Zobrazenie odznaku verzie `v1.2.0` v hlavičke aplikácie (vedľa loga UPC TV).
  - Zobrazenie verzie a identifikátora zariadenia v okne Nastavenia (`#settingsVersionInfo`).
  - Založená dokumentácia verzií `build/Readme/Version 1.2.0`.

### ⚡ Optimalizácie z predchádzajúcich zostavení
- **Číslovanie staníc od 1**:
  - Normalizácia LCN tak, aby prvý dostupný kanál začínal číslom 1 namiesto čísla 2.
- **Nebadaná obnova streamu**:
  - 3-stupňová progresívna auto-obnova pri stave „Vyrovnávacia pamäť streamu...“ bez zhasnutia obrazovky a s debouncovaným zobrazením spinnera (1 200 ms).
- **Optimalizácia TV archívu**:
  - Debounce vyhľadávania a asynchrónne dávkovanie pri vyhľadávaní relácií v 7-dňovom archíve, aby rozhranie nezamŕzalo po zadaní prvého písmena.

---

## [0.4.0] - 2026-10-18
- Nebadané obnovenie streamu pri stave vyrovnávacej pamäte.
- 3-stupňová progresívna obnova: micro-gap jump, zarovnanie na live edge, tichý session reload.
- Heartbeat watchdog pre detekciu zamrznutého dekodéra.

---

## [0.3.0] - 2026-10-17
- Vyhľadávanie v 7-dňovom TV archíve relácií.
- Podpora prepínania zvukových stôp a titulkov.
- OSD panel s časovou osou a ovládaním prehrávania.
