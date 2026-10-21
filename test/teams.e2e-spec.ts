import request from 'supertest';
import { createTestApp, type TestApp } from './create-test-app';

async function createUser(app: TestApp, name: string): Promise<string> {
  const response = await request(app.app.getHttpServer())
    .post('/users')
    .send({ name })
    .expect(201);
  return response.body.id;
}

async function createTeam(
  app: TestApp,
  userId: string,
  name: string,
): Promise<string> {
  const response = await request(app.app.getHttpServer())
    .post('/teams')
    .set('X-User-Id', userId)
    .send({ name })
    .expect(201);
  return response.body.id;
}

describe('Identity and team access (e2e)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('creates a user', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post('/users')
      .send({ name: 'Ada' })
      .expect(201);

    expect(response.body).toEqual({
      id: expect.any(String),
      name: 'Ada',
      createdAt: expect.any(String),
    });
  });

  it('rejects team requests without an identity header', async () => {
    await request(ctx.app.getHttpServer()).get('/teams').expect(401);
  });

  it('rejects team requests with an unknown user id', async () => {
    await request(ctx.app.getHttpServer())
      .get('/teams')
      .set('X-User-Id', 'does-not-exist')
      .expect(401);
  });

  it('makes the creator an owner and shows the team to them', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    const response = await request(ctx.app.getHttpServer())
      .get('/teams')
      .set('X-User-Id', ada)
      .expect(200);

    expect(response.body).toEqual([
      {
        id: teamId,
        name: 'Alpha',
        ownerId: ada,
        createdAt: expect.any(String),
      },
    ]);
  });

  it('lets an owner add a member and both see the team', async () => {
    const ada = await createUser(ctx, 'Ada');
    const bob = await createUser(ctx, 'Bob');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    await request(ctx.app.getHttpServer())
      .post(`/teams/${teamId}/members`)
      .set('X-User-Id', ada)
      .send({ userId: bob })
      .expect(201);

    const bobTeams = await request(ctx.app.getHttpServer())
      .get('/teams')
      .set('X-User-Id', bob)
      .expect(200);

    expect(bobTeams.body.map((t: { id: string }) => t.id)).toContain(teamId);
  });

  it('does not list one user\u2019s teams to a non-member', async () => {
    const ada = await createUser(ctx, 'Ada');
    const bob = await createUser(ctx, 'Bob');
    await createTeam(ctx, ada, 'Alpha');

    const bobTeams = await request(ctx.app.getHttpServer())
      .get('/teams')
      .set('X-User-Id', bob)
      .expect(200);

    expect(bobTeams.body).toEqual([]);
  });

  it('forbids a non-member from adding members to another team', async () => {
    const ada = await createUser(ctx, 'Ada');
    const bob = await createUser(ctx, 'Bob');
    const carol = await createUser(ctx, 'Carol');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    await request(ctx.app.getHttpServer())
      .post(`/teams/${teamId}/members`)
      .set('X-User-Id', bob)
      .send({ userId: carol })
      .expect(403);
  });

  it('rejects adding an unknown user', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    await request(ctx.app.getHttpServer())
      .post(`/teams/${teamId}/members`)
      .set('X-User-Id', ada)
      .send({ userId: 'ghost' })
      .expect(404);
  });

  it('rejects adding the same member twice', async () => {
    const ada = await createUser(ctx, 'Ada');
    const bob = await createUser(ctx, 'Bob');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    await request(ctx.app.getHttpServer())
      .post(`/teams/${teamId}/members`)
      .set('X-User-Id', ada)
      .send({ userId: bob })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post(`/teams/${teamId}/members`)
      .set('X-User-Id', ada)
      .send({ userId: bob })
      .expect(409);
  });

  it('validates the user creation body', async () => {
    await request(ctx.app.getHttpServer())
      .post('/users')
      .send({ name: '' })
      .expect(400);
    await request(ctx.app.getHttpServer()).post('/users').send({}).expect(400);
  });
});
