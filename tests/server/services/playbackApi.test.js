import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/server/services/jellyfin/client.js', async importOriginal => ({
  ...(await importOriginal()),
  jellyfinJson: vi.fn().mockResolvedValue({})
}));

import { jellyfinJson } from '../../../src/server/services/jellyfin/client.js';
import { PlaybackApiService } from '../../../src/server/services/jellyfin/playback-api.service.js';

describe('PlaybackApiService.getPlaybackInfo', () => {
  it('nennt zur gewählten Tonspur die Quelle, sonst übergeht Jellyfin die Wahl', async () => {
    await PlaybackApiService.getPlaybackInfo('u1', 't', 'item-1', { audioStreamIndex: 2 });
    expect(jellyfinJson.mock.calls.at(-1)[1].body).toMatchObject({ AudioStreamIndex: 2, MediaSourceId: 'item-1' });

    await PlaybackApiService.getPlaybackInfo('u1', 't', 'item-1', { audioStreamIndex: 3, mediaSourceId: 'source-9' });
    expect(jellyfinJson.mock.calls.at(-1)[1].body).toMatchObject({ AudioStreamIndex: 3, MediaSourceId: 'source-9' });

    await PlaybackApiService.getPlaybackInfo('u1', 't', 'item-1');
    expect(jellyfinJson.mock.calls.at(-1)[1].body).not.toHaveProperty('MediaSourceId');
  });
});
