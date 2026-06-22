import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaybackService } from './playback.service.js';
import env from '../config/env.js';

vi.mock('../config/env.js', () => ({
  default: { JELLYFIN_BASE_URL: 'http://jellyfin.test' }
}));

describe('PlaybackService', () => {
  describe('resolvePlayback', () => {
    const baseSource = {
      Id: 'source-1',
      SupportsDirectPlay: true,
      SupportsDirectStream: true,
      SupportsTranscoding: true,
      DefaultAudioStreamIndex: 1,
      DefaultSubtitleStreamIndex: 2,
      MediaStreams: [
        { Index: 0, Type: 'Video', Codec: 'h264' },
        {
          Index: 1,
          Type: 'Audio',
          Language: 'ger',
          Title: 'Deutsch',
          Codec: 'aac',
          Channels: 6,
          IsDefault: true
        },
        {
          Index: 2,
          Type: 'Subtitle',
          Language: 'ger',
          Title: 'Forced',
          Codec: 'srt',
          IsForced: true,
          IsExternal: true,
          IsDefault: true
        }
      ]
    };

    it('includes capabilities with Direct Play when available', () => {
      const playbackInfo = {
        PlaySessionId: 'session-1',
        MediaSources: [{ ...baseSource, DirectStreamUrl: '/Videos/123/stream.mp4' }]
      };

      const playback = PlaybackService.resolvePlayback(playbackInfo, '123');

      expect(playback.capabilities.directPlay).toBe(true);
      expect(playback.capabilities.directStream).toBe(true);
      expect(playback.capabilities.hls).toBe(true);
      expect(playback.capabilities.pictureInPicture).toBe(true);
      expect(playback.capabilities.qualityProfiles).toContainEqual({
        id: 'direct',
        label: 'Direct Play',
        maxHeight: null,
        maxStreamingBitrate: null
      });
    });

    it('hides Direct Play profile when HLS is forced', () => {
      const playbackInfo = {
        PlaySessionId: 'session-1',
        MediaSources: [{
          ...baseSource,
          TranscodingUrl: '/Videos/123/master.m3u8',
          TranscodingSubProtocol: 'hls'
        }]
      };

      const playback = PlaybackService.resolvePlayback(
        playbackInfo,
        '123',
        { forceHlsTranscoding: true }
      );

      expect(playback.capabilities.directPlay).toBe(false);
      expect(playback.capabilities.qualityProfiles.some(p => p.id === 'direct')).toBe(false);
      expect(playback.quality.profiles.some(p => p.id === 'direct')).toBe(false);
    });

    it('returns server-defined quality profiles with Auto first', () => {
      const playbackInfo = {
        PlaySessionId: 'session-1',
        MediaSources: [{ ...baseSource, DirectStreamUrl: '/Videos/123/stream.mp4' }]
      };

      const playback = PlaybackService.resolvePlayback(playbackInfo, '123');

      const profileIds = playback.quality.profiles.map(p => p.id);
      expect(profileIds[0]).toBe('auto');
      expect(profileIds).toContain('1080p');
      expect(profileIds).toContain('720p');
      expect(profileIds).toContain('480p');
      expect(profileIds).toContain('360p');
    });

    it('marks requested quality profile as current', () => {
      const playbackInfo = {
        PlaySessionId: 'session-1',
        MediaSources: [{ ...baseSource, DirectStreamUrl: '/Videos/123/stream.mp4' }]
      };

      const playback = PlaybackService.resolvePlayback(
        playbackInfo,
        '123',
        { requestedQualityProfile: '720p' }
      );

      expect(playback.quality.current).toBe('720p');
    });

    it('falls back Direct Play request to auto when source is transcoded', () => {
      const playbackInfo = {
        PlaySessionId: 'session-1',
        MediaSources: [{
          ...baseSource,
          SupportsDirectPlay: false,
          TranscodingUrl: '/Videos/123/master.m3u8',
          TranscodingSubProtocol: 'hls'
        }]
      };

      const playback = PlaybackService.resolvePlayback(
        playbackInfo,
        '123',
        { requestedQualityProfile: 'direct' }
      );

      expect(playback.quality.current).toBe('auto');
    });

    it('does not expose upstream tokens or direct Jellyfin URLs', () => {
      const playbackInfo = {
        PlaySessionId: 'session-1',
        MediaSources: [{
          ...baseSource,
          DirectStreamUrl: '/Videos/123/stream.mp4?api_key=secret'
        }]
      };

      const playback = PlaybackService.resolvePlayback(playbackInfo, '123');

      expect(playback.url).not.toContain('api_key');
      expect(playback.url).not.toContain('secret');
      expect(playback.url).toContain('/api/media/playback/proxy');
    });

    it('throws when no media source is found', () => {
      expect(() => PlaybackService.resolvePlayback({ MediaSources: [] }, '123'))
        .toThrow('Keine abspielbare Medienquelle gefunden.');
    });
  });

  describe('normalizeJellyfinPath', () => {
    it('removes sensitive query parameters', () => {
      const normalized = PlaybackService.normalizeJellyfinPath(
        '/Videos/123/stream?api_key=secret&access_token=token'
      );
      expect(normalized).toBe('/Videos/123/stream');
    });

    it('rejects paths from different origins', () => {
      expect(() => PlaybackService.normalizeJellyfinPath('http://other.server/video.mp4'))
        .toThrow('Playback target does not belong to the configured Jellyfin server.');
    });
  });
});
