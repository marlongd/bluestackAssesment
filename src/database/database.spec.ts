import { openDatabase, type SqliteDatabase } from './database';

describe('openDatabase', () => {
  let db: SqliteDatabase;

  afterEach(() => {
    db?.close();
  });

  it('creates the file and a queryable database', () => {
    db = openDatabase(':memory:');

    const row = db.prepare('SELECT 1 AS value').get() as { value: number };

    expect(row.value).toBe(1);
  });

  it('enables foreign key enforcement', () => {
    db = openDatabase(':memory:');

    const pragma = db.pragma('foreign_keys', { simple: true });

    expect(pragma).toBe(1);
  });
});
