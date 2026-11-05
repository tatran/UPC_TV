/**
 * Samsung Tizen TV Remote Control Key Handler
 * Maps and registers Tizen TV input device keys.
 */
(function(window) {
  'use strict';

  var Keys = {
    // Navigation
    UP: 38,
    DOWN: 40,
    LEFT: 37,
    RIGHT: 39,
    ENTER: 13,
    RETURN: 10009, // Tizen Back / Return
    ESCAPE: 27,
    BACKSPACE: 8,

    // Media Controls
    PLAY: 415,
    PAUSE: 19,
    PLAY_PAUSE: 10252,
    STOP: 413,
    FORWARD: 417,
    REWIND: 412,

    // Channel Controls
    CHANNEL_UP: 427,
    CHANNEL_DOWN: 428,
    PAGE_UP: 33,
    PAGE_DOWN: 34,
    CHANNEL_LIST: 10073,

    // Color Keys
    RED: 403,
    GREEN: 404,
    YELLOW: 405,
    BLUE: 406,

    // System / Info
    INFO: 457,
    GUIDE: 458,
    MENU: 18,
    TOOLS: 10135,
    CAPTION: 10221,
    SUBTITLE: 498,

    // Numeric Keys (0 - 9)
    NUM_0: 48,
    NUM_1: 49,
    NUM_2: 50,
    NUM_3: 51,
    NUM_4: 52,
    NUM_5: 53,
    NUM_6: 54,
    NUM_7: 55,
    NUM_8: 56,
    NUM_9: 57,

    // Numpad equivalents
    NUMPAD_0: 96,
    NUMPAD_1: 97,
    NUMPAD_2: 98,
    NUMPAD_3: 99,
    NUMPAD_4: 100,
    NUMPAD_5: 101,
    NUMPAD_6: 102,
    NUMPAD_7: 103,
    NUMPAD_8: 104,
    NUMPAD_9: 105
  };

  var isRegistered = false;
  var retryCount = 0;
  var maxRetries = 10;

  var desiredKeys = [
    'ChannelUp',
    'ChannelDown',
    'ChannelList',
    'MediaPlay',
    'MediaPause',
    'MediaPlayPause',
    'MediaStop',
    'MediaFastForward',
    'FastForward',
    'MediaRewind',
    'Rewind',
    'ColorF0Red',
    'ColorF1Green',
    'ColorF2Yellow',
    'ColorF3Blue',
    'Info',
    'Guide',
    'Search',
    'Caption',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
  ];

  function registerSingleKey(keyName) {
    try {
      tizen.tvinputdevice.registerKey(keyName);
      return true;
    } catch (e) {
      // Key may already be registered or unsupported
      return false;
    }
  }

  function initTizenKeys() {
    if (typeof tizen === 'undefined' || !tizen.tvinputdevice) {
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(initTizenKeys, 300);
      }
      return;
    }

    try {
      var supportedKeys = [];
      try {
        if (typeof tizen.tvinputdevice.getSupportedKeys === 'function') {
          supportedKeys = tizen.tvinputdevice.getSupportedKeys();
        }
      } catch (e) {
        console.warn('[TizenKeys] getSupportedKeys not available:', e);
      }

      var supportedNames = supportedKeys.map(function(k) { return k.name; });
      console.log('[TizenKeys] TV supported keys (' + supportedNames.length + '):', supportedNames.join(', '));

      // Filter keys that are either known supported or attempt all if list is empty
      var keysToRegister = desiredKeys.filter(function(keyName) {
        if (supportedNames.length === 0) return true;
        return supportedNames.indexOf(keyName) !== -1;
      });

      console.log('[TizenKeys] Registering ' + keysToRegister.length + ' keys...');

      // Try batch registration first if supported
      if (typeof tizen.tvinputdevice.registerKeyBatch === 'function') {
        try {
          tizen.tvinputdevice.registerKeyBatch(
            keysToRegister,
            function() {
              console.log('[TizenKeys] registerKeyBatch succeeded for ' + keysToRegister.length + ' keys.');
              isRegistered = true;
            },
            function(err) {
              console.warn('[TizenKeys] registerKeyBatch callback error, falling back to individual:', err);
              registerIndividually(keysToRegister);
            }
          );
          return;
        } catch (batchErr) {
          console.warn('[TizenKeys] registerKeyBatch exception, falling back:', batchErr);
        }
      }

      registerIndividually(keysToRegister);
    } catch (err) {
      console.warn('[TizenKeys] Could not register Tizen input device keys:', err);
    }
  }

  function registerIndividually(keys) {
    var successCount = 0;
    for (var i = 0; i < keys.length; i++) {
      if (registerSingleKey(keys[i])) {
        successCount++;
      }
    }
    console.log('[TizenKeys] Individual register completed. ' + successCount + '/' + keys.length + ' keys registered.');
    isRegistered = true;
  }

  function getNumericValue(keyCode) {
    if (keyCode >= Keys.NUM_0 && keyCode <= Keys.NUM_9) {
      return keyCode - Keys.NUM_0;
    }
    if (keyCode >= Keys.NUMPAD_0 && keyCode <= Keys.NUMPAD_9) {
      return keyCode - Keys.NUMPAD_0;
    }
    return -1;
  }

  window.TizenKeys = {
    Codes: Keys,
    init: initTizenKeys,
    getNumericValue: getNumericValue,
    isRegistered: function() { return isRegistered; }
  };

  // Immediate attempt
  initTizenKeys();

  // DOM ready attempt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTizenKeys);
  }

  // Window load attempt
  window.addEventListener('load', function() {
    initTizenKeys();
  });
})(window);

