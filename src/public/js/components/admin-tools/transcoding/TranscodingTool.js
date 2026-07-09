import { createElement } from '../../../utils/dom.js';
import { createTranscodingIcon } from '../../navbar/icons.js';
import { createTranscodingState } from './transcodingState.js';

export function createTranscodingTool() {
  const switchInput = createElement('input', {
    type: 'checkbox',
    className: 'admin-transcoding-switch-input',
    id: 'admin-transcoding-switch'
  });
  const switchLabel = createElement('label', {
    className: 'admin-transcoding-switch',
    htmlFor: 'admin-transcoding-switch'
  });
  const statusEl = createElement('div', { className: 'admin-transcoding-status' }, 'Lade Einstellung...');
  const hintEl = createElement('div', { className: 'admin-transcoding-hint' });
  const errorEl = createElement('div', { className: 'admin-transcoding-error hidden' });

  const element = createElement('div', { className: 'admin-transcoding-view' },
    createElement('div', { className: 'admin-transcoding-content' },
      statusEl,
      createElement('div', { className: 'admin-transcoding-row' },
        createElement('span', { className: 'admin-transcoding-label' }, 'Transcoding für alle Inhalte'),
        createElement('div', { className: 'admin-transcoding-switch-wrapper' },
          switchInput,
          switchLabel
        )
      ),
      hintEl,
      errorEl
    )
  );

  const render = ({ forceHlsTranscoding, isSaving, error }) => {
    const enabled = forceHlsTranscoding === true;
    switchInput.checked = enabled;
    switchInput.disabled = isSaving || forceHlsTranscoding === null;
    statusEl.textContent = enabled ? 'Aktiviert' : 'Deaktiviert';
    hintEl.textContent = enabled
      ? 'Jellyfin liefert alle Streams als kompatibles HLS mit H.264/AAC.'
      : 'Jellyfin entscheidet pro Medium zwischen Direct Play, Direct Stream und Transcoding.';
    errorEl.textContent = error || '';
    errorEl.classList.toggle('hidden', !error);
  };

  const state = createTranscodingState({ onChange: render });

  switchInput.addEventListener('change', () => {
    state.setEnabled(switchInput.checked);
  });

  return {
    id: 'transcoding',
    label: 'Transcoding',
    description: 'Globale Wiedergabe-Kompatibilität',
    icon: createTranscodingIcon(),
    element,
    load: state.load
  };
}
