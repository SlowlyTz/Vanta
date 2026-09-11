// Seconds. The V forms first, then slides left while the word writes itself,
// a short hold, and the camera dives through the lettering as the cover fades.
export const TIMELINE = {
  form: [0, 1.3],
  slide: [1.4, 2.2],
  write: [1.6, 2.7],
  zoom: [3.1, 4.0],
  fade: [3.4, 4.0]
};

export const DURATION = 4.0;

const progress = ([start, end], t) => Math.min(1, Math.max(0, (t - start) / (end - start)));

export function timelineAt(t) {
  return {
    form: progress(TIMELINE.form, t),
    slide: progress(TIMELINE.slide, t),
    write: progress(TIMELINE.write, t),
    zoom: progress(TIMELINE.zoom, t),
    fade: progress(TIMELINE.fade, t),
    done: t >= DURATION
  };
}
