import { createElement } from '../../../utils/dom.js';
import { NotificationsApi } from '../../../api/notifications.api.js';
import { appStore } from '../../../store/app.store.js';
import { NOTIFICATION_KINDS } from '../../../shared/notificationKinds.js';
import { disablePush, enablePush, isLocalPush, pushSupport, showLocalNotification, syncPushSubscription } from '../../../utils/pushSubscription.js';
import { settingsCard, settingsNote, switchRow } from '../controls.js';

const SUPPORT_TEXT = {
  denied: 'Der Browser blockiert Benachrichtigungen für VANTA. Erlaube sie in den Website-Einstellungen des Browsers und versuche es dann erneut.',
  unsupported: 'Dieser Browser kann keine Push-Benachrichtigungen empfangen. Die Liste unter der Glocke funktioniert trotzdem.',
  'ios-install': 'Auf iPhone und iPad gibt es Push nur für die installierte App: Teilen → „Zum Home-Bildschirm“, dann VANTA von dort öffnen (ab iOS 16.4).',
};

// A browser without a push service (Helium, ungoogled Chromium) gets them
// from the open app.
const LOCAL_TEXT = 'Dieser Browser hat keinen Push-Dienst. Benachrichtigungen erscheinen hier als Systemmeldung, solange VANTA in einem Tab offen ist (auch im Hintergrund).';

// "Benachrichtigungen": push on this device, and per kind push and the list
// under the bell. `onStatus` gets "An"/"Aus" for the row in the hub.
export function createNotificationsView({ onStatus = () => {} } = {}) {
  const element = createElement('div', { className: 'settings-view' });
  let prefs = null;
  let deviceOn = false;
  // On without a push service: notifications from the open app.
  let local = false;

  const save = async (patch) => {
    try {
      prefs = await NotificationsApi.savePreferences(patch);
    } catch (error) {
      appStore.showToast(error.message || 'Einstellung konnte nicht gespeichert werden', 'error');
      render();
    }
  };

  const render = () => {
    const support = pushSupport();
    const deviceSwitch = switchRow({
      label: 'Push auf diesem Gerät',
      description: local ? 'Als Systemmeldung, solange VANTA offen ist.' : deviceOn ? 'Dieses Gerät bekommt Benachrichtigungen, auch wenn VANTA zu ist.' : 'Benachrichtigungen auch bei geschlossener App.',
      checked: deviceOn,
      disabled: support !== 'ready' && !deviceOn,
      onChange: async (checked, input) => {
        input.disabled = true;
        try {
          if (checked) {
            const result = await enablePush();
            local = result === 'local';
            deviceOn = result === 'on' || local;
            if (!deviceOn) appStore.showToast(SUPPORT_TEXT[result] || 'Push konnte nicht eingeschaltet werden', 'error');
          } else {
            await disablePush();
            deviceOn = false;
            local = false;
          }
        } catch (error) {
          deviceOn = false;
          local = false;
          appStore.showToast(error.message || 'Push konnte nicht eingeschaltet werden', 'error');
        }
        onStatus(deviceOn ? 'An' : 'Aus');
        render();
      }
    });

    const testButton = createElement('button', {
      type: 'button',
      className: 'settings-inline-button',
      disabled: !deviceOn,
      onClick: async () => {
        try {
          if (local) await showLocalNotification({ title: 'VANTA', body: 'Benachrichtigungen funktionieren auf diesem Gerät.', tag: 'test' });
          else await NotificationsApi.sendTest();
          appStore.showToast('Testbenachrichtigung gesendet', 'success');
        } catch (error) {
          appStore.showToast(error.message || 'Testbenachrichtigung fehlgeschlagen', 'error');
        }
      }
    }, 'Testbenachrichtigung senden');

    const kindRows = (prefs?.kinds || []).map(entry => {
      const meta = NOTIFICATION_KINDS.find(kind => kind.kind === entry.kind);
      const kindLabel = meta?.label || entry.kind;
      const pushSwitch = switchRow({ label: 'Push', checked: entry.push, onChange: value => save({ kinds: [{ kind: entry.kind, push: value }] }) });
      const listSwitch = switchRow({ label: 'Liste', checked: entry.inApp, onChange: value => save({ kinds: [{ kind: entry.kind, inApp: value }] }) });
      // "Push" alone does not say which kind a screen reader is on.
      pushSwitch.input.setAttribute('aria-label', `${kindLabel}: Push`);
      listSwitch.input.setAttribute('aria-label', `${kindLabel}: Liste`);
      return createElement('div', { className: 'settings-kind-row' },
        createElement('span', { className: 'settings-control-text' },
          createElement('span', { className: 'settings-control-label' }, kindLabel),
          createElement('span', { className: 'settings-control-description' }, meta?.description || '')
        ),
        createElement('div', { className: 'settings-kind-switches' },
          pushSwitch.element,
          listSwitch.element
        )
      );
    });

    element.replaceChildren(
      settingsCard('Dieses Gerät',
        deviceSwitch.element,
        SUPPORT_TEXT[support] && !deviceOn ? settingsNote(SUPPORT_TEXT[support], { tone: support === 'denied' ? 'warning' : 'info' }) : null,
        local ? settingsNote(LOCAL_TEXT, { tone: 'info' }) : null,
        createElement('div', { className: 'settings-card-actions' }, testButton)
      ),
      prefs
        ? settingsCard('Was du bekommst', ...kindRows, settingsNote('„Liste“ ist die Glocke oben; „Push“ geht an alle Geräte, auf denen Push an ist.'))
        : settingsCard('Was du bekommst', settingsNote('Wird geladen …'))
    );
  };

  const refresh = async () => {
    render();
    const [loaded, registered] = await Promise.all([
      NotificationsApi.getPreferences().catch(() => null),
      syncPushSubscription()
    ]);
    prefs = loaded;
    local = !registered && isLocalPush();
    deviceOn = registered || local;
    onStatus(deviceOn ? 'An' : 'Aus');
    render();
  };

  return { element, refresh };
}
