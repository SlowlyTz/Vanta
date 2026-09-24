import { createQualityController } from '../quality.js';
import { createSubtitleController } from '../subtitles.js';
import { formatEpisodeCode, findEpisode } from '../episodes.js';
import { createSettingsFlyout } from '../settings/flyout.js';
import { renderEpisodesPage, renderOptionsPage, renderParticipantsPage } from '../settings/pages.js';
import {
  findNextEpisode,
  shouldShowNextEpisodePrompt,
  computeNextEpisodeTimings,
  canStartNextEpisode,
  createNextEpisodeGate
} from '../nextEpisode.js';
import { createNextEpisodePrompt } from '../nextEpisodePrompt.js';
import { NEXT_EPISODE_VIEWER_MESSAGE } from './markup.js';

const MAX_PARTY_MEMBERS = 4;
const SYNC_REFRESH_MS = 1_000;

const ROW_ICONS = {
  subtitles: '<svg viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z"/></svg>',
  quality: '<svg viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm7-1a1 1 0 0 1-1 1h-4V9h4a1 1 0 0 1 1 1v4zm-3.5-.5h2v-3h-2v3z"/></svg>',
  episodes: '<svg viewBox="0 0 24 24"><path d="M4 6h2v2H4V6zm0 5h2v2H4v-2zm0 5h2v2H4v-2zm4-10h12v2H8V6zm0 5h12v2H8v-2zm0 5h12v2H8v-2z"/></svg>',
  participants: '<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5 1.34 3.5 3 3.5zM8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11zm0 2c-2.67 0-5 1.34-5 3v2h10v-2c0-1.66-2.33-3-5-3zm8 0c-.31 0-.62.02-.91.06 1.18.84 1.91 1.95 1.91 3.19V18h4v-2c0-1.66-2.33-3-5-3z"/></svg>'
};

// Sync status line at the top of the flyout in a watch party, kept current
// while the flyout is open.
function createSyncHeader(watchParty) {
  const element = document.createElement('div');
  element.className = 'vanta-settings-sync';
  element.innerHTML = `
    <span class="vanta-settings-sync-dot" aria-hidden="true"></span>
    <span class="vanta-settings-sync-label" role="status"></span>`;
  if (watchParty.onResync) {
    const resync = document.createElement('button');
    resync.type = 'button';
    resync.className = 'vanta-settings-sync-button vanta-settings-focusable';
    resync.textContent = 'Neu synchronisieren';
    resync.addEventListener('click', () => watchParty.onResync());
    element.appendChild(resync);
  }
  const update = () => {
    const status = watchParty.getSyncStatus?.() || { kind: 'preparing', label: 'Wird vorbereitet' };
    element.dataset.status = status.kind;
    element.querySelector('.vanta-settings-sync-label').textContent = status.label;
  };
  update();
  return { element, update };
}

