import request from 'supertest';
import { createTestApp, type TestApp } from './create-test-app';
import { createNote, createTeam, createUser } from './helpers';

describe('Validation and error responses (e2e)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  const server = () => ctx.app.getHttpServer();

  it('returns 400 with the error envelope for a bad body', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    const response = await request(server())
      .post(`/teams/${teamId}/notes`)
      .set('X-User-Id', ada)
      .send({ body: 'no title' })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'BadRequest',
      code: 'BAD_REQUEST',
    });
    expect(typeof response.body.message).toBe('string');
  });

  it('rejects unknown fields in the body', async () => {
    await request(server())
      .post('/users')
      .send({ name: 'Ada', admin: true })
      .expect(400);
  });

  it('returns 401 without an identity header', async () => {
    const response = await request(server()).get('/teams').expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
    });
  });

  it('returns 403 for a non-member', async () => {
    const ada = await createUser(ctx, 'Ada');
    const bob = await createUser(ctx, 'Bob');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    const note = await createNote(ctx, ada, teamId, 'T');

    const response = await request(server())
      .get(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', bob)
      .expect(403);

    expect(response.body).toMatchObject({
      statusCode: 403,
      error: 'Forbidden',
      code: 'FORBIDDEN',
    });
  });

  it('returns 404 for an unknown route and resource', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    const route = await request(server()).get('/does-not-exist').expect(404);
    expect(route.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    const resource = await request(server())
      .get(`/teams/${teamId}/notes/nope`)
      .set('X-User-Id', ada)
      .expect(404);
    expect(resource.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('returns 409 for a stale update', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    const note = await createNote(ctx, ada, teamId, 'T');
    await request(server())
      .put(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', ada)
      .set('If-Match', '1')
      .send({ title: 'v2', body: '' })
      .expect(200);

    const response = await request(server())
      .put(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', ada)
      .set('If-Match', '1')
      .send({ title: 'stale', body: '' })
      .expect(409);

    expect(response.body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      code: 'CONFLICT',
    });
  });

  it('returns 413 when the body exceeds the configured limit', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    // The default limit is 100kb; send far more.
    const huge = 'x'.repeat(200 * 1024);
    const response = await request(server())
      .post(`/teams/${teamId}/notes`)
      .set('X-User-Id', ada)
      .send({ title: 'Too big', body: huge })
      .expect(413);

    expect(response.body).toMatchObject({
      statusCode: 413,
      error: 'PayloadTooLarge',
      code: 'PAYLOAD_TOO_LARGE',
    });
  });
});
