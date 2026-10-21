import { openDatabase, type SqliteDatabase } from '../database/database';
import { runMigrations } from '../database/migrate';
import { NotesRepository } from './notes.repository';

describe('NotesRepository', () => {
  let db: SqliteDatabase;
  let repo: NotesRepository;

  beforeEach(() => {
    db = openDatabase(':memory:');
    runMigrations(db);
    db.prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)').run(
      'u1',
      'Ada',
      'now',
    );
    db.prepare(
      'INSERT INTO teams (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)',
    ).run('t1', 'Alpha', 'u1', 'now');
    repo = new NotesRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates a note starting at version 1', () => {
    const note = repo.create('t1', 'Title', 'Body', 'u1');

    expect(note).toMatchObject({
      teamId: 't1',
      title: 'Title',
      body: 'Body',
      version: 1,
      createdBy: 'u1',
      updatedBy: 'u1',
      deletedAt: null,
    });
  });

  it('lists notes most recently updated first', () => {
    const first = repo.create('t1', 'First', '', 'u1');
    const second = repo.create('t1', 'Second', '', 'u1');
    db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run(
      '2030-01-01T00:00:00.000Z',
      first.id,
    );

    const items = repo.listForTeam('t1', 10, 0);

    expect(items.map((n) => n.id)).toEqual([first.id, second.id]);
  });

  it('paginates with limit and offset', () => {
    repo.create('t1', 'A', '', 'u1');
    repo.create('t1', 'B', '', 'u1');
    repo.create('t1', 'C', '', 'u1');

    expect(repo.listForTeam('t1', 2, 0)).toHaveLength(2);
    expect(repo.listForTeam('t1', 2, 2)).toHaveLength(1);
    expect(repo.countForTeam('t1')).toBe(3);
  });

  it('excludes notes from other teams', () => {
    db.prepare(
      'INSERT INTO teams (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)',
    ).run('t2', 'Beta', 'u1', 'now');
    repo.create('t2', 'Elsewhere', '', 'u1');

    expect(repo.countForTeam('t1')).toBe(0);
    expect(repo.findInTeam('t1', 'nope')).toBeNull();
  });

  it('does not return soft-deleted notes', () => {
    const note = repo.create('t1', 'Gone', '', 'u1');
    db.prepare('UPDATE notes SET deleted_at = ? WHERE id = ?').run(
      'now',
      note.id,
    );

    expect(repo.listForTeam('t1', 10, 0)).toHaveLength(0);
    expect(repo.findInTeam('t1', note.id)).toBeNull();
  });
});
