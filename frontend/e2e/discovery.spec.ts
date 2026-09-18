import { expect, test, type Page } from '@playwright/test';

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function signIn(page: Page, waitForMovies = true) {
  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('9999999999');
  const [loginResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Continue' }).click(),
  ]);
  expect(loginResponse.ok()).toBeTruthy();
  await page.getByLabel('One-time passcode').fill('1234');
  const moviesPromise = waitForMovies
    ? page.waitForResponse((response) => response.url().includes('/api/movies') && response.request().method() === 'GET')
    : undefined;
  const [verifyResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/verify') && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Verify and continue' }).click(),
  ]);
  expect(verifyResponse.ok()).toBeTruthy();
  if (moviesPromise) expect((await moviesPromise).ok()).toBeTruthy();
}

test('authenticated customer sees seeded movies and mapped theatres from the backend', async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Choose the big screen moment.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Paradise' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bloody Romeo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'OG2' })).toBeVisible();
  const [theatresResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/theatres?movieId=') && response.request().method() === 'GET'),
    page.getByRole('button', { name: 'Choose Paradise' }).click(),
  ]);
  expect(theatresResponse.ok()).toBeTruthy();
  await expect(page.getByText('Sandhya 70mm')).toBeVisible();
  await expect(page.getByText('Allu Cinemas')).toBeVisible();
  expect(errors).toEqual([]);
});

test('discovery shows loading status while the live movies response is delayed', async ({ page }) => {
  const errors = captureBrowserErrors(page);
  let releaseMovies!: () => void;
  const release = new Promise<void>((resolve) => { releaseMovies = resolve; });
  await page.route('**/api/movies', async (route) => {
    await release;
    await route.continue();
  });
  await signIn(page, false);
  await expect(page.getByRole('status')).toBeVisible();
  const moviesResponse = page.waitForResponse((response) => response.url().includes('/api/movies') && response.request().method() === 'GET');
  releaseMovies();
  expect((await moviesResponse).ok()).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Paradise' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('discovery shows an empty theatre message and no continuation when no theatre is returned', async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await signIn(page);
  await page.waitForResponse((response) => response.url().includes('/api/movies') && response.request().method() === 'GET');
  await page.route('**/api/theatres?movieId=*', async (route) => {
    const movieId = new URL(route.request().url()).searchParams.get('movieId');
    await route.fulfill({ json: { data: { movieId, theatres: [] } } });
  });
  const [theatresResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/theatres?movieId=') && response.request().method() === 'GET'),
    page.getByRole('button', { name: 'Choose Paradise' }).click(),
  ]);
  expect(theatresResponse.ok()).toBeTruthy();
  await expect(page.getByText(/no theatres/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /select seats/i })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('movie discovery remains usable at a mobile viewport', async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  const moviesResponse = await page.waitForResponse((response) => response.url().includes('/api/movies') && response.request().method() === 'GET');
  expect(moviesResponse.ok()).toBeTruthy();
  await expect(page.getByRole('button', { name: 'Choose Paradise' })).toBeVisible();
  expect(errors).toEqual([]);
});
