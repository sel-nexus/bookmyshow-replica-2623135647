import type Database from 'better-sqlite3';
import type { BookingConfirmation, Movie, Theatre, User } from '../types/domain';

/** Persist and resolve booking records with parameterized SQLite statements. */
export class BookingRepository {
  /** Store the booking database connection. */
  public constructor(private readonly database: Database.Database) {}

  /** Locate a verified customer by mobile number. */
  public findUserByMobileNumber(mobileNumber: string): User | null {
    return this.database.prepare('SELECT id, mobile_number AS mobileNumber FROM users WHERE mobile_number = ?').get(mobileNumber) as User | undefined ?? null;
  }

  /** Locate an existing movie, theatre, and required stored mapping in one query. */
  public findMappedScreen(movieId: number, theatreId: number): { movie: Movie; theatre: Theatre } | null {
    const record = this.database.prepare(`
      SELECT movies.id AS movieId, movies.title AS movieTitle, theatres.id AS theatreId, theatres.name AS theatreName
      FROM movie_theatres
      INNER JOIN movies ON movies.id = movie_theatres.movie_id
      INNER JOIN theatres ON theatres.id = movie_theatres.theatre_id
      WHERE movies.id = ? AND theatres.id = ?
    `).get(movieId, theatreId) as { movieId: number; movieTitle: string; theatreId: number; theatreName: string } | undefined;
    return record ? { movie: { id: record.movieId, title: record.movieTitle }, theatre: { id: record.theatreId, name: record.theatreName } } : null;
  }

  /** Insert a booking using the prescribed durable row fields and return its identifier. */
  public insertBooking(userId: number, movieId: number, theatreId: number, seatsJson: string, paymentMethod: 'CARD' | 'UPI', totalPrice: number): number {
    const result = this.database.prepare(`
      INSERT INTO bookings (user_id, movie_id, theatre_id, seats, payment_method, total_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, movieId, theatreId, seatsJson, paymentMethod, totalPrice);
    return Number(result.lastInsertRowid);
  }

  /** Select the written booking together with its persisted payment and joined details. */
  public selectConfirmation(bookingId: number): BookingConfirmation {
    const record = this.database.prepare(`
      SELECT bookings.id AS bookingId, bookings.seats AS seatsJson, bookings.payment_method AS paymentMethod, bookings.total_price AS totalPrice,
             movies.id AS movieId, movies.title AS movieTitle, theatres.id AS theatreId, theatres.name AS theatreName
      FROM bookings
      INNER JOIN movies ON movies.id = bookings.movie_id
      INNER JOIN theatres ON theatres.id = bookings.theatre_id
      WHERE bookings.id = ?
    `).get(bookingId) as { bookingId: number; seatsJson: string; paymentMethod: 'CARD' | 'UPI'; totalPrice: number; movieId: number; movieTitle: string; theatreId: number; theatreName: string } | undefined;
    if (!record) throw new Error('Inserted booking confirmation could not be selected.');
    return { bookingId: record.bookingId, confirmationId: `BMS-${record.bookingId}`, movie: { id: record.movieId, title: record.movieTitle }, theatre: { id: record.theatreId, name: record.theatreName }, seats: JSON.parse(record.seatsJson) as string[], paymentMethod: record.paymentMethod, totalPrice: record.totalPrice };
  }
}
