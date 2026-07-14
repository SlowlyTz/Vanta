import { createTrailerScrollerContext } from './trailer-scroller/context.js';
import { bindHashState } from './trailer-scroller/hashState.js';
import { bindShareModal } from './trailer-scroller/shareModal.js';
import { bindSlideRenderer } from './trailer-scroller/slideRenderer.js';
import { bindPlayback } from './trailer-scroller/playback.js';
import { bindDataLoading } from './trailer-scroller/dataLoading.js';
import { bindGestures } from './trailer-scroller/gestures.js';
import { bindInit } from './trailer-scroller/init.js';

export default function TrailerScrollerPage() {
  const ctx = createTrailerScrollerContext();

  bindHashState(ctx);
  bindShareModal(ctx);
  bindSlideRenderer(ctx);
  bindPlayback(ctx);
  bindDataLoading(ctx);
  bindGestures(ctx);
  bindInit(ctx);

  ctx.showLoadingState();
  ctx.updateChrome();
  ctx.init();

  return ctx.container;
}
