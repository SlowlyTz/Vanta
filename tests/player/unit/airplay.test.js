import { describe, it, expect, vi } from 'vitest';
import { bindAirPlay } from '../../../src/player/src/airplay.js';

const setup = ({ safari = true, party = false } = {}) => {
  document.body.innerHTML = '<div class="p"><video></video></div><button class="air" hidden></button>';
  const player = document.querySelector('.p');
  const video = player.querySelector('video');
  video.webkitShowPlaybackTargetPicker = vi.fn();
  const disposers = [];
  const context = {
    player,
    dom: { airplayButton: document.querySelector('.air') },
    watchParty: party ? { enabled: true } : null,
    disposers,
    listen: (target, type, handler) => target.addEventListener(type, handler)
  };
  const win = safari ? { WebKitPlaybackTargetAvailabilityEvent: function Event() {} } : {};
  return { result: bindAirPlay(context, { win }), player, video, button: context.dom.airplayButton };
};

const availability = (video, value) => {
  const event = new Event('webkitplaybacktargetavailabilitychanged');
  event.availability = value;
  video.dispatchEvent(event);
};

describe('bindAirPlay', () => {
  it('shows the button while a receiver is around and opens the picker', () => {
    const { video, button } = setup();
    expect(video.getAttribute('x-webkit-airplay')).toBe('allow');
    expect(button.hidden).toBe(true);
    availability(video, 'available');
    expect(button.hidden).toBe(false);
    button.click();
    expect(video.webkitShowPlaybackTargetPicker).toHaveBeenCalled();
    availability(video, 'not-available');
    expect(button.hidden).toBe(true);
  });

  it('stays away outside Safari and in a watch party', () => {
    expect(setup({ safari: false }).result).toBeNull();
    expect(setup({ party: true }).result).toBeNull();
  });

  it('hides the button while hls.js feeds the video through Media Source', () => {
    const { player, video, button } = setup();
    video.setAttribute('src', 'blob:https://vanta.test/123');
    player.dispatchEvent(new Event('can-play'));
    availability(video, 'available');
    expect(button.hidden).toBe(true);

    video.setAttribute('src', '/api/playback/proxy?path=master.m3u8');
    player.dispatchEvent(new Event('source-change'));
    expect(button.hidden).toBe(false);
  });
});
