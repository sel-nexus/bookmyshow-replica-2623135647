import type Database from 'better-sqlite3';
import type { Movie, Theatre } from '../types/domain';

/** Query persisted discovery records using reusable SQLite prepared statements. */
export class DiscoveryRepository {
  /** Store the file-backed database used by this repository. */
  public constructor(private readonly database: Database.Database) {}

  /** Return every movie in stable identifier order. */
  public listMovies(): Movie[] {
    return this.database.prepare('SELECT id, title FROM movies ORDER BY id').all() as Movie[];
  }

  /** Return only theatres mapped to the supplied movie in stable identifier order. */
  public listTheatresForMovie(movieId: number): Theatre[] {
    return this.database.prepare(`
      SELECT theatres.id, theatres.name
      FROM movie_theatres
      INNER JOIN theatres ON theatres.id = movie_theatres.theatre_id
      WHERE movie_theatres.movie_id = ?
      ORDER BY theatres.id
    `).all(movieId) as Theatre[];
  }
}
