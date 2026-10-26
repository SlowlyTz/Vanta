// Jellyfin's parental control for the catalogue mirror: titles above the account's age limit
// are hidden, and so are unrated titles of a type listed in BlockUnratedItems.

// FSK age from a rating as Jellyfin stores it ("FSK-12", "DE-16", "12"),
// with the usual US ratings mapped; null when unknown.
const US_RATINGS = { G: 0, 'TV-Y': 0, 'TV-G': 0, 'TV-Y7': 6, PG: 6, 'TV-PG': 6, 'PG-13': 12, 'TV-14': 12, R: 16, 'TV-MA': 18, 'NC-17': 18, M18: 18 };
export function ageRating(rating) {
  if (!rating) return null;
  const text = String(rating).trim().toUpperCase();
  const number = /^(?:FSK|DE|FSF)?[-\s]?(\d{1,2})$/.exec(text);
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
// rating VANTA cannot read lets the title through.
export function withinAgeLimit(limit, item) {
  if (!limit) return true;
  const type = item?.type ?? item?.Type;
  const rating = item?.officialRating ?? item?.OfficialRating ?? null;
  if (!rating) return !limit.blockUnrated?.includes(type);
  if (!Number.isFinite(limit.maxAge)) return true;
  const age = ageRating(rating);
  return age === null || age <= limit.maxAge;
}
