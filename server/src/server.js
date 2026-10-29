import { createApp } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrator.js';
import { initCron } from './services/cron.service.js';

try {
  console.log('[Server] Checking and applying database migrations...');
  runMigrations();
  console.log('[Server] Database migrations ready.');

  initCron();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`[Server] Room Rent Management API running on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = () => {
    console.log('[Server] Gracefully shutting down...');
    server.close(() => {
      console.log('[Server] Closed remaining connections.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (err) {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
}
