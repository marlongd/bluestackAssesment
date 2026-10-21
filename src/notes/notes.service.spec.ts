import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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

  describe('get', () => {
    it('returns a note for a member', () => {
      const note = { id: 'n1' };
      const notes = { findInTeam: jest.fn().mockReturnValue(note) };
      const teams = {
        requireMembership: jest.fn().mockReturnValue(membership),
      };
      const service = makeService(notes, teams);

      expect(service.get('t1', ada, 'n1')).toBe(note);
    });

    it('throws 404 for a missing note', () => {
      const notes = { findInTeam: () => null };
      const teams = { requireMembership: jest.fn() };
      const service = makeService(notes, teams);

      expect(() => service.get('t1', ada, 'n1')).toThrow(NotFoundException);
    });

    it('rejects a non-member', () => {
      const teams = {
        requireMembership: () => {
          throw new ForbiddenException();
        },
      };
      const service = makeService({}, teams);

      expect(() => service.get('t1', ada, 'n1')).toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('updates a note with the matching version', () => {
      const updated = { id: 'n1', version: 2 };
      const notes = {
        findInTeam: jest.fn().mockReturnValue({ id: 'n1', version: 1 }),
        updateIfVersion: jest.fn().mockReturnValue(updated),
      };
      const teams = {
        requireMembership: jest.fn().mockReturnValue(membership),
      };
      const service = makeService(notes, teams);

      const result = service.update('t1', ada, 'n1', 1, 'T', 'B');

      expect(notes.updateIfVersion).toHaveBeenCalledWith(
        't1',
        'n1',
        1,
        'T',
        'B',
        'ada',
      );
      expect(result).toBe(updated);
    });

    it('throws 404 for a missing note', () => {
      const notes = { findInTeam: () => null };
      const teams = { requireMembership: jest.fn() };
      const service = makeService(notes, teams);

      expect(() => service.update('t1', ada, 'n1', 1, 'T', 'B')).toThrow(
        NotFoundException,
      );
    });

    it('throws 409 for a stale version', () => {
      const notes = {
        findInTeam: jest.fn().mockReturnValue({ id: 'n1', version: 2 }),
        updateIfVersion: jest.fn().mockReturnValue(null),
      };
      const teams = {
        requireMembership: jest.fn().mockReturnValue(membership),
      };
      const service = makeService(notes, teams);

      expect(() => service.update('t1', ada, 'n1', 1, 'T', 'B')).toThrow(
        ConflictException,
      );
    });

    it('rejects a non-member before touching the store', () => {
      const notes = { findInTeam: jest.fn(), updateIfVersion: jest.fn() };
      const teams = {
        requireMembership: () => {
          throw new ForbiddenException();
        },
      };
      const service = makeService(notes, teams);

      expect(() => service.update('t1', ada, 'n1', 1, 'T', 'B')).toThrow(
        ForbiddenException,
      );
      expect(notes.updateIfVersion).not.toHaveBeenCalled();
    });
  });
});
