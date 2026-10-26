// Trailer scroller page: wires the trailer-scroller modules onto one shared context.
import { createTrailerScrollerContext } from './trailer-scroller/context.js';
import { bindHashState } from './trailer-scroller/hashState.js';
import { bindShareModal } from './trailer-scroller/shareModal.js';
import { bindSlideRenderer } from './trailer-scroller/slideRenderer.js';
import { bindPlayback } from './trailer-scroller/playback.js';
import { bindDataLoading } from './trailer-scroller/dataLoading.js';
import { bindGestures } from './trailer-scroller/gestures.js';
import { bindInit } from './trailer-scroller/init.js';
import { resolvePageScope } from '../utils/pageScope.js';

export default function TrailerScrollerPage(params, pageScope) {
  const ctx = createTrailerScrollerContext();
  resolvePageScope(pageScope).onLeave(() => ctx.cleanup());

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
