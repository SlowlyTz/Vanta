import { subtitleMethods } from './playback/subtitles.js';
import { pathMethods } from './playback/pathUtils.js';
import { streamSelectionMethods } from './playback/streamSelection.js';

export class PlaybackService {}

Object.assign(PlaybackService, subtitleMethods, pathMethods, streamSelectionMethods);
