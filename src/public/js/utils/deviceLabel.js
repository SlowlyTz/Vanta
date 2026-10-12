// "Chrome auf Windows" from a user agent, for the list of signed-in devices.
export function deviceLabel(userAgent = '') {
  const ua = String(userAgent);
  if (!ua) return 'Unbekanntes Gerät';
  const os = /Tizen/i.test(ua) ? 'Samsung TV'
    : /Web0S|webOS/i.test(ua) ? 'LG TV'
      : /AFT[A-Z]/.test(ua) ? 'Fire TV'
        : /Android/i.test(ua) && /\bTV\b|GoogleTV|BRAVIA/i.test(ua) ? 'Android TV'
          : /iPhone/.test(ua) ? 'iPhone'
            : /iPad/.test(ua) ? 'iPad'
              : /Android/i.test(ua) ? 'Android'
                : /Windows/i.test(ua) ? 'Windows'
                  : /Mac OS X|Macintosh/i.test(ua) ? 'macOS'
                    : /CrOS/.test(ua) ? 'ChromeOS'
                      : /Linux/i.test(ua) ? 'Linux' : null;
  const browser = /SamsungBrowser/i.test(ua) ? 'Samsung Internet'
    : /Edg\//.test(ua) ? 'Edge'
      : /OPR\/|Opera/.test(ua) ? 'Opera'
        : /Firefox\//.test(ua) ? 'Firefox'
          : /Chrome\/|CriOS/.test(ua) ? 'Chrome'
            : /Safari\//.test(ua) ? 'Safari' : null;
  if (browser && os) return `${browser} auf ${os}`;
  return browser || os || 'Unbekanntes Gerät';
}
