import { Router, type NextFunction, type Request, type Response } from 'express';
import { BookingService } from '../services/bookingService';
import { AppError } from '../types/domain';

/** Expose the booking creation endpoint with a deliberately thin HTTP adapter. */
export function createBookingRouter(bookingService: BookingService): Router {
  const router = Router();
  router.post('/bookings', (request: Request, response: Response, next: NextFunction): void => {
    try {
      response.status(201).json({ data: bookingService.createBooking(request.body) });
    } catch (error: unknown) {
      next(error);
    }
  });
  router.get('/bookings/:bookingId', (request: Request, response: Response, next: NextFunction): void => {
    try {
      const bookingId = Number(request.params.bookingId);
      if (!/^\d+$/.test(request.params.bookingId) || !Number.isSafeInteger(bookingId) || bookingId <= 0) {
        throw new AppError(400, 'INVALID_BOOKING_ID', 'Booking ID must be a positive numeric identifier.');
      }
      response.status(200).json({ data: bookingService.getBookingConfirmation(bookingId) });
    } catch (error: unknown) {
      next(error);
    }
  });
  return router;
}
