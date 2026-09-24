export function roleLabel(role) {
  if (role === 'owner') return 'Gastgeber';
  if (role === 'admin') return 'Admin';
  return '';
}

export function canPromote({ viewerRole, member, currentUserId }) {
  return ['owner', 'admin'].includes(viewerRole)
    && member.userId !== currentUserId
    && member.role === 'viewer';
}

// Only the host takes admin rights away again.
export function canDemote({ viewerRole, member, currentUserId }) {
  return viewerRole === 'owner' && member.userId !== currentUserId && member.role === 'admin';
}

export function canBan({ viewerRole, member, currentUserId }) {
  if (!['owner', 'admin'].includes(viewerRole)) return false;
  if (member.userId === currentUserId) return false;
  if (member.role === 'owner') return false;
  if (member.role === 'admin' && viewerRole !== 'owner') return false;
  return true;
}
