import { createElement } from '../../utils/dom.js';

let controlCounter = 0;

// A labelled switch (a checkbox with role="switch").
export function switchRow({ label, description = null, checked = false, disabled = false, onChange }) {
  const id = `settings-switch-${++controlCounter}`;
  const input = createElement('input', {
    type: 'checkbox',
    id,
    role: 'switch',
    className: 'settings-switch-input',
    checked,
    disabled,
    onChange: event => onChange?.(event.target.checked, event.target)
  });
  // On a TV the whole row is the stop (OK toggles it); the hidden input at
  // its edge would be skipped by the arrow keys.
  const tv = document.documentElement.classList.contains('tv-mode');
  if (tv) input.setAttribute('tabindex', '-1');
  const row = createElement('label', {
    className: 'settings-control-row',
    for: id,
    ...(tv ? { tabindex: '-1', 'data-tv-focusable': '', role: 'presentation' } : {})
  },
    createElement('span', { className: 'settings-control-text' },
      createElement('span', { className: 'settings-control-label' }, label),
      description ? createElement('span', { className: 'settings-control-description' }, description) : null
    ),
    createElement('span', { className: 'settings-switch' }, input, createElement('span', { className: 'settings-switch-track', 'aria-hidden': 'true' }))
  );
  return { element: row, input, set: value => { input.checked = Boolean(value); } };
}

// One choice out of a few, as a row of buttons.
export function segmentedRow({ label, description = null, options, value, onChange }) {
  const group = createElement('div', { className: 'settings-segmented', role: 'radiogroup', 'aria-label': label });
  const buttons = options.map(option => createElement('button', {
    type: 'button',
    className: 'settings-segmented-option',
    role: 'radio',
    dataset: { value: String(option.value) },
    onClick: () => {
      set(option.value);
      onChange?.(option.value);
    }
  }, option.label));
  group.append(...buttons);
  const set = next => {
    buttons.forEach((button, index) => {
      const active = options[index].value === next;
      button.setAttribute('aria-checked', String(active));
      button.classList.toggle('is-active', active);
    });
  };
  set(value);
  const element = createElement('div', { className: 'settings-control-block' },
    createElement('span', { className: 'settings-control-text' },
      createElement('span', { className: 'settings-control-label' }, label),
      description ? createElement('span', { className: 'settings-control-description' }, description) : null
    ),
    group
  );
  return { element, set };
}

// A card holding a group of controls under a heading.
export function settingsCard(title, ...children) {
  return createElement('section', { className: 'settings-section' },
    title ? createElement('h3', { className: 'settings-section-title' }, title) : null,
    createElement('div', { className: 'settings-card' }, ...children)
  );
}

export function settingsNote(text, { tone = 'info' } = {}) {
  return createElement('p', { className: `settings-note is-${tone}` }, text);
}
