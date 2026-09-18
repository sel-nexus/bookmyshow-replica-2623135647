import type Database from 'better-sqlite3';
import { BookingRepository } from '../repositories/bookingRepository';
import { AppError, type BookingConfirmation, type BookingRequest } from '../types/domain';

const availableSeats = new Set(['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4', 'C5']);
const requiredSeatCount = 3;

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
      const bookingId = this.repository.insertBooking(user.id, mappedScreen.movie.id, mappedScreen.theatre.id, JSON.stringify(booking.seats), booking.paymentMethod, booking.totalPrice);
      const confirmation = this.repository.selectConfirmation(bookingId);
      if (!confirmation) throw new Error('Inserted booking confirmation was not found.');
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

  /** Retrieve a committed booking confirmation by its trusted numeric identifier. */
  public getBookingConfirmation(bookingId: number): BookingConfirmation {
    const confirmation = this.repository.selectConfirmation(bookingId);
    if (!confirmation) {
      throw new AppError(404, 'ENTITY_NOT_FOUND', 'The requested booking was not found.');
    }
    return confirmation;
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
    const validSeats = Array.isArray(value.seats)
      && value.seats.length === requiredSeatCount
      && value.seats.every((seat): seat is string => typeof seat === 'string' && availableSeats.has(seat))
      && new Set(value.seats).size === requiredSeatCount;
    if (typeof value.mobileNumber !== 'string' || !/^\d{10}$/.test(value.mobileNumber) || !this.isPositiveId(value.movieId) || !this.isPositiveId(value.theatreId) || !validSeats || (value.paymentMethod !== 'CARD' && value.paymentMethod !== 'UPI') || !this.isNonNegativeInteger(value.totalPrice)) {
      throw new AppError(400, 'INVALID_BOOKING', 'Booking details must include exactly three distinct available seats and a valid total.');
    }
    const seats = value.seats as string[];
    return { mobileNumber: value.mobileNumber, movieId: value.movieId, theatreId: value.theatreId, seats, paymentMethod: value.paymentMethod, totalPrice: value.totalPrice };
  }

  /** Determine whether an untrusted value is a safe positive SQLite identifier. */
  private isPositiveId(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
  }

  /** Determine whether a submitted calculated total is safe to persist. */
  private isNonNegativeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  }
}
