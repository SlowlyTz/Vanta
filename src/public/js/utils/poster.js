export function createPosterPlaceholder(text) {
  const initials = (text || '?')
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
    <rect width="200" height="300" fill="hsl(240, 10%, 12%)"/>
    <text x="100" y="155" text-anchor="middle" dominant-baseline="middle" font-family="-apple-system, sans-serif" font-weight="600" font-size="36" fill="hsl(240, 5%, 50%)">${initials || '?'}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}