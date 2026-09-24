import { playbackStateLabel } from '../../public/js/shared/partyStatus.js';

export { memberHue } from '../../public/js/shared/members.js';

// How a party member's player is doing, as shown in the settings flyout.
export function memberStatus(member) {
  if (!member?.connected) return { key: 'offline', label: 'Offline' };
  const label = playbackStateLabel(member.playbackState, member.driftMs);
  return label ? { key: member.playbackState, label } : { key: 'unknown', label: 'Verbunden' };
}
