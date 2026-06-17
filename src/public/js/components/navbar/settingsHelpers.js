import { createElement } from '../../utils/dom.js';
import { createChevronIcon } from './icons.js';

export function createSettingsOption(label, onClick, icon) {
  return createElement('button', {
    className: 'settings-option',
    type: 'button',
    onClick
  },
    createElement('span', { className: 'settings-option-main' },
      icon,
      createElement('span', { className: 'settings-option-label' }, label)
    ),
    createChevronIcon()
  );
}
