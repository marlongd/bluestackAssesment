import { Injectable } from '@nestjs/common';
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
}
