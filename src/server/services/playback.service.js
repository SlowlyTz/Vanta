// Playback answers: picking the stream from Jellyfin's PlaybackInfo and
// proxying its paths so the token never reaches the browser.
import * as paths from './playback/pathUtils.js';
import * as subtitles from './playback/subtitles.js';
import * as selection from './playback/streamSelection.js';

export const PlaybackService = { ...paths, ...subtitles, ...selection };
