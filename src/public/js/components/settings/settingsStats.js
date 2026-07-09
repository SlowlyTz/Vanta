function formatCount(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat('de-DE').format(value) : '-';
}

function getTotalItems(result) {
  if (!result || result.status !== 'fulfilled') return null;
  const value = result.value?.totalItems ?? result.value?.totalRecordCount;
  return Number.isFinite(value) ? value : null;
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
      const { MediaApi } = await import('../../api/media.api.js');
      const [movies, series, episodes] = await Promise.allSettled([
        MediaApi.getLibrary('Movie', null, null, 1, 1),
        MediaApi.getLibrary('Series', null, null, 1, 1),
        MediaApi.getLibrary('Episode', null, null, 1, 1)
      ]);

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
