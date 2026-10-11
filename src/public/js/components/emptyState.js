import { createElement } from '../utils/dom.js';

// The box shown where a list or page has nothing to show (EmptyState) or
// could not load (ErrorState, announced to screen readers, with a button to
// try again or go elsewhere).
export function EmptyState({ title = null, message = null, action = null, className = '', style = undefined } = {}) {
  return createElement('div', { className: `search-empty-state${className ? ` ${className}` : ''}`, style },
    title ? createElement('h3', {}, title) : null,
    message ? createElement('p', {}, message) : null,
    action ? createElement('button', { type: 'button', className: 'btn-primary', onClick: action.onClick }, action.label) : null
  );
}

export function ErrorState({
  title = 'Fehler beim Laden',
  message,
  retry = null,
  retryLabel = 'Erneut versuchen',
  action = null,
  className = '',
  style = undefined
} = {}) {
  const element = EmptyState({
    title,
    message,
    action: action || (retry ? { label: retryLabel, onClick: retry } : null),
    className,
    style
  });
  element.setAttribute('role', 'alert');
  return element;
}
