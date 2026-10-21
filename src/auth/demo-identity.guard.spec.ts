import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { User } from '../users/user.entity';
import { UsersRepository } from '../users/users.repository';
import { CURRENT_USER_KEY } from './current-user.decorator';
import { DEMO_USER_HEADER, DemoIdentityGuard } from './demo-identity.guard';

function contextWithHeaders(headers: Record<string, string | undefined>): {
  context: ExecutionContext;
  request: Record<string, unknown>;
} {
  const request: Record<string, unknown> = { headers };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function usersRepoReturning(user: User | null): UsersRepository {
  return { findById: () => user } as unknown as UsersRepository;
}

describe('DemoIdentityGuard', () => {
  it('rejects a request with no header', () => {
    const guard = new DemoIdentityGuard(usersRepoReturning(null));
    const { context } = contextWithHeaders({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects an unknown user id', () => {
    const guard = new DemoIdentityGuard(usersRepoReturning(null));
    const { context } = contextWithHeaders({ [DEMO_USER_HEADER]: 'ghost' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('attaches a known user to the request', () => {
    const user: User = { id: 'u1', name: 'Ada', createdAt: 'now' };
    const guard = new DemoIdentityGuard(usersRepoReturning(user));
    const { context, request } = contextWithHeaders({
      [DEMO_USER_HEADER]: 'u1',
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(request[CURRENT_USER_KEY]).toEqual(user);
  });
});
