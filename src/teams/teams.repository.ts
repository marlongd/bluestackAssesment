import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SqliteDatabase } from '../database/database';
import { DB } from '../database/database.module';
import type { Team, TeamMembership, TeamRole } from './team.entity';

interface TeamRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

interface MembershipRow {
  team_id: string;
  user_id: string;
  role: TeamRole;
  created_at: string;
}

function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
}

@Injectable()
export class TeamsRepository {
  constructor(@Inject(DB) private readonly db: SqliteDatabase) {}

  /** Creates a team and its owner membership atomically. */
  createWithOwner(name: string, ownerId: string): Team {
    const team: Team = {
      id: randomUUID(),
      name,
      ownerId,
      createdAt: new Date().toISOString(),
    };

    const create = this.db.transaction(() => {
      this.db
        .prepare(
          'INSERT INTO teams (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)',
        )
        .run(team.id, team.name, team.ownerId, team.createdAt);
      this.db
        .prepare(
          'INSERT INTO team_members (team_id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
        )
        .run(team.id, ownerId, 'owner', team.createdAt);
    });
    create();

    return team;
  }

  findById(id: string): Team | null {
    const row = this.db
      .prepare('SELECT id, name, owner_id, created_at FROM teams WHERE id = ?')
      .get(id) as TeamRow | undefined;

    return row ? toTeam(row) : null;
  }

  listForUser(userId: string): Team[] {
    const rows = this.db
      .prepare(
        `SELECT t.id, t.name, t.owner_id, t.created_at
         FROM teams t
         JOIN team_members m ON m.team_id = t.id
         WHERE m.user_id = ?
         ORDER BY t.created_at DESC`,
      )
      .all(userId) as TeamRow[];

    return rows.map(toTeam);
  }

  getMembership(teamId: string, userId: string): TeamMembership | null {
    const row = this.db
      .prepare(
        'SELECT team_id, user_id, role, created_at FROM team_members WHERE team_id = ? AND user_id = ?',
      )
      .get(teamId, userId) as MembershipRow | undefined;

    if (!row) {
      return null;
    }

    return {
      teamId: row.team_id,
      userId: row.user_id,
      role: row.role,
      createdAt: row.created_at,
    };
  }

  addMember(teamId: string, userId: string, role: TeamRole): TeamMembership {
    const membership: TeamMembership = {
      teamId,
      userId,
      role,
      createdAt: new Date().toISOString(),
    };

    this.db
      .prepare(
        'INSERT INTO team_members (team_id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
      )
      .run(teamId, userId, role, membership.createdAt);

    return membership;
  }
}
