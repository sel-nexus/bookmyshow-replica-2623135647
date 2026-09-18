import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConfirmationPage from '../app/confirmation/page';
import { BookingJourneyProvider, useBookingJourney } from '../state/BookingJourneyProvider';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
/** Seed the provider with the exact response returned by the booking API. */
function ConfirmationFixture() { const journey = useBookingJourney(); React.useEffect(() => { journey.setConfirmation({ bookingId: 42, confirmationId: 'BMS-42', movie: { id: 1, title: 'Paradise' }, theatre: { id: 1, name: 'Sandhya 70mm' }, seats: ['B2', 'B3', 'B4'], paymentMethod: 'UPI', totalPrice: 600 }); }, []); return <ConfirmationPage />; }
describe('confirmation', () => { it('renders only the actual backend confirmation values without fixed-seat fallback', async () => { render(<BookingJourneyProvider><ConfirmationFixture /></BookingJourneyProvider>); expect(await screen.findByRole('heading', { name: 'Congratulations!' })).toBeTruthy(); expect(screen.getByText('BMS-42')).toBeTruthy(); expect(screen.getByText('B2, B3, B4')).toBeTruthy(); expect(screen.getByText('Rs.600')).toBeTruthy(); expect(screen.queryByText('A1, A2, A3')).toBeNull(); }); });
