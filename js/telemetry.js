/**
 * UPC TV - Telemetry Client for Neon Postgres
 * Logs every start action directly to table upc_tv_telemetry via Neon Serverless HTTP API
 * with fallback to local backend.
 */
(function (window) {
  'use strict';

  var cfg = window.TELEMETRY_CONFIG || {};
  var NEON_HTTP_ENDPOINT = cfg.endpoint || 'https://ep-broad-mode-ba2zewd1-pooler.c-8.eu-central-1.aws.neon.tech/sql';
  var NEON_CONN_STR = cfg.connectionString || '';
  var APP_VERSION = 'v1.5.5';

  function UpcTelemetry() {
    this.deviceId = this.resolveDeviceId();
    this.appVersion = APP_VERSION;
    this.clientIp = null;
    this.fetchClientIp();
  }

  UpcTelemetry.prototype.resolveDeviceId = function () {
    try {
      if (typeof webapis !== 'undefined' && webapis.productinfo && typeof webapis.productinfo.getDuid === 'function') {
        var duid = webapis.productinfo.getDuid();
        if (duid) return duid;
      }
    } catch (e) { }

    try {
      var stored = localStorage.getItem('upc_tv_device_id');
      if (stored) return stored;
      var newId = 'TV-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      localStorage.setItem('upc_tv_device_id', newId);
      return newId;
    } catch (e) {
      return 'TV-ANON-' + Date.now();
    }
  };

  UpcTelemetry.prototype.fetchClientIp = function () {
    var self = this;
    try {
      fetch('https://api.ipify.org?format=json')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.ip) {
            self.clientIp = data.ip;
          }
        })
        .catch(function () { });
    } catch (e) { }
  };

  /**
   * Log an event into table upc_tv_telemetry
   * @param {string} eventType - e.g. 'start', 'start_channel', 'start_replay', 'start_webcam', 'start_radio'
   * @param {Object} payload - custom metadata
   */
  UpcTelemetry.prototype.record = function (eventType, payload) {
    var self = this;
    var safePayload = payload || {};
    if (!safePayload.action) {
      safePayload.action = 'start';
    }
    safePayload.timestamp = new Date().toISOString();
    safePayload.appVersion = this.appVersion;

    var userAgent = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : 'Samsung-Tizen-TV';
    var sqlQuery = 'INSERT INTO upc_tv_telemetry (device_id, app_version, user_agent, ip, event_type, payload) VALUES ($1, $2, $3, $4, $5, $6::jsonb);';
    var sqlParams = [
      self.deviceId,
      self.appVersion,
      userAgent,
      self.clientIp || '192.168.100.14',
      eventType || 'start',
      JSON.stringify(safePayload)
    ];

    var bodyData = JSON.stringify({
      query: sqlQuery,
      params: sqlParams
    });

    if (!NEON_CONN_STR) {
      // Telemetry credentials not configured; skip cloud logging
      return;
    }

    // Primary: XMLHttpRequest (robust cross-origin on Tizen, omitting Content-Type to prevent CORS preflight block)
    var sent = false;
    try {
      if (typeof XMLHttpRequest !== 'undefined') {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', NEON_HTTP_ENDPOINT, true);
        xhr.setRequestHeader('Neon-Connection-String', NEON_CONN_STR);
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              console.log('[Telemetry] Recorded (' + eventType + '):', xhr.responseText);
            } else {
              console.warn('[Telemetry] HTTP ' + xhr.status + ':', xhr.responseText);
            }
          }
        };
        xhr.send(bodyData);
        sent = true;
      }
    } catch (xhrErr) {
      console.warn('[Telemetry] XHR error, trying fetch fallback:', xhrErr);
    }

    // Secondary fallback: Fetch API (only if XHR was not sent)
    if (!sent && typeof fetch === 'function') {
      try {
        fetch(NEON_HTTP_ENDPOINT, {
          method: 'POST',
          headers: {
            'Neon-Connection-String': NEON_CONN_STR
          },
          body: bodyData
        }).then(function (res) {
          if (!res.ok) {
            console.warn('[Telemetry] Fetch HTTP status:', res.status);
          } else {
            console.log('[Telemetry] Recorded via fetch:', eventType);
          }
        }).catch(function (err) {
          console.warn('[Telemetry] Fetch notice:', err.message);
        });
      } catch (fetchErr) {
        console.warn('[Telemetry] Direct send error:', fetchErr);
      }
    }

    // Secondary: local server endpoint (if running on same LAN)
    try {
      fetch('http://192.168.100.2:3000/api/neon/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: self.deviceId,
          appVersion: self.appVersion,
          eventType: eventType || 'start',
          payload: safePayload
        })
      }).catch(function () { });
    } catch (e) { }
  };

  /**
   * Helper shortcut to record start action
   */
  UpcTelemetry.prototype.recordStart = function (category, details) {
    var payload = details || {};
    payload.category = category; // 'app', 'channel', 'replay', 'webcam', 'radio'
    payload.action = 'start';
    var eventType = 'start_' + category;
    this.record(eventType, payload);
  };

  window.UpcTelemetry = UpcTelemetry;
  window.upcTelemetry = new UpcTelemetry();

})(window);
