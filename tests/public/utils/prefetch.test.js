import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const pageChunk = vi.fn(async () => ({ default: () => document.createElement('div') }));
const fetchDetailData = vi.fn();

vi.mock('../../../src/public/js/pages/detail.page.js', () => pageChunk());
vi.mock('../../../src/public/js/pages/detail/detailData.js', () => ({ fetchDetailData }));

const {
  initDetailPrefetch,
  resetDetailPrefetch,
  prefetchDetail,
  takePrefetchedDetail
} = await import('../../../src/public/js/utils/prefetch.js');

function makeCard(id) {
  const card = document.createElement('div');
  card.className = 'media-card';
  card.dataset.itemId = id;
  const inner = document.createElement('div');
  inner.className = 'media-card-title';
  card.appendChild(inner);
  document.body.appendChild(card);
  return card;
}

function pointer(type, target, init = {}) {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'mouse', ...init }));
}

function touch(target) {
  target.dispatchEvent(new Event('touchstart', { bubbles: true }));
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('detail prefetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    fetchDetailData.mockImplementation(async id => ({ item: { Id: id }, similar: [], seasons: [], normalized: {} }));
    resetDetailPrefetch();
    initDetailPrefetch();
  });

  afterEach(() => {
    resetDetailPrefetch();
    document.body.innerHTML = '';
    document.documentElement.classList.remove('intro-off');
    delete navigator.connection;
    vi.useRealTimers();
  });

  it('prefetches the item and the page chunk after the hover delay', async () => {
    const card = makeCard('a');

    pointer('pointerover', card.firstElementChild);
    await vi.advanceTimersByTimeAsync(79);
    expect(fetchDetailData).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await flush();
    expect(fetchDetailData).toHaveBeenCalledWith('a');
    expect(pageChunk).toHaveBeenCalledTimes(1);
  });

  it('cancels the prefetch when the pointer leaves the card before the delay', async () => {
    const card = makeCard('a');

    pointer('pointerover', card);
    await vi.advanceTimersByTimeAsync(40);
    pointer('pointerout', card, { relatedTarget: document.body });
    await vi.advanceTimersByTimeAsync(200);

    expect(fetchDetailData).not.toHaveBeenCalled();
  });

  it('keeps the timer when the pointer only moves between children of the card', async () => {
    const card = makeCard('a');

    pointer('pointerover', card);
    await vi.advanceTimersByTimeAsync(40);
    pointer('pointerout', card, { relatedTarget: card.firstElementChild });
    pointer('pointerover', card.firstElementChild);
    await vi.advanceTimersByTimeAsync(60);

    expect(fetchDetailData).toHaveBeenCalledTimes(1);
  });

  it('ignores pointerover from a touch pointer', async () => {
    const card = makeCard('a');

    pointer('pointerover', card, { pointerType: 'touch' });
    await vi.advanceTimersByTimeAsync(200);

    expect(fetchDetailData).not.toHaveBeenCalled();
  });

  it('prefetches immediately on touchstart', async () => {
    const card = makeCard('a');

    touch(card.firstElementChild);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchDetailData).toHaveBeenCalledWith('a');
  });

  it('throttles to one prefetch per 150 ms', async () => {
    const first = makeCard('a');
    const second = makeCard('b');

    pointer('pointerover', first);
    await vi.advanceTimersByTimeAsync(80);
    expect(fetchDetailData).toHaveBeenCalledTimes(1);

    pointer('pointerover', second);
    await vi.advanceTimersByTimeAsync(80);
    expect(fetchDetailData).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(70);
    expect(fetchDetailData).toHaveBeenCalledTimes(2);
    expect(fetchDetailData).toHaveBeenLastCalledWith('b');
  });

  it('drops a pending prefetch when the card is clicked', async () => {
    const card = makeCard('a');

    pointer('pointerover', card);
    await vi.advanceTimersByTimeAsync(40);
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(200);

    expect(fetchDetailData).not.toHaveBeenCalled();
  });

  it('deduplicates an in-flight request for the same id', async () => {
    const first = prefetchDetail('a');
    const second = prefetchDetail('a');
    await first;

    expect(first).toBe(second);
    expect(fetchDetailData).toHaveBeenCalledTimes(1);
  });

  it('hands the cached bundle out once and then forgets it', async () => {
    const promise = prefetchDetail('a');

    expect(takePrefetchedDetail('a')).toBe(promise);
    expect(takePrefetchedDetail('a')).toBeNull();
  });

  it('expires entries after 60 seconds', async () => {
    prefetchDetail('a');

    await vi.advanceTimersByTimeAsync(59_999);
    expect(takePrefetchedDetail('a')).toBeTruthy();

    prefetchDetail('b');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(takePrefetchedDetail('b')).toBeNull();
  });

  it('keeps at most 20 entries and evicts the oldest', async () => {
    for (let index = 0; index < 21; index++) {
      prefetchDetail(`id-${index}`);
    }

    expect(takePrefetchedDetail('id-0')).toBeNull();
    expect(takePrefetchedDetail('id-1')).toBeTruthy();
    expect(takePrefetchedDetail('id-20')).toBeTruthy();
  });

  it('removes a failed prefetch so the page requests the item itself', async () => {
    fetchDetailData.mockRejectedValueOnce(new Error('offline'));

    const promise = prefetchDetail('a');
    await promise.catch(() => {});
    await flush();

    expect(takePrefetchedDetail('a')).toBeNull();
  });

  it('does nothing while the browser asks to save data', async () => {
    navigator.connection = { saveData: true };
    const card = makeCard('a');

    pointer('pointerover', card);
    await vi.advanceTimersByTimeAsync(200);
    touch(card);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchDetailData).not.toHaveBeenCalled();
    expect(pageChunk).not.toHaveBeenCalled();
  });

  it('does nothing while the opening scene is still covering the page', async () => {
    const overlay = document.createElement('div');
    overlay.id = 'intro';
    document.body.appendChild(overlay);
    const card = makeCard('a');

    pointer('pointerover', card);
    await vi.advanceTimersByTimeAsync(200);
    expect(fetchDetailData).not.toHaveBeenCalled();

    overlay.remove();
    pointer('pointerover', card);
    await vi.advanceTimersByTimeAsync(200);
    expect(fetchDetailData).toHaveBeenCalledTimes(1);
  });

  it('registers its listeners only once', () => {
    const spy = vi.spyOn(document, 'addEventListener');

    initDetailPrefetch();
    initDetailPrefetch();

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
