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
  context.orientationLocked = false;
  context.gateActive = false;

  const orientationGate = createOrientationGate({
    root,
    onEnter: async () => {
      try {
        if (iosLike) enterInlineFullscreen(root);
        await enterSmartphoneFullscreen({ root, onError: () => {} });
        context.orientationLocked = true;
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

  context.clearWaitingTimer = () => {
    if (!context.waitingTimer) return;
    window.clearTimeout(context.waitingTimer);
    context.waitingTimer = null;
  };

  context.setLoading = (visible, status) => {
    if (status) dom.loadingStatus.textContent = status;
    dom.loading.classList.toggle('is-hidden', !visible);
  };

  context.setLoadingStatus = status => {
    if (status) dom.loadingStatus.textContent = status;
  };

  context.setInlineLoading = visible => {
    if (visible && !dom.loading.classList.contains('is-hidden')) return;
    dom.inlineLoading.hidden = !visible;
  };

  context.hideError = () => {
    dom.error.hidden = true;
  };

  context.showError = message => {
    context.clearWaitingTimer();
    context.sourceSwitch.clearSeekTimer();
    context.setLoading(false);
    context.setInlineLoading(false);
    context.ui.setState('error');
    dom.errorMessage.textContent = message || 'Der Medienstrom konnte nicht wiedergegeben werden.';
    dom.error.hidden = false;
  };

  return context;
}
