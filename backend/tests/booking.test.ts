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
const validBooking = { mobileNumber: '9999999999', movieId: 1, theatreId: 1, seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', totalPrice: 450 };

/** Create a unique durable SQLite path for each booking test. */
function testDatabasePath(): string { return join(tmpdir(), `bookmyshow-booking-${Date.now()}-${Math.random().toString(36).slice(2)}.db`); }

/** Count durable booking rows after an API operation. */
function bookingCount(database: Database.Database): number { return (database.prepare('SELECT COUNT(*) AS count FROM bookings').get() as { count: number }).count; }

describe('booking API', () => {
  let database: Database.Database;
  let databasePath: string;

  beforeEach(async () => {
    databasePath = testDatabasePath();
    database = createDatabase(databasePath);
    seedDiscovery(database);
    await request(createApp(database, testConfig)).post('/api/auth/verify').send({ mobileNumber: validBooking.mobileNumber, otp: '1234' });
  });
  afterEach(() => { database?.close(); if (existsSync(databasePath)) rmSync(databasePath); });

  it('commits a full booking confirmation and persists canonical values', async () => {
    const response = await request(createApp(database, testConfig)).post('/api/bookings').send(validBooking);
    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({ bookingId: 1, confirmationId: 'BMS-1', movie: { id: 1, title: 'Paradise' }, theatre: { id: 1, name: 'Sandhya 70mm' }, seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', totalPrice: 450 });
    expect(database.prepare('SELECT user_id, movie_id, theatre_id, seats, payment_method, total_price FROM bookings').get()).toEqual({ user_id: 1, movie_id: 1, theatre_id: 1, seats: '["A1","A2","A3"]', payment_method: 'CARD', total_price: 450 });
  });

  it.each([
    { ...validBooking, seats: ['A2', 'A1', 'A3'] },
    { ...validBooking, totalPrice: 449 },
    { ...validBooking, paymentMethod: 'CASH' },
  ])('rejects tampered booking values without writing a row', async (payload) => {
    const response = await request(createApp(database, testConfig)).post('/api/bookings').send(payload);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_BOOKING');
    expect(bookingCount(database)).toBe(0);
  });

  it.each([{ ...validBooking, theatreId: 2 }, { ...validBooking, movieId: 99 }])('returns not found for missing or unmapped entities without writing a row', async (payload) => {
    const response = await request(createApp(database, testConfig)).post('/api/bookings').send(payload);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ENTITY_NOT_FOUND');
    expect(bookingCount(database)).toBe(0);
  });

  it('rolls back and does not return a confirmation when SQLite insertion fails', async () => {
    database.exec("CREATE TRIGGER reject_bookings BEFORE INSERT ON bookings BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;");
    const response = await request(createApp(database, testConfig)).post('/api/bookings').send(validBooking);
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('BOOKING_WRITE_FAILED');
    expect(response.body.data).toBeUndefined();
    expect(bookingCount(database)).toBe(0);
  });
});
