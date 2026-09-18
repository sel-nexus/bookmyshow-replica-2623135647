import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '../app/dashboard/page';
import TheatresPage from '../app/theatres/page';
import { getMovies, getTheatres } from '../lib/api';
import { BookingJourneyProvider, useBookingJourney } from '../state/BookingJourneyProvider';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...actual, getMovies: vi.fn(), getTheatres: vi.fn() };
});

/** Establish authenticated context state for a page test. */
function AuthenticatedJourney({ children, movie }: { children: React.ReactNode; movie?: { id: number; title: string } }) {
  const journey = useBookingJourney();
  React.useEffect(() => {
    journey.setMobileNumber('9999999999');
    journey.completeVerification('token', { id: 1, mobileNumber: '9999999999' });
    if (movie) journey.setSelectedMovie(movie);
  // The provider setters are stable; setup should run once for this rendered fixture.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
}
function renderJourney(page: React.ReactNode, movie?: { id: number; title: string }): void { render(<BookingJourneyProvider><AuthenticatedJourney movie={movie}>{page}</AuthenticatedJourney></BookingJourneyProvider>); }

afterEach(() => { cleanup(); push.mockReset(); vi.mocked(getMovies).mockReset(); vi.mocked(getTheatres).mockReset(); });

describe('discovery pages', () => {
  it('renders backend movies and saves the actual selected movie before routing', async () => {
    vi.mocked(getMovies).mockResolvedValue([{ id: 9, title: 'Backend Paradise' }]);
    renderJourney(<DashboardPage />);
    expect(await screen.findByText('Backend Paradise')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Choose Backend Paradise' }));
    expect(push).toHaveBeenCalledWith('/theatres');
  });

  it('shows recoverable guidance without authentication and avoids movie loading', () => {
    render(<BookingJourneyProvider><DashboardPage /></BookingJourneyProvider>);
    expect(screen.getByRole('alert').textContent).toContain('booking session is unavailable');
    expect(getMovies).not.toHaveBeenCalled();
  });

  it('loads theatres only for the selected backend movie and routes after selection', async () => {
    vi.mocked(getTheatres).mockResolvedValue({ movieId: 7, theatres: [{ id: 4, name: 'Mapped Screen' }] });
    renderJourney(<TheatresPage />, { id: 7, title: 'Selected movie' });
    expect(await screen.findByText('Mapped Screen')).toBeTruthy();
    await waitFor(() => expect(getTheatres).toHaveBeenCalledWith(7));
    fireEvent.click(screen.getByRole('button', { name: 'Choose Mapped Screen' }));
    expect(push).toHaveBeenCalledWith('/checkout');
  });

  it('renders the theatre empty state and does not offer continuation', async () => {
    vi.mocked(getTheatres).mockResolvedValue({ movieId: 7, theatres: [] });
    renderJourney(<TheatresPage />, { id: 7, title: 'Selected movie' });
    expect((await screen.findByText('No theatres are available for this movie yet. Please choose another movie.')).textContent).toContain('No theatres are available');
    expect(screen.queryByRole('button', { name: 'Select theatre' })).toBeNull();
  });
});
