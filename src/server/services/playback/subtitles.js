import { getFirstValue, getMediaStreams } from './mediaMetadata.js';

const BITMAP_SUBTITLE_CODECS = new Set([
  'dvbsub',
  'dvb_subtitle',
  'dvdsub',
  'dvd_subtitle',
  'hdmv_pgs_subtitle',
  'pgs',
  'pgssub',
  'vobsub',
  'xsub'
]);
const SUBTITLE_TYPES = new Map([
  ['subrip', 'srt'],
  ['srt', 'srt'],
  ['vtt', 'vtt'],
  ['webvtt', 'vtt']
]);

export const getSubtitleType = (stream) => {
  const deliveryPath = String(stream?.DeliveryUrl || '').split('?')[0].toLowerCase();
  if (deliveryPath.endsWith('.vtt')) return 'vtt';
  if (deliveryPath.endsWith('.srt') || deliveryPath.endsWith('.subrip')) return 'srt';

  const codec = getFirstValue(stream?.Codec);
  return SUBTITLE_TYPES.get(codec) || null;
};

export const isSupportedSubtitleStream = (stream) => {
  const codec = getFirstValue(stream?.Codec);
  return !BITMAP_SUBTITLE_CODECS.has(codec)
    && stream?.DeliveryMethod === 'External'
    && typeof stream?.DeliveryUrl === 'string'
    && stream.DeliveryUrl.length > 0
    && Boolean(getSubtitleType(stream));
};

export const subtitleMethods = {
  buildSubtitleTracks(source) {
    return getMediaStreams(source, 'subtitle')
      .filter(isSupportedSubtitleStream)
      .map(stream => ({
        id: String(stream.Index),
        index: Number(stream.Index),
        label: stream.DisplayTitle || stream.Title || stream.Language || `Untertitel ${stream.Index}`,
        language: stream.Language || '',
        codec: getFirstValue(stream.Codec) || null,
        type: getSubtitleType(stream),
        isForced: Boolean(stream.IsForced),
        isDefault: Boolean(stream.IsDefault),
        url: this.toProxyUrl(stream.DeliveryUrl)
      }))
      .filter(track => Number.isInteger(track.index) && track.type && track.url);
  }
};
