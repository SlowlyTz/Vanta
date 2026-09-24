import { jellyfinJson, deviceIdForToken, SHARED_DEVICE_ID } from '../jellyfin/client.js';
import { ItemsService } from '../jellyfin/items.service.js';

const ITEM_CACHE_TTL_MS = 10 * 60 * 1000;
const TICKS_PER_MS = 10_000;
const itemCache = new Map();

function videoFrameRate(item) {
  const streams = item?.MediaSources?.[0]?.MediaStreams || item?.MediaStreams || [];
  const video = streams.find(stream => stream.Type === 'Video');
  const fps = Number(video?.RealFrameRate || video?.AverageFrameRate);
  return Number.isFinite(fps) && fps > 0 ? fps : null;
}

async function itemTiming(userId, token, itemId, now) {
  const cached = itemCache.get(itemId);
  if (cached && cached.expiresAt > now) return cached.value;
  const item = await ItemsService.getItemDetails(userId, token, itemId);
  const value = {
    runtimeMs: Number(item?.RunTimeTicks) > 0 ? Math.round(Number(item.RunTimeTicks) / TICKS_PER_MS) : null,
    sourceFps: videoFrameRate(item)
  };
  itemCache.set(itemId, { value, expiresAt: now + ITEM_CACHE_TTL_MS });
  return value;
}

// How far Jellyfin's transcoder for this browser has got: Jellyfin reports
// the completion (percent of the runtime) and the encoding frame rate per
// device while ffmpeg runs. Nothing is reported while the source is still
// being opened, and nothing can be told apart on the old shared device id.
export async function getTranscodeProgress({ userId, token, itemId, now = Date.now() }) {
  const deviceId = deviceIdForToken(token);
  if (deviceId === SHARED_DEVICE_ID) return { available: false, reason: 'shared-device' };

  const [sessions, timing] = await Promise.all([
    jellyfinJson('/Sessions', { token, query: { deviceId } }),
    itemTiming(userId, token, itemId, now)
  ]);
  const info = (Array.isArray(sessions) ? sessions : []).find(session => session.DeviceId === deviceId)?.TranscodingInfo;
  const percent = Number(info?.CompletionPercentage);
  if (!info || !Number.isFinite(percent) || !timing.runtimeMs) return { available: false, reason: 'no-progress' };

  const encodeFps = Number(info.Framerate);
  return {
    available: true,
    completionPercentage: percent,
    transcodedMs: Math.round((percent / 100) * timing.runtimeMs),
    runtimeMs: timing.runtimeMs,
    // Encoding speed as a multiple of real time (2 = twice as fast).
    speed: Number.isFinite(encodeFps) && encodeFps > 0 && timing.sourceFps ? encodeFps / timing.sourceFps : null
  };
}

export function clearTranscodeProgressCache() {
  itemCache.clear();
}
