import { createElement } from '../utils/dom.js';
import { AuthApi } from '../api/auth.api.js';
import { authStore } from '../store/auth.store.js';
import { appStore } from '../store/app.store.js';
import { deviceLabel } from '../utils/deviceLabel.js';
import { PageHeading } from '../components/pageHeading.js';

// "vor 2 Min." for a fresh code, otherwise the clock time.
export function formatCreated(timestamp, now = Date.now()) {
  const minutes = Math.floor((now - timestamp) / 60_000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  return `um ${new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp))} Uhr`;
}

// "Fernseher verbinden" on the phone: the code the TV shows (or the QR code
// leads here with it), which device waits, and the confirmation.
export default function ConnectPage() {
  const initial = new URLSearchParams(window.location.hash.split('?')[1] || '').get('code') || '';
  const user = authStore.getState().user;
  const name = user?.name || user?.Name || 'dir';

  const input = createElement('input', {
    type: 'text',
    inputmode: 'numeric',
    autocomplete: 'one-time-code',
    maxlength: '7',
    className: 'connect-code-input',
    placeholder: '123 456',
    'aria-label': 'Code vom Fernseher',
    value: initial ? `${initial.slice(0, 3)} ${initial.slice(3)}` : '',
    'data-autofocus': !initial
  });
  const result = createElement('div', { className: 'connect-result', role: 'status' });
  const code = () => input.value.replace(/\D/g, '');

  const showConfirm = (info) => {
    const created = Number(info?.createdAt);
    result.replaceChildren(
      createElement('p', { className: 'connect-question' }, `Fernseher anmelden als ${name}?`),
      createElement('p', { className: 'connect-device' }, deviceLabel(info.userAgent)),
      Number.isFinite(created) && created > 0
        ? createElement('p', { className: 'connect-device connect-created' }, `Code erstellt ${formatCreated(created)}`)
        : null,
      info?.sameNetwork === false
        ? createElement('p', { className: 'connect-error connect-warning', role: 'alert' }, 'Dieser Fernseher ist nicht in deinem Netzwerk. Bestätige nur, wenn du ihn vor dir hast.')
        : null,
      createElement('div', { className: 'connect-actions' },
        createElement('button', {
          type: 'button',
          className: 'btn-primary',
          onClick: async (event) => {
            // currentTarget is gone once the await returns.
            const confirmButton = event.currentTarget;
            confirmButton.disabled = true;
            try {
              await AuthApi.confirmPairing(code());
              result.replaceChildren(createElement('p', { className: 'connect-done' }, 'Erledigt. Der Fernseher meldet sich jetzt an.'));
            } catch (error) {
              appStore.showToast(error.message || 'Bestätigung fehlgeschlagen', 'error');
              confirmButton.disabled = false;
            }
          }
        }, 'Ja, anmelden'),
        createElement('button', { type: 'button', className: 'btn-secondary', onClick: () => result.replaceChildren() }, 'Abbrechen')
      )
    );
  };

  const lookup = async () => {
    if (code().length !== 6) {
      result.replaceChildren(createElement('p', { className: 'connect-error' }, 'Der Code hat sechs Ziffern.'));
      return;
    }
    try {
      showConfirm(await AuthApi.pairingInfo(code()));
    } catch (error) {
      result.replaceChildren(createElement('p', { className: 'connect-error' }, error.message || 'Der Code ist falsch oder abgelaufen.'));
    }
  };

  const form = createElement('form', {
    className: 'connect-form',
    onSubmit: (event) => {
      event.preventDefault();
      lookup();
    }
  }, input, createElement('button', { type: 'submit', className: 'btn-primary' }, 'Weiter'));

  const container = createElement('div', { className: 'page-container content-section connect-page' },
    PageHeading({ title: 'Fernseher verbinden', subtitle: 'Gib den Code ein, den VANTA auf dem Fernseher zeigt.' }),
    form,
    result
  );
  if (initial) lookup();
  return container;
}
