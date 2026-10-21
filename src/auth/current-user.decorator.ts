import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '../users/user.entity';

export const CURRENT_USER_KEY = 'currentUser';

/**
 * Pulls the authenticated user (attached by `DemoIdentityGuard`) off the request.
 * Usage: `@CurrentUser() user: User`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ [CURRENT_USER_KEY]?: User }>();
    return request[CURRENT_USER_KEY]!;
  },
);
