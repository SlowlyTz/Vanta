// Display formatting for run times, playback positions and years.

// A run time as the German UI writes it: "2 Std. 37 Min." or "24 Min.".
export function formatTicksToDuration(ticks) {
  if (!ticks) return '';
  const minutes = Math.round(ticks / 10_000_000 / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return remainingMinutes ? `${hours} Std. ${remainingMinutes} Min.` : `${hours} Std.`;
  }
  return `${remainingMinutes} Min.`;
}

export function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const formattedMins = mins.toString().padStart(2, '0');
  const formattedSecs = secs.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${formattedMins}:${formattedSecs}`;
  }
  return `${formattedMins}:${formattedSecs}`;
}

export function formatYear(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getFullYear()) ? '' : date.getFullYear().toString();
}
