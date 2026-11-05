# UPC TV – Version Overview (Changelog)

All notable changes to the UPC TV project for Samsung Smart TV (Tizen OS) are documented in this file.

## [1.5.5] - 2026-11-05

### 🚪 Exit Confirmation Modal (Safe Exit to TV Home Screen)
- **Safe Exit to TV Home Screen**:
  - Added exit confirmation dialog `#exitModal` triggered by pressing `Back` (Return) on the main app screen.
  - Prevents unintended instant exits to the Samsung TV home screen.
  - Two intuitive options: **Cancel** (restores previous remote focus) and **Exit Application** (`tizen.application.getCurrentApplication().exit()`).
  - Full remote control D-pad integration (left/right arrows between buttons, Enter to select, Back to dismiss).
- **Version Bump to 1.5.5**:
  - Version updated to `1.5.5` across `config.xml`, `index.html`, `js/app.js`, `js/telemetry.js`, and `install-to-tv.bat`.
  - Generated fresh signed package `UPC_TV.wgt` and USB deployment archive `userwidget.zip`.

---

## [1.5.4] - 2026-11-05

### 📊 Neon Postgres Telemetry Integration & Removal of Movies Tab
- **Full Start Action Telemetry to `upc_tv_telemetry` Table**:
  - Implemented `js/telemetry.js` with direct secure write to Neon Postgres database via Serverless SQL HTTP API (`ep-broad-mode-ba2zewd1-pooler.c-8.eu-central-1.aws.neon.tech`).
  - Logs all start actions with rich metadata (`device_id`, `app_version`, `user_agent`, `ip`, `event_type`, `payload`, `created_at`):
    - App startup (`start_app` and `start`) with screen resolution and user agent.
    - Live TV channel tune (`start_channel` and `start`) with channel ID, title, and LCN.
    - TV Archive playback (`start_replay` and `start`) with program ID, title, and skip offset.
    - Live Slovak webcam stream (`start_webcam` and `start`) with webcam ID, title, and category.
    - Slovak/Czech radio stream (`start_radio` and `start`) with station ID, title, and genre.
  - Automatic detection and caching of TV DUID (`webapis.productinfo.getDuid()`) and public IP (`api.ipify.org`).
- **Removal of Non-functional Movies Tab**:
  - Completely removed the Movies tab button and `moviesView` UI layout.
  - Cleaned up obsolete VOD playback and subtitle overlay code from the application.
- **Version Bump to 1.5.4**:
  - Version updated to `1.5.4` across `config.xml`, `index.html`, `js/telemetry.js`, and `install-to-tv.bat`.
  - Generated fresh signed package `UPC_TV.wgt` and USB deployment archive `userwidget.zip`.

---

## [1.5.3] - 2026-11-03

### 🚀 Elimination of Black Screen – FastStart MP4 (H.264 + AAC Stereo) & Bulletproof AVPlay/HTML5 Failover

- **Creation of optimized FastStart MP4 stream**:
  - Remuxed the movie into progressive MP4 (`movie.mp4`, 9.38 GB) with `moov` atom at the very start (`+faststart`).
  - Converted audio track from E-AC-3 to universal stereo AAC (192 kbps), 100% hardware-supported across all Samsung Smart TVs (Tizen 3.0 to 8.0) and HTML5 engines without requiring `mux.js` transmuxing.
- **Elimination of black screen in AVPlay (`player.js`)**:
  - `self.enableAvplayUi(true)` is no longer triggered prematurely during `IDLE` state; it is only activated after `prepareAsync` confirms stream readiness, preventing transparent hole rendering over black screen.
  - Added a 3.5s safety timeout to `prepareAsync` with automatic failover to HTML5 `<video>` element if hardware AVPlay hangs.
  - Corrected `webapis.avplay.seekTo()` invocation to execute strictly after `play()`, avoiding `INVALID_OPERATION` in `READY` state.
- **Active HTTP Range Streaming on Port 3001**:
  - Local bridge server serves `movie.mp4` with full `206 Partial Content` and `Accept-Ranges: bytes` support for instantaneous seeking.
- **New App Release v1.5.3**:
  - Updated version numbers across `config.xml`, `index.html`, and `install-to-tv.bat`.

### 🛡️ Definite HLS Bridge Routing & Robust AVPlay + Shaka HLS Fallback

