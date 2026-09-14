// Retry logic for offline.html. Lives in its own file because the page is
// served under the app's CSP, which allows no inline scripts.
(function (window) {
  var document = window.document;
  var button = document.getElementById('offline-retry');
  var status = document.getElementById('offline-status');
  var checking = false;

  function retry() {
    if (checking) return;
    checking = true;
    button.disabled = true;
    status.textContent = 'Verbindung wird geprüft…';
    window.fetch('/', { method: 'HEAD', cache: 'no-store' })
      .then(function (response) {
        if (response.ok) { window.location.replace('/'); return; }
        throw new Error('unreachable');
      })
      .catch(function () {
        status.textContent = 'Immer noch keine Verbindung.';
        checking = false;
        button.disabled = false;
      });
  }

  button.addEventListener('click', retry);
  window.addEventListener('online', retry);
})(window);
