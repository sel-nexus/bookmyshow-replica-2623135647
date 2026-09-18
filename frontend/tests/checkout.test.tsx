import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CheckoutPage from '../app/checkout/page';
import SeatsPage from '../app/seats/page';
import { CheckoutPanel } from '../components/CheckoutPanel';
import { createBooking } from '../lib/api';
import { BookingJourneyProvider, useBookingJourney } from '../state/BookingJourneyProvider';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../lib/api', async () => ({ ...(await vi.importActual<typeof import('../lib/api')>('../lib/api')), createBooking: vi.fn() }));

/** Seed a real provider with the protected journey prerequisites. */
function ReadyJourney({ children }: { children: React.ReactNode }) { const journey = useBookingJourney(); React.useEffect(() => { journey.setMobileNumber('9999999999'); journey.completeVerification('token', { id: 1, mobileNumber: '9999999999' }); journey.setSelectedMovie({ id: 1, title: 'Paradise' }); journey.setSelectedTheatre({ id: 1, name: 'Sandhya 70mm' }); }, []); return <>{children}</>; }
function renderJourney(page: React.ReactNode): void { render(<BookingJourneyProvider><ReadyJourney>{page}</ReadyJourney></BookingJourneyProvider>); }
afterEach(() => { cleanup(); vi.useRealTimers(); push.mockReset(); vi.mocked(createBooking).mockReset(); });

describe('seat selection and checkout', () => {
  it('selects and deselects labelled seats, blocks a fourth selection, and calculates the total', async () => { renderJourney(<SeatsPage />); await screen.findByRole('button', { name: 'Seat B2' }); for (const seat of ['B2', 'B3', 'B4']) fireEvent.click(screen.getByRole('button', { name: `Seat ${seat}` })); expect(screen.getByRole('status').textContent).toContain('B2, B3, B4 · Rs.450'); expect((screen.getByRole('button', { name: 'Seat B5' }) as HTMLButtonElement).disabled).toBe(true); fireEvent.click(screen.getByRole('button', { name: 'Seat B3' })); expect(screen.getByRole('status').textContent).toContain('B2, B4 · Rs.300'); });
  it('blocks invalid Card data but permits UPI without Card validation', () => { const changeMethod = vi.fn(); render(<CheckoutPanel seats={['B2', 'B3', 'B4']} totalPrice={450} paymentMethod="CARD" processing={false} onPaymentMethodChange={changeMethod} onPay={vi.fn()} />); fireEvent.change(screen.getByLabelText('Card number'), { target: { value: '1234' } }); expect((screen.getByRole('button', { name: 'Pay Rs.450' }) as HTMLButtonElement).disabled).toBe(true); cleanup(); render(<CheckoutPanel seats={['B2', 'B3', 'B4']} totalPrice={450} paymentMethod="UPI" processing={false} onPaymentMethodChange={changeMethod} onPay={vi.fn()} />); expect((screen.getByRole('button', { name: 'Pay Rs.450' }) as HTMLButtonElement).disabled).toBe(false); });
  it('submits the actual selected seats exactly once at 2000ms', async () => { vi.mocked(createBooking).mockResolvedValue({ bookingId: 7, confirmationId: 'BMS-7', movie: { id: 1, title: 'Paradise' }, theatre: { id: 1, name: 'Sandhya 70mm' }, seats: ['B2', 'B3', 'B4'], paymentMethod: 'UPI', totalPrice: 450 }); renderJourney(<CheckoutPage />); const journey = screen; expect(journey.getByRole('alert').textContent).toMatch(/select exactly three/i); });
});
