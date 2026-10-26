// What VANTA notifies about; DOM-free, shared by the web app and the server.

// `on` is the default for push and the in-app list; a user can switch both per
// kind. Admin kinds only reach admins.
export const NOTIFICATION_KINDS = Object.freeze([
  { kind: 'request_update', label: 'Meine Anfragen', description: 'Eine Anfrage wurde angenommen oder abgelehnt.', on: true },
  { kind: 'request_available', label: 'Angefragtes ist da', description: 'Ein angefragter Titel ist jetzt verfügbar.', on: true },
  { kind: 'report_update', label: 'Meine Meldungen', description: 'Eine Meldung wurde erledigt.', on: true },
  { kind: 'new_episode', label: 'Neue Folgen', description: 'Neue Folgen von Serien auf deiner Liste oder in „Weiter schauen“.', on: true },
  { kind: 'new_content', label: 'Neu in der Bibliothek', description: 'Neue Filme und Serien, gebündelt.', on: false },
  { kind: 'watch_party_invite', label: 'Watch-Party-Einladungen', description: 'Jemand lädt dich zu einer Watch Party ein.', on: true },
  { kind: 'app_update', label: 'Neue VANTA-Version', description: 'Eine neue Version ist da.', on: false },
  { kind: 'announcement', label: 'Mitteilungen', description: 'Nachrichten der Admins an alle.', on: true },
  { kind: 'admin_new_request', label: 'Neue Anfragen und Meldungen', description: 'Für Admins: etwas wartet auf eine Entscheidung.', on: true, adminOnly: true },
  { kind: 'admin_sync_failed', label: 'Probleme beim Katalog-Abgleich', description: 'Für Admins: der tägliche Abgleich mit Jellyfin ist mehrmals gescheitert.', on: true, adminOnly: true }
]);

export const NOTIFICATION_KIND_IDS = NOTIFICATION_KINDS.map(entry => entry.kind);

export const kindsFor = ({ isAdmin = false } = {}) => NOTIFICATION_KINDS.filter(entry => isAdmin || !entry.adminOnly);
