import { DiscoveryRepository } from '../repositories/discoveryRepository';
import type { Movie, Theatre } from '../types/domain';

/** Coordinate persisted catalog discovery without exposing database details to routes. */
export class DiscoveryService {
  /** Store the repository that provides catalog queries. */
  public constructor(private readonly repository: DiscoveryRepository) {}

  /** Return the available movies, including an empty result for an empty database. */
  public listMovies(): Movie[] {
    return this.repository.listMovies();
  }

  /** Return theatres explicitly mapped to the selected movie. */
  public listTheatres(movieId: number): Theatre[] {
    return this.repository.listTheatresForMovie(movieId);
  }
}
