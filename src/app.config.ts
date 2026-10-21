import { INestApplication, ValidationPipe } from '@nestjs/common';

/** Applies the global request validation and transformation pipe. */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
