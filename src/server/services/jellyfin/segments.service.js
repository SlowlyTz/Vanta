import { jellyfinJson } from './client.js';

const TICKS_PER_MS = 10_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const SEGMENT_TYPES = { intro: 'intro', outro: 'outro', recap: 'recap', preview: 'preview' };

// Chapter names that mark a segment when a server has no media segments.
const CHAPTER_PATTERNS = [
  ['intro', /^(intro|opening|vorspann|title sequence|op)\b/i],
  ['recap', /\b(recap|previously|rückblick|was bisher geschah)\b/i],
  ['outro', /\b(credits?|end credits|abspann|outro|ending|ed)\b/i],
  ['preview', /\b(preview|next time|vorschau)\b/i]
];
// "Intro end", "Credit end": the chapter after a segment, never its start.
const CHAPTER_END_MARKER = /\b(end|ende)\s*$/i;

// The Intro Skipper plugin's own results (in seconds). It does not always
// hand them to Jellyfin's media segments, so they are read directly too.
const INTRO_SKIPPER_TYPES = { introduction: 'intro', credits: 'outro', recap: 'recap', preview: 'preview' };
const SEGMENT_SOURCES = ['segments', 'intro-skipper', 'chapters'];

// Jellyfin (10.10+) media segments, e.g. from the Intro Skipper plugin.
export function normalizeMediaSegments(payload) {
  const items = Array.isArray(payload?.Items) ? payload.Items : [];
  return items
    .map(item => ({
      type: SEGMENT_TYPES[String(item.Type || '').toLowerCase()],
      startMs: Math.round(Number(item.StartTicks) / TICKS_PER_MS),
      endMs: Math.round(Number(item.EndTicks) / TICKS_PER_MS),
      source: 'segments'
    }))
    .filter(segment => segment.type && Number.isFinite(segment.startMs) && segment.endMs > segment.startMs)
    .sort((a, b) => a.startMs - b.startMs);
}

export function normalizeIntroSkipperSegments(payload) {
  if (!payload || typeof payload !== 'object') return [];
  return Object.entries(payload)
    .map(([key, value]) => ({
      type: INTRO_SKIPPER_TYPES[key.toLowerCase()],
      startMs: Math.round(Number(value?.Start ?? value?.IntroStart) * 1000),
      endMs: Math.round(Number(value?.End ?? value?.IntroEnd) * 1000),
      valid: value?.Valid !== false,
      source: 'intro-skipper'
    }))
    .filter(segment => segment.type && segment.valid && Number.isFinite(segment.startMs) && segment.endMs > segment.startMs)
    .map(({ valid, ...segment }) => segment)
    .sort((a, b) => a.startMs - b.startMs);
}

// Per segment type the first source that knows it wins: Jellyfin's media
// segments, then Intro Skipper, then chapter names.
export function mergeSegmentSources(lists) {
  const byType = new Map();
  lists.flat().forEach(segment => {
    const current = byType.get(segment.type);
    if (!current || SEGMENT_SOURCES.indexOf(segment.source) < SEGMENT_SOURCES.indexOf(current[0].source)) {
      byType.set(segment.type, [segment]);
    } else if (current[0].source === segment.source) {
      current.push(segment);
    }
  });
  return [...byType.values()].flat().sort((a, b) => a.startMs - b.startMs);
}

// Fallback: a chapter named "Intro", "Abspann" … runs until the next chapter;
// with "Intro start"/"Intro end" pairs that is the end marker.
export function segmentsFromChapters(chapters, runtimeTicks = null) {
  const list = (Array.isArray(chapters) ? chapters : [])
    .map(chapter => ({ name: String(chapter.Name || ''), startMs: Math.round(Number(chapter.StartPositionTicks) / TICKS_PER_MS) }))
    .filter(chapter => Number.isFinite(chapter.startMs))
    .sort((a, b) => a.startMs - b.startMs);
  const runtimeMs = Number(runtimeTicks) > 0 ? Math.round(Number(runtimeTicks) / TICKS_PER_MS) : null;

  return list.flatMap((chapter, index) => {
    if (CHAPTER_END_MARKER.test(chapter.name)) return [];
    const match = CHAPTER_PATTERNS.find(([, pattern]) => pattern.test(chapter.name));
    if (!match) return [];
    const endMs = list[index + 1]?.startMs ?? runtimeMs;
    if (!Number.isFinite(endMs) || endMs <= chapter.startMs) return [];
    // "Credit start" in the first quarter (as on many streaming releases)
    // marks the opening credits, i.e. the intro.
    const opening = match[0] === 'outro' && runtimeMs && chapter.startMs < runtimeMs * 0.25;
    return [{ type: opening ? 'intro' : match[0], startMs: chapter.startMs, endMs, source: 'chapters' }];
  });
}

export class SegmentsService {
  static cache = new Map();

  static async getSegments(userId, token, itemId, { now = Date.now() } = {}) {
    const key = `${userId}:${itemId}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) return cached.segments;

    const [mediaSegments, skipperSegments] = await Promise.all([
      jellyfinJson(`/MediaSegments/${encodeURIComponent(itemId)}`, { token })
        .then(normalizeMediaSegments)
        .catch(error => {
          // Older servers have no segments API; the other sources still work.
          if (error.status && ![400, 404].includes(error.status)) throw error;
          return [];
        }),
      // Missing plugin, a movie, or an episode not analysed yet: no segments.
      jellyfinJson(`/Episode/${encodeURIComponent(itemId)}/IntroSkipperSegments`, { token })
        .then(normalizeIntroSkipperSegments)
        .catch(() => [])
    ]);
    let segments = mergeSegmentSources([mediaSegments, skipperSegments]);

    const types = new Set(segments.map(segment => segment.type));
    if (!types.has('intro') || !types.has('outro')) {
      const item = await jellyfinJson(`/Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(itemId)}`, {
        token,
        query: { Fields: 'Chapters' }
      });
      segments = mergeSegmentSources([segments, segmentsFromChapters(item?.Chapters, item?.RunTimeTicks)]);
    }

    this.cache.set(key, { segments, expiresAt: now + CACHE_TTL_MS });
    return segments;
  }
}
