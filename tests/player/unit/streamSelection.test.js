import { describe, it, expect, vi } from 'vitest';

import { createPlayerContext } from '../../../src/player/src/player/context.js';
import { createQualityController } from '../../../src/player/src/quality.js';

const defineMediaPlayer = () => {
  if (!customElements.get('media-player')) customElements.define('media-player', class extends HTMLElement {});
};

describe('Stream-Anfragen behalten Tonspur und Qualität', () => {
  it('schickt vor der ersten Wahl die gemerkte Sprache, danach die gewählte Spur und Qualität', async () => {
    defineMediaPlayer();
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

  it('startet in der Standardqualität aus den Einstellungen, bis eine Qualität gewählt wird', async () => {
    defineMediaPlayer();
    const resolvePlayback = vi.fn().mockResolvedValue({});
    const root = document.createElement('div');
    const context = await createPlayerContext({
      root, itemId: 'i', title: 'T', resolvePlayback, reportPlayback: vi.fn(),
      userPreferences: { defaultQuality: '720p' }
    });
    const onSelect = vi.fn();
    context.qualityMenu = createQualityController({ onSelect });

    await context.resolvePlayback('auto');
    expect(resolvePlayback).toHaveBeenLastCalledWith('auto', { qualityProfile: '720p' });

    // The server answered with its own profile id: the default still holds
    // (the HLS fallback asks for it again).
    context.qualityMenu.update([{ id: 'auto' }, { id: '720p' }, { id: '1080p' }], 'auto');
    await context.resolvePlayback('hls');
    expect(resolvePlayback).toHaveBeenLastCalledWith('hls', { qualityProfile: '720p' });

    context.qualityMenu.select('1080p');
    expect(onSelect).toHaveBeenCalledWith('1080p');
    context.qualityMenu.update([{ id: 'auto' }, { id: '720p' }, { id: '1080p' }], '1080p');
    await context.resolvePlayback('hls');
    expect(resolvePlayback).toHaveBeenLastCalledWith('hls', { qualityProfile: '1080p' });

    context.qualityMenu.select('auto');
    context.qualityMenu.update([{ id: 'auto' }, { id: '720p' }, { id: '1080p' }], 'auto');
    await context.resolvePlayback('hls');
    expect(resolvePlayback).toHaveBeenLastCalledWith('hls', {});
  });
});
