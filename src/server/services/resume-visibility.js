// Which "Weiter schauen" entries a user took out (see resume.service.js).
// Registered on start like the catalogue reader, so the Jellyfin services
// stay free of the database; until then nothing is filtered.
let filter = (userId, items) => items;

export const setResumeFilter = (next) => { filter = next; };
export const visibleResumeItems = (userId, items) => filter(userId, items);
