'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TheatreList } from '../../components/TheatreList';
import { getTheatres, type Theatre } from '../../lib/api';
import { useBookingJourney } from '../../state/BookingJourneyProvider';

/** Load theatres solely for the movie explicitly selected in the booking journey. */
export default function TheatresPage() {
  const router = useRouter();
  const { token, selectedMovie, setSelectedTheatre } = useBookingJourney();
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !selectedMovie) return;
    let active = true;
    setLoading(true);
    getTheatres(selectedMovie.id).then((result) => {
      if (active) setTheatres(result.theatres);
    }).catch((caughtError: unknown) => {
      if (active) setError(caughtError instanceof Error ? caughtError.message : 'We could not load theatres.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [token, selectedMovie]);

  if (!token || !selectedMovie) {
    return (
      <main>
        <section className="journey-card" aria-labelledby="theatres-title">
          <div className="brand">BookMyShow</div>
          <h1 id="theatres-title">Choose a movie first.</h1>
          <p role="alert">
            We need an active signed-in session and movie selection before theatres can be loaded.
          </p>
          <button type="button" onClick={() => router.push('/dashboard')}>Browse movies</button>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="discovery-shell" aria-labelledby="theatres-title">
        <div className="brand">Theatres for {selectedMovie.title}</div>
        <h1 id="theatres-title">Find your preferred screen.</h1>
        <p>Only theatres mapped to your selected movie are shown.</p>
        {loading ? <p role="status">Loading theatres…</p> : null}
        {error ? <p className="message message-error" role="alert">{error}</p> : null}
        {!loading && !error ? (
          <TheatreList
            theatres={theatres}
            onSelect={(theatre) => {
              setSelectedTheatre(theatre);
              router.push('/checkout');
            }}
          />
        ) : null}
      </section>
    </main>
  );
}
