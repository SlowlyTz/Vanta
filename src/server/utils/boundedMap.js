// Caches kept in a Map grow with every user and title. Once one is full, an
// entry that is added first drops what has expired, then the oldest ones.
export function setBounded(map, key, value, { max, isExpired = () => false }) {
  if (!map.has(key) && map.size >= max) {
    for (const [oldKey, oldValue] of map) {
      if (isExpired(oldValue)) map.delete(oldKey);
    }
    while (map.size >= max) map.delete(map.keys().next().value);
  }
  map.set(key, value);
  return value;
}
