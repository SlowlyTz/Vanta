// Viewers in a watch party do not steer playback: the transport (play,
// seek) is hidden and inert and the timeline only shows progress (clicks,
// taps and keys check the same rights). The top bar says who is in control.
const TRANSPORT_SELECTOR = '.vanta-player-transport';
// The timeline stays visible as a progress display. It must not get
// aria-hidden: vidstack hides any slider carrying it with display:none.
const TIMELINE_SELECTOR = 'media-time-slider';

export function applyWatchPartyPermissions({ root, watchParty }) {
  if (!watchParty?.enabled) return;
  const canControl = Boolean(watchParty.canControl ?? watchParty.isOwner);

  root.classList.toggle('is-watch-party-viewer', !canControl);
  const pill = root.querySelector('.vanta-player-party-pill');
  if (pill) pill.hidden = canControl;

  root.querySelectorAll(TRANSPORT_SELECTOR).forEach(control => {
    control.inert = !canControl;
    if (canControl) control.removeAttribute('aria-hidden');
    else control.setAttribute('aria-hidden', 'true');
  });
  root.querySelectorAll(TIMELINE_SELECTOR).forEach(timeline => {
    timeline.inert = !canControl;
  });
}
