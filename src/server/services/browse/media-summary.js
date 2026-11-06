// A short description of a file's picture and sound ("4K", "Dolby Vision",
// "5.1"), for the detail page chips and the versions of a film.
import { getMediaStream, getMediaStreams } from '../playback/mediaMetadata.js';

export function resolutionLabel(width, height) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  if (w >= 3200 || h >= 2000) return '4K';
  if (w >= 1800 || h >= 1000) return '1080p';
  if (w >= 1200 || h >= 700) return '720p';
  if (w > 0 || h > 0) return 'SD';
  return null;
}

function dynamicRange(video) {
  const range = String(video?.VideoRangeType || video?.VideoRange || '').toLowerCase();
  if (range.startsWith('dovi')) return 'Dolby Vision';
  if (range.includes('hdr10plus') || range.includes('hdr10+')) return 'HDR10+';
  if (range.includes('hdr') || range.includes('hlg')) return 'HDR';
  return null;
}

function audioLabel(audio) {
  if (!audio) return null;
  const title = `${audio.Profile || ''} ${audio.DisplayTitle || ''}`.toLowerCase();
  if (title.includes('atmos')) return 'Dolby Atmos';
  const channels = Number(audio.Channels) || 0;
  if (channels >= 8) return '7.1';
  if (channels >= 6) return '5.1';
  if (channels === 2) return 'Stereo';
  if (channels === 1) return 'Mono';
  return null;
}

// Null when the item carries no media source (a series, or fields without MediaSources).
export function summarizeMedia(item) {
  const source = item?.MediaSources?.[0];
  if (!source) return null;
  const video = getMediaStream(source, 'video');
  const audio = getMediaStreams(source, 'audio').find(stream => stream.IsDefault) || getMediaStream(source, 'audio');
  const subtitles = getMediaStreams(source, 'subtitle');
  const languages = (list) => [...new Set(list.map(stream => stream.Language).filter(Boolean))];
  return {
    resolution: resolutionLabel(video?.Width, video?.Height),
    dynamicRange: dynamicRange(video),
    audio: audioLabel(audio),
    videoCodec: video?.Codec || null,
    container: source.Container || null,
    size: Number(source.Size) || null,
    audioLanguages: languages(getMediaStreams(source, 'audio')),
    subtitleLanguages: languages(subtitles)
  };
}
