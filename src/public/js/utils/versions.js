// Names for the copies of a film kept in several libraries ("4K · HDR · 5.1"),
// for the version choice on the detail page and in the player.

const formatSize = (bytes) => (bytes ? `${(bytes / 1024 ** 3).toFixed(bytes >= 10 * 1024 ** 3 ? 0 : 1).replace('.', ',')} GB` : null);

export function versionLabel(copy, index) {
  const media = copy?.Media || {};
  const parts = [media.resolution, media.dynamicRange, media.audio].filter(Boolean);
  return parts.length ? parts.join(' · ') : `Version ${index + 1}`;
}

// Equal labels get the file size, then a number, so every choice reads differently.
export function versionOptions(copies = [], currentId = null) {
  const labels = copies.map(versionLabel);
  return copies.map((copy, index) => {
    let label = labels[index];
    if (labels.filter(other => other === label).length > 1) {
      const size = formatSize(copy.Media?.size);
      label = size ? `${label} · ${size}` : `${label} (${index + 1})`;
    }
    return { id: copy.Id, label, selected: copy.Id === currentId };
  });
}
