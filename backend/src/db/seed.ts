import type Database from 'better-sqlite3';

interface CountRow { count: number; }
interface IdRow { id: number; }

/** Seed the required discovery catalog once and verify its persisted relationship integrity. */
export function seedDiscovery(database: Database.Database): void {
  const seed = database.transaction((): void => {
    const insertMovie = database.prepare(`
      INSERT INTO movies (title, description, duration_minutes, language, certificate, release_date)
      SELECT ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM movies WHERE title = ?)
      ON CONFLICT DO NOTHING
    `);
    const insertTheatre = database.prepare(`
      INSERT INTO theatres (name, city, address)
      SELECT ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM theatres WHERE name = ?)
      ON CONFLICT DO NOTHING
    `);
    const insertMapping = database.prepare(`
      INSERT INTO movie_theatres (movie_id, theatre_id, show_time, price_cents)
      VALUES (?, ?, '19:00', 45000)
      ON CONFLICT(movie_id, theatre_id, show_time) DO NOTHING
    `);

    for (const title of ['Paradise', 'Bloody Romeo', 'OG2']) {
      insertMovie.run(title, `${title} is now showing.`, 150, 'Telugu', 'UA', '2026-01-01', title);
    }
    for (const name of ['Sandhya 70mm', 'Sudharsham', 'Allu Cinemas']) {
      insertTheatre.run(name, 'Hyderabad', `${name}, Hyderabad`, name);
    }

    const movieId = database.prepare('SELECT id FROM movies WHERE title = ?').pluck();
    const theatreId = database.prepare('SELECT id FROM theatres WHERE name = ?').pluck();
    insertMapping.run(movieId.get('Paradise') as number, theatreId.get('Sandhya 70mm') as number);
    insertMapping.run(movieId.get('Paradise') as number, theatreId.get('Allu Cinemas') as number);
    insertMapping.run(movieId.get('Bloody Romeo') as number, theatreId.get('Sudharsham') as number);
    insertMapping.run(movieId.get('OG2') as number, theatreId.get('Allu Cinemas') as number);
  });

  seed();
  assertDiscoveryIntegrity(database);
}

/** Assert that the required catalog contains exactly the prescribed records and mappings. */
export function assertDiscoveryIntegrity(database: Database.Database): void {
  const movieCount = database.prepare(`SELECT COUNT(*) AS count FROM movies WHERE title IN ('Paradise', 'Bloody Romeo', 'OG2')`).get() as CountRow;
  const theatreCount = database.prepare(`SELECT COUNT(*) AS count FROM theatres WHERE name IN ('Sandhya 70mm', 'Sudharsham', 'Allu Cinemas')`).get() as CountRow;
  const mappingCount = database.prepare(`
    SELECT COUNT(*) AS count
    FROM movie_theatres
    INNER JOIN movies ON movies.id = movie_theatres.movie_id
    INNER JOIN theatres ON theatres.id = movie_theatres.theatre_id
    WHERE (movies.title = 'Paradise' AND theatres.name IN ('Sandhya 70mm', 'Allu Cinemas'))
       OR (movies.title = 'Bloody Romeo' AND theatres.name = 'Sudharsham')
       OR (movies.title = 'OG2' AND theatres.name = 'Allu Cinemas')
  `).get() as CountRow;
  const unexpectedMappings = database.prepare(`
    SELECT COUNT(*) AS count
    FROM movie_theatres
    INNER JOIN movies ON movies.id = movie_theatres.movie_id
    WHERE movies.title IN ('Paradise', 'Bloody Romeo', 'OG2')
  `).get() as CountRow;

  if (movieCount.count !== 3 || theatreCount.count !== 3 || mappingCount.count !== 4 || unexpectedMappings.count !== 4) {
    throw new Error('Discovery seed integrity assertion failed.');
  }
}
