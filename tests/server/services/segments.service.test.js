import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/server/services/jellyfin/client.js', () => ({ jellyfinJson: vi.fn() }));

import { jellyfinJson } from '../../../src/server/services/jellyfin/client.js';
import { SegmentsService, mergeSegmentSources, normalizeIntroSkipperSegments, normalizeMediaSegments, segmentsFromChapters } from '../../../src/server/services/jellyfin/segments.service.js';

const seconds = s => s * 10_000_000;

describe('normalizeMediaSegments', () => {
  it('wandelt Jellyfin-Segmente in Millisekunden und lässt Unbekanntes weg', () => {
    expect(normalizeMediaSegments({
      Items: [
        { Type: 'Outro', StartTicks: seconds(2500), EndTicks: seconds(2580) },
        { Type: 'Intro', StartTicks: seconds(60), EndTicks: seconds(150) },
        { Type: 'Commercial', StartTicks: seconds(1), EndTicks: seconds(2) },
        { Type: 'Recap', StartTicks: seconds(10), EndTicks: seconds(10) }
      ]
    })).toEqual([
      { type: 'intro', startMs: 60_000, endMs: 150_000, source: 'segments' },
      { type: 'outro', startMs: 2_500_000, endMs: 2_580_000, source: 'segments' }
    ]);
    expect(normalizeMediaSegments(null)).toEqual([]);
  });
});

describe('segmentsFromChapters', () => {
  it('erkennt Intro- und Abspann-Kapitel und nimmt das nächste Kapitel als Ende', () => {
    expect(segmentsFromChapters([
      { Name: 'Kapitel 1', StartPositionTicks: 0 },
      { Name: 'Vorspann', StartPositionTicks: seconds(30) },
      { Name: 'Kapitel 2', StartPositionTicks: seconds(110) },
      { Name: 'End Credits', StartPositionTicks: seconds(2400) }
    ], seconds(2520))).toEqual([
      { type: 'intro', startMs: 30_000, endMs: 110_000, source: 'chapters' },
      { type: 'outro', startMs: 2_400_000, endMs: 2_520_000, source: 'chapters' }
    ]);
    expect(segmentsFromChapters(undefined)).toEqual([]);
  });
});

describe('segmentsFromChapters · Start/Ende-Paare', () => {
  it('liest „Intro start/Intro end“ und „Credit start/Credit end“ als je ein Segment', () => {
    expect(segmentsFromChapters([
      { Name: 'Chapter 1', StartPositionTicks: 0 },
      { Name: 'Intro start', StartPositionTicks: seconds(40) },
      { Name: 'Intro end', StartPositionTicks: seconds(95) },
      { Name: 'Credit start', StartPositionTicks: seconds(2400) },
      { Name: 'Credit end', StartPositionTicks: seconds(2460) }
    ], seconds(2500))).toEqual([
      { type: 'intro', startMs: 40_000, endMs: 95_000, source: 'chapters' },
      { type: 'outro', startMs: 2_400_000, endMs: 2_460_000, source: 'chapters' }
    ]);
  });
});

describe('segmentsFromChapters · Vorspann-Credits', () => {
  it('wertet Credits im ersten Viertel als Intro, am Ende als Abspann', () => {
    expect(segmentsFromChapters([
      { Name: 'Credit start', StartPositionTicks: seconds(5) },
      { Name: 'Credit end', StartPositionTicks: seconds(22) },
      { Name: 'Credits', StartPositionTicks: seconds(3000) }
    ], seconds(3100))).toEqual([
      { type: 'intro', startMs: 5_000, endMs: 22_000, source: 'chapters' },
      { type: 'outro', startMs: 3_000_000, endMs: 3_100_000, source: 'chapters' }
    ]);
  });
});

describe('normalizeIntroSkipperSegments', () => {
  it('liest die Plugin-Antwort (Sekunden) und lässt ungültige Einträge weg', () => {
    expect(normalizeIntroSkipperSegments({
      Introduction: { EpisodeId: 'x', Start: 12.5, End: 70.25, Valid: true },
      Credits: { EpisodeId: 'x', Start: 2435.045, End: 2473.696, Valid: true },
      Recap: { EpisodeId: 'x', Start: 0, End: 0, Valid: false },
      Commercial: { Start: 1, End: 2 }
    })).toEqual([
      { type: 'intro', startMs: 12_500, endMs: 70_250, source: 'intro-skipper' },
      { type: 'outro', startMs: 2_435_045, endMs: 2_473_696, source: 'intro-skipper' }
    ]);
    expect(normalizeIntroSkipperSegments({})).toEqual([]);
    expect(normalizeIntroSkipperSegments(null)).toEqual([]);
  });
});

