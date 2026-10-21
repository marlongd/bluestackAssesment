import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SqliteDatabase } from './database';

export const MIGRATIONS_DIR = join(__dirname, '..', '..', 'migrations');

/**
 * Applies every `.sql` migration file that has not been applied yet, in
 * filename order. Each migration runs inside a transaction and is recorded in
 * the `schema_migrations` table so it is applied exactly once.
 */
export function runMigrations(
  db: SqliteDatabase,
  migrationsDir: string = MIGRATIONS_DIR,
): string[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    db
      .prepare('SELECT name FROM schema_migrations')
      .all()
      .map((row) => (row as { name: string }).name),
  );

  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  const appliedNow: string[] = [];

  const applyMigration = db.transaction((name: string, sql: string) => {
    db.exec(sql);
    db.prepare(
      'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
    ).run(name, new Date().toISOString());
  });

  for (const name of files) {
    if (applied.has(name)) {
      continue;
    }

    const sql = readFileSync(join(migrationsDir, name), 'utf8');
    applyMigration(name, sql);
    appliedNow.push(name);
  }

  return appliedNow;
}
