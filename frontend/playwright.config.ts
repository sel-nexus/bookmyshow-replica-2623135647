import { defineConfig } from '@playwright/test';

/** Configure browser tests against the real local frontend and backend services. */
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'on-first-retry' },
  webServer: [
    { command: 'node node_modules/ts-node-dev/bin/ts-node-dev --files --respawn src/server.ts', cwd: '../backend', url: 'http://127.0.0.1:4000/api/health', reuseExistingServer: true, timeout: 30000 },
    { command: 'node node_modules/next/dist/bin/next dev -p 3000', cwd: '.', url: 'http://127.0.0.1:3000', reuseExistingServer: true, timeout: 30000, env: { BACKEND_DEV_ORIGIN: 'http://127.0.0.1:4000' } },
  ],
});
