import { createElement } from '../../../utils/dom.js';
import { preferencesStore } from '../../../store/preferences.store.js';
import { appStore } from '../../../store/app.store.js';
import { segmentedRow, settingsCard, switchRow } from '../controls.js';
import { getTvChoice, setTvChoice } from '../../../utils/tvMode.js';
import { confirmDialog } from '../../confirmDialog.js';

const SCREENSAVER_MINUTES = [5, 10, 20, 30].map(value => ({ value, label: `${value} Min.` }));

export const appearanceStatus = (prefs) => (prefs.reducedMotion ? 'Weniger Bewegung' : 'Standard');

// "Darstellung": the opening animation, less motion, the screensaver and,
// last, the TV mode of this device. Further rows are added by `extraRows`.
export function createAppearanceView({ onStatus = () => {}, extraRows = () => [] } = {}) {
  const element = createElement('div', { className: 'settings-view' });

  const save = (patch) => {
    preferencesStore.update(patch)
      .then(state => {
        onStatus(appearanceStatus(state));
        document.documentElement.classList.toggle('reduce-motion', state.reducedMotion === true);
      })
      .catch(error => {
        appStore.showToast(error.message || 'Einstellung konnte nicht gespeichert werden', 'error');
        render();
      });
  };

  // The TV mode needs a reload: only for a real change, and after asking.
  const changeTvMode = async (value, row) => {
    const previous = getTvChoice();
    if (value === previous) return;
    const yes = await confirmDialog({
      title: 'App neu laden?',
      message: 'Der TV-Modus wird beim Neuladen der App übernommen.',
      confirmLabel: 'Neu laden',
      cancelLabel: 'Abbrechen'
    });
    if (!yes) {
      row.set(previous);
      return;
    }
    setTvChoice(value);
    window.location.reload();
  };

  const render = () => {
    const prefs = preferencesStore.getState();
    const tvRow = segmentedRow({
      label: 'TV-Modus',
      description: 'Große Schrift und Bedienung mit der Fernbedienung. Gilt für dieses Gerät.',
      options: [{ value: null, label: 'Automatisch' }, { value: 'on', label: 'An' }, { value: 'off', label: 'Aus' }],
      value: getTvChoice(),
      onChange: value => changeTvMode(value, tvRow)
    });
    element.replaceChildren(
      ...extraRows(),
      settingsCard('Bewegung',
        segmentedRow({ label: 'Intro-Animation', description: 'Die Szene beim Öffnen der App.', options: [{ value: 'auto', label: 'Automatisch' }, { value: 'off', label: 'Aus' }], value: prefs.introAnimation, onChange: value => save({ introAnimation: value }) }).element,
        switchRow({ label: 'Weniger Bewegung', description: 'Kürzere Übergänge und keine Kamerafahrten.', checked: prefs.reducedMotion, onChange: value => save({ reducedMotion: value }) }).element
      ),
      settingsCard('Bildschirmschoner',
        switchRow({ label: 'Auf der Startseite', description: 'Zeigt Titel aus der Bibliothek, wenn länger nichts passiert.', checked: prefs.screensaverEnabled, onChange: value => save({ screensaverEnabled: value }) }).element,
        segmentedRow({ label: 'Startet nach', options: SCREENSAVER_MINUTES, value: prefs.screensaverMinutes, onChange: value => save({ screensaverMinutes: value }) }).element
      ),
      settingsCard('Fernseher', tvRow.element)
    );
  };

  return {
    element,
    refresh: () => {
      render();
      onStatus(appearanceStatus(preferencesStore.getState()));
    }
  };
}
