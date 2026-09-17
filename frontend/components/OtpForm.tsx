'use client';

import React, { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { verifyOtp } from '../lib/api';
import { useBookingJourney } from '../state/BookingJourneyProvider';

/** Render and submit the OTP verification form. */
export function OtpForm() {
  const router = useRouter();
  const { mobileNumber, completeVerification, setPhase } = useBookingJourney();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** Verify a supplied passcode and continue to the post-authentication route. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!mobileNumber) {
      setError('Enter your mobile number before verifying a code.');
      return;
    }
    if (!otp.trim()) {
      setError('Enter the one-time passcode.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const result = await verifyOtp(mobileNumber, otp.trim());
      completeVerification(result.token, result.user);
      setPhase('dashboard');
      router.push('/dashboard');
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'We could not verify that code.');
    } finally {
      setSubmitting(false);
    }
  }

  return <form onSubmit={handleSubmit} noValidate>
    <div>
      <label htmlFor="otp">One-time passcode</label>
      <input id="otp" name="otp" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value)} aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? 'otp-error' : undefined} />
    </div>
    {error ? <p id="otp-error" className="message message-error" role="alert">{error}</p> : null}
    <button type="submit" disabled={submitting}>{submitting ? 'Verifying…' : 'Verify and continue'}</button>
  </form>;
}
