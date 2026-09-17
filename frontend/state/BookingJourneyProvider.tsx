'use client';

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '../lib/api';

/** Represent the current visible stage of the booking journey. */
export type JourneyPhase = 'login' | 'otp' | 'dashboard';

/** Describe the shared customer, booking selection, and confirmation state. */
export interface BookingJourneyState {
  mobileNumber: string;
  token: string | null;
  user: AuthUser | null;
  selectedCity: string | null;
  selectedMovieId: number | null;
  selectedTheatreId: number | null;
  selectedShowtimeId: number | null;
  selectedSeatIds: string[];
  confirmationId: string | null;
  phase: JourneyPhase;
  setMobileNumber: (mobileNumber: string) => void;
  completeVerification: (token: string, user: AuthUser) => void;
  setPhase: (phase: JourneyPhase) => void;
}

const BookingJourneyContext = createContext<BookingJourneyState | null>(null);

/** Provide journey state to login, OTP, and later booking screens. */
export function BookingJourneyProvider({ children }: { children: ReactNode }) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [phase, setPhase] = useState<JourneyPhase>('login');
  const [selectedCity] = useState<string | null>(null);
  const [selectedMovieId] = useState<number | null>(null);
  const [selectedTheatreId] = useState<number | null>(null);
  const [selectedShowtimeId] = useState<number | null>(null);
  const [selectedSeatIds] = useState<string[]>([]);
  const [confirmationId] = useState<string | null>(null);

  const value = useMemo<BookingJourneyState>(() => ({
    mobileNumber, token, user, selectedCity, selectedMovieId, selectedTheatreId, selectedShowtimeId,
    selectedSeatIds, confirmationId, phase, setMobileNumber,
    completeVerification: (nextToken, nextUser) => { setToken(nextToken); setUser(nextUser); },
    setPhase,
  }), [mobileNumber, token, user, selectedCity, selectedMovieId, selectedTheatreId, selectedShowtimeId, selectedSeatIds, confirmationId, phase]);

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
