import { describe, it, expect } from 'vitest';
import { DURATION, TIMELINE, timelineAt } from '../../src/intro/src/timeline.js';

describe('timelineAt', () => {
  it('starts with everything at zero', () => {
    expect(timelineAt(0)).toEqual({ form: 0, slide: 0, write: 0, zoom: 0, fade: 0, done: false });
  });

  it('forms the V before the word starts writing', () => {
    const at = timelineAt(TIMELINE.form[1]);
    expect(at.form).toBe(1);
    expect(at.write).toBe(0);
    expect(at.slide).toBe(0);
  });

  it('slides and writes in the middle', () => {
    const at = timelineAt(2.0);
    expect(at.slide).toBeCloseTo(0.75, 5);
    expect(at.write).toBeCloseTo((2.0 - 1.6) / 1.1, 5);
    expect(at.zoom).toBe(0);
  });

  it('is fully faded and done at the end', () => {
    expect(timelineAt(DURATION)).toEqual({ form: 1, slide: 1, write: 1, zoom: 1, fade: 1, done: true });
    expect(timelineAt(DURATION + 5).done).toBe(true);
  });

  it('keeps the fade inside the zoom', () => {
    expect(TIMELINE.fade[0]).toBeGreaterThanOrEqual(TIMELINE.zoom[0]);
    expect(TIMELINE.fade[1]).toBeLessThanOrEqual(DURATION);
  });
});
