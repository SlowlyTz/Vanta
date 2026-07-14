export const HLS_FRAGMENT_TIMEOUT_MS = 90_000;

export function createSourceSwitchState({
  player,
  reporter,
  ui,
  callbacks: {
    setLoading,
    setLoadingStatus,
    setInlineLoading,
    showError,
    hideError
  },
  onBeforeSourceChange,
  shouldPreventPlayback
}) {
  const state = {
    player,
    reporter,
    ui,
    setLoading,
    setLoadingStatus,
    setInlineLoading,
    showError,
    hideError,
    onBeforeSourceChange,
    shouldPreventPlayback,
    currentPlayback: null,
    switching: false,
    loadVersion: 0,
    lastRequestedPosition: 0,
    intendsToPlay: true,
    autoplayBlocked: false,
    seekTimer: null,
    seekVersion: 0,
    lastSeekTarget: 0
  };

  state.isCurrentLoad = version => version === state.loadVersion;

  state.captureState = () => ({
    position: Math.max(state.reporter.getPosition(), state.lastRequestedPosition),
    shouldPlay: state.intendsToPlay,
    volume: Number(state.player.volume),
    muted: Boolean(state.player.muted),
    playbackRate: Number(state.player.playbackRate) || 1
  });

  state.restoreState = restored => {
    if (Number.isFinite(restored.volume)) state.player.volume = restored.volume;
    if (Number.isFinite(restored.playbackRate) && restored.playbackRate > 0) state.player.playbackRate = restored.playbackRate;
    state.player.muted = Boolean(restored.muted);
  };

  return state;
}

export function createStateAccessors(state) {
  return {
    getCurrentPlayback: () => state.currentPlayback,
    isSwitching: () => state.switching,
    isCurrentLoad: state.isCurrentLoad,
    getAutoplayBlocked: () => state.autoplayBlocked,
    setAutoplayBlocked: value => { state.autoplayBlocked = Boolean(value); },
    getIntendsToPlay: () => state.intendsToPlay,
    setIntendsToPlay: value => { state.intendsToPlay = Boolean(value); },
    getLastRequestedPosition: () => state.lastRequestedPosition,
    setLastRequestedPosition: value => { state.lastRequestedPosition = value; }
  };
}
