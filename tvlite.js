/*
 * TV Lite — плагин Lampa для слабых телевизоров (1 ГБ ОЗУ).
 *
 * 1. «Сон» во время внешнего плеера. Когда Lampa отдаёт фильм в MX Player,
 *    плагин запоминает открытую карточку и заменяет страницу Lampa крошечной
 *    заглушкой — почти вся память Lampa освобождается и система не выгружает
 *    приложение. При возврате из плеера заглушка принимает позицию просмотра
 *    от приложения и загружает Lampa обратно на ту же карточку, а плагин
 *    записывает позицию в историю.
 *    Выключается в Настройки → Плеер → «TV Lite: сон во время MX Player».
 * 2. Закрывает пустой второй экземпляр Lampa, если приложение его создало.
 * 3. Разово ставит «Сохранять страниц: 2» вместо 5.
 * 4. Без рекламы перед фильмом: убирает рекламный ролик, который источник
 *    (например, Showy) передаёт вместе с фильмом, и не даёт Lampa загрузить
 *    список рекламных роликов CUB. Выключается в Настройки → Плеер → «TV Lite: без рекламы».
 */
(function () {
  'use strict';

  if (window.tvlite_loaded) return;
  window.tvlite_loaded = true;

  var WAKE_KEY = 'tvlite:';

  function log() {
    var args = Array.prototype.slice.call(arguments);
    console.log.apply(console, ['TVLite'].concat(args));
  }

  // ---------- 1. Сон во время внешнего плеера ----------

  // Адрес, по которому Lampa сама откроет текущую карточку после загрузки
  function backUrl() {
    var active = Lampa.Activity.active() || {};
    var card = active.card || active.movie;
    var base = location.protocol + '//' + location.host + location.pathname;

    if (card && card.id) {
      var media = active.method || (card.name || card.original_name ? 'tv' : 'movie');
      return base + '?card=' + encodeURIComponent(card.id) +
        '&media=' + encodeURIComponent(media) +
        '&source=' + encodeURIComponent(card.source || active.source || 'tmdb');
    }

    return location.href.split('#')[0];
  }

  // Заглушка: ждёт возврата из плеера и загружает Lampa обратно
  function stubPage(back) {
    var script = function (back) {
      var timelines = [];
      var woke = false;
      var timer;
      var born = Date.now();

      // первые секунды страница сама получает фокус и видимость — это ещё не возврат из плеера
      function settled() {
        return Date.now() - born > 5000;
      }

      function wake() {
        if (woke) return;
        woke = true;
        // window.name переживает переход между страницами — через него отдаём позиции Lampa
        window.name = 'tvlite:' + JSON.stringify(timelines);
        location.replace(back);
      }

      function later() {
        clearTimeout(timer);
        timer = setTimeout(wake, 700);
      }

      // Приложение Lampa при возврате из плеера вызывает Lampa.Timeline.update(...)
      var noop = function () {};
      var api = {
        Timeline: {
          update: function (p) {
            try {
              timelines.push(typeof p === 'string' ? JSON.parse(p) : p);
            } catch (e) {}
            later();
          }
        }
      };
      var deep = function () {
        return typeof Proxy === 'function' ? new Proxy(noop, { get: function () { return deep(); } }) : noop;
      };
      window.Lampa = typeof Proxy === 'function'
        ? new Proxy(api, { get: function (t, k) { return k in t ? t[k] : deep(); } })
        : api;

      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && settled()) later();
      });
      document.addEventListener('keydown', wake);
      window.addEventListener('focus', function () {
        if (settled()) later();
      });

      // Если в фоне таймеры стояли — после возврата будет разрыв во времени
      var last = Date.now();
      setInterval(function () {
        var now = Date.now();
        if (now - last > 4000 && settled()) later();
        last = now;
      }, 1000);
    };

    return 'data:text/html;charset=utf-8,' + encodeURIComponent(
      '<!doctype html><html><head><meta charset="utf-8"><title>Lampa</title></head>' +
      '<body style="margin:0;background:#000;color:#666;font:28px sans-serif;' +
      'display:flex;align-items:center;justify-content:center;height:100vh">' +
      'Lampa спит, пока играет плеер. Нажмите любую кнопку, чтобы вернуться.' +
      '<script>(' + script.toString() + ')(' + JSON.stringify(back) + ')</script>' +
      '</body></html>'
    );
  }

  function sleep() {
    var back = backUrl();
    log('sleep, back to', back);
    location.href = stubPage(back);
  }

  // После возврата: записать позицию просмотра, переданную приложением
  function applyWake() {
    if (String(window.name).indexOf(WAKE_KEY) !== 0) return;

    var raw = String(window.name).slice(WAKE_KEY.length);
    window.name = '';

    var timelines = [];
    try {
      timelines = JSON.parse(raw) || [];
    } catch (e) {}

    timelines.forEach(function (t) {
      if (t && t.hash) Lampa.Timeline.update(t);
    });
    log('woke, timelines applied', timelines.length);
  }

  function followExternal() {
    Lampa.Player.listener.follow('external', function () {
      if (!Lampa.Storage.field('tvlite_sleep')) return;

      var started = Date.now();
      setTimeout(function () {
        // таймер сработал с большим опозданием — значит, Lampa уже вернулась на экран
        if (Date.now() - started > 3000) return;
        sleep();
      }, 400);
    });
  }

  function addSetting() {
    if (!Lampa.SettingsApi) return;

    Lampa.SettingsApi.addParam({
      component: 'player',
      param: { name: 'tvlite_sleep', type: 'trigger', 'default': true },
      field: {
        name: 'TV Lite: сон во время MX Player',
        description: 'Освобождает память, пока играет внешний плеер. После возврата Lampa перезагрузится на той же карточке.'
      }
    });
  }

  // ---------- 2. Пустой второй экземпляр ----------

  function closeIdleInstance() {
    setTimeout(function () {
      if (Lampa.Activity.all().length === 0) {
        log('idle instance, closing');
        location.href = 'about:blank';
      }
    }, 20000);
  }

  // ---------- 4. Без рекламы ----------

  var AD_LIST = /\/api\/ad\/get\//;
  var VAST_FIELDS = ['vast_url', 'vast_msg', 'vast_region', 'vast_platform', 'vast_screen'];

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

  // Ролик, который источник передал вместе с фильмом, Lampa показывает как «рекламу от плагина»
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

  function addNoAdsSetting() {
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

  // ---------- 3. Настройки по умолчанию ----------

  function setDefaults() {
    if (Lampa.Storage.get('tvlite_defaults', '') === '1') return;

    Lampa.Storage.set('pages_save_total', '2');
    Lampa.Storage.set('tvlite_defaults', '1');
    log('defaults applied');
  }

  function start() {
    addSetting();
    addNoAdsSetting();
    setDefaults();
    applyWake();
    followExternal();
    followPlayerCreate();
    closeIdleInstance();
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
