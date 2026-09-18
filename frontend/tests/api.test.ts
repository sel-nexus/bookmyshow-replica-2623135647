import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createBooking, getBookingConfirmation, getMovies, getTheatres, login, verifyOtp } from '../lib/api';

describe('API client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts a login request and returns the accepted mobile number', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { accepted: true, mobileNumber: '9999999999' } }), { status: 200 }),
    );

    await expect(login('9999999999')).resolves.toEqual({ accepted: true, mobileNumber: '9999999999' });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9999999999' }),
    });
  });

  it('posts an OTP verification request and preserves its structured rejection', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: 'OTP_NOT_ACCEPTED', message: 'The supplied OTP was not accepted.', requestId: 'req-otp' } }),
        { status: 401 },
      ),
    );

    await expect(verifyOtp('9999999999', '0000')).rejects.toMatchObject({
      status: 401,
      code: 'OTP_NOT_ACCEPTED',
      message: 'The supplied OTP was not accepted.',
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9999999999', otp: '0000' }),
    });
  });

  it('posts a valid exactly-three-seat booking and returns the persisted confirmation', async () => {
    const booking = {
      mobileNumber: '9999999999',
      movieId: 1,
      theatreId: 2,
      seats: ['B2', 'B3', 'B4'],
      paymentMethod: 'UPI' as const,
      totalPrice: 450,
    };
    const confirmation = {
      bookingId: 7,
      confirmationId: 'BMS-7',
      movie: { id: 1, title: 'Interstellar' },
      theatre: { id: 2, name: 'Sandhya 70mm' },
      seats: ['B2', 'B3', 'B4'],
      paymentMethod: 'UPI' as const,
      totalPrice: 450,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: confirmation }), { status: 201 }),
    );

    await expect(createBooking(booking)).resolves.toEqual(confirmation);
    expect(fetchMock).toHaveBeenCalledWith('/api/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(booking),
    });
  });

  it('normalizes an invalid booking response with its structured error', async () => {
    const booking = {
      mobileNumber: '9999999999',
      movieId: 1,
      theatreId: 2,
      seats: ['B2', 'B3'],
      paymentMethod: 'UPI' as const,
      totalPrice: 300,
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_BOOKING',
            message: 'Exactly three seats are required.',
            requestId: 'req-booking',
          },
        }),
        { status: 400 },
      ),
    );

    await expect(createBooking(booking)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_BOOKING',
      message: 'Exactly three seats are required.',
    });
  });

  it('returns movies from a successful response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { movies: [{ id: 1, title: 'Interstellar' }] } }), { status: 200 }),
    );

    await expect(getMovies()).resolves.toEqual([{ id: 1, title: 'Interstellar' }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/movies', undefined);
  });

  it('retrieves a persisted confirmation by booking ID', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { bookingId: 7, confirmationId: 'BMS-7', movie: { id: 1, title: 'Paradise' }, theatre: { id: 1, name: 'Sandhya 70mm' }, seats: ['A1', 'A2', 'A3'], paymentMethod: 'UPI', totalPrice: 450 } }), { status: 200 }),
    );

    await expect(getBookingConfirmation('7')).resolves.toMatchObject({ bookingId: 7, confirmationId: 'BMS-7', paymentMethod: 'UPI' });
    expect(fetchMock).toHaveBeenCalledWith('/api/bookings/7', undefined);
  });

  it('normalizes a network failure into an ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    try {
      await getMovies();
      throw new Error('Expected getMovies to reject.');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR', message: 'Failed to fetch' });
    }
  });

  it('reports an unreadable non-OK response as an HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not JSON', { status: 502 }));

    try {
      await getMovies();
      throw new Error('Expected getMovies to reject.');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 502,
        code: 'HTTP_ERROR',
        message: 'The server returned an unreadable error response.',
      });
    }
  });

  it('preserves a structured HTTP error status, code, and message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: 'MOVIE_NOT_FOUND', message: 'The selected movie was not found.', requestId: 'req-1' } }),
        { status: 404 },
      ),
    );

    try {
      await getTheatres(42);
      throw new Error('Expected getTheatres to reject.');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 404,
        code: 'MOVIE_NOT_FOUND',
        message: 'The selected movie was not found.',
      });
    }
  });

  it('reports an unreadable successful response as an invalid response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not JSON', { status: 200 }));

    try {
      await getMovies();
      throw new Error('Expected getMovies to reject.');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 200,
        code: 'INVALID_RESPONSE',
        message: 'The server returned an unreadable response.',
      });
    }
  });
});
