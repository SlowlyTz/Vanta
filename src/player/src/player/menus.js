import { createQualityController } from '../quality.js';
import { createSubtitleController } from '../subtitles.js';
import { createAudioController } from '../audio.js';
import { formatEpisodeCode, findEpisode } from '../episodes.js';
import { createSettingsFlyout } from '../settings/flyout.js';
import { createPartyCard } from '../settings/partyCard.js';
import { renderEpisodesPage, renderOptionsPage, renderParticipantsPage, renderSleepTimerPage, renderSubtitlesPage } from '../settings/pages.js';
import { SLEEP_PRESETS, CUSTOM_MINUTES_MIN, CUSTOM_MINUTES_MAX } from '../sleepTimer.js';
import { bindNextEpisode } from './nextEpisodeBinding.js';
import { cancelUnusedPlayback } from './lifecycle.js';
import { MAX_PARTY_MEMBERS } from '../../../public/js/shared/watchParty.js';

const SYNC_REFRESH_MS = 1_000;

const ROW_ICONS = {
  subtitles: '<svg viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z"/></svg>',
  quality: '<svg viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm7-1a1 1 0 0 1-1 1h-4V9h4a1 1 0 0 1 1 1v4zm-3.5-.5h2v-3h-2v3z"/></svg>',
  episodes: '<svg viewBox="0 0 24 24"><path d="M4 6h2v2H4V6zm0 5h2v2H4v-2zm0 5h2v2H4v-2zm4-10h12v2H8V6zm0 5h12v2H8v-2zm0 5h12v2H8v-2z"/></svg>',
  audio: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9v7a2 2 0 0 0 2 2h3v-8H5v-1a7 7 0 0 1 14 0v1h-3v8h3a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9z"/></svg>',
  help: '<svg viewBox="0 0 24 24"><path d="M11 18h2v-2h-2v2zm1-16a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm0-14a4 4 0 0 0-4 4h2a2 2 0 1 1 4 0c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5a4 4 0 0 0-4-4z"/></svg>',
  sleep: '<svg viewBox="0 0 24 24"><path d="M12.3 2a10 10 0 1 0 9.7 12.6A8 8 0 0 1 12.3 2z"/></svg>',
  participants: '<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5 1.34 3.5 3 3.5zM8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11zm0 2c-2.67 0-5 1.34-5 3v2h10v-2c0-1.66-2.33-3-5-3zm8 0c-.31 0-.62.02-.91.06 1.18.84 1.91 1.95 1.91 3.19V18h4v-2c0-1.66-2.33-3-5-3z"/></svg>'
};

