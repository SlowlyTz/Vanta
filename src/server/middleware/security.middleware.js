import helmet from 'helmet';
import cspDirectives from '../config/csp.js';

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