- **Direct `streamUrl` reassignment to local HLS bridge**:
  - In `movies-data.js`, the primary `streamUrl` was permanently reassigned to `http://192.168.100.2:3001/hls/movie.m3u8`, eliminating any fallback to the expired Webshare link.
- **Enhanced AVPlay -> Shaka Player HLS fallback**:
  - If hardware AVPlay reports an error (`onerror`, `prepareAsync` exception), playback immediately transfers to the battle-tested `shakaPlayer` HLS pipeline rather than failing in native HTML5.
- **New TV package**:
  - Bumped version to `v1.5.2` in `config.xml`, `index.html`, and `install-to-tv.bat`.
  - Re-packaged and signed `UPC_TV.wgt` and `userwidget.zip`.

---

## [1.5.1] - 2026-11-03

### 🎬 MKV Container Support, 9.8 GB Movie Release & VOD HLS Optimization

- **Support for MKV container and high-bitrate local releases**:
  - The `UPC_TV_Bridge` now automatically detects `movie.mkv` (including direct detection of `Rivalové z Oklahomy 2025 CZ TITULKY NOVINKA.mkv` in Downloads) without relying on expired remote CDN tokens.
  - Precise stream mapping (`-map 0:v:0 -map 0:a:0 -c:v copy -c:a copy`) prevents muxing issues with text subtitle tracks in MPEG-TS while preserving full 5.1 Dolby Digital Plus (EAC3) surround audio.
- **VOD HLS playlist with full scrub/seek support**:
  - Switched generated playlist to `#EXT-X-PLAYLIST-TYPE:VOD` with fixed 4s segments and `#EXT-X-ENDLIST`.
  - Enables Samsung TV AVPlay hardware engine to jump instantly to any point in the full 2 hour 10 minute runtime (1,962 segments) with zero buffering delay.
- **Finished export detection in Bridge**:
  - When starting, the bridge detects if `movie.m3u8` is already complete with `#EXT-X-ENDLIST`; if so, it serves segments immediately without re-muxing.
- **Version bump**:
  - Version updated to `v1.5.1` across `config.xml`, `index.html`, and `install-to-tv.bat`.

---

## [1.5.0] - 2026-11-03

### 🚀 Windows HLS Movie Bridge for Local Network TV Streaming

- **Local HLS Bridge server architecture (`UPC_TV_Bridge`)**:
  - Dedicated Node.js Express server on port 3001 overcoming Tizen 5.5 Chromium 69 limitations with large (5+ GB) progressive media files over HTTP.
  - Lightning-fast segmentation into MPEG-TS via FFmpeg Stream Copy (0% CPU impact, 200x–350x speed).
  - CORS-enabled endpoints for playlist (`/hls/movie.m3u8`), TS segments (`/hls/segment_XXXX.ts`), and Czech WebVTT subtitles (`/hls/subtitles.vtt`).
- **Player integration (`player.js`)**:
  - Movies route primarily through `movie.hlsStreamUrl` using Samsung's native `webapis.avplay` hardware decoder.
  - Shaka Player / HTML5 fallback maintained for desktop browser testing.
- **Package builder resilience (`build-wgt.js`)**:
  - Added fallback to PowerShell `Compress-Archive` when `archiver` npm module is missing, preventing `install-to-tv.bat` build aborts.

---

## [1.4.9] - 2026-11-03

### 🔧 Movie Playback Fixes & Radio False Error Suppression

- **Radio false error toast fix**:
  - `stopRadio()` no longer triggers false error events when resetting the audio element `src` upon starting a movie.
- **AVPlay MP4 Engine improvements**:
  - Removed `setDisplayRect()` call in `IDLE` state; display dimensions and letterbox mode configured in `READY` state inside `prepareAsync`.
  - Automatic fallback chain: AVPlay -> Direct HTTP -> HTML5 video.
- **Direct CDN URLs**:
  - Stream and subtitle URLs configured directly on `prg-c3-storage6.premiumcdn.net`.

---

## [1.4.8] - 2026-11-03

### 🎬 New "Movies 🎬" Tab with Movie Playback & Czech VTT Subtitles

- **New "Movies 🎬" section in main header navigation**:
  - Added the **Movies 🎬** tab right next to `TV Archív ↺`.
  - Features a movie catalog grid, category filter pills (*All Movies*, *720p HD*, *💬 CZ Subtitles*), and a rich movie detail preview panel (poster, rating, year, duration, director, cast, synopsis, and playback action buttons).
