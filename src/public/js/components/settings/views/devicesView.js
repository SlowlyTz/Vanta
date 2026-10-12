import { createElement } from '../../../utils/dom.js';
import { SessionsApi } from '../../../api/sessions.api.js';
import { appStore } from '../../../store/app.store.js';
import { deviceLabel } from '../../../utils/deviceLabel.js';
import { settingsCard, settingsNote } from '../controls.js';

const formatDate = (timestamp) => (timestamp
  ? new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(timestamp))
  : null);

// "Geräte": where the account is signed in; other devices can be signed out.
// `extraCards` adds e.g. "Fernseher verbinden".
export function createDevicesView({ onStatus = () => {}, extraCards = () => [] } = {}) {
  const element = createElement('div', { className: 'settings-view' });
  let sessions = null;

  const render = () => {
    const rows = (sessions || []).map(session => createElement('div', { className: 'settings-device-row' },
      createElement('span', { className: 'settings-control-text' },
        createElement('span', { className: 'settings-control-label' }, deviceLabel(session.userAgent)),
        createElement('span', { className: 'settings-control-description' },
          [session.current ? 'Dieses Gerät' : null, session.loginAt ? `angemeldet am ${formatDate(session.loginAt)}` : null].filter(Boolean).join(' · ') || 'Anmeldung von früher')
      ),
      session.current ? null : createElement('button', {
        type: 'button',
        className: 'settings-inline-button is-danger',
        onClick: async (event) => {
          event.currentTarget.disabled = true;
          try {
            await SessionsApi.end(session.id);
            appStore.showToast('Gerät abgemeldet', 'success');
          } catch (error) {
            appStore.showToast(error.message || 'Gerät konnte nicht abgemeldet werden', 'error');
          }
          refresh();
        }
      }, 'Abmelden')
    ));
    const others = (sessions || []).filter(session => !session.current).length;
    const endOthers = others > 0 ? createElement('div', { className: 'settings-card-actions' }, createElement('button', {
      type: 'button',
      className: 'settings-inline-button is-danger',
      onClick: async (event) => {
        event.currentTarget.disabled = true;
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
