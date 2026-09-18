import { Router, type NextFunction, type Request, type Response } from 'express';
import { BookingService } from '../services/bookingService';

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
  return router;
}
