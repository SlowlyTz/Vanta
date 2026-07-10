import { createElement } from '../utils/dom.js';

export function PageHeading({ title, subtitle = null }) {
  return createElement('header', { className: 'page-heading' },
    createElement('h1', { className: 'page-heading-title' }, title),
    createElement('div', { className: 'page-heading-rule', 'aria-hidden': 'true' }),
    subtitle ? createElement('p', { className: 'page-heading-subtitle' }, subtitle) : null
  );
}
