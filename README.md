# Jellyfin Web Client

> **Work in Progress** — This project is under active development and is not yet a stable release. Expect breaking changes and incomplete features.

A modern Jellyfin streaming client with a minimalist Apple TV-inspired design. The application runs on a Node.js/Express backend that serves static frontend assets and acts as an API proxy. Authentication is handled server-side with HTTP-only session cookies, keeping credentials out of the browser.

## Features

- **Apple TV Design**: Dark cinematic layout with large tiles, soft shadows, and glassmorphism blur effects.
- **Secure Session Management**: Server-side authentication via HTTP-only session cookies.
- **Jellyfin API Integration**: Full API connectivity with no mock data or fallbacks.
- **Custom Video Player**: HTML5 video player with timeline seeking, volume control, fullscreen, and keyboard shortcuts.
- **Proxy Streaming**: Media and image content proxied through Express with HTTP Range-Request support for smooth seeking.
- **SPA with Hash Routing**: Fast navigation with modular, dynamically loaded page components (ES Modules).

## Project Structure

```
jellyfin-client/
├── server.js                     # Entry point
├── package.json
├── .env                          # Environment variables (not committed)
├── .env.example                  # Template for environment variables
├── README.md
└── src/
    ├── public/                   # Frontend SPA (Vanilla JS, HTML, CSS)
    │   ├── index.html
    │   ├── css/                  # Styles (base, layout, components, pages, player)
    │   └── js/                   # Modules (api, components, pages, store, utils)
    └── server/                   # Backend API (Node, Express)
        ├── app.js
        ├── config/               # Environment configuration
        ├── middleware/           # Auth, error handling, security headers
        ├── routes/               # Auth, media, and page routes
        ├── services/             # Jellyfin API service
        └── utils/                # Utility functions
```

## Prerequisites

- **Node.js** v18 or higher (for native `fetch` support).
- A running **Jellyfin server** (any version supporting the REST API).

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy and configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Jellyfin server URL and a secure session secret.

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Open `http://localhost:3000` in your browser.

## Architecture

The browser communicates exclusively with the Express backend. The backend proxies all Jellyfin API requests, handling authentication and streaming. No direct browser-to-Jellyfin communication occurs.

- **Frontend**: Vanilla JavaScript SPA with hash-based routing and dynamic module loading.
- **Backend**: Express.js server with session management, API proxying, and media streaming.
- **No build step**: ES modules served directly; no bundler required.
