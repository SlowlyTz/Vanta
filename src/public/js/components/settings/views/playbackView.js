// Settings view "Wiedergabe": what every player starts with, on all devices of the user.
import { createElement } from '../../../utils/dom.js';
import { preferencesStore } from '../../../store/preferences.store.js';
import { appStore } from '../../../store/app.store.js';
import { choiceRow, segmentedRow, settingsCard, switchRow } from '../controls.js';

const QUALITY = [
  { value: 'auto', label: 'Auto' },
  { value: '1080p', label: '1080p' },
  { value: '720p', label: '720p' },
  { value: '480p', label: '480p' },
  { value: '360p', label: '360p' }
];
const AUDIO = [{ value: null, label: 'Original' }, { value: 'ger', label: 'Deutsch' }, { value: 'eng', label: 'Englisch' }];
const SUBTITLES = [{ value: null, label: 'Aus' }, { value: 'ger', label: 'Deutsch' }, { value: 'eng', label: 'Englisch' }];
const STILL_WATCHING = [
  { value: 0, label: 'Aus' },
  { value: 2, label: '2 Std.' },
  { value: 3, label: '3 Std.' },
  { value: 4, label: '4 Std.' },
  { value: 6, label: '6 Std.' }
];

export const playbackStatus = (prefs) => (prefs.autoplayNextEpisode ? 'Autoplay an' : 'Autoplay aus');

export function createPlaybackView({ onStatus = () => {} } = {}) {
  const element = createElement('div', { className: 'settings-view' });

  const save = (patch) => {
    preferencesStore.update(patch)
      .then(state => onStatus(playbackStatus(state)))
      .catch(error => {
        appStore.showToast(error.message || 'Einstellung konnte nicht gespeichert werden', 'error');
        render();
      });
  };

  const render = () => {
    const prefs = preferencesStore.getState();
    // One list, short labels: three choices sit beside their label, longer
    // ones open under it.
    element.replaceChildren(
      settingsCard(null,
        switchRow({ label: 'Nächste Folge automatisch', checked: prefs.autoplayNextEpisode, onChange: value => save({ autoplayNextEpisode: value }) }).element,
        switchRow({ label: 'Intro überspringen', checked: prefs.autoSkipIntro, onChange: value => save({ autoSkipIntro: value }) }).element,
        choiceRow({ label: '„Schaust du noch?“', description: 'Fragt nach, wenn so lange nichts gedrückt wurde.', options: STILL_WATCHING, value: prefs.stillWatchingHours, onChange: value => save({ stillWatchingHours: value }) }).element,
        choiceRow({ label: 'Qualität', options: QUALITY, value: prefs.defaultQuality, onChange: value => save({ defaultQuality: value }) }).element,
        segmentedRow({ label: 'Tonspur', options: AUDIO, value: prefs.audioLanguage, onChange: value => save({ audioLanguage: value }) }).element,
        segmentedRow({ label: 'Untertitel', options: SUBTITLES, value: prefs.subtitleLanguage, onChange: value => save({ subtitleLanguage: value }) }).element
      )
    );
  };

  return {
    element,
    refresh: () => {
      render();
      onStatus(playbackStatus(preferencesStore.getState()));
    }
  };
}
