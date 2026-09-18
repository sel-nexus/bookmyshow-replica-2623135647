import { expect, test } from '@playwright/test';

test('customer completes the real booking journey and sees backend confirmation data', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto('/');
  await page.getByLabel('Mobile number').fill('9999999999');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('One-time passcode').fill('1234');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await page.getByRole('button', { name: 'Choose Paradise' }).click();
  await page.getByRole('button', { name: 'Choose Sandhya 70mm' }).click();
  await page.getByRole('button', { name: 'Select seats' }).click();
  await page.getByRole('radio', { name: 'UPI' }).check();
  await page.getByLabel('UPI ID').fill('demo@upi');
  await page.getByRole('button', { name: 'Pay Rs.450' }).click();
  await expect(page.getByRole('heading', { name: 'Congratulations!' })).toBeVisible();
  await expect(page.getByText(/^BMS-\d+$/)).toBeVisible();
  await expect(page.getByText('Paradise')).toBeVisible();
  await expect(page.getByText('Sandhya 70mm')).toBeVisible();
  await expect(page.getByText('A1, A2, A3')).toBeVisible();
  await expect(page.getByText('UPI')).toBeVisible();
  await expect(page.getByText('Rs.450')).toBeVisible();
  expect(errors).toEqual([]);
});
