// The key a name is stored and compared by: lower case, single spaces.
export const normalizeKey = (value) => String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
