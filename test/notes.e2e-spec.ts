import request from 'supertest';
import { createTestApp, type TestApp } from './create-test-app';
import { addMember, createTeam, createUser } from './helpers';

describe('Notes (e2e)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('lets a member create a note', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    const response = await request(ctx.app.getHttpServer())
      .post(`/teams/${teamId}/notes`)
      .set('X-User-Id', ada)
      .send({ title: 'First', body: 'Hello' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      teamId,
      title: 'First',
      body: 'Hello',
      version: 1,
      createdBy: ada,
      updatedBy: ada,
      deletedAt: null,
    });
  });

  it('lists a team\u2019s notes', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    const first = await request(ctx.app.getHttpServer())
      .post(`/teams/${teamId}/notes`)
      .set('X-User-Id', ada)
      .send({ title: 'First', body: '' })
      .expect(201);
    const second = await request(ctx.app.getHttpServer())
      .post(`/teams/${teamId}/notes`)
      .set('X-User-Id', ada)
      .send({ title: 'Second', body: '' })
      .expect(201);

    const response = await request(ctx.app.getHttpServer())
      .get(`/teams/${teamId}/notes`)
      .set('X-User-Id', ada)
      .expect(200);

    expect(response.body).toMatchObject({ total: 2, limit: 20, offset: 0 });
    const ids = response.body.items.map((n: { id: string }) => n.id);
    expect(ids).toEqual(
      expect.arrayContaining([first.body.id, second.body.id]),
    );
  });

  it('paginates results', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    for (const title of ['A', 'B', 'C']) {
      await request(ctx.app.getHttpServer())
        .post(`/teams/${teamId}/notes`)
        .set('X-User-Id', ada)
        .send({ title, body: '' })
        .expect(201);
    }

    const page1 = await request(ctx.app.getHttpServer())
      .get(`/teams/${teamId}/notes?limit=2&offset=0`)
      .set('X-User-Id', ada)
      .expect(200);
    const page2 = await request(ctx.app.getHttpServer())
      .get(`/teams/${teamId}/notes?limit=2&offset=2`)
      .set('X-User-Id', ada)
      .expect(200);

    expect(page1.body.items).toHaveLength(2);
    expect(page2.body.items).toHaveLength(1);
    expect(page1.body.total).toBe(3);
  });

  it('lets a member added to the team see the notes', async () => {
    const ada = await createUser(ctx, 'Ada');
    const bob = await createUser(ctx, 'Bob');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    await addMember(ctx, ada, teamId, bob);

    await request(ctx.app.getHttpServer())
      .post(`/teams/${teamId}/notes`)
      .set('X-User-Id', ada)
      .send({ title: 'Shared', body: '' })
      .expect(201);

    const response = await request(ctx.app.getHttpServer())
      .get(`/teams/${teamId}/notes`)
      .set('X-User-Id', bob)
      .expect(200);

    expect(response.body.total).toBe(1);
  });

  it('forbids a non-member from creating a note (403)', async () => {
    const ada = await createUser(ctx, 'Ada');
    const bob = await createUser(ctx, 'Bob');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    await request(ctx.app.getHttpServer())
      .post(`/teams/${teamId}/notes`)
      .set('X-User-Id', bob)
      .send({ title: 'Sneaky', body: '' })
      .expect(403);
  });

  it('forbids a non-member from listing notes (403)', async () => {
    const ada = await createUser(ctx, 'Ada');
    const bob = await createUser(ctx, 'Bob');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    await request(ctx.app.getHttpServer())
      .get(`/teams/${teamId}/notes`)
      .set('X-User-Id', bob)
      .expect(403);
  });

  it('rejects a note without a title (400)', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    await request(ctx.app.getHttpServer())
      .post(`/teams/${teamId}/notes`)
      .set('X-User-Id', ada)
      .send({ body: 'no title' })
      .expect(400);
  });

  it('rejects an out-of-range limit (400)', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    await request(ctx.app.getHttpServer())
      .get(`/teams/${teamId}/notes?limit=1000`)
      .set('X-User-Id', ada)
      .expect(400);
  });
});
