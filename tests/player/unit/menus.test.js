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
    expect(labels).toEqual(['Untertitel', 'Qualität', 'Folgen']);
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

    expect([...env.root.querySelectorAll('.vanta-settings-row-label')].map(label => label.textContent)).toEqual(['Untertitel', 'Teilnehmer']);
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
});
