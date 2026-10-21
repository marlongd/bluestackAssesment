import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SqliteDatabase } from '../database/database';
import { DB } from '../database/database.module';
import type { Note } from './note.entity';

interface NoteRow {
  id: string;
  team_id: string;
  title: string;
  body: string;
  version: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    teamId: row.team_id,
    title: row.title,
    body: row.body,
    version: row.version,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

const SELECT_COLUMNS = `
  id, team_id, title, body, version,
  created_by, updated_by, created_at, updated_at, deleted_at
`;

@Injectable()
export class NotesRepository {
  constructor(@Inject(DB) private readonly db: SqliteDatabase) {}

  create(teamId: string, title: string, body: string, authorId: string): Note {
    const now = new Date().toISOString();
    const note: Note = {
      id: randomUUID(),
      teamId,
      title,
      body,
      version: 1,
      createdBy: authorId,
      updatedBy: authorId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    this.db
      .prepare(
        `INSERT INTO notes
           (id, team_id, title, body, version, created_by, updated_by, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      )
      .run(
        note.id,
        note.teamId,
        note.title,
        note.body,
        note.version,
        note.createdBy,
        note.updatedBy,
        note.createdAt,
        note.updatedAt,
      );

    return note;
  }

  /** Lists a team's live notes, most recently updated first. */
  listForTeam(teamId: string, limit: number, offset: number): Note[] {
    const rows = this.db
      .prepare(
        `SELECT ${SELECT_COLUMNS}
         FROM notes
         WHERE team_id = ? AND deleted_at IS NULL
         ORDER BY updated_at DESC, id DESC
         LIMIT ? OFFSET ?`,
      )
      .all(teamId, limit, offset) as NoteRow[];

    return rows.map(toNote);
  }

  countForTeam(teamId: string): number {
    const row = this.db
      .prepare(
        'SELECT COUNT(*) AS count FROM notes WHERE team_id = ? AND deleted_at IS NULL',
      )
      .get(teamId) as { count: number };

    return row.count;
  }

  /** Finds a live note within a team, or null. */
  findInTeam(teamId: string, noteId: string): Note | null {
    const row = this.db
      .prepare(
        `SELECT ${SELECT_COLUMNS}
         FROM notes
         WHERE id = ? AND team_id = ? AND deleted_at IS NULL`,
      )
      .get(noteId, teamId) as NoteRow | undefined;

    return row ? toNote(row) : null;
  }

  /**
   * Replaces a live note's title and body only if its stored version matches
   * `expectedVersion`, incrementing the version and recording the editor.
   * Returns the updated note, or null if the version did not match (a stale
   * concurrent write). The check-and-write is a single statement, so it is
   * race-free.
   */
  updateIfVersion(
    teamId: string,
    noteId: string,
    expectedVersion: number,
    title: string,
    body: string,
    editorId: string,
  ): Note | null {
    const changed = this.db
      .prepare(
        `UPDATE notes
         SET title = ?, body = ?, version = version + 1,
             updated_by = ?, updated_at = ?
         WHERE id = ? AND team_id = ? AND deleted_at IS NULL AND version = ?`,
      )
      .run(
        title,
        body,
        editorId,
        new Date().toISOString(),
        noteId,
        teamId,
        expectedVersion,
      );

    if (changed.changes !== 1) {
      return null;
    }

    return this.findInTeam(teamId, noteId);
  }
}
