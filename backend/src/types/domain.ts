/** Represents the persisted identity of an authenticated customer. */
export interface User {
  id: number;
  mobileNumber: string;
}

/** Represents a movie available for discovery. */
export interface Movie {
  id: number;
  title: string;
}

/** Represents a theatre available for a selected movie. */
export interface Theatre {
  id: number;
  name: string;
}

/** Defines the subject encoded into an authentication token. */
export interface AuthTokenPayload {
  sub: string;
  mobileNumber: string;
}

/** Represents an API error that can be safely returned to a caller. */
export class AppError extends Error {
  /** Construct a typed API error with an HTTP status and stable code. */
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}


/** Represent the strictly constrained request accepted by the booking API. */
export interface BookingRequest {
  mobileNumber: string;
  movieId: number;
  theatreId: number;
  seats: string[];
  paymentMethod: 'CARD' | 'UPI';
  totalPrice: number;
}

/** Represent the persisted booking details returned after a committed write. */
export interface BookingConfirmation {
  bookingId: number;
  confirmationId: string;
  movie: Movie;
  theatre: Theatre;
  seats: string[];
  paymentMethod: 'CARD' | 'UPI';
  totalPrice: number;
}
