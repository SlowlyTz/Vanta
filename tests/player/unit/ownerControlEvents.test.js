import { describe, it, expect, vi } from 'vitest';
import { bindOwnerControlEvents } from '../../../src/player/src/player/ownerControlEvents.js';
import { createEchoTokens } from '../../../src/player/src/syncEcho.js';

function setup() {
  let clock = 0;
  const player = new EventTarget();
  player.currentTime = 42;
  const watchParty = { onOwnerPlay: vi.fn(), onOwnerPause: vi.fn(), onOwnerSeek: vi.fn() };
  const echoTokens = createEchoTokens({ now: () => clock });
  const context = {
    player,
    watchParty,
    echoTokens,
    listen: (target, event, handler) => target.addEventListener(event, handler),
    canEmitOwnerControl: kind => !echoTokens.consume(kind)
  };
  bindOwnerControlEvents(context);
  return { player, watchParty, echoTokens, advance: ms => { clock += ms; } };
}

describe('bindOwnerControlEvents', () => {
  it('reports an admin\'s own seek', () => {
    const { player, watchParty } = setup();
    player.dispatchEvent(new Event('seeking'));
    player.dispatchEvent(new Event('seeked'));
    expect(watchParty.onOwnerSeek).toHaveBeenCalledWith(42000, {});
  });

  it('keeps a sync seek quiet even when it lands long after its token expired', () => {
    const { player, watchParty, echoTokens, advance } = setup();
    echoTokens.expect('seek');
    player.dispatchEvent(new Event('seeking'));
    advance(10_000);
    player.dispatchEvent(new Event('seeked'));
    expect(watchParty.onOwnerSeek).not.toHaveBeenCalled();

    // The next seek is the admin's own again.
    player.dispatchEvent(new Event('seeking'));
    player.dispatchEvent(new Event('seeked'));
    expect(watchParty.onOwnerSeek).toHaveBeenCalledTimes(1);
  });

  it('reports play and pause unless the sync booked them', () => {
    const { player, watchParty, echoTokens } = setup();
    echoTokens.expect('play');
    player.dispatchEvent(new Event('play'));
    player.dispatchEvent(new Event('pause'));
    expect(watchParty.onOwnerPlay).not.toHaveBeenCalled();
    expect(watchParty.onOwnerPause).toHaveBeenCalledWith(42000);
  });
});
