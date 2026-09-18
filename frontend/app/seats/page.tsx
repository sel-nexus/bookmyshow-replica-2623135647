'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { SeatGrid } from '../../components/SeatGrid';
import { useBookingJourney } from '../../state/BookingJourneyProvider';

/** Render the protected interactive seat-selection step. */
export default function SeatsPage() {
  const router = useRouter();
  const journey = useBookingJourney();
  if (!journey.token || !journey.selectedMovie || !journey.selectedTheatre) {
    return <main><section className="journey-card"><h1>Choose a theatre first.</h1><p role="alert">Sign in and select a movie and theatre before choosing seats.</p><button type="button" onClick={() => router.push('/dashboard')}>Browse movies</button></section></main>;
  }
  return <main><section className="checkout-shell" aria-labelledby="seats-title">
    <p className="eyebrow">{journey.selectedMovie.title} · {journey.selectedTheatre.name}</p>
    <h1 id="seats-title">Choose exactly three seats.</h1>
    <SeatGrid seats={journey.selectedSeatIds} totalPrice={journey.totalPrice} onToggleSeat={journey.toggleSeat} />
    <button type="button" disabled={journey.selectedSeatIds.length !== 3} onClick={() => { journey.setPhase('checkout'); router.push('/checkout'); }}>Continue to payment</button>
  </section></main>;
}
