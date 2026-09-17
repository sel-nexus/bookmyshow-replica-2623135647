import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService';
import { AppError } from '../types/domain';

const loginSchema = z.object({ mobileNumber: z.string().min(1) }).strict();
const verifySchema = z.object({ mobileNumber: z.string().min(1), otp: z.string().min(1) }).strict();

/** Create authentication endpoints backed by the supplied authentication service. */
export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  router.post('/login', (request: Request, response: Response, next: NextFunction): void => {
    try {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(400, 'INVALID_REQUEST', 'mobileNumber must be a non-empty string.');
      }
      response.status(200).json({ data: authService.acceptLogin(parsed.data.mobileNumber) });
    } catch (error: unknown) {
      next(error);
    }
  });

  router.post('/verify', (request: Request, response: Response, next: NextFunction): void => {
    try {
      const parsed = verifySchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(400, 'INVALID_REQUEST', 'mobileNumber and otp must be non-empty strings.');
      }
      if (parsed.data.otp !== '1234') {
        throw new AppError(401, 'OTP_NOT_ACCEPTED', 'The supplied OTP was not accepted.');
      }
      response.status(200).json({ data: authService.verifyOtp(parsed.data.mobileNumber) });
    } catch (error: unknown) {
      next(error);
    }
  });

  return router;
}
