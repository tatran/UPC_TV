/**
 * Samsung TV Spatial Navigation & Remote Control Engine
 * Manages 4-way D-pad focus, numeric channel jump, channel up/down, and color keys.
 */
(function(window) {
  'use strict';

  function TvNavigation(options) {
    this.options = options || {};
    this.currentFocus = null;
    this.currentZone = 'channels'; // 'navbar', 'categories', 'channels', 'epg', 'player-osd', 'modal'
    this.numBuffer = '';
    this.numTimer = null;
    this.listeners = {};

    this.bindEvents();
  }

  TvNavigation.prototype.on = function(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  };

  TvNavigation.prototype.emit = function(event, data) {
    var list = this.listeners[event];
    if (list) {
      for (var i = 0; i < list.length; i++) {
        list[i](data);
      }
    }
  };

  TvNavigation.prototype.bindEvents = function() {
    var self = this;
    window.addEventListener('keydown', function(e) {
      self.handleKeyDown(e);
    });
  };

  TvNavigation.prototype.handleKeyDown = function(e) {
    var keyCode = e.keyCode;
    var key = e.key || '';
    var code = e.code || '';

    var K = window.TizenKeys ? window.TizenKeys.Codes : {
      UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39, ENTER: 13, RETURN: 10009, ESCAPE: 27, BACKSPACE: 8,
      CHANNEL_UP: 427, CHANNEL_DOWN: 428, PAGE_UP: 33, PAGE_DOWN: 34, CHANNEL_LIST: 10073,
      RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406,
      PLAY: 415, PAUSE: 19, PLAY_PAUSE: 10252, STOP: 413, INFO: 457, GUIDE: 458,
      CAPTION: 10221, SUBTITLE: 498
    };

    console.log('[TvNav] KeyDown: code=' + keyCode + ' key="' + key + '" codeStr="' + code + '"');

    // 1. Channel Up / Channel Down (Universal detection: Tizen keycode 427/428, PageUp/Down 33/34, and key strings)
    var isChannelUp = (
      keyCode === K.CHANNEL_UP || keyCode === K.PAGE_UP ||
      key === 'ChannelUp' || key === 'PageUp' ||
      code === 'ChannelUp' || code === 'PageUp'
    );
    var isChannelDown = (
      keyCode === K.CHANNEL_DOWN || keyCode === K.PAGE_DOWN ||
      key === 'ChannelDown' || key === 'PageDown' ||
      code === 'ChannelDown' || code === 'PageDown'
    );

    if (isChannelUp) {
      e.preventDefault();
      this.emit('channel-up');
      return;
    }

    if (isChannelDown) {
      e.preventDefault();
      this.emit('channel-down');
      return;
    }

    // 2. Check if an input field is currently active
    var activeTag = document.activeElement ? document.activeElement.tagName : '';
    var isInputFocused = (activeTag === 'INPUT' || activeTag === 'TEXTAREA');

    if (isInputFocused) {
      if (keyCode === K.RETURN || keyCode === K.ESCAPE) {
        e.preventDefault();
        document.activeElement.blur();
        return;
      }
      if (keyCode === K.ENTER) {
        e.preventDefault();
        document.activeElement.blur();
        this.emit('search-submit');
        return;
      }
      if (keyCode === K.UP || keyCode === K.DOWN) {
        e.preventDefault();
        document.activeElement.blur();
        this.move(keyCode === K.UP ? 'up' : 'down');
        return;
      }
      if (keyCode === K.BACKSPACE) {
        // Standard backspace inside text input
        return;
      }
      var numVal = window.TizenKeys ? window.TizenKeys.getNumericValue(keyCode) : -1;
      if (numVal !== -1) {
        // Let the input field receive numbers
        return;
      }
    }

    // 3. Numeric keys (0-9)
    var num = window.TizenKeys ? window.TizenKeys.getNumericValue(keyCode) : -1;
    if (num !== -1) {
      e.preventDefault();
      this.handleNumericInput(num);
      return;
    }

    // 3. Check modal and player state
    var activeModal = document.querySelector('.modal-overlay.active');
    var inModal = !!activeModal;

    var playerView = document.getElementById('playerView');
    var inPlayer = playerView && playerView.classList.contains('active');
    var playerOsd = document.getElementById('playerOsd');
    var osdVisible = inPlayer && playerOsd && playerOsd.classList.contains('visible');

    // When watching fullscreen video, OSD is NOT showing, and NO modal is active
    if (inPlayer && !osdVisible && !inModal) {
      var isReplay = window.upcAppInstance && window.upcAppInstance.player &&
                     (window.upcAppInstance.player.isReplay || window.upcAppInstance.player.isMovie);

      if (isReplay) {
        if (keyCode === K.FORWARD) {
          e.preventDefault();
          this.emit('skip-forward-2m');
          return;
        }
        if (keyCode === K.REWIND) {
          e.preventDefault();
          this.emit('skip-backward-2m');
          return;
        }
        if (keyCode === K.CHANNEL_UP || keyCode === K.PAGE_UP) {
          e.preventDefault();
          this.emit('skip-forward-2m');
          return;
        }
        if (keyCode === K.CHANNEL_DOWN || keyCode === K.PAGE_DOWN) {
          e.preventDefault();
          this.emit('skip-backward-2m');
          return;
        }
        if (keyCode === K.RIGHT || key === 'ArrowRight') {
          e.preventDefault();
          this.emit('seek-forward');
          return;
        }
        if (keyCode === K.LEFT || key === 'ArrowLeft') {
          e.preventDefault();
          this.emit('seek-backward');
          return;
        }
        if (keyCode === K.UP || key === 'ArrowUp' || keyCode === K.DOWN || key === 'ArrowDown' || keyCode === K.ENTER || key === 'Enter') {
          e.preventDefault();
          this.emit('show-osd');
          return;
        }
      } else {
        if (keyCode === K.UP || key === 'ArrowUp') {
          e.preventDefault();
          this.emit('channel-up');
          return;
        }
        if (keyCode === K.DOWN || key === 'ArrowDown') {
          e.preventDefault();
          this.emit('channel-down');
          return;
        }
        if (keyCode === K.RIGHT || key === 'ArrowRight') {
          e.preventDefault();
          this.emit('channel-up');
          return;
        }
        if (keyCode === K.LEFT || key === 'ArrowLeft') {
          e.preventDefault();
          this.emit('channel-down');
          return;
        }
        if (keyCode === K.ENTER || key === 'Enter') {
          e.preventDefault();
          this.emit('show-osd');
          return;
        }
      }
    }

    // 4. Standard spatial navigation and action mapping
    switch (keyCode) {
      case K.UP:
        e.preventDefault();
        this.move('up');
        break;
      case K.DOWN:
        e.preventDefault();
        this.move('down');
        break;
      case K.LEFT:
        e.preventDefault();
        this.move('left');
        break;
      case K.RIGHT:
        e.preventDefault();
        this.move('right');
        break;
      case K.ENTER:
        e.preventDefault();
        this.activateCurrent();
        break;
      case K.RETURN:
      case K.ESCAPE:
      case K.BACKSPACE:
        e.preventDefault();
        this.emit('back');
        break;
      case K.PLAY:
      case K.PAUSE:
      case K.PLAY_PAUSE:
        e.preventDefault();
        this.emit('play-pause');
        break;
      case K.FORWARD:
        e.preventDefault();
        this.emit('skip-forward-2m');
        break;
      case K.REWIND:
        e.preventDefault();
        this.emit('skip-backward-2m');
        break;
      case K.INFO:
        e.preventDefault();
        this.emit('info');
        break;
      case K.GUIDE:
      case K.CHANNEL_LIST:
        e.preventDefault();
        this.emit('guide');
        break;
      case K.RED:
        e.preventDefault();
        this.emit('color-red');
        break;
      case K.GREEN:
        e.preventDefault();
        this.emit('color-green');
        break;
      case K.YELLOW:
        e.preventDefault();
        this.emit('color-yellow');
        break;
      case K.BLUE:
        e.preventDefault();
        this.emit('color-blue');
        break;
      case K.CAPTION:
      case K.SUBTITLE:
        e.preventDefault();
        this.emit('toggle-subtitles');
        break;
    }
  };

  TvNavigation.prototype.handleNumericInput = function(digit) {
    var self = this;
    this.numBuffer += String(digit);
    this.emit('num-input', this.numBuffer);

    if (this.numTimer) clearTimeout(this.numTimer);
    this.numTimer = setTimeout(function() {
      var channelNum = parseInt(self.numBuffer, 10);
      self.numBuffer = '';
      self.emit('tune-channel-number', channelNum);
    }, 1200);
  };

  TvNavigation.prototype.getFocusables = function(zone) {
    var container = document.body;
    var selector = '[data-nav]';

    var activeModal = document.querySelector('.modal-overlay.active');
    if (activeModal) {
      container = activeModal;
    } else if (zone) {
      var zoneEl = document.querySelector('[data-zone="' + zone + '"]');
      if (zoneEl) container = zoneEl;
    }

    var elements = Array.prototype.slice.call(container.querySelectorAll(selector));
    return elements.filter(function(el) {
      // Exclude elements inside hidden OSD or inactive modal
      var osd = el.closest('.player-osd');
      if (osd && !osd.classList.contains('visible')) return false;

      var modal = el.closest('.modal-overlay');
      if (modal && !modal.classList.contains('active')) return false;

      return el.offsetParent !== null && !el.disabled;
    });
  };

  TvNavigation.prototype.setFocus = function(element, scrollIntoView) {
    if (!element) return;
    if (this.currentFocus) {
      this.currentFocus.classList.remove('focused');
      this.currentFocus.blur();
    }

    this.currentFocus = element;
    element.classList.add('focused');
    element.focus();

    if (scrollIntoView !== false) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    var zone = element.closest('[data-zone]');
    if (zone && zone.getAttribute('data-zone')) {
      this.currentZone = zone.getAttribute('data-zone');
    }

    this.emit('focus-change', element);
  };

  TvNavigation.prototype.activateCurrent = function() {
    if (this.currentFocus) {
      this.currentFocus.click();
      if (this.currentFocus.tagName === 'INPUT' || this.currentFocus.tagName === 'TEXTAREA') {
        this.currentFocus.focus();
      }
    }
  };

  TvNavigation.prototype.move = function(direction) {
    var focusables = this.getFocusables();
    if (!focusables.length) return;

    if (!this.currentFocus || !document.body.contains(this.currentFocus)) {
      this.setFocus(focusables[0]);
      return;
    }

    var currentRect = this.currentFocus.getBoundingClientRect();
    var currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2
    };

    var bestCandidate = null;
    var minDistance = Infinity;

    for (var i = 0; i < focusables.length; i++) {
      var candidate = focusables[i];
      if (candidate === this.currentFocus) continue;

      var candRect = candidate.getBoundingClientRect();
      var candCenter = {
        x: candRect.left + candRect.width / 2,
        y: candRect.top + candRect.height / 2
      };

      var dx = candCenter.x - currentCenter.x;
      var dy = candCenter.y - currentCenter.y;

      var isEligible = false;
      var primaryDist = 0;
      var secondaryDist = 0;

      if (direction === 'up' && dy < -5) {
        isEligible = true;
        primaryDist = Math.abs(dy);
        secondaryDist = Math.abs(dx);
      } else if (direction === 'down' && dy > 5) {
        isEligible = true;
        primaryDist = Math.abs(dy);
        secondaryDist = Math.abs(dx);
      } else if (direction === 'left' && dx < -5) {
        isEligible = true;
        primaryDist = Math.abs(dx);
        secondaryDist = Math.abs(dy);
      } else if (direction === 'right' && dx > 5) {
        isEligible = true;
        primaryDist = Math.abs(dx);
        secondaryDist = Math.abs(dy);
      }

      if (isEligible) {
        // Bias towards elements along the primary axis
        var distance = primaryDist * 1.0 + secondaryDist * 2.2;
        if (distance < minDistance) {
          minDistance = distance;
          bestCandidate = candidate;
        }
      }
    }

    if (bestCandidate) {
      this.setFocus(bestCandidate);
    }
  };

  window.TvNavigation = TvNavigation;
})(window);
