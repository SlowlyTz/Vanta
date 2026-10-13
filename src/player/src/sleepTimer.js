import { findOutro } from './segments.js';

// Sleep timer: closes the player after a set playback time, or at the end of
// the film / episode (when its credits begin, or at the end of the file
// without detected credits). Only playback time counts, a pause holds the
// timer. One minute before, a notice counts down and offers to cancel. It is
// not offered in a watch party.

export const SLEEP_WARNING_MS = 60 * 1000;
const TICK_MS = 1_000;
export const CUSTOM_MINUTES_MIN = 1;
export const CUSTOM_MINUTES_MAX = 480;

export const SLEEP_PRESETS = [
  { id: 'off', label: 'Aus' },
  { id: '15', label: '15 Min.', minutes: 15 },
  { id: '30', label: '30 Min.', minutes: 30 },
  { id: '60', label: '1 Std.', minutes: 60 },
  { id: '120', label: '2 Std.', minutes: 120 },
  { id: 'end', label: 'Bis zum Ende' }
];

export function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function formatRemaining(ms) {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  if (minutes < 60) return `noch ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `noch ${hours} Std. ${rest} Min.` : `noch ${hours} Std.`;
}

// The timing alone. `getEndMs` answers how much playback is left until the
// end point ("bis zum Ende").
export function createSleepTimerCore({ getEndMs, initial = null }) {
  let mode = 'off';
  let remainingMs = 0;

  const core = {
    set(next) {
      if (next?.mode === 'duration' && Number(next.remainingMs) > 0) {
        mode = 'duration';
        remainingMs = Number(next.remainingMs);
      } else if (next?.mode === 'end') {
        mode = 'end';
      } else {
        mode = 'off';
      }
    },
    cancel() { mode = 'off'; },
    mode: () => mode,
    // One second of time passed; only playback moves a set duration on.
    tick(playing, ms = TICK_MS) {
      if (mode === 'duration' && playing) remainingMs = Math.max(0, remainingMs - ms);
    },
    remainingMs() {
      if (mode === 'duration') return remainingMs;
      if (mode === 'end') {
        const left = Number(getEndMs());
        return Number.isFinite(left) ? Math.max(0, left) : Infinity;
      }
      return Infinity;
    },
    phase() {
      if (mode === 'off') return 'off';
      const left = core.remainingMs();
      if (left <= 0) return 'done';
      return left <= SLEEP_WARNING_MS ? 'warning' : 'running';
    },
    state: () => (mode === 'duration' ? { mode, remainingMs } : { mode })
  };
  core.set(initial);
  return core;
}

export function bindSleepTimer(context, { setTimer = (fn, ms) => window.setInterval(fn, ms), clearTimer = id => window.clearInterval(id) } = {}) {
  const { root, player } = context;
  const options = context.sleepTimerOptions || {};
  if (context.watchParty?.enabled) return null;

  // The end point: the start of the credits, else the end of the file.
  const endSeconds = () => {
    const duration = Number(context.knownDuration || player.duration);
    const outro = findOutro(context.segments);
    const outroStart = Number(outro?.startMs) / 1000;
    if (Number.isFinite(outroStart) && Number.isFinite(duration) && outroStart >= duration * 0.5 && outroStart < duration) return outroStart;
    return duration;
  };
  const core = createSleepTimerCore({
    initial: options.initial,
    getEndMs: () => (endSeconds() - Number(player.currentTime)) * 1000
  });

  const notice = document.createElement('div');
  notice.className = 'vanta-sleep-notice';
  notice.setAttribute('role', 'status');
  notice.hidden = true;
  notice.innerHTML = `
    <span class="vanta-sleep-notice-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12.3 2a10 10 0 1 0 9.7 12.6A8 8 0 0 1 12.3 2z"/></svg></span>
    <span class="vanta-sleep-notice-text">Der Player wird in <strong>1:00</strong> geschlossen</span>
    <button type="button" class="vanta-sleep-notice-cancel">Abbrechen</button>`;
  (root.querySelector('.vanta-player-shell') || root).appendChild(notice);
  const countdown = notice.querySelector('strong');
  const cancelButton = notice.querySelector('.vanta-sleep-notice-cancel');
  notice.addEventListener('click', event => event.stopPropagation());
  notice.addEventListener('pointerup', event => event.stopPropagation());

  let fired = false;
  let lastLabel = null;
  const changed = () => {
    options.onChange?.(core.state());
    const label = timer.label();
    if (label !== lastLabel) {
      lastLabel = label;
      if (context.settings?.currentPage?.() === 'root') context.settings.refresh();
    }
  };

  const render = () => {
    const warning = core.phase() === 'warning';
    if (warning && notice.hidden) {
      notice.hidden = false;
      // Takes the focus only from the controls of a keyboard user, never on a
      // TV (the remote reaches it with up/down) or over an open menu.
      const menuOpen = context.settingsOpen || context.helpOpen || context.stillWatchingOpen;
      if (!context.tvMode && !menuOpen && document.activeElement?.closest?.('.vanta-player-controls-layer')) cancelButton.focus({ preventScroll: true });
    } else if (!warning) {
      notice.hidden = true;
    }
    if (warning) countdown.textContent = formatCountdown(core.remainingMs());
  };

  const fire = () => {
    if (fired) return;
    fired = true;
    notice.hidden = true;
    player.pause();
    (context.onSleep || context.onBack)?.();
  };

  const timer = {
    set(next) {
      core.set(next);
      fired = false;
      render();
      changed();
    },
    cancel() {
      core.cancel();
      render();
      changed();
    },
    mode: core.mode,
    // Until the end the next episode is not started.
    blocksNextEpisode: () => core.mode() === 'end',
    label() {
      if (core.mode() === 'off') return 'Aus';
      if (core.mode() === 'end') return 'Bis zum Ende';
      return formatRemaining(core.remainingMs());
    },
    core
  };
  context.sleepTimer = timer;

  cancelButton.addEventListener('click', () => timer.cancel());

  const interval = setTimer(() => {
    if (context.destroyed || core.mode() === 'off') return;
    core.tick(!player.paused);
    if (core.phase() === 'done') fire();
    else render();
    changed();
  }, TICK_MS);
  context.disposers.push(() => clearTimer(interval));
  // "Bis zum Ende" also when the file ends before the planned end point (a
  // shorter file than its stated duration).
  const onEnded = () => {
    if (core.mode() === 'end') fire();
  };
  player.addEventListener('ended', onEnded);
  context.disposers.push(() => player.removeEventListener('ended', onEnded));
  render();

  return timer;
}
