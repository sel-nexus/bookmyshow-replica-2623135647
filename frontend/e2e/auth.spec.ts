import { expect, test } from '@playwright/test';

/** Verify the login and OTP flow across the live frontend and backend boundary. */
test('customer signs in with an accepted one-time passcode', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/');
  await page.getByLabel('Mobile number').fill('9999999999');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/otp$/);
  await page.getByLabel('One-time passcode').fill('1234');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(browserErrors).toEqual([]);
});

/** Verify rejected OTPs remain readable without completing navigation. */
test('customer sees an inline error for a rejected one-time passcode', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Mobile number').fill('9999999999');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('One-time passcode').fill('0000');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page.getByRole('alert')).toContainText('The supplied OTP was not accepted.');
  await expect(page).toHaveURL(/\/otp$/);
});
