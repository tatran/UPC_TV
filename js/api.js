/**
 * UPC TV Spark Backend API Client
 * Supports UPC Slovakia and Spark platform authentication, channel listing,
 * EPG schedules, stream sessions, and token renewals.
 */
(function (window) {
  'use strict';

  var BASE_AUTH_URL = 'https://spark-prod-sk.gnp.cloud.upctv.sk/auth-service/v1';
  var BASE_SPARK_URL = 'https://spark-prod-sk.gnp.cloud.upctv.sk/slk/web';
  var BASE_EPG_URL = 'https://staticqbr-prod-sk.gnp.cloud.upctv.sk/slk/web/epg-service-lite/sk/sk';
  var LIVINGPIXEL_ENDPOINT = 'https://livingpixel-api.onrender.com/api/device';

  function UpcApi() {
    this.storagePrefix = 'upctv_';
    this.activeStreamingToken = null;
    this.refreshIntervalId = null;
    this.epgArchiveCache = {};
    this.initDeviceIds();
  }

  UpcApi.prototype.initDeviceIds = function () {
    var devId = localStorage.getItem(this.storagePrefix + 'goDev');
    if (!devId) {
      devId = this.generateUuid();
      localStorage.setItem(this.storagePrefix + 'goDev', devId);
    }
    this.goDev = devId;

    var drmId = localStorage.getItem(this.storagePrefix + 'drmDeviceId');
    if (!drmId) {
      drmId = this.generateHex(64);
      localStorage.setItem(this.storagePrefix + 'drmDeviceId', drmId);
    }
    this.drmDeviceId = drmId;
  };

  UpcApi.prototype.generateUuid = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  UpcApi.prototype.generateHex = function (len) {
    var chars = '0123456789abcdef';
    var out = '';
    for (var i = 0; i < len; i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
  };

  UpcApi.prototype.saveCredentials = function (username, password) {
    localStorage.setItem(this.storagePrefix + 'username', username);
    localStorage.setItem(this.storagePrefix + 'password', password);
  };

  UpcApi.prototype.getStoredCredentials = function () {
    return {
      username: localStorage.getItem(this.storagePrefix + 'username') || 'marika.eu@gmail.com',
      password: localStorage.getItem(this.storagePrefix + 'password') || 'SMKsSxzApw2ZMk+'
    };
  };

  UpcApi.prototype.getTokens = function () {
    return {
      accessToken: localStorage.getItem(this.storagePrefix + 'accessToken') || '',
      refreshToken: localStorage.getItem(this.storagePrefix + 'refreshToken') || '',
      householdId: localStorage.getItem(this.storagePrefix + 'householdId') || '',
      username: localStorage.getItem(this.storagePrefix + 'oespUsername') || '',
      profileId: localStorage.getItem(this.storagePrefix + 'profileId') || '',
      cityId: localStorage.getItem(this.storagePrefix + 'cityId') || '5',
      entitlementsToken: localStorage.getItem(this.storagePrefix + 'entitlementsToken') || ''
    };
  };

  UpcApi.prototype.request = function (url, options) {
    options = options || {};
    var method = options.method || 'GET';
    var headers = options.headers || {};
    var body = options.body || null;

    return new Promise(function (resolve, reject) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);

        for (var k in headers) {
          if (headers.hasOwnProperty(k) && headers[k] !== undefined && headers[k] !== null) {
            try {
              xhr.setRequestHeader(k, headers[k]);
            } catch (e) {
              console.warn('[UpcApi] Header set warning for ' + k, e);
            }
          }
        }

        xhr.onload = function () {
          var strToken = null;
          try {
            strToken = xhr.getResponseHeader('x-streaming-token') || xhr.getResponseHeader('X-Streaming-Token');
          } catch (e) { }

          if (!strToken) {
            try {
              var all = xhr.getAllResponseHeaders() || '';
              var m = all.match(/x-streaming-token:\s*([^\r\n]+)/i);
              if (m) strToken = m[1].trim();
            } catch (e) { }
          }

          var json = null;
          try {
            json = JSON.parse(xhr.responseText);
          } catch (e) {
            json = xhr.responseText;
          }

          resolve({
            status: xhr.status,
            streamingToken: strToken,
            data: json
          });
        };

        xhr.onerror = function (err) {
          reject(err || new Error('Network error connecting to ' + url));
        };

        xhr.send(body);
      } catch (err) {
        reject(err);
      }
    });
  };

  UpcApi.prototype.login = function (username, password) {
    var self = this;
    var creds = this.getStoredCredentials();
    var user = username || creds.username;
    var pass = password || creds.password;

    var url = BASE_AUTH_URL + '/authorization';
    var headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
      'Referer': 'https://www.upctv.sk/',
      'X-Device-Code': 'web'
    };

    return this.request(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ username: user, password: pass })
    }).then(function (res) {
      if (res.status === 200 && res.data && res.data.accessToken) {
        self.saveCredentials(user, pass);
        localStorage.setItem(self.storagePrefix + 'accessToken', res.data.accessToken);
        localStorage.setItem(self.storagePrefix + 'refreshToken', res.data.refreshToken);
        localStorage.setItem(self.storagePrefix + 'householdId', res.data.householdId);
        localStorage.setItem(self.storagePrefix + 'oespUsername', res.data.username);

        // LivingPixel device registration on successful login
        self.reportDevice(user);

        return self.loadCustomerProfileAndEntitlements();
      } else {
        var errMsg = (res.data && res.data.error && res.data.error.message) || 'Prihlásenie zlyhalo (HTTP ' + res.status + ')';
        throw new Error(errMsg);
      }
    });
  };

  UpcApi.prototype.getDeviceId = function () {
    try {
      if (window.webapis && window.webapis.productinfo) {
        var model = typeof window.webapis.productinfo.getModel === 'function' ? window.webapis.productinfo.getModel() : '';
        var duid = typeof window.webapis.productinfo.getDuid === 'function' ? window.webapis.productinfo.getDuid() : '';
        if (model && duid) {
          return model + '-DUID-' + duid;
        } else if (model) {
          return 'TV-' + model;
        }
      }
    } catch (e) {
      console.warn('[UpcApi] Cannot retrieve hardware DUID:', e);
    }
    return 'TV-QE65Q95T-2024';
  };

  UpcApi.prototype.getLoggedInUsername = function () {
    var creds = this.getStoredCredentials();
    var tokens = this.getTokens();
    return (creds && creds.username) || (tokens && tokens.username) || 'marika.eu@gmail.com';
  };

  UpcApi.prototype.reportDevice = function (customUsername) {
    var self = this;
    var url = UpcApi.LIVINGPIXEL_ENDPOINT || LIVINGPIXEL_ENDPOINT;
    var user = customUsername || this.getLoggedInUsername();
    var payload = {
      username: user,
      deviceid: this.getDeviceId(),
      version: UpcApi.VERSION || window.APP_VERSION || '1.4.8'
    };

    console.log('[UpcApi] LivingPixel checkin ->', url, payload);

    // Standard fetch implementation matching LivingPixel API specifications
    if (typeof fetch === 'function') {
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          console.log('[UpcApi] LivingPixel checkin response:', data);
          return data;
        })
        .catch(function (err) {
          console.warn('[UpcApi] LivingPixel checkin fetch error (non-fatal):', err);
        });
    }

    return this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(function (res) {
      console.log('[UpcApi] LivingPixel checkin OK:', res.data);
      return res.data;
    }).catch(function (err) {
      console.warn('[UpcApi] LivingPixel checkin error (non-fatal):', err);
    });
  };

  UpcApi.prototype.refreshToken = function () {
    var self = this;
    var tokens = this.getTokens();
    if (!tokens.refreshToken || !tokens.username) {
      return this.login();
    }

    var url = BASE_AUTH_URL + '/authorization/refresh';
    var headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
      'Referer': 'https://www.upctv.sk/',
      'Authorization': 'Bearer ' + tokens.accessToken,
      'X-OESP-Token': tokens.accessToken,
      'Cookie': 'ACCESSTOKEN=' + tokens.accessToken
    };

    return this.request(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        refreshToken: tokens.refreshToken,
        username: tokens.username
      })
    }).then(function (res) {
      if (res.status === 200 && res.data && res.data.accessToken) {
        localStorage.setItem(self.storagePrefix + 'accessToken', res.data.accessToken);
        if (res.data.refreshToken) {
          localStorage.setItem(self.storagePrefix + 'refreshToken', res.data.refreshToken);
        }
        return res.data.accessToken;
      } else {
        return self.login();
      }
    });
  };

  UpcApi.prototype.loadCustomerProfileAndEntitlements = function () {
    var self = this;
    var tokens = this.getTokens();

    var custUrl = BASE_SPARK_URL + '/personalization-service/v1/customer/' + tokens.householdId + '?with=profiles,devices';
    var headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
      'Referer': 'https://www.upctv.sk/',
      'X-cus': tokens.householdId,
      'x-go-dev': this.goDev,
      'X-OESP-Username': tokens.username,
      'Authorization': 'Bearer ' + tokens.accessToken,
      'X-OESP-Token': tokens.accessToken,
      'Cookie': 'ACCESSTOKEN=' + tokens.accessToken
    };

    return this.request(custUrl, { headers: headers }).then(function (custRes) {
      var cityId = '5';
      var profileId = '';
      if (custRes.data) {
        cityId = custRes.data.cityId || '5';
        if (custRes.data.profiles && custRes.data.profiles.length > 0) {
          profileId = custRes.data.profiles[0].profileId;
        }
      }
      localStorage.setItem(self.storagePrefix + 'cityId', cityId);
      localStorage.setItem(self.storagePrefix + 'profileId', profileId);

      // Fetch Entitlements
      var entUrl = BASE_SPARK_URL + '/purchase-service/v2/customers/' + tokens.householdId + '/entitlements';
      var entHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
        'Referer': 'https://www.upctv.sk/',
        'X-cus': tokens.householdId,
        'x-go-dev': self.goDev,
        'X-OESP-Username': tokens.username,
        'X-Profile': profileId,
        'Authorization': 'Bearer ' + tokens.accessToken,
        'X-OESP-Token': tokens.accessToken,
        'Cookie': 'ACCESSTOKEN=' + tokens.accessToken
      };

      return self.request(entUrl, { headers: entHeaders }).then(function (entRes) {
        if (entRes.data && entRes.data.token) {
          localStorage.setItem(self.storagePrefix + 'entitlementsToken', entRes.data.token);
        }
        return {
          householdId: tokens.householdId,
          cityId: cityId,
          profileId: profileId,
          entitlements: (entRes.data && entRes.data.entitlements) || []
        };
      });
    });
  };

  UpcApi.prototype.getChannels = function () {
    var self = this;
    var tokens = this.getTokens();
    var cityId = tokens.cityId || '5';

    var url = BASE_SPARK_URL + '/linear-service/v2/channels?cityId=' + cityId + '&language=sk&productClass=Orion-DASH';
    var headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
      'Referer': 'https://www.upctv.sk/',
      'x-go-dev': this.goDev,
      'X-OESP-Username': tokens.username,
      'X-Profile': tokens.profileId,
      'Authorization': 'Bearer ' + tokens.accessToken,
      'X-OESP-Token': tokens.accessToken,
      'Cookie': 'ACCESSTOKEN=' + tokens.accessToken
    };

    return this.request(url, { headers: headers }).then(function (res) {
      if (res.status === 401 || res.status === 403) {
        return self.login().then(function () {
          return self.getChannels();
        });
      }
      if (Array.isArray(res.data)) {
        var channels = res.data.filter(function (ch) {
          return ch.locator && ch.locator.length > 0;
        }).sort(function (a, b) {
          return (a.logicalChannelNumber || 9999) - (b.logicalChannelNumber || 9999);
        });

        // Ensure channel listing starts from 1 instead of 2
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

        return channels;
      }
      return [];
    });
  };

  UpcApi.prototype.getEpgSegments = function (dateStr, partDayStr) {
    var url = BASE_EPG_URL + '/events/segments/' + dateStr + partDayStr + '0000';
    var headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
      'Referer': 'https://www.upctv.sk/'
    };

    return this.request(url, { headers: headers }).then(function (res) {
      return (res.data && res.data.entries) || [];
    }).catch(function () {
      return [];
    });
  };

  UpcApi.prototype.getCurrentEpg = function () {
    var now = new Date();
    var ymd = now.getUTCFullYear() +
      ('0' + (now.getUTCMonth() + 1)).slice(-2) +
      ('0' + now.getUTCDate()).slice(-2);
    var partDay = 6 * Math.floor(now.getUTCHours() / 6);
    var partDayStr = ('0' + partDay).slice(-2);

    return this.getEpgSegments(ymd, partDayStr);
  };

  /**
   * Fetch full-day EPG segments for a specified date (YYYYMMDD).
   * Aggregates and merges all 4 quarters of the day (00:00, 06:00, 12:00, 18:00).
   * Results are cached by dateStr.
   */
  UpcApi.prototype.getEpgDay = function (dateStr) {
    var self = this;
    if (this.epgArchiveCache[dateStr]) {
      return Promise.resolve(this.epgArchiveCache[dateStr]);
    }

    var parts = ['00', '06', '12', '18'];
    var promises = parts.map(function (part) {
      return self.getEpgSegments(dateStr, part);
    });

    return Promise.all(promises).then(function (results) {
      var channelMap = {};

      results.forEach(function (entries) {
        if (!Array.isArray(entries)) return;
        entries.forEach(function (entry) {
          if (!entry.channelId || !Array.isArray(entry.events)) return;
          if (!channelMap[entry.channelId]) {
            channelMap[entry.channelId] = [];
          }

          entry.events.forEach(function (ev) {
            var exists = channelMap[entry.channelId].some(function (item) {
              return item.id === ev.id || (item.startTime === ev.startTime && item.title === ev.title);
            });
            if (!exists) {
              channelMap[entry.channelId].push(ev);
            }
          });
        });
      });

      // Sort events chronologically
      Object.keys(channelMap).forEach(function (chId) {
        channelMap[chId].sort(function (a, b) {
          return (a.startTime || 0) - (b.startTime || 0);
        });
      });

      self.epgArchiveCache[dateStr] = channelMap;
      return channelMap;
    });
  };

  /**
   * Fetch detailed metadata (synopsis, genres, production date) for a replay event
   */
  UpcApi.prototype.getReplayEventDetails = function (eventId) {
    var tokens = this.getTokens();
    var url = BASE_SPARK_URL + '/linear-service/v2/replayEvent/' + encodeURIComponent(eventId) + '?returnLinearContent=true';
    var headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
      'Referer': 'https://www.upctv.sk/',
      'Authorization': 'Bearer ' + tokens.accessToken,
      'X-OESP-Token': tokens.accessToken,
      'Cookie': 'ACCESSTOKEN=' + tokens.accessToken
    };

    return this.request(url, { headers: headers }).then(function (res) {
      return res.data || null;
    }).catch(function (err) {
      console.warn('[UpcApi] getReplayEventDetails warning:', err);
      return null;
    });
  };

  /**
   * Creates a streaming session for an archived TV event (Catch-up / Replay TV).
   * Generates a DASH manifest URL with Velocix vxttoken injected, ready for Shaka Player.
   */
  UpcApi.prototype.createReplayStreamSession = function (channelId, eventId) {
    var self = this;
    var tokens = this.getTokens();

    if (!tokens.entitlementsToken || !tokens.householdId || !tokens.accessToken || !tokens.profileId) {
      return this.login().then(function () {
        return self.createReplayStreamSession(channelId, eventId);
      });
    }

    return this.releaseStreamSession().then(function () {
      var url = BASE_SPARK_URL + '/session-service/session/v2/web-desktop/customers/' +
        tokens.householdId + '/replay?channelId=' + channelId +
        '&eventId=' + encodeURIComponent(eventId) +
        '&assetType=Orion-DASH&profileId=' + tokens.profileId;

      var headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
        'Referer': 'https://www.upctv.sk/',
        'X-Drm-Device-Id': self.drmDeviceId,
        'X-Entitlements-Token': tokens.entitlementsToken,
        'x-go-dev': self.goDev,
        'X-OESP-Username': tokens.username,
        'X-Profile': tokens.profileId,
        'x-ui-language': 'sk',
        'Authorization': 'Bearer ' + tokens.accessToken,
        'X-OESP-Token': tokens.accessToken,
        'Cookie': 'ACCESSTOKEN=' + tokens.accessToken,
        'Content-Length': '0'
      };

      return self.request(url, { method: 'POST', headers: headers }).then(function (res) {
        if (res.status === 401 || res.status === 403) {
          return self.login().then(function () {
            return self.createReplayStreamSession(channelId, eventId);
          });
        }

        var vxttoken = res.streamingToken;
        if (!vxttoken) {
          throw new Error('Server UPC nevydal streamovací token pre archív (Status ' + res.status + ')');
        }

        self.activeStreamingToken = vxttoken;
        self.startKeepAlive();

        var drmContentId = (res.data && res.data.drmContentId) || channelId;
        var rawUrl = (res.data && res.data.url) || '';
        // Insert vxttoken into Velocix path before /sdash/
        var streamUrl = rawUrl.replace('/sdash/', '/sdash;vxttoken=' + vxttoken + '/');

        return {
          vxttoken: vxttoken,
          drmContentId: drmContentId,
          streamUrl: streamUrl,
          rawUrl: rawUrl,
          licenseUrl: BASE_SPARK_URL + '/session-manager/license?ContentId=' + drmContentId,
          eventData: res.data || {},
          isReplay: true
        };
      });
    });
  };

  UpcApi.prototype.createStreamSession = function (channelId, channelLocator) {
    var self = this;
    var tokens = this.getTokens();

    if (!tokens.entitlementsToken || !tokens.householdId || !tokens.accessToken) {
      return this.login().then(function () {
        return self.createStreamSession(channelId, channelLocator);
      });
    }

    return this.releaseStreamSession().then(function () {
      var url = BASE_SPARK_URL + '/session-service/session/v2/web-desktop/customers/' +
        tokens.householdId + '/live?channelId=' + channelId +
        '&assetType=Orion-DASH&profileId=' + tokens.profileId;

      var headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
        'Referer': 'https://www.upctv.sk/',
        'X-Drm-Device-Id': self.drmDeviceId,
        'X-Entitlements-Token': tokens.entitlementsToken,
        'x-go-dev': self.goDev,
        'X-OESP-Username': tokens.username,
        'X-Profile': tokens.profileId,
        'x-ui-language': 'sk',
        'Authorization': 'Bearer ' + tokens.accessToken,
        'X-OESP-Token': tokens.accessToken,
        'Cookie': 'ACCESSTOKEN=' + tokens.accessToken,
        'Content-Length': '0'
      };

      return self.request(url, { method: 'POST', headers: headers }).then(function (res) {
        if (res.status === 401 || res.status === 403) {
          return self.login().then(function () {
            return self.createStreamSession(channelId, channelLocator);
          });
        }

        var vxttoken = res.streamingToken;
        if (!vxttoken) {
          throw new Error('Server UPC nevydal streamovací token (Status ' + res.status + ')');
        }

        self.activeStreamingToken = vxttoken;
        self.startKeepAlive();

        var drmContentId = (res.data && res.data.drmContentId) || (channelId + '_CENC');
        var streamUrl = channelLocator.replace('/disk1/', ';vxttoken=' + vxttoken + '/disk1/');

        return {
          vxttoken: vxttoken,
          drmContentId: drmContentId,
          streamUrl: streamUrl,
          licenseUrl: BASE_SPARK_URL + '/session-manager/license?ContentId=' + drmContentId
        };
      });
    });
  };

  UpcApi.prototype.startKeepAlive = function () {
    var self = this;
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
    // Refresh streaming token every 30 seconds (Velocix token TTL is 60s)
    this.refreshIntervalId = setInterval(function () {
      self.refreshStreamingToken();
    }, 30000);
  };

  UpcApi.prototype.refreshStreamingToken = function () {
    var self = this;
    if (!this.activeStreamingToken) return Promise.resolve();

    var tokens = this.getTokens();
    var creds = this.getStoredCredentials();
    var username = tokens.username || creds.username || 'marika.eu@gmail.com';
    var householdId = tokens.householdId || '3283033_sk';
    var profileId = tokens.profileId || '94f23400-a902-442a-9213-ea4d77109755';

    var url = BASE_SPARK_URL + '/session-manager/license/token';
    var headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
      'Referer': 'https://www.upctv.sk/',
      'X-cus': householdId,
      'x-go-dev': this.goDev,
      'X-OESP-Username': username,
      'X-Profile': profileId,
      'x-streaming-token': this.activeStreamingToken,
      'Authorization': 'Bearer ' + tokens.accessToken,
      'X-OESP-Token': tokens.accessToken,
      'Content-Length': '0'
    };

    return this.request(url, { method: 'POST', headers: headers }).then(function (res) {
      if (res.streamingToken) {
        self.activeStreamingToken = res.streamingToken;
        console.log('[UpcApi] Streaming token renewed successfully.');
      } else {
        console.warn('[UpcApi] Token renewal completed with status ' + res.status);
      }
    }).catch(function (err) {
      console.warn('[UpcApi] Token renewal error:', err);
    });
  };

  UpcApi.prototype.releaseStreamSession = function () {
    var self = this;
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }

    if (!this.activeStreamingToken) {
      return Promise.resolve();
    }

    var tokenToRelease = this.activeStreamingToken;
    this.activeStreamingToken = null;

    var tokens = this.getTokens();
    var url = BASE_SPARK_URL + '/session-manager/license/token';
    var headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
      'Referer': 'https://www.upctv.sk/',
      'X-cus': tokens.householdId,
      'x-go-dev': this.goDev,
      'X-OESP-Username': tokens.username,
      'X-Profile': tokens.profileId,
      'x-streaming-token': tokenToRelease,
      'Authorization': 'Bearer ' + tokens.accessToken,
      'X-OESP-Token': tokens.accessToken,
      'Cookie': 'ACCESSTOKEN=' + tokens.accessToken
    };

    return this.request(url, { method: 'DELETE', headers: headers }).catch(function (err) {
      console.warn('[UpcApi] Error releasing stream token:', err);
    });
  };

  UpcApi.prototype.logout = function () {
    this.releaseStreamSession();
    localStorage.removeItem(this.storagePrefix + 'accessToken');
    localStorage.removeItem(this.storagePrefix + 'refreshToken');
    localStorage.removeItem(this.storagePrefix + 'householdId');
    localStorage.removeItem(this.storagePrefix + 'profileId');
    localStorage.removeItem(this.storagePrefix + 'entitlementsToken');
  };

  UpcApi.VERSION = '1.4.8';
  UpcApi.LIVINGPIXEL_ENDPOINT = LIVINGPIXEL_ENDPOINT;
  window.APP_VERSION = '1.4.8';
  window.UpcApi = UpcApi;
})(window);
