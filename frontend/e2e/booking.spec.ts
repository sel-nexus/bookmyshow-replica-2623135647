import { expect, test, type Page } from '@playwright/test';

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function completeJourneyToPayment(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Book tickets' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Mobile number').fill('9999999999');
  const [loginResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Continue' }).click(),
  ]);
  expect(loginResponse.ok()).toBeTruthy();
  await page.getByLabel('One-time passcode').fill('1234');
  const [verifyResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/verify') && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Verify and continue' }).click(),
  ]);
  expect(verifyResponse.ok()).toBeTruthy();
  const [theatresResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/theatres?movieId=') && response.request().method() === 'GET'),
    page.getByRole('button', { name: 'Choose Paradise' }).click(),
  ]);
  expect(theatresResponse.ok()).toBeTruthy();
  await page.getByRole('button', { name: 'Choose Sandhya 70mm' }).click();
  for (const seat of ['B2', 'B3', 'B4']) {
    await page.getByRole('button', { name: `Seat ${seat}` }).click();
  }
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await page.getByRole('radio', { name: 'UPI' }).check();
  await page.getByLabel('UPI ID').fill('demo@upi');
}

function isBookingPost(response: { url: () => string; request: () => { method: () => string } }) {
  return response.url().includes('/api/bookings') && response.request().method() === 'POST';
}

test('customer completes the real booking journey and sees durable backend confirmation data', async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await completeJourneyToPayment(page);
  const [bookingResponse] = await Promise.all([
    page.waitForResponse(isBookingPost),
    page.getByRole('button', { name: 'Pay Rs.450' }).click(),
  ]);
  expect(bookingResponse.ok()).toBeTruthy();
  const booking = await bookingResponse.json() as { data: { bookingId: number; confirmationId: string; movie: { title: string }; theatre: { name: string }; seats: string[]; paymentMethod: string; totalPrice: number } };
  expect(booking.data.bookingId).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/confirmation\\?bookingId=${booking.data.bookingId}$`));
  await expect(page.getByRole('heading', { name: 'Congratulations!' })).toBeVisible();
  await expect(page.getByText(booking.data.confirmationId)).toBeVisible();
  await expect(page.getByText(booking.data.movie.title)).toBeVisible();
  await expect(page.getByText(booking.data.theatre.name)).toBeVisible();
  await expect(page.getByText(booking.data.seats.join(', '))).toBeVisible();
  await expect(page.getByText(booking.data.paymentMethod)).toBeVisible();
  await expect(page.getByText(`Rs.${booking.data.totalPrice}`)).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/booking-confirmation.png', fullPage: true });
  const [recoveryResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes(`/api/bookings/${booking.data.bookingId}`) && response.request().method() === 'GET'),
    page.reload(),
  ]);
  expect(recoveryResponse.ok()).toBeTruthy();
  expect(await recoveryResponse.json()).toEqual({ data: booking.data });
  await expect(page.getByText(booking.data.confirmationId)).toBeVisible();
  await expect(page.getByText(booking.data.movie.title)).toBeVisible();
  await expect(page.getByText(booking.data.theatre.name)).toBeVisible();
  await expect(page.getByText(booking.data.seats.join(', '))).toBeVisible();
  await expect(page.getByText(booking.data.paymentMethod)).toBeVisible();
  await expect(page.getByText(`Rs.${booking.data.totalPrice}`)).toBeVisible();
  expect(errors).toEqual([]);
});

test('direct confirmation access without journey state provides a recovery action', async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto('/confirmation');
  await expect(page.getByText(/complete.*booking|start.*booking|booking.*required/i)).toBeVisible();
  const recovery = page.getByRole('button', { name: 'Browse movies' });
  await expect(recovery).toBeVisible();
  await recovery.click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(errors).toEqual([]);
});

test('intercepted booking failure after the payment timer shows frontend recovery and no confirmation', async ({ page }) => {
  test.setTimeout(15_000);
  const errors = captureBrowserErrors(page);
  await completeJourneyToPayment(page);
  await page.route('**/api/bookings', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Temporary booking failure' }) });
  });
  const startedAt = Date.now();
  const [bookingResponse] = await Promise.all([
    page.waitForResponse(isBookingPost),
    page.getByRole('button', { name: 'Pay Rs.450' }).click(),
  ]);
  expect(Date.now() - startedAt).toBeGreaterThanOrEqual(1_900);
  expect(bookingResponse.status()).toBe(500);
  await expect(page.locator('.message-error')).toContainText(/request could not be completed|booking|try again|failed/i);
  await expect(page.getByRole('heading', { name: 'Congratulations!' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /pay|try again/i })).toBeVisible();
  expect(errors).toEqual([]);
});

test('payment controls remain available at a mobile viewport', async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await completeJourneyToPayment(page);
  await expect(page.getByRole('button', { name: 'Pay Rs.450' })).toBeVisible();
  expect(errors).toEqual([]);
});
