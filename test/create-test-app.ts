import { Test, TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configureApp } from '../src/app.config';
import { AppModule } from '../src/app.module';

export interface TestApp {
  app: NestExpressApplication;
  close: () => Promise<void>;
}

/**
 * Boots the app against a fresh temporary SQLite file so each suite is
 * isolated. DATABASE_PATH must be set before the module is compiled.
 */
export async function createTestApp(): Promise<TestApp> {
  const tempDir = mkdtempSync(join(tmpdir(), 'team-notes-e2e-'));
  process.env.DATABASE_PATH = join(tempDir, 'test.db');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  return {
    app,
    close: async () => {
      await app.close();
      rmSync(tempDir, { recursive: true, force: true });
      delete process.env.DATABASE_PATH;
    },
  };
}
