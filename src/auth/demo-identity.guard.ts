import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { CURRENT_USER_KEY } from './current-user.decorator';

export const DEMO_USER_HEADER = 'x-user-id';

/**
 * DEMO-ONLY identity resolution.
 *
 * This is NOT production authentication. It trusts a caller-supplied
 * `X-User-Id` header and verifies only that the referenced user exists. There
 * is no secret, signature, or session. It exists so the API can be exercised
 * with multiple users without standing up real auth.
 *
 * All identity resolution is isolated behind this guard so it can be replaced
 * with real authentication later without touching controllers or services.
 */
@Injectable()
export class DemoIdentityGuard implements CanActivate {
  constructor(private readonly users: UsersRepository) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      [CURRENT_USER_KEY]?: unknown;
    }>();

    const rawHeader = request.headers[DEMO_USER_HEADER];
    const userId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!userId) {
      throw new UnauthorizedException(
        `Missing ${DEMO_USER_HEADER} header. This is a demo identity mechanism; provide the id of a user created via POST /users.`,
      );
    }

    const user = this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException(`Unknown user "${userId}"`);
    }

    request[CURRENT_USER_KEY] = user;
    return true;
  }
}
