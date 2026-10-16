import { createElement } from '../../../utils/dom.js';
import { preferencesStore } from '../../../store/preferences.store.js';
import { appStore } from '../../../store/app.store.js';
import { choiceRow, segmentedRow, settingsCard, switchRow } from '../controls.js';
import { getTvChoice, setTvChoice } from '../../../utils/tvMode.js';
import { confirmDialog } from '../../confirmDialog.js';

const SCREENSAVER_MINUTES = [5, 10, 20, 30].map(value => ({ value, label: `${value} Min.` }));

export const appearanceStatus = (prefs) => (prefs.reducedMotion ? 'Weniger Bewegung' : 'Standard');

// "Darstellung": the TV mode of this device, the screensaver, less motion
// and the opening animation, in one list. Further rows come from `extraRows`.
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
      description: 'Gilt für dieses Gerät.',
      options: [{ value: null, label: 'Automatisch' }, { value: 'on', label: 'An' }, { value: 'off', label: 'Aus' }],
      value: getTvChoice(),
      onChange: value => changeTvMode(value, tvRow)
    });
    // "Startet nach" only matters while the screensaver is on.
    const after = choiceRow({ label: 'Bildschirmschoner nach', options: SCREENSAVER_MINUTES, value: prefs.screensaverMinutes, onChange: value => save({ screensaverMinutes: value }) });
    after.element.hidden = !prefs.screensaverEnabled;
    element.replaceChildren(
      ...extraRows(),
      settingsCard(null,
        tvRow.element,
        switchRow({ label: 'Bildschirmschoner', description: 'Auf der Startseite, wenn länger nichts passiert.', checked: prefs.screensaverEnabled, onChange: value => { after.element.hidden = !value; save({ screensaverEnabled: value }); } }).element,
        after.element,
        switchRow({ label: 'Weniger Bewegung', checked: prefs.reducedMotion, onChange: value => save({ reducedMotion: value }) }).element,
        switchRow({ label: 'Intro-Animation beim Start', checked: prefs.introAnimation !== 'off', onChange: value => save({ introAnimation: value ? 'auto' : 'off' }) }).element
      )
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
