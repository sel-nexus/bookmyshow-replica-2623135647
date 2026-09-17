import type { ErrorRequestHandler } from 'express';
import { AppError } from '../types/domain';

/** Format every operational and unexpected failure as a request-correlated API error. */
export const errorHandler: ErrorRequestHandler = (error, request, response, _next): void => {
  const knownError = error instanceof AppError;
  const statusCode = knownError ? error.statusCode : 500;
  const code = knownError ? error.code : 'INTERNAL_ERROR';
  const message = knownError ? error.message : 'An unexpected error occurred.';

  response.status(statusCode).json({
    error: {
      code,
      message,
      requestId: request.requestId,
    },
  });
};
