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

  // ---------- 3. Настройки по умолчанию ----------

  function setDefaults() {
    if (Lampa.Storage.get('tvlite_defaults', '') === '1') return;

    Lampa.Storage.set('pages_save_total', '2');
    Lampa.Storage.set('tvlite_defaults', '1');
    log('defaults applied');
  }

  function start() {
    addSetting();
    setDefaults();
    applyWake();
    followExternal();
    closeIdleInstance();
    log('ready');
  }

  if (window.appready) start();
  else {
    Lampa.Listener.follow('app', function (e) {
      if (e.type == 'ready') start();
    });
  }
})();
