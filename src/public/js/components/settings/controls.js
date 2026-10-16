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

// A switch without a text of its own, for a column of switches under a
// heading (the kinds of notifications). `label` names it for screen readers.
export function switchCell({ label, checked = false, disabled = false, onChange }) {
  const input = createElement('input', {
    type: 'checkbox',
    role: 'switch',
    className: 'settings-switch-input',
    checked,
    disabled,
    'aria-label': label,
    onChange: event => onChange?.(event.target.checked, event.target)
  });
  const tv = document.documentElement.classList.contains('tv-mode');
  if (tv) input.setAttribute('tabindex', '-1');
  const cell = createElement('label', {
    className: 'settings-switch-cell',
    ...(tv ? { tabindex: '-1', 'data-tv-focusable': '', role: 'presentation' } : {})
  },
    createElement('span', { className: 'settings-switch' }, input, createElement('span', { className: 'settings-switch-track', 'aria-hidden': 'true' }))
  );
  return { element: cell, input, set: value => { input.checked = Boolean(value); } };
}

// One choice out of a few (up to three), as a row of buttons beside the
// label; a longer list of choices is a choiceRow.
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
  const element = createElement('div', { className: `settings-control-block${options.length <= 3 ? ' is-inline' : ''}` },
    createElement('span', { className: 'settings-control-text' },
      createElement('span', { className: 'settings-control-label' }, label),
      description ? createElement('span', { className: 'settings-control-description' }, description) : null
    ),
    group
  );
  return { element, set };
}

// The nearest ancestor that scrolls (the settings panel): the menu opens
// upwards when there is no room for it below inside it.
function scrollParent(element) {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return document.documentElement;
}

const CLOSE_MS = 160;

// One choice out of many, as a dropdown: the label on the left, a box with
// the current value on the right; the menu floats over the page with its own
// open and close animation. Not a native <select>: its list cannot be
// styled or animated, and TV browsers show it as a system overlay.
export function choiceRow({ label, description = null, options, value, onChange }) {
  let current = value;
  let open = false;
  let closeTimer = null;
  const valueEl = createElement('span', { className: 'settings-dropdown-value' });
  const menu = createElement('div', { className: 'settings-dropdown-menu', role: 'listbox', 'aria-label': label, hidden: true, tabindex: '-1' });
  const toggle = createElement('button', {
    type: 'button',
    className: 'settings-dropdown-toggle',
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
    'aria-label': label,
    onClick: () => setOpen(!open)
  },
    valueEl,
    createElement('span', { className: 'settings-dropdown-chevron', 'aria-hidden': 'true' })
  );
  const buttons = options.map(option => createElement('button', {
    type: 'button',
    className: 'settings-dropdown-option',
    role: 'option',
    dataset: { value: String(option.value) },
    onClick: () => {
      set(option.value);
      setOpen(false);
      toggle.focus({ preventScroll: true });
      onChange?.(option.value);
    }
  }, option.label));
  menu.append(...buttons);
  const dropdown = createElement('div', { className: 'settings-dropdown' }, toggle, menu);

  const onOutside = event => {
    if (!dropdown.contains(event.target)) setOpen(false);
  };
  // Up/down move through the choices (a TV's arrows too); left/right stay.
  // Escape or Back close the menu only: caught on the window before the
  // settings dialog (which listens on the document) closes its area.
  const onBack = event => {
    if (!(event.key === 'Escape' || event.key === 'Backspace' || event.key === 'GoBack' || event.keyCode === 461)) return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
    toggle.focus({ preventScroll: true });
  };
  const onKeydown = event => {
    const index = buttons.indexOf(document.activeElement);
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && index !== -1) {
      event.preventDefault();
      event.stopPropagation();
      const next = buttons[index + (event.key === 'ArrowDown' ? 1 : -1)];
      next?.focus({ preventScroll: true });
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const setOpen = next => {
    if (next === open) return;
    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    window.clearTimeout(closeTimer);
    if (open) {
      menu.hidden = false;
      // Room below inside the scrolling panel, else it opens upwards.
      const area = scrollParent(dropdown).getBoundingClientRect();
      const box = toggle.getBoundingClientRect();
      const below = Math.min(area.bottom, window.innerHeight) - box.bottom;
      dropdown.classList.toggle('opens-up', below < menu.offsetHeight + 12 && box.top - Math.max(area.top, 0) > below);
      // Next frame: from the closed state into the open one (the animation).
      window.requestAnimationFrame(() => dropdown.classList.add('is-open'));
      (buttons.find(button => button.classList.contains('is-active')) || buttons[0])?.focus({ preventScroll: true });
      document.addEventListener('pointerdown', onOutside, true);
      window.addEventListener('keydown', onBack, true);
      dropdown.addEventListener('keydown', onKeydown);
    } else {
      dropdown.classList.remove('is-open');
      document.removeEventListener('pointerdown', onOutside, true);
      window.removeEventListener('keydown', onBack, true);
      dropdown.removeEventListener('keydown', onKeydown);
      closeTimer = window.setTimeout(() => { if (!open) menu.hidden = true; }, CLOSE_MS);
    }
  };
  const set = next => {
    current = next;
    const chosen = options.find(option => option.value === next);
    valueEl.textContent = chosen ? chosen.label : '';
    buttons.forEach((button, index) => {
      const active = options[index].value === next;
      button.setAttribute('aria-selected', String(active));
      button.classList.toggle('is-active', active);
    });
  };

  const element = createElement('div', { className: 'settings-control-row settings-choice' },
    createElement('span', { className: 'settings-control-text' },
      createElement('span', { className: 'settings-control-label' }, label),
      description ? createElement('span', { className: 'settings-control-description' }, description) : null
    ),
    dropdown
  );
  set(current);
  return { element, set, setOpen, get value() { return current; }, get isOpen() { return open; } };
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
