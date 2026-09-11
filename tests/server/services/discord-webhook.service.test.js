import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/server/services/app-settings.service.js', () => ({
  AppSettingsService: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }
}));

import { AppSettingsService } from '../../../src/server/services/app-settings.service.js';
import {
  buildRequestEmbed,
  buildTestEmbed,
  isAllowedWebhookUrl,
  sendWebhookEmbed,
  sendRequestCreated
} from '../../../src/server/services/discord-webhook.service.js';

function makeRequest(overrides = {}) {
  return {
    id: 1,
    tmdb_id: 42,
    tmdb_type: 'movie',
    title: 'Inception',
    poster_path: '/poster.jpg',
    username: 'alice',
    created_at: Date.parse('2026-01-01T12:00:00.000Z'),
    ...overrides
  };
}

describe('discord-webhook.service', () => {
  describe('buildRequestEmbed', () => {
    it('builds a full embed for a movie', () => {
      const embed = buildRequestEmbed(makeRequest(), {
        overview: 'A thief who steals corporate secrets.',
        release_date: '2010-07-16'
      });

      expect(embed.title).toBe('Inception');
      expect(embed.url).toBe('https://www.themoviedb.org/movie/42');
      expect(embed.description).toBe('A thief who steals corporate secrets.');
      expect(embed.thumbnail).toEqual({ url: 'https://image.tmdb.org/t/p/w342/poster.jpg' });
      expect(embed.timestamp).toBe('2026-01-01T12:00:00.000Z');
      expect(embed.fields).toEqual([
        { name: 'Angefragt von', value: 'alice', inline: true },
        { name: 'Typ', value: 'Film', inline: true },
        { name: 'Jahr', value: '2010', inline: true },
        { name: 'Umfang', value: 'Ganzer Film', inline: true },
        { name: 'Status', value: 'Offen', inline: true }
      ]);
    });

    it('labels the scope of a whole series, a season and a single episode', () => {
      const series = buildRequestEmbed(makeRequest({ tmdb_type: 'tv', request_scope: 'all' }), {});
      const season = buildRequestEmbed(
        makeRequest({ tmdb_type: 'tv', request_scope: 'season', season_number: 2 }), {}
      );
      const episode = buildRequestEmbed(
        makeRequest({ tmdb_type: 'tv', request_scope: 'episode', season_number: 2, episode_number: 7 }), {}
      );

      expect(series.fields).toContainEqual({ name: 'Umfang', value: 'Komplette Serie', inline: true });
      expect(season.fields).toContainEqual({ name: 'Umfang', value: 'Staffel 2', inline: true });
      expect(episode.fields).toContainEqual({ name: 'Umfang', value: 'S02E07', inline: true });
    });

    it('builds an embed for a series using first_air_date and the "Serie" label', () => {
      const embed = buildRequestEmbed(makeRequest({ tmdb_type: 'tv', tmdb_id: 99, title: 'Dark' }), {
        overview: 'A family saga.',
        first_air_date: '2017-12-01'
      });

      expect(embed.url).toBe('https://www.themoviedb.org/tv/99');
      expect(embed.fields).toContainEqual({ name: 'Typ', value: 'Serie', inline: true });
      expect(embed.fields).toContainEqual({ name: 'Jahr', value: '2017', inline: true });
    });

    it('omits the thumbnail when there is no poster_path', () => {
      const embed = buildRequestEmbed(makeRequest({ poster_path: null }), {});
      expect(embed.thumbnail).toBeUndefined();
    });

    it('falls back to "Unbekannt" when no media / no release year is available', () => {
      const embed = buildRequestEmbed(makeRequest(), null);
      expect(embed.fields).toContainEqual({ name: 'Jahr', value: 'Unbekannt', inline: true });
      expect(embed.description).toBeUndefined();
    });

    it('truncates an overlong title and description to the Discord limits', () => {
      const longTitle = 'A'.repeat(300);
      const longOverview = 'B'.repeat(5000);

      const embed = buildRequestEmbed(makeRequest({ title: longTitle }), { overview: longOverview });

      expect(embed.title.length).toBe(256);
      expect(embed.title.endsWith('…')).toBe(true);
      // Business rule caps the description preview well below Discord's hard 4096 limit.
      expect(embed.description.length).toBeLessThanOrEqual(300);
      expect(embed.description.endsWith('…')).toBe(true);
    });

    it('truncates an overlong field value (username)', () => {
      const longUsername = 'c'.repeat(2000);
      const embed = buildRequestEmbed(makeRequest({ username: longUsername }), {});

      const field = embed.fields.find(f => f.name === 'Angefragt von');
      expect(field.value.length).toBe(1024);
    });
  });

  describe('buildTestEmbed', () => {
    it('builds the fixed "Testnachricht von Vanta" embed', () => {
      const embed = buildTestEmbed();
      expect(embed.title).toBe('Testnachricht von Vanta');
      expect(typeof embed.timestamp).toBe('string');
    });
  });

  describe('isAllowedWebhookUrl', () => {
    it('allows discord.com webhook URLs', () => {
      expect(isAllowedWebhookUrl('https://discord.com/api/webhooks/123/abc')).toBe(true);
    });

    it('allows discordapp.com webhook URLs', () => {
      expect(isAllowedWebhookUrl('https://discordapp.com/api/webhooks/123/abc')).toBe(true);
    });

    it('rejects non-Discord hosts', () => {
      expect(isAllowedWebhookUrl('https://evil.example.com/api/webhooks/123/abc')).toBe(false);
    });

    it('rejects http (non-https) URLs', () => {
      expect(isAllowedWebhookUrl('http://discord.com/api/webhooks/123/abc')).toBe(false);
    });

    it('rejects a Discord host with a non-webhook path', () => {
      expect(isAllowedWebhookUrl('https://discord.com/some/other/path')).toBe(false);
    });

    it('rejects malformed input without throwing', () => {
      expect(isAllowedWebhookUrl('not-a-url')).toBe(false);
      expect(isAllowedWebhookUrl(undefined)).toBe(false);
    });
  });

  describe('sendWebhookEmbed', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('posts the embed and reports ok/status', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });

      const result = await sendWebhookEmbed('https://discord.com/api/webhooks/1/abc', { title: 'x' });

      expect(result).toEqual({ ok: true, status: 204 });
      expect(global.fetch).toHaveBeenCalledWith('https://discord.com/api/webhooks/1/abc', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }));
    });

    it('never throws when the network request fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

      const result = await sendWebhookEmbed('https://discord.com/api/webhooks/1/abc', { title: 'x' });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('network down');
    });
  });

  describe('sendRequestCreated', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('does not send when the webhook is disabled', async () => {
      AppSettingsService.get.mockImplementation((key) => {
        if (key === 'discord_webhook_enabled') return 'false';
        if (key === 'discord_webhook_url') return 'https://discord.com/api/webhooks/1/abc';
        return null;
      });
      global.fetch = vi.fn();

      await sendRequestCreated(makeRequest(), {});

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does not send when no URL is configured', async () => {
      AppSettingsService.get.mockImplementation((key) => {
        if (key === 'discord_webhook_enabled') return 'true';
        if (key === 'discord_webhook_url') return null;
        return null;
      });
      global.fetch = vi.fn();

      await sendRequestCreated(makeRequest(), {});

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('sends the embed when enabled and a URL is configured', async () => {
      AppSettingsService.get.mockImplementation((key) => {
        if (key === 'discord_webhook_enabled') return 'true';
        if (key === 'discord_webhook_url') return 'https://discord.com/api/webhooks/1/abc';
        return null;
      });
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });

      await sendRequestCreated(makeRequest(), { overview: 'test' });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch.mock.calls[0][0]).toBe('https://discord.com/api/webhooks/1/abc');
    });

    it('never throws when the send fails, even on an unexpected error', async () => {
      AppSettingsService.get.mockImplementation(() => {
        throw new Error('settings unavailable');
      });

      await expect(sendRequestCreated(makeRequest(), {})).resolves.toBeUndefined();
    });
  });
});
