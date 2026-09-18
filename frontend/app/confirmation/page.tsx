'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBookingConfirmation, type BookingConfirmation } from '../../lib/api';
import { useBookingJourney } from '../../state/BookingJourneyProvider';

/** Wrap confirmation recovery in the Suspense boundary required for URL search parameters. */
export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={(
        <main>
          <section className="journey-card">
            <h1>Loading your booking confirmation…</h1>
          </section>
        </main>
      )}
    >
      <ConfirmationContent />
    </Suspense>
  );
}

/** Render confirmation details from journey state or a persisted reload recovery request. */
function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirmation: journeyConfirmation } = useBookingJourney();
  const bookingId = searchParams.get('bookingId');
  const [recoveredConfirmation, setRecoveredConfirmation] = useState<BookingConfirmation | null>(null);
  const [loading, setLoading] = useState(!journeyConfirmation && Boolean(bookingId));
  const [error, setError] = useState('');
  const confirmation = journeyConfirmation ?? recoveredConfirmation;

  useEffect(() => {
    if (journeyConfirmation || !bookingId) return;

    let active = true;
    setLoading(true);
    getBookingConfirmation(bookingId)
      .then((result) => {
        if (active) setRecoveredConfirmation(result);
      })
      .catch((caughtError: unknown) => {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'We could not recover this booking confirmation.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingId, journeyConfirmation]);

  if (loading) {
    return (
      <main>
        <section className="journey-card" aria-labelledby="confirmation-title">
          <h1 id="confirmation-title">Loading your booking confirmation…</h1>
        </section>
      </main>
    );
  }

  if (!confirmation) {
    return (
      <main>
        <section className="journey-card" aria-labelledby="confirmation-title">
          <div className="brand">BookMyShow</div>
          <h1 id="confirmation-title">No confirmation to show.</h1>
          <p role="alert">{error || 'Complete a booking before opening this page.'}</p>
          <button type="button" onClick={() => router.push('/dashboard')}>
            Browse movies
          </button>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="confirmation-card" aria-labelledby="confirmation-title">
        <p className="eyebrow">Booking confirmed</p>
        <h1 id="confirmation-title">Congratulations!</h1>
        <p className="confirmation-id">{confirmation.confirmationId}</p>
        <dl>
          <div>
            <dt>Movie</dt>
            <dd>{confirmation.movie.title}</dd>
          </div>
          <div>
            <dt>Theatre</dt>
            <dd>{confirmation.theatre.name}</dd>
          </div>
          <div>
            <dt>Seats</dt>
            <dd>{confirmation.seats.join(', ')}</dd>
          </div>
          <div>
            <dt>Payment method</dt>
            <dd>{confirmation.paymentMethod}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>Rs.{confirmation.totalPrice}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
