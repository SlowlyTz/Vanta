import { describe, it, expect, vi, afterEach } from 'vitest';
import { createPlayerMarkup } from '../../../src/player/src/player/markup.js';
import { createPlayerUi } from '../../../src/player/src/ui/playerUi.js';
import { bindMenus } from '../../../src/player/src/player/menus.js';

function setup({ watchParty = null, episodeBrowser = null } = {}) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const dom = createPlayerMarkup(root, { title: 'Dark', subtitle: 'S1 · F3 · Pilot', poster: '' });
  const context = {
    root,
    dom,
    player: dom.player,
    reporter: { setSubtitleStreamIndex: vi.fn() },
    watchParty,
    episodeBrowser,
    ui: createPlayerUi(root),
    disposers: [],
    destroyed: false,
    refreshWatchPartyControlAccess: vi.fn(),
    resolvePlayback: vi.fn(),
    showError: vi.fn(),
    sourceSwitch: { getCurrentPlayback: () => null }
  };
  bindMenus(context);
  return { root, context, dom };
}

let env;
afterEach(() => {
  env?.context.settings.destroy();
  env?.context.disposers.forEach(dispose => dispose());
  env?.root.remove();
  env = null;
});

describe('bindMenus', () => {
  it('bündelt alles hinter dem Zahnrad und baut auch den Hinweis zur nächsten Folge', () => {
    env = setup({
      episodeBrowser: { enabled: true, readonly: false, context: { currentEpisodeId: 'e1', seasons: [], episodesBySeason: {} }, onSelectEpisode: vi.fn() }
    });

    expect(env.dom.settingsButton.hidden).toBe(false);
    expect(env.context.nextEpisodePrompt).toBeTruthy();
    expect(env.root.querySelectorAll('.vanta-player-menu-button')).toHaveLength(0);

    env.context.updateMenus({ quality: { profiles: [{ id: 'auto' }, { id: '720p', label: '720p' }], current: 'auto' }, subtitles: [] });
    env.dom.settingsButton.click();
    const labels = [...env.root.querySelectorAll('.vanta-settings-row-label')].map(label => label.textContent);
    expect(labels).toEqual(['Untertitel', 'Qualität', 'Folgen', 'Hilfe']);
    // A single audio track needs no row.
    expect(env.root.querySelector('.vanta-settings-row[data-page="audio"]')).toBeNull();
  });

  it('zeigt in der Watch Party Sync-Status und Teilnehmer, aber keine Qualität', () => {
    const watchParty = {
      enabled: true,
      disableQualityMenu: true,
      currentUserId: 'u1',
      participants: [{ userId: 'u1', username: 'A', role: 'owner', connected: true }],
      getSyncStatus: () => ({ kind: 'sync', label: 'Synchron · ±40 ms' }),
      onResync: vi.fn()
    };
    env = setup({ watchParty });
    env.dom.settingsButton.click();

    expect([...env.root.querySelectorAll('.vanta-settings-row-label')].map(label => label.textContent)).toEqual(['Untertitel', 'Teilnehmer', 'Hilfe']);
    expect(env.root.querySelector('.vanta-settings-sync-label').textContent).toBe('Synchron · ±40 ms');
    env.root.querySelector('.vanta-settings-sync-button').click();
    expect(watchParty.onResync).toHaveBeenCalled();
  });

  it('meldet das offene Flyout (für die Tastenkürzel) und hält die Controls', () => {
    env = setup();
    env.dom.settingsButton.click();
    expect(env.context.settingsOpen).toBe(true);
    expect(env.context.ui.isHeld()).toBe(true);

    env.dom.settingsButton.click();
    expect(env.context.settingsOpen).toBe(false);
    expect(env.context.ui.isHeld()).toBe(false);
  });

  it('merkt sich nur selbst gewählte Untertitel, nach Sprache', () => {
    env = setup();
    env.context.preferences = { get: () => ({ subtitleLanguage: 'en' }), update: vi.fn() };
    env.context.updateMenus({ quality: null, subtitles: [{ index: 1, language: 'de', label: 'Deutsch' }, { index: 2, language: 'en', label: 'English' }] }, { preserveSubtitleSelection: false });
    expect(env.context.subtitleMenu.getCurrentLanguage()).toBe('en');
    expect(env.context.preferences.update).not.toHaveBeenCalled();

    env.context.selectSubtitle('vanta-subtitle-1');
    expect(env.context.preferences.update).toHaveBeenLastCalledWith({ subtitleLanguage: 'de' });
    env.context.toggleSubtitles();
    expect(env.context.preferences.update).toHaveBeenLastCalledWith({ subtitleLanguage: null });
  });

  it('setzt die Untertitel-Darstellung am Player und merkt sie sich', () => {
    env = setup();
    const update = vi.fn();
    env.context.preferences = { get: () => ({ subtitleSize: 'small', subtitleBackground: 'solid' }), update };
    env.context.applySubtitleStyle();
    expect(env.root.dataset.subtitleSize).toBe('small');
    expect(env.root.dataset.subtitleBackground).toBe('solid');
    expect(update).not.toHaveBeenCalled();

    env.context.applySubtitleStyle({ size: 'large' });
    expect(env.root.dataset.subtitleSize).toBe('large');
    expect(update).toHaveBeenCalledWith({ subtitleSize: 'large', subtitleBackground: 'solid' });
  });

  it('zeigt die Tonspur-Zeile bei mehreren Spuren und wechselt den Stream an derselben Stelle', async () => {
    env = setup();
    const playback = {
      quality: null,
      subtitles: [],
      audioStreamIndex: 1,
      audioTracks: [{ index: 1, language: 'eng', label: 'Englisch', isDefault: true }, { index: 2, language: 'ger', label: 'Deutsch' }]
    };
    const switched = { ...playback, audioStreamIndex: 2 };
    env.context.sourceSwitch = {
      getCurrentPlayback: () => playback,
      captureState: () => ({ position: 42 }),
      getIntendsToPlay: () => true,
      switchTo: vi.fn().mockResolvedValue({ success: true })
    };
    env.context.resolvePlayback = vi.fn().mockResolvedValue(switched);
    env.context.preferences = { get: () => ({}), update: vi.fn() };
    env.context.updateMenus(playback);

    env.dom.settingsButton.click();
    const row = env.root.querySelector('.vanta-settings-row[data-page="audio"]');
    expect(row.getAttribute('aria-label')).toBe('Tonspur: Englisch');

    env.context.audioMenu.select(2);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(env.context.resolvePlayback).toHaveBeenCalledWith('auto', { audioStreamIndex: 2 });
    expect(env.context.sourceSwitch.switchTo).toHaveBeenCalledWith(switched, expect.objectContaining({ position: 42, shouldPlay: true }));
    expect(env.context.preferences.update).toHaveBeenCalledWith({ audioLanguage: 'ger' });
  });
});
