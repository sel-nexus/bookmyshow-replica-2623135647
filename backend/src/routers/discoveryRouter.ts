import { Router, type NextFunction, type Request, type Response } from 'express';
import { DiscoveryService } from '../services/discoveryService';
import { AppError } from '../types/domain';

/** Create HTTP adapters for persisted movie and theatre discovery. */
export function createDiscoveryRouter(discoveryService: DiscoveryService): Router {
  const router = Router();

  router.get('/movies', (request: Request, response: Response, next: NextFunction): void => {
    try {
      response.status(200).json({ data: { movies: discoveryService.listMovies() } });
    } catch (error: unknown) {
      next(error);
    }
  });

  router.get('/theatres', (request: Request, response: Response, next: NextFunction): void => {
    try {
      const movieIdValue = request.query.movieId;
      if (typeof movieIdValue !== 'string' || !/^[1-9]\d*$/.test(movieIdValue)) {
        throw new AppError(400, 'INVALID_MOVIE_ID', 'movieId must be a positive integer.');
      }
      const movieId = Number(movieIdValue);
      if (!Number.isSafeInteger(movieId) || movieId <= 0) {
        throw new AppError(400, 'INVALID_MOVIE_ID', 'movieId must be a positive integer.');
      }
      response.status(200).json({ data: { movieId, theatres: discoveryService.listTheatres(movieId) } });
    } catch (error: unknown) {
      next(error);
    }
  });

  return router;
}
