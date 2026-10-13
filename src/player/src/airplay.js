// AirPlay (Safari on iPhone, iPad and Mac): the button only shows while an
// AirPlay receiver is around, and opens the system's picker. Nothing to set
// up anywhere. Not in a watch party: the party needs the local player to
// stay in sync. Only a source Safari plays itself goes to a receiver: a
// stream that hls.js feeds through Media Source (a `blob:` URL) cannot.
export function bindAirPlay(context, { win = window } = {}) {
  const { player, dom, listen } = context;
  const button = dom.airplayButton;
  if (!button) return null;
  if (context.watchParty?.enabled || typeof win.WebKitPlaybackTargetAvailabilityEvent === 'undefined') {
    button.hidden = true;
    return null;
  }

  let video = null;
  let available = false;
  const isNativeSource = () => {
    const src = String(video?.currentSrc || video?.getAttribute('src') || '');
    return !src.startsWith('blob:');
  };
  const refresh = () => {
    button.hidden = !(available && isNativeSource());
  };
  const onAvailability = (event) => {
    available = event.availability === 'available';
    refresh();
  };

  // The <video> of vidstack is replaced on a source change; follow it.
  const attach = () => {
    const next = player.querySelector('video');
    if (!next || next === video) return;
    video?.removeEventListener('webkitplaybacktargetavailabilitychanged', onAvailability);
    video = next;
    video.setAttribute('x-webkit-airplay', 'allow');
    video.addEventListener('webkitplaybacktargetavailabilitychanged', onAvailability);
  };

  listen(button, 'click', (event) => {
    event.stopPropagation();
    attach();
    video?.webkitShowPlaybackTargetPicker?.();
  });
  const attachAndRefresh = () => {
    attach();
    refresh();
  };
  listen(player, 'source-change', attachAndRefresh);
  listen(player, 'can-play', attachAndRefresh);
  listen(player, 'loaded-metadata', attachAndRefresh);
  attach();
  context.disposers.push(() => video?.removeEventListener('webkitplaybacktargetavailabilitychanged', onAvailability));
  return { attach, refresh };
}
