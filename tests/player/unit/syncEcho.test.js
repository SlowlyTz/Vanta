import { describe, it, expect } from 'vitest';
import { createEchoTokens, ECHO_TOKEN_TTL_MS } from '../../../src/player/src/syncEcho.js';

describe('createEchoTokens', () => {
  const setup = () => {
    let now = 0;
    const tokens = createEchoTokens({ now: () => now });
    return { tokens, advance: ms => { now += ms; } };
  };

  it('verbraucht pro programmatischer Änderung genau ein Event der passenden Art', () => {
    const { tokens } = setup();
    tokens.expect('seek');

    expect(tokens.consume('play')).toBe(false);
    expect(tokens.consume('seek')).toBe(true);
    expect(tokens.consume('seek')).toBe(false);
  });

  it('hält auch bei langsamen HLS-Seeks, anders als eine feste 250-ms-Sperre', () => {
    const { tokens, advance } = setup();
    tokens.expect('seek');
    advance(1_800);
    expect(tokens.consume('seek')).toBe(true);
  });

  it('lässt Tokens verfallen, damit spätere echte Aktionen gemeldet werden', () => {
    const { tokens, advance } = setup();
    tokens.expect('pause');
    advance(ECHO_TOKEN_TTL_MS + 1);
    expect(tokens.pendingCount('pause')).toBe(0);
    expect(tokens.consume('pause')).toBe(false);
  });

  it('zählt mehrere Änderungen einzeln und lässt sich leeren', () => {
    const { tokens } = setup();
    tokens.expect('play');
    tokens.expect('play');
    expect(tokens.pendingCount('play')).toBe(2);
    tokens.clear();
    expect(tokens.pendingCount('play')).toBe(0);
  });

  it('ignoriert unbekannte Arten', () => {
    const { tokens } = setup();
    tokens.expect('volume');
    expect(tokens.consume('volume')).toBe(false);
    expect(tokens.pendingCount('volume')).toBe(0);
  });
});