- **Implemented "The Rivals of Amziah King" (720p MP4) + Czech Subtitles (WebVTT)**:
  - Integrated direct 720p HD MP4 streaming for *The Rivals of Amziah King*.
  - Built a synchronized WebVTT subtitle parser and TV-optimized subtitle overlay (`#movieSubtitleOverlay`) with all 2,161 Czech cues pre-bundled and synced in real time, automatically adjusting position when the player OSD is visible.
  - Full support for toggling subtitles via the OSD `💬 Titulky` modal or remote `SUBTITLE` / `CAPTION` key, seeking (`◄`/`►` ±30s, `CH ▲`/`CH ▼` ±2m), and automatic resume position saving.

---

## [1.4.7] - 2026-10-26

### 🌙 "Picture Off + sound" Feature (Turn Off Screen While Listening to Radio)

- **Automatic screen turn-off after 1 minute of inactivity**:
  - While radio is playing, after 60 seconds without pressing any remote control button, the screen is automatically turned off (fullscreen black mode is activated for power saving and OLED panel protection).
  - The radio stream continues playing in full quality in the background without interruption.
- **Ignoring volume buttons (Volume Up / Down / Mute)**:
  - Pressing volume buttons (Volume +, Volume -, Mute) does not wake up the screen – volume is adjusted in the dark with the picture off.
- **Instant wake-up with any other button**:
  - Pressing any other button on the remote control (e.g. OK / Enter, Back / Return, Arrows, Numpad, Color keys) immediately wakes up the screen (Picture On).
- **"🌙 Picture Off + sound" button in radio player bar**:
  - Added a button in the bottom radio player bar for immediate manual screen turn-off without needing to wait 1 minute.

---

## [1.4.6] - 2026-10-26

### 🕒 Intelligent Search History Storage (Final Phrase Only)

- **Consolidation and cleanup of typing intermediate steps**:
  - When typing a search query using the TV remote (e.g., *zah* ➔ *zaha* ➔ *zahad* ➔ *zahady*), only the **final phrase** (*zahady*) is stored in the recent search history.
  - All incomplete prefix intermediate steps are automatically collapsed and removed, both during new searches and from existing stored history.
  - Implemented a 1.5s debounce while typing combined with immediate saving on submit (Enter), field blur, scope toggle, or selecting a show.

---

## [1.4.5] - 2026-10-26

### 🔍 TV Archive Search Results Filtering (Playable Shows Only)

- **Exclusion of "Scheduled" shows from search results**:
  - When searching the archive, shows that are only scheduled for the future (`ev.startTime > now`) are no longer displayed in the results, as they have not aired yet and cannot be played.
  - Search results (across all scopes: *This channel*, *All day*, *7-day archive*) exclusively display playable broadcasts:
    - Aired shows in the archive (`ev.endTime <= now`) marked with the `↺ In Archive` badge.
    - Currently airing shows (`ev.startTime <= now && ev.endTime >= now`) marked with the `● Live Now (Restart)` badge with support for playing from the beginning.
  - The found shows counter and preview panel now accurately reflect only shows ready to play.

---

## [1.4.4] - 2026-10-26

### 🔍 TV Archive Search Relocation and Quick Filter Removal

- **Replacing filter row with direct search bar**:
  - Removed the "Quick filter" row with category tags (*News, Movie, Series, Sports, Kids, Documentary, Crime*).
  - The archive search panel (`archive-search-toolbar`) was moved from the narrow channel banner directly to the freed space on a dedicated clean row.
  - The channel banner (`archive-channel-banner`) now displays clean information about the selected channel and date.
  - The search input has an optimized width, and scope toggles (*This channel*, *All day*, *7-day archive*) are available directly adjacent to it.
- **Version bump to 1.4.4**:
  - Unified versions across `config.xml`, `index.html`, `js/api.js`, and installation packages.

---

## [1.4.3] - 2026-10-20

### 📻 New Radios Section (Slovak and Czech Radios Ranked by Popularity)

- **"Radios 📻" button in main navigation bar**:
  - Added new button `tabRadios` positioned right between `Webcams 📷` and `Favorites`.
