import app from './src/server/app.js';
import env from './src/server/config/env.js';

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[Server] running on port ${PORT} in ${env.NODE_ENV} mode`);
  if (env.SEER_ENABLED) {
    console.log(`[Jellyseer] aktiviert (${env.SEER_BASE_URL})`);
  } else {
    console.log('[Jellyseer] deaktiviert');
  }
});
