function formatCount(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat('de-DE').format(value) : '-';
}

function getTotalItems(result) {
  if (!result || result.status !== 'fulfilled') return null;
  const value = result.value?.totalItems ?? result.value?.totalRecordCount;
  return Number.isFinite(value) ? value : null;
}

// The counts change rarely: one answer is kept for a few minutes, so moving
// between the profile, "Meine Liste" and the favourites asks only once.
const STATS_TTL_MS = 5 * 60 * 1000;
let cachedStats = null; // { at, promise }

const fetchStats = async () => {
  const { MediaApi } = await import('../../api/media.api.js');
  return Promise.allSettled([
    MediaApi.getLibrary('Movie', null, null, 1, 1),
    MediaApi.getLibrary('Series', null, null, 1, 1),
    MediaApi.getLibrary('Episode', null, null, 1, 1)
  ]);
};

export function resetSettingsStatsCache() {
  cachedStats = null;
}

export function createSettingsStatsLoader(overview) {
  let loaded = false;
  let loading = false;

  const setValue = (key, value) => {
    overview[key].textContent = value;
  };

  const setLoading = () => {
    setValue('movies', '...');
    setValue('series', '...');
    setValue('episodes', '...');
  };

  const setFallback = () => {
    setValue('movies', '-');
    setValue('series', '-');
    setValue('episodes', '-');
  };

  const load = async () => {
    if (loaded || loading) return;

    loading = true;
    setLoading();

    try {
      if (!cachedStats || Date.now() - cachedStats.at > STATS_TTL_MS) {
        cachedStats = { at: Date.now(), promise: fetchStats() };
      }
      const [movies, series, episodes] = await cachedStats.promise;
      if (![movies, series, episodes].some(result => result.status === 'fulfilled')) cachedStats = null;

      setValue('movies', formatCount(getTotalItems(movies)));
      setValue('series', formatCount(getTotalItems(series)));
      setValue('episodes', formatCount(getTotalItems(episodes)));
      loaded = [movies, series, episodes].some(result => result.status === 'fulfilled');
    } catch (error) {
      console.error('Failed to load settings overview:', error);
      setFallback();
    } finally {
      loading = false;
    }
  };

  return { load };
}
