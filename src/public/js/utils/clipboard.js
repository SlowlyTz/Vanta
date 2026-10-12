// Puts text on the clipboard; without the Clipboard API (an insecure origin,
// older TV browsers) through a selected, hidden text field.
export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Denied: try the old way below.
    }
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  Object.assign(field.style, { position: 'fixed', top: '0', left: '0', opacity: '0', pointerEvents: 'none' });
  document.body.appendChild(field);
  field.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } finally {
    field.remove();
  }
  if (!copied) throw new Error('copy failed');
}
