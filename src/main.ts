import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureApp } from './app.config';
import { AppModule } from './app.module';
import { getPort, SERVICE_NAME } from './config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);

  const port = getPort();

  await app.listen(port);
  Logger.log(
    `${SERVICE_NAME} listening on http://localhost:${port}`,
    'Bootstrap',
  );
}

void bootstrap();
