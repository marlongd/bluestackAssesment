import request from 'supertest';
import { createTestApp, type TestApp } from './create-test-app';

describe('App (e2e)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('GET /health returns 200 with an ok status and database', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      uptime: expect.any(Number),
      db: 'ok',
    });
  });

  it('GET /unknown returns 404', async () => {
    await request(ctx.app.getHttpServer()).get('/unknown').expect(404);
  });
});
