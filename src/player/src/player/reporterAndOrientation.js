import { createInlineLoadingWatch } from './inlineLoading.js';
import { createJellyfinReporter } from '../jellyfinReporter.js';
import { isSmartphone } from '../orientation.js';
import { createLoadingCover } from './loadingCover.js';

export function bindReporterAndOrientation(context) {
  const { player, reportPlayback, itemId, dom } = context;

  context.reporter = createJellyfinReporter({
    player,
    itemId,
    report: reportPlayback
  });

  context.isPhone = isSmartphone();

  const loadingCover = createLoadingCover({ dom, getLoadIndicator: () => context.loadIndicator });
  context.disposers.push(loadingCover.dispose);
  context.setLoading = loadingCover.setVisible;
  context.setLoadingStatus = loadingCover.setStatus;

  context.setInlineLoading = visible => {
    if (visible && !dom.loading.classList.contains('is-hidden')) return;
    dom.inlineLoading.hidden = !visible;
    context.loadIndicator?.setInlineVisible(visible);
  };

  context.inlineLoading = createInlineLoadingWatch({
    getVideo: () => context.player.querySelector?.('video') || null,
    getBufferedAhead: () => context.getBufferedAhead?.(),
    isSwitching: () => context.sourceSwitch?.isSwitching() === true,
    setVisible: context.setInlineLoading,
    setSlow: slow => context.loadIndicator?.setSlow(slow)
  });
  context.disposers.push(() => context.inlineLoading.end());

  context.showError = () => {
    context.sourceSwitch.clearSeekTimer();
    context.inlineLoading.end();
    context.setInlineLoading(false);
    context.ui.setState('buffering');
    context.setLoading(true, 'Stream wird geladen …');
  };

  return context;
}
