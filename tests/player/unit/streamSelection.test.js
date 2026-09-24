import { describe, it, expect, vi } from 'vitest';

import { createPlayerContext } from '../../../src/player/src/player/context.js';

describe('Stream-Anfragen behalten Tonspur und Qualität', () => {
  it('schickt vor der ersten Wahl die gemerkte Sprache, danach die gewählte Spur und Qualität', async () => {
    customElements.define('media-player', class extends HTMLElement {});
    const resolvePlayback = vi.fn().mockResolvedValue({});
    const root = document.createElement('div');
    const context = await createPlayerContext({ root, itemId: 'i', title: 'T', resolvePlayback, reportPlayback: vi.fn() });

    context.preferences = { get: () => ({ audioLanguage: 'ger' }) };
    await context.resolvePlayback('auto');
    expect(resolvePlayback).toHaveBeenLastCalledWith('auto', { audioLanguage: 'ger' });

    context.audioMenu = { getCurrentIndex: () => 3 };
    context.qualityMenu = { getCurrentId: () => '720p' };
    context.sourceSwitch = { getCurrentPlayback: () => ({}) };
    await context.resolvePlayback('hls');
    expect(resolvePlayback).toHaveBeenLastCalledWith('hls', { audioStreamIndex: 3, qualityProfile: '720p' });

    await context.resolvePlayback('auto', { qualityProfile: '480p' });
    expect(resolvePlayback).toHaveBeenLastCalledWith('auto', { audioStreamIndex: 3, qualityProfile: '480p' });
  });
});
