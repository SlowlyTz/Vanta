export function createSwitchTo(state) {
  return async function switchTo(playback, options = {}) {
    const previousPlayback = state.currentPlayback;
    const rollbackState = state.captureState();
    try {
      await state.loadPlayback(playback, options);
      return { success: true };
    } catch (error) {
      if (previousPlayback && previousPlayback !== state.currentPlayback && !options.noRollback) {
        try {
          await state.loadPlayback(previousPlayback, {
            ...options,
            position: rollbackState.position,
            shouldPlay: rollbackState.shouldPlay,
            label: 'Vorherige Quelle wird wiederhergestellt …'
          });
          return { success: false, error, rolledBack: true };
        } catch (rollbackError) {
          return { success: false, error, rollbackError };
        }
      }
      throw error;
    }
  };
}
