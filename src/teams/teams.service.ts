import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '../users/user.entity';
import { UsersRepository } from '../users/users.repository';
import type { Team, TeamMembership } from './team.entity';
import { TeamsRepository } from './teams.repository';

@Injectable()
export class TeamsService {
  constructor(
    private readonly teams: TeamsRepository,
    private readonly users: UsersRepository,
  ) {}

  create(name: string, owner: User): Team {
    return this.teams.createWithOwner(name, owner.id);
  }

  listForUser(user: User): Team[] {
    return this.teams.listForUser(user.id);
  }

  /**
   * Loads a team the caller is allowed to see, or throws 403 for non-members.
   * (We return 403 rather than 404 per the documented authorization contract;
   * a production system might prefer 404 to avoid leaking team existence.)
   */
  requireMembership(teamId: string, userId: string): TeamMembership {
    const membership = this.teams.getMembership(teamId, userId);
    if (!membership) {
      throw new ForbiddenException(`Team "${teamId}" was not found`);
    }
    return membership;
  }

  addMember(teamId: string, caller: User, userIdToAdd: string): TeamMembership {
    const membership = this.teams.getMembership(teamId, caller.id);
    if (!membership || membership.role !== 'owner') {
      throw new ForbiddenException('Only a team owner can add members');
    }

    if (!this.users.findById(userIdToAdd)) {
      throw new NotFoundException(`User "${userIdToAdd}" was not found`);
    }

    if (this.teams.getMembership(teamId, userIdToAdd)) {
      throw new ConflictException(
        `User "${userIdToAdd}" is already a member of team "${teamId}"`,
      );
    }

    return this.teams.addMember(teamId, userIdToAdd, 'member');
  }
}
