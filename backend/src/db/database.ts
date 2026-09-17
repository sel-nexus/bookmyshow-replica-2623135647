import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';

/** Create a file-backed SQLite database and apply the complete application schema. */
export function createDatabase(sqlitePath: string): Database.Database {
  const database = new Database(sqlitePath);
  database.pragma('foreign_keys = ON');
  const schemaPath = resolve(process.cwd(), 'src', 'db', 'schema.sql');
  database.exec(readFileSync(schemaPath, 'utf8'));
  return database;
}