export function bindMenus(context) {
  const { root, player, reporter, watchParty, episodeBrowser, dom, ui } = context;

  const shell = root.querySelector('.vanta-player-shell');

  // Quality and audio track both swap the running stream for another one at
  // the same position. Only the latest choice counts: one still resolving
  // when another is made is dropped and its play session given back.
  let switchRun = 0;
  const switchStream = async ({ resolveOptions, label, failureNotice, onSuccess }) => {
    const currentPlayback = context.sourceSwitch.getCurrentPlayback();
    if (!currentPlayback) return;
    const run = ++switchRun;
    try {
      const playback = await context.resolvePlayback('auto', {
        ...resolveOptions,
        replacesPlaySessionId: currentPlayback.playSessionId
      });
      if (context.destroyed) return;
      if (run !== switchRun) {
        cancelUnusedPlayback(context, playback);
        return;
      }
      const result = await context.sourceSwitch.switchTo(playback, {
        position: context.sourceSwitch.captureState().position,
        shouldPlay: context.sourceSwitch.getIntendsToPlay(),
        label
      });
      if (context.destroyed) return;
      if (!result?.success) {
        // The old stream plays again: the menu says so, too.
        context.updateMenus(context.sourceSwitch.getCurrentPlayback() || currentPlayback);
        context.showNotice?.(failureNotice);
        return;
      }
      context.updateMenus(playback);
      onSuccess?.();
    } catch (error) {
      if (!context.destroyed && run === switchRun && !context.handleFatalPlaybackError(error)) context.showError(error.message);
    }
  };

  const qualityMenu = watchParty?.disableQualityMenu
    ? null
    : createQualityController({
        onSelect: profileId => switchStream({
          resolveOptions: { qualityProfile: profileId },
          label: 'Qualität wird gewechselt …',
          failureNotice: 'Qualität konnte nicht gewechselt werden. Die bisherige läuft weiter.'
        })
      });
  context.qualityMenu = qualityMenu;

  // In a watch party the drift loop pulls a new audio stream back onto the
  // timeline. No language is remembered that did not play.
  context.audioMenu = createAudioController({
    onSelect: audioStreamIndex => switchStream({
      resolveOptions: {
        audioStreamIndex,
        mediaSourceId: context.sourceSwitch.getCurrentPlayback()?.mediaSourceId || undefined
      },
      label: 'Tonspur wird gewechselt …',
      failureNotice: 'Tonspur konnte nicht gewechselt werden. Die bisherige läuft weiter.',
      onSuccess: () => context.preferences?.update({ audioLanguage: context.audioMenu.getCurrentLanguage() })
    })
  });

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
    syncHeader = createPartyCard(watchParty);
    return syncHeader.element;
  });

  settings.setRows(() => [
    { page: 'subtitles', label: 'Untertitel', value: context.subtitleMenu.getCurrentLabel(), icon: ROW_ICONS.subtitles },
    { page: 'audio', label: 'Tonspur', value: context.audioMenu.getCurrentLabel(), icon: ROW_ICONS.audio, hidden: !context.audioMenu.hasChoices() },
    { page: 'quality', label: 'Qualität', value: qualityMenu?.getCurrentLabel() || '', icon: ROW_ICONS.quality, hidden: !qualityMenu },
    { page: 'episodes', label: 'Folgen', value: currentEpisodeCode(), icon: ROW_ICONS.episodes, hidden: !episodeBrowser?.enabled },
    {
      page: 'participants',
      label: 'Teilnehmer',
      value: `${watchParty?.participants?.length || 0}/${MAX_PARTY_MEMBERS}`,
      icon: ROW_ICONS.participants,
      hidden: !watchParty?.enabled
    },
    { page: 'sleep', label: 'Sleep-Timer', value: context.sleepTimer?.label() || '', icon: ROW_ICONS.sleep, hidden: !context.sleepTimer },
    { id: 'help', label: 'Hilfe', value: 'Tasten & Gesten', icon: ROW_ICONS.help, onSelect: () => context.openHelp?.() }
  ]);

  // Size and background of the subtitles, on the player root so the caption
  // styles can pick them up; remembered with the other preferences.
  const subtitleStyle = () => {
    const prefs = context.preferences?.get() || {};
    return { size: prefs.subtitleSize || 'medium', background: prefs.subtitleBackground || 'semi' };
  };
  context.applySubtitleStyle = (patch = {}) => {
    const next = { ...subtitleStyle(), ...patch };
    root.dataset.subtitleSize = next.size;
    root.dataset.subtitleBackground = next.background;
    if (Object.keys(patch).length) {
      context.preferences?.update({ subtitleSize: next.size, subtitleBackground: next.background });
    }
  };
  context.applySubtitleStyle();

  settings.registerPage('subtitles', {
    title: 'Untertitel',
    render: (body, flyout) => renderSubtitlesPage(body, {
      options: context.subtitleMenu.getOptions(),
      onSelect: id => context.selectSubtitle(id),
      style: subtitleStyle(),
      onStyleChange: patch => context.applySubtitleStyle(patch)
    }, flyout)
  });

  settings.registerPage('audio', {
    title: 'Tonspur',
    render: (body, flyout) => renderOptionsPage(body, {
      options: context.audioMenu.getOptions(),
      onSelect: index => context.audioMenu.select(index),
      emptyLabel: 'Nur eine Tonspur'
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

  if (context.sleepTimer) {
    const sleepTimer = context.sleepTimer;
    const isEpisode = Boolean(episodeBrowser?.enabled);
    settings.registerPage('sleep', {
      title: 'Sleep-Timer',
      render: (body, flyout) => renderSleepTimerPage(body, {
        presets: SLEEP_PRESETS,
        current: sleepTimer.mode() === 'off' ? 'off' : sleepTimer.mode() === 'end' ? 'end' : null,
        endLabel: isEpisode ? 'Bis zum Ende der Folge' : 'Bis zum Ende des Films',
        customMin: CUSTOM_MINUTES_MIN,
        customMax: CUSTOM_MINUTES_MAX,
        onSelect: id => {
          const preset = SLEEP_PRESETS.find(entry => entry.id === id);
          if (id === 'off') sleepTimer.cancel();
          else if (id === 'end') sleepTimer.set({ mode: 'end' });
          else if (preset?.minutes) sleepTimer.set({ mode: 'duration', remainingMs: preset.minutes * 60_000 });
        },
        onCustom: minutes => sleepTimer.set({ mode: 'duration', remainingMs: minutes * 60_000 })
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

  bindNextEpisode(context);

  // A choice by the viewer is remembered (by language, so the next episode
  // picks the matching track); automatic selections are not.
  const rememberSubtitle = () => {
    context.preferences?.update({ subtitleLanguage: context.subtitleMenu.getCurrentLanguage() });
  };
  context.selectSubtitle = id => {
    context.subtitleMenu.select(id);
    rememberSubtitle();
  };
  context.toggleSubtitles = () => {
    context.subtitleMenu.toggle();
    rememberSubtitle();
  };

  context.updateMenus = (playback, options = {}) => {
    qualityMenu?.update(playback.quality?.profiles, playback.quality?.current);
    context.audioMenu.update(playback.audioTracks, playback.audioStreamIndex);
    context.subtitleMenu.update(playback, {
      preserveSelection: options.preserveSubtitleSelection !== false,
      preferredLanguage: context.preferences?.get().subtitleLanguage || null
    });
    settings.refresh();
  };

  return context;
}