- **Clean grid of stations sorted by listenership**:
  - Integrated database of 47 most popular radio stations in Slovakia and the Czech Republic based on official listenership surveys (Radioprojekt SK / Radioprojekt CZ).
  - Default sorting by popularity (1. Rádio Expres, 2. Rádio Slovensko, 3. Rádio Vlna, 4. Fun Rádio, 5. Europa 2, ČRo Radiožurnál, Rádio Impuls, Frekvence 1, Rádio Blaník, Rádio Beat, Rádio Kiss, etc.).
  - Category filtering: *All radios*, *🇸🇰 Slovak*, *🇨🇿 Czech*, *Pop & Hits*, *Rock*, *News & Talk*, *Oldies & Retro*, *Chillout & Jazz*.
- **High-quality stream playback (HD Audio 128k - 256k)**:
  - Clicking a selected radio immediately starts the highest quality available stream via the native audio engine with an automatic backup URL (backupUrl) in case of failure.
  - An animated soundwave equalizer and "🟢 Now Playing" indicator are activated on the station card.
  - A modern floating player (Radio Player Bar) appears at the bottom of the section with station logo, title, ranking badge, bitrate, and controls (Pause / Resume / Stop).
  - Launching a TV channel or webcam automatically and cleanly stops the radio without audio overlap.
  - Support for auto-starting the last played radio station on application startup (`localStorage`).

---

## [1.4.2] - 2026-10-20

### 🔍 Default Search Scope Set to 7-Day TV Archive

- **Search scope optimization**:
  - Default search scope in TV Archive is set to **7-day archive** (`week`).
  - The "7-day archive" button (`#btnScopeWeek`) is automatically active upon entering the archive, searching programs over the past 7 days across all channels without needing manual switching.

### ⏩ Automatic Skip of Initial 60 Seconds in TV Archive

- **Eliminating unnecessary waiting for show start**:
  - When selecting any program in the TV archive (from the program list, search results, or via the "Play from archive" button), playback automatically starts with a **+60 seconds** offset (+1:00).
  - This skips station idents, intro promos, commercials, and broadcast start time discrepancies.
  - An informative notification is displayed on screen: `⏩ Starting archive playback, skipping 60s intro (+1:00)`.
  - Restarting currently airing live broadcasts (Restart) remains set from the exact beginning (0 s).

### 🚀 Auto-Start Last Watched Program on App Launch

- **Instant playback upon launch**:
  - The application stores the last watched TV channel, archive broadcast, or webcam in `localStorage`.
  - On app launch and channel list loading, the last watched program starts automatically (on first run, channel 1 in the list starts), eliminating the need to select a channel manually.

### 📦 Version Bump to 1.4.2

- Unified version 1.4.2 across `config.xml`, `index.html`, `js/api.js`, `install-to-tv.bat` installer, and `UPC_TV.wgt` and `userwidget.zip` packages.

---

## [1.4.1] - 2026-10-20

### 🛡️ Fix Webcam Video Overlap by Camera Grid

- **Hide main UI during active video playback**:
  - Resolved an issue where starting a webcam left the camera grid list (`#webcamsView`) visible, overlapping the video.
  - Since Samsung AVPlay hardware playback requires a transparent web application background (`.avplay-active`), camera list items, the app header, and navigation bars showed through transparent layers onto the picture.
  - Added global class `.player-active` in `js/app.js` managed by `openPlayerView()` and `closePlayerView()` methods.
  - In `css/style.css`, when the player is active (`.player-active` / `.avplay-active`), `.header-bar`, `.categories-bar`, `.main-view`, `.remote-legend`, and `#webcamsView` are strictly hidden (`display: none !important; visibility: hidden !important;`), giving the playing webcam the entire screen without any overlapping UI elements.
  - When closing the player (Back / Escape button), the webcam list smoothly reappears while preserving the selected tab.

---

## [1.4.0] - 2026-10-20

### 📻 Complete Removal of Rádio Expres from Webcams

- **Complete cleanup of all Rádio Expres elements and logic**:
  - Removed buttons from the toolbar (`btnWebcamRadioToggle`), from the player OSD bar (`btnOsdRadio`), and the `<audio id="radioAudio">` tag.
  - Removed Bauer Media audio streams, auto-enable/restore on webcam switch, audio toggle logic, and related application state.
  - Removed all radio mentions from toast notifications and OSD layer.

### 🎥 Fix Webcam Video Loading on Samsung Smart TV (Tizen 5.5)

