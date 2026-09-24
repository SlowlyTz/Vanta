import { describe, it, expect, afterEach } from 'vitest';
import { activeSkipSegment, bindSegments, findOutro } from '../../../src/player/src/segments.js';
import { computeNextEpisodeTimings, shouldShowNextEpisodePrompt } from '../../../src/player/src/nextEpisode.js';

const intro = { type: 'intro', startMs: 30_000, endMs: 110_000 };
const recap = { type: 'recap', startMs: 0, endMs: 25_000 };
const outro = { type: 'outro', startMs: 2_400_000, endMs: 2_520_000 };

describe('activeSkipSegment', () => {
  it('findet Intro oder Rückblick zur aktuellen Zeit, nicht kurz vor dem Ende und nicht den Abspann', () => {
    expect(activeSkipSegment([recap, intro, outro], 10)).toBe(recap);
    expect(activeSkipSegment([recap, intro, outro], 60)).toBe(intro);
    expect(activeSkipSegment([intro], 109)).toBeNull();
    expect(activeSkipSegment([outro], 2450)).toBeNull();
    expect(activeSkipSegment([intro], NaN)).toBeNull();
    expect(findOutro([intro, outro])).toBe(outro);
  });
});

describe('computeNextEpisodeTimings mit Abspann', () => {
  it('zeigt den Hinweis bei Abspann-Beginn und wechselt bei dessen Ende', () => {
    expect(computeNextEpisodeTimings({ duration: 2600, outro })).toEqual({ promptAt: 2400, skipAt: 2520, source: 'outro' });
    expect(shouldShowNextEpisodePrompt({ currentTime: 2399, duration: 2600, outro })).toBe(false);
    expect(shouldShowNextEpisodePrompt({ currentTime: 2400, duration: 2600, outro })).toBe(true);
  });

  it('lässt mindestens 10 s Vorlauf und bleibt vor dem Dateiende', () => {
    expect(computeNextEpisodeTimings({ duration: 2600, outro: { startMs: 2_590_000, endMs: 2_592_000 } }))
      .toEqual({ promptAt: 2590, skipAt: 2599.5, source: 'outro' });
  });

  it('ignoriert ein „Abspann“-Segment in der ersten Hälfte und fällt auf die Laufzeit zurück', () => {
    expect(computeNextEpisodeTimings({ duration: 2600, outro: { startMs: 60_000, endMs: 90_000 } }).source).toBe('runtime');
    expect(computeNextEpisodeTimings({ duration: 2600 }).source).toBe('runtime');
  });
});

describe('bindSegments', () => {
  let root;
  afterEach(() => root?.remove());

  const setup = async ({ canControl = true, party = false, segments = [intro] } = {}) => {
    root = document.createElement('div');
    root.innerHTML = '<button class="vanta-player-skip-segment" hidden><span class="vanta-player-skip-segment-label"></span></button>';
    document.body.appendChild(root);
    const player = new EventTarget();
    Object.assign(player, { currentTime: 40, duration: 2600 });
    const context = {
      root,
      player,
      destroyed: false,
      watchParty: party ? { enabled: true } : null,
      canControlWatchParty: () => canControl,
      listen: (target, event, handler) => target.addEventListener(event, handler)
    };
    bindSegments(context, { loadSegments: () => Promise.resolve({ segments }) });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    return { context, player, button: root.querySelector('.vanta-player-skip-segment') };
  };

  it('zeigt „Intro überspringen“ und springt beim Klick ans Intro-Ende', async () => {
    const { player, button } = await setup();
    expect(button.hidden).toBe(false);
    expect(button.textContent).toContain('Intro überspringen');
    button.click();
    expect(player.currentTime).toBe(110);
    player.dispatchEvent(new Event('time-update'));
    expect(button.hidden).toBe(true);
  });

  it('zeigt Zuschauern einer Party keinen Überspringen-Button', async () => {
    const { button } = await setup({ party: true, canControl: false });
    expect(button.hidden).toBe(true);
  });

  it('kommt ohne Segmente aus', async () => {
    const { context, button } = await setup({ segments: [] });
    expect(context.segments).toEqual([]);
    expect(button.hidden).toBe(true);
  });
});
