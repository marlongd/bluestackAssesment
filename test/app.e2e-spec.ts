import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';

const tempDir = mkdtempSync(join(tmpdir(), 'team-notes-e2e-'));
process.env.DATABASE_PATH = join(tempDir, 'test.db');

import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('GET /health returns 200 with an ok status and database', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      uptime: expect.any(Number),
      db: 'ok',
    });
  });

  it('GET /unknown returns 404', async () => {
    await request(app.getHttpServer()).get('/unknown').expect(404);
  });
});
