import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '../users/user.entity';
import { UsersRepository } from '../users/users.repository';
import type { TeamMembership } from './team.entity';
import { TeamsRepository } from './teams.repository';
import { TeamsService } from './teams.service';

const ada: User = { id: 'ada', name: 'Ada', createdAt: 'now' };
const bob: User = { id: 'bob', name: 'Bob', createdAt: 'now' };

function makeService(
  repo: Partial<TeamsRepository>,
  users: Partial<UsersRepository> = {},
) {
  return new TeamsService(repo as TeamsRepository, users as UsersRepository);
}

describe('TeamsService', () => {
  describe('create', () => {
    it('creates the team with the caller as owner', () => {
      const created = {
        id: 't1',
        name: 'Team',
        ownerId: 'ada',
        createdAt: 'now',
      };
      const repo = { createWithOwner: jest.fn().mockReturnValue(created) };
      const service = makeService(repo);

      const result = service.create('Team', ada);

      expect(repo.createWithOwner).toHaveBeenCalledWith('Team', 'ada');
      expect(result).toBe(created);
    });
  });

  describe('listForUser', () => {
    it('only returns the caller\u2019s teams', () => {
      const repo = { listForUser: jest.fn().mockReturnValue([]) };
      const service = makeService(repo);

      service.listForUser(ada);

      expect(repo.listForUser).toHaveBeenCalledWith('ada');
    });
  });

  describe('addMember', () => {
    it('forbids a non-owner from adding members', () => {
      const repo = {
        getMembership: (): TeamMembership => ({
          teamId: 't1',
          userId: 'bob',
          role: 'member',
          createdAt: 'now',
        }),
      };
      const service = makeService(repo);

      expect(() => service.addMember('t1', bob, 'carol')).toThrow(
        ForbiddenException,
      );
    });

    it('forbids a non-member from adding members', () => {
      const repo = { getMembership: (): null => null };
      const service = makeService(repo);

      expect(() => service.addMember('t1', bob, 'carol')).toThrow(
        ForbiddenException,
      );
    });

    it('rejects adding an unknown user', () => {
      const repo = {
        getMembership: (): TeamMembership => ({
          teamId: 't1',
          userId: 'ada',
          role: 'owner',
          createdAt: 'now',
        }),
      };
      const service = makeService(repo, { findById: () => null });

      expect(() => service.addMember('t1', ada, 'ghost')).toThrow(
        NotFoundException,
      );
    });

    it('rejects adding an existing member', () => {
      const repo = {
        getMembership: (teamId: string, userId: string): TeamMembership => ({
          teamId,
          userId,
          role: userId === 'ada' ? 'owner' : 'member',
          createdAt: 'now',
        }),
      };
      const service = makeService(repo, { findById: () => bob });

      expect(() => service.addMember('t1', ada, 'bob')).toThrow(
        ConflictException,
      );
    });

    it('adds a known non-member as a member', () => {
      const membership: TeamMembership = {
        teamId: 't1',
        userId: 'bob',
        role: 'member',
        createdAt: 'now',
      };
      const repo = {
        getMembership: (
          teamId: string,
          userId: string,
        ): TeamMembership | null =>
          userId === 'ada'
            ? { teamId, userId, role: 'owner', createdAt: 'now' }
            : null,
        addMember: jest.fn().mockReturnValue(membership),
      };
      const service = makeService(repo, { findById: () => bob });

      const result = service.addMember('t1', ada, 'bob');

      expect(repo.addMember).toHaveBeenCalledWith('t1', 'bob', 'member');
      expect(result).toBe(membership);
    });
  });

  describe('requireMembership', () => {
    it('forbids non-members with 403', () => {
      const service = makeService({ getMembership: () => null });

      expect(() => service.requireMembership('t1', 'bob')).toThrow(
        ForbiddenException,
      );
    });

    it('returns the membership for members', () => {
      const membership: TeamMembership = {
        teamId: 't1',
        userId: 'bob',
        role: 'member',
        createdAt: 'now',
      };
      const service = makeService({ getMembership: () => membership });

      expect(service.requireMembership('t1', 'bob')).toBe(membership);
    });
  });
});
