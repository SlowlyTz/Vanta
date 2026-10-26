// Who may do what in a party: owner, admins, members.
import { forbidden } from '../../utils/httpError.js';

export function assertOwner(party, userId) {
  if (party.ownerUserId !== userId) {
    throw forbidden('Das darf nur der Gastgeber der Watch Party.');
  }
}

export function isPartyAdmin(party, userId) {
  const member = party.members.get(userId);
  return member?.role === 'owner' || member?.role === 'admin';
}

export function assertPartyAdmin(party, userId) {
  if (!isPartyAdmin(party, userId)) {
    throw forbidden('Nur Admins können diese Aktion ausführen');
  }
}

export function assertPartyMember(party, userId) {
  const member = party.members.get(userId);
  if (!member) throw forbidden('Du bist kein Mitglied dieser Watch Party');
  return member;
}
