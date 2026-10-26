// Which "Weiter schauen" entries a user took out. resume.service.js registers
// the filter when loaded, so the browse services stay free of the database;
// until then nothing is filtered.
let filter = (userId, items) => items;

export const setResumeFilter = (next) => { filter = next; };
export const visibleResumeItems = (userId, items) => filter(userId, items);
