import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type Database from 'better-sqlite3';
import { loadConfig, type AppConfig } from './config';
import { createDatabase } from './db/database';
import { seedDiscovery } from './db/seed';
import { errorHandler } from './middleware/errorHandler';
import { requestContext } from './middleware/requestContext';
import { createAuthRouter } from './routers/authRouter';
import { createDiscoveryRouter } from './routers/discoveryRouter';
import { createBookingRouter } from './routers/bookingRouter';
import { BookingRepository } from './repositories/bookingRepository';
import { DiscoveryRepository } from './repositories/discoveryRepository';
import { AuthService } from './services/authService';
import { BookingService } from './services/bookingService';
import { DiscoveryService } from './services/discoveryService';
import { AppError } from './types/domain';

/** Create the Express application with injectable dependencies for file-backed database tests. */
export function createApp(database: Database.Database, configuration: AppConfig): Application {
  const app = express();
  const authService = new AuthService(database, configuration.JWT_SIGNING_SECRET);
  const discoveryService = new DiscoveryService(new DiscoveryRepository(database));
  const bookingService = new BookingService(database, new BookingRepository(database));

  app.use(requestContext);
  app.use(helmet());
  app.use(cors({ origin: configuration.CORS_ORIGIN }));
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (request: Request, response: Response, next: NextFunction): void => {
    try {
      database.prepare('SELECT 1').get();
      response.status(200).json({ data: { status: 'ok' } });
    } catch (_error: unknown) {
      next(new AppError(503, 'DB_UNAVAILABLE', 'Database is unavailable.'));
    }
  });
  app.use('/api/auth', createAuthRouter(authService));
  app.use('/api', createDiscoveryRouter(discoveryService));
  app.use('/api', createBookingRouter(bookingService));
  app.use(errorHandler);
  return app;
}

/** Start the configured production HTTP server. */
export function startServer(): void {
  const configuration = loadConfig();
  const database = createDatabase(configuration.SQLITE_PATH);
  seedDiscovery(database);
  const app = createApp(database, configuration);
  app.listen(configuration.PORT, () => {
    console.info(`BookMyShow API listening on port ${configuration.PORT}`);
  });
}

if (require.main === module) {
  startServer();
}
