// Everything the countdown shows is a pure function of `s`, the seconds since
// the counted part began (negative during the lead-in). `s` comes from the
// server clock on every frame and is never accumulated, so dropped frames or a
// throttled tab cannot stretch the five seconds.

export const LEAD_SECONDS = 0.4;
export const MORPH_SECONDS = 0.3;
export const LOOSEN_FROM = 0.85;
export const DIVE = [4.55, 5.0];
export const FADE = [4.6, 5.0];

const clamp01 = x => Math.min(1, Math.max(0, x));
const progress = ([start, end], s) => clamp01((s - start) / (end - start));
const smooth = x => x * x * (3 - 2 * x);

export function secondsIntoCountdown(startsAtServerTimeMs, nowMs, durationMs = 5000) {
  return durationMs / 1000 - (startsAtServerTimeMs - nowMs) / 1000;
}

export function countdownAt(s, durationMs = 5000) {
  const total = durationMs / 1000;
  const digits = Math.round(total);
  const last = digits - 1;
  const clamped = Math.min(total, Math.max(-LEAD_SECONDS, s));
  const index = Math.min(last, Math.max(0, Math.floor(clamped)));
  const local = clamped < 0 ? 0 : Math.min(1, clamped - index);

  // Particles gather into the first digit during the lead-in.
  const gather = smooth(clamp01((clamped + LEAD_SECONDS) / LEAD_SECONDS));
  const morph = index === 0 ? 1 : clamp01(local / MORPH_SECONDS);
  const loosenOut = index < last ? smooth(clamp01((local - LOOSEN_FROM) / (1 - LOOSEN_FROM))) : 0;
  const loosenIn = index > 0 ? 1 - smooth(morph) : 0;

  return {
    digit: digits - index,
    from: Math.max(0, index - 1),
    to: index,
    gather,
    morph,
    loosen: Math.max(loosenOut, loosenIn),
    // The ring empties once per second, clockwise.
    ring: clamped < 0 ? 1 : 1 - local,
    pulse: Math.sin(Math.max(0, clamped) * Math.PI * 2) * 0.5 + 0.5,
    dive: progress(DIVE, clamped),
    fade: progress(FADE, clamped),
    done: s >= total
  };
}
