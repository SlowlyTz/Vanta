import { createInlineLoadingWatch } from './inlineLoading.js';
import { createJellyfinReporter } from '../jellyfinReporter.js';
import { enterInlineFullscreen } from '../platform.js';
import {
  isSmartphone,
  isLandscape,
  enterSmartphoneFullscreen,
  createOrientationGate
} from '../orientation.js';

export function bindReporterAndOrientation(context) {
  const { root, iosLike, player, reportPlayback, itemId, dom } = context;

  context.reporter = createJellyfinReporter({
    player,
    itemId,
    report: reportPlayback
  });

  context.isPhone = isSmartphone();
  context.phoneOrientationActive = context.isPhone;
  context.gateActive = false;

  const orientationGate = createOrientationGate({
    root,
    onEnter: async () => {
      try {
        if (iosLike) enterInlineFullscreen(root);
        await enterSmartphoneFullscreen({ root, onError: () => {} });
        if (isLandscape()) {
          context.hideOrientationGate();
        }
      } catch {
        // remain in gate state
      }
    }
  });
  context.orientationGate = orientationGate;

  context.showOrientationGate = () => {
    context.gateActive = true;
    orientationGate.show();
    player.paused = true;
    context.sourceSwitch.setIntendsToPlay(false);
  };

  context.hideOrientationGate = () => {
    context.gateActive = false;
    orientationGate.hide();
    if (iosLike) {
      enterInlineFullscreen(root);
      context.updateFullscreenIcon();
    }
    context.sourceSwitch.setIntendsToPlay(true);
    player.play().catch(() => {});
  };

  context.handleOrientationChange = () => {
    if (!context.phoneOrientationActive) return;
    if (isLandscape()) {
      context.hideOrientationGate();
    } else {
      context.showOrientationGate();
    }
  };

  context.setLoading = (visible, status) => {
    if (status) dom.loadingStatus.textContent = status;
    dom.loading.classList.toggle('is-hidden', !visible);
    context.loadIndicator?.setCoverVisible(visible);
  };

  context.setLoadingStatus = status => {
    if (status) dom.loadingStatus.textContent = status;
  };

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
