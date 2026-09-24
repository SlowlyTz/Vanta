import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/server/services/jellyfin/items.service.js', () => ({ ItemsService: { getItemDetails: vi.fn() } }));
vi.mock('../../../src/server/services/jellyfin/client.js', async importOriginal => {
  const actual = await importOriginal();
  return { ...actual, jellyfinJson: vi.fn() };
});

import { ItemsService } from '../../../src/server/services/jellyfin/items.service.js';
import { jellyfinJson, registerTokenDevice, getAuthHeader, deviceIdForToken, SHARED_DEVICE_ID } from '../../../src/server/services/jellyfin/client.js';
import { getTranscodeProgress, clearTranscodeProgressCache } from '../../../src/server/services/playback/transcodeProgress.js';

describe('Geräte-ID pro Login', () => {
  it('nutzt die beim Login vergebene ID für alle Aufrufe mit diesem Token', () => {
    registerTokenDevice('token-a', 'vanta-abc');
    expect(deviceIdForToken('token-a')).toBe('vanta-abc');
    expect(getAuthHeader('token-a')).toContain('DeviceId="vanta-abc"');
    expect(deviceIdForToken('unbekannt')).toBe(SHARED_DEVICE_ID);
  });
});

describe('getTranscodeProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTranscodeProgressCache();
    ItemsService.getItemDetails.mockResolvedValue({
      RunTimeTicks: 6_000 * 10_000_000,
      MediaStreams: [{ Type: 'Video', RealFrameRate: 24 }]
    });
  });

  it('rechnet Jellyfins Fortschritt in Position und Tempo um', async () => {
    registerTokenDevice('token-b', 'vanta-dev-b');
    jellyfinJson.mockResolvedValue([
      { DeviceId: 'other', TranscodingInfo: { CompletionPercentage: 90 } },
      { DeviceId: 'vanta-dev-b', TranscodingInfo: { CompletionPercentage: 10.5, Framerate: 48 } }
    ]);
    const progress = await getTranscodeProgress({ userId: 'u1', token: 'token-b', itemId: 'movie' });
    expect(jellyfinJson).toHaveBeenCalledWith('/Sessions', { token: 'token-b', query: { deviceId: 'vanta-dev-b' } });
    expect(progress).toEqual({ available: true, completionPercentage: 10.5, transcodedMs: 630_000, runtimeMs: 6_000_000, speed: 2 });
  });

  it('meldet nichts, solange Jellyfin nichts meldet oder das Gerät geteilt ist', async () => {
    registerTokenDevice('token-c', 'vanta-dev-c');
    jellyfinJson.mockResolvedValue([{ DeviceId: 'vanta-dev-c', TranscodingInfo: { VideoCodec: 'h264' } }]);
    expect(await getTranscodeProgress({ userId: 'u1', token: 'token-c', itemId: 'movie' })).toEqual({ available: false, reason: 'no-progress' });
    expect(await getTranscodeProgress({ userId: 'u1', token: 'fremd', itemId: 'movie' })).toEqual({ available: false, reason: 'shared-device' });
  });
});
