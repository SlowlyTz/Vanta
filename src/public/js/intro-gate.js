// Classic script, loaded synchronously in <head> so it runs before the body
// is parsed: it decides whether the opening scene plays and hides the cover
// before first paint when it does not. Kept free of imports on purpose; the
// scene itself (with three.js) is only fetched when it actually plays.
(function (window) {
  var STORAGE_KEY = 'vanta.intro.lastPlayedAt';
  var MIN_INTERVAL_MS = 10 * 60 * 1000;
  var WATCHDOG_MS = 12000;
  var SKIPPED_ROUTES = ['#/player/', '#/watch-party/'];

  function shouldPlay(input) {
    var hash = input.hash || '';
    for (var i = 0; i < SKIPPED_ROUTES.length; i++) {
      if (hash.indexOf(SKIPPED_ROUTES[i]) === 0) return false;
    }
    var last = Number(input.lastPlayedAt);
    if (!isFinite(last) || last <= 0) return true;
    return input.now - last >= MIN_INTERVAL_MS;
  }

  function readLastPlayed() {
    try { return window.localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function markPlayed(now) {
    try { window.localStorage.setItem(STORAGE_KEY, String(now)); } catch (e) { /* private mode */ }
  }

  var gate = {
    STORAGE_KEY: STORAGE_KEY,
    MIN_INTERVAL_MS: MIN_INTERVAL_MS,
    shouldPlay: shouldPlay,
    load: function () { return import('/vendor/intro/vanta-intro.js'); },
    start: function (loading) {
      var overlay = window.document.getElementById('intro');
      if (!overlay) return Promise.resolve();
      var finished = false;
      var finish = function () {
        if (finished) return;
        finished = true;
        overlay.remove();
      };
      var watchdog = window.setTimeout(finish, WATCHDOG_MS);
      return (loading || gate.load())
        .then(function (mod) { return mod.playIntro(overlay); })
        .catch(function (error) { if (window.console) console.warn('[Intro] skipped:', error && error.message); })
        .then(function () { window.clearTimeout(watchdog); finish(); });
    }
  };
  window.VantaIntroGate = gate;

  var now = Date.now();
  if (!shouldPlay({ now: now, lastPlayedAt: readLastPlayed(), hash: window.location.hash })) {
    window.document.documentElement.classList.add('intro-off');
    return;
  }
  markPlayed(now);
  // Fetch the scene and warm the logo while the document is still parsing.
  var loading = gate.load();
  loading.catch(function () {});
  new window.Image().src = '/assets/logo2.png';
  window.document.addEventListener('DOMContentLoaded', function () { gate.start(loading); });
})(window);
