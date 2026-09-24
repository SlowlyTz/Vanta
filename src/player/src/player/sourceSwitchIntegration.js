import { exitPictureInPicture, enterInlineFullscreen } from '../platform.js';
import { isLandscape, enterSmartphoneFullscreen } from '../orientation.js';
import { createSourceSwitch } from '../sourceSwitch.js';

export function bindSourceSwitchIntegration(context) {
  const { root, iosLike, player, reporter, ui, isPhone } = context;

  context.sourceSwitch = createSourceSwitch({
    player,
    reporter,
    ui,
    callbacks: {
      setLoading: context.setLoading,
      setLoadingStatus: context.setLoadingStatus,
      // Hiding goes through the loading watch while it runs, so a seek
      // does not drop the spinner before playback really goes on.
      setInlineLoading: visible => {
        if (!visible && context.inlineLoading?.isActive()) context.inlineLoading.check();
        else context.setInlineLoading(visible);
      },
      showError: context.showError,
      hideError: context.hideError
    },
    onBeforeSourceChange: () => {
      exitPictureInPicture().catch(() => {});
    },
    shouldPreventPlayback: () => context.gateActive
  });

  if (isPhone) {
    root.classList.add('is-smartphone');
    if (iosLike) {
      enterInlineFullscreen(root);
      context.updateFullscreenIcon();
    }
    context.listen(window, 'orientationchange', context.handleOrientationChange);

    (async () => {
      try {
        await enterSmartphoneFullscreen({ root, onError: () => {} });
        context.orientationLocked = true;
        if (!isLandscape()) {
          context.showOrientationGate();
        }
      } catch {
        context.showOrientationGate();
      }
    })();
  }

  return context;
}