- **Samsung AVPlay as Primary Hardware Engine for Webcams**:
  - On Samsung Tizen TVs (`webapis.avplay`), webcams are launched with priority directly through the native AVPlay hardware decoder instead of relying on the MSE transmuxer in Chromium 69, which froze on video-only TS streams without raising an error.
  - Created full support for transparent rendering (`html.avplay-active`, `body.avplay-active`, `#app.avplay-active`, `.player-view.avplay-active`, and hiding `#tvVideo`) so that Plane 0 hardware video is not occluded by the dark background of the web app.
  - Cleaned up `:443/` port in HTTPS stream URLs (`stream.profi-net.sk`) for proper TLS connection establishment.
  - Shaka Player remains as a reliable secondary engine for PC browsers and emulators.

### 🛠️ Fix `install-to-tv.bat` Installation Script

- Re-formatted line endings to strict Windows CRLF (`\r\n`), resolving `cmd.exe` errors when running the installer to the TV.

---

## [1.3.9] - 2026-10-20

### 🎥 Definitive Fix for Black Screen on Webcams (HLS via Shaka MSE & AVPlay Fallback)

- **Complete restoration and optimization of HLS transmuxing in Shaka Player**:
  - Resolved the black screen issue (`webcam remains black`) that occurred after attempting direct `.m3u8` playback via HTML5 `<video src="...">`. Chromium on Samsung Tizen 5.5 does not natively support HLS in `<video>` tags and requires MediaSource Extensions (MSE) or native Samsung APIs.
  - In Shaka Player, specialized parameters were configured for live MPEG-2 TS HLS streams without audio:
    - `stallEnabled: false` – complete elimination of false-positive stall detector triggers on video-only streams without an audio track.
    - `jumpLargeGaps: true` and `defaultPresentationDelay: 8` – smooth jumping across segment time gaps and stable buffer maintenance.
    - Complete cleanup of DRM filters and headers (`Referer`, `vxttoken`) for webcam streams.
- **Two-tier hardware protection – Samsung Tizen AVPlay fallback**:
  - If any webcam stream encounters non-standard segment formats in Shaka Player, the player automatically falls back to the Samsung Smart TV hardware engine `webapis.avplay` with automatic activation of the transparent layer (`.avplay-active`).
- **Version bump to 1.3.9**:
  - `config.xml`, UI badges, settings, API telemetry, installer, and app unified on `1.3.9`.

---

## [1.3.8] - 2026-10-20

### 🛡️ Elimination of AbortError (The play() request was interrupted by a new load request)

- **Elimination of race conditions and redundant `.load()` calls**:
  - Resolved the error `Webcam error: The play() request was interrupted by a new load request. https://goo.gl/LdLk22` shown in toast notifications during webcam start or switching.
  - Removed redundant `autoplay` attribute from `<video id="tvVideo">` in `index.html`. The `autoplay` attribute caused an automatic internal `play()` call by the browser upon URL assignment, conflicting with controlled asynchronous execution via JavaScript.
  - Removed unnecessary `videoElement.load()` and `removeAttribute('src')` calls during webcam change. Per HTML5 specification, setting `.src = url` automatically initiates loading of new media, whereas manual `.load()` interrupted in-flight play requests.
- **Safe handling of `AbortError` in Promise chain**:
  - `playWebcam` in both `js/player.js` and `js/app.js` now cleanly catches and ignores harmless `AbortError` instances during rapid switching between cameras, preventing error messages and allowing video to load smoothly.
- **Version bump to 1.3.8**:
  - `config.xml`, UI badges, settings, API telemetry, and app unified on `1.3.8`.

---

## [1.3.7] - 2026-10-20

### 🎥 Webcam Playback Fix (Resolved Black Screen)

- **Direct native HLS playback via Tizen OS hardware player**:
  - Resolved an issue where a webcam would load for a millisecond (displaying the first frame) and immediately turn black.
  - Root cause: Webcams were previously passed to Shaka Player (designed for UPC TV with DRM). Shaka Player attempted to demux MPEG-2 TS video without an audio track in JavaScript, triggering an error/stall after the first frame and starting Silent Recovery. This recovery attempted to create a new UPC TV session for the webcam ID, failed, and emptied the video element.
  - Solution: Webcams are now completely separated from Shaka Player and played directly through Tizen's native hardware-accelerated HTML5 `<video>` element, ensuring stable, smooth video without dropouts or unnecessary CPU load.
