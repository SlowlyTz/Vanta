import 'vidstack/define/media-player.js';
import 'vidstack/define/media-outlet.js';
import 'vidstack/define/media-time-slider.js';
import 'vidstack/define/media-slider-value.js';
import 'vidstack/define/media-time.js';
import 'vidstack/define/media-mute-button.js';
import 'vidstack/define/media-volume-slider.js';
import 'vidstack/define/media-fullscreen-button.js';
import 'vidstack/define/media-pip-button.js';
import 'vidstack/define/media-captions.js';
import 'vidstack/styles/defaults.css';
import './player.css';

import { createPlayerContext } from './player/context.js';
import { bindFullscreenControls } from './player/fullscreenControls.js';
import { bindReporterAndOrientation } from './player/reporterAndOrientation.js';
import { bindLoadIndicator } from './player/loadIndicator.js';
import { bindSourceSwitchIntegration } from './player/sourceSwitchIntegration.js';
import { bindMenus } from './player/menus.js';
import { bindPlayerEvents } from './player/eventBindings.js';
import { bindSyncControls } from './player/syncControls.js';
import { bindTimelineWatchdog } from './player/timelineWatchdog.js';
import { bindTransportControls } from './player/transportControls.js';
import { bindTouchTaps } from './player/touchTaps.js';
import { bindShortcuts } from './player/shortcuts.js';
import { bindTvControls } from './player/tvControls.js';
import { createMediaSession } from './mediaSession.js';
import { bindPreferences } from './preferences.js';
import { createHelpOverlay } from './help.js';
import { bindSegments } from './segments.js';
import { bindStillWatching } from './stillWatching.js';
import { bindSleepTimer } from './sleepTimer.js';
import { bindAirPlay } from './airplay.js';
import { preparePlayerInitialPlayback, createPlayerController } from './player/lifecycle.js';

export async function mountVantaPlayer(options) {
  const context = await createPlayerContext(options);
  bindPreferences(context);
  bindFullscreenControls(context);
  bindLoadIndicator(context);
  bindReporterAndOrientation(context);
  bindSourceSwitchIntegration(context);
  bindSleepTimer(context);
  bindMenus(context);
  bindPlayerEvents(context);
  bindTransportControls(context);
  bindTouchTaps(context);
  bindTvControls(context);
  bindShortcuts(context);
  context.mediaSession = createMediaSession(context);
  context.help = createHelpOverlay(context);
  bindSegments(context, { loadSegments: context.loadSegments });
  bindSyncControls(context);
  bindTimelineWatchdog(context);
  bindStillWatching(context);
  bindAirPlay(context);
  // `options.signal`: the page was left while the first source loads (that
  // can take a transcode's start). The controller exists before that wait, so
  // an abort tears the player down at once instead of after the load.
  const ready = preparePlayerInitialPlayback(context);
  const controller = createPlayerController(context);
  const { signal } = options;
  let abort = null;
  // A torn-down source may never report it can play: do not wait for it.
  const aborted = new Promise(resolve => {
    abort = () => { controller.destroy(); resolve(); };
  });
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  try {
    await Promise.race([ready, aborted]);
  } finally {
    signal?.removeEventListener('abort', abort);
  }
  return controller;
}
