import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { getBodyLimit } from './config';

/**
 * Applies global request validation, transformation, error handling, and
 * operational request limits. Shared by the bootstrap entrypoint and tests.
 */
export function configureApp(app: NestExpressApplication): void {
  app.useBodyParser('json', { limit: getBodyLimit() });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}
