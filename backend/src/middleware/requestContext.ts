import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/** Attach a request identifier to every request and HTTP response. */
export const requestContext: RequestHandler = (request, response, next): void => {
  const suppliedRequestId = request.header('x-request-id');
  request.requestId = suppliedRequestId && suppliedRequestId.length <= 128 ? suppliedRequestId : randomUUID();
  response.setHeader('x-request-id', request.requestId);
  next();
};
