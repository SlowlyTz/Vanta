import { exitPictureInPicture, enterInlineFullscreen } from '../platform.js';
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
      showError: context.showError
    },
    onBeforeSourceChange: () => {
      exitPictureInPicture().catch(() => {});
    }
  });

  if (isPhone) {
    root.classList.add('is-smartphone');
    if (iosLike) {
      enterInlineFullscreen(root);
      context.updateFullscreenIcon();
    }
  }

  return context;
}
