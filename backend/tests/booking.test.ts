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
const validBooking = { mobileNumber: '9999999999', movieId: 1, theatreId: 1, seats: ['B2', 'B3', 'B4'], paymentMethod: 'CARD', totalPrice: 450 };

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
    expect(response.body.data).toEqual({ bookingId: 1, confirmationId: 'BMS-1', movie: { id: 1, title: 'Paradise' }, theatre: { id: 1, name: 'Sandhya 70mm' }, seats: ['B2', 'B3', 'B4'], paymentMethod: 'CARD', totalPrice: 450 });
    expect(database.prepare('SELECT user_id, movie_id, theatre_id, seats, payment_method, total_price FROM bookings').get()).toEqual({ user_id: 1, movie_id: 1, theatre_id: 1, seats: '["B2","B3","B4"]', payment_method: 'CARD', total_price: 450 });
  });

  it('retrieves the exact persisted confirmation after creating a booking', async () => {
    const app = createApp(database, testConfig);
    const created = await request(app).post('/api/bookings').send({ ...validBooking, paymentMethod: 'UPI' });
    const retrieved = await request(app).get(`/api/bookings/${created.body.data.bookingId}`);

    expect(retrieved.status).toBe(200);
    expect(retrieved.body.data).toEqual(created.body.data);
    expect(retrieved.body.data.paymentMethod).toBe('UPI');
  });

  it.each(['0', '-1', '1.5', 'abc', '1e2'])('rejects malformed booking IDs with a correlated validation error', async (bookingId) => {
    const response = await request(createApp(database, testConfig)).get(`/api/bookings/${bookingId}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'INVALID_BOOKING_ID', requestId: expect.any(String) });
  });

  it('returns a correlated not-found error for an unknown booking ID', async () => {
    const response = await request(createApp(database, testConfig)).get('/api/bookings/999');

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({ code: 'ENTITY_NOT_FOUND', requestId: expect.any(String) });
  });

  it.each([
    { ...validBooking, seats: ['B2', 'B2', 'B4'] },
    { ...validBooking, seats: ['B2', 'B3'] },
    { ...validBooking, seats: ['B2', 'B3', 'Z9'] },
    { ...validBooking, totalPrice: -1 },
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

  it.each([
    ['missing mobileNumber', { movieId: 1, theatreId: 1, seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', totalPrice: 450 }],
    ['missing movieId', { mobileNumber: '9999999999', theatreId: 1, seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', totalPrice: 450 }],
    ['missing theatreId', { mobileNumber: '9999999999', movieId: 1, seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', totalPrice: 450 }],
    ['missing seats', { mobileNumber: '9999999999', movieId: 1, theatreId: 1, paymentMethod: 'CARD', totalPrice: 450 }],
    ['missing paymentMethod', { mobileNumber: '9999999999', movieId: 1, theatreId: 1, seats: ['A1', 'A2', 'A3'], totalPrice: 450 }],
    ['missing totalPrice', { mobileNumber: '9999999999', movieId: 1, theatreId: 1, seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD' }],
    ['null body', null],
    ['primitive body', 'booking'],
    ['array body', []],
    ['string movie ID', { ...validBooking, movieId: '1' }],
    ['fractional theatre ID', { ...validBooking, theatreId: 1.5 }],
    ['blank mobile number', { ...validBooking, mobileNumber: '   ' }],
    ['extra key', { ...validBooking, admin: true }],
    ['SQL-shaped movie ID', { ...validBooking, movieId: '1 OR 1=1' }],
    ['XSS-shaped theatre ID', { ...validBooking, theatreId: '<script>alert(1)</script>' }],
  ])('rejects %s with a stable error and no durable booking write', async (_caseName, payload) => {
    const response = await request(createApp(database, testConfig)).post('/api/bookings').send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'INVALID_BOOKING', requestId: expect.any(String) });
    expect(response.body.data).toBeUndefined();
    expect(bookingCount(database)).toBe(0);
  });

  it('rejects JSON bodies above 32KB with a correlated error and no durable booking write', async () => {
    const oversizedJson = JSON.stringify({ ...validBooking, padding: 'x'.repeat(33 * 1024) });
    const response = await request(createApp(database, testConfig))
      .post('/api/bookings')
      .set('Content-Type', 'application/json')
      .send(oversizedJson);

    expect(response.status).toBe(413);
    expect(response.body.error).toEqual({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload exceeds the 32KB limit.',
      requestId: expect.any(String),
    });
    expect(bookingCount(database)).toBe(0);
  });
});
