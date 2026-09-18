import React from 'react';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CheckoutPage from '../app/checkout/page';
import { createBooking } from '../lib/api';
import { BookingJourneyProvider, useBookingJourney } from '../state/BookingJourneyProvider';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...actual, createBooking: vi.fn() };
});

/** Seed a provider with the protected checkout prerequisites. */
function ReadyJourney({ children }: { children: React.ReactNode }) {
  const journey = useBookingJourney();
  React.useEffect(() => {
    journey.setMobileNumber('9999999999');
    journey.completeVerification('token', { id: 1, mobileNumber: '9999999999' });
    journey.setSelectedMovie({ id: 1, title: 'Paradise' });
    journey.setSelectedTheatre({ id: 1, name: 'Sandhya 70mm' });
  // Fixture setup intentionally runs once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
}

/** Render checkout with its real shared state provider. */
function renderCheckout(): void { render(<BookingJourneyProvider><ReadyJourney><CheckoutPage /></ReadyJourney></BookingJourneyProvider>); }

afterEach(() => { cleanup(); vi.useRealTimers(); push.mockReset(); vi.mocked(createBooking).mockReset(); });

describe('checkout', () => {
  it('selects the fixed seats idempotently and starts with no selected payment method', async () => {
    renderCheckout();
    const selectSeats = await screen.findByRole('button', { name: 'Select seats' });
    fireEvent.click(selectSeats);
    fireEvent.click(selectSeats);
    expect(screen.getByRole('status').textContent).toContain('A1, A2, A3 · Rs.450');
    expect((screen.getByRole('radio', { name: 'Card' }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('radio', { name: 'UPI' }) as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByLabelText('Card number')).toBeNull();
    expect(screen.queryByLabelText('UPI ID')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Card' }));
    expect(screen.getByLabelText('Card number')).toBeTruthy();
    expect(screen.queryByLabelText('UPI ID')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'UPI' }));
    expect(screen.getByLabelText('UPI ID')).toBeTruthy();
    expect(screen.queryByLabelText('Card number')).toBeNull();
  });

  it('makes exactly one booking request at 2000ms and none at 1999ms', async () => {
    vi.mocked(createBooking).mockResolvedValue({ bookingId: 7, confirmationId: 'BMS-7', movie: { id: 1, title: 'Paradise' }, theatre: { id: 1, name: 'Sandhya 70mm' }, seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', totalPrice: 450 });
    renderCheckout();
    fireEvent.click(await screen.findByRole('button', { name: 'Select seats' }));
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('radio', { name: 'Card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pay Rs.450' }));
    act(() => { vi.advanceTimersByTime(1999); });
    expect(createBooking).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(createBooking).toHaveBeenCalledTimes(1);
    await act(async () => { await Promise.resolve(); });
    expect(push).toHaveBeenCalledWith('/confirmation?bookingId=7');
  });

  it('returns to checkout with a readable error and no confirmation after booking failure', async () => {
    vi.mocked(createBooking).mockRejectedValue(new Error('Booking write failed. Please try again.'));
    renderCheckout();
    fireEvent.click(await screen.findByRole('button', { name: 'Select seats' }));
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('radio', { name: 'UPI' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pay Rs.450' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); await Promise.resolve(); });
    expect(screen.getByRole('alert').textContent).toContain('Booking write failed. Please try again.');
    expect(screen.getByRole('button', { name: 'Pay Rs.450' })).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
});
