import express from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import env from './config/env.js';
import { sessionMiddleware } from './config/session.js';
import { securityHeaders } from './middleware/security.middleware.js';
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

const app = express();

// Security Headers
app.use(securityHeaders);

// Gzip/brotli for text responses (JS, CSS, HTML, JSON); media proxies are excluded
app.use(compressResponses);

// Logging middleware
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

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
app.use('/api/admin', adminRoutes);
app.use('/api/watch-parties', watchPartyRoutes);
app.use('/api/watch-party-invitations', watchPartyInvitationsRoutes);
app.use('/api/internal', internalRoutes);
app.use('/', pageRoutes);

// Error Middleware
app.use(errorHandler);

export default app;
