'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useBookingJourney } from '../../state/BookingJourneyProvider';

/** Render confirmation details exclusively from the successful backend response. */
export default function ConfirmationPage() {
  const router = useRouter();
  const { confirmation } = useBookingJourney();
  if (!confirmation) return <main><section className="journey-card" aria-labelledby="confirmation-title"><div className="brand">BookMyShow</div><h1 id="confirmation-title">No confirmation to show.</h1><p role="alert">Complete a booking before opening this page.</p><button type="button" onClick={() => router.push('/dashboard')}>Browse movies</button></section></main>;
  return <main><section className="confirmation-card" aria-labelledby="confirmation-title"><p className="eyebrow">Booking confirmed</p><h1 id="confirmation-title">Congratulations!</h1><p className="confirmation-id">{confirmation.confirmationId}</p><dl><div><dt>Movie</dt><dd>{confirmation.movie.title}</dd></div><div><dt>Theatre</dt><dd>{confirmation.theatre.name}</dd></div><div><dt>Seats</dt><dd>{confirmation.seats.join(', ')}</dd></div><div><dt>Payment method</dt><dd>{confirmation.paymentMethod}</dd></div><div><dt>Total</dt><dd>Rs.{confirmation.totalPrice}</dd></div></dl></section></main>;
}
