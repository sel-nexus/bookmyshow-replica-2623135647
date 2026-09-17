import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../components/LoginForm';
import { OtpForm } from '../components/OtpForm';
import { ApiError, login, verifyOtp } from '../lib/api';
import { BookingJourneyProvider } from '../state/BookingJourneyProvider';

const push = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...actual, login: vi.fn(), verifyOtp: vi.fn() };
});

/** Render a form inside the booking journey provider required by the workflow. */
function renderWithJourney(component: React.ReactNode): void {
  render(<BookingJourneyProvider>{component}</BookingJourneyProvider>);
}

afterEach(() => {
  cleanup();
  push.mockReset();
  vi.mocked(login).mockReset();
  vi.mocked(verifyOtp).mockReset();
});

describe('authentication forms', () => {
  it('calls login only on submit and navigates after an accepted response', async () => {
    vi.mocked(login).mockResolvedValue({ accepted: true, mobileNumber: '9999999999' });
    renderWithJourney(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '9999999999' } });
    expect(login).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole('button', { name: 'Continue' }).closest('form')!);

    await waitFor(() => expect(login).toHaveBeenCalledWith('9999999999'));
    expect(push).toHaveBeenCalledWith('/otp');
  });

  it('renders a readable error when login fails', async () => {
    vi.mocked(login).mockRejectedValue(new ApiError(400, 'INVALID_REQUEST', 'mobileNumber must be a non-empty string.'));
    renderWithJourney(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: 'bad' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Continue' }).closest('form')!);

    expect((await screen.findByRole('alert')).textContent).toContain('mobileNumber must be a non-empty string.');
    expect(push).not.toHaveBeenCalled();
  });

  it('submits a code only after the OTP form is submitted and navigates after verification', async () => {
    vi.mocked(login).mockResolvedValue({ accepted: true, mobileNumber: '9999999999' });
    vi.mocked(verifyOtp).mockResolvedValue({ token: 'server-token', user: { id: 1, mobileNumber: '9999999999' } });
    renderWithJourney(<><LoginForm /><OtpForm /></>);

    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '9999999999' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Continue' }).closest('form')!);
    await waitFor(() => expect(login).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('One-time passcode'), { target: { value: '1234' } });
    expect(verifyOtp).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole('button', { name: 'Verify and continue' }).closest('form')!);

    await waitFor(() => expect(verifyOtp).toHaveBeenCalledWith('9999999999', '1234'));
    expect(push).toHaveBeenCalledWith('/dashboard');
  });

  it('renders a readable OTP error without navigation when verification fails', async () => {
    vi.mocked(login).mockResolvedValue({ accepted: true, mobileNumber: '9999999999' });
    vi.mocked(verifyOtp).mockRejectedValue(new ApiError(401, 'OTP_NOT_ACCEPTED', 'The supplied OTP was not accepted.'));
    renderWithJourney(<><LoginForm /><OtpForm /></>);

    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '9999999999' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Continue' }).closest('form')!);
    await waitFor(() => expect(login).toHaveBeenCalled());
    push.mockReset();
    fireEvent.change(screen.getByLabelText('One-time passcode'), { target: { value: '0000' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Verify and continue' }).closest('form')!);

    expect((await screen.findByRole('alert')).textContent).toContain('The supplied OTP was not accepted.');
    expect(push).not.toHaveBeenCalled();
  });
});
