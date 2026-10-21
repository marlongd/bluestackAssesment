import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type SqliteDatabase = Database.Database;

/**
 * Opens (creating if needed) a SQLite database file and applies pragmas that
 * are appropriate for this single-instance demo service.
 */
export function openDatabase(filePath: string): SqliteDatabase {
  if (filePath !== ':memory:') {
    const absolutePath = resolve(filePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    filePath = absolutePath;
  }

  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
