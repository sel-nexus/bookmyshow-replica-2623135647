import { expect, test, type Page } from '@playwright/test';

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Verify a direct dashboard visit recovers gracefully when no session is available. */
test('unauthenticated dashboard entry offers a return to sign-in', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/dashboard');

  await expect(page.getByText(/booking session is unavailable/i)).toBeVisible();
  await page.getByRole('button', { name: 'Return to sign in' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(browserErrors).toEqual([]);
});

/** Verify a direct theatre visit recovers gracefully when no session is available. */
test('unauthenticated theatre entry offers a return to browsing', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/theatres');

  await expect(page.getByText(/active signed-in session and movie selection/i)).toBeVisible();
  await page.getByRole('button', { name: 'Browse movies' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(browserErrors).toEqual([]);
});

/** Verify the login and OTP flow across the live frontend and backend boundary. */
test('customer signs in with an accepted one-time passcode', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /movies, moments/i })).toBeVisible();
  await page.getByRole('link', { name: 'Book tickets' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Mobile number').fill('9999999999');
  const [loginResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Continue' }).click(),
  ]);
  expect(loginResponse.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/otp$/);

  await page.getByLabel('One-time passcode').fill('1234');
  const [verifyResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/verify') && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Verify and continue' }).click(),
  ]);
  expect(verifyResponse.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(browserErrors).toEqual([]);
});

/** Verify rejected OTPs remain readable without completing navigation. */
test('customer sees an inline error for a rejected one-time passcode', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('9999999999');
  const [loginResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Continue' }).click(),
  ]);
  expect(loginResponse.ok()).toBeTruthy();
  await page.getByLabel('One-time passcode').fill('0000');
  const [verifyResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/verify') && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Verify and continue' }).click(),
  ]);
  expect(verifyResponse.ok()).toBeFalsy();
  await expect(page.locator('#otp-error')).toContainText('The supplied OTP was not accepted.');
  await expect(page).toHaveURL(/\/otp$/);
  expect(browserErrors).toEqual([]);
});