- **Protection against unwanted session recovery and watchdog**:
  - `silentRecover()`, `startStallWatchdog()`, and `handleBufferingStart()` are deactivated in webcam mode and do not interfere with stream playback.
- **Optimization of Rádio Expres audio stream**:
  - Prevented unwanted repeated restarts of the radio Icecast connection when switching between webcams – existing music playback continues seamlessly.
- **Version bump to 1.3.7**:
  - `config.xml`, UI badges, settings, API telemetry, and app unified on `1.3.7`.

---

## [1.3.6] - 2026-10-20

### 🎲 Random Shuffle Playback of Slovak Webcams (60s Timer)

- **Special first "Random" card in webcam list**:
  - Added a visually prominent interactive card **"Random Webcams"** as the 1st card in the webcam grid, featuring a floating die (🎲), stars, and a `⏱ 60s ROTATION` badge.
  - Added quick-access button `🎲 Random (60s)` directly in the top webcam toolbar.
- **Automatic 60-second camera rotation**:
  - Selecting "Random" immediately launches a randomly chosen webcam from across Slovakia.
  - Starts a 60-second countdown timer that smoothly switches to another random camera every minute without repeating recently viewed angles.
- **Active on-screen OSD display and controls**:
  - Player OSD displays badge `● 🔀 RANDOM (60s)`, LCN number `🎲 AUTO`, and a live countdown to the next camera (`⏱ 58s`).
  - Added OSD button `🔀 Random: 60s` for easy toggling of rotation at any time while watching.
  - Pressing `CH ▲` / `CH ▼` during random mode immediately skips to a new random camera and resets the 60s timer.
  - Clicking a specific webcam card in the grid stops rotation and switches to standard viewing of that camera.
- **Continuous Rádio Expres audio**:
  - Background music from Rádio Expres plays uninterrupted throughout all camera switches every 60 seconds.
- **Version bump to 1.3.6**:
  - `config.xml`, UI badges, settings, API telemetry, and app unified on `1.3.6`.

---

## [1.3.5] - 2026-10-20

### 📻 Seamless and Reliable Playback of Rádio Expres During Webcam Switching

- **Uninterrupted radio playback when switching webcams**:
  - Resolved an issue where switching to another webcam (via `CH ▲` / `CH ▼`, OSD `⏮` / `⏭`, or selecting a card in the grid) failed to start or muted the radio.
  - If radio is already playing, changing cameras does not interrupt playback, and background audio continues without hesitation.
- **Removal of audio focus conflict on Samsung Tizen TV**:
  - Implemented strict multi-tier muting of the video element (`muted = true`, `defaultMuted = true`, `volume = 0`, `muted` attribute), including a `volumechange` listener and muting before and after Shaka player initialization.
  - The webcam video stream cannot seize exclusive TV audio focus or automatically pause the `<audio id="radioAudio">` element.
- **Automatic recovery and bypass of frozen Icecast socket**:
  - Upon interruption or pause of the live stream, a fresh connection is opened with a timestamp query parameter (`?_t=...`) and `.load()` method, ensuring immediate connection to live broadcast instead of attempting an invalid resume from a stalled Icecast buffer.
- **Version bump to 1.3.5**:
  - `config.xml`, UI badges, settings, API telemetry, and app unified on `1.3.5`.

---

## [1.3.4] - 2026-10-20

### 📻 Live Radio Stream of Rádio Expres (Expres.sk) with Webcams Enabled

- **Automatic playback of live Rádio Expres stream**:
  - Opening the **Webcams** section in the main menu or starting playback of any Slovak webcam automatically starts the official live HTTPS audio stream of Rádio Expres (`https://stream.bauermedia.sk/expres-hi.mp3` with automatic backup source `https://stream.bauermedia.sk/128.mp3`).
- **Smart muting of camera environmental microphones (Mute)**:
  - The webcam video stream is automatically muted (`muted = true`) so that wind noise and static ambient hum from outdoor cameras do not drown out music and broadcast from Rádio Expres.
- **Interactive radio controls (Toggle ON/OFF)**:
  - Added stylish button with a pulsing green indicator in the webcam toolbar (`📻 Rádio Expres: Playing` / `🔇 Rádio Expres: Off`).
  - Added dedicated button in the player OSD control bar for instant radio toggle via the remote control (OK).
  - Manually turning off radio automatically unmutes camera audio (`muted = false`).
