import { createElement } from '../../../utils/dom.js';
import { SessionsApi } from '../../../api/sessions.api.js';
import { appStore } from '../../../store/app.store.js';
import { confirmDialog } from '../../confirmDialog.js';
import { deviceLabel } from '../../../shared/deviceLabel.js';
import { settingsCard, settingsNote } from '../controls.js';

const formatDate = (timestamp) => (timestamp
  ? new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(timestamp))
  : null);

// Other devices shown before "N weitere anzeigen".
const VISIBLE_OTHERS = 5;

const lastActivity = session => session.lastSeenAt || session.loginAt || 0;

// This device first, then the others by their last activity, newest first.
export function orderSessions(sessions) {
  const current = sessions.filter(session => session.current);
  const others = sessions.filter(session => !session.current).sort((a, b) => lastActivity(b) - lastActivity(a));
  return { current, others };
}

// "Geräte": where the account is signed in; other devices can be signed out.
// `extraCards` adds e.g. "Fernseher verbinden".
export function createDevicesView({ onStatus = () => {}, extraCards = () => [] } = {}) {
  const element = createElement('div', { className: 'settings-view' });
  let sessions = null;

  let showAll = false;

  const describe = session => [
    session.current ? 'Dieses Gerät' : null,
    session.loginAt ? `angemeldet am ${formatDate(session.loginAt)}` : null,
    !session.current && session.lastSeenAt ? `zuletzt aktiv am ${formatDate(session.lastSeenAt)}` : null
  ].filter(Boolean).join(' · ') || 'Anmeldung von früher';

  const deviceRow = session => createElement('div', { className: 'settings-device-row' },
    createElement('span', { className: 'settings-control-text' },
      createElement('span', { className: 'settings-control-label' }, deviceLabel(session.userAgent)),
      createElement('span', { className: 'settings-control-description' }, describe(session))
    ),
    session.current ? null : createElement('button', {
      type: 'button',
      className: 'settings-inline-button is-danger',
      onClick: async (event) => {
        const button = event.currentTarget;
        const confirmed = await confirmDialog({
          title: 'Gerät abmelden?',
          message: `${deviceLabel(session.userAgent)} wird abgemeldet und muss sich neu anmelden.`,
          confirmLabel: 'Abmelden',
          cancelLabel: 'Abbrechen',
          focusCancel: true
        });
        if (!confirmed) return;
        button.disabled = true;
        try {
          await SessionsApi.end(session.id);
          appStore.showToast('Gerät abgemeldet', 'success');
        } catch (error) {
          appStore.showToast(error.message || 'Gerät konnte nicht abgemeldet werden', 'error');
        }
        refresh();
      }
    }, 'Abmelden')
  );

  const render = () => {
    const { current, others } = orderSessions(sessions || []);
    const visibleOthers = showAll ? others : others.slice(0, VISIBLE_OTHERS);
    const rows = [...current, ...visibleOthers].map(deviceRow);
    const showMore = others.length > visibleOthers.length ? createElement('button', {
      type: 'button',
      className: 'settings-inline-button settings-devices-more',
      onClick: () => {
        showAll = true;
        render();
        element.querySelectorAll('.settings-device-row')[current.length + VISIBLE_OTHERS]?.querySelector('button')?.focus();
      }
    }, `${others.length - visibleOthers.length} weitere anzeigen`) : null;
    const endOthers = others.length > 0 ? createElement('div', { className: 'settings-card-actions' }, showMore, createElement('button', {
      type: 'button',
      className: 'settings-inline-button is-danger',
      onClick: async (event) => {
        const button = event.currentTarget;
        const confirmed = await confirmDialog({
          title: 'Alle anderen Geräte abmelden?',
          message: others.length === 1
            ? 'Das andere Gerät wird abgemeldet. Dieses Gerät bleibt angemeldet.'
            : `${others.length} Geräte werden abgemeldet. Dieses Gerät bleibt angemeldet.`,
          confirmLabel: 'Abmelden',
          cancelLabel: 'Abbrechen',
          focusCancel: true
        });
        if (!confirmed) return;
        button.disabled = true;
        try {
          const { ended } = await SessionsApi.endOthers();
          appStore.showToast(ended === 1 ? '1 Gerät abgemeldet' : `${ended} Geräte abgemeldet`, 'success');
        } catch (error) {
          appStore.showToast(error.message || 'Geräte konnten nicht abgemeldet werden', 'error');
        }
        refresh();
      }
    }, 'Alle anderen abmelden')) : null;
    element.replaceChildren(
      settingsCard('Fernseher',
        createElement('div', { className: 'settings-control-row' },
          createElement('span', { className: 'settings-control-text' },
            createElement('span', { className: 'settings-control-label' }, 'Fernseher verbinden'),
            createElement('span', { className: 'settings-control-description' }, 'Den Code eingeben, den VANTA auf dem Fernseher zeigt.')
          ),
          createElement('a', { className: 'settings-inline-button', href: '#/connect' }, 'Code eingeben')
        )
      ),
      ...extraCards(),
      settingsCard('Angemeldete Geräte', ...(sessions === null ? [settingsNote('Wird geladen …')] : rows), endOthers)
    );
  };

  const refresh = async () => {
    render();
    try {
      ({ sessions } = await SessionsApi.list());
    } catch {
      sessions = [];
    }
    onStatus(sessions.length === 1 ? '1 Gerät' : `${sessions.length} Geräte`);
    render();
  };

  return { element, refresh };
}
