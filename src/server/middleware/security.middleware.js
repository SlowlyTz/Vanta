import helmet from 'helmet';
import cspDirectives from '../config/csp.js';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: cspDirectives
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
});
