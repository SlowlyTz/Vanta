import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import morgan from 'morgan';
import env from './config/env.js';
import { securityHeaders } from './middleware/security.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import mediaRoutes from './routes/media/index.js';
import requestsRoutes from './routes/requests.routes.js';
import pageRoutes from './routes/page.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Security Headers
app.use(securityHeaders);

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

// Setup HTTP-only session cookies
app.use(session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.COOKIE_SECURE,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, '../public')));

// API and UI Routes
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/', pageRoutes);

// Error Middleware
app.use(errorHandler);

export default app;
