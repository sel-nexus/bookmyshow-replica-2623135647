import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Database from 'better-sqlite3';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AppConfig } from '../src/config';
import { createDatabase } from '../src/db/database';
import { AuthService } from '../src/services/authService';
import { createApp } from '../src/server';

const testConfig: AppConfig = {
  PORT: 4000,
  SQLITE_PATH: '',
  JWT_SIGNING_SECRET: 'test-signing-secret-that-is-long-enough',
  CORS_ORIGIN: 'http://127.0.0.1:3000',
  LOG_LEVEL: 'error',
};

/** Create an isolated file path for a SQLite test database. */
function testDatabasePath(): string {
  return join(tmpdir(), `bookmyshow-auth-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

describe('authentication API', () => {
  let database: Database.Database;
  let databasePath: string;

  beforeEach(() => {
    databasePath = testDatabasePath();
    database = createDatabase(databasePath);
  });

  afterEach(() => {
    if (database) {
      database.close();
    }
    if (existsSync(databasePath)) {
      rmSync(databasePath);
    }
  });

  it('accepts a valid login request and returns its mobile number', async () => {
    const response = await request(createApp(database, testConfig))
      .post('/api/auth/login')
      .send({ mobileNumber: '9999999999' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { accepted: true, mobileNumber: '9999999999' } });
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('rejects missing or non-string login request fields with correlated invalid-request errors', async () => {
    const app = createApp(database, testConfig);
    for (const body of [{}, { mobileNumber: 123 }]) {
      const response = await request(app).post('/api/auth/login').send(body);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.requestId).toBeTruthy();
    }
  });

  it('creates a SQLite user and returns a token for the accepted OTP', async () => {
    const response = await request(createApp(database, testConfig))
      .post('/api/auth/verify')
      .send({ mobileNumber: '9999999999', otp: '1234' });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user).toEqual({ id: 1, mobileNumber: '9999999999' });
    expect(database.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 1 });
  });

  it('finds an existing SQLite user when the accepted OTP is verified again', () => {
    const service = new AuthService(database, testConfig.JWT_SIGNING_SECRET);
    const first = service.verifyOtp('9999999999');
    const second = service.verifyOtp('9999999999');

    expect(second.user).toEqual(first.user);
    expect(database.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 1 });
  });

  it('rejects each malformed verification request with a correlated invalid-request error', async () => {
    const app = createApp(database, testConfig);
    const malformedCases: Array<{ name: string; body: unknown }> = [
      { name: 'missing mobile number', body: { otp: '1234' } },
      { name: 'missing OTP', body: { mobileNumber: '9999999999' } },
      { name: 'non-string mobile number', body: { mobileNumber: 9999999999, otp: '1234' } },
      { name: 'non-string OTP', body: { mobileNumber: '9999999999', otp: 1234 } },
      { name: 'empty mobile number', body: { mobileNumber: '', otp: '1234' } },
      { name: 'empty OTP', body: { mobileNumber: '9999999999', otp: '' } },
      { name: 'unexpected extra property', body: { mobileNumber: '9999999999', otp: '1234', role: 'admin' } },
    ];

    for (const malformedCase of malformedCases) {
      const response = await request(app).post('/api/auth/verify').send(malformedCase.body);

      expect(response.status, malformedCase.name).toBe(400);
      expect(response.body.error.code, malformedCase.name).toBe('INVALID_REQUEST');
      expect(response.body.error.requestId, malformedCase.name).toEqual(expect.any(String));
    }
  });

  it('rejects an unaccepted OTP with the OTP_NOT_ACCEPTED contract', async () => {
    const response = await request(createApp(database, testConfig))
      .post('/api/auth/verify')
      .send({ mobileNumber: '9999999999', otp: '0000' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('OTP_NOT_ACCEPTED');
    expect(response.body.error.requestId).toBeTruthy();
  });

  it('returns an OK health status after querying SQLite', async () => {
    const response = await request(createApp(database, testConfig)).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ok' } });
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('returns the correlated DB_UNAVAILABLE contract when its real SQLite connection is closed', async () => {
    const app = createApp(database, testConfig);
    database.close();

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body.error).toEqual({
      code: 'DB_UNAVAILABLE',
      message: 'Database is unavailable.',
      requestId: expect.any(String),
    });
  });
});
