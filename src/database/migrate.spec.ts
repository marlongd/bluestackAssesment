import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, type SqliteDatabase } from './database';
import { MIGRATIONS_DIR, runMigrations } from './migrate';

function tableNames(db: SqliteDatabase): string[] {
  return db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    .all()
    .map((row) => (row as { name: string }).name);
}

describe('runMigrations', () => {
  let db: SqliteDatabase;

  beforeEach(() => {
    db = openDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates the expected domain tables', () => {
    runMigrations(db);

    const tables = tableNames(db);

    expect(tables).toEqual(
      expect.arrayContaining([
        'users',
        'teams',
        'team_members',
        'notes',
        'schema_migrations',
      ]),
    );
  });

  it('does not create a revision/history table', () => {
    runMigrations(db);

    const tables = tableNames(db);

    expect(tables).not.toEqual(
      expect.arrayContaining(['note_revisions', 'note_history', 'revisions']),
    );
  });

  it('records applied migrations and is idempotent', () => {
    const first = runMigrations(db);
    const second = runMigrations(db);

    expect(first).toEqual(['001_init.sql']);
    expect(second).toEqual([]);
  });

  it('enforces unique team membership and role constraints', () => {
    runMigrations(db);

    db.prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)').run(
      'u1',
      'Ada',
      new Date().toISOString(),
    );
    db.prepare(
      'INSERT INTO teams (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)',
    ).run('t1', 'Team', 'u1', new Date().toISOString());
    db.prepare(
      'INSERT INTO team_members (team_id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
    ).run('t1', 'u1', 'owner', new Date().toISOString());

    expect(() =>
      db
        .prepare(
          'INSERT INTO team_members (team_id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
        )
        .run('t1', 'u1', 'member', new Date().toISOString()),
    ).toThrow();

    expect(() =>
      db
        .prepare(
          'INSERT INTO team_members (team_id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
        )
        .run('t1', 'u2', 'admin', new Date().toISOString()),
    ).toThrow();
  });

  it('supports applying migrations from a custom directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mig-'));
    try {
      writeFileSync(
        join(dir, '001_a.sql'),
        'CREATE TABLE a (id TEXT PRIMARY KEY);',
      );
      writeFileSync(
        join(dir, '002_b.sql'),
        'CREATE TABLE b (id TEXT PRIMARY KEY);',
      );

      const applied = runMigrations(db, dir);

      expect(applied).toEqual(['001_a.sql', '002_b.sql']);
      expect(tableNames(db)).toEqual(expect.arrayContaining(['a', 'b']));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('points at the repository migrations directory by default', () => {
    expect(MIGRATIONS_DIR.endsWith(join('migrations'))).toBe(true);
  });
});
