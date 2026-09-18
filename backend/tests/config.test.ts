import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

describe('runtime configuration', () => {
  it('validates configuration only when startup explicitly loads it', () => {
    expect(() => loadConfig({
      PORT: '4000',
      SQLITE_PATH: '/tmp/nexus-test.sqlite',
      JWT_SIGNING_SECRET: 'test-signing-secret-that-is-long-enough',
      CORS_ORIGIN: 'http://127.0.0.1:3000',
      LOG_LEVEL: 'info',
    })).not.toThrow();

    expect(() => loadConfig({})).toThrow();
  });
});
