import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Paginated } from '../common/paginated';
import { TeamsService } from '../teams/teams.service';
import type { User } from '../users/user.entity';
import type { Note } from './note.entity';
import { NotesRepository } from './notes.repository';

@Injectable()
export class NotesService {
  constructor(
    private readonly notes: NotesRepository,
    private readonly teams: TeamsService,
  ) {}

  /** Creates a note in a team the caller belongs to. */
  create(teamId: string, user: User, title: string, body: string): Note {
    this.teams.requireMembership(teamId, user.id);
    return this.notes.create(teamId, title, body, user.id);
  }

  /** Lists a team's live notes for a member, most recently updated first. */
  list(
    teamId: string,
    user: User,
    limit: number,
    offset: number,
  ): Paginated<Note> {
    this.teams.requireMembership(teamId, user.id);

    const items = this.notes.listForTeam(teamId, limit, offset);
    const total = this.notes.countForTeam(teamId);

    return { items, total, limit, offset };
  }

  /** Retrieves a single live note for a member. */
  get(teamId: string, user: User, noteId: string): Note {
    this.teams.requireMembership(teamId, user.id);
    return this.requireNote(teamId, noteId);
  }

  /**
   * Replaces a note's title and body for a member, using the caller's
   * `If-Match` version for optimistic concurrency. A stale version yields 409.
   */
  update(
    teamId: string,
    user: User,
    noteId: string,
    expectedVersion: number,
    title: string,
    body: string,
  ): Note {
    this.teams.requireMembership(teamId, user.id);
    this.requireNote(teamId, noteId);

    const updated = this.notes.updateIfVersion(
      teamId,
      noteId,
      expectedVersion,
      title,
      body,
      user.id,
    );

    if (!updated) {
      throw new ConflictException(
        `Note "${noteId}" was modified by someone else; reload it and retry`,
      );
    }

    return updated;
  }

  private requireNote(teamId: string, noteId: string): Note {
    const note = this.notes.findInTeam(teamId, noteId);
    if (!note) {
      throw new NotFoundException(`Note "${noteId}" was not found`);
    }
    return note;
  }
}
