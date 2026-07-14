import 'vidstack/define/media-player.js';
import 'vidstack/define/media-outlet.js';
import 'vidstack/define/media-play-button.js';
import 'vidstack/define/media-seek-button.js';
import 'vidstack/define/media-time-slider.js';
import 'vidstack/define/media-time.js';
import 'vidstack/define/media-mute-button.js';
import 'vidstack/define/media-volume-slider.js';
import 'vidstack/define/media-fullscreen-button.js';
import 'vidstack/define/media-pip-button.js';
import 'vidstack/define/media-gesture.js';
import 'vidstack/define/media-captions.js';
import 'vidstack/styles/defaults.css';
import './player.css';

import { createPlayerContext } from './player/context.js';
import { bindFullscreenControls } from './player/fullscreenControls.js';
import { bindReporterAndOrientation } from './player/reporterAndOrientation.js';
import { bindSourceSwitchIntegration } from './player/sourceSwitchIntegration.js';
import { bindMenus } from './player/menus.js';
import { bindPlayerEvents } from './player/eventBindings.js';
import { preparePlayerInitialPlayback, createPlayerController } from './player/lifecycle.js';

export async function mountVantaPlayer(options) {
  const context = await createPlayerContext(options);
  bindFullscreenControls(context);
  bindReporterAndOrientation(context);
  bindSourceSwitchIntegration(context);
  bindMenus(context);
  bindPlayerEvents(context);
  await preparePlayerInitialPlayback(context);
  return createPlayerController(context);
}