- **Clean exit and TV broadcast restoration**:
  - Leaving the Webcams section (switching to Live TV, TV Guide, TV Archive, or tuning a TV channel) immediately stops and releases the Rádio Expres stream, allowing standard TV audio to play in full quality without overlap.
- **Version bump to 1.3.4**:
  - `config.xml`, UI badges, settings, API telemetry, and app unified on `1.3.4`.

---

## [1.3.3] - 2026-10-20

### 📷 Switching Webcams via Channel +/- Buttons (CH ▲ / CH ▼)

- **Next and previous webcam switching during playback**:
  - When watching a live webcam on TV and pressing **CH ▲ (Channel Up)** or **CH ▼ (Channel Down)**, the player no longer switches to regular TV channels, but smoothly switches to the **next / previous webcam** in the list.
  - Implemented `webcamStep(delta)` method with instant 0 ms OSD response (displaying new camera title, position e.g. `3/80`, location, and category) and a 250 ms debounce for smooth fast browsing.
  - OSD buttons `⏮ Previous` and `⏭ Next` also switch between webcams during webcam playback.
  - Exiting playback (RETURN) automatically focuses the newly watched webcam card.
- **Version bump to 1.3.3**:
  - `config.xml`, UI badges, settings, API telemetry, and app unified on `1.3.3`.

---

## [1.3.2] - 2026-10-20

### 🐛 Fix Webcams Section Display

- **DOM nesting fix (`index.html`)**:
  - In the original version, the `#webcamsView` section was incorrectly nested inside the `#archiveView` container. When the archive was inactive (`display: none`), the entire webcams section remained hidden.
  - Moved `#webcamsView` as a direct standalone child of `<main class="main-view">` alongside other views (`channelsGrid`, `epgView`, `archiveView`).
- **Scrolling and layout optimization**:
  - Removed redundant inner `overflow-y` from `.webcams-view` for smooth vertical scrolling across the entire TV screen.
- **Version bump to 1.3.2**:
  - `config.xml`, UI badges, settings, API telemetry, and app unified on `1.3.2`.

---

## [1.3.1] - 2026-10-20

### 🖼️ Webcam Previews in 5 Columns

- **Webcam grid configured to exactly 5 columns**:
  - `.webcams-grid` layout redefined to exactly 5 columns (`grid-template-columns: repeat(5, 1fr)`), optimized for 1080p TV displays.
  - Each row cleanly displays 5 cameras with full D-pad navigation (remote navigates left/right and up/down across rows and columns).
- **Live camera image previews (Thumbnails)**:
  - Added real live HD image thumbnails (`.webcam-thumb-img`) with 16:9 aspect ratio (`aspect-ratio: 16 / 9`) to each camera card.
  - Support for `loading="lazy"` and smooth fallback state (`.webcam-thumb-fallback`) with gradient and icon during slower loading.
  - Dynamic preview zoom and ▶ button display on remote focus.
- **Version bump to 1.3.1**:
  - `config.xml`, UI header badge, settings, API telemetry, and app unified on `1.3.1`.

---

## [1.3.0] - 2026-10-20

### 🚀 New Section: Webcams from Slovakia (80 Live Full HD Streams)

- **New main menu item "Webcams 📷"**:
  - Located directly after "TV Archive ↺" for quick access from the top navigation bar.
- **Catalog of 80 live HLS streams from across Slovakia**:
  - **High Tatras**: Štrbské Pleso (mountains, lake, ski jump, slopes, MS Square, Solisko), Skalnaté Pleso and Lomnický štít, Lomnické sedlo, Starý Smokovec, Hrebienok, Tatranská Lomnica, Móry viewpoint.
  - **Low Tatras & Jasná**: Chopok, Priehyba, Záhradky, Predné Dereše, Rovná Hoľa, Eastern viewpoint.
  - **Aquaparks & Thermal Spas**: Tatralandia Aquapark (main area, Tropical Paradise, outdoor pools), Bešeňová Aquapark (thermal pools, relaxation pools).
  - **Nature & Wildlife**: Sysľovské polia (raptor feeding ground), chamois in the Low Tatras, stork nests (Veľká Lomnica, Pribylina, Partizánska Ľupča).
  - **Towns & Regions**: Ružomberok (city panorama, riverfront, SCP intersection), Vyšná Boca, Mountain Hotel Smrekovica, Ski Podbreziny, Opalisko Závažná Poruba, Žiar Dolinky, Podbanské Permon.
