// Security headers: helmet with the CSP from config/csp.js, plus Permissions-Policy.
import helmet from 'helmet';
import cspDirectives from '../config/csp.js';

// Browser features VANTA never uses stay off for the page and anything it
// embeds; fullscreen, picture-in-picture and autoplay keep their defaults.
export const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()';

export const permissionsPolicy = (req, res, next) => {
  res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
  next();
};

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: cspDirectives
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  permissionsPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
});
