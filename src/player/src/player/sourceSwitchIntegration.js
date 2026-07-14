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
      setInlineLoading: context.setInlineLoading,
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
