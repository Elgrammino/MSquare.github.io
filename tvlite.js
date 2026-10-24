/*
 * TV Lite — плагин Lampa: без рекламы перед фильмом.
 *
 * 1. Убирает рекламный ролик, который источник (например, Showy) передаёт
 *    вместе с фильмом — Lampa показывает его как «рекламу от плагина».
 * 2. Не даёт Lampa загрузить список рекламных роликов CUB.
 *
 * Выключается в Настройки → Плеер → «TV Lite: без рекламы».
 */
(function () {
  'use strict';

  if (window.tvlite_loaded) return;
  window.tvlite_loaded = true;

  var AD_LIST = /\/api\/ad\/get\//;
  var VAST_FIELDS = ['vast_url', 'vast_msg', 'vast_region', 'vast_platform', 'vast_screen'];

  function log() {
    var args = Array.prototype.slice.call(arguments);
    console.log.apply(console, ['TVLite'].concat(args));
  }

  function noAds() {
    var value = Lampa.Storage.get('tvlite_noads', true);
    return value !== false && value !== 'false';
  }

  // Список роликов CUB Lampa запрашивает при старте и раз в час. Плагины грузятся
  // раньше рекламного модуля, поэтому перехват ставится сразу, а не по app:ready.
  function blockAdList() {
    var open = XMLHttpRequest.prototype.open;
    var send = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this.tvlite_blocked = noAds() && AD_LIST.test(String(url));
      if (this.tvlite_blocked) log('ad list blocked', url);
      return open.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
      if (!this.tvlite_blocked) return send.apply(this, arguments);

      // для Lampa это выглядит как недоступный сервер: она переберёт зеркала и останется без роликов
      var xhr = this;
      setTimeout(function () {
        if (typeof xhr.onerror === 'function') xhr.onerror();
      }, 0);
    };
  }

  // Ролик, который источник передал вместе с фильмом
  function stripVast(data) {
    if (!data) return;
    VAST_FIELDS.forEach(function (field) {
      if (field in data) {
        delete data[field];
        if (field === 'vast_url') log('plugin ad removed');
      }
    });
  }

  function followPlayerCreate() {
    Lampa.Player.listener.follow('create', function (e) {
      if (!noAds() || !e || !e.data) return;
      stripVast(e.data);
      if (Array.isArray(e.data.playlist)) e.data.playlist.forEach(stripVast);
    });
  }

  function addSetting() {
    if (!Lampa.SettingsApi) return;

    Lampa.SettingsApi.addParam({
      component: 'player',
      param: { name: 'tvlite_noads', type: 'trigger', 'default': true },
      field: {
        name: 'TV Lite: без рекламы',
        description: 'Убирает рекламный ролик перед фильмом.'
      }
    });
  }

  function start() {
    addSetting();
    followPlayerCreate();
    log('ready');
  }

  blockAdList();

  if (window.appready) start();
  else {
    Lampa.Listener.follow('app', function (e) {
      if (e.type == 'ready') start();
    });
  }
})();
