import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import healthRoutes from './routes/health.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { NotFoundError } from './utils/errors.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root health check
  app.use('/health', healthRoutes);

  // Mount API
  app.use('/api', routes);

  // Catch 404
  app.use((req, res, next) => {
    next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
  });

  // Error handling
  app.use(errorHandler);

  return app;
}
