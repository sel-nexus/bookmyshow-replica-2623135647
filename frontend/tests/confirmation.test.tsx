import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConfirmationPage from '../app/confirmation/page';
import { getBookingConfirmation } from '../lib/api';
import { BookingJourneyProvider, useBookingJourney } from '../state/BookingJourneyProvider';

const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));
vi.mock('../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../lib/api')>('../lib/api')),
  getBookingConfirmation: vi.fn(),
}));

/** Seed the provider with the exact response returned by the booking API. */
function ConfirmationFixture() {
  const journey = useBookingJourney();

  React.useEffect(() => {
    journey.setConfirmation({
      bookingId: 42,
      confirmationId: 'BMS-42',
      movie: { id: 1, title: 'Paradise' },
      theatre: { id: 1, name: 'Sandhya 70mm' },
      seats: ['B2', 'B3', 'B4'],
      paymentMethod: 'UPI',
      totalPrice: 600,
    });
  }, []);

  return <ConfirmationPage />;
}

function renderConfirmation(): void {
  render(
    <BookingJourneyProvider>
      <ConfirmationPage />
    </BookingJourneyProvider>,
  );
}

afterEach(() => {
  cleanup();
  push.mockReset();
  searchParams = new URLSearchParams();
  vi.mocked(getBookingConfirmation).mockReset();
});

describe('confirmation', () => {
  it('renders only the actual backend confirmation values without fixed-seat fallback', async () => {
    render(
      <BookingJourneyProvider>
        <ConfirmationFixture />
      </BookingJourneyProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Congratulations!' })).toBeTruthy();
    expect(screen.getByText('BMS-42')).toBeTruthy();
    expect(screen.getByText('B2, B3, B4')).toBeTruthy();
    expect(screen.getByText('Rs.600')).toBeTruthy();
    expect(screen.queryByText('A1, A2, A3')).toBeNull();
  });

  it('offers booking recovery when there is no confirmation to show', () => {
    renderConfirmation();

    expect(screen.getByRole('heading', { name: 'No confirmation to show.' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Complete a booking before opening this page.');
    fireEvent.click(screen.getByRole('button', { name: 'Browse movies' }));
    expect(push).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByRole('heading', { name: 'Congratulations!' })).toBeNull();
  });

  it('offers recovery guidance when persisted confirmation reload fails', async () => {
    searchParams = new URLSearchParams('bookingId=42');
    vi.mocked(getBookingConfirmation).mockRejectedValue(new Error('Booking confirmation is unavailable.'));

    renderConfirmation();

    expect(await screen.findByRole('heading', { name: 'No confirmation to show.' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Booking confirmation is unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Browse movies' }));
    expect(push).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByRole('heading', { name: 'Congratulations!' })).toBeNull();
  });
});
