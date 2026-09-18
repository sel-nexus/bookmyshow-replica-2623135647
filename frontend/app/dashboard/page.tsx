'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MovieGrid } from '../../components/MovieGrid';
import { getMovies, type Movie } from '../../lib/api';
import { useBookingJourney } from '../../state/BookingJourneyProvider';

/** Load backend-provided movies after authenticated journey state is available. */
export default function DashboardPage() {
  const router = useRouter();
  const { token, mobileNumber, setSelectedMovie, setPhase } = useBookingJourney();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !mobileNumber) return;
    let active = true;
    setLoading(true);
    getMovies().then((result) => {
      if (active) setMovies(result);
    }).catch((caughtError: unknown) => {
      if (active) setError(caughtError instanceof Error ? caughtError.message : 'We could not load movies.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [token, mobileNumber]);

  if (!token || !mobileNumber) {
    return <main><section className="journey-card" aria-labelledby="dashboard-title"><div className="brand">BookMyShow</div><h1 id="dashboard-title">Sign in to choose a movie.</h1><p role="alert">Your booking session is unavailable. Return to sign in and verify your mobile number to browse shows.</p><button type="button" onClick={() => router.push('/')}>Return to sign in</button></section></main>;
  }
  return <main><section className="discovery-shell" aria-labelledby="dashboard-title"><div className="brand">BookMyShow · Hyderabad</div><h1 id="dashboard-title">Choose the big screen moment.</h1><p>Pick a film to see its available theatres.</p>{loading ? <p role="status">Loading movies…</p> : null}{error ? <p className="message message-error" role="alert">{error}</p> : null}{!loading && !error && movies.length === 0 ? <p className="message message-status" role="status">No movies are available right now. Please try again later.</p> : null}{!loading && !error && movies.length > 0 ? <MovieGrid movies={movies} onSelect={(movie) => { setSelectedMovie(movie); setPhase('theatres'); router.push('/theatres'); }} /> : null}</section></main>;
}
