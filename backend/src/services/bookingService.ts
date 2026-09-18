import type Database from 'better-sqlite3';
import { BookingRepository } from '../repositories/bookingRepository';
import { AppError, type BookingConfirmation, type BookingRequest } from '../types/domain';

const canonicalSeats = ['A1', 'A2', 'A3'];

/** Validate and atomically persist a fixed-price cinema booking. */
export class BookingService {
  /** Store the real database and persistence adapter used by booking operations. */
  public constructor(private readonly database: Database.Database, private readonly repository: BookingRepository) {}

  /** Create a booking after strict validation and a committed SQLite transaction. */
  public createBooking(input: unknown): BookingConfirmation {
    const booking = this.validate(input);
    const user = this.repository.findUserByMobileNumber(booking.mobileNumber);
    const mappedScreen = this.repository.findMappedScreen(booking.movieId, booking.theatreId);
    if (!user || !mappedScreen) {
      throw new AppError(404, 'ENTITY_NOT_FOUND', 'The selected customer, movie, theatre, or mapping was not found.');
    }

    let transactionStarted = false;
    try {
      this.database.exec('BEGIN IMMEDIATE');
      transactionStarted = true;
      const bookingId = this.repository.insertBooking(user.id, mappedScreen.movie.id, mappedScreen.theatre.id, JSON.stringify(canonicalSeats), booking.paymentMethod, booking.totalPrice);
      const confirmation = this.repository.selectConfirmation(bookingId);
      this.database.exec('COMMIT');
      transactionStarted = false;
      return confirmation;
    } catch (error: unknown) {
      if (transactionStarted) {
        try {
          this.database.exec('ROLLBACK');
        } catch {
          // The original write error is the only response-safe failure detail.
        }
      }
      throw new AppError(500, 'BOOKING_WRITE_FAILED', 'We could not save your booking. Please try again.');
    }
  }

  /** Reject malformed or tampered client values before any database write. */
  private validate(input: unknown): BookingRequest {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new AppError(400, 'INVALID_BOOKING', 'Booking details must match the required selection.');
    }
    const value = input as Record<string, unknown>;
    const keys = Object.keys(value);
    if (keys.length !== 6 || !['mobileNumber', 'movieId', 'theatreId', 'seats', 'paymentMethod', 'totalPrice'].every((key) => keys.includes(key))) {
      throw new AppError(400, 'INVALID_BOOKING', 'Booking details must match the required selection.');
    }
    const validSeats = Array.isArray(value.seats) && value.seats.length === canonicalSeats.length && value.seats.every((seat, index) => seat === canonicalSeats[index]);
    if (typeof value.mobileNumber !== 'string' || value.mobileNumber.trim().length === 0 || !this.isPositiveId(value.movieId) || !this.isPositiveId(value.theatreId) || !validSeats || (value.paymentMethod !== 'CARD' && value.paymentMethod !== 'UPI') || value.totalPrice !== 450) {
      throw new AppError(400, 'INVALID_BOOKING', 'Booking details must match the required selection.');
    }
    return { mobileNumber: value.mobileNumber, movieId: value.movieId, theatreId: value.theatreId, seats: canonicalSeats, paymentMethod: value.paymentMethod, totalPrice: value.totalPrice };
  }

  /** Determine whether an untrusted value is a safe positive SQLite identifier. */
  private isPositiveId(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
  }
}
