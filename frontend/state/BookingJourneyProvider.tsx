'use client';

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser, BookingConfirmation, Movie, Theatre } from '../lib/api';

/** Represent the current visible stage of the booking journey. */
export type JourneyPhase = 'login' | 'otp' | 'dashboard' | 'theatres' | 'seating' | 'checkout' | 'processing' | 'confirmation';

/** Describe the shared customer, booking selection, and confirmation state. */
export interface BookingJourneyState {
  mobileNumber: string;
  token: string | null;
  user: AuthUser | null;
  selectedCity: string | null;
  selectedMovieId: number | null;
  selectedMovie: Movie | null;
  selectedTheatreId: number | null;
  selectedTheatre: Theatre | null;
  selectedShowtimeId: number | null;
  selectedSeatIds: string[];
  totalPrice: number;
  paymentMethod: 'CARD' | 'UPI' | null;
  confirmation: BookingConfirmation | null;
  confirmationId: string | null;
  phase: JourneyPhase;
  setMobileNumber: (mobileNumber: string) => void;
  completeVerification: (token: string, user: AuthUser) => void;
  setPhase: (phase: JourneyPhase) => void;
  setSelectedMovie: (movie: Movie | null) => void;
  setSelectedTheatre: (theatre: Theatre | null) => void;
  selectFixedSeats: () => void;
  setPaymentMethod: (paymentMethod: 'CARD' | 'UPI' | null) => void;
  setConfirmation: (confirmation: BookingConfirmation | null) => void;
}

const BookingJourneyContext = createContext<BookingJourneyState | null>(null);

/** Provide journey state to login, OTP, and later booking screens. */
export function BookingJourneyProvider({ children }: { children: ReactNode }) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [phase, setPhase] = useState<JourneyPhase>('login');
  const [selectedCity] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedTheatre, setSelectedTheatre] = useState<Theatre | null>(null);
  const selectedMovieId = selectedMovie?.id ?? null;
  const selectedTheatreId = selectedTheatre?.id ?? null;
  const [selectedShowtimeId] = useState<number | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'UPI' | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const confirmationId = confirmation?.confirmationId ?? null;

  const value = useMemo<BookingJourneyState>(() => ({
    mobileNumber, token, user, selectedCity, selectedMovieId, selectedMovie, selectedTheatreId, selectedTheatre, selectedShowtimeId,
    selectedSeatIds, totalPrice, paymentMethod, confirmation, confirmationId, phase, setMobileNumber,
    completeVerification: (nextToken, nextUser) => { setToken(nextToken); setUser(nextUser); },
    setPhase, setSelectedMovie, setSelectedTheatre,
    selectFixedSeats: () => { setSelectedSeatIds(['A1', 'A2', 'A3']); setTotalPrice(450); },
    setPaymentMethod, setConfirmation,
  }), [mobileNumber, token, user, selectedCity, selectedMovieId, selectedMovie, selectedTheatreId, selectedTheatre, selectedShowtimeId, selectedSeatIds, totalPrice, paymentMethod, confirmation, confirmationId, phase]);

  return <BookingJourneyContext.Provider value={value}>{children}</BookingJourneyContext.Provider>;
}

/** Read the booking journey state and fail clearly if its provider is absent. */
export function useBookingJourney(): BookingJourneyState {
  const context = useContext(BookingJourneyContext);
  if (!context) {
    throw new Error('useBookingJourney must be used within BookingJourneyProvider.');
  }
  return context;
}
