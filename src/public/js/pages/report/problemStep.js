import { createElement } from '../../utils/dom.js';
import { REPORT_PROBLEMS, REPORT_MESSAGE_MAX } from '../../shared/reports.js';
import { iconElement } from './icons.js';

// Step 3: what is wrong. "Anderes" makes the description required, the
// presets take an optional one.
export function createProblemStep({ onChange }) {
  let problem = null;

  const textarea = createElement('textarea', {
    className: 'ui-textarea',
    id: 'report-message',
    maxLength: String(REPORT_MESSAGE_MAX),
    rows: 4,
    onInput: () => emit()
  });
  const label = createElement('label', { className: 'ui-label', for: 'report-message' }, 'Details (optional)');
  const hint = createElement('span', { className: 'ui-hint' }, 'Zum Beispiel: ab Minute 12, nur auf dem Handy, falsche Staffel …');
  const field = createElement('div', { className: 'ui-field', hidden: true }, label, textarea, hint);

  const buttons = REPORT_PROBLEMS.map(entry => createElement('button', {
    className: 'ui-option',
    type: 'button',
    'aria-pressed': 'false',
    onClick: () => select(entry.key)
  },
    iconElement(createElement, entry.key, 'ui-option-icon'),
    createElement('span', { className: 'ui-option-text' },
      createElement('strong', {}, entry.label),
      createElement('span', {}, entry.hint)
    )
  ));

  const element = createElement('div', { className: 'report-problem-step' },
    createElement('div', { className: 'ui-options', role: 'group', 'aria-label': 'Problem' }, ...buttons),
    field
  );

  function emit() {
    onChange({ problem, message: textarea.value.trim() });
  }

  function select(key) {
    problem = key;
    buttons.forEach((button, index) => {
      const active = REPORT_PROBLEMS[index].key === key;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    field.hidden = false;
    const required = key === 'other';
    label.textContent = required ? 'Was ist das Problem?' : 'Details (optional)';
    textarea.placeholder = required ? 'Beschreibe kurz, was nicht stimmt …' : '';
    if (required) window.requestAnimationFrame(() => textarea.focus());
    emit();
  }

  const reset = () => {
    problem = null;
    textarea.value = '';
    field.hidden = true;
    buttons.forEach(button => {
      button.classList.remove('is-selected');
      button.setAttribute('aria-pressed', 'false');
    });
  };

  return { element, reset };
}
