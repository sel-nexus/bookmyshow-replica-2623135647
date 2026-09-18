/** Describe a user returned by the authentication API. */
export interface AuthUser {
  id: number;
  mobileNumber: string;
}

/** Describe a movie returned by the discovery API. */
export interface Movie {
  id: number;
  title: string;
}

/** Describe a theatre returned for a selected movie. */
export interface Theatre {
  id: number;
  name: string;
}

/** Describe the fixed booking request accepted by the backend. */
export interface BookingRequest {
  mobileNumber: string;
  movieId: number;
  theatreId: number;
  seats: string[];
  paymentMethod: 'CARD' | 'UPI';
  totalPrice: number;
}

/** Describe the backend confirmation returned after a successful booking write. */
export interface BookingConfirmation {
  bookingId: number;
  confirmationId: string;
  movie: Movie;
  theatre: Theatre;
  seats: string[];
  paymentMethod: 'CARD' | 'UPI';
  totalPrice: number;
}

/** Describe the stable API error returned by the backend. */
export interface ApiErrorPayload {
  error: { code: string; message: string; requestId: string };
}

/** Represent a failed API request with a readable server message. */
export class ApiError extends Error {
  /** Construct a client error from an HTTP response. */
  public constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/** Parse a response body defensively and normalize HTTP and network failures. */
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, init);
  } catch (error: unknown) {
    throw new ApiError(0, 'NETWORK_ERROR', error instanceof Error ? error.message : 'Network request failed.');
  }
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) throw new ApiError(response.status, 'HTTP_ERROR', 'The server returned an unreadable error response.');
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'The server returned an unreadable response.');
  }
  if (!response.ok) {
    const errorPayload = payload as Partial<ApiErrorPayload>;
    const error = errorPayload.error;
    throw new ApiError(response.status, error?.code ?? 'HTTP_ERROR', error?.message ?? 'The request could not be completed.');
  }
  return payload as T;
}

/** Send a JSON POST request and normalize backend failures. */
async function post<T>(path: string, body: object): Promise<T> {
  return requestJson<T>(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

/** Request an OTP challenge for a customer mobile number. */
export async function login(mobileNumber: string): Promise<{ accepted: true; mobileNumber: string }> {
  const response = await post<{ data: { accepted: true; mobileNumber: string } }>('/api/auth/login', { mobileNumber });
  return response.data;
}

/** Verify an OTP and return the server-issued user token. */
export async function verifyOtp(mobileNumber: string, otp: string): Promise<{ token: string; user: AuthUser }> {
  const response = await post<{ data: { token: string; user: AuthUser } }>('/api/auth/verify', { mobileNumber, otp });
  return response.data;
}

/** Retrieve movies persisted by the backend discovery catalog. */
export async function getMovies(): Promise<Movie[]> {
  const response = await requestJson<{ data: { movies: Movie[] } }>('/api/movies');
  return response.data.movies;
}

/** Retrieve theatres mapped by the backend to one explicit movie identifier. */
export async function getTheatres(movieId: number): Promise<{ movieId: number; theatres: Theatre[] }> {
  const response = await requestJson<{ data: { movieId: number; theatres: Theatre[] } }>(`/api/theatres?movieId=${encodeURIComponent(movieId)}`);
  return response.data;
}

/** Submit only approved booking selection fields to the same-origin API. */
export async function createBooking(booking: BookingRequest): Promise<BookingConfirmation> {
  const response = await post<{ data: BookingConfirmation }>('/api/bookings', booking);
  return response.data;
}

/** Retrieve a persisted booking confirmation for a reload-safe confirmation view. */
export async function getBookingConfirmation(bookingId: string): Promise<BookingConfirmation> {
  const response = await requestJson<{ data: BookingConfirmation }>(`/api/bookings/${encodeURIComponent(bookingId)}`);
  return response.data;
}
