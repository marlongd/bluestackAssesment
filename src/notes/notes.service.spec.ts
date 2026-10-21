import { ForbiddenException } from '@nestjs/common';
import type { TeamMembership } from '../teams/team.entity';
import { TeamsService } from '../teams/teams.service';
import type { User } from '../users/user.entity';
import { NotesRepository } from './notes.repository';
import { NotesService } from './notes.service';

const ada: User = { id: 'ada', name: 'Ada', createdAt: 'now' };

function makeService(
  notes: Partial<NotesRepository>,
  teams: Partial<TeamsService>,
) {
  return new NotesService(notes as NotesRepository, teams as TeamsService);
}

describe('NotesService', () => {
  const membership: TeamMembership = {
    teamId: 't1',
    userId: 'ada',
    role: 'member',
    createdAt: 'now',
  };

  describe('create', () => {
    it('creates a note for a member', () => {
      const note = { id: 'n1' };
      const notes = { create: jest.fn().mockReturnValue(note) };
      const teams = {
        requireMembership: jest.fn().mockReturnValue(membership),
      };
      const service = makeService(notes, teams);

      const result = service.create('t1', ada, 'T', 'B');

      expect(teams.requireMembership).toHaveBeenCalledWith('t1', 'ada');
      expect(notes.create).toHaveBeenCalledWith('t1', 'T', 'B', 'ada');
      expect(result).toBe(note);
    });

    it('rejects a non-member', () => {
      const teams = {
        requireMembership: () => {
          throw new ForbiddenException();
        },
      };
      const service = makeService({}, teams);

      expect(() => service.create('t1', ada, 'T', 'B')).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('list', () => {
    it('returns a paginated envelope for a member', () => {
      const items = [{ id: 'n1' }];
      const notes = {
        listForTeam: jest.fn().mockReturnValue(items),
        countForTeam: jest.fn().mockReturnValue(1),
      };
      const teams = {
        requireMembership: jest.fn().mockReturnValue(membership),
      };
      const service = makeService(notes, teams);

      const result = service.list('t1', ada, 10, 0);

      expect(result).toEqual({ items, total: 1, limit: 10, offset: 0 });
    });

    it('rejects a non-member before querying notes', () => {
      const notes = { listForTeam: jest.fn(), countForTeam: jest.fn() };
      const teams = {
        requireMembership: () => {
          throw new ForbiddenException();
        },
      };
      const service = makeService(notes, teams);

      expect(() => service.list('t1', ada, 10, 0)).toThrow(ForbiddenException);
      expect(notes.listForTeam).not.toHaveBeenCalled();
    });
  });
});
