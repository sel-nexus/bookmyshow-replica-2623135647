/** Represents the persisted identity of an authenticated customer. */
export interface User {
  id: number;
  mobileNumber: string;
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

/** Represents future booking choices held during the customer journey. */
export interface BookingSelection {
  city: string | null;
  movieId: number | null;
  theatreId: number | null;
  showtimeId: number | null;
  seatIds: string[];
}
