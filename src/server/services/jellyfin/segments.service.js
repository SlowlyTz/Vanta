import { jellyfinJson } from './client.js';

const TICKS_PER_MS = 10_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const SEGMENT_TYPES = { intro: 'intro', outro: 'outro', recap: 'recap', preview: 'preview' };

// Chapter names that mark a segment when a server has no media segments.
const CHAPTER_PATTERNS = [
  ['intro', /^(intro|opening|vorspann|title sequence|op)\b/i],
  ['recap', /\b(recap|previously|rückblick|was bisher geschah)\b/i],
  ['outro', /\b(credits|end credits|abspann|outro|ending|ed)\b/i],
  ['preview', /\b(preview|next time|vorschau)\b/i]
];

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

// Fallback: a chapter named "Intro", "Abspann" … runs until the next chapter.
export function segmentsFromChapters(chapters, runtimeTicks = null) {
  const list = (Array.isArray(chapters) ? chapters : [])
    .map(chapter => ({ name: String(chapter.Name || ''), startMs: Math.round(Number(chapter.StartPositionTicks) / TICKS_PER_MS) }))
    .filter(chapter => Number.isFinite(chapter.startMs))
    .sort((a, b) => a.startMs - b.startMs);
  const runtimeMs = Number(runtimeTicks) > 0 ? Math.round(Number(runtimeTicks) / TICKS_PER_MS) : null;

  return list.flatMap((chapter, index) => {
    const match = CHAPTER_PATTERNS.find(([, pattern]) => pattern.test(chapter.name));
    if (!match) return [];
    const endMs = list[index + 1]?.startMs ?? runtimeMs;
    if (!Number.isFinite(endMs) || endMs <= chapter.startMs) return [];
    return [{ type: match[0], startMs: chapter.startMs, endMs, source: 'chapters' }];
  });
}

export class SegmentsService {
  static cache = new Map();

  static async getSegments(userId, token, itemId, { now = Date.now() } = {}) {
    const key = `${userId}:${itemId}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) return cached.segments;

    let segments = [];
    try {
      segments = normalizeMediaSegments(await jellyfinJson(`/MediaSegments/${encodeURIComponent(itemId)}`, { token }));
    } catch (error) {
      // Older servers have no segments API; the chapters below still work.
      if (error.status && ![400, 404].includes(error.status)) throw error;
    }

    if (!segments.length) {
      const item = await jellyfinJson(`/Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(itemId)}`, {
        token,
        query: { Fields: 'Chapters' }
      });
      segments = segmentsFromChapters(item?.Chapters, item?.RunTimeTicks);
    }

    this.cache.set(key, { segments, expiresAt: now + CACHE_TTL_MS });
    return segments;
  }
}
