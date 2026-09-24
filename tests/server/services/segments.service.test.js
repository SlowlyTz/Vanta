import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/server/services/jellyfin/client.js', () => ({ jellyfinJson: vi.fn() }));

import { jellyfinJson } from '../../../src/server/services/jellyfin/client.js';
import { SegmentsService, normalizeMediaSegments, segmentsFromChapters } from '../../../src/server/services/jellyfin/segments.service.js';

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

describe('SegmentsService.getSegments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    SegmentsService.cache.clear();
  });

  it('nimmt die Media-Segmente und merkt sie sich pro Nutzer und Item', async () => {
    jellyfinJson.mockResolvedValueOnce({ Items: [{ Type: 'Intro', StartTicks: seconds(5), EndTicks: seconds(65) }] });
    const first = await SegmentsService.getSegments('u1', 't', 'ep1', { now: 0 });
    const second = await SegmentsService.getSegments('u1', 't', 'ep1', { now: 60_000 });
    expect(first).toEqual([{ type: 'intro', startMs: 5000, endMs: 65_000, source: 'segments' }]);
    expect(second).toBe(first);
    expect(jellyfinJson).toHaveBeenCalledTimes(1);
  });

  it('fällt ohne Segmente (oder auf alten Servern) auf die Kapitel zurück', async () => {
    const notFound = Object.assign(new Error('nope'), { status: 404 });
    jellyfinJson
      .mockRejectedValueOnce(notFound)
      .mockResolvedValueOnce({ RunTimeTicks: seconds(100), Chapters: [{ Name: 'Intro', StartPositionTicks: 0 }, { Name: 'Teil 1', StartPositionTicks: seconds(20) }] });
    const segments = await SegmentsService.getSegments('u1', 't', 'ep2');
    expect(segments).toEqual([{ type: 'intro', startMs: 0, endMs: 20_000, source: 'chapters' }]);
    expect(jellyfinJson.mock.calls[1][1]).toMatchObject({ query: { Fields: 'Chapters' } });
  });

  it('reicht echte Fehler weiter', async () => {
    jellyfinJson.mockRejectedValueOnce(Object.assign(new Error('down'), { status: 500 }));
    await expect(SegmentsService.getSegments('u1', 't', 'ep3')).rejects.toThrow('down');
  });
});
