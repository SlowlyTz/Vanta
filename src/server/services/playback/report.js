// A player's progress report, checked and shaped the way Jellyfin takes it.
import { httpError } from '../../utils/httpError.js';

const PLAY_METHODS = new Set(['DirectPlay', 'DirectStream', 'Transcode']);

const nullableInteger = value => Number.isInteger(value) ? value : null;

export const buildPlaybackReport = body => {
  const positionTicks = Number(body.positionTicks);
  const volumeLevel = Number(body.volumeLevel);
  const playbackRate = Number(body.playbackRate);

  if (!body.itemId || !body.playSessionId || !Number.isFinite(positionTicks) || positionTicks < 0) {
    throw httpError(400, 'Ungültige Wiedergabe-Meldung');
  }

  return {
    ItemId: String(body.itemId),
    MediaSourceId: body.mediaSourceId ? String(body.mediaSourceId) : null,
    PlaySessionId: String(body.playSessionId),
    PositionTicks: Math.round(positionTicks),
    IsPaused: Boolean(body.isPaused),
    IsMuted: Boolean(body.isMuted),
    VolumeLevel: Number.isFinite(volumeLevel) ? Math.max(0, Math.min(100, Math.round(volumeLevel))) : 100,
    PlaybackRate: Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1,
    PlayMethod: PLAY_METHODS.has(body.playMethod) ? body.playMethod : 'DirectPlay',
    CanSeek: body.canSeek !== false,
    AudioStreamIndex: nullableInteger(body.audioStreamIndex),
    SubtitleStreamIndex: nullableInteger(body.subtitleStreamIndex),
    RepeatMode: 'RepeatNone'
  };
};
