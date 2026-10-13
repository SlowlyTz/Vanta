// Search over the catalogue mirror that forgives typos: "Brekaing Bad" finds
// "Breaking Bad". The few hundred titles of a VANTA library fit in memory,
// so every search scores all of them; no index extension is needed.

// Lower case, accents and umlauts reduced to their letter (ä → a), ß → ss,
// punctuation to spaces.
export function normalizeForSearch(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Optimal string alignment distance (Damerau-Levenshtein with adjacent
// swaps), giving up once it exceeds `max`.
export function editDistance(a, b, max = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = [Array.from({ length: b.length + 1 }, (_, j) => j)];
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(rows[i - 1][j] + 1, row[j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, rows[i - 2][j - 2] + 1);
      }
      row.push(value);
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    rows.push(row);
  }
  return rows[a.length][b.length];
}

// How many typos a query of this length may have.
export const allowedTypos = (length) => (length < 4 ? 0 : length < 8 ? 1 : 2);

// Score of one normalised text for a normalised query; 0 = no match.
// Exact > prefix > word start > contains > close enough.
export function scoreText(query, text) {
  if (!query || !text) return 0;
  if (text === query) return 100;
  if (text.startsWith(query)) return 90;
  if (text.includes(` ${query}`)) return 80;
  if (text.includes(query)) return 60;

  const max = allowedTypos(query.length);
  if (max === 0) return 0;
  // The query against the whole text and against every run of as many words
  // as it has ("brekaing" against "breaking" in "breaking bad").
  const words = text.split(' ');
  const span = query.split(' ').length;
  const candidates = [text];
  for (let i = 0; i + span <= words.length; i++) candidates.push(words.slice(i, i + span).join(' '));
  // A prefix of a candidate may match too ("breakin" while typing).
  let best = max + 1;
  for (const candidate of candidates) {
    best = Math.min(best, editDistance(query, candidate, max));
    if (candidate.length > query.length) best = Math.min(best, editDistance(query, candidate.slice(0, query.length), max));
    if (best === 0) break;
  }
  return best <= max ? 40 - best * 10 : 0;
}

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

// A person counts with at most one typo in the name.
const PERSON_MIN_SCORE = 30;

const decadeOf = (year) => (Number.isFinite(year) ? Math.floor(year / 10) * 10 : null);

// The same person appears in many titles; each distinct name is scored once
// per search instead of once per title.
const personScorer = (normalized) => {
  const scores = new Map();
  return (name) => {
    let score = scores.get(name);
    if (score === undefined) {
      score = scoreText(normalized, name);
      scores.set(name, score);
    }
    return score;
  };
};

// Whether an entry passes the search filters (see rankEntries); `genres`
// here are the wanted ones, already normalised.
const passesFilters = (entry, { types = [], genres = [], decade = null, maxAge = null }) => {
  if (types.length && !types.includes(entry.type)) return false;
  if (genres.length && !genres.some(genre => entry.genres.has(genre))) return false;
  if (decade !== null) {
    const entryDecade = decadeOf(entry.year);
    if (entryDecade === null) return false;
    if (decade <= 1960 ? entryDecade > 1960 : entryDecade !== decade) return false;
  }
  if (maxAge !== null && (entry.age === null || entry.age > maxAge)) return false;
  return true;
};

// The same filters for a Jellyfin item, for the search without the
// catalogue.
export function itemMatchesFilters(item, filters = {}) {
  const entry = {
    type: item?.Type,
    year: Number.isFinite(item?.ProductionYear) ? item.ProductionYear : null,
    age: ageRating(item?.OfficialRating),
    genres: new Set((item?.Genres || []).map(normalizeForSearch))
  };
  return passesFilters(entry, { ...filters, genres: (filters.genres || []).map(normalizeForSearch).filter(Boolean) });
}

// `entries`: { id, type, libraryId, name, original, year, age, genres:Set, people:[{ id, name, displayName, imageTag }] }
// with normalised name/original/people names. Filters: types, genres (any
// of), decade (1990 means the 1990s; 1960 and older for "älter"), maxAge.
export function rankEntries(entries, { query = '', filters = {}, libraryIds = null, limit = 50 } = {}) {
  const normalized = normalizeForSearch(query);
  // Only punctuation ("%", "_"): nothing to look for.
  if (String(query).trim() && !normalized) return [];
  const { types = [], genres = [], decade = null, maxAge = null } = filters;
  const visible = Array.isArray(libraryIds) ? new Set(libraryIds) : null;
  const wanted = { types, genres: genres.map(normalizeForSearch).filter(Boolean), decade, maxAge };

  const scorePerson = personScorer(normalized);
  const scored = [];
  for (const entry of entries) {
    if (visible && !visible.has(entry.libraryId)) continue;
    if (!passesFilters(entry, wanted)) continue;

    let score = normalized ? Math.max(scoreText(normalized, entry.name), scoreText(normalized, entry.original) - 5) : 1;
    // Titles with the person searched for come after the title matches.
    if (normalized && score === 0) {
      const personScore = Math.max(0, ...entry.people.map(person => scorePerson(person.name)));
      if (personScore >= PERSON_MIN_SCORE) score = personScore / 4;
    }
    if (score > 0) scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score || (b.entry.rating || 0) - (a.entry.rating || 0) || a.entry.name.localeCompare(b.entry.name));
  return scored.slice(0, limit).map(({ entry }) => entry.id);
}

// The people whose name matches, each once, with how many visible titles.
export function rankPeople(entries, { query = '', libraryIds = null, limit = 12 } = {}) {
  const normalized = normalizeForSearch(query);
  if (normalized.length < 3) return [];
  const visible = Array.isArray(libraryIds) ? new Set(libraryIds) : null;
  const scorePerson = personScorer(normalized);
  const byId = new Map();
  for (const entry of entries) {
    if (visible && !visible.has(entry.libraryId)) continue;
    for (const person of entry.people) {
      const score = scorePerson(person.name);
      if (score < PERSON_MIN_SCORE) continue;
      const known = byId.get(person.id);
      if (known) known.count += 1;
      else byId.set(person.id, { person, score, count: 1 });
    }
  }
  return [...byId.values()]
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, limit)
    .map(({ person }) => ({ Id: person.id, Name: person.displayName, PrimaryImageTag: person.imageTag || undefined }));
}
