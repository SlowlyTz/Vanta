// German names for the English genre names TMDB gives TV series. Only the
// label changes; links and filters keep Jellyfin's name.
const GENRE_LABELS = {
  'Action & Adventure': 'Action & Abenteuer',
  'Sci-Fi & Fantasy': 'Science-Fiction & Fantasy',
  'War & Politics': 'Krieg & Politik',
  Kids: 'Kinder',
  News: 'Nachrichten',
  Soap: 'Seifenoper',
  Talk: 'Talkshow',
  Reality: 'Reality-TV'
};

export const genreLabel = name => GENRE_LABELS[name] || name;
