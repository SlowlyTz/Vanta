// Jellyfin's parental control for the catalogue mirror: titles above the account's age limit
// are hidden, and so are unrated titles of a type listed in BlockUnratedItems.

// FSK age from a rating as Jellyfin stores it ("FSK-12", "DE-16", "12", or
// another country's "NL-16"); null when unknown. US ratings carry the score
// Jellyfin gives them (PG-13 = 13, R = 17), so a limit of 12 or 16 keeps them
// out exactly as Jellyfin does.
const US_RATINGS = {
  G: 0, 'TV-Y': 0, 'TV-G': 0, 'TV-Y7': 7, 'TV-Y7-FV': 7, PG: 10, 'TV-PG': 10,
  'PG-13': 13, 'TV-14': 14, R: 17, 'TV-MA': 17, 'NC-17': 18, M18: 18
};
export function ageRating(rating) {
  if (!rating) return null;
  const text = String(rating).trim().toUpperCase();
  const number = /^(?:[A-Z]{2,3})?[-\s]?(\d{1,2})$/.exec(text);
  if (number) return Number(number[1]);
  return US_RATINGS[text] ?? null;
}

// From a Jellyfin user policy. Jellyfin's rating scores for the German FSK
// ratings are the age itself.
export function ageLimitOf(policy) {
  const maxAge = Number.isFinite(policy?.MaxParentalRating) ? policy.MaxParentalRating : null;
  const blockUnrated = Array.isArray(policy?.BlockUnratedItems) ? policy.BlockUnratedItems.filter(Boolean) : [];
  return maxAge === null && blockUnrated.length === 0 ? null : { maxAge, blockUnrated };
}

// `item`: { type, officialRating } (catalogue entry) or a Jellyfin item. A
// rating VANTA cannot read counts as unrated, as in Jellyfin.
export function withinAgeLimit(limit, item) {
  if (!limit) return true;
  const type = item?.type ?? item?.Type;
  const age = ageRating(item?.officialRating ?? item?.OfficialRating ?? null);
  if (age === null) return !limit.blockUnrated?.includes(type);
  return !Number.isFinite(limit.maxAge) || age <= limit.maxAge;
}
