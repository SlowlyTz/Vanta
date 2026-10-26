import { describe, it, expect } from 'vitest';
import { playbackErrorMessage } from '../../../src/player/src/playbackErrors.js';

describe('playbackErrorMessage', () => {
  it('keeps our own German messages', () => {
    expect(playbackErrorMessage(new Error('Das erste HLS-Segment konnte nicht rechtzeitig geladen werden.')))
      .toBe('Das erste HLS-Segment konnte nicht rechtzeitig geladen werden.');
  });

  it('never shows browser texts', () => {
    const abort = Object.assign(new Error('The play() request was interrupted by a call to pause(). https://goo.gl/LdLk22'), { name: 'AbortError' });
    expect(playbackErrorMessage(abort)).toBe('Die Wiedergabe wurde unterbrochen.');
    expect(playbackErrorMessage(new Error('Failed to load because no supported source was found.'))).toBe('Der Stream konnte nicht geladen werden.');
    expect(playbackErrorMessage(null)).toBe('Der Stream konnte nicht geladen werden.');
  });
});
