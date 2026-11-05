/**
 * UPC TV Video Player Engine
 * Unified player powered by Google Shaka Player with DASH CENC (Widevine & PlayReady)
 * Optimized for Samsung Smart TV (Tizen 5.5).
 */
(function (window) {
  'use strict';

  function TvPlayer(videoElement, api) {
    this.videoElement = videoElement;
    this.api = api;
    this.shakaPlayer = null;
    this.currentChannel = null;
    this.currentReplayEvent = null;
    this.isReplay = false;
    this.isMovie = false;
    this.currentMovie = null;
    this.movieSubtitleCues = [];
    this.movieSubtitlesEnabled = true;
    this.movieSubTimer = null;
    this.lastRenderedCueText = '';
    this.replayStartOffset = 0;
    this.isPlaying = false;
    this.isBuffering = false;
    this.isRecovering = false;
    this.bufferingTier1Timer = null;
    this.bufferingTier2Timer = null;
    this.bufferingTier3Timer = null;
    this.stallWatchdogTimer = null;
    this.lastWatchdogTime = -1;
    this.stallCount = 0;
    this.lastStreamUrl = null;
    this.lastSessionData = null;
    this.listeners = {};

    this.init();
  }

  TvPlayer.prototype.init = function () {
    var self = this;

    if (typeof shaka !== 'undefined') {
      shaka.polyfill.installAll();
      if (shaka.Player.isBrowserSupported()) {
        this.shakaPlayer = new shaka.Player(this.videoElement);
        this.setupShakaListeners();
        console.log('[TvPlayer] Shaka Player initialized successfully for Tizen.');
      } else {
        console.error('[TvPlayer] Browser does not support Shaka Player MSE/EME.');
      }
    } else {
      console.error('[TvPlayer] Shaka library is undefined.');
    }
  };

  TvPlayer.prototype.setupShakaListeners = function () {
    var self = this;
    if (!this.shakaPlayer) return;

    this.shakaPlayer.addEventListener('error', function (event) {
      if (self.isWebcam || self.isMovie) {
        console.warn('[TvPlayer] Ignoring Shaka error event while playing webcam/movie');
        return;
      }
      var err = event.detail;
      console.error('[TvPlayer] Shaka error event:', err);

      // If network timeout (error 1001, 1002) or media decoding stall (3016), attempt silent recovery
      if (err.category === 1 || err.code === 1001 || err.code === 1002 || err.code === 3016) {
        console.warn('[TvPlayer] Network/Media glitch (code ' + err.code + '), triggering silent auto-recovery...');
        self.silentRecover();
        return;
      }

      var httpStatus = 'N/A';
      var httpBody = '';
      var reqUri = '';

      if (err.data && err.data[0]) {
        var p = err.data[0];
        if (p.data && Array.isArray(p.data)) {
          reqUri = p.data[0] || '';
          httpStatus = p.data[1] !== undefined ? p.data[1] : 'N/A';
          httpBody = p.data[2] || '';
        } else if (p.status !== undefined) {
          httpStatus = p.status;
          reqUri = p.uri || '';
        }
      }

      var keySys = (self.shakaPlayer && self.shakaPlayer.keySystem && self.shakaPlayer.keySystem()) || 'unknown';
      var catName = err.category === 6 ? 'DRM' : (err.category === 1 ? 'SIEŤ' : 'STREAM');
      var errorMsg = 'Chyba ' + catName + ' (' + (err.code || 'unknown') + ') | KS: ' + keySys;

      if (httpStatus !== 'N/A') errorMsg += ' | HTTP: ' + httpStatus;
      if (httpBody) {
        var bodySnippet = typeof httpBody === 'string' ? httpBody : JSON.stringify(httpBody);
        errorMsg += ' | ' + bodySnippet.substring(0, 100);
      } else if (err.message) {
        errorMsg += ' | ' + err.message;
      }

      self.emit('error', errorMsg);
    });

    this.shakaPlayer.addEventListener('buffering', function (event) {
      if (self.isWebcam || self.isMovie) return;
      self.isBuffering = event.buffering;
      self.emit('buffering', event.buffering);

      if (event.buffering) {
        self.handleBufferingStart();
      } else {
        self.handleBufferingEnd();
      }
    });

    this.shakaPlayer.addEventListener('adaptation', function () {
      if (self.isWebcam || self.isMovie) return;
      self.emit('tracksready');
    });

    this.shakaPlayer.addEventListener('trackschanged', function () {
      if (self.isWebcam || self.isMovie) return;
      self.emit('tracksready');
    });

    this.videoElement.addEventListener('waiting', function () {
      if (self.isWebcam) return;
      if (self.isMovie) {
        if (!self.isBuffering && self.isPlaying) {
          self.isBuffering = true;
          self.emit('buffering', true);
        }
        return;
      }
      if (!self.isBuffering && self.isPlaying) {
        self.isBuffering = true;
        self.handleBufferingStart();
        self.emit('buffering', true);
      }
    });

    this.videoElement.addEventListener('stalled', function () {
      if (self.isWebcam || self.isMovie) return;
      if (!self.isBuffering && self.isPlaying) {
        self.isBuffering = true;
        self.handleBufferingStart();
        self.emit('buffering', true);
      }
    });

    this.videoElement.addEventListener('playing', function () {
      self.isPlaying = true;
      self.isBuffering = false;
      self.handleBufferingEnd();
      self.emit('buffering', false);
      if (!self.isWebcam && !self.isMovie) {
        self.startStallWatchdog();
      }
      if (self.isWebcam) {
        self.enforceWebcamMute();
      }
      self.emit('playing');
      if (!self.isWebcam) {
        self.emit('tracksready');
      }
    });

    this.videoElement.addEventListener('volumechange', function () {
      if (self.isWebcam && (!self.videoElement.muted || self.videoElement.volume > 0)) {
        self.enforceWebcamMute();
      }
    });

    this.videoElement.addEventListener('error', function (e) {
      if (self.isWebcam) {
        var mediaErr = self.videoElement.error;
        console.warn('[TvPlayer] Native video error during webcam playback, code:', mediaErr ? mediaErr.code : e);
        self.emit('error', 'Chyba webkamery: stream je dočasne nedostupný');
      } else if (self.isMovie) {
        var movErr = self.videoElement.error;
        console.error('[TvPlayer] Native video error during movie playback, code:', movErr ? movErr.code : e);
        self.emit('error', 'Chyba prehrávania filmu (kód ' + (movErr ? movErr.code : 'stream') + '). Skontrolujte pripojenie alebo platnosť tokenu.');
      }
    });

    this.videoElement.addEventListener('pause', function () {
      self.isPlaying = false;
      self.handleBufferingEnd();
      self.emit('pause');
    });

    this.videoElement.addEventListener('ended', function () {
      self.isPlaying = false;
      self.handleBufferingEnd();
      self.emit('ended');
    });

    this.videoElement.addEventListener('timeupdate', function () {
      var cur = self.videoElement.currentTime || 0;
      var dur = self.videoElement.duration || 0;
      if (self.isMovie && (!dur || !isFinite(dur)) && self.currentMovie && self.currentMovie.durationSec) {
        dur = self.currentMovie.durationSec;
      }
      var pct = dur > 0 ? Math.min(100, Math.max(0, (cur / dur) * 100)) : 0;
      if (self.isMovie) {
        self.updateMovieSubtitleOverlay(cur);
      }
      self.emit('timeupdate', {
        currentTime: cur,
        duration: dur,
        progressPct: pct,
        isReplay: self.isReplay || self.isMovie,
        isMovie: self.isMovie,
        movie: self.currentMovie,
        event: self.currentReplayEvent
      });
    });
  };

  TvPlayer.prototype.on = function (event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  };

  TvPlayer.prototype.emit = function (event, data) {
    var list = this.listeners[event];
    if (list) {
      for (var i = 0; i < list.length; i++) {
        try {
          list[i](data);
        } catch (e) {
          console.error('[TvPlayer] Listener error:', e);
        }
      }
    }
  };

  TvPlayer.prototype.configureShakaNetworking = function (sessionData) {
    var self = this;
    if (!this.shakaPlayer) return;

    var tokens = this.api.getTokens();
    var netEngine = this.shakaPlayer.getNetworkingEngine();

    netEngine.clearAllRequestFilters();
    netEngine.clearAllResponseFilters();

    netEngine.registerRequestFilter(function (type, request, context) {
      // Add standard headers required by UPC CDN
      request.headers['Referer'] = 'https://www.upctv.sk/';

      // Dynamically update the streaming token in segment and manifest URLs so they never expire!
      if (self.api && self.api.activeStreamingToken && request.uris && request.uris[0]) {
        if (request.uris[0].indexOf('vxttoken=') !== -1) {
          request.uris[0] = request.uris[0].replace(/vxttoken=[^/]+/, 'vxttoken=' + self.api.activeStreamingToken);
        }
      }

      // If license request, attach required UPC DRM headers and force UPC session license URL
      if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
        // Force license URL to UPC session manager
        request.uris[0] = sessionData.licenseUrl;

        var keySys = (context && context.keySystem) ||
          (self.shakaPlayer && self.shakaPlayer.keySystem && self.shakaPlayer.keySystem()) ||
          '';
        var isPlayReady = keySys.toLowerCase().indexOf('playready') !== -1;

        // Required DRM Scheme ID without 'urn:uuid:' prefix
        var schemeId = isPlayReady ? '9a04f079-9840-4286-ab92-e65be0885f95' : 'edef8ba9-79d6-4ace-a3c8-27dcd51d21ed';

        var creds = self.api.getStoredCredentials();
        var username = tokens.username || creds.username || 'marika.eu@gmail.com';
        var householdId = tokens.householdId || '3283033_sk';
        var profileId = tokens.profileId || '94f23400-a902-442a-9213-ea4d77109755';
        var currentStreamingToken = (self.api && self.api.activeStreamingToken) || sessionData.vxttoken;

        // UPC license endpoint strictly requires application/octet-stream for both PlayReady and Widevine
        request.headers['Content-Type'] = 'application/octet-stream';
        request.headers['deviceName'] = 'Firefox';
        request.headers['X-Device-Code'] = 'web';
        request.headers['x-drm-schemeId'] = schemeId;
        request.headers['Authorization'] = 'Bearer ' + tokens.accessToken;
        request.headers['X-OESP-Token'] = tokens.accessToken;
        request.headers['X-cus'] = householdId;
        request.headers['x-go-dev'] = self.api.goDev;
        request.headers['X-OESP-Username'] = username;
        request.headers['X-Profile'] = profileId;
        request.headers['x-streaming-token'] = currentStreamingToken;

        console.log('[TvPlayer] DRM license filter: schemeId=' + schemeId + ' KS=' + keySys + ' URL=' + request.uris[0]);
      }
    });

    netEngine.registerResponseFilter(function (type, response) {
      if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
        console.log('[TvPlayer] License response received: status=' + response.status + ' length=' + (response.data ? response.data.byteLength : 0));
      }
    });

    this.shakaPlayer.configure({
      preferredAudioLanguage: 'slk',
      drm: {
        servers: {
          'com.widevine.alpha': sessionData.licenseUrl,
          'com.microsoft.playready': sessionData.licenseUrl,
          'com.microsoft.playready.recommendation': sessionData.licenseUrl
        }
      },
      streaming: {
        rebufferingGoal: 1.5,
        bufferingGoal: 8,
        bufferBehind: 20,
        alwaysStreamText: true,
        stallEnabled: true,
        stallThreshold: 1,
        stallSkip: 0.3,
        jumpLargeGaps: true,
        smallGapLimit: 0.5,
        inaccurateManifestTolerance: 0.5,
        retryParameters: {
          maxAttempts: 6,
          baseDelay: 800,
          backoffFactor: 1.5,
          timeout: 10000
        }
      },
      manifest: {
        dash: {
          ignoreMinBufferTime: true,
          autoCorrectDrift: true
        },
        retryParameters: {
          maxAttempts: 6,
          baseDelay: 800,
          backoffFactor: 1.5,
          timeout: 10000
        }
      }
    });
  };

  TvPlayer.prototype.playChannel = function (channel) {
    var self = this;
    this.stopPlayback();
    this.currentChannel = channel;
    this.currentReplayEvent = null;
    this.isReplay = false;
    this.replayStartOffset = 0;
    this.hasEnforcedAudio = false;
    this.emit('loading', { channel: channel, isReplay: false });

    return this.api.createStreamSession(channel.id, channel.locator)
      .then(function (sessionData) {
        console.log('[TvPlayer] Stream session created for channel:', channel.name);
        return self.loadStream(sessionData.streamUrl, sessionData, false);
      })
      .catch(function (err) {
        console.error('[TvPlayer] Error playing channel:', err);
        self.emit('error', 'Chyba spustenia streamu: ' + (err.message || 'Neznáma chyba'));
        throw err;
      });
  };

  /**
   * Plays a past show from TV Archív (Catch-up / Replay TV)
   * @param {Object} channel
   * @param {Object} event
   * @param {number} [initialOffsetSeconds=0] Extra offset in seconds (e.g. 120 to skip pre-show padding/ads)
   */
  TvPlayer.prototype.playReplay = function (channel, event, initialOffsetSeconds) {
    var self = this;
    this.stopPlayback();
    this.currentChannel = channel;
    this.currentReplayEvent = event;
    this.isReplay = true;
    this.hasEnforcedAudio = false;
    this.emit('loading', { channel: channel, event: event, isReplay: true });

    return this.api.createReplayStreamSession(channel.id, event.id)
      .then(function (sessionData) {
        console.log('[TvPlayer] Replay stream session created for:', event.title, 'on channel:', channel.name);
        var baseOffset = (sessionData.eventData && sessionData.eventData.actualProgramStartOffset)
          ? (sessionData.eventData.actualProgramStartOffset / 1000)
          : 0;
        self.replayStartOffset = baseOffset + (initialOffsetSeconds || 0);
        console.log('[TvPlayer] Total replay start offset configured:', self.replayStartOffset, 's (base:', baseOffset, 's, extra:', (initialOffsetSeconds || 0), 's)');
        return self.loadStream(sessionData.streamUrl, sessionData, true);
      })
      .catch(function (err) {
        console.error('[TvPlayer] Error playing replay:', err);
        self.emit('error', 'Chyba archívu: ' + (err.message || 'Neznáma chyba'));
        throw err;
      });
  };

  /**
   * Strictly enforces complete muting on video element during webcam feeds
   * so that Tizen's OS audio manager never steals exclusive audio focus from background radio.
   */
  TvPlayer.prototype.enforceWebcamMute = function () {
    if (this.videoElement) {
      try {
        this.videoElement.muted = true;
        this.videoElement.defaultMuted = true;
        this.videoElement.volume = 0;
        this.videoElement.setAttribute('muted', '');
      } catch (e) { }
    }
  };

  /**
   * Plays a direct public live webcam HLS feed without DRM
   * Play live webcam HLS feed
   * On Samsung Smart TV (Tizen 5.5), Samsung AVPlay hardware video engine is used as primary player.
   * On PC/Chrome/Emulator, Google Shaka Player MSE HLS transmuxer is used as secondary engine.
   * @param {Object} webcam
   */
  TvPlayer.prototype.playWebcam = function (webcam) {
    var self = this;
    this.isMovie = false;
    this.currentMovie = null;
    this.stopMovieSubTimer();
    this.isWebcam = true;
    this.currentWebcam = webcam;

    this.handleBufferingEnd();
    this.stopStallWatchdog();
    this.stopAvplayWebcam();

    this.currentChannel = {
      id: webcam.id,
      name: webcam.name,
      logicalChannelNumber: 'CAM',
      logo: { focused: 'icon.png' }
    };
    this.currentReplayEvent = null;
    this.isReplay = false;
    this.replayStartOffset = 0;
    this.hasEnforcedAudio = false;
    this.emit('loading', { channel: this.currentChannel, isReplay: false });

    if (this.api && typeof this.api.releaseStreamSession === 'function') {
      try { this.api.releaseStreamSession(); } catch (e) { }
    }

    var cleanUrl = (webcam.streamUrl || '').replace(':443/', '/');

    // On Samsung Smart TV (Tizen), AVPlay is the hardware video decoder.
    // Use AVPlay directly as primary player for live HLS webcams.
    if (typeof webapis !== 'undefined' && webapis.avplay) {
      console.log('[TvPlayer] Samsung Smart TV detected - using AVPlay hardware engine for webcam:', webcam.name);
      return this.loadAvplayWebcam(cleanUrl).catch(function (avErr) {
        console.warn('[TvPlayer] AVPlay failed for webcam, falling back to Shaka Player:', avErr);
        self.stopAvplayWebcam();
        return self.loadShakaWebcam(webcam, cleanUrl);
      });
    }

    // Fallback for browsers / PC / emulator
    return this.loadShakaWebcam(webcam, cleanUrl);
  };

  /**
   * Helper to toggle avplay-active class on all parent DOM containers to ensure
   * underlying hardware overlay plane is 100% visible (no dark background obstruction).
   */
  TvPlayer.prototype.enableAvplayUi = function (enable) {
    var targets = [
      document.documentElement,
      document.body,
      document.getElementById('app'),
      document.getElementById('playerView')
    ];
    targets.forEach(function (el) {
      if (el) {
        if (enable) {
          el.classList.add('avplay-active');
        } else {
          el.classList.remove('avplay-active');
        }
      }
    });
  };

  /**
   * Samsung Tizen native AVPlay hardware engine for HLS webcams
   * Renders into the hardware video overlay plane underneath the transparent UI
   */
  TvPlayer.prototype.loadAvplayWebcam = function (streamUrl) {
    var self = this;
    if (typeof webapis === 'undefined' || !webapis.avplay) {
      return Promise.reject(new Error('Samsung AVPlay is not available'));
    }
    return new Promise(function (resolve, reject) {
      try {
        self.stopAvplayWebcam();

        // Pause and unload any active Shaka / HTML5 video
        if (self.shakaPlayer) {
          try { self.shakaPlayer.unload(); } catch (e) { }
        }
        if (self.videoElement) {
          try {
            self.videoElement.pause();
            self.videoElement.removeAttribute('src');
            self.videoElement.load();
          } catch (e) { }
        }

        var cleanUrl = (streamUrl || '').replace(':443/', '/');
        console.log('[AVPlay] Opening stream URL:', cleanUrl);

        webapis.avplay.open(cleanUrl);
        webapis.avplay.setDisplayRect(0, 0, 1920, 1080);
        try {
          webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX');
        } catch (e) { }
        if (typeof webapis.avplay.setMute === 'function') {
          try { webapis.avplay.setMute(true); } catch (e) { }
        }

        self.enableAvplayUi(true);
        self.isAvplayActive = true;

        var listener = {
          onbufferingstart: function () {
            console.log('[AVPlay] Buffering started');
            self.emit('buffering', true);
          },
          onbufferingprogress: function (percent) { },
          onbufferingcomplete: function () {
            console.log('[AVPlay] Buffering complete');
            self.emit('buffering', false);
          },
          oncurrentplaytime: function (currentTime) { },
          onevent: function (eventType, eventData) {
            console.log('[AVPlay] Event:', eventType, eventData);
          },
          onerror: function (eventType) {
            console.error('[AVPlay] Webcam playback error:', eventType);
            self.stopAvplayWebcam();
            self.emit('error', 'Chyba AVPlay: ' + eventType);
          }
        };

        webapis.avplay.setListener(listener);
        webapis.avplay.prepareAsync(function () {
          console.log('[AVPlay] prepareAsync success, calling play()');
          try {
            webapis.avplay.play();
            self.isPlaying = true;
            self.isBuffering = false;
            self.emit('playing');
            resolve();
          } catch (playErr) {
            console.error('[AVPlay] play() exception:', playErr);
            self.stopAvplayWebcam();
            reject(playErr);
          }
        }, function (err) {
          console.error('[AVPlay] Prepare error:', err);
          self.stopAvplayWebcam();
          reject(err);
        });
      } catch (e) {
        console.error('[AVPlay] Open exception:', e);
        self.stopAvplayWebcam();
        reject(e);
      }
    });
  };

  TvPlayer.prototype.stopAvplayWebcam = function () {
    this.isAvplayActive = false;
    this.enableAvplayUi(false);
    if (typeof webapis !== 'undefined' && webapis.avplay) {
      try {
        var state = webapis.avplay.getState();
        if (state !== 'NONE' && state !== 'IDLE') {
          webapis.avplay.stop();
          webapis.avplay.close();
        } else if (state === 'IDLE') {
          webapis.avplay.close();
        }
      } catch (e) {
        console.warn('[AVPlay] Stop error:', e);
      }
    }
  };

  /**
   * Shaka Player secondary / fallback engine for live HLS webcams
   */
  TvPlayer.prototype.loadShakaWebcam = function (webcam, cleanUrl) {
    var self = this;
    var streamUrl = cleanUrl || (webcam.streamUrl || '').replace(':443/', '/');
    this.enforceWebcamMute();

    if (!this.shakaPlayer) {
      return Promise.reject(new Error('Prehrávač pre webkamery nie je dostupný'));
    }

    try {
      var netEngine = this.shakaPlayer.getNetworkingEngine();
      if (netEngine) {
        netEngine.clearAllRequestFilters();
        netEngine.clearAllResponseFilters();
      }
    } catch (e) { }

    // Configure Shaka for live HLS streams without DRM and with disabled stall watchdog
    this.shakaPlayer.configure({
      drm: { servers: {}, clearKeys: {}, advanced: {} },
      manifest: {
        dash: {},
        hls: {
          ignoreTextStreamFailures: true
        },
        defaultPresentationDelay: 8
      },
      streaming: {
        rebufferingGoal: 2,
        bufferingGoal: 10,
        bufferBehind: 15,
        ignoreTextStreamFailures: true,
        alwaysStreamText: false,
        stallEnabled: false,
        stallThreshold: 10,
        jumpLargeGaps: true,
        smallGapLimit: 1.5,
        retryParameters: {
          maxAttempts: 5,
          baseDelay: 1000,
          backoffFactor: 1.5,
          fuzzFactor: 0.5,
          timeout: 10000
        }
      }
    });

    return this.shakaPlayer.load(streamUrl).then(function () {
      console.log('[TvPlayer] Webcam HLS stream loaded via Shaka:', webcam.name);
      self.enforceWebcamMute();
      var p = self.videoElement.play();
      if (p !== undefined) {
        return p.then(function () {
          console.log('[TvPlayer] Webcam playing smoothly via Shaka:', webcam.name);
          self.isPlaying = true;
          self.isBuffering = false;
          self.enforceWebcamMute();
          self.emit('playing');
        }).catch(function (err) {
          if (err && (err.name === 'AbortError' || (err.message && err.message.indexOf('interrupted') !== -1))) {
            console.log('[TvPlayer] Benign play() interruption during webcam switch, ignored.');
            return;
          }
          console.warn('[TvPlayer] Video play exception, retrying with strict mute:', err);
          self.enforceWebcamMute();
          return self.videoElement.play().then(function () {
            self.isPlaying = true;
            self.isBuffering = false;
            self.enforceWebcamMute();
            self.emit('playing');
          }).catch(function (retryErr) {
            if (retryErr && (retryErr.name === 'AbortError' || (retryErr.message && retryErr.message.indexOf('interrupted') !== -1))) {
              return;
            }
            throw retryErr;
          });
        });
      } else {
        self.isPlaying = true;
        self.isBuffering = false;
        self.enforceWebcamMute();
        self.emit('playing');
        return Promise.resolve();
      }
    }).catch(function (err) {
      if (err && (err.name === 'AbortError' || (err.message && err.message.indexOf('interrupted') !== -1))) {
        console.log('[TvPlayer] Benign play() interruption during webcam switch, ignored.');
        return;
      }
      console.error('[TvPlayer] Shaka webcam load failed:', err);
      self.emit('error', 'Chyba webkamery: ' + (err.message || 'Nepodarilo sa načítať'));
      throw err;
    });
  };

  TvPlayer.prototype.loadStream = function (streamUrl, sessionData, isReplay) {
    var self = this;
    this.isWebcam = false;
    this.currentWebcam = null;
    this.stopAvplayWebcam();
    this.lastStreamUrl = streamUrl;
    this.lastSessionData = sessionData;
    this.hasEnforcedAudio = false;
    if (this.videoElement) {
      try {
        this.videoElement.removeAttribute('muted');
        this.videoElement.defaultMuted = false;
        this.videoElement.muted = false;
        this.videoElement.volume = 1.0;
      } catch (e) { }
    }

    if (this.shakaPlayer) {
      this.configureShakaNetworking(sessionData);
      return this.shakaPlayer.load(streamUrl).then(function () {
        console.log('[TvPlayer] Shaka stream manifest loaded successfully. Enforcing Slovak audio preference...');
        self.enforcePreferredAudioLanguage();
        self.emit('tracksready');

        if (isReplay && self.replayStartOffset > 0) {
          try {
            console.log('[TvPlayer] Seeking to actual program start offset: ' + self.replayStartOffset + 's');
            self.videoElement.currentTime = self.replayStartOffset;
          } catch (e) {
            console.warn('[TvPlayer] Offset seek warning:', e);
          }
          // Secondary safety check: ensure offset took hold once decoding commences
          setTimeout(function () {
            if (self.isReplay && self.videoElement && self.replayStartOffset > 0 && self.videoElement.currentTime < (self.replayStartOffset - 2)) {
              try {
                console.log('[TvPlayer] Re-applying start offset:', self.replayStartOffset);
                self.videoElement.currentTime = self.replayStartOffset;
              } catch (e) { }
            }
          }, 350);
        }

        return self.videoElement.play().then(function () {
          self.startStallWatchdog();
        });
      }).catch(function (error) {
        console.error('[TvPlayer] Shaka load failed:', error);
        var details = '';
        if (error.data && error.data.length > 0) {
          details = ' (' + error.data.join(', ') + ')';
        }
        self.emit('error', 'Chyba načítania streamu (' + (error.code || 'load') + details + ')');
        throw error;
      });
    }

    // Direct HTML5 fallback
    this.videoElement.src = streamUrl;
    if (isReplay && this.replayStartOffset > 0) {
      try { this.videoElement.currentTime = this.replayStartOffset; } catch (e) { }
    }
    return this.videoElement.play();
  };

  /**
   * Parses WebVTT text into an array of { start: seconds, end: seconds, text: htmlSafeString }
   */
  TvPlayer.prototype.parseVtt = function (rawVtt) {
    if (!rawVtt || typeof rawVtt !== 'string') return [];
    var lines = rawVtt.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    var cues = [];
    var i = 0;

    function parseVttTime(str) {
      if (!str) return 0;
      var s = str.trim().replace(',', '.');
      var parts = s.split(':');
      if (parts.length === 3) {
        return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
      } else if (parts.length === 2) {
        return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
      }
      return parseFloat(s) || 0;
    }

    while (i < lines.length) {
      var line = lines[i].trim();
      if (!line || line.indexOf('WEBVTT') === 0 || line.indexOf('NOTE') === 0 || line.indexOf('STYLE') === 0) {
        i++;
        continue;
      }
      if (line.indexOf('-->') === -1 && i + 1 < lines.length && lines[i + 1].indexOf('-->') !== -1) {
        i++;
        line = lines[i].trim();
      }
      if (line.indexOf('-->') !== -1) {
        var arrowIdx = line.indexOf('-->');
        var startStr = line.substring(0, arrowIdx).trim();
        var rightPart = line.substring(arrowIdx + 3).trim();
        var endStr = rightPart.split(/\s+/)[0];
        var startSec = parseVttTime(startStr);
        var endSec = parseVttTime(endStr);
        i++;
        var textLines = [];
        while (i < lines.length && lines[i].trim() !== '') {
          textLines.push(lines[i].trim());
          i++;
        }
        if (textLines.length > 0 && endSec > startSec) {
          cues.push({
            start: startSec,
            end: endSec,
            text: textLines.join('\n')
          });
        }
      } else {
        i++;
      }
    }
    return cues;
  };

  /**
   * Loads WebVTT subtitles for the movie from embedded VTT string, remote CDN URL, or local bundle fallback
   */
  TvPlayer.prototype.loadMovieSubtitles = function (movie) {
    var self = this;
    this.movieSubtitleCues = [];
    this.lastRenderedCueText = '';
    this.updateMovieSubtitleOverlay(0);

    if (!movie) return Promise.resolve([]);

    // 1. Immediate load from pre-bundled vttContent if available
    if (movie.vttContent && typeof movie.vttContent === 'string' && movie.vttContent.length > 50) {
      this.movieSubtitleCues = this.parseVtt(movie.vttContent);
      console.log('[TvPlayer] Loaded ' + this.movieSubtitleCues.length + ' Czech VTT subtitle cues from embedded data.');
      this.emit('tracksready');
    }

    // 2. Also attempt remote subtitleUrl or localSubtitleUrl fetch if needed or to refresh
    var urlsToTry = [];
    if (movie.subtitleUrl) urlsToTry.push(movie.subtitleUrl);
    if (movie.localSubtitleUrl) urlsToTry.push(movie.localSubtitleUrl);

    if (this.movieSubtitleCues.length > 0 || urlsToTry.length === 0) {
      return Promise.resolve(this.movieSubtitleCues);
    }

    function tryNextUrl(idx) {
      if (idx >= urlsToTry.length) {
        return Promise.resolve(self.movieSubtitleCues);
      }
      return fetch(urlsToTry[idx]).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      }).then(function (vttText) {
        var parsed = self.parseVtt(vttText);
        if (parsed.length > 0) {
          self.movieSubtitleCues = parsed;
          console.log('[TvPlayer] Loaded ' + parsed.length + ' VTT subtitle cues from ' + urlsToTry[idx]);
          self.emit('tracksready');
          return parsed;
        }
        return tryNextUrl(idx + 1);
      }).catch(function (err) {
        console.warn('[TvPlayer] Subtitle fetch fallback (' + urlsToTry[idx] + '):', err);
        return tryNextUrl(idx + 1);
      });
    }

    return tryNextUrl(0);
  };

  /**
   * Updates the DOM subtitle overlay #movieSubtitleOverlay for the given playback timestamp
   */
  TvPlayer.prototype.updateMovieSubtitleOverlay = function (currentTimeSec) {
    var overlay = document.getElementById('movieSubtitleOverlay');
    if (!overlay) return;

    if (!this.isMovie || !this.movieSubtitlesEnabled || !this.movieSubtitleCues || this.movieSubtitleCues.length === 0) {
      if (this.lastRenderedCueText !== '') {
        overlay.innerHTML = '';
        this.lastRenderedCueText = '';
      }
      return;
    }

    var activeTexts = [];
    var cues = this.movieSubtitleCues;
    // Binary search for fast lookup in 2,161+ cues
    var low = 0;
    var high = cues.length - 1;
    var matchIdx = -1;

    while (low <= high) {
      var mid = (low + high) >> 1;
      var c = cues[mid];
      if (currentTimeSec < c.start) {
        high = mid - 1;
      } else if (currentTimeSec > c.end) {
        low = mid + 1;
      } else {
        matchIdx = mid;
        break;
      }
    }

    if (matchIdx !== -1) {
      var startScan = matchIdx;
      while (startScan > 0 && cues[startScan - 1].end >= currentTimeSec) {
        startScan--;
      }
      for (var j = startScan; j < cues.length; j++) {
        if (cues[j].start > currentTimeSec) break;
        if (currentTimeSec >= cues[j].start && currentTimeSec <= cues[j].end) {
          activeTexts.push(cues[j].text);
        }
      }
    }

    var combined = activeTexts.join('\n');
    if (combined !== this.lastRenderedCueText) {
      this.lastRenderedCueText = combined;
      if (!combined) {
        overlay.innerHTML = '';
      } else {
        var safeHtml = combined
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/&lt;i&gt;/gi, '<i>')
          .replace(/&lt;\/i&gt;/gi, '</i>')
          .replace(/&lt;b&gt;/gi, '<b>')
          .replace(/&lt;\/b&gt;/gi, '</b>')
          .replace(/&lt;u&gt;/gi, '<u>')
          .replace(/&lt;\/u&gt;/gi, '</u>')
          .replace(/\n/g, '<br>');
        overlay.innerHTML = '<div class="movie-subtitle-box">' + safeHtml + '</div>';
      }
    }
  };

  TvPlayer.prototype.startMovieSubTimer = function () {
    var self = this;
    this.stopMovieSubTimer();
    this.movieSubTimer = setInterval(function () {
      if (self.isMovie) {
        var cur = self.getCurrentTime();
        if (typeof cur === 'number' && cur >= 0) {
          self.updateMovieSubtitleOverlay(cur);
        }
      }
    }, 100);
  };

  TvPlayer.prototype.stopMovieSubTimer = function () {
    if (this.movieSubTimer) {
      clearInterval(this.movieSubTimer);
      this.movieSubTimer = null;
    }
    this.lastRenderedCueText = '';
    var overlay = document.getElementById('movieSubtitleOverlay');
    if (overlay) overlay.innerHTML = '';
  };

  /**
   * Plays a direct VOD movie stream (720p MP4) with synchronized WebVTT subtitles
   * On Samsung Smart TV (Tizen), Samsung AVPlay hardware video engine is used as primary player.
   * On PC/Chrome/Emulator, HTML5 video element is used as secondary engine.
   * @param {Object} movie
   * @param {number} [initialOffsetSeconds=0]
   */
  TvPlayer.prototype.playMovie = function (movie, initialOffsetSeconds) {
    var self = this;
    this.stopPlayback();

    this.isMovie = true;
    this.currentMovie = movie;
    this.isReplay = false;
    this.isWebcam = false;
    this.currentWebcam = null;
    this.movieSubtitlesEnabled = true;
    this.replayStartOffset = initialOffsetSeconds || 0;

    this.currentChannel = {
      id: movie.id,
      name: movie.title,
      logicalChannelNumber: 'VOD',
      logo: { focused: movie.poster || 'icon.png' }
    };
    this.currentReplayEvent = {
      id: movie.id,
      title: movie.title + (movie.skTitle ? ' (' + movie.skTitle + ')' : ''),
      startTime: 0,
      endTime: movie.durationSec || 7620
    };

    this.emit('loading', { channel: this.currentChannel, event: this.currentReplayEvent, isReplay: true, isMovie: true, movie: movie });

    if (this.api && typeof this.api.releaseStreamSession === 'function') {
      try { this.api.releaseStreamSession(); } catch (e) { }
    }

    // Load Czech WebVTT subtitles immediately
    this.loadMovieSubtitles(movie);
    this.startMovieSubTimer();

    var targetUrl = movie.streamUrl || movie.hlsStreamUrl;

    // Use Samsung AVPlay hardware engine if available on TV (primary hardware decoder)
    if (typeof webapis !== 'undefined' && webapis.avplay) {
      console.log('[TvPlayer] Samsung Smart TV detected - attempting AVPlay hardware engine for movie:', movie.title, 'URL:', targetUrl);
      return this.loadAvplayMovie(movie, this.replayStartOffset).catch(function (avErr) {
        console.warn('[TvPlayer] AVPlay failed for movie, falling back to HTML5 video element:', avErr);
        self.stopAvplayWebcam();
        return self.loadHtml5Movie(movie, self.replayStartOffset);
      });
    }

    // Direct HTML5 fallback for PC/browser/emulator
    return this.loadHtml5Movie(movie, this.replayStartOffset);
  };

  /**
   * Shaka Player HLS VOD engine for HLS movies (.m3u8)
   */
  TvPlayer.prototype.loadHlsMovie = function (movie, initialOffsetSeconds) {
    var self = this;
    this.enableAvplayUi(false);
    this.isAvplayActive = false;

    if (this.videoElement) {
      try {
        this.videoElement.style.display = 'block';
        this.videoElement.style.visibility = 'visible';
        this.videoElement.removeAttribute('muted');
        this.videoElement.defaultMuted = false;
        this.videoElement.muted = false;
        this.videoElement.volume = 1.0;
      } catch (e) { }
    }

    var hlsUrl = movie.hlsStreamUrl || movie.streamUrl;

    if (!this.shakaPlayer) {
      this.videoElement.src = hlsUrl;
      return this.videoElement.play();
    }

    try {
      var netEngine = this.shakaPlayer.getNetworkingEngine();
      if (netEngine) {
        netEngine.clearAllRequestFilters();
        netEngine.clearAllResponseFilters();
      }
    } catch (e) { }

    this.shakaPlayer.configure({
      drm: { servers: {}, clearKeys: {}, advanced: {} },
      manifest: {
        hls: { ignoreTextStreamFailures: true }
      },
      streaming: {
        rebufferingGoal: 2,
        bufferingGoal: 8,
        bufferBehind: 15,
        ignoreTextStreamFailures: true,
        stallEnabled: false
      }
    });

    return this.shakaPlayer.load(hlsUrl).then(function () {
      console.log('[TvPlayer] HLS Movie loaded successfully via Shaka Player');
      self.emit('tracksready');

      if (initialOffsetSeconds && initialOffsetSeconds > 0) {
        try {
          console.log('[TvPlayer] Seeking HLS movie to offset: ' + initialOffsetSeconds + 's');
          self.videoElement.currentTime = initialOffsetSeconds;
        } catch (e) { }
      }

      return self.videoElement.play().then(function () {
        self.isPlaying = true;
        self.isBuffering = false;
        self.emit('playing');
      });
    }).catch(function (err) {
      console.warn('[TvPlayer] Shaka HLS load failed, falling back to HTML5 movie:', err);
      return self.loadHtml5Movie(movie, initialOffsetSeconds);
    });
  };

  /**
   * Samsung Tizen native AVPlay hardware video engine for VOD progressive MP4
   */
  TvPlayer.prototype.loadAvplayMovie = function (movie, initialOffsetSeconds) {
    var self = this;
    if (typeof webapis === 'undefined' || !webapis.avplay) {
      return this.loadHtml5Movie(movie, initialOffsetSeconds);
    }

    return new Promise(function (resolve, reject) {
      var settled = false;
      var prepareTimer = null;

      function cleanup() {
        if (prepareTimer) {
          clearTimeout(prepareTimer);
          prepareTimer = null;
        }
      }

      function safeReject(err) {
        if (settled) return;
        settled = true;
        cleanup();
        self.stopAvplayWebcam();
        reject(err);
      }

      try {
        self.stopAvplayWebcam();

        // Pause and unload any active Shaka / HTML5 video
        if (self.shakaPlayer) {
          try { self.shakaPlayer.unload(); } catch (e) { }
        }
        if (self.videoElement) {
          try {
            self.videoElement.pause();
            self.videoElement.removeAttribute('src');
            self.videoElement.load();
          } catch (e) { }
        }

        var streamUrl = movie.streamUrl || movie.hlsStreamUrl;
        console.log('[AVPlay] Opening movie stream URL:', streamUrl);

        webapis.avplay.open(streamUrl);
        webapis.avplay.setDisplayRect(0, 0, 1920, 1080);
        try { webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX'); } catch (e) { }

        var listener = {
          onbufferingstart: function () {
            console.log('[AVPlay] Movie buffering started');
            self.emit('buffering', true);
          },
          onbufferingprogress: function (percent) { },
          onbufferingcomplete: function () {
            console.log('[AVPlay] Movie buffering complete');
            self.emit('buffering', false);
          },
          oncurrentplaytime: function (currentTimeMs) {
            var curSec = (currentTimeMs || 0) / 1000;
            var durSec = movie.durationSec || 7620;
            try {
              var avDur = webapis.avplay.getDuration();
              if (avDur > 0) durSec = avDur / 1000;
            } catch (e) { }

            var pct = durSec > 0 ? Math.min(100, Math.max(0, (curSec / durSec) * 100)) : 0;
            self.updateMovieSubtitleOverlay(curSec);
            self.emit('timeupdate', {
              currentTime: curSec,
              duration: durSec,
              progressPct: pct,
              isReplay: true,
              isMovie: true,
              movie: movie,
              event: self.currentReplayEvent
            });
          },
          onevent: function (eventType, eventData) {
            console.log('[AVPlay] Movie Event:', eventType, eventData);
          },
          onerror: function (eventType) {
            console.error('[AVPlay] Movie playback error:', eventType);
            safeReject(new Error('AVPlay error: ' + eventType));
          },
          streamcompleted: function () {
            console.log('[AVPlay] Movie playback finished');
            self.isPlaying = false;
            self.emit('ended');
          }
        };

        webapis.avplay.setListener(listener);

        // 3.5s timeout: if prepareAsync hangs or never returns, failover to HTML5
        prepareTimer = setTimeout(function () {
          console.warn('[AVPlay] Movie prepareAsync timed out (3.5s). Falling back to HTML5 video...');
          safeReject(new Error('AVPlay prepareAsync timeout'));
        }, 3500);

        webapis.avplay.prepareAsync(function () {
          if (settled) return;
          cleanup();

          console.log('[AVPlay] Movie prepareAsync success! Activating AVPlay display plane...');
          try {
            self.enableAvplayUi(true);
            self.isAvplayActive = true;
            webapis.avplay.setDisplayRect(0, 0, 1920, 1080);
            webapis.avplay.play();

            if (initialOffsetSeconds && initialOffsetSeconds > 0) {
              try {
                console.log('[AVPlay] Seeking movie to initial offset: ' + initialOffsetSeconds + 's');
                webapis.avplay.seekTo(initialOffsetSeconds * 1000);
              } catch (seekErr) {
                console.warn('[AVPlay] Seek warning:', seekErr);
              }
            }

            self.isPlaying = true;
            self.isBuffering = false;
            self.emit('playing');
            self.emit('tracksready');
            settled = true;
            resolve();
          } catch (playErr) {
            console.error('[AVPlay] play() exception:', playErr);
            safeReject(playErr);
          }
        }, function (err) {
          console.error('[AVPlay] Movie prepareAsync error:', err);
          safeReject(err);
        });
      } catch (e) {
        console.error('[AVPlay] Movie open exception:', e);
        safeReject(e);
      }
    });
  };

  /**
   * HTML5 video element fallback for browser / PC / emulator
   */
  TvPlayer.prototype.loadHtml5Movie = function (movie, initialOffsetSeconds) {
    var self = this;
    this.enableAvplayUi(false);
    this.isAvplayActive = false;
    if (this.videoElement) {
      try {
        this.videoElement.style.display = 'block';
        this.videoElement.style.visibility = 'visible';
        this.videoElement.removeAttribute('muted');
        this.videoElement.defaultMuted = false;
        this.videoElement.muted = false;
        this.videoElement.volume = 1.0;
      } catch (e) { }
    }

    var detachPromise = Promise.resolve();
    if (this.shakaPlayer) {
      try {
        detachPromise = this.shakaPlayer.unload().catch(function () { });
      } catch (e) { }
    }

    return detachPromise.then(function () {
      if (!self.isMovie || !self.currentMovie || self.currentMovie.id !== movie.id) return;

      var targetSource = movie.hlsStreamUrl || movie.streamUrl;
      if (targetSource && targetSource.indexOf('.m3u8') !== -1) {
        return self.loadHlsMovie(movie, initialOffsetSeconds);
      }
      self.videoElement.src = targetSource;
      self.videoElement.load();

      var seekApplied = false;
      function applyInitialSeek() {
        if (seekApplied) return;
        seekApplied = true;
        if (self.isMovie && self.replayStartOffset > 0) {
          try {
            console.log('[TvPlayer] Seeking movie to initial offset: ' + self.replayStartOffset + 's');
            self.videoElement.currentTime = self.replayStartOffset;
          } catch (e) {
            console.warn('[TvPlayer] Movie initial seek warning:', e);
          }
        }
        self.emit('tracksready');
      }

      self.videoElement.addEventListener('loadedmetadata', function onMeta() {
        self.videoElement.removeEventListener('loadedmetadata', onMeta);
        applyInitialSeek();
      });

      var playPromise = self.videoElement.play();
      if (playPromise !== undefined) {
        return playPromise.then(function () {
          applyInitialSeek();
          self.isPlaying = true;
          self.isBuffering = false;
          self.emit('playing');
          self.emit('tracksready');
        }).catch(function (err) {
          if (err && (err.name === 'AbortError' || (err.message && err.message.indexOf('interrupted') !== -1))) {
            return;
          }
          console.error('[TvPlayer] Movie play() error:', err);
          self.emit('error', 'Chyba spustenia filmu: ' + (err.message || 'Stream sa nepodarilo prehrať'));
          throw err;
        });
      } else {
        applyInitialSeek();
        self.isPlaying = true;
        self.isBuffering = false;
        self.emit('playing');
        self.emit('tracksready');
        return Promise.resolve();
      }
    });
  };

  TvPlayer.prototype.getCurrentTime = function () {
    if (this.isAvplayActive && typeof webapis !== 'undefined' && webapis.avplay) {
      try {
        var t = webapis.avplay.getCurrentTime();
        if (typeof t === 'number' && t >= 0) return t / 1000;
      } catch (e) { }
    }
    return (this.videoElement && this.videoElement.currentTime) || 0;
  };

  TvPlayer.prototype.getDuration = function () {
    if (this.isAvplayActive && typeof webapis !== 'undefined' && webapis.avplay) {
      try {
        var d = webapis.avplay.getDuration();
        if (typeof d === 'number' && d > 0) return d / 1000;
      } catch (e) { }
    }
    if (this.isMovie && this.currentMovie && this.currentMovie.durationSec) {
      return this.currentMovie.durationSec;
    }
    return (this.videoElement && this.videoElement.duration) || 0;
  };

  TvPlayer.prototype.seek = function (secondsDelta) {
    if (this.isAvplayActive && typeof webapis !== 'undefined' && webapis.avplay) {
      try {
        var avDur = this.getDuration();
        var avCur = this.getCurrentTime();
        var targetAv = Math.max(0, avDur > 0 ? Math.min(avDur, avCur + secondsDelta) : avCur + secondsDelta);
        console.log('[AVPlay] Seeking delta: ' + secondsDelta + 's -> target: ' + targetAv + 's / ' + avDur + 's');
        webapis.avplay.seekTo(targetAv * 1000);
        this.updateMovieSubtitleOverlay(targetAv);
        this.emit('seek', { currentTime: targetAv, duration: avDur, delta: secondsDelta });
        return;
      } catch (e) {
        console.warn('[AVPlay] seek error:', e);
      }
    }
    if (!this.videoElement) return;
    var dur = this.videoElement.duration || 0;
    var cur = this.videoElement.currentTime || 0;
    var target = Math.max(0, dur > 0 ? Math.min(dur, cur + secondsDelta) : cur + secondsDelta);
    this.videoElement.currentTime = target;
    this.emit('seek', { currentTime: target, duration: dur, delta: secondsDelta });
  };

  /**
   * Fast skip 2 minutes (+120s or -120s) for Archive replay streams
   * Ideal for jumping over commercial breaks or recap segments.
   */
  TvPlayer.prototype.skip2Mins = function (forward) {
    var delta = (forward === false) ? -120 : 120;
    this.seek(delta);
  };

  TvPlayer.prototype.seekTo = function (targetSeconds) {
    if (this.isAvplayActive && typeof webapis !== 'undefined' && webapis.avplay) {
      try {
        var avDur = this.getDuration();
        var targetAv = Math.max(0, avDur > 0 ? Math.min(avDur, targetSeconds) : targetSeconds);
        console.log('[AVPlay] Seeking to target: ' + targetAv + 's / ' + avDur + 's');
        webapis.avplay.seekTo(targetAv * 1000);
        this.updateMovieSubtitleOverlay(targetAv);
        this.emit('seek', { currentTime: targetAv, duration: avDur });
        return;
      } catch (e) {
        console.warn('[AVPlay] seekTo error:', e);
      }
    }
    if (!this.videoElement) return;
    var dur = this.videoElement.duration || 0;
    var target = Math.max(0, dur > 0 ? Math.min(dur, targetSeconds) : targetSeconds);
    this.videoElement.currentTime = target;
    this.emit('seek', { currentTime: target, duration: dur });
  };

  TvPlayer.prototype.restartReplay = function () {
    this.seekTo(this.replayStartOffset || 0);
  };

  TvPlayer.prototype.enforcePreferredAudioLanguage = function () {
    if (!this.shakaPlayer) return;
    try {
      var variants = this.shakaPlayer.getVariantTracks() || [];
      if (variants.length === 0) return;

      console.log('[TvPlayer] Auto-evaluating audio languages for channel...');

      // Priority 1: Slovak ('slk', 'sk', 'slo')
      var slovakVariant = variants.find(function (v) {
        var l = (v.language || '').toLowerCase().trim();
        return l === 'slk' || l === 'sk' || l === 'slo';
      });

      if (slovakVariant) {
        console.log('[TvPlayer] Preferred Slovak audio track found (' + slovakVariant.language + ', audioId=' + slovakVariant.audioId + '), activating!');
        this.selectAudioTrack(slovakVariant.language, slovakVariant.roles ? slovakVariant.roles[0] : null, slovakVariant.audioId);
        return;
      }

      // Priority 2: Czech fallback ('ces', 'cs', 'cze')
      var czechVariant = variants.find(function (v) {
        var l = (v.language || '').toLowerCase().trim();
        return l === 'ces' || l === 'cs' || l === 'cze';
      });

      if (czechVariant) {
        console.log('[TvPlayer] Czech audio track found as fallback (' + czechVariant.language + ', audioId=' + czechVariant.audioId + '), activating!');
        this.selectAudioTrack(czechVariant.language, czechVariant.roles ? czechVariant.roles[0] : null, czechVariant.audioId);
        return;
      }

      console.log('[TvPlayer] Neither Slovak nor Czech track available in this stream, using broadcast default.');
    } catch (e) {
      console.warn('[TvPlayer] enforcePreferredAudioLanguage exception:', e);
    }
  };

  TvPlayer.prototype.getAudioTracks = function () {
    if (this.isWebcam) return [];
    if (this.isMovie) {
      return [{
        audioId: 0,
        language: 'eng',
        role: 'main',
        channelsCount: 2,
        label: 'Anglický (ENG) - Originál',
        active: true
      }];
    }
    if (!this.shakaPlayer) return [];
    try {
      var variants = this.shakaPlayer.getVariantTracks() || [];
      if (variants.length === 0) {
        var languages = this.shakaPlayer.getAudioLanguages() || [];
        return languages.map(function (lang, idx) {
          return {
            language: lang,
            label: formatLanguageLabel(lang, '', 2),
            active: idx === 0,
            channelsCount: 2,
            role: ''
          };
        });
      }

      var activeVariant = null;
      for (var i = 0; i < variants.length; i++) {
        if (variants[i].active) {
          activeVariant = variants[i];
          break;
        }
      }
      var activeLang = activeVariant ? (activeVariant.language || '').toLowerCase().trim() : '';
      var activeAudioId = activeVariant ? activeVariant.audioId : null;

      var uniqueAudio = [];
      var seenMap = {};

      for (var j = 0; j < variants.length; j++) {
        var v = variants[j];
        var lang = (v.language || 'und').toLowerCase().trim();
        var role = (v.roles && v.roles[0]) || '';
        var aId = v.audioId !== undefined ? v.audioId : lang;
        var key = aId + '_' + lang + '_' + role;

        if (!seenMap[key]) {
          seenMap[key] = true;
          var isActive = (activeAudioId !== null && v.audioId === activeAudioId) ||
            (activeVariant && activeVariant.id === v.id) ||
            (activeLang && lang === activeLang);

          uniqueAudio.push({
            audioId: v.audioId,
            language: v.language || 'und',
            role: role,
            channelsCount: v.channelsCount || 2,
            audioCodec: v.audioCodec,
            label: formatLanguageLabel(v.language, role, v.channelsCount),
            active: isActive
          });
        } else if (v.active) {
          for (var k = 0; k < uniqueAudio.length; k++) {
            if (uniqueAudio[k].audioId === v.audioId || uniqueAudio[k].language.toLowerCase() === lang) {
              uniqueAudio[k].active = true;
            }
          }
        }
      }

      // If none explicitly marked active, default first to active
      if (uniqueAudio.length > 0 && !uniqueAudio.some(function (t) { return t.active; })) {
        uniqueAudio[0].active = true;
      }

      return uniqueAudio;
    } catch (err) {
      console.warn('[TvPlayer] Error getting audio tracks:', err);
      return [];
    }
  };

  TvPlayer.prototype.getActiveAudioTrack = function () {
    var tracks = this.getAudioTracks();
    for (var i = 0; i < tracks.length; i++) {
      if (tracks[i].active) return tracks[i];
    }
    return tracks.length > 0 ? tracks[0] : null;
  };

  TvPlayer.prototype.selectAudioTrack = function (language, role, audioId) {
    if (!this.shakaPlayer) return;
    try {
      console.log('[TvPlayer] selectAudioTrack: language=' + language + ', role=' + role + ', audioId=' + audioId);

      // 1. Tell Shaka Player's language preference
      if (language) {
        try {
          this.shakaPlayer.selectAudioLanguage(language, role || '');
        } catch (e) {
          console.warn('[TvPlayer] selectAudioLanguage warning:', e);
        }
      }

      // 2. Find matching variant track to force instant buffer-clearing switch
      var variants = this.shakaPlayer.getVariantTracks() || [];
      var currentVariant = variants.find(function (v) { return v.active; });
      var currentVideoId = currentVariant ? currentVariant.videoId : null;

      var targetVariant = null;

      // Match by audioId first
      if (audioId !== undefined && audioId !== null) {
        targetVariant = variants.find(function (v) {
          return v.audioId === audioId && (currentVideoId === null || v.videoId === currentVideoId);
        });
        if (!targetVariant) {
          targetVariant = variants.find(function (v) { return v.audioId === audioId; });
        }
      }

      // Match by language
      if (!targetVariant && language) {
        var langClean = language.toLowerCase().trim();
        targetVariant = variants.find(function (v) {
          return (v.language || '').toLowerCase().trim() === langClean &&
            (currentVideoId === null || v.videoId === currentVideoId);
        });
        if (!targetVariant) {
          targetVariant = variants.find(function (v) {
            return (v.language || '').toLowerCase().trim() === langClean;
          });
        }
      }

      // 3. Immediately switch variant track with clearBuffer = true!
      if (targetVariant) {
        console.log('[TvPlayer] Executing selectVariantTrack with clearBuffer=true on track:', targetVariant.language, 'id=' + targetVariant.id, 'audioId=' + targetVariant.audioId);
        this.shakaPlayer.selectVariantTrack(targetVariant, /* clearBuffer= */ true);
      } else {
        console.warn('[TvPlayer] Could not find specific variant track for language=' + language + ', relying on selectAudioLanguage');
      }

      this.emit('tracksready');
    } catch (e) {
      console.error('[TvPlayer] Error in selectAudioTrack:', e);
    }
  };

  TvPlayer.prototype.getTextTracks = function () {
    if (this.isMovie) {
      if (this.movieSubtitleCues && this.movieSubtitleCues.length > 0) {
        return [{
          id: 'cs-vtt',
          language: 'ces',
          role: 'subtitle',
          label: (this.currentMovie && this.currentMovie.subtitleLabel) ? this.currentMovie.subtitleLabel : 'Český (CES) - VTT',
          active: !!this.movieSubtitlesEnabled,
          mimeType: 'text/vtt'
        }];
      }
      return [];
    }
    if (!this.shakaPlayer) return [];
    try {
      var tracks = this.shakaPlayer.getTextTracks() || [];
      var isVisible = this.shakaPlayer.isTextTrackVisible();

      var seen = {};
      var list = [];

      for (var i = 0; i < tracks.length; i++) {
        var t = tracks[i];
        var lang = (t.language || 'und').toLowerCase().trim();
        var role = (t.roles && t.roles[0]) || '';
        var key = t.id !== undefined ? t.id : (lang + '_' + role);

        if (!seen[key]) {
          seen[key] = true;
          list.push({
            id: t.id,
            language: t.language || 'und',
            role: role,
            label: formatLanguageLabel(t.language, role),
            active: t.active && isVisible,
            mimeType: t.mimeType
          });
        }
      }
      return list;
    } catch (e) {
      console.warn('[TvPlayer] Error getting text tracks:', e);
      return [];
    }
  };

  TvPlayer.prototype.isSubtitlesEnabled = function () {
    if (this.isMovie) {
      return !!(this.movieSubtitlesEnabled && this.movieSubtitleCues && this.movieSubtitleCues.length > 0);
    }
    if (!this.shakaPlayer) return false;
    try {
      return this.shakaPlayer.isTextTrackVisible();
    } catch (e) {
      return false;
    }
  };

  TvPlayer.prototype.getActiveTextTrack = function () {
    if (!this.isSubtitlesEnabled()) return null;
    var tracks = this.getTextTracks();
    for (var i = 0; i < tracks.length; i++) {
      if (tracks[i].active) return tracks[i];
    }
    return null;
  };

  TvPlayer.prototype.selectTextTrack = function (trackId) {
    if (this.isMovie) {
      if (trackId === 'off' || trackId === null || trackId === undefined) {
        console.log('[TvPlayer] Disabling movie VTT subtitles');
        this.movieSubtitlesEnabled = false;
      } else {
        console.log('[TvPlayer] Enabling movie VTT subtitles:', trackId);
        this.movieSubtitlesEnabled = true;
      }
      this.updateMovieSubtitleOverlay(this.videoElement ? (this.videoElement.currentTime || 0) : 0);
      this.emit('tracksready');
      return;
    }
    if (!this.shakaPlayer) return;
    try {
      if (trackId === 'off' || trackId === null || trackId === undefined) {
        console.log('[TvPlayer] Disabling subtitles');
        this.shakaPlayer.setTextTrackVisibility(false);
        this.emit('tracksready');
        return;
      }

      var tracks = this.shakaPlayer.getTextTracks() || [];
      var target = null;

      if (typeof trackId === 'number' || !isNaN(parseInt(trackId, 10))) {
        var numId = parseInt(trackId, 10);
        target = tracks.find(function (t) { return t.id === numId; });
      }

      if (!target && typeof trackId === 'string') {
        var langClean = trackId.toLowerCase().trim();
        target = tracks.find(function (t) { return (t.language || '').toLowerCase().trim() === langClean; });
      }

      if (target) {
        console.log('[TvPlayer] Selecting subtitle track:', target.language, 'id=' + target.id);
        this.shakaPlayer.selectTextTrack(target);
        this.shakaPlayer.setTextTrackVisibility(true);
      } else {
        console.warn('[TvPlayer] Subtitle track not found:', trackId);
      }

      this.emit('tracksready');
    } catch (e) {
      console.error('[TvPlayer] Error selecting text track:', e);
    }
  };

  TvPlayer.prototype.toggleSubtitles = function () {
    if (this.isMovie) {
      if (this.isSubtitlesEnabled()) {
        this.selectTextTrack('off');
      } else {
        this.selectTextTrack('cs-vtt');
      }
      return;
    }
    if (!this.shakaPlayer) return;
    var tracks = this.getTextTracks();
    if (tracks.length === 0) return;

    if (this.isSubtitlesEnabled()) {
      this.selectTextTrack('off');
    } else {
      var slovak = tracks.find(function (t) {
        var l = (t.language || '').toLowerCase().trim();
        return l === 'slk' || l === 'sk' || l === 'slo';
      });
      var target = slovak || tracks[0];
      this.selectTextTrack(target.id);
    }
  };

  var AUDIO_LANG_MAP = {
    'sk': 'Slovenský',
    'slk': 'Slovenský',
    'slo': 'Slovenský',
    'cs': 'Český',
    'ces': 'Český',
    'cze': 'Český',
    'en': 'Anglický',
    'eng': 'Anglický',
    'qaa': 'Pôvodné znenie',
    'org': 'Pôvodné znenie',
    'orig': 'Pôvodné znenie',
    'und': 'Predvolený',
    'de': 'Nemecký',
    'deu': 'Nemecký',
    'ger': 'Nemecký',
    'hu': 'Maďarský',
    'hun': 'Maďarský',
    'fr': 'Francúzsky',
    'fra': 'Francúzsky',
    'fre': 'Francúzsky',
    'it': 'Taliansky',
    'ita': 'Taliansky',
    'es': 'Španielsky',
    'spa': 'Španielsky',
    'pl': 'Poľský',
    'pol': 'Poľský',
    'ru': 'Ruský',
    'rus': 'Ruský',
    'uk': 'Ukrajinský',
    'ukr': 'Ukrajinský'
  };

  function formatLanguageLabel(langCode, role, channels) {
    var code = (langCode || 'und').toLowerCase().trim();
    var name = AUDIO_LANG_MAP[code] || code.toUpperCase();
    var tag = code !== 'und' ? ' (' + code.toUpperCase() + ')' : '';
    var chStr = channels === 6 ? ' 5.1' : (channels === 1 ? ' Mono' : '');
    var roleStr = (role && role !== 'main' && role !== 'alternate') ? ' [' + role + ']' : '';
    return name + tag + chStr + roleStr;
  }

  TvPlayer.prototype.handleBufferingStart = function () {
    var self = this;
    this.clearBufferingTimers();
    if (this.isWebcam || this.isMovie) return;

    console.warn('[TvPlayer] Buffering entered. Arming progressive silent recovery...');

    // Tier 1: at 400ms, perform micro-nudge / gap jump over presentation gap
    this.bufferingTier1Timer = setTimeout(function () {
      if (!self.isBuffering || self.isRecovering) return;
      console.log('[TvPlayer] Buffering Tier 1 (400ms): Micro-nudge over potential presentation gap...');
      try {
        if (self.videoElement && !self.videoElement.paused) {
          self.videoElement.currentTime += 0.2;
        }
        if (self.shakaPlayer && typeof self.shakaPlayer.retryStreaming === 'function') {
          self.shakaPlayer.retryStreaming();
        }
      } catch (e) {
        console.warn('[TvPlayer] Tier 1 nudge warning:', e);
      }
    }, 400);

    // Tier 2: at 1800ms, resync to live edge if live TV, and refresh token
    this.bufferingTier2Timer = setTimeout(function () {
      if (!self.isBuffering || self.isRecovering) return;
      console.log('[TvPlayer] Buffering Tier 2 (1800ms): Resyncing to live edge / retrying stream...');
      if (self.api) self.api.refreshStreamingToken();

      if (!self.isReplay && self.shakaPlayer) {
        try {
          var range = self.shakaPlayer.seekRange();
          if (range && range.end > 0) {
            var targetLive = Math.max(range.start || 0, range.end - 3);
            console.log('[TvPlayer] Live buffer recovery: jumping to safe live edge (' + targetLive + 's)');
            self.videoElement.currentTime = targetLive;
          }
        } catch (e) { }
      }

      if (self.shakaPlayer && typeof self.shakaPlayer.retryStreaming === 'function') {
        try { self.shakaPlayer.retryStreaming(); } catch (e) { }
      }
    }, 1800);

    // Tier 3: at 3500ms, if still stuck in buffering, perform seamless full stream reload
    this.bufferingTier3Timer = setTimeout(function () {
      if (!self.isBuffering || self.isRecovering) return;
      console.warn('[TvPlayer] Buffering Tier 3 (3500ms): Stream stuck in buffer state. Executing silent recovery...');
      self.silentRecover();
    }, 3500);
  };

  TvPlayer.prototype.handleBufferingEnd = function () {
    this.clearBufferingTimers();
    this.isBuffering = false;
    this.isRecovering = false;
  };

  TvPlayer.prototype.clearBufferingTimers = function () {
    if (this.bufferingTier1Timer) { clearTimeout(this.bufferingTier1Timer); this.bufferingTier1Timer = null; }
    if (this.bufferingTier2Timer) { clearTimeout(this.bufferingTier2Timer); this.bufferingTier2Timer = null; }
    if (this.bufferingTier3Timer) { clearTimeout(this.bufferingTier3Timer); this.bufferingTier3Timer = null; }
  };

  TvPlayer.prototype.startStallWatchdog = function () {
    var self = this;
    if (this.stallWatchdogTimer) clearInterval(this.stallWatchdogTimer);
    this.lastWatchdogTime = -1;
    this.stallCount = 0;
    if (this.isWebcam || this.isMovie) return;

    this.stallWatchdogTimer = setInterval(function () {
      if (!self.videoElement || !self.isPlaying || self.videoElement.paused || self.isRecovering) {
        self.stallCount = 0;
        return;
      }

      var cur = self.videoElement.currentTime || 0;
      if (self.lastWatchdogTime >= 0 && Math.abs(cur - self.lastWatchdogTime) < 0.05) {
        self.stallCount++;
        console.warn('[TvPlayer] Watchdog detected stalled playback: cur=' + cur + ' stallCount=' + self.stallCount);

        if (self.stallCount === 2) {
          // 2 seconds without frame advance: try micro-nudge over gap
          try {
            if (self.shakaPlayer && typeof self.shakaPlayer.retryStreaming === 'function') {
              self.shakaPlayer.retryStreaming();
            }
            self.videoElement.currentTime += 0.25;
          } catch (e) { }
        } else if (self.stallCount >= 4) {
          // 4 seconds without frame advance: trigger silent reload!
          self.stallCount = 0;
          self.silentRecover();
        }
      } else {
        self.lastWatchdogTime = cur;
        self.stallCount = 0;
      }
    }, 1000);
  };

  TvPlayer.prototype.stopStallWatchdog = function () {
    if (this.stallWatchdogTimer) {
      clearInterval(this.stallWatchdogTimer);
      this.stallWatchdogTimer = null;
    }
    this.stallCount = 0;
    this.lastWatchdogTime = -1;
  };

  TvPlayer.prototype.silentRecover = function () {
    var self = this;
    if (this.isRecovering) return;
    if (this.isWebcam || this.isMovie) {
      console.warn('[TvPlayer] Silent recovery skipped for webcam/movie mode (handled natively)');
      return;
    }
    this.isRecovering = true;
    this.clearBufferingTimers();

    if (!this.currentChannel) {
      this.isRecovering = false;
      return;
    }

    var ch = this.currentChannel;
    var isReplay = this.isReplay;
    var replayEv = this.currentReplayEvent;
    var savedPos = (this.videoElement && this.videoElement.currentTime) || 0;

    console.warn('[TvPlayer] SILENT RECOVERY initiated for ' + ch.name + (isReplay ? ' (Replay at ' + savedPos + 's)' : ' (Live)'));

    // Step 1: Ensure streaming token is fresh
    if (this.api && typeof this.api.refreshStreamingToken === 'function') {
      this.api.refreshStreamingToken();
    }

    // Step 2: Request fresh streaming session
    var sessionPromise = isReplay && replayEv
      ? this.api.createReplayStreamSession(ch.id, replayEv.id)
      : this.api.createStreamSession(ch.id, ch.locator);

    sessionPromise.then(function (sessionData) {
      if (!self.currentChannel || self.currentChannel.id !== ch.id) {
        self.isRecovering = false;
        return;
      }

      self.lastStreamUrl = sessionData.streamUrl;
      self.lastSessionData = sessionData;

      if (!self.shakaPlayer) {
        self.isRecovering = false;
        return;
      }

      self.configureShakaNetworking(sessionData);

      return self.shakaPlayer.load(sessionData.streamUrl).then(function () {
        console.log('[TvPlayer] Silent recovery load completed successfully.');
        self.enforcePreferredAudioLanguage();
        self.emit('tracksready');

        if (isReplay && savedPos > 0) {
          try {
            self.videoElement.currentTime = savedPos;
          } catch (e) { }
        } else if (!isReplay) {
          try {
            var range = self.shakaPlayer.seekRange();
            if (range && range.end > 0) {
              self.videoElement.currentTime = Math.max(range.start || 0, range.end - 3);
            }
          } catch (e) { }
        }

        return self.videoElement.play();
      });
    }).then(function () {
      console.log('[TvPlayer] SILENT RECOVERY SUCCESSFUL: stream playback seamlessly restored!');
      self.isRecovering = false;
      self.isBuffering = false;
      self.emit('playing');
    }).catch(function (err) {
      console.warn('[TvPlayer] Silent recovery error:', err);
      self.isRecovering = false;
      try {
        if (self.shakaPlayer) self.shakaPlayer.retryStreaming();
      } catch (e) { }
    });
  };

  TvPlayer.prototype.stopPlayback = function () {
    this.handleBufferingEnd();
    this.stopStallWatchdog();
    this.stopAvplayWebcam();
    this.stopMovieSubTimer();
    this.isMovie = false;
    this.currentMovie = null;
    if (this.shakaPlayer) {
      try { this.shakaPlayer.unload(); } catch (e) { }
    }
    if (this.videoElement) {
      try {
        this.videoElement.pause();
        if (!this.isWebcam) {
          this.videoElement.removeAttribute('src');
          this.videoElement.load();
        }
      } catch (e) { }
      if (this.isWebcam) {
        this.enforceWebcamMute();
      }
    }
    this.isPlaying = false;
    this.isBuffering = false;
    this.isRecovering = false;
  };

  TvPlayer.prototype.pause = function () {
    this.isPlaying = false;
    if (this.isAvplayActive && typeof webapis !== 'undefined' && webapis.avplay) {
      try { webapis.avplay.pause(); } catch (e) { }
      this.emit('pause');
    }
    if (this.videoElement) {
      this.videoElement.pause();
    }
  };

  TvPlayer.prototype.resume = function () {
    this.isPlaying = true;
    if (this.isAvplayActive && typeof webapis !== 'undefined' && webapis.avplay) {
      try { webapis.avplay.play(); } catch (e) { }
      this.emit('playing');
    }
    if (this.videoElement) {
      this.videoElement.play();
    }
  };

  TvPlayer.prototype.stopAvplay = function () {
    this.stopAvplayWebcam();
  };

  TvPlayer.prototype.togglePlayPause = function () {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.resume();
    }
  };

  TvPlayer.prototype.destroy = function () {
    this.stopPlayback();
    this.isWebcam = false;
    this.currentWebcam = null;
    this.isMovie = false;
    this.currentMovie = null;
    this.currentChannel = null;
    this.lastStreamUrl = null;
    this.lastSessionData = null;
    this.api.releaseStreamSession();
  };

  window.TvPlayer = TvPlayer;
})(window);
