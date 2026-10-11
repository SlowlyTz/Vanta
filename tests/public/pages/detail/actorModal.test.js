import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../../src/public/js/api/media.api.js', () => ({
  MediaApi: {
    getPerson: vi.fn(),
    getPersonByName: vi.fn(),
    getPersonItems: vi.fn(async () => []),
    getPersonItemsByName: vi.fn(async () => []),
    getImageUrl: vi.fn(() => '/img')
  }
}));

import { MediaApi } from '../../../../src/public/js/api/media.api.js';
import { createActorModal } from '../../../../src/public/js/pages/detail/actorModal.js';
import { closeAllModals } from '../../../../src/public/js/utils/modal.js';
import { createPageScope, setActivePageScope } from '../../../../src/public/js/utils/pageScope.js';

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

describe('actor modal', () => {
  let scope;

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (fn) => { fn(); return 0; });
    window.scrollTo = vi.fn();
    scope = createPageScope();
    setActivePageScope(scope);
  });

  afterEach(() => {
    closeAllModals();
    setActivePageScope(null);
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('is a labelled dialog with a named close button', async () => {
    MediaApi.getPerson.mockResolvedValue({ Id: 'p1', Name: 'Jake Gyllenhaal' });
    createActorModal({ currentItemId: 'x' }).openActorModal({ Id: 'p1', Name: 'Jake Gyllenhaal' });
    await flush();

    const overlay = document.querySelector('.actor-modal-overlay');
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.getAttribute('aria-modal')).toBe('true');
    expect(overlay.getAttribute('aria-labelledby')).toBe('actor-modal-name');
    expect(overlay.querySelector('.actor-modal-close').getAttribute('aria-label')).toBe('Schließen');
    expect(document.activeElement).toBe(overlay.querySelector('.actor-modal-close'));
  });

  it('shows the actor clicked last even when an earlier answer arrives later', async () => {
    let resolveFirst;
    MediaApi.getPerson
      .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ Id: 'p2', Name: 'Second' });
    const modal = createActorModal({ currentItemId: 'x' });

    modal.openActorModal({ Id: 'p1', Name: 'First' });
    modal.openActorModal({ Id: 'p2', Name: 'Second' });
    await flush();
    resolveFirst({ Id: 'p1', Name: 'First' });
    await flush();

    expect(document.querySelector('.actor-modal-name').textContent).toBe('Second');
    expect(document.querySelectorAll('.actor-modal-overlay')).toHaveLength(1);
  });

  it('closes and releases the page scroll when the page is left', async () => {
    MediaApi.getPerson.mockResolvedValue({ Id: 'p1', Name: 'A' });
    createActorModal({ currentItemId: 'x' }).openActorModal({ Id: 'p1', Name: 'A' });
    await flush();
    expect(document.body.style.position).toBe('fixed');

    scope.leave();
    expect(document.querySelector('.actor-modal-overlay')).toBeNull();
    expect(document.body.style.position).toBe('');
  });

  it('shows a section loader inside the modal while fetching, then replaces it with the actor details', async () => {
    let resolvePerson;
    MediaApi.getPerson.mockReturnValue(new Promise(resolve => { resolvePerson = resolve; }));

    const modal = createActorModal({ currentItemId: 'item-1' });
    modal.openActorModal({ Id: 'actor-1', Name: 'Jane Doe' });

    const modalContent = document.querySelector('.actor-modal');
    expect(modalContent.querySelector('.section-loader')).toBeTruthy();
    expect(modalContent.getAttribute('aria-busy')).toBe('true');

    resolvePerson({ Id: 'actor-1', Name: 'Jane Doe' });
    await flush();

    expect(modalContent.querySelector('.section-loader')).toBeNull();
    expect(modalContent.hasAttribute('aria-busy')).toBe(false);
    expect(modalContent.textContent).toContain('Jane Doe');
  });
});
