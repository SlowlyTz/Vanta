import express from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import env from './config/env.js';
import { sessionMiddleware } from './config/session.js';
import { permissionsPolicy, securityHeaders } from './middleware/security.middleware.js';
import { compressResponses, staticAssets } from './middleware/static.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import mediaRoutes from './routes/media/index.js';
import requestsRoutes from './routes/requests.routes.js';
import adminRoutes from './routes/admin/index.js';
import watchPartyRoutes from './routes/watch-party.routes.js';
import watchPartyInvitationsRoutes from './routes/watch-party-invitations.routes.js';
import pageRoutes from './routes/page.routes.js';
import internalRoutes from './routes/internal.routes.js';
import versionRoutes from './routes/version.routes.js';
import healthRoutes from './routes/health.routes.js';
import { logFormat } from './config/logging.js';
import reportsRoutes from './routes/reports.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import preferencesRoutes from './routes/preferences.routes.js';
import watchlistRoutes from './routes/watchlist.routes.js';
import { BUILD_ID, BUILD_HEADER } from './config/build.js';

const app = express();

// Behind nginx every connection comes from the proxy; this makes req.ip the
// visitor's address (login throttling, logs) and req.secure follow
// X-Forwarded-Proto, so COOKIE_SECURE=true works behind TLS termination.
app.set('trust proxy', env.TRUST_PROXY ?? false);

// Security Headers
app.use(securityHeaders);
app.use(permissionsPolicy);

// Every response names the deployed client build, so an open tab running an
// older one notices on its next API call (see js/utils/appVersion.js)
if (BUILD_ID) {
  app.use((req, res, next) => {
    res.setHeader(BUILD_HEADER, BUILD_ID);
    next();
  });
}

// Gzip/brotli for text responses (JS, CSS, HTML, JSON); media proxies are excluded
app.use(compressResponses);

// Logging middleware
app.use(morgan(logFormat(env.NODE_ENV)));

// Parse request bodies and cookies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Setup HTTP-only session cookies (shared with the watch-party WebSocket upgrade)
app.use(sessionMiddleware);

// Serve static assets: dist/ first in production, src/public otherwise (see config/static.js)
app.use(staticAssets);

// API and UI Routes
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/watch-parties', watchPartyRoutes);
app.use('/api/watch-party-invitations', watchPartyInvitationsRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api/version', versionRoutes);
app.use('/api/health', healthRoutes);

// An API path nobody handles is a JSON 404, never the app's index.html.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use('/', pageRoutes);

// Error Middleware
app.use(errorHandler);

export default app;
