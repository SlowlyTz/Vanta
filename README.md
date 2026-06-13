# Slowly Stream - Jellyfin Web Client (Apple TV Look)

Ein moderner Jellyfin-Streaming-Client mit einem edlen, minimalistischen **Apple TV** Look. Die App läuft auf einem Node/Express-Server, der die statischen Frontend-Ressourcen ausliefert und als API-Proxy dient. So werden sicherheitskritische Operationen wie die Jellyfin-Authentifizierung serverseitig in Cookies gekapselt, ohne Token direkt im Browser offenzulegen.

## Features

- **Apple TV Design**: Dunkles Cinematic-Layout, große Kacheln, weiche Schatten und Blur-Effekte (Glassmorphism).
- **Zentrale Sitzungsverwaltung**: Sichere Authentifizierung mittels HTTP-only Session-Cookies.
- **Echte Jellyfin-API-Anbindung**: Keine Mockdaten oder Fake-Fallbacks.
- **Leistungsstarker Video-Player**: Eigener HTML5-Video-Player mit integrierten Apple-TV-artigen Controls (Timeline-Seeking, Mute/Volume-Slider, Fullscreen, Tastatur-Shortcuts).
- **Intelligentes Proxy-Streaming**: Medien- und Bildinhalte werden komplett über den Express-Server geschleust (unterstützt HTTP Range-Requests für flüssiges Spulen).
- **SPA mit Hash-Routing**: Schnelle Benutzeroberfläche dank modularer, asynchron geladener Seitenkomponenten (ES Modules).

## Projektstruktur

```txt
jellyfin-client/
├── server.js                     # Startdatei (Server-Bootstrapper)
├── package.json
├── .env                          # Lokale Umgebungsvariablen
├── .env.example
├── README.md
└── src/
    ├── public/                   # Frontend SPA (Vanilla JavaScript, HTML, CSS)
    │   ├── index.html
    │   ├── css/                  # Styling (base, layout, components, player, pages)
    │   └── js/                   # JS Module (api, components, pages, store, utils)
    └── server/                   # Backend API (Node, Express, Services, Middleware)
        ├── app.js
        ├── config/
        ├── middleware/           # auth, error & security headers (helmet)
        ├── routes/               # auth, media & fallback routes
        ├── services/             # jellyfin.service (API Abfragen)
        └── utils/
```

## Voraussetzungen

- **Node.js** (v18 oder höher empfohlen für native fetch-Unterstützung).
- Ein aktiver **Jellyfin-Server** (z.B. der standardmäßig konfigurierte Server `https://jellyfin.xslowly.de`).

## Installation

1. Installiere die Node-Pakete:
   ```bash
   npm install
   ```

2. Konfiguriere die Umgebungsvariablen in der `.env`-Datei (wurde bereits angelegt):
   ```env
   # Server
   PORT=3000
   NODE_ENV=development

   # Jellyfin
   JELLYFIN_BASE_URL=https://jellyfin.xslowly.de

   # Auth
   SESSION_SECRET=change-this-long-random-secret

   # Cookies
   COOKIE_SECURE=false
   ```

## Starten des Servers

Für den **Entwicklungsmodus** (mit automatischem Neustart bei Dateiänderungen):
```bash
npm run dev
```

Für den **Produktionsmodus**:
```bash
npm start
```

Anschließend kann die App im Browser unter `http://localhost:3000` aufgerufen werden.