describe('mergeSegmentSources', () => {
  it('nimmt je Typ die beste Quelle: Media-Segmente, dann Intro Skipper, dann Kapitel', () => {
    const merged = mergeSegmentSources([
      [{ type: 'intro', startMs: 1, endMs: 2, source: 'segments' }],
      [{ type: 'intro', startMs: 5, endMs: 6, source: 'intro-skipper' }, { type: 'outro', startMs: 90, endMs: 99, source: 'intro-skipper' }],
      [{ type: 'outro', startMs: 80, endMs: 99, source: 'chapters' }, { type: 'recap', startMs: 3, endMs: 4, source: 'chapters' }]
    ]);
    expect(merged.map(segment => `${segment.type}:${segment.source}`)).toEqual(['intro:segments', 'recap:chapters', 'outro:intro-skipper']);
  });
});

describe('SegmentsService.getSegments', () => {
  const routes = responses => jellyfinJson.mockImplementation(async path => {
    const match = Object.entries(responses).find(([prefix]) => path.startsWith(prefix));
    const value = match?.[1];
    if (value instanceof Error) throw value;
    return value;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    SegmentsService.cache.clear();
  });

  it('nimmt die Media-Segmente und merkt sie sich pro Nutzer und Item', async () => {
    routes({
      '/MediaSegments/': { Items: [{ Type: 'Intro', StartTicks: seconds(5), EndTicks: seconds(65) }, { Type: 'Outro', StartTicks: seconds(90), EndTicks: seconds(99) }] },
      '/Episode/': {}
    });
    const first = await SegmentsService.getSegments('u1', 't', 'ep1', { now: 0 });
    const second = await SegmentsService.getSegments('u1', 't', 'ep1', { now: 60_000 });
    expect(first).toEqual([
      { type: 'intro', startMs: 5000, endMs: 65_000, source: 'segments' },
      { type: 'outro', startMs: 90_000, endMs: 99_000, source: 'segments' }
    ]);
    expect(second).toBe(first);
    expect(jellyfinJson).toHaveBeenCalledTimes(2);
    expect(jellyfinJson.mock.calls.some(([path]) => path.startsWith('/Users/'))).toBe(false);
  });

  it('nutzt die Ergebnisse von Intro Skipper, wenn Jellyfin keine Segmente hat', async () => {
    routes({
      '/MediaSegments/': { Items: [] },
      '/Episode/': { Credits: { Start: 2435, End: 2473, Valid: true }, Introduction: { Start: 30, End: 90, Valid: true } }
    });
    expect(await SegmentsService.getSegments('u1', 't', 'ep4')).toEqual([
      { type: 'intro', startMs: 30_000, endMs: 90_000, source: 'intro-skipper' },
      { type: 'outro', startMs: 2_435_000, endMs: 2_473_000, source: 'intro-skipper' }
    ]);
    expect(jellyfinJson).toHaveBeenCalledWith('/Episode/ep4/IntroSkipperSegments', { token: 't' });
  });

  it('ergänzt fehlende Typen aus den Kapiteln', async () => {
    routes({
      '/MediaSegments/': { Items: [] },
      '/Episode/': { Credits: { Start: 90, End: 99, Valid: true } },
      '/Users/': { RunTimeTicks: seconds(100), Chapters: [{ Name: 'Intro', StartPositionTicks: 0 }, { Name: 'Teil 1', StartPositionTicks: seconds(20) }] }
    });
    expect(await SegmentsService.getSegments('u1', 't', 'ep5')).toEqual([
      { type: 'intro', startMs: 0, endMs: 20_000, source: 'chapters' },
      { type: 'outro', startMs: 90_000, endMs: 99_000, source: 'intro-skipper' }
    ]);
  });

  it('fällt ohne Segmente (oder auf alten Servern und ohne Plugin) auf die Kapitel zurück', async () => {
    const notFound = Object.assign(new Error('nope'), { status: 404 });
    routes({
      '/MediaSegments/': notFound,
      '/Episode/': notFound,
      '/Users/': { RunTimeTicks: seconds(100), Chapters: [{ Name: 'Intro', StartPositionTicks: 0 }, { Name: 'Teil 1', StartPositionTicks: seconds(20) }] }
    });
    const segments = await SegmentsService.getSegments('u1', 't', 'ep2');
    expect(segments).toEqual([{ type: 'intro', startMs: 0, endMs: 20_000, source: 'chapters' }]);
    const chaptersCall = jellyfinJson.mock.calls.find(([path]) => path.startsWith('/Users/'));
    expect(chaptersCall[1]).toMatchObject({ query: { Fields: 'Chapters' } });
  });

  it('reicht echte Fehler weiter', async () => {
    routes({ '/MediaSegments/': Object.assign(new Error('down'), { status: 500 }), '/Episode/': {} });
    await expect(SegmentsService.getSegments('u1', 't', 'ep3')).rejects.toThrow('down');
  });
});
