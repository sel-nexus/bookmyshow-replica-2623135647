import { expect, test, type Page } from '@playwright/test';

function captureBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Verify the interactive seat and UPI checkout journey uses actual selected values. */
test('customer chooses three seats and starts UPI checkout', async ({ page }) => {
  const errors = captureBrowserErrors(page);

  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('9999999999');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('One-time passcode').fill('1234');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await page.getByRole('button', { name: 'Choose Paradise' }).click();
  await page.getByRole('button', { name: 'Choose Sandhya 70mm' }).click();
  await page.getByRole('button', { name: 'Seat B2' }).click();
  await page.getByRole('button', { name: 'Seat B3' }).click();
  await page.getByRole('button', { name: 'Seat B4' }).click();
  await expect(page.getByText('Selected seats: B2, B3, B4 · Rs.450')).toBeVisible();
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await page.getByRole('radio', { name: 'UPI' }).check();
  await expect(page.getByRole('button', { name: 'Pay Rs.450' })).toBeEnabled();
  expect(errors).toEqual([]);
});
