import { expect, test } from '@playwright/test';

test('authenticated customer sees seeded movies and mapped theatres from the backend', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  const login = await request.post('http://127.0.0.1:4000/api/auth/login', { data: { mobileNumber: '9999999999' } });
  expect(login.ok()).toBeTruthy();
  const verify = await request.post('http://127.0.0.1:4000/api/auth/verify', { data: { mobileNumber: '9999999999', otp: '1234' } });
  const verified = await verify.json() as { data: { token: string } };

  await page.goto('/');
  await page.getByLabel('Mobile number').fill('9999999999');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('One-time passcode').fill('1234');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page.getByRole('heading', { name: 'Choose the big screen moment.' })).toBeVisible();
  await expect(page.getByText('Paradise')).toBeVisible();
  await expect(page.getByText('Bloody Romeo')).toBeVisible();
  await expect(page.getByText('OG2')).toBeVisible();
  await page.getByRole('button', { name: 'Choose Paradise' }).click();
  await expect(page.getByText('Sandhya 70mm')).toBeVisible();
  await expect(page.getByText('Allu Cinemas')).toBeVisible();
  expect(verified.data.token).toBeTruthy();
  expect(errors).toEqual([]);
});
