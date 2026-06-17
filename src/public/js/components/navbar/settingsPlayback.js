import { createElement } from '../../utils/dom.js';
import { createCheckIcon } from './icons.js';
import { PLAYBACK_MODE_OPTIONS, settingsStore } from '../../store/settings.store.js';

export function createPlaybackChoices() {
  const playbackChoiceButtons = [];

  const buttons = PLAYBACK_MODE_OPTIONS.map(option => {
    const button = createElement('button', {
      className: 'settings-choice',
      type: 'button',
      'aria-pressed': 'false',
      onClick: () => settingsStore.setPlaybackMode(option.value)
    },
      createElement('span', { className: 'settings-choice-label' }, option.label),
      createCheckIcon()
    );

    playbackChoiceButtons.push({ button, value: option.value });
    return button;
  });

  const syncPlaybackChoices = () => {
    const currentMode = settingsStore.getPlaybackMode();
    playbackChoiceButtons.forEach(({ button, value }) => {
      const isActive = value === currentMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  return { buttons, syncPlaybackChoices };
}