export function bindMenus(context) {
  const { root, player, reporter, watchParty, episodeBrowser, dom, ui } = context;

  const shell = root.querySelector('.vanta-player-shell');
  context.menuOverlayContainer = shell;

  const qualityMenu = watchParty?.disableQualityMenu
    ? null
    : createQualityController({
        onSelect: async profileId => {
          const currentPlayback = context.sourceSwitch.getCurrentPlayback();
          if (!currentPlayback) return;
          try {
            const playback = await context.resolvePlayback('auto', { qualityProfile: profileId });
            if (context.destroyed) return;
            await context.sourceSwitch.switchTo(playback, {
              position: context.sourceSwitch.captureState().position,
              shouldPlay: context.sourceSwitch.getIntendsToPlay(),
              label: 'Qualität wird gewechselt …'
            });
            if (context.destroyed) return;
            context.updateMenus(playback);
          } catch (error) {
            if (!context.destroyed) context.showError(error.message);
          }
        }
      });
  context.qualityMenu = qualityMenu;

  context.subtitleMenu = createSubtitleController({
    player,
    reporter,
    onChange: () => context.settings?.refresh()
  });

  let syncHeader = null;
  let syncTimer = null;
  const pendingBan = { userId: null, refresh: () => context.settings?.refresh() };

  const settings = createSettingsFlyout({
    container: shell,
    button: dom.settingsButton,
    onOpenChange: open => {
      context.settingsOpen = open;
      if (open) {
        ui.holdActive('settings');
        syncTimer = window.setInterval(() => syncHeader?.update(), SYNC_REFRESH_MS);
      } else {
        ui.releaseActive('settings');
        window.clearInterval(syncTimer);
        pendingBan.userId = null;
      }
    }
  });
  context.settings = settings;
  context.disposers.push(() => window.clearInterval(syncTimer));

  const currentEpisodeCode = () => {
    const episode = findEpisode(episodeBrowser?.context, episodeBrowser?.context?.currentEpisodeId);
    return episode ? formatEpisodeCode(episode) : 'Alle Folgen';
  };

  settings.setHeader(() => {
    if (!watchParty?.enabled) return null;
    syncHeader = createSyncHeader(watchParty);
    return syncHeader.element;
  });

  settings.setRows(() => [
    { page: 'subtitles', label: 'Untertitel', value: context.subtitleMenu.getCurrentLabel(), icon: ROW_ICONS.subtitles },
    { page: 'quality', label: 'Qualität', value: qualityMenu?.getCurrentLabel() || '', icon: ROW_ICONS.quality, hidden: !qualityMenu },
    { page: 'episodes', label: 'Folgen', value: currentEpisodeCode(), icon: ROW_ICONS.episodes, hidden: !episodeBrowser?.enabled },
    {
      page: 'participants',
      label: 'Teilnehmer',
      value: `${watchParty?.participants?.length || 0}/${MAX_PARTY_MEMBERS}`,
      icon: ROW_ICONS.participants,
      hidden: !watchParty?.enabled
    }
  ]);

  settings.registerPage('subtitles', {
    title: 'Untertitel',
    render: (body, flyout) => renderOptionsPage(body, {
      options: context.subtitleMenu.getOptions(),
      onSelect: id => context.subtitleMenu.select(id),
      emptyLabel: 'Keine Untertitel verfügbar'
    }, flyout)
  });

  if (qualityMenu) {
    settings.registerPage('quality', {
      title: 'Qualität',
      render: (body, flyout) => renderOptionsPage(body, {
        options: qualityMenu.getOptions(),
        onSelect: id => qualityMenu.select(id)
      }, flyout)
    });
  }

  if (episodeBrowser?.enabled) {
    settings.registerPage('episodes', {
      title: 'Folgen',
      wide: true,
      render: (body, flyout) => renderEpisodesPage(body, {
        context: episodeBrowser.context,
        readonly: Boolean(episodeBrowser.readonly),
        onSelectEpisode: episodeBrowser.onSelectEpisode
      }, flyout)
    });
  }

  if (watchParty?.enabled) {
    settings.registerPage('participants', {
      title: 'Teilnehmer',
      render: body => renderParticipantsPage(body, { watchParty, pendingBan })
    });

    const previousParticipantsChange = watchParty.onParticipantsChange;
    const handleParticipantsChange = () => {
      previousParticipantsChange?.();
      const page = settings.currentPage();
      if (page === 'root' || page === 'participants') settings.refresh();
    };
    watchParty.onParticipantsChange = handleParticipantsChange;
    context.disposers.push(() => {
      if (watchParty.onParticipantsChange === handleParticipantsChange) {
        watchParty.onParticipantsChange = previousParticipantsChange;
      }
    });
  }

  const nextEpisodeGate = createNextEpisodeGate();
  context.nextEpisodeGate = nextEpisodeGate;

  context.nextEpisodePrompt = episodeBrowser?.enabled
    ? createNextEpisodePrompt({
        root: shell,
        onConfirm: next => {
          episodeBrowser.onNextEpisode?.(next);
        },
        onDismiss: () => {
          nextEpisodeGate.markDismissed(episodeBrowser.context?.currentEpisodeId);
        }
      })
    : null;

  context.maybeShowNextEpisodePrompt = () => {
    if (!context.nextEpisodePrompt || !episodeBrowser?.context) return;

    const currentEpisodeId = episodeBrowser.context.currentEpisodeId;
    if (!nextEpisodeGate.shouldTrigger(currentEpisodeId)) return;

    const duration = context.knownDuration || player.duration;
    if (!shouldShowNextEpisodePrompt({ currentTime: player.currentTime, duration })) return;

    const next = findNextEpisode(episodeBrowser.context, currentEpisodeId);
    if (!next) return;

    nextEpisodeGate.markShown(currentEpisodeId);
    const interactive = canStartNextEpisode(watchParty);
    context.nextEpisodePrompt.show(next, {
      interactive,
      message: interactive ? null : NEXT_EPISODE_VIEWER_MESSAGE,
      skipAt: computeNextEpisodeTimings({ duration })?.skipAt,
      getCurrentTime: () => player.currentTime
    });
  };

  context.updateMenus = (playback, options = {}) => {
    qualityMenu?.update(playback.quality?.profiles, playback.quality?.current);
    context.subtitleMenu.update(playback, {
      preserveSelection: options.preserveSubtitleSelection !== false
    });
    settings.refresh();
  };

  return context;
}
