import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaApi } from '../../../../src/public/js/api/media.api.js';
import { createActorModal } from '../../../../src/public/js/pages/detail/actorModal.js';

vi.mock('../../../../src/public/js/api/media.api.js', () => ({
  MediaApi: {
    getPerson: vi.fn(),
    getPersonByName: vi.fn(),
    getPersonItems: vi.fn(),
    getPersonItemsByName: vi.fn()
  }
}));

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('actorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MediaApi.getPersonItems.mockResolvedValue([]);
    MediaApi.getPersonItemsByName.mockResolvedValue([]);
  });

  afterEach(() => {
    document.body.innerHTML = '';
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
