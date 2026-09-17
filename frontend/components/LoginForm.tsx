'use client';

import React, { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../lib/api';
import { useBookingJourney } from '../state/BookingJourneyProvider';

/** Render and submit the mobile-number request form. */
export function LoginForm() {
  const router = useRouter();
  const { mobileNumber, setMobileNumber, setPhase } = useBookingJourney();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** Submit a valid mobile number to the authentication API. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!mobileNumber.trim()) {
      setError('Enter your mobile number to continue.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const result = await login(mobileNumber.trim());
      setMobileNumber(result.mobileNumber);
      setPhase('otp');
      router.push('/otp');
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'We could not start verification.');
    } finally {
      setSubmitting(false);
    }
  }

  return <form onSubmit={handleSubmit} noValidate>
    <div>
      <label htmlFor="mobileNumber">Mobile number</label>
      <input id="mobileNumber" name="mobileNumber" type="tel" autoComplete="tel" value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? 'mobile-error' : undefined} />
    </div>
    {error ? <p id="mobile-error" className="message message-error" role="alert">{error}</p> : null}
    <button type="submit" disabled={submitting}>{submitting ? 'Sending code…' : 'Continue'}</button>
  </form>;
}
