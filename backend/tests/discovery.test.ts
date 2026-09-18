import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Database from 'better-sqlite3';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AppConfig } from '../src/config';
import { createDatabase } from '../src/db/database';
import { seedDiscovery } from '../src/db/seed';
import { createApp } from '../src/server';

const testConfig: AppConfig = { PORT: 4000, SQLITE_PATH: '', JWT_SIGNING_SECRET: 'test-signing-secret-that-is-long-enough', CORS_ORIGIN: 'http://127.0.0.1:3000', LOG_LEVEL: 'error' };

/** Create an isolated SQLite filename so every test uses a durable database file. */
function testDatabasePath(): string { return join(tmpdir(), `bookmyshow-discovery-${Date.now()}-${Math.random().toString(36).slice(2)}.db`); }

describe('discovery API', () => {
  let database: Database.Database;
  let databasePath: string;

  beforeEach(() => { databasePath = testDatabasePath(); database = createDatabase(databasePath); });
  afterEach(() => { database?.close(); if (existsSync(databasePath)) rmSync(databasePath); });

  it('idempotently seeds exactly three prescribed records and four exact mappings', () => {
    seedDiscovery(database);
    seedDiscovery(database);
    expect(database.prepare('SELECT title FROM movies ORDER BY id').all()).toEqual([{ title: 'Paradise' }, { title: 'Bloody Romeo' }, { title: 'OG2' }]);
    expect(database.prepare('SELECT name FROM theatres ORDER BY id').all()).toEqual([{ name: 'Sandhya 70mm' }, { name: 'Sudharsham' }, { name: 'Allu Cinemas' }]);
    expect(database.prepare('SELECT COUNT(*) AS count FROM movie_theatres').get()).toEqual({ count: 4 });
  });

  it('returns complete movie and mapped theatre response shapes from a seeded real database', async () => {
    seedDiscovery(database);
    const app = createApp(database, testConfig);
    const movies = await request(app).get('/api/movies');
    expect(movies.status).toBe(200);
    expect(movies.body).toEqual({ data: { movies: [{ id: 1, title: 'Paradise' }, { id: 2, title: 'Bloody Romeo' }, { id: 3, title: 'OG2' }] } });
    const theatres = await request(app).get('/api/theatres?movieId=1');
    expect(theatres.status).toBe(200);
    expect(theatres.body).toEqual({ data: { movieId: 1, theatres: [{ id: 1, name: 'Sandhya 70mm' }, { id: 3, name: 'Allu Cinemas' }] } });
  });

  it('rejects absent, malformed, repeated, and nonpositive movie IDs with request-correlated errors', async () => {
    const app = createApp(database, testConfig);
    for (const path of ['/api/theatres', '/api/theatres?movieId=zero', '/api/theatres?movieId=0', '/api/theatres?movieId=-1', '/api/theatres?movieId=1.5', '/api/theatres?movieId=1&movieId=2']) {
      const response = await request(app).get(path);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_MOVIE_ID');
      expect(response.body.error.requestId).toEqual(expect.any(String));
    }
  });

  it('returns empty results from a real empty database and for a movie with no theatre mapping', async () => {
    const app = createApp(database, testConfig);
    expect((await request(app).get('/api/movies')).body).toEqual({ data: { movies: [] } });
    database.prepare("INSERT INTO movies (title) VALUES ('Unmapped')").run();
    expect((await request(app).get('/api/theatres?movieId=1')).body).toEqual({ data: { movieId: 1, theatres: [] } });
  });
});
