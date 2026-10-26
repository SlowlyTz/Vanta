// An address no route knows (a typo, an old link): says so instead of
// silently showing the home page.
import { createElement } from '../utils/dom.js';
import { EmptyState } from '../components/emptyState.js';

export default function NotFoundPage() {
  return createElement('div', { className: 'page-container content-section page-not-found' },
    EmptyState({
      title: 'Seite nicht gefunden',
      message: 'Diese Adresse gibt es in VANTA nicht (mehr).',
      action: { label: 'Zur Startseite', onClick: () => { window.location.hash = '#/home'; } }
    })
  );
}
