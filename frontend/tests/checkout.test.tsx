import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CheckoutPage from '../app/checkout/page';
import SeatsPage from '../app/seats/page';
import { CheckoutPanel } from '../components/CheckoutPanel';
import { ApiError, createBooking } from '../lib/api';
import { BookingJourneyProvider, useBookingJourney } from '../state/BookingJourneyProvider';

const push = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../lib/api')>('../lib/api')),
  createBooking: vi.fn(),
}));

/** Seed a real provider with the protected journey prerequisites. */
function ReadyJourney({ children, withSelectedSeats = false }: {
  children: React.ReactNode;
  withSelectedSeats?: boolean;
}) {
  const journey = useBookingJourney();

  React.useEffect(() => {
    journey.setMobileNumber('9999999999');
    journey.completeVerification('token', { id: 1, mobileNumber: '9999999999' });
    journey.setSelectedMovie({ id: 1, title: 'Paradise' });
    journey.setSelectedTheatre({ id: 1, name: 'Sandhya 70mm' });
    if (withSelectedSeats) {
      for (const seat of ['B2', 'B3', 'B4']) journey.toggleSeat(seat);
    }
  }, [withSelectedSeats]);

  return <>{children}</>;
}

function renderJourney(page: React.ReactNode, withSelectedSeats = false): void {
  render(
    <BookingJourneyProvider>
      <ReadyJourney withSelectedSeats={withSelectedSeats}>{page}</ReadyJourney>
    </BookingJourneyProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  push.mockReset();
  vi.mocked(createBooking).mockReset();
});

describe('seat selection and checkout', () => {
  it('selects and deselects labelled seats, blocks a fourth selection, and calculates the total', async () => {
    renderJourney(<SeatsPage />);

    await screen.findByRole('button', { name: 'Seat B2' });
    for (const seat of ['B2', 'B3', 'B4']) {
      fireEvent.click(screen.getByRole('button', { name: `Seat ${seat}` }));
    }
    expect(screen.getByRole('status').textContent).toContain('B2, B3, B4 · Rs.450');
    expect((screen.getByRole('button', { name: 'Seat B5' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Seat B3' }));
    expect(screen.getByRole('status').textContent).toContain('B2, B4 · Rs.300');
  });

  it('blocks invalid Card data but permits UPI without Card validation', () => {
    const changeMethod = vi.fn();
    render(
      <CheckoutPanel
        seats={['B2', 'B3', 'B4']}
        totalPrice={450}
        paymentMethod="CARD"
        processing={false}
        onPaymentMethodChange={changeMethod}
        onPay={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Card number'), { target: { value: '1234' } });
    expect((screen.getByRole('button', { name: 'Pay Rs.450' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Card number'), { target: { value: '4242 4242 4242 4242' } });
    expect((screen.getByRole('button', { name: 'Pay Rs.450' }) as HTMLButtonElement).disabled).toBe(false);

    cleanup();
    render(
      <CheckoutPanel
        seats={['B2', 'B3', 'B4']}
        totalPrice={450}
        paymentMethod="UPI"
        processing={false}
        onPaymentMethodChange={changeMethod}
        onPay={vi.fn()}
      />,
    );
    expect((screen.getByRole('button', { name: 'Pay Rs.450' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('submits B2, B3, and B4 exactly once at 2000ms', async () => {
    vi.useFakeTimers();
    vi.mocked(createBooking).mockResolvedValue({
      bookingId: 7,
      confirmationId: 'BMS-7',
      movie: { id: 1, title: 'Paradise' },
      theatre: { id: 1, name: 'Sandhya 70mm' },
      seats: ['B2', 'B3', 'B4'],
      paymentMethod: 'UPI',
      totalPrice: 450,
    });
    renderJourney(<CheckoutPage />, true);

    fireEvent.click(screen.getByRole('radio', { name: 'UPI' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pay Rs.450' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999);
    });
    expect(createBooking).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(createBooking).toHaveBeenCalledTimes(1);
    expect(createBooking).toHaveBeenCalledWith({
      mobileNumber: '9999999999',
      movieId: 1,
      theatreId: 1,
      seats: ['B2', 'B3', 'B4'],
      paymentMethod: 'UPI',
      totalPrice: 450,
    });
  });

  it('keeps the customer in checkout when booking fails and never navigates to confirmation', async () => {
    vi.useFakeTimers();
    vi.mocked(createBooking).mockRejectedValue(
      new ApiError(500, 'BOOKING_FAILED', 'Temporary booking failure'),
    );
    renderJourney(<CheckoutPage />, true);

    fireEvent.click(screen.getByRole('radio', { name: 'UPI' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pay Rs.450' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.getByRole('alert').textContent).toContain('Temporary booking failure');
    expect(screen.getByRole('heading', { name: 'Choose how you will pay' })).toBeTruthy();
    expect(push).not.toHaveBeenCalledWith('/confirmation?bookingId=7');
    expect(screen.queryByRole('heading', { name: 'Congratulations!' })).toBeNull();
  });
});
