// What the player tells the viewer about a failed start or stream. Browser
// errors (DOMException texts, English, with links) never reach the screen.
const BROWSER_ERRORS = {
  NotSupportedError: 'Dieses Format kann der Browser nicht abspielen.',
  NotAllowedError: 'Der Browser hat den Start blockiert. Starte die Wiedergabe von Hand.',
  AbortError: 'Die Wiedergabe wurde unterbrochen.',
  NetworkError: 'Die Verbindung zum Stream ist abgebrochen.'
};
const FALLBACK = 'Der Stream konnte nicht geladen werden.';

export function playbackErrorMessage(errorOrMessage) {
  if (!errorOrMessage) return FALLBACK;
  if (typeof errorOrMessage === 'string') return looksLikeBrowserText(errorOrMessage) ? FALLBACK : errorOrMessage;
  if (BROWSER_ERRORS[errorOrMessage.name]) return BROWSER_ERRORS[errorOrMessage.name];
  const message = errorOrMessage.message;
  return message && !looksLikeBrowserText(message) ? message : FALLBACK;
}

// Our own messages are German sentences; browser texts carry English words or links.
function looksLikeBrowserText(text) {
  return /https?:\/\/|\b(the|request|failed|error|interrupted|undefined)\b/i.test(text);
}
