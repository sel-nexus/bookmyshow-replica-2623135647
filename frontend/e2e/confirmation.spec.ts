import { expect, test, type Page } from '@playwright/test';

function captureBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Verify a non-default persisted booking response is displayed without substitution. */
test('confirmation renders actual persisted B-row seats from the booking response', async ({ page }) => {
  const errors = captureBrowserErrors(page);

  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('9999999999');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('One-time passcode').fill('1234');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await page.getByRole('button', { name: 'Choose Paradise' }).click();
  await page.getByRole('button', { name: 'Choose Sandhya 70mm' }).click();
  for (const seat of ['B2', 'B3', 'B4']) {
    await page.getByRole('button', { name: `Seat ${seat}` }).click();
  }
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await page.getByRole('radio', { name: 'UPI' }).check();

  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) => candidate.url().includes('/api/bookings') && candidate.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Pay Rs.450' }).click(),
  ]);
  const booking = await response.json() as { data: { seats: string[]; totalPrice: number } };

  expect(booking.data.seats).toEqual(['B2', 'B3', 'B4']);
  await expect(page.getByText('B2, B3, B4')).toBeVisible();
  await expect(page.getByText(`Rs.${booking.data.totalPrice}`)).toBeVisible();
  expect(errors).toEqual([]);
});
