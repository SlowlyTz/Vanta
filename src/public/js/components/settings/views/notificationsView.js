// Settings view "Benachrichtigungen": push on this device, and per kind push
// and the list under the bell.
import { createElement } from '../../../utils/dom.js';
import { NotificationsApi } from '../../../api/notifications.api.js';
import { appStore } from '../../../store/app.store.js';
import { NOTIFICATION_KINDS } from '../../../shared/notificationKinds.js';
import { disablePush, enablePush, isLocalPush, pushSupport, renewPush, showLocalNotification, syncPushSubscription } from '../../../utils/pushSubscription.js';
import { settingsCard, settingsNote, switchCell, switchRow } from '../controls.js';

const SUPPORT_TEXT = {
  denied: 'Der Browser blockiert Benachrichtigungen für VANTA. Erlaube sie in den Website-Einstellungen des Browsers und versuche es dann erneut.',
  unsupported: 'Dieser Browser kann keine Push-Benachrichtigungen empfangen. Die Liste unter der Glocke funktioniert trotzdem.',
  'ios-install': 'Auf iPhone und iPad gibt es Push nur für die installierte App: Teilen → „Zum Home-Bildschirm“, dann VANTA von dort öffnen (ab iOS 16.4).',
};

// A browser without a push service (Helium, ungoogled Chromium) gets them
// from the open app.
const LOCAL_TEXT = 'Dieser Browser hat keinen Push-Dienst. Benachrichtigungen erscheinen hier als Systemmeldung, solange VANTA in einem Tab offen ist (auch im Hintergrund).';

const BELL_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
const PHONE_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>';

// The two columns over the switches: what each one turns on.
function columnHead(icon, text) {
  const head = createElement('span', { className: 'settings-kind-column' });
  head.innerHTML = icon;
  head.appendChild(createElement('span', {}, text));
  return head;
}

// `onStatus` gets "Push an"/"Push aus" for the row in the hub.
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
      description: local ? 'Als Systemmeldung, solange VANTA offen ist.' : 'Auch wenn VANTA geschlossen ist.',
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
        onStatus(deviceOn ? 'Push an' : 'Push aus');
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
          else {
            try {
              await NotificationsApi.sendTest();
            } catch (error) {
              if (error.status !== 409) throw error;
              // The push service refused the subscription (expired, made
              // with another key): once more with a fresh one.
              const renewed = await renewPush();
              if (renewed !== 'on') throw error;
              await NotificationsApi.sendTest({ retry: true });
            }
          }
          appStore.showToast('Testbenachrichtigung gesendet', 'success');
        } catch (error) {
          appStore.showToast(error.message || 'Testbenachrichtigung fehlgeschlagen', 'error');
        }
      }
    }, 'Testbenachrichtigung senden');

    // Per kind: the text on the left (it may wrap), the two switches always
    // on the right, under the column heads.
    const kindRows = (prefs?.kinds || []).map(entry => {
      const meta = NOTIFICATION_KINDS.find(kind => kind.kind === entry.kind);
      const kindLabel = meta?.label || entry.kind;
      const inAppSwitch = switchCell({ label: `${kindLabel}: in der App`, checked: entry.inApp, onChange: value => save({ kinds: [{ kind: entry.kind, inApp: value }] }) });
      // Without push on this device the column only keeps the choice for later.
      const pushSwitch = switchCell({ label: `${kindLabel}: Push`, checked: entry.push, disabled: !deviceOn, onChange: value => save({ kinds: [{ kind: entry.kind, push: value }] }) });
      return createElement('div', { className: 'settings-kind-row' },
        createElement('span', { className: 'settings-control-text' },
          createElement('span', { className: 'settings-control-label' }, kindLabel),
          meta?.description ? createElement('span', { className: 'settings-control-description' }, meta.description) : null
        ),
        inAppSwitch.element,
        pushSwitch.element
      );
    });
    const kindHead = createElement('div', { className: 'settings-kind-row settings-kind-head', 'aria-hidden': 'true' },
      createElement('span', {}),
      columnHead(BELL_ICON, 'In der App'),
      columnHead(PHONE_ICON, 'Push')
    );

    element.replaceChildren(
      settingsCard('Dieses Gerät',
        deviceSwitch.element,
        SUPPORT_TEXT[support] && !deviceOn ? settingsNote(SUPPORT_TEXT[support], { tone: support === 'denied' ? 'warning' : 'info' }) : null,
        local ? settingsNote(LOCAL_TEXT, { tone: 'info' }) : null,
        createElement('div', { className: 'settings-card-actions' }, testButton)
      ),
      prefs
        ? settingsCard('Was du bekommst', kindHead, ...kindRows,
          deviceOn ? null : settingsNote('Push kommt an, sobald „Push auf diesem Gerät“ eingeschaltet ist.', { tone: 'info' }))
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
    onStatus(deviceOn ? 'Push an' : 'Push aus');
    render();
  };

  return { element, refresh };
}
