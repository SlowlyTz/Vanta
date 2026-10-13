import { createElement } from '../../../utils/dom.js';
import { NotificationsApi } from '../../../api/notifications.api.js';
import { appStore } from '../../../store/app.store.js';
import { NOTIFICATION_KINDS } from '../../../shared/notificationKinds.js';
import { disablePush, enablePush, pushSupport, syncPushSubscription } from '../../../utils/pushSubscription.js';
import { settingsCard, settingsNote, switchRow } from '../controls.js';

const SUPPORT_TEXT = {
  denied: 'Der Browser blockiert Benachrichtigungen für VANTA. Erlaube sie in den Website-Einstellungen des Browsers und versuche es dann erneut.',
  unsupported: 'Dieser Browser kann keine Push-Benachrichtigungen empfangen. Die Liste unter der Glocke funktioniert trotzdem.',
  'ios-install': 'Auf iPhone und iPad gibt es Push nur für die installierte App: Teilen → „Zum Home-Bildschirm“, dann VANTA von dort öffnen (ab iOS 16.4).',
  'no-service': 'Dieser Browser hat keinen Push-Dienst (etwa Helium, ungoogled Chromium oder Brave ohne „Google-Dienste für Push-Nachrichten“). Push klappt in Chrome, Edge, Firefox und Safari; die Liste unter der Glocke funktioniert überall.'
};

// "Benachrichtigungen": push on this device, and per kind push and the list
// under the bell. `onStatus` gets "An"/"Aus" for the row in the hub.
export function createNotificationsView({ onStatus = () => {} } = {}) {
  const element = createElement('div', { className: 'settings-view' });
  let prefs = null;
  let deviceOn = false;
  // Set once subscribing found no push service in this browser.
  let noService = false;

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
      description: deviceOn ? 'Dieses Gerät bekommt Benachrichtigungen, auch wenn VANTA zu ist.' : 'Benachrichtigungen auch bei geschlossener App.',
      checked: deviceOn,
      disabled: support !== 'ready' && !deviceOn,
      onChange: async (checked, input) => {
        input.disabled = true;
        try {
          if (checked) {
            const result = await enablePush();
            deviceOn = result === 'on';
            noService = result === 'no-service';
            if (!deviceOn) appStore.showToast(SUPPORT_TEXT[result] || 'Push konnte nicht eingeschaltet werden', 'error');
          } else {
            await disablePush();
            deviceOn = false;
          }
        } catch (error) {
          deviceOn = false;
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
          await NotificationsApi.sendTest();
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
        noService && !deviceOn && support === 'ready' ? settingsNote(SUPPORT_TEXT['no-service'], { tone: 'info' }) : null,
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
    deviceOn = registered;
    onStatus(deviceOn ? 'An' : 'Aus');
    render();
  };

  return { element, refresh };
}
