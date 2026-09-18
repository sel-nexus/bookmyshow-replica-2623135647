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
/** Allocate a distinct file-backed SQLite database for the HTTP journey. */
function testDatabasePath(): string { return join(tmpdir(), `bookmyshow-integration-${Date.now()}-${Math.random().toString(36).slice(2)}.db`); }

describe('authentication, discovery, and booking integration', () => {
  let database: Database.Database;
  let databasePath: string;
  beforeEach(() => { databasePath = testDatabasePath(); database = createDatabase(databasePath); seedDiscovery(database); });
  afterEach(() => { database?.close(); if (existsSync(databasePath)) rmSync(databasePath); });

  it('completes login through a mapped discovery selection to a persisted booking confirmation', async () => {
    const app = createApp(database, testConfig);
    expect((await request(app).post('/api/auth/login').send({ mobileNumber: '9876543210' })).status).toBe(200);
    expect((await request(app).post('/api/auth/verify').send({ mobileNumber: '9876543210', otp: '1234' })).body.data.user.mobileNumber).toBe('9876543210');
    const movies = await request(app).get('/api/movies');
    expect(movies.body.data.movies[0]).toEqual({ id: 1, title: 'Paradise' });
    const theatres = await request(app).get('/api/theatres?movieId=1');
    expect(theatres.body.data.theatres[0]).toEqual({ id: 1, name: 'Sandhya 70mm' });
    const booking = await request(app).post('/api/bookings').send({ mobileNumber: '9876543210', movieId: 1, theatreId: 1, seats: ['B2', 'B3', 'B4'], paymentMethod: 'UPI', totalPrice: 450 });
    expect(booking.status).toBe(201);
    expect(booking.body.data).toMatchObject({ confirmationId: 'BMS-1', movie: { title: 'Paradise' }, theatre: { name: 'Sandhya 70mm' }, seats: ['B2', 'B3', 'B4'], paymentMethod: 'UPI', totalPrice: 450 });
    const recoveredConfirmation = await request(app).get(`/api/bookings/${booking.body.data.bookingId}`);
    expect(recoveredConfirmation.status).toBe(200);
    expect(recoveredConfirmation.body.data).toEqual(booking.body.data);
  });

  it('propagates an unmapped-theatre downstream error without creating a booking', async () => {
    const app = createApp(database, testConfig);
    await request(app).post('/api/auth/verify').send({ mobileNumber: '9876543210', otp: '1234' });
    const booking = await request(app).post('/api/bookings').send({ mobileNumber: '9876543210', movieId: 1, theatreId: 2, seats: ['B2', 'B3', 'B4'], paymentMethod: 'CARD', totalPrice: 450 });
    expect(booking.status).toBe(404);
    expect(booking.body.error.code).toBe('ENTITY_NOT_FOUND');
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });

  it('enforces declared SQLite UNIQUE, NOT NULL, CHECK, foreign-key, and RESTRICT-delete constraints', async () => {
    database.prepare("INSERT INTO users (mobile_number) VALUES ('9000000000')").run();
    expect(() => database.prepare("INSERT INTO users (mobile_number) VALUES ('9000000000')").run()).toThrow();
    expect(() => database.prepare('INSERT INTO movies (title) VALUES (NULL)').run()).toThrow();
    expect(() => database.prepare("INSERT INTO bookings (user_id, movie_id, theatre_id, seats, payment_method, total_price) VALUES (1, 1, 1, '[]', 'CASH', 450)").run()).toThrow();
    expect(() => database.prepare("INSERT INTO bookings (user_id, movie_id, theatre_id, seats, payment_method, total_price) VALUES (1, 1, 1, '[]', 'CARD', 449)").run()).toThrow();
    expect(() => database.prepare("INSERT INTO bookings (user_id, movie_id, theatre_id, seats, payment_method, total_price) VALUES (999, 1, 1, '[]', 'CARD', 450)").run()).toThrow();

    database.prepare("INSERT INTO bookings (user_id, movie_id, theatre_id, seats, payment_method, total_price) VALUES (1, 1, 1, '[]', 'CARD', 450)").run();
    expect(() => database.prepare('DELETE FROM movies WHERE id = 1').run()).toThrow();
    expect(() => database.prepare('DELETE FROM theatres WHERE id = 1').run()).toThrow();
    expect(() => database.prepare('DELETE FROM users WHERE id = 1').run()).toThrow();
  });
});
