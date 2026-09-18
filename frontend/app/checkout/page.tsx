'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckoutPanel } from '../../components/CheckoutPanel';
import { ProcessingView } from '../../components/ProcessingView';
import { createBooking } from '../../lib/api';
import { useBookingJourney } from '../../state/BookingJourneyProvider';

/** Render the protected seat selection, payment-choice, and booking submission flow. */
export default function CheckoutPage() {
  const router = useRouter();
  const journey = useBookingJourney();
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedMovie = journey.selectedMovie;
  const selectedTheatre = journey.selectedTheatre;
  const processing = journey.phase === 'processing';

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  if (!journey.token || !selectedMovie || !selectedTheatre || journey.selectedSeatIds.length !== 3) {
    return (
      <main>
        <section className="journey-card" aria-labelledby="checkout-title">
          <div className="brand">BookMyShow</div>
          <h1 id="checkout-title">Your booking session is unavailable.</h1>
          <p role="alert">Sign in, choose a movie and theatre, and select exactly three seats before checkout.</p>
          <button type="button" onClick={() => router.push('/login')}>Start again</button>
        </section>
      </main>
    );
  }

  const pay = (): void => {
    if (processing || journey.selectedSeatIds.length !== 3 || !journey.paymentMethod || timer.current) return;
    setError('');
    journey.setPhase('processing');
    timer.current = setTimeout(() => {
      timer.current = null;
      createBooking({ mobileNumber: journey.mobileNumber, movieId: selectedMovie.id, theatreId: selectedTheatre.id, seats: journey.selectedSeatIds, paymentMethod: journey.paymentMethod!, totalPrice: journey.totalPrice }).then((confirmation) => {
        journey.setConfirmation(confirmation);
        journey.setPhase('confirmation');
        router.push(`/confirmation?bookingId=${confirmation.bookingId}`);
      }).catch((caughtError: unknown) => {
        journey.setPhase('checkout');
        setError(caughtError instanceof Error ? caughtError.message : 'We could not confirm your booking. Please try again.');
      });
    }, 2000);
  };

  return (
    <main>
      <section className="checkout-shell" aria-labelledby="checkout-title">
        {processing ? (
          <ProcessingView />
        ) : (
          <>
            <header>
              <div className="brand">BookMyShow</div>
              <p className="eyebrow">{selectedMovie.title} · {selectedTheatre.name}</p>
              <h1 id="checkout-title">Finish your cinema plan.</h1>
            </header>
            {error ? <p className="message message-error" role="alert">{error}</p> : null}
            <div className="checkout-columns"><CheckoutPanel seats={journey.selectedSeatIds} totalPrice={journey.totalPrice} paymentMethod={journey.paymentMethod} processing={false} onPaymentMethodChange={journey.setPaymentMethod} onPay={pay} /></div>
          </>
        )}
      </section>
    </main>
  );
}