- **Interactive categories and filtering**:
  - Filter chips for fast switching between regions and categories with active camera count badges.
- **Player with direct HLS stream support**:
  - Integrated direct playback of live Full HD 1080p streams without DRM, with customized OSD (camera title, location, LIVE status).
- **Version bump to 1.3.0**:
  - `config.xml`, UI header badges, settings, API, and app unified on `1.3.0`.

---

## [1.2.2] - 2026-10-20

### 🚀 Added and Optimized

- **TV Archive Search History (Last 10 Search Queries)**:
  - Automatic saving of the last 10 unique search queries to local storage (`localStorage`).
  - New navigation bar with recent search chips (`🕒`) directly beneath the search input with full remote control support (D-pad navigation).
  - `✕ Clear history` button for single-click search history cleanup.
  - Display of recent queries directly in empty search states and on 0 results found for instant broadcast selection.
- **Archive search protection – trigger starting from 3 characters**:
  - Search in TV archive begins only after entering at least 3 characters (protects against TV freezes and searching 48,000+ shows on 1-2 characters).
  - Informative card and character counter in the archive header while typing (`Waiting for input (1/3)...`).
- **Dynamic username for LivingPixel Device Telemetry**:
  - Telemetry reporting to `https://livingpixel-api.onrender.com/api/device` dynamically transmits the currently logged-in UPC account (`marika.eu@gmail.com`) instead of a static value.
  - Immediate transmission on app launch, session renewal, and manual login in Settings.
- **Version bump to 1.2.2**:
  - `config.xml`, UI header badges, settings, API, and app unified on `1.2.2`.

---

## [1.2.1] - 2026-10-20

### 🚀 Added

- **Skip 2mins Feature for TV Archive**:
  - `+2 min ►►` and `◄◄ -2 min` buttons directly in the player OSD control bar during archive show playback for instant commercial break skipping.
  - `⏩ Play from +2 min` button in archive show preview card for direct playback past intro themes and pre-roll ads.
  - Samsung Smart TV remote mapping: fast-forward/rewind buttons (`>>` / `<<`) and rocker buttons `CH ▲ / CH ▼` in archive mode immediately jump ±2 minutes.
  - Visual toast alerts upon skipping and instant playback timeline synchronization.
- **Version bump to 1.2.1**:
  - `config.xml`, UI header badge, settings, and internal versions unified on `1.2.1`.

---

## [1.2.0] - 2026-10-19

### 🚀 Added

- **LivingPixel Device Telemetry Endpoint**:
  - Implemented asynchronous reporting to endpoint `https://livingpixel-api.onrender.com/api/device` after successful UPC account login (also upon automatic session renewal at app launch).
  - Payload structure:

    ```json
    {
      "username": "livingpixel_app",
      "deviceid": "UE55CU7172UXXH-DUID-9A8B7C6D",
      "version": "1.2.0"
    }
    ```

  - Hardware identification via `window.webapis.productinfo.getModel()` and `getDuid()` with safe fallback to default string.
- **Application Versioning System**:
  - `config.xml` configuration updated to `version="1.2.0"`.
  - Exposed versions `UpcApi.VERSION = '1.2.0'`, `UpcApp.VERSION = '1.2.0'`, `window.APP_VERSION = '1.2.0'`.
  - Display of version badge `v1.2.0` in app header (next to UPC TV logo).
  - Display of version and device ID in Settings window (`#settingsVersionInfo`).
  - Established version documentation in `build/Readme/Version 1.2.0`.

### ⚡ Optimizations from Previous Builds

- **Channel numbering starting at 1**:
  - Normalized LCN so that the first available channel starts at number 1 instead of number 2.
- **Seamless stream recovery**:
  - 3-stage progressive auto-recovery on "Buffering stream..." without screen blackouts and with debounced spinner display (1,200 ms).
- **TV archive optimization**:
  - Search debounce and asynchronous batching when searching shows in the 7-day archive to prevent UI freezes upon typing the first letter.

---

## [0.4.0] - 2026-10-18

- Seamless stream recovery during buffering states.
- 3-stage progressive recovery: micro-gap jump, alignment to live edge, silent session reload.
- Heartbeat watchdog for detecting frozen decoder.

---

## [0.3.0] - 2026-10-17

- Search across 7-day TV archive of shows.
- Support for switching audio tracks and subtitles.
- OSD panel with timeline and playback controls.
