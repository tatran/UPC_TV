/**
 * UPC TV Samsung Smart TV - Main Application Controller
 */
(function (window) {
  'use strict';

  function UpcApp() {
    this.api = new window.UpcApi();
    this.nav = new window.TvNavigation();
    this.player = null;

    this.allChannels = [];
    this.filteredChannels = [];
    this.archiveChannels = []; // Channels with replay support
    this.epgData = {}; // channelId -> array of live events
    this.favorites = [];
    this.currentChannelIndex = 0;
    this.currentCategory = 'all';
    this.currentView = 'live'; // 'live', 'epg', 'archive', 'favs'

    // TV Archív state
    this.archiveDays = [];
    this.selectedArchiveDayIndex = 0; // 0 = Dnes, 1 = Včera, etc.
    this.selectedArchiveChannel = null;
    this.selectedArchiveEvent = null;
    this.archiveSearchQuery = '';
    this.archiveSearchScope = 'week'; // 'channel', 'day', 'week' (Default: 7-day archive)
    this.archiveSearchTimer = null;
    this.archiveSearchSeqId = 0;
    this.recentSearchSaveTimer = null;
    this.pendingSearchPhrase = null;
    this.archiveDaysCache = {}; // dateStr -> events cache
    this.hasAutoStarted = false;

    this.osdTimer = null;
    this.clockTimer = null;
    this.bufferingSpinnerTimer = null;

    this.currentWebcamCategory = 'all';
    this.currentWebcamPlaying = null;

    // Random Webcams Mode with 60s timer
    this.isRandomWebcamMode = false;
    this.randomWebcamInterval = null;
    this.randomWebcamSecondsLeft = 60;
    this.randomWebcamHistory = [];

    // Slovak & Czech Radios state
    this.currentRadioCategory = 'all';
    this.currentRadioPlaying = null;
    this.isRadioPlaying = false;
    this.isPictureOffActive = false;
    this.radioPictureOffTimer = null;


    this.dom = {};
  }

  UpcApp.prototype.init = function () {
    var self = this;
    window.upcAppInstance = this;

    // Report device to LivingPixel endpoint immediately every time application opens
    if (this.api && typeof this.api.reportDevice === 'function') {
      this.api.reportDevice();
    }

    // Record app launch start action to Neon Postgres telemetry
    if (window.upcTelemetry && typeof window.upcTelemetry.recordStart === 'function') {
      window.upcTelemetry.recordStart('app', {
        userAgent: (typeof navigator !== 'undefined') ? navigator.userAgent : 'Tizen-TV',
        resolution: (typeof window !== 'undefined') ? (window.innerWidth + 'x' + window.innerHeight) : '1920x1080'
      });
    }

    this.cacheDom();
    this.initClock();
    this.initArchiveDays();
    this.loadFavorites();

    if (window.TizenKeys && typeof window.TizenKeys.init === 'function') {
      window.TizenKeys.init();
    }

    var videoEl = document.getElementById('tvVideo');
    this.player = new window.TvPlayer(videoEl, this.api);

    this.bindPlayerEvents();
    this.bindNavEvents();
    this.bindDomEvents();
    this.initPictureOffHandler();

    this.showToast('Pripájam k UPC TV...');
    this.bootUpcService();
  };

  UpcApp.prototype.cacheDom = function () {
    this.dom.clockTime = document.getElementById('clockTime');
    this.dom.clockDate = document.getElementById('clockDate');
    this.dom.channelsGrid = document.getElementById('channelsGrid');
    this.dom.categoriesBar = document.getElementById('categoriesBar');
    this.dom.epgView = document.getElementById('epgView');
    this.dom.epgChannelRows = document.getElementById('epgChannelRows');
    this.dom.epgCurrentDate = document.getElementById('epgCurrentDate');
    this.dom.playerView = document.getElementById('playerView');
    this.dom.playerOsd = document.getElementById('playerOsd');
    this.dom.playerSpinner = document.getElementById('playerSpinner');
    this.dom.spinnerText = document.getElementById('spinnerText');
    this.dom.numericOverlay = document.getElementById('numericOverlay');
    this.dom.toastBanner = document.getElementById('toastBanner');
    this.dom.settingsModal = document.getElementById('settingsModal');
    this.dom.exitModal = document.getElementById('exitModal');
    this.dom.btnExitCancel = document.getElementById('btnExitCancel');
    this.dom.btnExitConfirm = document.getElementById('btnExitConfirm');
    this.dom.userAccountText = document.getElementById('userAccountText');

    // Archive DOM elements
    this.dom.tabArchive = document.getElementById('tabArchive');
    this.dom.archiveView = document.getElementById('archiveView');
    this.dom.archiveDaysStrip = document.getElementById('archiveDaysStrip');
    this.dom.archiveChannelsPanel = document.getElementById('archiveChannelsPanel');
    this.dom.archiveChannelsList = document.getElementById('archiveChannelsList');
    this.dom.archiveChannelsCount = document.getElementById('archiveChannelsCount');
    this.dom.archiveChannelBanner = document.getElementById('archiveChannelBanner');
    this.dom.archiveBannerLogo = document.getElementById('archiveBannerLogo');
    this.dom.archiveBannerLcn = document.getElementById('archiveBannerLcn');
    this.dom.archiveBannerTitle = document.getElementById('archiveBannerTitle');
    this.dom.archiveBannerDate = document.getElementById('archiveBannerDate');
    this.dom.archiveBannerCount = document.getElementById('archiveBannerCount');
    this.dom.archiveSearchInput = document.getElementById('archiveSearchInput');
    this.dom.btnArchiveSearchClear = document.getElementById('btnArchiveSearchClear');
    this.dom.archiveRecentSearches = document.getElementById('archiveRecentSearches');
    this.dom.recentSearchesChips = document.getElementById('recentSearchesChips');
    this.dom.btnClearRecentSearches = document.getElementById('btnClearRecentSearches');
    this.dom.webcamsView = document.getElementById('webcamsView');
    this.dom.webcamsGrid = document.getElementById('webcamsGrid');
    this.dom.webcamsCountBadge = document.getElementById('webcamsCountBadge');
    this.dom.tabWebcams = document.getElementById('tabWebcams');
    this.dom.btnWebcamRandomStart = document.getElementById('btnWebcamRandomStart');
    this.dom.webcamRandomHeaderLabel = document.getElementById('webcamRandomHeaderLabel');

    // Radios DOM elements
    this.dom.tabRadios = document.getElementById('tabRadios');
    this.dom.radiosView = document.getElementById('radiosView');
    this.dom.radiosGrid = document.getElementById('radiosGrid');
    this.dom.radiosCountBadge = document.getElementById('radiosCountBadge');
    this.dom.radioPlayerBar = document.getElementById('radioPlayerBar');
    this.dom.radioAudio = document.getElementById('radioAudio');
    this.dom.btnRadioTogglePlay = document.getElementById('btnRadioTogglePlay');
    this.dom.btnRadioStop = document.getElementById('btnRadioStop');
    this.dom.btnRadioPictureOff = document.getElementById('btnRadioPictureOff');
    this.dom.pictureOffOverlay = document.getElementById('pictureOffOverlay');
    this.dom.rbarLogo = document.getElementById('rbarLogo');
    this.dom.rbarMonogram = document.getElementById('rbarMonogram');
    this.dom.rbarName = document.getElementById('rbarName');
    this.dom.rbarCountry = document.getElementById('rbarCountry');
    this.dom.rbarBadge = document.getElementById('rbarBadge');
    this.dom.rbarSub = document.getElementById('rbarSub');
    this.dom.rbarStatus = document.getElementById('rbarStatus');
    this.dom.rbarQuality = document.getElementById('rbarQuality');
    this.dom.rbarPlayIcon = document.getElementById('rbarPlayIcon');
    this.dom.rbarLogoWrap = document.getElementById('rbarLogoWrap');



    this.dom.btnScopeChannel = document.getElementById('btnScopeChannel');
    this.dom.btnScopeDay = document.getElementById('btnScopeDay');
    this.dom.btnScopeWeek = document.getElementById('btnScopeWeek');
    this.dom.archiveProgramsList = document.getElementById('archiveProgramsList');
    this.dom.archiveProgramPreview = document.getElementById('archiveProgramPreview');
    this.dom.prevGenre = document.getElementById('prevGenre');
    this.dom.prevAge = document.getElementById('prevAge');
    this.dom.prevTitle = document.getElementById('prevTitle');
    this.dom.prevTime = document.getElementById('prevTime');
    this.dom.prevDuration = document.getElementById('prevDuration');
    this.dom.prevSynopsis = document.getElementById('prevSynopsis');
    this.dom.btnPlayArchiveEvent = document.getElementById('btnPlayArchiveEvent');
    this.dom.btnPlayArchiveSkip2m = document.getElementById('btnPlayArchiveSkip2m');

    // OSD elements
    this.dom.osdLogo = document.getElementById('osdLogo');
    this.dom.osdLcn = document.getElementById('osdLcn');
    this.dom.osdChannelName = document.getElementById('osdChannelName');
    this.dom.osdReplayTag = document.getElementById('osdReplayTag');
    this.dom.osdCurrentShow = document.getElementById('osdCurrentShow');
    this.dom.osdNextShow = document.getElementById('osdNextShow');
    this.dom.osdStartTime = document.getElementById('osdStartTime');
    this.dom.osdEndTime = document.getElementById('osdEndTime');
    this.dom.osdReplayTimer = document.getElementById('osdReplayTimer');
    this.dom.osdProgress = document.getElementById('osdProgress');
    this.dom.btnOsdBack = document.getElementById('btnOsdBack');
    this.dom.btnOsdPrev = document.getElementById('btnOsdPrev');
    this.dom.btnOsdSeekBack = document.getElementById('btnOsdSeekBack');
    this.dom.btnOsdSkipBack2m = document.getElementById('btnOsdSkipBack2m');
    this.dom.btnOsdPlayPause = document.getElementById('btnOsdPlayPause');
    this.dom.btnOsdSeekForward = document.getElementById('btnOsdSeekForward');
    this.dom.btnOsdSkipForward2m = document.getElementById('btnOsdSkipForward2m');
    this.dom.btnOsdRestart = document.getElementById('btnOsdRestart');
    this.dom.btnOsdStartOver = document.getElementById('btnOsdStartOver');
    this.dom.btnOsdNext = document.getElementById('btnOsdNext');
    this.dom.btnOsdRandom = document.getElementById('btnOsdRandom');
    this.dom.osdRandomText = document.getElementById('osdRandomText');
    this.dom.btnOsdAudio = document.getElementById('btnOsdAudio');
    this.dom.btnOsdSubtitles = document.getElementById('btnOsdSubtitles');
    this.dom.btnOsdFav = document.getElementById('btnOsdFav');
    this.dom.audioModal = document.getElementById('audioModal');
    this.dom.audioTrackList = document.getElementById('audioTrackList');
    this.dom.audioModalTrackCount = document.getElementById('audioModalTrackCount');
    this.dom.btnAudioModalClose = document.getElementById('btnAudioModalClose');
    this.dom.subtitlesModal = document.getElementById('subtitlesModal');
    this.dom.subtitlesTrackList = document.getElementById('subtitlesTrackList');
    this.dom.subtitlesModalTrackCount = document.getElementById('subtitlesModalTrackCount');
    this.dom.btnSubtitlesModalClose = document.getElementById('btnSubtitlesModalClose');
  };

  UpcApp.prototype.initClock = function () {
    var self = this;
    function updateClock() {
      var d = new Date();
      var hours = ('0' + d.getHours()).slice(-2);
      var minutes = ('0' + d.getMinutes()).slice(-2);
      if (self.dom.clockTime) self.dom.clockTime.textContent = hours + ':' + minutes;

      var days = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
      var months = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
      var dateStr = days[d.getDay()] + ', ' + d.getDate() + '. ' + months[d.getMonth()];
      if (self.dom.clockDate) self.dom.clockDate.textContent = dateStr;
      if (self.dom.epgCurrentDate) self.dom.epgCurrentDate.textContent = dateStr;
    }

    updateClock();
    this.clockTimer = setInterval(updateClock, 1000);
  };

  UpcApp.prototype.initArchiveDays = function () {
    this.archiveDays = [];
    var dayNames = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
    var monthNames = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];

    var now = new Date();
    for (var i = 0; i < 7; i++) {
      var d = new Date(now.getTime() - i * 86400000);
      var ymd = d.getUTCFullYear() +
        ('0' + (d.getUTCMonth() + 1)).slice(-2) +
        ('0' + d.getUTCDate()).slice(-2);

      var pillLabel = '';
      if (i === 0) {
        pillLabel = 'Dnes';
      } else if (i === 1) {
        pillLabel = 'Včera';
      } else {
        pillLabel = dayNames[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.';
      }

      var fullDateText = (i === 0 ? 'Dnes, ' : (i === 1 ? 'Včera, ' : '')) +
        dayNames[d.getDay()] + ', ' + d.getDate() + '. ' + monthNames[d.getMonth()];

      this.archiveDays.push({
        index: i,
        dateStr: ymd,
        label: pillLabel,
        fullDateText: fullDateText,
        date: d
      });
    }
  };

  UpcApp.prototype.loadFavorites = function () {
    try {
      var favs = localStorage.getItem('upctv_favs');
      if (favs) this.favorites = JSON.parse(favs);
    } catch (e) {
      this.favorites = [];
    }
  };

  UpcApp.prototype.saveFavorites = function () {
    try {
      localStorage.setItem('upctv_favs', JSON.stringify(this.favorites));
    } catch (e) { }
  };

  UpcApp.prototype.toggleFavorite = function (channelId) {
    var idx = this.favorites.indexOf(channelId);
    if (idx >= 0) {
      this.favorites.splice(idx, 1);
      this.showToast('Odstránené z obľúbených');
    } else {
      this.favorites.push(channelId);
      this.showToast('Pridané medzi obľúbené stanice ★');
    }
    this.saveFavorites();
    this.updateOsdFavoriteButton();
    if (this.currentView === 'favs') {
      this.filterChannels();
    }
  };

  UpcApp.prototype.bootUpcService = function () {
    var self = this;
    var creds = this.api.getStoredCredentials();
    if (this.dom.userAccountText) this.dom.userAccountText.textContent = creds.username;

    // Send device checkin message to LivingPixel endpoint every time service boots
    this.api.reportDevice();

    var tokens = this.api.getTokens();
    if (!tokens.accessToken || !tokens.householdId || !tokens.profileId || !tokens.entitlementsToken) {
      console.log('[UpcApp] Missing essential session tokens, performing login...');
      this.loginAndReload();
      return;
    }

    // Existing authenticated session: perform device checkin
    this.api.reportDevice();

    // First attempt to get channels directly
    this.api.getChannels().then(function (channels) {
      if (channels && channels.length > 0) {
        self.handleChannelsLoaded(channels);
      } else {
        return self.loginAndReload();
      }
    }).catch(function (err) {
      console.warn('[UpcApp] Direct channel fetch failed, authenticating:', err);
      self.loginAndReload();
    });
  };

  UpcApp.prototype.loginAndReload = function () {
    var self = this;
    this.showSpinner('Prihlasujem k UPC účtu...');
    return this.api.login().then(function () {
      self.api.reportDevice();
      return self.api.getChannels();
    }).then(function (channels) {
      self.hideSpinner();
      self.handleChannelsLoaded(channels);
    }).catch(function (err) {
      self.hideSpinner();
      self.showToast('Chyba prihlásenia: ' + err.message);
      self.openSettingsModal();
    });
  };

  UpcApp.prototype.handleChannelsLoaded = function (channels) {
    // Ensure channel numbering starts from 1 instead of 2
    if (channels && channels.length > 0) {
      var minLcn = Infinity;
      channels.forEach(function (ch) {
        if (typeof ch.logicalChannelNumber === 'number' && ch.logicalChannelNumber < minLcn) {
          minLcn = ch.logicalChannelNumber;
        }
      });
      if (minLcn > 1 && minLcn < 100) {
        var offset = minLcn - 1;
        channels.forEach(function (ch) {
          if (typeof ch.logicalChannelNumber === 'number') {
            ch.logicalChannelNumber -= offset;
          }
        });
      }
    }

    this.allChannels = channels;
    this.archiveChannels = channels.filter(function (ch) {
      return Array.isArray(ch.replayProducts) && ch.replayProducts.length > 0;
    });

    if (this.dom.archiveChannelsCount) {
      this.dom.archiveChannelsCount.textContent = this.archiveChannels.length + ' staníc';
    }

    if (!this.selectedArchiveChannel && this.archiveChannels.length > 0) {
      this.selectedArchiveChannel = this.archiveChannels[0];
    }

    this.filterChannels();
    this.showToast('Načítaných ' + channels.length + ' TV staníc (' + this.archiveChannels.length + ' v archíve)');
    this.loadLiveEpg();

    // Auto-start last played channel/program on app launch
    if (!this.hasAutoStarted) {
      this.hasAutoStarted = true;
      var self = this;
      setTimeout(function () {
        self.autoStartLastPlayed();
      }, 150);
    }
  };

  UpcApp.prototype.autoStartLastPlayed = function () {
    var lastPlayedRaw = null;
    var lastChannelId = null;
    try {
      lastPlayedRaw = localStorage.getItem('upc_last_played');
      lastChannelId = localStorage.getItem('upc_last_played_channel');
    } catch (e) { }

    var lastPlayed = null;
    try {
      if (lastPlayedRaw) lastPlayed = JSON.parse(lastPlayedRaw);
    } catch (e) { }

    // 1. Check if last played was a webcam
    if (lastPlayed && lastPlayed.type === 'webcam' && lastPlayed.id) {
      var webcams = window.SLOVAK_WEBCAMS || [];
      var targetCam = null;
      for (var w = 0; w < webcams.length; w++) {
        if (webcams[w].id === lastPlayed.id) {
          targetCam = webcams[w];
          break;
        }
      }
      if (targetCam) {
        console.log('[UpcApp] Auto-starting last played webcam on app launch:', targetCam.name);
        this.switchView('webcams');
        this.playWebcam(targetCam);
        return;
      }
    }

    // 1b. Check if last played was a radio
    if (lastPlayed && lastPlayed.type === 'radio' && lastPlayed.id) {
      var radios = window.SK_CZ_RADIOS || [];
      var targetRadio = null;
      for (var r = 0; r < radios.length; r++) {
        if (radios[r].id === lastPlayed.id) {
          targetRadio = radios[r];
          break;
        }
      }
      if (targetRadio) {
        console.log('[UpcApp] Auto-starting last played radio on app launch:', targetRadio.name);
        this.switchView('radios');
        this.playRadio(targetRadio);
        return;
      }
    }

    // 2. Target TV channel (stored or default to first channel)
    var targetId = (lastPlayed && lastPlayed.type === 'channel' && lastPlayed.id) || lastChannelId;
    var targetChannel = null;
    var targetIndex = 0;

    if (targetId && this.allChannels && this.allChannels.length > 0) {
      for (var i = 0; i < this.allChannels.length; i++) {
        if (this.allChannels[i].id === targetId) {
          targetChannel = this.allChannels[i];
          targetIndex = i;
          break;
        }
      }
    }

    // Fallback to first channel in list if not found
    if (!targetChannel && this.allChannels && this.allChannels.length > 0) {
      targetChannel = this.allChannels[0];
      targetIndex = 0;
    }

    if (targetChannel) {
      console.log('[UpcApp] Auto-starting last played TV channel on launch:', targetChannel.name);
      this.currentChannelIndex = targetIndex;
      this.tuneChannel(targetChannel);
    }
  };

  UpcApp.prototype.filterChannels = function () {
    var self = this;
    var list = this.allChannels;

    if (this.currentView === 'favs') {
      list = list.filter(function (ch) {
        return self.favorites.indexOf(ch.id) >= 0;
      });
    } else if (this.currentCategory !== 'all') {
      list = list.filter(function (ch) {
        return self.matchesCategory(ch, self.currentCategory);
      });
    }

    this.filteredChannels = list;
    this.renderChannelsGrid();
  };

  UpcApp.prototype.matchesCategory = function (channel, cat) {
    var name = (channel.name || '').toLowerCase();
    var genres = (channel.genre || []).map(function (g) { return g.toLowerCase(); });
    var genreStr = genres.join(' ');

    switch (cat) {
      case 'sports':
        return genreStr.indexOf('šport') >= 0 || genreStr.indexOf('sport') >= 0 || name.indexOf('sport') >= 0 || name.indexOf('arena') >= 0 || name.indexOf('eurosport') >= 0;
      case 'movies':
        return genreStr.indexOf('film') >= 0 || genreStr.indexOf('seriál') >= 0 || name.indexOf('cinema') >= 0 || name.indexOf('film') >= 0 || name.indexOf('hbo') >= 0;
      case 'news':
        return genreStr.indexOf('spravodaj') >= 0 || genreStr.indexOf('správy') >= 0 || name.indexOf('24') >= 0 || name.indexOf('news') >= 0 || name.indexOf('ta3') >= 0;
      case 'kids':
        return genreStr.indexOf('det') >= 0 || name.indexOf('junior') >= 0 || name.indexOf('disney') >= 0 || name.indexOf('nickelodeon') >= 0 || name.indexOf('minimax') >= 0 || name.indexOf('duck') >= 0;
      case 'docs':
        return genreStr.indexOf('dokument') >= 0 || name.indexOf('nat geo') >= 0 || name.indexOf('discovery') >= 0 || name.indexOf('history') >= 0 || name.indexOf('spektrum') >= 0;
      case 'music':
        return genreStr.indexOf('hudob') >= 0 || name.indexOf('music') >= 0 || name.indexOf('mtv') >= 0 || name.indexOf('retro') >= 0 || name.indexOf('šláger') >= 0;
      case 'general':
      default:
        return true;
    }
  };

  UpcApp.prototype.renderChannelsGrid = function () {
    var self = this;
    var container = this.dom.channelsGrid;
    container.innerHTML = '';

    if (this.filteredChannels.length === 0) {
      var emptyEl = document.createElement('div');
      emptyEl.style.gridColumn = '1 / -1';
      emptyEl.style.padding = '60px 0';
      emptyEl.style.textAlign = 'center';
      emptyEl.style.color = 'var(--text-secondary)';
      emptyEl.textContent = this.currentView === 'favs' ? 'Žiadne obľúbené stanice. Stlačte žlté tlačidlo (alebo hviezdičku v OSD) na pridanie.' : 'Pre túto kategóriu sa nenašli žiadne stanice.';
      container.appendChild(emptyEl);
      return;
    }

    this.filteredChannels.forEach(function (ch, index) {
      var card = document.createElement('div');
      card.className = 'channel-card';
      card.setAttribute('data-nav', '');
      card.setAttribute('data-channel-id', ch.id);
      card.setAttribute('data-index', index);

      var lcn = ch.logicalChannelNumber || (index + 1);
      var logoUrl = (ch.logo && ch.logo.focused) || 'icon.png';
      var isFav = self.favorites.indexOf(ch.id) >= 0;

      // Current show info if available
      var showTitle = 'Živé vysielanie UPC';
      var timeRange = '';
      var progressPct = 50;

      var events = self.epgData[ch.id];
      if (events && events.length > 0) {
        var now = Math.floor(Date.now() / 1000);
        for (var i = 0; i < events.length; i++) {
          var ev = events[i];
          if (ev.startTime <= now && ev.endTime >= now) {
            showTitle = ev.title;
            var start = new Date(ev.startTime * 1000);
            var end = new Date(ev.endTime * 1000);
            timeRange = ('0' + start.getHours()).slice(-2) + ':' + ('0' + start.getMinutes()).slice(-2) + ' - ' +
              ('0' + end.getHours()).slice(-2) + ':' + ('0' + end.getMinutes()).slice(-2);
            var total = ev.endTime - ev.startTime;
            var elapsed = now - ev.startTime;
            progressPct = Math.min(100, Math.max(5, Math.floor((elapsed / total) * 100)));
            break;
          }
        }
      }

      card.innerHTML =
        '<div class="card-top">' +
        '<span class="lcn-badge">' + lcn + (isFav ? ' ★' : '') + '</span>' +
        '<div class="channel-logo-wrap">' +
        '<img class="channel-logo-img" src="' + logoUrl + '" alt="' + ch.name + '" onerror="this.src=\'icon.png\'">' +
        '</div>' +
        '</div>' +
        '<div class="card-info">' +
        '<div class="channel-name">' + ch.name + '</div>' +
        '<div class="current-program-title">' + showTitle + '</div>' +
        '<div class="progress-container"><div class="progress-bar-fill" style="width:' + progressPct + '%"></div></div>' +
        '<div class="program-time-range"><span>' + (timeRange ? timeRange.split(' - ')[0] : 'LIVE') + '</span><span>' + (timeRange ? timeRange.split(' - ')[1] : '') + '</span></div>' +
        '</div>';

      card.addEventListener('click', function () {
        self.tuneChannelByIndex(index);
      });

      container.appendChild(card);
    });

    // Auto-focus the first channel card
    var firstCard = container.querySelector('.channel-card');
    if (firstCard && !this.dom.playerView.classList.contains('active')) {
      this.nav.setFocus(firstCard, false);
    }
  };

  UpcApp.prototype.loadLiveEpg = function () {
    var self = this;
    this.api.getCurrentEpg().then(function (entries) {
      if (Array.isArray(entries)) {
        entries.forEach(function (entry) {
          if (entry.channelId && entry.events) {
            self.epgData[entry.channelId] = entry.events;
          }
        });
        self.renderChannelsGrid();
        if (self.currentView === 'epg') {
          self.renderEpgView();
        }
      }
    }).catch(function (err) {
      console.warn('[UpcApp] EPG fetch warning:', err);
    });
  };

  UpcApp.prototype.renderEpgView = function () {
    var self = this;
    var container = this.dom.epgChannelRows;
    container.innerHTML = '';

    this.allChannels.slice(0, 35).forEach(function (ch) {
      var row = document.createElement('div');
      row.className = 'epg-row';
      row.setAttribute('data-nav', '');

      var logoUrl = (ch.logo && ch.logo.focused) || 'icon.png';
      var lcn = ch.logicalChannelNumber || '';

      var events = self.epgData[ch.id] || [];
      var eventsHtml = '';

      if (events.length === 0) {
        eventsHtml = '<div class="epg-event-item"><div class="epg-event-title">Živé televízne vysielanie</div></div>';
      } else {
        events.slice(0, 5).forEach(function (ev, idx) {
          var start = new Date(ev.startTime * 1000);
          var end = new Date(ev.endTime * 1000);
          var timeStr = ('0' + start.getHours()).slice(-2) + ':' + ('0' + start.getMinutes()).slice(-2);
          var isCurrent = idx === 0;
          eventsHtml +=
            '<div class="epg-event-item ' + (isCurrent ? 'current' : '') + '">' +
            '<div class="epg-event-time">' + timeStr + '</div>' +
            '<div class="epg-event-title">' + ev.title + '</div>' +
            '</div>';
        });
      }

      row.innerHTML =
        '<div class="epg-ch-badge">' +
        '<span class="lcn-badge">' + lcn + '</span>' +
        '<img src="' + logoUrl + '" style="max-height:32px; max-width:80px; object-fit:contain;" onerror="this.src=\'icon.png\'">' +
        '<span style="font-weight:700; font-size:16px;">' + ch.name + '</span>' +
        '</div>' +
        '<div class="epg-events-list">' + eventsHtml + '</div>';

      row.addEventListener('click', function () {
        var idx = self.allChannels.indexOf(ch);
        if (idx >= 0) self.tuneChannelByIndex(idx);
      });

      container.appendChild(row);
    });

    var firstRow = container.querySelector('.epg-row');
    if (firstRow) this.nav.setFocus(firstRow);
  };

  UpcApp.prototype.tuneChannelByIndex = function (index) {
    var list = (this.filteredChannels && this.filteredChannels.length > 0) ? this.filteredChannels : this.allChannels;
    if (index < 0 || index >= list.length) return;
    this.currentChannelIndex = index;
    var ch = list[index];
    this.tuneChannel(ch);
  };

  UpcApp.prototype.tuneChannel = function (channel) {
    var self = this;
    this.stopRadio();
    if (this.channelStepTimer) {
      clearTimeout(this.channelStepTimer);
      this.channelStepTimer = null;
    }
    this.currentWebcamPlaying = null;
    this.currentMoviePlaying = null;

    if (channel && channel.id) {
      try {
        localStorage.setItem('upc_last_played', JSON.stringify({ type: 'channel', id: channel.id }));
        localStorage.setItem('upc_last_played_channel', channel.id);
      } catch (e) { }

      if (window.upcTelemetry && typeof window.upcTelemetry.recordStart === 'function') {
        window.upcTelemetry.recordStart('channel', {
          channelId: channel.id,
          channelName: channel.name,
          lcn: channel.logicalChannelNumber
        });
      }
    }

    this.openPlayerView();
    this.updateOsd(channel);
    this.showOsd();

    this.player.playChannel(channel).catch(function (err) {
      self.showToast('Chyba prehrávania: ' + err.message);
    });
  };

  UpcApp.prototype.formatSeconds = function (sec) {
    if (isNaN(sec) || sec < 0) sec = 0;
    var s = Math.floor(sec);
    var hrs = Math.floor(s / 3600);
    var mins = Math.floor((s % 3600) / 60);
    var secs = s % 60;
    if (hrs > 0) {
      return ('0' + hrs).slice(-2) + ':' + ('0' + mins).slice(-2) + ':' + ('0' + secs).slice(-2);
    }
    return ('0' + mins).slice(-2) + ':' + ('0' + secs).slice(-2);
  };

  UpcApp.prototype.formatTime = function (timestampSec) {
    if (!timestampSec) return '--:--';
    var d = new Date(timestampSec * 1000);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  };

  UpcApp.prototype.updateOsd = function (channel) {
    var self = this;
    var logoUrl = (channel.logo && channel.logo.focused) || 'icon.png';
    this.dom.osdLogo.src = logoUrl;
    this.dom.osdLcn.textContent = channel.logicalChannelNumber || '';
    this.dom.osdChannelName.textContent = channel.name;

    // Reset replay OSD indicators for live TV
    if (this.dom.osdReplayTag) this.dom.osdReplayTag.style.display = 'none';
    if (this.dom.osdReplayTimer) this.dom.osdReplayTimer.style.display = 'none';
    if (this.dom.btnOsdSkipBack2m) this.dom.btnOsdSkipBack2m.style.display = 'none';
    if (this.dom.btnOsdSeekBack) this.dom.btnOsdSeekBack.style.display = 'none';
    if (this.dom.btnOsdSeekForward) this.dom.btnOsdSeekForward.style.display = 'none';
    if (this.dom.btnOsdSkipForward2m) this.dom.btnOsdSkipForward2m.style.display = 'none';
    if (this.dom.btnOsdRestart) this.dom.btnOsdRestart.style.display = 'none';
    if (this.dom.btnOsdPrev) this.dom.btnOsdPrev.style.display = 'inline-block';
    if (this.dom.btnOsdNext) this.dom.btnOsdNext.style.display = 'inline-block';
    if (this.dom.btnOsdAudio) this.dom.btnOsdAudio.style.display = 'inline-block';
    if (this.dom.btnOsdSubtitles) this.dom.btnOsdSubtitles.style.display = 'inline-block';
    if (this.dom.btnOsdFav) this.dom.btnOsdFav.style.display = 'inline-block';

    var currentTitle = 'Živé vysielanie UPC';
    var nextTitle = '';
    var timeStart = '--:--';
    var timeEnd = '--:--';
    var progressPct = 50;
    var currentLiveShow = null;

    var events = this.epgData[channel.id];
    if (events && events.length > 0) {
      var now = Math.floor(Date.now() / 1000);
      for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        if (ev.startTime <= now && ev.endTime >= now) {
          currentLiveShow = ev;
          currentTitle = ev.title;
          var start = new Date(ev.startTime * 1000);
          var end = new Date(ev.endTime * 1000);
          timeStart = ('0' + start.getHours()).slice(-2) + ':' + ('0' + start.getMinutes()).slice(-2);
          timeEnd = ('0' + end.getHours()).slice(-2) + ':' + ('0' + end.getMinutes()).slice(-2);
          var total = ev.endTime - ev.startTime;
          var elapsed = now - ev.startTime;
          progressPct = Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)));

          if (events[i + 1]) {
            var nStart = new Date(events[i + 1].startTime * 1000);
            var nTime = ('0' + nStart.getHours()).slice(-2) + ':' + ('0' + nStart.getMinutes()).slice(-2);
            nextTitle = 'Nasleduje (' + nTime + '): ' + events[i + 1].title;
          }
          break;
        }
      }
    }

    this.dom.osdCurrentShow.textContent = currentTitle;
    this.dom.osdStartTime.textContent = timeStart;
    this.dom.osdEndTime.textContent = timeEnd;
    this.dom.osdProgress.style.width = progressPct + '%';
    this.dom.osdNextShow.textContent = nextTitle || 'Nasleduje: Program nie je k dispozícii';

    // Show Start Over button if channel has replay and live show exists
    var hasReplay = Array.isArray(channel.replayProducts) && channel.replayProducts.length > 0;
    if (this.dom.btnOsdStartOver) {
      if (hasReplay && currentLiveShow) {
        this.dom.btnOsdStartOver.style.display = 'inline-block';
        this.dom.btnOsdStartOver.textContent = '↺ Spustiť od začiatku (Restart)';
      } else {
        this.dom.btnOsdStartOver.style.display = 'none';
      }
    }

    this.updateOsdFavoriteButton();
    this.updateAudioButton();
    this.updateSubtitlesButton();
  };

  UpcApp.prototype.updateOsdForReplay = function (channel, event) {
    var logoUrl = (channel.logo && channel.logo.focused) || 'icon.png';
    this.dom.osdLogo.src = logoUrl;
    this.dom.osdLcn.textContent = channel.logicalChannelNumber || '';
    this.dom.osdChannelName.textContent = channel.name;

    if (this.dom.osdReplayTag) this.dom.osdReplayTag.style.display = 'inline-block';
    if (this.dom.osdReplayTimer) {
      this.dom.osdReplayTimer.style.display = 'inline-block';
      this.dom.osdReplayTimer.textContent = '00:00 / 00:00';
    }

    this.dom.osdCurrentShow.textContent = event.title || 'Archívny program';
    this.dom.osdStartTime.textContent = this.formatTime(event.startTime);
    this.dom.osdEndTime.textContent = this.formatTime(event.endTime);
    this.dom.osdProgress.style.width = '0%';
    this.dom.osdNextShow.textContent = 'Relácia z archívu UPC TV • ' + (event.genres ? event.genres.join(', ') : 'TV program');

    // Transport buttons visibility in Replay mode
    if (this.dom.btnOsdSkipBack2m) this.dom.btnOsdSkipBack2m.style.display = 'inline-block';
    if (this.dom.btnOsdSeekBack) this.dom.btnOsdSeekBack.style.display = 'inline-block';
    if (this.dom.btnOsdSeekForward) this.dom.btnOsdSeekForward.style.display = 'inline-block';
    if (this.dom.btnOsdSkipForward2m) this.dom.btnOsdSkipForward2m.style.display = 'inline-block';
    if (this.dom.btnOsdRestart) this.dom.btnOsdRestart.style.display = 'inline-block';
    if (this.dom.btnOsdStartOver) this.dom.btnOsdStartOver.style.display = 'none';
    if (this.dom.btnOsdPrev) this.dom.btnOsdPrev.style.display = 'none';
    if (this.dom.btnOsdNext) this.dom.btnOsdNext.style.display = 'none';
    if (this.dom.btnOsdAudio) this.dom.btnOsdAudio.style.display = 'inline-block';
    if (this.dom.btnOsdSubtitles) this.dom.btnOsdSubtitles.style.display = 'inline-block';
    if (this.dom.btnOsdFav) this.dom.btnOsdFav.style.display = 'inline-block';

    this.updateOsdFavoriteButton();
    this.updateAudioButton();
    this.updateSubtitlesButton();
  };

  UpcApp.prototype.playArchiveEvent = function (channel, event, initialOffset) {
    var self = this;
    if (!channel || !event) return;
    this.stopRadio();
    this.currentWebcamPlaying = null;
    this.currentMoviePlaying = null;

    // Default to skipping the first 60 seconds of any selected archive program unless explicitly specified
    var offset = (typeof initialOffset === 'number') ? initialOffset : 60;

    if (channel && channel.id) {
      try {
        localStorage.setItem('upc_last_played', JSON.stringify({ type: 'channel', id: channel.id }));
        localStorage.setItem('upc_last_played_channel', channel.id);
      } catch (e) { }

      if (window.upcTelemetry && typeof window.upcTelemetry.recordStart === 'function') {
        window.upcTelemetry.recordStart('replay', {
          channelId: channel.id,
          channelName: channel.name,
          lcn: channel.logicalChannelNumber,
          programId: event ? event.id : null,
          programTitle: event ? event.title : null,
          offsetSeconds: offset
        });
      }
    }

    this.openPlayerView();
    this.updateOsdForReplay(channel, event);
    this.showOsd();

    if (offset === 60) {
      this.showToast('⏩ Spúšťam archív s preskočením 60s úvodu (+1:00)');
    } else if (offset === 120) {
      this.showToast('⏩ Spúšťam archív s preskočením 2 minút (+2:00)');
    } else if (offset > 0) {
      this.showToast('⏩ Spúšťam archív (+ ' + this.formatSeconds(offset) + ')');
    }

    this.player.playReplay(channel, event, offset).catch(function (err) {
      self.showToast('Chyba prehrávania z archívu: ' + err.message);
    });
  };

  UpcApp.prototype.startOverCurrentLiveShow = function () {
    var channel = this.player.currentChannel;
    if (!channel) return;
    var events = this.epgData[channel.id];
    if (!events || events.length === 0) {
      this.showToast('Pre túto stanicu nie sú k dispozícii údaje o programe.');
      return;
    }
    var now = Math.floor(Date.now() / 1000);
    var currentShow = null;
    for (var i = 0; i < events.length; i++) {
      if (events[i].startTime <= now && events[i].endTime >= now) {
        currentShow = events[i];
        break;
      }
    }
    if (!currentShow) {
      this.showToast('Aktuálne vysielaná relácia sa nenašla.');
      return;
    }
    this.showToast('Spúšťam reláciu od začiatku: ' + currentShow.title);
    this.playArchiveEvent(channel, currentShow, 0);
  };

  UpcApp.prototype.renderArchiveView = function () {
    this.renderArchiveDays();
    this.renderArchiveChannelsList();
    this.renderRecentSearches();
    this.setArchiveSearchScope(this.archiveSearchScope || 'week');
    if (this.selectedArchiveChannel) {
      this.updateArchiveBanner();
      this.loadAndRenderArchivePrograms();
    }
  };

  UpcApp.prototype.renderArchiveDays = function () {
    var self = this;
    var container = this.dom.archiveDaysStrip;
    if (!container) return;
    container.innerHTML = '';

    this.archiveDays.forEach(function (day, index) {
      var pill = document.createElement('button');
      pill.className = 'archive-day-pill' + (index === self.selectedArchiveDayIndex ? ' active' : '');
      pill.setAttribute('data-nav', '');
      pill.setAttribute('data-day-index', index);
      pill.textContent = day.label;

      pill.addEventListener('click', function () {
        self.selectedArchiveDayIndex = index;
        container.querySelectorAll('.archive-day-pill').forEach(function (p) {
          p.classList.remove('active');
        });
        pill.classList.add('active');
        self.updateArchiveBanner();
        if (self.archiveSearchQuery) {
          self.executeArchiveSearch();
        } else {
          self.loadAndRenderArchivePrograms();
        }
      });

      container.appendChild(pill);
    });
  };

  UpcApp.prototype.renderArchiveChannelsList = function () {
    var self = this;
    var container = this.dom.archiveChannelsList;
    if (!container) return;
    container.innerHTML = '';

    if (this.archiveChannels.length === 0) {
      container.innerHTML = '<div style="padding:20px; color:var(--text-secondary); text-align:center;">Žiadne stanice s archívom</div>';
      return;
    }

    this.archiveChannels.forEach(function (ch, index) {
      var card = document.createElement('div');
      var isSelected = self.selectedArchiveChannel && (self.selectedArchiveChannel.id === ch.id);
      card.className = 'archive-ch-card' + (isSelected ? ' active' : '');
      card.setAttribute('data-nav', '');
      card.setAttribute('data-channel-id', ch.id);

      var lcn = ch.logicalChannelNumber || (index + 1);
      var logoUrl = (ch.logo && ch.logo.focused) || 'icon.png';

      card.innerHTML =
        '<span class="lcn-badge">' + lcn + '</span>' +
        '<div class="archive-ch-logo-wrap">' +
        '<img class="archive-ch-logo-img" src="' + logoUrl + '" alt="' + ch.name + '" onerror="this.src=\'icon.png\'">' +
        '</div>' +
        '<span class="archive-ch-name">' + ch.name + '</span>';

      card.addEventListener('click', function () {
        self.selectedArchiveChannel = ch;
        container.querySelectorAll('.archive-ch-card').forEach(function (c) {
          c.classList.remove('active');
        });
        card.classList.add('active');
        self.updateArchiveBanner();
        if (self.archiveSearchQuery && self.archiveSearchScope === 'channel') {
          self.executeArchiveSearch();
        } else {
          self.loadAndRenderArchivePrograms();
        }
      });

      container.appendChild(card);
    });
  };

  UpcApp.prototype.updateArchiveBanner = function () {
    var ch = this.selectedArchiveChannel;
    if (!ch) return;
    var dayObj = this.archiveDays[this.selectedArchiveDayIndex] || this.archiveDays[0];

    if (this.dom.archiveBannerLogo) {
      this.dom.archiveBannerLogo.src = (ch.logo && ch.logo.focused) || 'icon.png';
    }
    if (this.dom.archiveBannerLcn) {
      this.dom.archiveBannerLcn.textContent = ch.logicalChannelNumber || '';
    }

    if (this.archiveSearchQuery) {
      var scope = this.archiveSearchScope || 'week';
      if (this.dom.archiveBannerTitle) {
        if (scope === 'week') {
          this.dom.archiveBannerTitle.textContent = 'Výsledky v 7-dňovom archíve';
        } else if (scope === 'day') {
          this.dom.archiveBannerTitle.textContent = 'Hľadanie na všetkých staniciach';
        } else {
          this.dom.archiveBannerTitle.textContent = ch.name;
        }
      }
      if (this.dom.archiveBannerDate) {
        this.dom.archiveBannerDate.textContent = 'Hľadanie: "' + this.archiveSearchQuery + '" • ' + (scope === 'week' ? 'Posledných 7 dní' : dayObj.fullDateText);
      }
    } else {
      if (this.dom.archiveBannerTitle) {
        this.dom.archiveBannerTitle.textContent = ch.name;
      }
      if (this.dom.archiveBannerDate) {
        this.dom.archiveBannerDate.textContent = dayObj.fullDateText;
      }
      if (this.dom.archiveBannerCount) {
        this.dom.archiveBannerCount.textContent = 'Načítavam program...';
      }
    }
  };

  UpcApp.prototype.removeDiacritics = function (str) {
    if (!str) return '';
    try {
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    } catch (e) {
      return str.toLowerCase();
    }
  };

  UpcApp.prototype.highlightMatch = function (text, query) {
    if (!text) return '';
    if (!query) return text;
    var normText = this.removeDiacritics(text);
    var normQuery = this.removeDiacritics(query).trim();
    if (!normQuery) return text;
    var idx = normText.indexOf(normQuery);
    if (idx === -1) return text;
    var matchPart = text.substr(idx, normQuery.length);
    return text.substring(0, idx) + '<span class="search-highlight">' + matchPart + '</span>' + text.substring(idx + normQuery.length);
  };

  UpcApp.prototype.fetchEpgDayCached = function (dateStr) {
    var self = this;
    if (this.archiveDaysCache[dateStr]) {
      return Promise.resolve(this.archiveDaysCache[dateStr]);
    }
    return this.api.getEpgDay(dateStr).then(function (events) {
      self.archiveDaysCache[dateStr] = events;
      return events;
    });
  };

  UpcApp.prototype.escapeHtml = function (str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  UpcApp.prototype.collapseRecentSearches = function (list) {
    if (!Array.isArray(list)) return [];
    var self = this;
    var result = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item || typeof item !== 'string') continue;
      var trimmed = item.trim();
      var norm = self.removeDiacritics(trimmed).trim();
      if (norm.length < 3) continue;

      // Zisti, či tento výraz nie je len kratším medzistupňom/prefixom iného výrazu v zozname (napr. "zah" pri "zahady")
      var isPrefixOfAnother = false;
      for (var j = 0; j < list.length; j++) {
        if (i === j) continue;
        var otherItem = list[j];
        if (!otherItem || typeof otherItem !== 'string') continue;
        var otherNorm = self.removeDiacritics(otherItem.trim()).trim();
        if (otherNorm.length > norm.length && otherNorm.indexOf(norm) === 0) {
          isPrefixOfAnother = true;
          break;
        }
      }

      if (!isPrefixOfAnother) {
        var alreadyInResult = result.some(function (r) {
          return self.removeDiacritics(r.trim()).trim() === norm;
        });
        if (!alreadyInResult) {
          result.push(trimmed);
        }
      }
    }
    return result;
  };

  UpcApp.prototype.getRecentSearches = function () {
    try {
      var raw = localStorage.getItem('upctv_recent_archive_searches');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return this.collapseRecentSearches(parsed).slice(0, 10);
        }
      }
    } catch (e) {
      console.warn('[UpcApp] Failed to load recent searches:', e);
    }
    return [];
  };

  UpcApp.prototype.saveRecentSearch = function (phrase) {
    if (!phrase) return;
    var p = phrase.trim();
    if (p.length < 3) return;

    var self = this;
    var pNorm = this.removeDiacritics(p).trim();

    try {
      var list = this.getRecentSearches();

      // Odstráň existujúce položky, ktoré sú buď identické, alebo sú prefixom/rozšírením
      list = list.filter(function (item) {
        if (!item) return false;
        var itemNorm = self.removeDiacritics(item).trim();
        if (itemNorm === pNorm) return false;
        // Ak je existujúci výraz prefixom nového (napr. staré "zah", "zaha", "zahad" pri novom "zahady")
        if (pNorm.indexOf(itemNorm) === 0) return false;
        // Ak je nový výraz prefixom existujúceho (napr. umazávanie písmen)
        if (itemNorm.indexOf(pNorm) === 0) return false;
        return true;
      });

      list.unshift(p);
      list = this.collapseRecentSearches(list).slice(0, 10);
      localStorage.setItem('upctv_recent_archive_searches', JSON.stringify(list));
      this.renderRecentSearches();
    } catch (e) {
      console.warn('[UpcApp] Failed to save recent search:', e);
    }
  };

  UpcApp.prototype.scheduleRecentSearchSave = function (phrase) {
    var self = this;
    if (this.recentSearchSaveTimer) {
      clearTimeout(this.recentSearchSaveTimer);
      this.recentSearchSaveTimer = null;
    }
    if (!phrase || phrase.trim().length < 3) return;
    var p = phrase.trim();
    this.pendingSearchPhrase = p;

    // Počkaj 1500 ms po dopísaní, aby sa neukladali medzistupne (zah, zaha, zahad) pri písaní na TV ovládači
    this.recentSearchSaveTimer = setTimeout(function () {
      if (self.pendingSearchPhrase) {
        self.saveRecentSearch(self.pendingSearchPhrase);
        self.pendingSearchPhrase = null;
      }
    }, 1500);
  };

  UpcApp.prototype.commitPendingSearch = function () {
    if (this.recentSearchSaveTimer) {
      clearTimeout(this.recentSearchSaveTimer);
      this.recentSearchSaveTimer = null;
    }
    var phrase = this.pendingSearchPhrase || (this.archiveSearchQuery ? this.archiveSearchQuery.trim() : '');
    if (phrase && phrase.length >= 3) {
      this.saveRecentSearch(phrase);
    }
    this.pendingSearchPhrase = null;
  };

  UpcApp.prototype.clearRecentSearches = function () {
    try {
      localStorage.removeItem('upctv_recent_archive_searches');
    } catch (e) { }
    this.renderRecentSearches();
    this.showToast('História vyhľadávania bola vymazaná');
  };

  UpcApp.prototype.renderRecentSearches = function () {
    var self = this;
    var container = this.dom.archiveRecentSearches || document.getElementById('archiveRecentSearches');
    var chipsContainer = this.dom.recentSearchesChips || document.getElementById('recentSearchesChips');
    if (!container || !chipsContainer) return;

    var list = this.getRecentSearches();
    if (!list || list.length === 0) {
      container.style.display = 'none';
      chipsContainer.innerHTML = '';
      return;
    }

    container.style.display = 'flex';
    chipsContainer.innerHTML = list.map(function (item) {
      var safe = self.escapeHtml(item);
      return '<button class="recent-search-chip" data-nav data-phrase="' + safe + '" title="Hľadať: ' + safe + '">' +
        '🕒 ' + safe +
        '</button>';
    }).join('');

    chipsContainer.querySelectorAll('.recent-search-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var phrase = this.getAttribute('data-phrase');
        if (phrase) {
          self.applyRecentSearch(phrase);
        }
      });
    });
  };

  UpcApp.prototype.applyRecentSearch = function (phrase) {
    if (!phrase) return;
    var trimmed = phrase.trim();
    if (this.dom.archiveSearchInput) {
      this.dom.archiveSearchInput.value = trimmed;
    }
    if (this.dom.btnArchiveSearchClear) {
      this.dom.btnArchiveSearchClear.style.display = 'flex';
    }
    this.archiveSearchQuery = trimmed;
    this.saveRecentSearch(trimmed);
    this.executeArchiveSearch();
  };

  UpcApp.prototype.renderArchiveSearchMinCharsPrompt = function () {
    var self = this;
    var container = this.dom.archiveProgramsList;
    if (!container) return;

    var scope = this.archiveSearchScope || 'week';
    var ch = this.selectedArchiveChannel;
    var queryLen = (this.archiveSearchQuery || '').length;

    if (this.dom.archiveBannerTitle) {
      if (scope === 'week') {
        this.dom.archiveBannerTitle.textContent = '7-dňový TV archív';
      } else if (scope === 'day') {
        this.dom.archiveBannerTitle.textContent = 'Celý deň (všetky stanice)';
      } else {
        this.dom.archiveBannerTitle.textContent = ch ? ch.name : 'Archív stanice';
      }
    }
    if (this.dom.archiveBannerDate) {
      this.dom.archiveBannerDate.textContent = 'Zadajte aspoň 3 znaky pre vyhľadávanie';
    }
    if (this.dom.archiveBannerCount) {
      this.dom.archiveBannerCount.textContent = 'Čakám na zadanie (' + queryLen + '/3)...';
    }

    var recentList = this.getRecentSearches();
    var recentHtml = '';
    if (recentList.length > 0) {
      recentHtml =
        '<div class="archive-prompt-recent">' +
        '<div class="prompt-recent-title">Posledné hľadané frázy:</div>' +
        '<div class="prompt-recent-chips">' +
        recentList.map(function (item) {
          var safe = self.escapeHtml(item);
          return '<button class="prompt-recent-chip" data-nav data-phrase="' + safe + '">🕒 ' + safe + '</button>';
        }).join('') +
        '</div>' +
        '</div>';
    }

    container.innerHTML =
      '<div class="archive-empty-search">' +
      '<div class="empty-icon">⌨️</div>' +
      '<h3>Zadajte aspoň 3 znaky</h3>' +
      '<p>Vyhľadávanie v reláciách archívu sa automaticky spustí po zadaní aspoň 3 znakov (napr. "spr", "film", "noviny") alebo kliknite na nedávno hľadaný výraz.</p>' +
      recentHtml +
      '</div>';

    container.querySelectorAll('.prompt-recent-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var phrase = this.getAttribute('data-phrase');
        if (phrase) {
          self.applyRecentSearch(phrase);
        }
      });
    });
  };

  UpcApp.prototype.handleArchiveSearchInput = function (query) {
    var self = this;
    this.archiveSearchQuery = (query || '').trim();
    if (this.dom.btnArchiveSearchClear) {
      this.dom.btnArchiveSearchClear.style.display = this.archiveSearchQuery ? 'flex' : 'none';
    }
    if (this.archiveSearchTimer) clearTimeout(this.archiveSearchTimer);

    // If query is cleared completely, restore standard channel archive immediately
    if (!this.archiveSearchQuery) {
      this.renderRecentSearches();
      this.executeArchiveSearch();
      return;
    }

    // Rule: zacni hladanie ked su zadane aspon 3 znaky
    if (this.archiveSearchQuery.length < 3) {
      this.renderArchiveSearchMinCharsPrompt();
      return;
    }

    // Debounce wait time: wait 350ms so user has time to finish typing without lag/freeze
    this.archiveSearchTimer = setTimeout(function () {
      self.executeArchiveSearch();
    }, 350);
  };

  UpcApp.prototype.clearArchiveSearch = function () {
    if (this.recentSearchSaveTimer) {
      clearTimeout(this.recentSearchSaveTimer);
      this.recentSearchSaveTimer = null;
    }
    this.pendingSearchPhrase = null;
    this.archiveSearchQuery = '';
    if (this.dom.archiveSearchInput) {
      this.dom.archiveSearchInput.value = '';
    }
    if (this.dom.btnArchiveSearchClear) {
      this.dom.btnArchiveSearchClear.style.display = 'none';
    }
    this.renderRecentSearches();
    this.updateArchiveBanner();
    this.loadAndRenderArchivePrograms();
  };

  UpcApp.prototype.setArchiveSearchScope = function (scope) {
    this.commitPendingSearch();
    this.archiveSearchScope = scope;
    if (this.dom.btnScopeChannel) this.dom.btnScopeChannel.classList.toggle('active', scope === 'channel');
    if (this.dom.btnScopeDay) this.dom.btnScopeDay.classList.toggle('active', scope === 'day');
    if (this.dom.btnScopeWeek) this.dom.btnScopeWeek.classList.toggle('active', scope === 'week');

    if (this.archiveSearchQuery) {
      this.executeArchiveSearch();
    }
  };

  UpcApp.prototype.executeArchiveSearch = function () {
    var self = this;
    if (!this.archiveSearchQuery) {
      this.loadAndRenderArchivePrograms();
      return;
    }

    var query = this.archiveSearchQuery;
    var queryNorm = this.removeDiacritics(query).trim();
    var container = this.dom.archiveProgramsList;
    if (!container) return;

    var scope = this.archiveSearchScope || 'week';
    var dayObj = this.archiveDays[this.selectedArchiveDayIndex] || this.archiveDays[0];
    var ch = this.selectedArchiveChannel;

    // Minimum characters guard: zacni hladanie ked su zadane aspon 3 znaky
    if (queryNorm.length < 3) {
      this.renderArchiveSearchMinCharsPrompt();
      return;
    }

    // Schedule saving the final phrase with debounce (doesn't save partial letters while typing)
    this.scheduleRecentSearchSave(query);

    var searchId = ++this.archiveSearchSeqId;
    var now = Math.floor(Date.now() / 1000);

    // Helper to test if an event matches the search query and is playable (not future / scheduled)
    function eventMatches(ev) {
      if (!ev) return false;
      // Nezobrazuj relácie, ktoré sú len naplánované v budúcnosti - iba tie, ktoré sa dajú spustiť
      if (ev.startTime && ev.startTime > now) return false;
      var titleNorm = self.removeDiacritics(ev.title || '');
      if (titleNorm.indexOf(queryNorm) !== -1) return true;
      var descNorm = self.removeDiacritics(ev.description || ev.synopsis || '');
      if (descNorm.indexOf(queryNorm) !== -1) return true;
      return false;
    }

    // Helper to extract channel events from EPG structure
    function getEventsForChannel(allEvents, channelId) {
      if (!allEvents || typeof allEvents !== 'object') return [];
      if (Array.isArray(allEvents)) {
        return allEvents.filter(function (e) { return e.channelId === channelId; });
      }
      if (Array.isArray(allEvents[channelId])) {
        return allEvents[channelId];
      }
      return [];
    }

    if (scope === 'channel') {
      if (!ch) return;
      container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-secondary);"><div class="spinner-circle" style="margin:0 auto 16px auto; width:36px; height:36px;"></div>Hľadám "' + query + '" na stanici ' + ch.name + '...</div>';

      if (this.dom.archiveBannerTitle) this.dom.archiveBannerTitle.textContent = ch.name;
      if (this.dom.archiveBannerDate) this.dom.archiveBannerDate.textContent = 'Hľadanie: "' + query + '" • ' + dayObj.fullDateText;
      if (this.dom.archiveBannerCount) this.dom.archiveBannerCount.textContent = 'Hľadám...';

      this.fetchEpgDayCached(dayObj.dateStr).then(function (allEvents) {
        if (self.archiveSearchSeqId !== searchId) return;

        var chEvents = getEventsForChannel(allEvents, ch.id);
        var matches = [];
        chEvents.forEach(function (ev) {
          if (eventMatches(ev)) {
            matches.push({ event: ev, channel: ch, day: dayObj });
          }
        });
        matches.sort(function (a, b) { return (a.event.startTime || 0) - (b.event.startTime || 0); });
        self.renderSearchResults(matches, 'channel');
      }).catch(function (err) {
        if (self.archiveSearchSeqId !== searchId) return;
        container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-secondary);">Chyba pri hľadaní: ' + err.message + '</div>';
      });

    } else if (scope === 'day') {
      container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-secondary);"><div class="spinner-circle" style="margin:0 auto 16px auto; width:36px; height:36px;"></div>Hľadám "' + query + '" na všetkých staniciach (' + dayObj.label + ')...</div>';

      if (this.dom.archiveBannerTitle) this.dom.archiveBannerTitle.textContent = 'Hľadanie na všetkých staniciach';
      if (this.dom.archiveBannerDate) this.dom.archiveBannerDate.textContent = 'Výraz: "' + query + '" • ' + dayObj.fullDateText;
      if (this.dom.archiveBannerCount) this.dom.archiveBannerCount.textContent = 'Hľadám...';

      this.fetchEpgDayCached(dayObj.dateStr).then(function (allEvents) {
        if (self.archiveSearchSeqId !== searchId) return;

        setTimeout(function () {
          if (self.archiveSearchSeqId !== searchId) return;

          var matches = [];
          var now = Math.floor(Date.now() / 1000);

          self.archiveChannels.forEach(function (targetCh) {
            var chEvents = getEventsForChannel(allEvents, targetCh.id);
            chEvents.forEach(function (ev) {
              if (eventMatches(ev)) {
                matches.push({ event: ev, channel: targetCh, day: dayObj });
              }
            });
          });

          // Sort: currently live broadcasts first, then chronologically by startTime
          matches.sort(function (a, b) {
            var aLive = (a.event.startTime <= now && a.event.endTime >= now) ? 1 : 0;
            var bLive = (b.event.startTime <= now && b.event.endTime >= now) ? 1 : 0;
            if (aLive !== bLive) return bLive - aLive;
            return (a.event.startTime || 0) - (b.event.startTime || 0);
          });

          self.renderSearchResults(matches, 'day');
        }, 10);
      }).catch(function (err) {
        if (self.archiveSearchSeqId !== searchId) return;
        container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-secondary);">Chyba pri hľadaní: ' + err.message + '</div>';
      });

    } else if (scope === 'week') {
      container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-secondary);"><div class="spinner-circle" style="margin:0 auto 16px auto; width:36px; height:36px;"></div>Prehľadávam 7-dňový archív pre "' + query + '"...</div>';

      if (this.dom.archiveBannerTitle) this.dom.archiveBannerTitle.textContent = 'Výsledky v 7-dňovom archíve';
      if (this.dom.archiveBannerDate) this.dom.archiveBannerDate.textContent = 'Výraz: "' + query + '" • Posledných 7 dní';
      if (this.dom.archiveBannerCount) this.dom.archiveBannerCount.textContent = 'Prehľadávam archív...';

      var dayPromises = this.archiveDays.map(function (d) {
        return self.fetchEpgDayCached(d.dateStr).then(function (allEvents) {
          return { day: d, allEvents: allEvents };
        });
      });

      Promise.all(dayPromises).then(function (results) {
        if (self.archiveSearchSeqId !== searchId) return;

        // Yield execution to allow the UI and spinner to paint
        setTimeout(function () {
          if (self.archiveSearchSeqId !== searchId) return;

          var matches = [];
          results.forEach(function (item) {
            var currentDay = item.day;
            var allEvents = item.allEvents;

            self.archiveChannels.forEach(function (targetCh) {
              var chEvents = getEventsForChannel(allEvents, targetCh.id);
              chEvents.forEach(function (ev) {
                if (eventMatches(ev)) {
                  matches.push({ event: ev, channel: targetCh, day: currentDay });
                }
              });
            });
          });

          // Sort descending: most recent broadcast first
          matches.sort(function (a, b) {
            return (b.event.startTime || 0) - (a.event.startTime || 0);
          });

          self.renderSearchResults(matches, 'week');
        }, 10);
      }).catch(function (err) {
        if (self.archiveSearchSeqId !== searchId) return;
        container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-secondary);">Chyba pri prehľadávaní archívu: ' + err.message + '</div>';
      });
    }
  };

  UpcApp.prototype.renderSearchResults = function (matches, scope) {
    var self = this;
    var container = this.dom.archiveProgramsList;
    if (!container) return;

    var now = Math.floor(Date.now() / 1000);
    // Nezobrazuj relácie, ktoré sú len naplánované v budúcnosti - iba tie, ktoré sa dajú spustiť
    matches = (matches || []).filter(function (item) {
      var ev = item && item.event;
      return ev && (!ev.startTime || ev.startTime <= now);
    });

    var totalCount = matches.length;
    var maxDisplay = 60; // Render cap for 10-foot TV UI responsiveness
    var displayedMatches = matches.slice(0, maxDisplay);

    var countText = '';
    if (totalCount === 0) {
      countText = '0 relácií';
    } else if (totalCount === 1) {
      countText = '1 nájdená relácia';
    } else if (totalCount >= 2 && totalCount <= 4) {
      countText = totalCount + ' nájdené relácie';
    } else if (totalCount > maxDisplay) {
      countText = 'Zobrazených prvých ' + maxDisplay + ' z ' + totalCount + ' relácií';
    } else {
      countText = totalCount + ' nájdených relácií';
    }

    if (this.dom.archiveBannerCount) {
      this.dom.archiveBannerCount.textContent = countText;
    }

    container.innerHTML = '';

    if (totalCount === 0) {
      var scopeHint = scope === 'channel' ? 'Skúste zmeniť rozsah hľadania na "Celý deň (všetky)" alebo "7-dňový archív".' : 'Skúste zadať iný názov alebo kľúčové slovo.';
      var recentList = this.getRecentSearches();
      var recentHtml = '';
      if (recentList.length > 0) {
        recentHtml =
          '<div class="archive-prompt-recent">' +
          '<div class="prompt-recent-title">Alebo vyberte z nedávnych hľadaní:</div>' +
          '<div class="prompt-recent-chips">' +
          recentList.map(function (item) {
            var safe = self.escapeHtml(item);
            return '<button class="prompt-recent-chip" data-nav data-phrase="' + safe + '">🕒 ' + safe + '</button>';
          }).join('') +
          '</div>' +
          '</div>';
      }

      container.innerHTML =
        '<div class="archive-empty-search">' +
        '<div class="empty-icon">🔍</div>' +
        '<h3>Nenašli sa žiadne relácie</h3>' +
        '<p>Pre výraz "' + self.escapeHtml(self.archiveSearchQuery) + '" sa nenašli žiadne výsledky. ' + scopeHint + '</p>' +
        recentHtml +
        '</div>';

      container.querySelectorAll('.prompt-recent-chip').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var phrase = this.getAttribute('data-phrase');
          if (phrase) {
            self.applyRecentSearch(phrase);
          }
        });
      });
      return;
    }

    var now = Math.floor(Date.now() / 1000);
    var fragment = document.createDocumentFragment();

    displayedMatches.forEach(function (item, idx) {
      var ev = item.event;
      var ch = item.channel;
      var day = item.day;

      var card = document.createElement('div');
      var isNowPlaying = (ev.startTime <= now && ev.endTime >= now);
      var isFuture = (ev.startTime > now);

      card.className = 'archive-prog-card' + (isNowPlaying ? ' now-playing' : '');
      card.setAttribute('data-nav', '');
      card.setAttribute('data-event-id', ev.id);

      var startTimeStr = self.formatTime(ev.startTime);
      var endTimeStr = self.formatTime(ev.endTime);
      var durationMin = Math.round((ev.endTime - ev.startTime) / 60);

      var badgeText = '↺ V archíve';
      if (isNowPlaying) {
        badgeText = '● Práve vysielané (Restart)';
      } else if (isFuture) {
        badgeText = 'Naplánované';
      }

      var badgesHtml = '';
      if (scope === 'week' && day) {
        badgesHtml += '<span class="archive-prog-date-badge">' + day.label + '</span>';
      }
      if (scope !== 'channel' && ch) {
        var chLogo = (ch.logo && ch.logo.focused) || 'icon.png';
        badgesHtml += '<span class="archive-prog-ch-badge"><img src="' + chLogo + '" style="height:14px; max-width:32px; object-fit:contain;" onerror="this.src=\'icon.png\'"> ' + ch.name + '</span>';
      }

      var highlightedTitle = self.highlightMatch(ev.title || 'Bez názvu', self.archiveSearchQuery);

      card.innerHTML =
        '<div class="archive-prog-left">' +
        '<div style="display:flex; align-items:center;">' +
        badgesHtml +
        '<span class="archive-prog-time">' + startTimeStr + ' - ' + endTimeStr + '</span>' +
        '</div>' +
        '<span class="archive-prog-title">' + highlightedTitle + '</span>' +
        '</div>' +
        '<div class="archive-prog-right">' +
        '<span class="archive-prog-duration">' + durationMin + ' min</span>' +
        '<span class="archive-prog-replay-badge">' + badgeText + '</span>' +
        '</div>';

      card.addEventListener('focus', function () {
        self.commitPendingSearch();
        self.selectedArchiveChannel = ch;
        self.selectedArchiveEvent = ev;
        self.updateArchiveProgramPreview(ev, ch);
      });

      card.addEventListener('click', function () {
        self.commitPendingSearch();
        self.selectedArchiveChannel = ch;
        self.selectedArchiveEvent = ev;
        self.updateArchiveProgramPreview(ev, ch);
        if (!isFuture) {
          self.playArchiveEvent(ch, ev);
        } else {
          self.showToast('Táto relácia ešte nebola odvysielaná.');
        }
      });

      fragment.appendChild(card);
    });

    if (totalCount > maxDisplay) {
      var moreNotice = document.createElement('div');
      moreNotice.className = 'archive-more-notice';
      moreNotice.textContent = '... a ďalších ' + (totalCount - maxDisplay) + ' relácií. Pre konkrétnejší výber napíšte dlhší názov.';
      fragment.appendChild(moreNotice);
    }

    container.appendChild(fragment);

    if (displayedMatches.length > 0) {
      self.selectedArchiveChannel = displayedMatches[0].channel;
      self.selectedArchiveEvent = displayedMatches[0].event;
      self.updateArchiveProgramPreview(displayedMatches[0].event, displayedMatches[0].channel);
    }
  };

  UpcApp.prototype.loadAndRenderArchivePrograms = function () {
    if (this.archiveSearchQuery) {
      this.executeArchiveSearch();
      return;
    }
    var self = this;
    var ch = this.selectedArchiveChannel;
    if (!ch) return;
    var dayObj = this.archiveDays[this.selectedArchiveDayIndex] || this.archiveDays[0];
    var container = this.dom.archiveProgramsList;
    if (!container) return;

    container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-secondary);"><div class="spinner-circle" style="margin:0 auto 16px auto; width:40px; height:40px;"></div>Načítavam archív pre ' + ch.name + '...</div>';

    this.fetchEpgDayCached(dayObj.dateStr).then(function (allEvents) {
      // Extract events for this channel (getEpgDay returns channelMap { channelId: [events] })
      var chEvents = [];
      if (allEvents && typeof allEvents === 'object') {
        if (Array.isArray(allEvents)) {
          chEvents = allEvents.filter(function (ev) {
            return ev.channelId === ch.id;
          });
        } else if (Array.isArray(allEvents[ch.id])) {
          chEvents = allEvents[ch.id].slice();
        }
      }

      // Sort chronologically
      chEvents.sort(function (a, b) {
        return (a.startTime || 0) - (b.startTime || 0);
      });

      if (self.dom.archiveBannerCount) {
        self.dom.archiveBannerCount.textContent = chEvents.length + (chEvents.length === 1 ? ' relácia' : (chEvents.length <= 4 ? ' relácie' : ' relácií'));
      }

      container.innerHTML = '';

      if (chEvents.length === 0) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-secondary);">Pre tento deň a stanicu sa v archíve nenašli žiadne relácie.</div>';
        return;
      }

      var now = Math.floor(Date.now() / 1000);
      var firstCard = null;
      var currentLiveCard = null;

      chEvents.forEach(function (ev, idx) {
        var card = document.createElement('div');
        var isNowPlaying = (ev.startTime <= now && ev.endTime >= now);
        var isFuture = ev.startTime > now;

        card.className = 'archive-prog-card' + (isNowPlaying ? ' now-playing' : '');
        card.setAttribute('data-nav', '');
        card.setAttribute('data-event-id', ev.id);

        var startTimeStr = self.formatTime(ev.startTime);
        var endTimeStr = self.formatTime(ev.endTime);
        var durationMin = Math.round((ev.endTime - ev.startTime) / 60);

        var badgeText = '↺ V archíve';
        if (isNowPlaying) {
          badgeText = '● Práve vysielané (Restart)';
        } else if (isFuture) {
          badgeText = 'Naplánované';
        }

        card.innerHTML =
          '<div class="archive-prog-left">' +
          '<span class="archive-prog-time">' + startTimeStr + ' - ' + endTimeStr + '</span>' +
          '<span class="archive-prog-title">' + (ev.title || 'Bez názvu') + '</span>' +
          '</div>' +
          '<div class="archive-prog-right">' +
          '<span class="archive-prog-duration">' + durationMin + ' min</span>' +
          '<span class="archive-prog-replay-badge">' + badgeText + '</span>' +
          '</div>';

        // When focused or hovered, update preview
        card.addEventListener('focus', function () {
          self.selectedArchiveEvent = ev;
          self.updateArchiveProgramPreview(ev, ch);
        });

        // When clicked, play directly or inform if in future
        card.addEventListener('click', function () {
          self.selectedArchiveEvent = ev;
          self.updateArchiveProgramPreview(ev, ch);
          if (!isFuture) {
            self.playArchiveEvent(ch, ev);
          } else {
            self.showToast('Táto relácia ešte nebola odvysielaná.');
          }
        });

        container.appendChild(card);

        if (idx === 0) firstCard = card;
        if (isNowPlaying) currentLiveCard = card;
      });

      // Default select the live show or first show
      var targetEvent = null;
      if (currentLiveCard) {
        for (var i = 0; i < chEvents.length; i++) {
          if (chEvents[i].startTime <= now && chEvents[i].endTime >= now) {
            targetEvent = chEvents[i];
            break;
          }
        }
      }
      if (!targetEvent && chEvents.length > 0) {
        targetEvent = chEvents[0];
      }
      if (targetEvent) {
        self.selectedArchiveEvent = targetEvent;
        self.updateArchiveProgramPreview(targetEvent, ch);
      }
    }).catch(function (err) {
      console.warn('[UpcApp] Failed to load archive EPG day:', err);
      container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-secondary);">Chyba pri načítavaní údajov archívu: ' + err.message + '</div>';
    });
  };

  UpcApp.prototype.updateArchiveProgramPreview = function (event, channel) {
    if (!event) return;
    var now = Math.floor(Date.now() / 1000);
    var isNowPlaying = (event.startTime <= now && event.endTime >= now);
    var isFuture = (event.startTime > now);

    if (this.dom.prevTitle) {
      this.dom.prevTitle.textContent = event.title || 'Vyberte reláciu';
    }

    if (this.dom.prevGenre) {
      var genre = (event.genres && event.genres[0]) || (channel && channel.genre && channel.genre[0]) || 'Všeobecné';
      this.dom.prevGenre.textContent = genre;
    }

    if (this.dom.prevAge) {
      this.dom.prevAge.textContent = event.parentalRating ? ('Od ' + event.parentalRating + ' rokov') : 'Všetky vekové kategórie';
    }

    if (this.dom.prevTime) {
      this.dom.prevTime.textContent = this.formatTime(event.startTime) + ' - ' + this.formatTime(event.endTime);
    }

    if (this.dom.prevDuration) {
      var durationMin = Math.round((event.endTime - event.startTime) / 60);
      this.dom.prevDuration.textContent = durationMin + ' min';
    }

    if (this.dom.prevSynopsis) {
      this.dom.prevSynopsis.textContent = event.description || event.synopsis || 'K tejto relácii nie je k dispozícii podrobný popis.';
    }

    if (this.dom.btnPlayArchiveEvent) {
      if (isFuture) {
        this.dom.btnPlayArchiveEvent.textContent = 'Vysielanie ešte nezačalo';
        this.dom.btnPlayArchiveEvent.disabled = true;
        this.dom.btnPlayArchiveEvent.style.opacity = '0.5';
        if (this.dom.btnPlayArchiveSkip2m) {
          this.dom.btnPlayArchiveSkip2m.disabled = true;
          this.dom.btnPlayArchiveSkip2m.style.opacity = '0.4';
        }
      } else if (isNowPlaying) {
        this.dom.btnPlayArchiveEvent.textContent = '↺ Spustiť od začiatku (Restart)';
        this.dom.btnPlayArchiveEvent.disabled = false;
        this.dom.btnPlayArchiveEvent.style.opacity = '1';
        if (this.dom.btnPlayArchiveSkip2m) {
          this.dom.btnPlayArchiveSkip2m.disabled = false;
          this.dom.btnPlayArchiveSkip2m.style.opacity = '1';
        }
      } else {
        this.dom.btnPlayArchiveEvent.textContent = '► Prehrať z archívu';
        this.dom.btnPlayArchiveEvent.disabled = false;
        this.dom.btnPlayArchiveEvent.style.opacity = '1';
        if (this.dom.btnPlayArchiveSkip2m) {
          this.dom.btnPlayArchiveSkip2m.disabled = false;
          this.dom.btnPlayArchiveSkip2m.style.opacity = '1';
        }
      }
    }
  };

  UpcApp.prototype.updateOsdFavoriteButton = function () {
    if (!this.player.currentChannel) return;
    var isFav = this.favorites.indexOf(this.player.currentChannel.id) >= 0;
    this.dom.btnOsdFav.textContent = isFav ? '★ Odstrániť z obľúbených' : '☆ Pridať k obľúbeným';
  };

  UpcApp.prototype.showOsd = function () {
    var self = this;
    this.dom.playerOsd.classList.add('visible');

    if (this.osdTimer) clearTimeout(this.osdTimer);
    this.osdTimer = setTimeout(function () {
      self.hideOsd();
    }, 6000);

    // Focus on Osd back or play button if inside player view
    var focused = document.querySelector('.player-osd .focused');
    if (!focused) {
      this.nav.setFocus(this.dom.btnOsdPlayPause, false);
    }
  };

  UpcApp.prototype.hideOsd = function () {
    this.dom.playerOsd.classList.remove('visible');
    if (this.osdTimer) clearTimeout(this.osdTimer);
  };

  UpcApp.prototype.toggleOsd = function () {
    if (this.dom.playerOsd.classList.contains('visible')) {
      this.hideOsd();
    } else {
      this.showOsd();
    }
  };

  UpcApp.prototype.openPlayerView = function () {
    this.dom.playerView.classList.add('active');
    document.body.classList.add('player-active');
    var app = document.getElementById('app');
    if (app) app.classList.add('player-active');
  };

  UpcApp.prototype.closePlayerView = function () {
    if (this.bufferingSpinnerTimer) {
      clearTimeout(this.bufferingSpinnerTimer);
      this.bufferingSpinnerTimer = null;
    }
    this.dom.playerView.classList.remove('active');
    document.body.classList.remove('player-active');
    var app = document.getElementById('app');
    if (app) app.classList.remove('player-active');
    this.hideOsd();
    this.stopRandomWebcamTimer();
    this.player.destroy();

    // Re-focus current channel card in grid if in live view, or archive program card if in archive view, or movie/webcam card
    if (this.currentView === 'archive') {
      var focusedProg = document.querySelector('.archive-prog-card');
      if (focusedProg) {
        this.nav.setFocus(focusedProg);
      }

    } else if (this.currentView === 'webcams' || this.currentWebcamPlaying) {
      var targetCam = this.currentWebcamPlaying
        ? document.querySelector('[data-cam-id="' + this.currentWebcamPlaying.id + '"]')
        : document.querySelector('.webcam-card');
      if (targetCam) {
        this.nav.setFocus(targetCam);
      }
    } else if (this.currentView === 'radios' || this.currentRadioPlaying) {
      var targetRadio = this.currentRadioPlaying
        ? document.querySelector('[data-radio-id="' + this.currentRadioPlaying.id + '"]')
        : document.querySelector('.radio-card');
      if (targetRadio) {
        this.nav.setFocus(targetRadio);
      }
    } else {
      var currentCard = this.dom.channelsGrid.querySelector('[data-index="' + this.currentChannelIndex + '"]');
      if (currentCard) {
        this.nav.setFocus(currentCard);
      }
    }
  };

  UpcApp.prototype.showSpinner = function (text) {
    if (this.dom.spinnerText) this.dom.spinnerText.textContent = text || 'Načítavam...';
    this.dom.playerSpinner.classList.add('visible');
  };

  UpcApp.prototype.hideSpinner = function () {
    this.dom.playerSpinner.classList.remove('visible');
  };

  UpcApp.prototype.showToast = function (msg) {
    var self = this;
    if (!this.dom.toastBanner) return;
    this.dom.toastBanner.textContent = msg;
    this.dom.toastBanner.classList.add('visible');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(function () {
      self.dom.toastBanner.classList.remove('visible');
    }, 12000);
  };

  UpcApp.prototype.openSettingsModal = function () {
    this.dom.settingsModal.classList.add('active');
    var vInfo = document.getElementById('settingsVersionInfo');
    if (vInfo) {
      vInfo.textContent = 'v' + (UpcApp.VERSION || '1.2.1') + ' • ID: ' + (this.api ? this.api.getDeviceId() : 'TV-QE65Q95T-2024');
    }
    var input = document.getElementById('settingUsername');
    if (input) this.nav.setFocus(input);
  };

  UpcApp.prototype.closeSettingsModal = function () {
    this.dom.settingsModal.classList.remove('active');
    var tab = document.getElementById('tabSettings');
    if (tab) this.nav.setFocus(tab);
  };

  UpcApp.prototype.openExitModal = function () {
    if (!this.dom.exitModal) return;
    this.lastFocusedBeforeExit = document.querySelector('.focused') || this.nav.currentFocus;
    this.dom.exitModal.classList.add('active');
    if (this.dom.btnExitCancel) {
      this.nav.setFocus(this.dom.btnExitCancel);
    }
  };

  UpcApp.prototype.closeExitModal = function () {
    if (!this.dom.exitModal) return;
    this.dom.exitModal.classList.remove('active');
    if (this.lastFocusedBeforeExit && document.body.contains(this.lastFocusedBeforeExit)) {
      this.nav.setFocus(this.lastFocusedBeforeExit);
    } else {
      var fallbackEl = document.querySelector('.channel-card') || document.querySelector('.tab-btn.active');
      if (fallbackEl) this.nav.setFocus(fallbackEl);
    }
    this.lastFocusedBeforeExit = null;
  };

  UpcApp.prototype.confirmExitApp = function () {
    this.showToast('Ukončujem aplikáciu UPC TV...');
    if (this.dom.exitModal) {
      this.dom.exitModal.classList.remove('active');
    }
    setTimeout(function () {
      if (typeof tizen !== 'undefined' && tizen.application) {
        try {
          tizen.application.getCurrentApplication().exit();
          return;
        } catch (e) { }
      }
      try {
        window.close();
      } catch (e) { }
    }, 200);
  };

  UpcApp.prototype.updateAudioButton = function () {
    if (!this.dom.btnOsdAudio) return;
    var tracks = this.player ? this.player.getAudioTracks() : [];
    if (!tracks || tracks.length === 0) {
      this.dom.btnOsdAudio.textContent = '🔊 Zvuk: Nedostupný';
      this.dom.btnOsdAudio.style.display = 'none';
      return;
    }

    this.dom.btnOsdAudio.style.display = 'inline-block';
    var activeTrack = this.player.getActiveAudioTrack();
    var activeLabel = activeTrack ? activeTrack.label : tracks[0].label;

    if (tracks.length > 1) {
      this.dom.btnOsdAudio.textContent = '🔊 ' + activeLabel + ' (' + tracks.length + ') ▾';
    } else {
      this.dom.btnOsdAudio.textContent = '🔊 ' + activeLabel;
    }
  };

  UpcApp.prototype.openAudioModal = function () {
    var self = this;
    var tracks = this.player ? this.player.getAudioTracks() : [];
    if (!tracks || tracks.length === 0) {
      this.showToast('Zvukové stopy nie sú k dispozícii.');
      return;
    }

    // Freeze OSD timeout timer while modal is open
    if (this.osdTimer) {
      clearTimeout(this.osdTimer);
      this.osdTimer = null;
    }

    this.dom.audioTrackList.innerHTML = '';
    if (this.dom.audioModalTrackCount) {
      this.dom.audioModalTrackCount.textContent = tracks.length + (tracks.length === 1 ? ' stopa' : (tracks.length <= 4 ? ' stopy' : ' stôp'));
    }

    var focusTarget = null;

    tracks.forEach(function (track, index) {
      var item = document.createElement('div');
      item.className = 'audio-track-item' + (track.active ? ' active-track' : '');
      item.setAttribute('data-nav', '');
      item.setAttribute('data-index', index);

      item.innerHTML =
        '<div class="audio-track-left">' +
        '<span class="audio-track-radio">' + (track.active ? '●' : '○') + '</span>' +
        '<div>' +
        '<div class="audio-track-name">' + track.label + '</div>' +
        (track.audioCodec ? '<div class="audio-track-details">Kodek: ' + track.audioCodec + '</div>' : '') +
        '</div>' +
        '</div>' +
        '<span class="audio-track-badge">' + (track.active ? '✓ Aktívna' : 'Zvoliť') + '</span>';

      item.addEventListener('click', function () {
        self.player.selectAudioTrack(track.language, track.role, track.audioId);
        self.updateAudioButton();
        self.showToast('Nastavená zvuková stopa: ' + track.label);
        self.closeAudioModal();
      });

      self.dom.audioTrackList.appendChild(item);

      if (track.active || (!focusTarget && index === 0)) {
        focusTarget = item;
      }
    });

    this.dom.audioModal.classList.add('active');

    if (focusTarget) {
      this.nav.setFocus(focusTarget);
    }
  };

  UpcApp.prototype.closeAudioModal = function () {
    this.dom.audioModal.classList.remove('active');
    this.showOsd();
    if (this.dom.btnOsdAudio) {
      this.nav.setFocus(this.dom.btnOsdAudio);
    }
  };

  UpcApp.prototype.updateSubtitlesButton = function () {
    if (!this.dom.btnOsdSubtitles) return;
    var tracks = this.player ? this.player.getTextTracks() : [];
    if (!tracks || tracks.length === 0) {
      this.dom.btnOsdSubtitles.textContent = '💬 Titulky: Nie sú';
      this.dom.btnOsdSubtitles.style.display = 'none';
      return;
    }

    this.dom.btnOsdSubtitles.style.display = 'inline-block';
    var isEnabled = this.player.isSubtitlesEnabled();
    var activeTrack = this.player.getActiveTextTrack();

    if (isEnabled && activeTrack) {
      this.dom.btnOsdSubtitles.textContent = '💬 ' + activeTrack.label + ' ▾';
    } else {
      this.dom.btnOsdSubtitles.textContent = '💬 Titulky: Vypnuté (' + tracks.length + ') ▾';
    }
  };

  UpcApp.prototype.openSubtitlesModal = function () {
    var self = this;
    var tracks = this.player ? this.player.getTextTracks() : [];
    if (!tracks || tracks.length === 0) {
      this.showToast('Tento televízny program neobsahuje titulky.');
      return;
    }

    // Freeze OSD timeout timer while modal is open
    if (this.osdTimer) {
      clearTimeout(this.osdTimer);
      this.osdTimer = null;
    }

    this.dom.subtitlesTrackList.innerHTML = '';
    if (this.dom.subtitlesModalTrackCount) {
      this.dom.subtitlesModalTrackCount.textContent = tracks.length + (tracks.length === 1 ? ' stopa' : (tracks.length <= 4 ? ' stopy' : ' stôp'));
    }

    var isEnabled = this.player.isSubtitlesEnabled();
    var activeTrack = this.player.getActiveTextTrack();
    var focusTarget = null;

    // 1. "Vypnúť titulky" option
    var offItem = document.createElement('div');
    offItem.className = 'audio-track-item' + (!isEnabled ? ' active-track' : '');
    offItem.setAttribute('data-nav', '');
    offItem.setAttribute('data-index', 'off');

    offItem.innerHTML =
      '<div class="audio-track-left">' +
      '<span class="audio-track-radio">' + (!isEnabled ? '●' : '○') + '</span>' +
      '<div>' +
      '<div class="audio-track-name">Vypnúť titulky</div>' +
      '<div class="audio-track-details">Bez zobrazenia titulkov na obrazovke</div>' +
      '</div>' +
      '</div>' +
      '<span class="audio-track-badge">' + (!isEnabled ? '✓ Aktívne' : 'Zvoliť') + '</span>';

    offItem.addEventListener('click', function () {
      self.player.selectTextTrack('off');
      self.updateSubtitlesButton();
      self.showToast('Titulky vypnuté');
      self.closeSubtitlesModal();
    });

    this.dom.subtitlesTrackList.appendChild(offItem);
    if (!isEnabled) focusTarget = offItem;

    // 2. Available subtitle tracks
    tracks.forEach(function (track, index) {
      var isThisActive = isEnabled && activeTrack && (activeTrack.id === track.id || activeTrack.language === track.language);
      var item = document.createElement('div');
      item.className = 'audio-track-item' + (isThisActive ? ' active-track' : '');
      item.setAttribute('data-nav', '');
      item.setAttribute('data-index', index);

      item.innerHTML =
        '<div class="audio-track-left">' +
        '<span class="audio-track-radio">' + (isThisActive ? '●' : '○') + '</span>' +
        '<div>' +
        '<div class="audio-track-name">' + track.label + '</div>' +
        (track.mimeType ? '<div class="audio-track-details">Formát: ' + track.mimeType + '</div>' : '') +
        '</div>' +
        '</div>' +
        '<span class="audio-track-badge">' + (isThisActive ? '✓ Aktívne' : 'Zapnúť') + '</span>';

      item.addEventListener('click', function () {
        self.player.selectTextTrack(track.id);
        self.updateSubtitlesButton();
        self.showToast('Titulky zapnuté: ' + track.label);
        self.closeSubtitlesModal();
      });

      self.dom.subtitlesTrackList.appendChild(item);

      if (isThisActive || (!focusTarget && index === 0)) {
        focusTarget = item;
      }
    });

    this.dom.subtitlesModal.classList.add('active');

    if (focusTarget) {
      this.nav.setFocus(focusTarget);
    }
  };

  UpcApp.prototype.closeSubtitlesModal = function () {
    this.dom.subtitlesModal.classList.remove('active');
    this.showOsd();
    if (this.dom.btnOsdSubtitles) {
      this.nav.setFocus(this.dom.btnOsdSubtitles);
    }
  };

  UpcApp.prototype.bindPlayerEvents = function () {
    var self = this;

    this.player.on('loading', function (ch) {
      self.showSpinner('Pripájam k stanici ' + ch.name + '...');
      if (self.dom.btnOsdAudio) self.dom.btnOsdAudio.textContent = '🔊 Zvuk: Načítavam...';
      if (self.dom.btnOsdSubtitles) self.dom.btnOsdSubtitles.textContent = '💬 Titulky: Načítavam...';
    });

    this.player.on('playing', function () {
      if (self.bufferingSpinnerTimer) {
        clearTimeout(self.bufferingSpinnerTimer);
        self.bufferingSpinnerTimer = null;
      }
      self.hideSpinner();
      if (self.dom.btnOsdPlayPause) self.dom.btnOsdPlayPause.textContent = '❚❚ Pozastaviť';
      self.updateAudioButton();
      self.updateSubtitlesButton();
    });

    this.player.on('tracksready', function () {
      self.updateAudioButton();
      self.updateSubtitlesButton();
    });

    this.player.on('pause', function () {
      if (self.dom.btnOsdPlayPause) self.dom.btnOsdPlayPause.textContent = '► Pokračovať';
    });

    this.player.on('buffering', function (isBuffering) {
      if (self.bufferingSpinnerTimer) {
        clearTimeout(self.bufferingSpinnerTimer);
        self.bufferingSpinnerTimer = null;
      }

      if (isBuffering) {
        // Debounce: if buffering recovers within 1200ms, user never sees the spinner at all ("nebadane")!
        self.bufferingSpinnerTimer = setTimeout(function () {
          self.showSpinner('Vyrovnávacia pamäť streamu...');
        }, 1200);
      } else {
        self.hideSpinner();
      }
    });

    this.player.on('timeupdate', function (data) {
      if (self.dom.playerOsd && (self.dom.playerOsd.classList.contains('visible') || (self.player && (self.player.isReplay || self.player.isMovie)))) {
        if (data.duration > 0) {
          var pct = Math.min(100, Math.max(0, (data.currentTime / data.duration) * 100));
          if (self.dom.osdProgress) self.dom.osdProgress.style.width = pct + '%';
        }
        if (self.dom.osdReplayTimer) {
          self.dom.osdReplayTimer.textContent = self.formatSeconds(data.currentTime) + ' / ' + self.formatSeconds(data.duration);
        }
        if (self.player && self.player.isMovie && self.dom.osdStartTime && self.dom.osdEndTime) {
          self.dom.osdStartTime.textContent = self.formatSeconds(data.currentTime);
          self.dom.osdEndTime.textContent = self.formatSeconds(data.duration);
        }
      }
      if (self.player && self.player.isMovie && self.player.currentMovie && data.currentTime > 5) {
        var nowMs = Date.now();
        if (nowMs - self.movieProgressSaveTs > 5000) {
          self.movieProgressSaveTs = nowMs;
          try {
            localStorage.setItem('upc_movie_pos_' + self.player.currentMovie.id, String(Math.floor(data.currentTime)));
          } catch (e) { }
        }
      }
    });

    this.player.on('seek', function () {
      self.showOsd();
    });

    this.player.on('error', function (err) {
      self.hideSpinner();
      self.showToast('Chyba: ' + err);
    });
  };

  UpcApp.prototype.bindNavEvents = function () {
    var self = this;

    this.nav.on('back', function () {
      if (self.dom.exitModal && self.dom.exitModal.classList.contains('active')) {
        self.closeExitModal();
      } else if (self.dom.subtitlesModal && self.dom.subtitlesModal.classList.contains('active')) {
        self.closeSubtitlesModal();
      } else if (self.dom.audioModal && self.dom.audioModal.classList.contains('active')) {
        self.closeAudioModal();
      } else if (self.dom.settingsModal && self.dom.settingsModal.classList.contains('active')) {
        self.closeSettingsModal();
      } else if (self.dom.playerView.classList.contains('active')) {
        if (self.dom.playerOsd.classList.contains('visible')) {
          self.hideOsd();
        } else {
          self.closePlayerView();
        }
      } else if (self.currentView !== 'live') {
        self.switchView('live');
      } else {
        self.openExitModal();
      }
    });

    this.nav.on('toggle-subtitles', function () {
      if (self.dom.playerView.classList.contains('active')) {
        self.player.toggleSubtitles();
        self.updateSubtitlesButton();
        var isEnabled = self.player.isSubtitlesEnabled();
        var active = self.player.getActiveTextTrack();
        self.showToast(isEnabled ? ('Titulky: ' + (active ? active.label : 'Zapnuté')) : 'Titulky: Vypnuté');
      }
    });

    this.nav.on('channel-up', function () {
      if (self.player && (self.player.isReplay || self.player.isMovie) && self.dom.playerView.classList.contains('active')) {
        self.player.skip2Mins(true);
        self.showToast('⏩ Preskočené +2 minúty (CH ▲)');
        self.showOsd();
      } else if (self.player && self.player.isWebcam && self.dom.playerView.classList.contains('active')) {
        self.webcamStep(1);
      } else {
        self.channelStep(1);
      }
    });

    this.nav.on('channel-down', function () {
      if (self.player && (self.player.isReplay || self.player.isMovie) && self.dom.playerView.classList.contains('active')) {
        self.player.skip2Mins(false);
        self.showToast('⏪ Preskočené -2 minúty (CH ▼)');
        self.showOsd();
      } else if (self.player && self.player.isWebcam && self.dom.playerView.classList.contains('active')) {
        self.webcamStep(-1);
      } else {
        self.channelStep(-1);
      }
    });

    this.nav.on('skip-forward-2m', function () {
      if (self.player && (self.player.isReplay || self.player.isMovie)) {
        self.player.skip2Mins(true);
        self.showToast('⏩ Preskočené +2 minúty');
        self.showOsd();
      }
    });

    this.nav.on('skip-backward-2m', function () {
      if (self.player && (self.player.isReplay || self.player.isMovie)) {
        self.player.skip2Mins(false);
        self.showToast('⏪ Preskočené -2 minúty');
        self.showOsd();
      }
    });

    this.nav.on('seek-forward', function () {
      if (self.player && (self.player.isReplay || self.player.isMovie)) {
        self.player.seek(30);
        self.showOsd();
      }
    });

    this.nav.on('seek-backward', function () {
      if (self.player && (self.player.isReplay || self.player.isMovie)) {
        self.player.seek(-30);
        self.showOsd();
      }
    });

    this.nav.on('show-osd', function () {
      if (self.dom.playerView.classList.contains('active')) {
        self.toggleOsd();
      }
    });

    this.nav.on('play-pause', function () {
      if (self.dom.playerView.classList.contains('active')) {
        self.player.togglePlayPause();
        self.showOsd();
      }
    });

    this.nav.on('info', function () {
      if (self.dom.playerView.classList.contains('active')) {
        self.toggleOsd();
      }
    });

    this.nav.on('guide', function () {
      self.switchView('epg');
    });

    this.nav.on('color-red', function () {
      var firstCat = document.querySelector('.cat-pill');
      if (firstCat) self.nav.setFocus(firstCat);
    });

    this.nav.on('color-green', function () {
      self.switchView('epg');
    });

    this.nav.on('search-submit', function () {
      if (self.currentView === 'archive') {
        self.commitPendingSearch();
        self.executeArchiveSearch();
        var firstCard = self.dom.archiveProgramsList.querySelector('.archive-prog-card');
        if (firstCard) {
          self.nav.setFocus(firstCard);
        }
      }
    });

    this.nav.on('color-yellow', function () {
      if (self.dom.playerView.classList.contains('active') && self.player.currentChannel) {
        self.toggleFavorite(self.player.currentChannel.id);
      } else if (self.currentView === 'archive') {
        if (self.dom.archiveSearchInput) {
          self.nav.setFocus(self.dom.archiveSearchInput);
          self.dom.archiveSearchInput.focus();
        }
      } else {
        self.switchView('favs');
      }
    });

    this.nav.on('color-blue', function () {
      self.switchView('archive');
    });

    this.nav.on('num-input', function (buf) {
      self.dom.numericOverlay.textContent = buf;
      self.dom.numericOverlay.classList.add('visible');
    });

    this.nav.on('tune-channel-number', function (lcn) {
      self.dom.numericOverlay.classList.remove('visible');
      var foundIndex = -1;
      for (var i = 0; i < self.allChannels.length; i++) {
        if (self.allChannels[i].logicalChannelNumber === lcn) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex >= 0) {
        self.currentChannelIndex = foundIndex;
        self.tuneChannel(self.allChannels[foundIndex]);
      } else {
        self.showToast('Kanál číslo ' + lcn + ' sa nenašiel');
      }
    });
  };

  UpcApp.prototype.channelStep = function (delta) {
    if (this.player && this.player.isWebcam && this.dom.playerView.classList.contains('active')) {
      this.webcamStep(delta);
      return;
    }

    var list = (this.filteredChannels && this.filteredChannels.length > 0) ? this.filteredChannels : this.allChannels;
    if (!list || list.length === 0) return;

    var curIdx = -1;
    // Find currently playing channel in the active list
    if (this.player && this.player.currentChannel) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === this.player.currentChannel.id) {
          curIdx = i;
          break;
        }
      }
    }
    if (curIdx === -1) {
      curIdx = (this.currentChannelIndex >= 0 && this.currentChannelIndex < list.length) ? this.currentChannelIndex : 0;
    }

    var nextIdx = (curIdx + delta + list.length) % list.length;
    this.currentChannelIndex = nextIdx;
    var targetChannel = list[nextIdx];

    console.log('[UpcApp] Channel step (' + (delta > 0 ? '+1' : '-1') + ') -> [' + nextIdx + '] ' + targetChannel.name);

    // 1. Immediately show OSD with target channel information (0ms latency user feedback)
    this.openPlayerView();
    this.updateOsd(targetChannel);
    this.showOsd();

    // 2. Debounce actual playback initiation by 250ms to allow smooth rapid channel skipping
    var self = this;
    if (this.channelStepTimer) clearTimeout(this.channelStepTimer);
    this.channelStepTimer = setTimeout(function () {
      self.tuneChannel(targetChannel);
    }, 250);
  };

  UpcApp.prototype.switchView = function (view) {
    if (this.currentView === 'archive' && view !== 'archive') {
      this.commitPendingSearch();
    }
    if (this.dom.playerView && this.dom.playerView.classList.contains('active')) {
      this.closePlayerView();
    }
    this.currentView = view;
    if (view !== 'webcams') {
      this.stopRandomWebcamMode();
    }
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === view);
    });

    if (view === 'live' || view === 'favs') {
      this.dom.channelsGrid.style.display = 'grid';
      this.dom.epgView.classList.remove('active');
      if (this.dom.archiveView) this.dom.archiveView.classList.remove('active');
      if (this.dom.webcamsView) this.dom.webcamsView.classList.remove('active');
      if (this.dom.radiosView) this.dom.radiosView.classList.remove('active');
      document.getElementById('categoriesBar').style.display = 'flex';
      this.filterChannels();
    } else if (view === 'epg') {
      this.dom.channelsGrid.style.display = 'none';
      this.dom.epgView.classList.add('active');
      if (this.dom.archiveView) this.dom.archiveView.classList.remove('active');
      if (this.dom.webcamsView) this.dom.webcamsView.classList.remove('active');
      if (this.dom.radiosView) this.dom.radiosView.classList.remove('active');
      document.getElementById('categoriesBar').style.display = 'none';
      this.renderEpgView();
    } else if (view === 'archive') {
      this.dom.channelsGrid.style.display = 'none';
      this.dom.epgView.classList.remove('active');
      if (this.dom.archiveView) this.dom.archiveView.classList.add('active');
      if (this.dom.webcamsView) this.dom.webcamsView.classList.remove('active');
      if (this.dom.radiosView) this.dom.radiosView.classList.remove('active');
      document.getElementById('categoriesBar').style.display = 'none';
      this.renderArchiveView();

    } else if (view === 'webcams') {
      this.dom.channelsGrid.style.display = 'none';
      this.dom.epgView.classList.remove('active');
      if (this.dom.archiveView) this.dom.archiveView.classList.remove('active');
      if (this.dom.webcamsView) this.dom.webcamsView.classList.add('active');
      if (this.dom.radiosView) this.dom.radiosView.classList.remove('active');
      document.getElementById('categoriesBar').style.display = 'none';
      this.renderWebcamsView();
    } else if (view === 'radios') {
      this.dom.channelsGrid.style.display = 'none';
      this.dom.epgView.classList.remove('active');
      if (this.dom.archiveView) this.dom.archiveView.classList.remove('active');
      if (this.dom.webcamsView) this.dom.webcamsView.classList.remove('active');
      if (this.dom.radiosView) this.dom.radiosView.classList.add('active');
      document.getElementById('categoriesBar').style.display = 'none';
      this.renderRadiosView();
    } else if (view === 'settings') {
      this.openSettingsModal();
    }
  };



  /* ==========================================================================
     Webcams View & Playback Methods
     ========================================================================== */

  UpcApp.prototype.renderWebcamsView = function () {
    var self = this;
    var container = this.dom.webcamsGrid;
    if (!container) return;

    var list = window.SLOVAK_WEBCAMS || [];
    var filter = this.currentWebcamCategory || 'all';

    var filtered = list.filter(function (cam) {
      if (filter === 'all') return true;
      return cam.category === filter;
    });

    if (this.dom.webcamsCountBadge) {
      this.dom.webcamsCountBadge.textContent = filtered.length + ' ' + (filtered.length === 1 ? 'kamera' : (filtered.length < 5 ? 'kamery' : 'kamier'));
    }

    container.innerHTML = '';

    if (filtered.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; padding: 60px 20px; text-align: center; color: var(--text-secondary);">' +
        '<h3>Žiadne kamery v tejto kategórii</h3>' +
        '</div>';
      return;
    }

    var fragment = document.createDocumentFragment();

    // Special FIRST item: "Náhodné" (Random 60s rotation)
    var randomCard = document.createElement('div');
    randomCard.className = 'webcam-card webcam-card-random' + (self.isRandomWebcamMode ? ' active' : '');
    randomCard.setAttribute('data-nav', '');
    randomCard.setAttribute('data-cam-id', 'random-shuffle');

    randomCard.innerHTML =
      '<div class="webcam-card-media webcam-random-media">' +
      '<div class="webcam-random-bg">' +
      '<div class="webcam-random-dice">🎲</div>' +
      '<div class="webcam-random-stars">✨</div>' +
      '</div>' +
      '<div class="webcam-live-indicator webcam-random-indicator"><span class="shuffle-spin-icon">🔀</span> NÁHODNÉ</div>' +
      '<div class="webcam-badge-hd webcam-badge-timer">⏱ 60s ROTÁCIA</div>' +
      '<div class="webcam-play-overlay"><span class="play-icon">▶</span></div>' +
      '</div>' +
      '<div class="webcam-card-content">' +
      '<div class="webcam-card-header">' +
      '<span class="webcam-location-badge webcam-random-loc">Celé Slovensko</span>' +
      '<span class="webcam-category-tag webcam-random-cat">🎲 Náhodný výber</span>' +
      '</div>' +
      '<h3 class="webcam-card-title webcam-random-title">Náhodné webkamery</h3>' +
      '<div class="webcam-card-footer">' +
      '<span class="webcam-status-text webcam-random-status">🔀 Striedať každých 60s</span>' +
      '<span class="webcam-action-hint">Stlačte OK pre štart</span>' +
      '</div>' +
      '</div>';

    randomCard.addEventListener('click', function () {
      self.startRandomWebcamMode();
    });

    fragment.appendChild(randomCard);

    filtered.forEach(function (cam) {
      var card = document.createElement('div');
      card.className = 'webcam-card';
      card.setAttribute('data-nav', '');
      card.setAttribute('data-cam-id', cam.id);

      var numId = cam.id ? cam.id.split('-')[0] : '';
      var thumbUrl = cam.thumbnail || (numId ? 'https://www.zivekamery.sk/webkameraloader.php?id=' + numId + '&size=640x0' : '');

      card.innerHTML =
        '<div class="webcam-card-media">' +
        (thumbUrl ? '<img class="webcam-thumb-img" src="' + thumbUrl + '" alt="' + self.escapeHtml(cam.name) + '" loading="lazy" onerror="this.onerror=null; this.classList.add(\'thumb-failed\');">' : '') +
        '<div class="webcam-thumb-fallback">' +
        '<div class="webcam-icon-center">📷</div>' +
        '</div>' +
        '<div class="webcam-live-indicator"><span class="live-dot"></span> LIVE</div>' +
        '<div class="webcam-badge-hd">' + (cam.badge || '1080p HD') + '</div>' +
        '<div class="webcam-play-overlay"><span class="play-icon">▶</span></div>' +
        '</div>' +
        '<div class="webcam-card-content">' +
        '<div class="webcam-card-header">' +
        '<span class="webcam-location-badge">' + self.escapeHtml(cam.location) + '</span>' +
        '<span class="webcam-category-tag">' + self.escapeHtml(cam.category) + '</span>' +
        '</div>' +
        '<h3 class="webcam-card-title">' + self.escapeHtml(cam.name) + '</h3>' +
        '<div class="webcam-card-footer">' +
        '<span class="webcam-status-text">🟢 Online vysielanie</span>' +
        '<span class="webcam-action-hint">Stlačte OK pre spustenie</span>' +
        '</div>' +
        '</div>';

      card.addEventListener('click', function () {
        self.stopRandomWebcamMode();
        self.playWebcam(cam);
      });

      fragment.appendChild(card);
    });

    container.appendChild(fragment);

    setTimeout(function () {
      var firstCard = container.querySelector('.webcam-card');
      if (firstCard && self.currentView === 'webcams') {
        self.nav.setFocus(firstCard);
      }
    }, 50);
  };

  UpcApp.prototype.isWebcamActive = function () {
    return this.currentView === 'webcams' ||
      (this.player && this.player.isWebcam && this.dom.playerView && this.dom.playerView.classList.contains('active')) ||
      !!this.currentWebcamPlaying;
  };

  UpcApp.prototype.startRandomWebcamMode = function () {
    this.isRandomWebcamMode = true;
    console.log('[UpcApp] Starting Random Webcams Mode (60s timer)...');

    var cam = this.pickNextRandomWebcam();
    if (cam) {
      this.showToast('🎲 Náhodný výber spustený (60s rotácia)');
      this.playWebcam(cam);
    }
  };

  UpcApp.prototype.stopRandomWebcamMode = function () {
    this.isRandomWebcamMode = false;
    this.stopRandomWebcamTimer();
    this.updateRandomWebcamOsdUi();
  };

  UpcApp.prototype.toggleRandomWebcamMode = function () {
    if (this.isRandomWebcamMode) {
      this.stopRandomWebcamMode();
      this.showToast('⏹ Náhodný režim zastavený');
    } else {
      this.startRandomWebcamMode();
    }
  };

  UpcApp.prototype.pickNextRandomWebcam = function () {
    var self = this;
    var list = window.SLOVAK_WEBCAMS || [];
    if (!list.length) return null;

    var filter = this.currentWebcamCategory || 'all';
    var pool = list.filter(function (cam) {
      return filter === 'all' || cam.category === filter;
    });
    if (!pool.length) pool = list;

    if (!this.randomWebcamHistory) this.randomWebcamHistory = [];
    var currentId = this.currentWebcamPlaying ? this.currentWebcamPlaying.id : null;

    var candidates = pool.filter(function (cam) {
      return cam.id !== currentId && self.randomWebcamHistory.indexOf(cam.id) === -1;
    });

    if (!candidates.length) {
      this.randomWebcamHistory = currentId ? [currentId] : [];
      candidates = pool.filter(function (cam) { return cam.id !== currentId; });
      if (!candidates.length) candidates = pool;
    }

    var chosen = candidates[Math.floor(Math.random() * candidates.length)];
    this.randomWebcamHistory.push(chosen.id);
    if (this.randomWebcamHistory.length > 20) {
      this.randomWebcamHistory.shift();
    }
    return chosen;
  };

  UpcApp.prototype.startRandomWebcamTimer = function () {
    var self = this;
    this.stopRandomWebcamTimer();
    this.randomWebcamSecondsLeft = 60;
    this.updateRandomWebcamOsdUi();

    this.randomWebcamInterval = setInterval(function () {
      if (!self.isRandomWebcamMode || !self.isWebcamActive() || !self.dom.playerView.classList.contains('active')) {
        self.stopRandomWebcamTimer();
        return;
      }

      self.randomWebcamSecondsLeft--;
      self.updateRandomWebcamOsdUi();

      if (self.randomWebcamSecondsLeft <= 0) {
        console.log('[UpcApp] 60s random timer reached 0 -> switching to next random webcam...');
        var nextCam = self.pickNextRandomWebcam();
        if (nextCam) {
          self.playWebcam(nextCam);
        }
      }
    }, 1000);
  };

  UpcApp.prototype.stopRandomWebcamTimer = function () {
    if (this.randomWebcamInterval) {
      clearInterval(this.randomWebcamInterval);
      this.randomWebcamInterval = null;
    }
    this.randomWebcamSecondsLeft = 60;
  };

  UpcApp.prototype.updateRandomWebcamOsdUi = function () {
    if (this.dom.btnOsdRandom) {
      if (this.isRandomWebcamMode) {
        this.dom.btnOsdRandom.style.display = 'inline-flex';
        this.dom.btnOsdRandom.classList.add('active');
        if (this.dom.osdRandomText) {
          this.dom.osdRandomText.textContent = '🔀 Náhodne: ' + this.randomWebcamSecondsLeft + 's';
        }
      } else {
        if (this.player && this.player.isWebcam) {
          this.dom.btnOsdRandom.style.display = 'inline-flex';
          this.dom.btnOsdRandom.classList.remove('active');
          if (this.dom.osdRandomText) {
            this.dom.osdRandomText.textContent = '🎲 Spustiť náhodné';
          }
        } else {
          this.dom.btnOsdRandom.style.display = 'none';
        }
      }
    }

    if (this.isRandomWebcamMode && this.player && this.player.isWebcam) {
      if (this.dom.osdReplayTag) {
        this.dom.osdReplayTag.style.display = 'inline-flex';
        this.dom.osdReplayTag.textContent = '● 🔀 NÁHODNE (' + this.randomWebcamSecondsLeft + 's)';
      }
      if (this.dom.osdEndTime) {
        this.dom.osdEndTime.textContent = '⏱ ' + this.randomWebcamSecondsLeft + 's';
      }
    }
  };

  UpcApp.prototype.playWebcam = function (webcam) {
    var self = this;
    if (!webcam) return;
    this.stopRadio();
    if (this.webcamStepTimer) {
      clearTimeout(this.webcamStepTimer);
      this.webcamStepTimer = null;
    }
    console.log('[UpcApp] Playing webcam feed:', webcam.name, webcam.streamUrl);

    this.currentWebcamPlaying = webcam;
    this.currentMoviePlaying = null;

    if (webcam && webcam.id) {
      try {
        localStorage.setItem('upc_last_played', JSON.stringify({ type: 'webcam', id: webcam.id }));
      } catch (e) { }

      if (window.upcTelemetry && typeof window.upcTelemetry.recordStart === 'function') {
        window.upcTelemetry.recordStart('webcam', {
          webcamId: webcam.id,
          webcamName: webcam.name,
          category: webcam.category,
          streamUrl: webcam.streamUrl
        });
      }
    }

    this.openPlayerView();

    // MUTE VIDEO ELEMENT IMMEDIATELY before any playback or load starts!
    if (this.player && typeof this.player.enforceWebcamMute === 'function') {
      this.player.enforceWebcamMute();
    } else if (this.player && this.player.videoElement) {
      this.player.videoElement.muted = true;
      this.player.videoElement.defaultMuted = true;
      this.player.videoElement.volume = 0;
      this.player.videoElement.setAttribute('muted', '');
    }

    // Setup OSD for webcam
    if (this.dom.osdLogo) this.dom.osdLogo.src = 'icon.png';
    if (this.dom.osdLcn) this.dom.osdLcn.textContent = this.isRandomWebcamMode ? '🎲 AUTO' : 'CAM';
    if (this.dom.osdChannelName) this.dom.osdChannelName.textContent = webcam.name;
    if (this.dom.osdReplayTag) {
      this.dom.osdReplayTag.style.display = 'inline-flex';
      this.dom.osdReplayTag.textContent = this.isRandomWebcamMode ? '● 🔀 NÁHODNE (60s)' : '● LIVE KAMERA';
    }
    if (this.dom.osdCurrentShow) this.dom.osdCurrentShow.textContent = 'Živý záber – ' + webcam.location;
    if (this.dom.osdNextShow) {
      this.dom.osdNextShow.textContent = this.isRandomWebcamMode
        ? ('Kategória: ' + webcam.category + ' • 🔀 Ďalšia náhodná kamera za ' + this.randomWebcamSecondsLeft + 's')
        : ('Kategória: ' + webcam.category + ' • Full HD 1080p');
    }
    if (this.dom.osdStartTime) this.dom.osdStartTime.textContent = this.isRandomWebcamMode ? 'ROTÁCIA' : 'ONLINE';
    if (this.dom.osdEndTime) this.dom.osdEndTime.textContent = this.isRandomWebcamMode ? ('⏱ ' + this.randomWebcamSecondsLeft + 's') : 'LIVE';
    if (this.dom.osdProgress) this.dom.osdProgress.style.width = '100%';

    // Hide replay and TV-only buttons
    if (this.dom.btnOsdSkipBack2m) this.dom.btnOsdSkipBack2m.style.display = 'none';
    if (this.dom.btnOsdSkipForward2m) this.dom.btnOsdSkipForward2m.style.display = 'none';
    if (this.dom.btnOsdRestart) this.dom.btnOsdRestart.style.display = 'none';
    if (this.dom.btnOsdStartOver) this.dom.btnOsdStartOver.style.display = 'none';
    if (this.dom.btnOsdAudio) this.dom.btnOsdAudio.style.display = 'none';
    if (this.dom.btnOsdSubtitles) this.dom.btnOsdSubtitles.style.display = 'none';
    if (this.dom.btnOsdFav) this.dom.btnOsdFav.style.display = 'none';

    // Show random webcam control button in OSD
    this.updateRandomWebcamOsdUi();


    if (this.isRandomWebcamMode) {
      this.startRandomWebcamTimer();
    } else {
      this.stopRandomWebcamTimer();
    }

    this.showSpinner('Pripájam živú webkameru...');
    this.showOsd();


    this.player.playWebcam(webcam).then(function () {
      self.hideSpinner();
      if (self.player && typeof self.player.enforceWebcamMute === 'function') {
        self.player.enforceWebcamMute();
      }
      self.showToast('Prehrávam: ' + webcam.name);
    }).catch(function (err) {
      self.hideSpinner();
      if (err && (err.name === 'AbortError' || (err.message && err.message.indexOf('interrupted') !== -1))) {
        console.log('[UpcApp] Benign play() interruption during webcam switch, suppressing toast.');
        return;
      }
      self.showToast('Chyba webkamery: ' + (err.message || 'Nepodarilo sa načítať'));
    });
  };

  UpcApp.prototype.webcamStep = function (delta) {
    var self = this;
    var list = window.SLOVAK_WEBCAMS || [];
    if (!list.length) return;

    var filter = this.currentWebcamCategory || 'all';
    var filtered = list.filter(function (cam) {
      if (filter === 'all') return true;
      return cam.category === filter;
    });

    if (!filtered.length) filtered = list;

    var curIdx = -1;
    var current = this.currentWebcamPlaying;
    if (current) {
      for (var i = 0; i < filtered.length; i++) {
        if (filtered[i].id === current.id) {
          curIdx = i;
          break;
        }
      }
    }

    if (curIdx === -1) curIdx = 0;

    var nextIdx = (curIdx + delta + filtered.length) % filtered.length;
    var nextWebcam = filtered[nextIdx];
    if (this.isRandomWebcamMode) {
      var nextRandom = this.pickNextRandomWebcam();
      if (nextRandom) nextWebcam = nextRandom;
      this.startRandomWebcamTimer();
    }
    this.currentWebcamPlaying = nextWebcam;

    console.log('[UpcApp] Webcam step (' + (delta > 0 ? '+1' : '-1') + ') -> [' + (nextIdx + 1) + '/' + filtered.length + '] ' + nextWebcam.name);


    // 1. Instant 0ms OSD and toast feedback
    this.openPlayerView();
    if (this.dom.osdLogo) this.dom.osdLogo.src = 'icon.png';
    if (this.dom.osdLcn) this.dom.osdLcn.textContent = this.isRandomWebcamMode ? '🎲 AUTO' : ('CAM ' + (nextIdx + 1));
    if (this.dom.osdChannelName) this.dom.osdChannelName.textContent = nextWebcam.name;
    if (this.dom.osdReplayTag) {
      this.dom.osdReplayTag.style.display = 'inline-flex';
      this.dom.osdReplayTag.textContent = this.isRandomWebcamMode ? '● 🔀 NÁHODNE (60s)' : '● LIVE KAMERA';
    }
    if (this.dom.osdCurrentShow) this.dom.osdCurrentShow.textContent = 'Živý záber – ' + nextWebcam.location;
    if (this.dom.osdNextShow) {
      this.dom.osdNextShow.textContent = this.isRandomWebcamMode
        ? ('Kategória: ' + nextWebcam.category + ' • 🔀 Ďalšia náhodná kamera za 60s')
        : ('Kategória: ' + nextWebcam.category + ' (' + (nextIdx + 1) + '/' + filtered.length + ') • Full HD 1080p');
    }
    if (this.dom.osdStartTime) this.dom.osdStartTime.textContent = this.isRandomWebcamMode ? 'ROTÁCIA' : 'ONLINE';
    if (this.dom.osdEndTime) this.dom.osdEndTime.textContent = this.isRandomWebcamMode ? '⏱ 60s' : 'LIVE';
    if (this.dom.osdProgress) this.dom.osdProgress.style.width = '100%';
    this.showOsd();
    if (this.isRandomWebcamMode) {
      this.showToast('🔀 ' + nextWebcam.name + ' (60s)');
    } else {
      this.showToast('📷 ' + nextWebcam.name + ' (' + (nextIdx + 1) + '/' + filtered.length + ')');
    }

    // 2. Debounce actual stream loading by 250ms for smooth rapid remote button pressing
    if (this.webcamStepTimer) clearTimeout(this.webcamStepTimer);
    this.webcamStepTimer = setTimeout(function () {
      self.playWebcam(nextWebcam);
    }, 250);
  };

  /* ==========================================================================
     Slovak & Czech Radios View & Playback Methods
     ========================================================================== */

  UpcApp.prototype.renderRadiosView = function () {
    var self = this;
    var container = this.dom.radiosGrid;
    if (!container) return;

    var list = window.SK_CZ_RADIOS || [];
    var filter = this.currentRadioCategory || 'all';

    var filtered = list.filter(function (r) {
      if (filter === 'all') return true;
      if (filter === 'sk') return r.country === 'sk';
      if (filter === 'cz') return r.country === 'cz';
      return r.category === filter;
    });

    if (this.dom.radiosCountBadge) {
      this.dom.radiosCountBadge.textContent = filtered.length + ' ' + (filtered.length === 1 ? 'stanica' : (filtered.length < 5 ? 'stanice' : 'staníc'));
    }

    container.innerHTML = '';

    if (filtered.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; padding: 60px 20px; text-align: center; color: var(--text-secondary);">' +
        '<h3>Žiadne rádiá v tejto kategórii</h3>' +
        '</div>';
      return;
    }

    var fragment = document.createDocumentFragment();

    filtered.forEach(function (radio) {
      var isPlayingThis = (self.currentRadioPlaying && self.currentRadioPlaying.id === radio.id && self.isRadioPlaying);

      var card = document.createElement('div');
      card.className = 'radio-card' + (isPlayingThis ? ' playing' : '');
      card.setAttribute('data-nav', '');
      card.setAttribute('data-radio-id', radio.id);

      var flagIcon = radio.country === 'sk' ? '🇸🇰' : '🇨🇿';
      var countryLabel = radio.country === 'sk' ? 'SK' : 'CZ';

      card.innerHTML =
        '<div class="radio-card-header">' +
        '<div class="radio-badges-left">' +
        '<span class="radio-flag-badge">' + flagIcon + ' ' + countryLabel + '</span>' +
        '<span class="radio-rank-badge">' + (radio.badge || ('#' + radio.rank)) + '</span>' +
        '</div>' +
        '<span class="radio-bitrate-badge">🎵 ' + (radio.bitrate || '128 kbps') + '</span>' +
        '</div>' +
        '<div class="radio-card-main">' +
        '<div class="radio-logo-wrap" style="background:' + (radio.color || '#1a237e') + ';">' +
        (radio.logo ? '<img class="radio-logo-img" src="' + radio.logo + '" alt="' + self.escapeHtml(radio.name) + '" onerror="this.style.display=\'none\'; if(this.nextElementSibling) this.nextElementSibling.style.display=\'block\';">' : '') +
        '<span class="radio-monogram" style="' + (radio.logo ? 'display:none;' : '') + '">' + (radio.monogram || 'FM') + '</span>' +
        '</div>' +
        '<div class="radio-info">' +
        '<h3 class="radio-name">' + self.escapeHtml(radio.name) + '</h3>' +
        '<span class="radio-sub">' + self.escapeHtml(radio.slogan || (radio.freq + ' • Naživo')) + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="radio-card-footer">' +
        '<span class="radio-status-text">' +
        (isPlayingThis ? '🟢 Práve hrá' : '▶ Stlačte OK pre prehratie') +
        '</span>' +
        '<div class="radio-card-eq" style="' + (isPlayingThis ? 'display:flex;' : 'display:none;') + '">' +
        '<span class="eq-bar"></span>' +
        '<span class="eq-bar"></span>' +
        '<span class="eq-bar"></span>' +
        '<span class="eq-bar"></span>' +
        '</div>' +
        '</div>';

      card.addEventListener('click', function () {
        self.playRadio(radio);
      });

      fragment.appendChild(card);
    });

    container.appendChild(fragment);

    setTimeout(function () {
      var firstCard = container.querySelector('.radio-card');
      if (firstCard && self.currentView === 'radios' && !document.querySelector('.radio-card.focused') && !document.querySelector('.radio-cat-pill.focused')) {
        self.nav.setFocus(firstCard);
      }
    }, 50);
  };

  UpcApp.prototype.playRadio = function (radioStation) {
    var self = this;
    if (!radioStation) return;

    // If currently watching video / TV channel or webcam, stop/close it
    if (this.player && typeof this.player.stop === 'function') {
      try { this.player.stop(); } catch (e) { }
    }
    if (typeof this.stopAvplayWebcam === 'function') {
      try { this.stopAvplayWebcam(); } catch (e) { }
    }
    if (this.dom.playerView && this.dom.playerView.classList.contains('active')) {
      this.closePlayerView();
    }
    this.currentWebcamPlaying = null;
    this.currentMoviePlaying = null;

    // If clicking on already playing radio, toggle pause/play
    if (this.currentRadioPlaying && this.currentRadioPlaying.id === radioStation.id && this.dom.radioAudio && this.dom.radioAudio.src) {
      this.toggleRadioPlayback();
      return;
    }

    this.currentRadioPlaying = radioStation;

    // Save to localStorage for autoStartLastPlayed
    try {
      localStorage.setItem('upc_last_played', JSON.stringify({ type: 'radio', id: radioStation.id }));
    } catch (e) { }

    if (window.upcTelemetry && typeof window.upcTelemetry.recordStart === 'function') {
      window.upcTelemetry.recordStart('radio', {
        radioId: radioStation.id,
        radioName: radioStation.name,
        country: radioStation.country,
        genre: radioStation.genre,
        streamUrl: radioStation.streamUrl
      });
    }

    var audio = this.dom.radioAudio;
    if (!audio) {
      audio = document.getElementById('radioAudio');
      this.dom.radioAudio = audio;
    }

    if (audio) {
      audio.pause();
      audio.src = radioStation.streamUrl;
      var playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(function () {
          self.isRadioPlaying = true;
          self.updateRadioUiPlayingState(true);
          self.startRadioPictureOffTimer();
        }).catch(function (err) {
          console.warn('[UpcApp] Radio audio play failed with primary URL:', err);
          if (radioStation.backupUrl) {
            audio.src = radioStation.backupUrl;
            audio.play().then(function () {
              self.isRadioPlaying = true;
              self.updateRadioUiPlayingState(true);
              self.startRadioPictureOffTimer();
            }).catch(function (bErr) {
              self.showToast('Chyba prehrávania rádia: ' + bErr.message);
              self.clearRadioPictureOffTimer();
              self.disablePictureOff();
            });
          } else {
            self.showToast('Chyba prehrávania rádia: ' + err.message);
            self.clearRadioPictureOffTimer();
            self.disablePictureOff();
          }
        });
      }
    }

    this.showToast('📻 Prehrávam rádio: ' + radioStation.name + ' (' + (radioStation.bitrate || '128 kbps') + ')');
    this.updateRadioPlayerBar(radioStation, true);
    this.updateRadioCardsPlayingHighlight(radioStation.id, true);
  };

  UpcApp.prototype.toggleRadioPlayback = function () {
    var audio = this.dom.radioAudio;
    if (!audio || !this.currentRadioPlaying) return;

    if (audio.paused) {
      var self = this;
      audio.play().then(function () {
        self.isRadioPlaying = true;
        self.updateRadioUiPlayingState(true);
        self.startRadioPictureOffTimer();
        self.showToast('▶ Obnovené prehrávanie: ' + self.currentRadioPlaying.name);
      }).catch(function (e) {
        self.showToast('Chyba: ' + e.message);
      });
    } else {
      audio.pause();
      this.isRadioPlaying = false;
      this.clearRadioPictureOffTimer();
      this.disablePictureOff();
      this.updateRadioUiPlayingState(false);
      this.showToast('⏸ Pozastavené rádio: ' + this.currentRadioPlaying.name);
    }
  };

  UpcApp.prototype.stopRadio = function () {
    this.clearRadioPictureOffTimer();
    this.disablePictureOff();

    this.isRadioPlaying = false;
    this.currentRadioPlaying = null;

    var audio = this.dom.radioAudio;
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch (e) { }
    }

    if (this.dom.radioPlayerBar) {
      this.dom.radioPlayerBar.style.display = 'none';
    }

    this.updateRadioCardsPlayingHighlight(null, false);
  };

  UpcApp.prototype.updateRadioUiPlayingState = function (isPlaying) {
    if (this.currentRadioPlaying) {
      this.updateRadioPlayerBar(this.currentRadioPlaying, isPlaying);
      this.updateRadioCardsPlayingHighlight(this.currentRadioPlaying.id, isPlaying);
    }
  };

  UpcApp.prototype.updateRadioCardsPlayingHighlight = function (activeId, isPlaying) {
    var cards = document.querySelectorAll('.radio-card');
    cards.forEach(function (card) {
      var cardId = card.getAttribute('data-radio-id');
      var statusEl = card.querySelector('.radio-status-text');
      var eqEl = card.querySelector('.radio-card-eq');

      if (cardId === activeId && isPlaying) {
        card.classList.add('playing');
        if (statusEl) statusEl.textContent = '🟢 Práve hrá';
        if (eqEl) eqEl.style.display = 'flex';
      } else {
        card.classList.remove('playing');
        if (statusEl) statusEl.textContent = '▶ Stlačte OK pre prehratie';
        if (eqEl) eqEl.style.display = 'none';
      }
    });
  };

  UpcApp.prototype.updateRadioPlayerBar = function (radio, isPlaying) {
    var bar = this.dom.radioPlayerBar;
    if (!bar) return;

    bar.style.display = 'flex';

    if (this.dom.rbarName) this.dom.rbarName.textContent = radio.name;
    if (this.dom.rbarCountry) this.dom.rbarCountry.textContent = (radio.country === 'sk' ? '🇸🇰 Slovensko' : '🇨🇿 Česko');
    if (this.dom.rbarBadge) this.dom.rbarBadge.textContent = radio.badge || ('#' + radio.rank);
    if (this.dom.rbarSub) this.dom.rbarSub.textContent = radio.freq + (radio.slogan ? (' • ' + radio.slogan) : '');
    if (this.dom.rbarQuality) this.dom.rbarQuality.textContent = radio.bitrate || '128 kbps HD';
    if (this.dom.rbarStatus) this.dom.rbarStatus.textContent = isPlaying ? 'Prehráva sa naživo' : 'Pozastavené';

    if (this.dom.btnRadioTogglePlay) {
      this.dom.btnRadioTogglePlay.innerHTML = '<span id="rbarPlayIcon">' + (isPlaying ? '⏸' : '▶') + '</span> ' + (isPlaying ? 'Pozastaviť' : 'Pokračovať');
    }

    if (this.dom.rbarLogo) {
      if (radio.logo) {
        this.dom.rbarLogo.src = radio.logo;
        this.dom.rbarLogo.style.display = 'block';
      } else {
        this.dom.rbarLogo.style.display = 'none';
      }
    }
    if (this.dom.rbarMonogram) {
      this.dom.rbarMonogram.textContent = radio.monogram || 'FM';
    }
    if (this.dom.rbarLogoWrap) {
      this.dom.rbarLogoWrap.style.background = radio.color || 'rgba(255, 255, 255, 0.08)';
    }

    var eqAnim = bar.querySelector('.rbar-eq-anim');
    if (eqAnim) {
      eqAnim.style.opacity = isPlaying ? '1' : '0.3';
    }
  };

  UpcApp.prototype.initPictureOffHandler = function () {
    var self = this;

    function isVolumeKey(e) {
      if (!e) return false;
      var code = e.keyCode;
      var key = e.key || '';
      var codeStr = e.code || '';

      // Tizen keycodes: 447 (VolumeUp), 448 (VolumeDown), 449 (VolumeMute)
      // Web standard keycodes: 175 (VolumeUp), 174 (VolumeDown), 173 (VolumeMute), 181
      if (code === 447 || code === 448 || code === 449 ||
        code === 175 || code === 174 || code === 173 || code === 181) {
        return true;
      }
      if (key === 'AudioVolumeUp' || key === 'AudioVolumeDown' || key === 'AudioVolumeMute' ||
        key === 'VolumeUp' || key === 'VolumeDown' || key === 'VolumeMute') {
        return true;
      }
      if (codeStr === 'AudioVolumeUp' || codeStr === 'AudioVolumeDown' || codeStr === 'AudioVolumeMute' ||
        codeStr === 'VolumeUp' || codeStr === 'VolumeDown' || codeStr === 'VolumeMute') {
        return true;
      }
      return false;
    }

    // Window capture phase: intercepts remote keys before spatial navigation
    window.addEventListener('keydown', function (e) {
      if (self.isPictureOffActive) {
        if (isVolumeKey(e)) {
          // Ignore volume button press - keep picture off and let TV hardware adjust sound volume
          return;
        }

        // Any other button wakes up the display
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        self.disablePictureOff(true);
        return;
      }

      // If radio is playing and picture is on, any button press resets the 60s inactivity countdown
      if (self.isRadioPlaying && self.currentRadioPlaying) {
        self.startRadioPictureOffTimer();
      }
    }, true);

    // Mouse / pointer click also wakes up display
    window.addEventListener('click', function (e) {
      if (self.isPictureOffActive) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        self.disablePictureOff(true);
      }
    }, true);
  };

  UpcApp.prototype.startRadioPictureOffTimer = function () {
    this.clearRadioPictureOffTimer();
    if (!this.isRadioPlaying || !this.currentRadioPlaying) return;
    if (this.isPictureOffActive) return;

    var self = this;
    // 1 minute = 60 seconds
    var TIMEOUT_MS = 60000;
    this.radioPictureOffTimer = setTimeout(function () {
      if (self.isRadioPlaying && !self.isPictureOffActive) {
        self.enablePictureOff();
      }
    }, TIMEOUT_MS);
  };

  UpcApp.prototype.clearRadioPictureOffTimer = function () {
    if (this.radioPictureOffTimer) {
      clearTimeout(this.radioPictureOffTimer);
      this.radioPictureOffTimer = null;
    }
  };

  UpcApp.prototype.enablePictureOff = function () {
    if (this.isPictureOffActive) return;
    if (!this.isRadioPlaying) return;

    this.isPictureOffActive = true;
    console.log('[UpcApp] Picture Off activated (sound only, screen blanked)');

    var overlay = this.dom.pictureOffOverlay || document.getElementById('pictureOffOverlay');
    if (overlay) {
      overlay.style.display = 'block';
    }

    // Try native Tizen display/screensaver power methods if available
    try {
      if (typeof tizen !== 'undefined' && tizen.power && typeof tizen.power.request === 'function') {
        tizen.power.request('SCREEN', 'SCREEN_OFF');
      }
    } catch (e) { }

    try {
      if (typeof webapis !== 'undefined' && webapis.appcommon && typeof webapis.appcommon.setScreenSaver === 'function') {
        webapis.appcommon.setScreenSaver(webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_ON, function () { }, function () { });
      }
    } catch (e) { }
  };

  UpcApp.prototype.disablePictureOff = function (showNotice) {
    if (!this.isPictureOffActive) return;

    this.isPictureOffActive = false;
    console.log('[UpcApp] Picture Off deactivated (restoring display)');

    var overlay = this.dom.pictureOffOverlay || document.getElementById('pictureOffOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }

    // Restore native Tizen display state
    try {
      if (typeof tizen !== 'undefined' && tizen.power && typeof tizen.power.request === 'function') {
        tizen.power.request('SCREEN', 'SCREEN_NORMAL');
      }
    } catch (e) { }

    try {
      if (typeof webapis !== 'undefined' && webapis.appcommon && typeof webapis.appcommon.setScreenSaver === 'function') {
        webapis.appcommon.setScreenSaver(webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF, function () { }, function () { });
      }
    } catch (e) { }

    if (showNotice) {
      this.showToast('📺 Obrazovka zapnutá (Picture On)');
    }

    // If radio is still playing, restart 60s countdown for next inactivity period
    if (this.isRadioPlaying && this.currentRadioPlaying) {
      this.startRadioPictureOffTimer();
    }
  };

  UpcApp.prototype.bindDomEvents = function () {
    var self = this;

    // View tabs
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = this.getAttribute('data-tab');
        self.switchView(tab);
      });
    });

    // Category pills
    document.querySelectorAll('.cat-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        document.querySelectorAll('.cat-pill').forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');
        self.currentCategory = pill.getAttribute('data-cat');
        self.filterChannels();
      });
    });



    // Webcams category pills
    document.querySelectorAll('.webcam-cat-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        document.querySelectorAll('.webcam-cat-pill').forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');
        self.currentWebcamCategory = pill.getAttribute('data-cat');
        self.renderWebcamsView();
      });
    });

    // Webcam Random Start pill in toolbar
    if (this.dom.btnWebcamRandomStart) {
      this.dom.btnWebcamRandomStart.addEventListener('click', function () {
        self.startRandomWebcamMode();
      });
    }

    // Radio category pills
    document.querySelectorAll('.radio-cat-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        document.querySelectorAll('.radio-cat-pill').forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');
        self.currentRadioCategory = pill.getAttribute('data-cat');
        self.renderRadiosView();
      });
    });

    if (this.dom.btnRadioTogglePlay) {
      this.dom.btnRadioTogglePlay.addEventListener('click', function () {
        self.toggleRadioPlayback();
      });
    }

    if (this.dom.btnRadioStop) {
      this.dom.btnRadioStop.addEventListener('click', function () {
        self.stopRadio();
      });
    }

    if (this.dom.btnRadioPictureOff) {
      this.dom.btnRadioPictureOff.addEventListener('click', function () {
        if (self.isRadioPlaying && self.currentRadioPlaying) {
          self.enablePictureOff();
        } else {
          self.showToast('Najskôr spustite rádio');
        }
      });
    }

    if (this.dom.radioAudio) {
      this.dom.radioAudio.addEventListener('play', function () {
        self.isRadioPlaying = true;
        self.updateRadioUiPlayingState(true);
        self.startRadioPictureOffTimer();
      });
      this.dom.radioAudio.addEventListener('pause', function () {
        self.isRadioPlaying = false;
        self.updateRadioUiPlayingState(false);
        self.clearRadioPictureOffTimer();
      });
      this.dom.radioAudio.addEventListener('ended', function () {
        self.isRadioPlaying = false;
        self.updateRadioUiPlayingState(false);
        self.clearRadioPictureOffTimer();
        self.disablePictureOff();
      });
      this.dom.radioAudio.addEventListener('error', function (e) {
        if (!self.currentRadioPlaying || !self.isRadioPlaying) {
          return;
        }
        console.warn('[UpcApp] Radio audio error, attempting fallback if available...', e);
        if (self.currentRadioPlaying && self.currentRadioPlaying.backupUrl && self.dom.radioAudio.src !== self.currentRadioPlaying.backupUrl) {
          self.dom.radioAudio.src = self.currentRadioPlaying.backupUrl;
          self.dom.radioAudio.play().catch(function (err) {
            self.showToast('Chyba streamu rádia: ' + (err.message || 'Nepodarilo sa prehrať'));
            self.clearRadioPictureOffTimer();
            self.disablePictureOff();
          });
        } else {
          self.showToast('Chyba streamu rádia: ' + (self.currentRadioPlaying ? self.currentRadioPlaying.name : 'Rádio'));
          self.clearRadioPictureOffTimer();
          self.disablePictureOff();
        }
      });
    }


    // Archive Search Input & Clear
    if (this.dom.archiveSearchInput) {
      this.dom.archiveSearchInput.addEventListener('input', function (e) {
        self.handleArchiveSearchInput(e.target.value);
      });
      this.dom.archiveSearchInput.addEventListener('focus', function () {
        self.renderRecentSearches();
      });
      this.dom.archiveSearchInput.addEventListener('blur', function () {
        self.commitPendingSearch();
      });
      this.dom.archiveSearchInput.addEventListener('keydown', function (e) {
        if (e.keyCode === 13) {
          e.preventDefault();
          if (self.archiveSearchQuery && self.archiveSearchQuery.length >= 3) {
            self.commitPendingSearch();
            self.executeArchiveSearch();
          }
        }
      });
    }

    if (this.dom.btnArchiveSearchClear) {
      this.dom.btnArchiveSearchClear.addEventListener('click', function () {
        self.clearArchiveSearch();
      });
    }

    if (this.dom.btnClearRecentSearches) {
      this.dom.btnClearRecentSearches.addEventListener('click', function () {
        self.clearRecentSearches();
      });
    }

    // Archive Search Scope Pills
    if (this.dom.btnScopeChannel) {
      this.dom.btnScopeChannel.addEventListener('click', function () {
        self.setArchiveSearchScope('channel');
      });
    }
    if (this.dom.btnScopeDay) {
      this.dom.btnScopeDay.addEventListener('click', function () {
        self.setArchiveSearchScope('day');
      });
    }
    if (this.dom.btnScopeWeek) {
      this.dom.btnScopeWeek.addEventListener('click', function () {
        self.setArchiveSearchScope('week');
      });
    }


    // Archive play button in preview card
    if (this.dom.btnPlayArchiveEvent) {
      this.dom.btnPlayArchiveEvent.addEventListener('click', function () {
        if (self.selectedArchiveChannel && self.selectedArchiveEvent) {
          self.playArchiveEvent(self.selectedArchiveChannel, self.selectedArchiveEvent);
        }
      });
    }

    if (this.dom.btnPlayArchiveSkip2m) {
      this.dom.btnPlayArchiveSkip2m.addEventListener('click', function () {
        if (self.selectedArchiveChannel && self.selectedArchiveEvent) {
          self.playArchiveEvent(self.selectedArchiveChannel, self.selectedArchiveEvent, 120);
        }
      });
    }

    // OSD controls
    document.getElementById('btnOsdBack').addEventListener('click', function () {
      self.closePlayerView();
    });

    document.getElementById('btnOsdPrev').addEventListener('click', function () {
      self.channelStep(-1);
    });

    if (this.dom.btnOsdSkipBack2m) {
      this.dom.btnOsdSkipBack2m.addEventListener('click', function () {
        if (self.player && (self.player.isReplay || self.player.isMovie)) {
          self.player.skip2Mins(false);
          self.showToast('⏪ Preskočené -2 minúty');
          self.showOsd();
        }
      });
    }

    if (this.dom.btnOsdSeekBack) {
      this.dom.btnOsdSeekBack.addEventListener('click', function () {
        if (self.player) self.player.seek(-30);
      });
    }

    document.getElementById('btnOsdPlayPause').addEventListener('click', function () {
      self.player.togglePlayPause();
    });

    if (this.dom.btnOsdSeekForward) {
      this.dom.btnOsdSeekForward.addEventListener('click', function () {
        if (self.player) self.player.seek(30);
      });
    }

    if (this.dom.btnOsdSkipForward2m) {
      this.dom.btnOsdSkipForward2m.addEventListener('click', function () {
        if (self.player && (self.player.isReplay || self.player.isMovie)) {
          self.player.skip2Mins(true);
          self.showToast('⏩ Preskočené +2 minúty');
          self.showOsd();
        }
      });
    }

    if (this.dom.btnOsdRestart) {
      this.dom.btnOsdRestart.addEventListener('click', function () {
        if (self.player) {
          if (self.player.isMovie) {
            self.player.seekTo(0);
            if (self.player.currentMovie) {
              try { localStorage.removeItem('upc_movie_pos_' + self.player.currentMovie.id); } catch (e) { }
            }
            self.showToast('↺ Film spustený od začiatku (00:00)');
            self.showOsd();
          } else {
            self.player.restartReplay();
          }
        }
      });
    }

    if (this.dom.btnOsdStartOver) {
      this.dom.btnOsdStartOver.addEventListener('click', function () {
        self.startOverCurrentLiveShow();
      });
    }

    document.getElementById('btnOsdNext').addEventListener('click', function () {
      self.channelStep(1);
    });

    if (this.dom.btnOsdRandom) {
      this.dom.btnOsdRandom.addEventListener('click', function () {
        self.toggleRandomWebcamMode();
      });
    }


    document.getElementById('btnOsdAudio').addEventListener('click', function () {
      self.openAudioModal();
    });

    document.getElementById('btnOsdSubtitles').addEventListener('click', function () {
      self.openSubtitlesModal();
    });

    document.getElementById('btnOsdFav').addEventListener('click', function () {
      if (self.player.currentChannel) {
        self.toggleFavorite(self.player.currentChannel.id);
      }
    });

    // Audio modal actions
    document.getElementById('btnAudioModalClose').addEventListener('click', function () {
      self.closeAudioModal();
    });

    // Subtitles modal actions
    document.getElementById('btnSubtitlesModalClose').addEventListener('click', function () {
      self.closeSubtitlesModal();
    });

    // Settings modal actions
    document.getElementById('btnModalClose').addEventListener('click', function () {
      self.closeSettingsModal();
    });

    document.getElementById('btnModalSave').addEventListener('click', function () {
      var u = document.getElementById('settingUsername').value.trim();
      var p = document.getElementById('settingPassword').value.trim();
      if (u && p) {
        self.api.saveCredentials(u, p);
        self.closeSettingsModal();
        self.showToast('Údaje uložené. Prebieha prihlásenie...');
        self.api.reportDevice(u);
        self.loginAndReload();
      }
    });

    // Exit confirmation modal
    if (this.dom.btnExitCancel) {
      this.dom.btnExitCancel.addEventListener('click', function () {
        self.closeExitModal();
      });
    }
    if (this.dom.btnExitConfirm) {
      this.dom.btnExitConfirm.addEventListener('click', function () {
        self.confirmExitApp();
      });
    }
    if (this.dom.exitModal) {
      this.dom.exitModal.addEventListener('click', function (e) {
        if (e.target === self.dom.exitModal) {
          self.closeExitModal();
        }
      });
    }
  };

  // Launch application when DOM is ready
  window.addEventListener('DOMContentLoaded', function () {
    var app = new UpcApp();
    app.init();
    window.app = app;
  });

  UpcApp.VERSION = '1.5.5';
  window.UpcApp = UpcApp;
})(window);
