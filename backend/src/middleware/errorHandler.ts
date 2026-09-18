import type { ErrorRequestHandler } from 'express';
import { AppError } from '../types/domain';

/** Format every operational and unexpected failure as a request-correlated API error. */
export const errorHandler: ErrorRequestHandler = (error, request, response, _next): void => {
  const knownError = error instanceof AppError;
  const payloadTooLarge = typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large';
  const statusCode = knownError ? error.statusCode : payloadTooLarge ? 413 : 500;
  const code = knownError ? error.code : payloadTooLarge ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR';
  const message = knownError ? error.message : payloadTooLarge ? 'Request payload exceeds the 32KB limit.' : 'An unexpected error occurred.';

  response.status(statusCode).json({
    error: {
      code,
      message,
      requestId: request.requestId,
    },
  });
};
