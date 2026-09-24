import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { playerHeading } from './playerHeading.js';

export const PLAYER_MODULE_URL = '/vendor/player/vanta-player.js';

export function playerBackdropUrl(item) {
  const imageOwnerId = item.ParentBackdropItemId || item.Id;
  const tag = item.ParentBackdropImageTags?.[0] || item.BackdropImageTags?.[0];
  return MediaApi.getImageUrl(imageOwnerId, 'Backdrop', 1920, { tag, quality: 90 });
}

// What every VANTA player needs for one item, alone or in a watch party.
// Only the stream limit reaches `onPlaybackError`: say so, then `leave`.
export function playerMediaOptions(item, itemId, { leave }) {
  return {
    itemId,
    ...playerHeading(item),
    poster: playerBackdropUrl(item),
    resolvePlayback: (mode, options) => MediaApi.getPlayback(itemId, mode, options),
    reportPlayback: (event, payload, options) => MediaApi.reportPlayback(event, payload, options),
    loadSegments: () => MediaApi.getSegments(itemId),
    loadTranscodeProgress: () => MediaApi.getTranscodeProgress(itemId),
    onPlaybackError: error => {
      appStore.showToast(error.message || 'Stream-Limit erreicht.', 'error');
      leave();
    }
  };
}
