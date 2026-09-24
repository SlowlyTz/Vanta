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
import { bindSourceSwitchIntegration } from './player/sourceSwitchIntegration.js';
import { bindMenus } from './player/menus.js';
import { bindPlayerEvents } from './player/eventBindings.js';
import { bindSyncControls } from './player/syncControls.js';
import { bindTransportControls } from './player/transportControls.js';
import { bindTouchTaps } from './player/touchTaps.js';
import { bindShortcuts } from './player/shortcuts.js';
import { createMediaSession } from './mediaSession.js';
import { preparePlayerInitialPlayback, createPlayerController } from './player/lifecycle.js';

export async function mountVantaPlayer(options) {
  const context = await createPlayerContext(options);
  bindFullscreenControls(context);
  bindReporterAndOrientation(context);
  bindSourceSwitchIntegration(context);
  bindMenus(context);
  bindPlayerEvents(context);
  bindTransportControls(context);
  bindTouchTaps(context);
  bindShortcuts(context);
  context.mediaSession = createMediaSession(context);
  bindSyncControls(context);
  await preparePlayerInitialPlayback(context);
  return createPlayerController(context);
}
