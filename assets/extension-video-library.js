/**
 * Returns a promise that resolves when all images are loaded.
 * @param el
 * @returns {Promise}
 */
function onImagesLoaded (el) {
  el = el || document;
  var images = Array.prototype
    .slice.call(el.querySelectorAll('img'))
    .filter(function(img){
      return !img.complete;
    });

  var promises = images
    .map(function(img) {
      return new Promise((resolve, reject) => {
        img.addEventListener('load', function() { return resolve(img); });
        img.addEventListener('error', function() { return reject(img); });
      });
    });
  return Promise.all(promises);
}

(function() {
  "use strict";

  var NAME = 'videoLibrary';

  var Event = {
    RENDER: NAME + ':render',
    PLAYER_READY: NAME + ':playerReady',
    PLAYERS_READY: NAME + ':ready'
  };

  var youTubeScriptAdded = false;
  var youTubeAPILoaded = false;
  var youTubeCallbacks = [];

  /**
   * Adds the YouTube player API script to the page.
   */
  function addYouTubeAPIScript() {
    var url = 'https://www.youtube.com/player_api';
    var existingScripts = Array.prototype.filter.call(document.scripts, function(script) {
      return script.src === url;
    });

    // Maybe add the script
    if (!existingScripts.length) {
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/player_api';
      var firstScriptTag = document.head.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
    youTubeScriptAdded = true;
  }

  /**
   * Executes a callback function when the YouTube player API is loaded.
   * @param callback
   */
  function loadYouTubeAPI(callback) {
    if (!youTubeScriptAdded) {
      addYouTubeAPIScript();
      if (!youTubeAPILoaded) {
        if (typeof window.YT === 'undefined') {
          window.onYouTubeIframeAPIReady = onYouTubeAPILoaded;
        } else {
          onYouTubeAPILoaded();
        }
      }
    }

    if (!youTubeAPILoaded) {
      youTubeCallbacks.push(callback);
    } else {
      callback();
    }
  }

  /**
   * Executes all callback functions when the YouTube player API is loaded.
   */
  function onYouTubeAPILoaded() {
    youTubeAPILoaded = true;
    youTubeCallbacks.forEach(function(callback) {
      callback();
    });
  }

  var vimeoScriptAdded = false;
  var vimeoAPILoaded = false;
  var vimeoCallbacks = [];

  /**
   * Adds the Vimeo player API script to the page.
   */
  function addVimeoAPIScript() {
    var tag = document.createElement('script');
    tag.onload = onVimeoAPILoaded;
    tag.src = "https://player.vimeo.com/api/player.js";

    var firstScriptTag = document.head.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    vimeoScriptAdded = true;
  }

  /**
   * Executes a callback function when the YouTube player API is loaded.
   * @param callback
   */
  function loadVimeoAPI(callback) {
    if (!vimeoScriptAdded) addVimeoAPIScript();
    if (!vimeoAPILoaded) {
      vimeoCallbacks.push(callback);
    } else {
      callback();
    }
  }

  /**
   * Executes all callback functions when the YouTube player API is loaded.
   */
  function onVimeoAPILoaded() {
    vimeoAPILoaded = true;
    vimeoCallbacks.forEach(function(callback) {
      callback();
    })
  }

  /**
   * Video Library extension.
   *
   * @type {component}
   */
  window.VideoLibrary = Util.createExtension({

    defaults: {
      ids: '',
      layout: 'grid',
      showTitle: true,
      showDuration: true,
      playInline: false,
      useLoader: true,
      template: null,
      templateData: {}
    },

    optionTypes: {
      ids: 'string',
      layout: 'string',
      showTitle: 'boolean',
      showDuration: 'boolean',
      playInline: 'boolean',
      useLoader: 'boolean',
      template: '(string|null)',
      templateData: 'object'
    },

    /**
     * Initializes the extension.
     * @param options
     */
    initialize: function(options) {
      if (['grid', 'carousel', 'tabs'].indexOf(options.layout) === -1) this.options.layout = 'grid';
      if (this.options.layout === 'carousel' && typeof Swiper !== 'function') this.options.layout = 'grid';
      if (this.options.playInline === false && (!window.jQuery || !window.jQuery.hasOwnProperty('fancybox'))) this.options.playInline = true;

      this.numberPlayersReady = 0;
      this.youTubePlayers = this.vimeoPlayers = [];
      this.ids = options.ids.split(',').map(function(id) { return id.trim(); });
      this.youTubeIds = this.ids.filter(function(id) {
        return id.length === 11;
      });
      this.vimeoIds = this.ids.filter(function(id) {
        return /^[0-9]+$/.test(id) && id.length < 10;
      });

      this.el.classList.add('hidden');
      if (this.options.useLoader) this.renderLoader();
      this.render();

      if (this.youTubeIds.length) loadYouTubeAPI(this.createYouTubePlayers.bind(this));
      if (this.vimeoIds.length) loadVimeoAPI(this.createVimeoPlayers.bind(this));
    },

    /**
     * Returns a formatted video duration string.
     * @param seconds
     * @returns {string}
     */
    formatDuration: function(seconds) {
      seconds = parseInt(seconds, 10);
      var hours   = Math.floor(seconds / 3600);
      var minutes = Math.floor(seconds / 60) % 60;
      seconds = seconds % 60;
      return [ hours, minutes, seconds ]
        .map(v => v < 10 ? "0" + v : v)
        .filter((v,i) => v !== "00" || i > 0)
        .join(":");
    },

    /**
     * Creates YouTube players for each YouTube video ID.
     */
    createYouTubePlayers: function() {
      this.youTubePlayers = this.youTubeIds.map(this.createYouTubePlayer.bind(this));
    },

    /**
     * Creates a player for a given YouTube video ID.
     * @param videoId
     * @returns {*}
     */
    createYouTubePlayer: function(videoId) {
      var onPlayerReady = this.onYouTubePlayerReady.bind(this);
      return new YT.Player(videoId, {
        videoId: videoId,
        events: {
          onReady: function(e) {
            onPlayerReady(e.target, videoId)
          }
          // onStateChange: this.onStateChange.bind(this)
        }
      });
    },

    /**
     * Triggers an event when a YouTube player is ready.
     * @param player
     * @param videoId
     */
    onYouTubePlayerReady: function(player, videoId) {
      var playerData = player.getVideoData();
      var iframe = player.getIframe();
      var properties = {
        player: player,
        title: playerData.title,
        url: 'https://www.youtube.com/watch?v=' + videoId,
        duration: this.formatDuration(player.getDuration()),
        thumbnail: 'https://img.youtube.com/vi/' + videoId + '/1.jpg',
        relatedTarget: iframe,
      };

      var _this = this;

      // Add titles
      Array.prototype.forEach.call(document.querySelectorAll('[data-title="' + videoId + '"]'), function(el) {
        el.innerText = properties.title;
      });

      // Add URLs
      Array.prototype.forEach.call(document.querySelectorAll('[data-url="' + videoId + '"]'), function(el) {
        if (el.tagName === 'A') el.href = properties.url;
      });

      // Add duration
      Array.prototype.forEach.call(document.querySelectorAll('[data-duration="' + videoId + '"]'), function(el) {
        el.innerText = properties.duration;
      });

      // Add inline thumbnails
      Array.prototype.forEach.call(document.querySelectorAll('[data-thumbnail="' + videoId + '"]'), function(el) {
        if (el.tagName === 'IMG') el.src = properties.thumbnail;
      });

      // Apply background image
      var parent = iframe.parentNode;
      iframe.classList.add('invisible');
      parent.style.backgroundImage = 'url(https://img.youtube.com/vi/' + videoId + '/0.jpg)';
      parent.classList.add('bg-cover');
      parent.classList.add('bg-center');
      parent.classList.add('cursor-pointer');

      // Add event listeners
      if (this.options.playInline) {
        parent.addEventListener('click', function() {
          _this.stopAllPlayers();
          _this.startYouTubePlayer(player);
        });
      }

      var onPlayerReady = _this.onPlayerReady.bind(this);
      onPlayerReady(properties);
    },

    /**
     * Starts a given YouTube player.
     * @param player
     */
    startYouTubePlayer: function(player) {
      var iframe = player.getIframe();
      player.playVideo();
      iframe.classList.remove('invisible');
    },

    /**
     * Stops a given YouTube player.
     * @param player
     */
    stopYouTubePlayer: function(player) {
      var iframe = player.getIframe();
      player.stopVideo();
      iframe.classList.add('invisible');
    },

    /**
     * Creates Vimeo players for each YouTube video ID.
     */
    createVimeoPlayers: function() {
      this.vimeoPlayers = this.vimeoIds.map(this.createVimeoPlayer.bind(this));
    },

    /**
     * Creates a player for a given Vimeo video ID.
     * @param videoId
     * @returns {*}
     */
    createVimeoPlayer: function(videoId) {
      var player = new Vimeo.Player(videoId, { id: videoId });
      var onPlayerReady = this.onVimeoPlayerReady.bind(this);
      player.ready().then(function() {
        onPlayerReady(player, videoId);
      });
      return player;
    },

    /**
     * Triggers an event when a Vimeo player is ready.
     * @param player
     * @param videoId
     */
    onVimeoPlayerReady: function(player, videoId) {
      var _this = this;

      fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}?width=480&height=360`)
        .then(function(response) { return response.json(); })
        .then(function(json) {
          var iframe = player.element;

          var properties = {
            player: player,
            title: json.title,
            url: 'https://vimeo.com/' + videoId,
            duration: _this.formatDuration(json.duration),
            thumbnail: json['thumbnail_url'],
            relatedTarget: iframe,
          };

          // Replace parent with iframe
          var parent = iframe.parentNode;
          iframe.className = parent.className;
          parent.parentNode.insertBefore(iframe, parent);
          parent.remove();
          iframe.classList.add('invisible');


          // Add titles
          Array.prototype.forEach.call(document.querySelectorAll('[data-title="' + videoId + '"]'), function(el) {
            el.innerText = properties.title;
          });

          // Add URLs
          Array.prototype.forEach.call(document.querySelectorAll('[data-url="' + videoId + '"]'), function(el) {
            if (el.tagName === 'A') el.href = properties.url;
          });

          // Add duration
          Array.prototype.forEach.call(document.querySelectorAll('[data-duration="' + videoId + '"]'), function(el) {
            el.innerText = properties.duration;
          });

          // Add inline thumbnails
          Array.prototype.forEach.call(document.querySelectorAll('[data-thumbnail="' + videoId + '"]'), function(el) {
            if (el.tagName === 'IMG') el.src = properties.thumbnail;
          });

          // Apply background image
          parent = iframe.parentNode;
          parent.style.backgroundImage = 'url(' + properties.thumbnail + ')';
          parent.classList.add('bg-cover');
          parent.classList.add('bg-center');
          parent.classList.add('cursor-pointer');

          // Add event listeners
          if (_this.options.playInline) {
            parent.addEventListener('click', function() {
              _this.stopAllPlayers();
              _this.startVimeoPlayer(player);
            });
          }

          var onPlayerReady = _this.onPlayerReady.bind(_this);
          onPlayerReady(properties);
        });
    },

    /**
     * Starts a given Vimeo player.
     * @param player
     */
    startVimeoPlayer: function(player) {
      player.play();
      player.element.classList.remove('invisible');
    },

    /**
     * Stops a given Vimeo player.
     * @param player
     */
    stopVimeoPlayer: function(player) {
      player.pause();
      player.element.classList.add('invisible');
    },

    /**
     * Triggers an event when a player is ready.
     * @param properties
     */
    onPlayerReady(properties) {

      // Trigger custom event
      Util.triggerEvent(this.el, Event.PLAYER_READY, properties);

      this.numberPlayersReady ++;
      if (this.numberPlayersReady === this.ids.length) {
        onImagesLoaded().then(this.onPlayersReady.bind(this));
      }
    },

    /**
     * Triggers an event when all players are ready.
     */
    onPlayersReady: function() {
      this.el.classList.remove('hidden');

      // Maybe initialize a carousel
      if (this.options.layout === 'carousel') {
        this.initializeCarousel();
      }

      // Maybe initialize tabs
      if (this.options.layout === 'tabs') {
        this.initializeTabs();
      }

      // Maybe remove the loader
      if (this.options.useLoader) {
        this.loader.remove();
      }

      Util.triggerEvent(this.el, Event.PLAYERS_READY, {
        relatedTarget: this.el,
        players: this.players
      });
    },

    /**
     * Stops all players.
     */
    stopAllPlayers: function() {
      this.youTubePlayers.forEach(this.stopYouTubePlayer.bind(this));
      this.vimeoPlayers.forEach(this.stopVimeoPlayer.bind(this));
    },

    /**
     * Creates a new carousel instance.
     * @see https://swiperjs.com/swiper-api
     */
    initializeCarousel: function() {
      this.el.classList.add('swiper-container', 'swiper-container-' + this.instanceNumber, 'relative', 'overflow-hidden');
      this.swiper = new Swiper('.swiper-container-' + this.instanceNumber, {
        loop: false,
        threshold: 10,
        breakpoints: {
          768: {
            slidesPerView: this.el.getAttribute('data-columns') || 2,
            spaceBetween: 32
          }
        },
        pagination: {
          el: '.swiper-pagination'
        },
        navigation: {
          nextEl: '.swiper-next',
          prevEl: '.swiper-prev',
          disabledClass: 'opacity-0',
          hiddenClass: 'invisible',
        }
      });
      this.swiper.on('slideChange', this.stopAllPlayers.bind(this));
    },

    /**
     * Initializes event listeners on tabs.
     */
    initializeTabs: function() {
      this.el.addEventListener('tab:shown', this.stopAllPlayers.bind(this));
    },

    /**
     * Renders the loading state.
     */
    renderLoader: function() {
      var columns = this.el.getAttribute('data-columns') || 2;
      if (columns < 1) columns = 1;
      if (columns > 3) columns = 3;
      var html;

      switch (this.options.layout) {
        case 'tabs':
          html = (
            '<div class="p-3">' +
              '<div class="row row-flush">' +
                '<div class="md:col-8">' +
                  '<div class="relative w-full ratio ratio-16-9">' +
                    '<div class="skeleton absolute top-0 left-0 w-full h-full"></div>' +
                  '</div>' +
                '</div>' +
                '<div class="md:col">' +
                  '<div class="absolute top-0 bottom-0 w-full h-full md:ml-3">' +
                    '<div class="skeleton absolute top-0 left-0 h-full w-full"></div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>'
          );
          break;
        case 'carousel':
          var listItem = (
            '<li class="mb-6 md:col-' + (12 / columns) + '">' +
              '<div class="relative w-full ratio ratio-16-9">' +
                '<div class="skeleton absolute top-0 left-0 h-full w-full"></div>' +
              '</div>' +
            '</li>'
          );
          html = '<ul class="list-unstyled row">';
          for (var i = 0; i < columns; i++) html += listItem;
          html += '</ul>';
          break;
        default:
          html = this.ids.map(function(id) {
            return (
              '<li class="mb-6 md:col-' + (12 / columns) + '">' +
                '<div class="relative w-full ratio ratio-16-9">' +
                  '<div class="skeleton absolute top-0 left-0 h-full w-full"></div>' +
                '</div>' +
              '</li>'
            );
          }).join('');
          html = '<ul class="list-unstyled row my-6">' + html + '</ul>';
      }

      this.loader = document.createElement('div');
      if (this.options.layout === 'carousel') this.loader.classList.add('flex');
      this.loader.innerHTML = html;
      this.el.parentNode.insertBefore(this.loader, this.el);
    },

    /**
     * Renders the HTML for the Video Library.
     */
    render: function() {
      var templateString = Util.getTemplateString(this.options.template);
      var columns = this.el.getAttribute('data-columns') || 2;
      if (columns < 1) columns = 1;
      if (columns > 3) columns = 3;
      var html;

      if (!templateString) {
        switch (this.options.layout) {
          case 'carousel':
            templateString = '' +
              '<% if (ids.length) { %>' +
                '<ul class="relative z-10 list-unstyled swiper-wrapper flex-no-wrap">' +
                  '<% ids.forEach(function(id, index) { %>' +
                    '<li class="swiper-slide">' +
                      '<% if (playInline) { %>' +
                        '<div class="relative w-full ratio ratio-16-9">' +
                          '<div class="relative z-20" id="<%= id %>"></div>' +
                          '<div class="absolute-center z-10 flex p-4 circle button button-primary">' +
                            '<svg class=" w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
                              '<path d="M78.627,47.203L24.873,16.167c-1.082-0.625-2.227-0.625-3.311,0C20.478,16.793,20,17.948,20,19.199V81.27  c0,1.25,0.478,2.406,1.561,3.031c0.542,0.313,1.051,0.469,1.656,0.469c0.604,0,1.161-0.156,1.703-0.469l53.731-31.035  c1.083-0.625,1.738-1.781,1.738-3.031C80.389,48.984,79.71,47.829,78.627,47.203z"/>' +
                            '</svg>' +
                          '</div>' +
                          '<% if (showDuration) { %>' +
                            '<span class="absolute bottom-0 right-0 top-auto m-4 badge" data-duration="<%= id %>"></span>' +
                          '<% } %>' +
                        '</div>' +
                      '<% } else { %>' +
                        '<a class="relative block w-full ratio ratio-16-9" data-url="<%= id %>" data-fancybox href="#">' +
                          '<div class="relative z-20" id="<%= id %>"></div>' +
                          '<div class="absolute-center z-10 flex p-4 circle button button-primary">' +
                            '<svg class=" w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
                              '<path d="M78.627,47.203L24.873,16.167c-1.082-0.625-2.227-0.625-3.311,0C20.478,16.793,20,17.948,20,19.199V81.27  c0,1.25,0.478,2.406,1.561,3.031c0.542,0.313,1.051,0.469,1.656,0.469c0.604,0,1.161-0.156,1.703-0.469l53.731-31.035  c1.083-0.625,1.738-1.781,1.738-3.031C80.389,48.984,79.71,47.829,78.627,47.203z"/>' +
                            '</svg>' +
                          '</div>' +
                          '<% if (showDuration) { %>' +
                            '<span class="absolute bottom-0 right-0 top-auto m-4 badge" data-duration="<%= id %>"></span>' +
                          '<% } %>' +
                        '</a>' +
                      '<% } %>' +
                      '<% if (showTitle) { %>' +
                        '<h3 class="h4 my-4" data-title="<%= id %>"></h3>' +
                      '<% } %>' +
                    '</li>' +
                  '<% }); %>' +
                '</ul>' +
              '<% } %>' +
              '<div class="absolute z-20 top-0 right-0 h-full flex align-items-center justify-content-center pointer-events-none<% if (showTitle) { %> -mt-6<% } %>">' +
                '<svg class="swiper-next w-6 h-9 p-2 mx-1 border-radius button button-primary fill-current cursor-pointer transition" style="pointer-events: all;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
                  '<path d="M32.792,94.602L32.792,94.602c-0.53,0-1.039-0.211-1.414-0.586l-8.2-8.201c-0.781-0.781-0.781-2.047,0-2.828l32.999-32.999  L23.178,16.989c-0.781-0.781-0.781-2.047,0-2.828l8.2-8.201c0.75-0.75,2.078-0.751,2.828,0l42.616,42.612  c0.487,0.487,0.671,1.163,0.55,1.792c-0.071,0.381-0.255,0.746-0.55,1.041L34.206,94.016C33.831,94.391,33.322,94.602,32.792,94.602  z"/>' +
                '</svg>' +
              '</div>' +
              '<div class="absolute z-20 top-0 left-0 h-full flex align-items-center justify-content-center pointer-events-none<% if (showTitle) { %> -mt-6<% } %>">' +
                '<svg class="swiper-prev w-6 h-9 p-2 mx-1 border-radius button button-primary fill-current cursor-pointer transition" style="pointer-events: all;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
                  '<path d="M67.208,94.614c-0.53,0-1.039-0.21-1.414-0.586L23.178,51.416c-0.487-0.487-0.671-1.163-0.55-1.792  c0.071-0.381,0.255-0.746,0.55-1.041L65.794,5.972c0.375-0.375,0.884-0.586,1.414-0.586l0,0c0.53,0,1.039,0.211,1.414,0.586  l8.2,8.201c0.781,0.781,0.781,2.047,0,2.828L43.823,50l32.999,32.999c0.781,0.781,0.781,2.047,0,2.828l-8.2,8.201  C68.247,94.403,67.738,94.614,67.208,94.614z"/>' +
                '</svg>' +
              '</div>';
            break;
          case 'tabs':
            templateString = '' +
              '<% if (ids.length) { %>' +
                '<div class="bg-gray-100 p-3">' +
                  '<div class="row row-flush">' +
                    '<div class="md:col-8">' +
                      '<ul class="tabs list-unstyled mb-0">' +
                        '<% ids.forEach(function(id, index) { %>' +
                          '<li class="tab content fade<% if (index === 0) { %> is-active is-shown<% } %>" id="video-<%= id %>" role="tab-panel">' +
                            '<% if (playInline) { %>' +
                              '<div class="relative w-full ratio ratio-16-9">' +
                                '<div class="relative z-20" id="<%= id %>"></div>' +
                                '<div class="absolute-center z-10 flex p-4 circle button button-primary">' +
                                  '<svg class=" w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">' +
                                    '<path d="M78.627,47.203L24.873,16.167c-1.082-0.625-2.227-0.625-3.311,0C20.478,16.793,20,17.948,20,19.199V81.27  c0,1.25,0.478,2.406,1.561,3.031c0.542,0.313,1.051,0.469,1.656,0.469c0.604,0,1.161-0.156,1.703-0.469l53.731-31.035  c1.083-0.625,1.738-1.781,1.738-3.031C80.389,48.984,79.71,47.829,78.627,47.203z"/>' +
                                  '</svg>' +
                                '</div>' +
                              '</div>' +
                            '<% } else { %>' +
                              '<a class="relative block w-full ratio ratio-16-9" data-url="<%= id %>" data-fancybox href="#">' +
                                '<div class="relative z-20" id="<%= id %>"></div>' +
                                '<div class="absolute-center z-10 flex p-4 circle button button-primary">' +
                                  '<svg class=" w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">' +
                                    '<path d="M78.627,47.203L24.873,16.167c-1.082-0.625-2.227-0.625-3.311,0C20.478,16.793,20,17.948,20,19.199V81.27  c0,1.25,0.478,2.406,1.561,3.031c0.542,0.313,1.051,0.469,1.656,0.469c0.604,0,1.161-0.156,1.703-0.469l53.731-31.035  c1.083-0.625,1.738-1.781,1.738-3.031C80.389,48.984,79.71,47.829,78.627,47.203z"/>' +
                                  '</svg>' +
                                '</div>' +
                              '</a>' +
                            '<% } %>' +
                          '</li>' +
                        '<% }); %>' +
                      '</ul>' +
                    '</div>' +
                    '<div class="md:col overflow-y-scroll">' +
                      '<div class="relative md:ml-3">' +
                        '<div class="md:absolute h-full w-full">' +
                          '<nav class="nav flex-column mt-6 md:my-0">' +
                            '<% ids.forEach(function(id, index) { %>' +
                              '<a class="nav-link flex text-inherit border border-radius border-transparent transition<% if (index === 0) { %> text-primary border-primary bg-white is-active is-shown<% } %>" data-active-class="text-primary border-primary bg-white" href="#video-<%= id %>" data-toggle="tab" role="tab" aria-expanded="<% if (index === 0) { %>true<% } else { %>false<% } %>">' +
                                '<div class="relative align-self-center h-8 w-8 overflow-hidden <% if (!showTitle && !showDuration) { %>mx-auto<% } else { %>mr-3<% } %>">' +
                                  '<img class="absolute-center" data-thumbnail="<%= id %>" alt="Video thumbnail">' +
                                '</div>' +
                                '<% if (showTitle || showDuration) { %>' +
                                  '<div class="relative media-body">' +
                                    '<% if (showTitle) { %>' +
                                      '<h5 class="my-1 text-inherit" data-title="<%= id %>"></h5>' +
                                    '<% } %>' +
                                    '<% if (showDuration) { %>' +
                                      '<span class="badge" data-duration="<%= id %>"></span>' +
                                    '<% } %>' +
                                  '</div>' +
                                '<% } %>' +
                              '</a>' +
                            '<% }); %>' +
                          '</nav>' +
                        '</div>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '<% } %>';
            break;
          default:
            templateString = '' +
              '<% if (ids.length) { %>' +
                '<ul class="list-unstyled row">' +
                  '<% ids.forEach(function(id, index) { %>' +
                    '<li class="mb-6 md:col-' + (12 / columns) + '">' +
                      '<div class="relative w-full ratio ratio-16-9">' +
                        '<% if (playInline) { %>' +
                          '<div class="relative w-full ratio ratio-16-9">' +
                            '<div class="relative z-20" id="<%= id %>"></div>' +
                            '<div class="absolute-center z-10 flex p-4 circle button button-primary">' +
                              '<svg class=" w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">' +
                                '<path d="M78.627,47.203L24.873,16.167c-1.082-0.625-2.227-0.625-3.311,0C20.478,16.793,20,17.948,20,19.199V81.27  c0,1.25,0.478,2.406,1.561,3.031c0.542,0.313,1.051,0.469,1.656,0.469c0.604,0,1.161-0.156,1.703-0.469l53.731-31.035  c1.083-0.625,1.738-1.781,1.738-3.031C80.389,48.984,79.71,47.829,78.627,47.203z"/>' +
                              '</svg>' +
                            '</div>' +
                          '</div>' +
                        '<% } else { %>' +
                          '<a class="relative block w-full ratio ratio-16-9" data-url="<%= id %>" data-fancybox href="#">' +
                            '<div class="relative z-20" id="<%= id %>"></div>' +
                            '<div class="absolute-center z-10 flex p-4 circle button button-primary">' +
                              '<svg class=" w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">' +
                                '<path d="M78.627,47.203L24.873,16.167c-1.082-0.625-2.227-0.625-3.311,0C20.478,16.793,20,17.948,20,19.199V81.27  c0,1.25,0.478,2.406,1.561,3.031c0.542,0.313,1.051,0.469,1.656,0.469c0.604,0,1.161-0.156,1.703-0.469l53.731-31.035  c1.083-0.625,1.738-1.781,1.738-3.031C80.389,48.984,79.71,47.829,78.627,47.203z"/>' +
                              '</svg>' +
                            '</div>' +
                          '</a>' +
                        '<% } %>' +
                        '<% if (showDuration) { %>' +
                          '<span class="absolute bottom-0 right-0 top-auto m-4 badge" data-duration="<%= id %>"></span>' +
                        '<% } %>' +
                      '</div>' +
                      '<% if (showTitle) { %>' +
                        '<h3 class="h4 my-4" data-title="<%= id %>"></h3>' +
                      '<% } %>' +
                    '</li>' +
                  '<% }); %>' +
                '</ul>' +
              '<% } %>';
        }
      }

      var compiled = Util.template(templateString);
      var data = {
        ids: this.ids,
        columns: columns,
        showTitle: this.options.showTitle,
        showDuration: this.options.showDuration,
        playInline: this.options.playInline,
      };

      if (this.options.templateData) {
        data = Util.extend(data, this.options.templateData);
      }

      html = compiled(data).replace(/(^\s+|\s+$)/g, '');
      if (html) this.el.innerHTML = html;

      Util.triggerEvent(this.el, Event.RENDER, {
        relatedTarget: this.el
      });
    }

  });

  window.addEventListener('load', function() {
    each('[data-element="video-library"]', function(el) {
      new VideoLibrary(el);
    });
  });
})();