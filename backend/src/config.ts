import { config as loadEnvironment } from 'dotenv';
import { z } from 'zod';

loadEnvironment();

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535),
  SQLITE_PATH: z.string().min(1),
  JWT_SIGNING_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
});

/** Represents validated runtime configuration for the backend. */
export type AppConfig = z.infer<typeof environmentSchema>;

/** Load and validate configuration before the HTTP server starts. */
export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  return environmentSchema.parse(environment);
}

/** Exposes the process configuration for normal application startup. */
export const appConfig = loadConfig();
