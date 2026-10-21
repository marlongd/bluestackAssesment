import request from 'supertest';
import { createTestApp, type TestApp } from './create-test-app';
import { addMember, createNote, createTeam, createUser } from './helpers';

describe('Note retrieval and update (e2e)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('retrieves a single note for a member', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    const note = await createNote(ctx, ada, teamId, 'First', 'Body');

    const response = await request(ctx.app.getHttpServer())
      .get(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', ada)
      .expect(200);

    expect(response.body).toMatchObject({
      id: note.id,
      title: 'First',
      body: 'Body',
    });
  });

  it('returns 404 for an unknown note', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');

    await request(ctx.app.getHttpServer())
      .get(`/teams/${teamId}/notes/does-not-exist`)
      .set('X-User-Id', ada)
      .expect(404);
  });

  it('forbids a non-member from retrieving a note (403)', async () => {
    const ada = await createUser(ctx, 'Ada');
    const bob = await createUser(ctx, 'Bob');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    const note = await createNote(ctx, ada, teamId, 'Secret');

    await request(ctx.app.getHttpServer())
      .get(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', bob)
      .expect(403);
  });

  it('updates a note and increments its version', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    const note = await createNote(ctx, ada, teamId, 'Old', 'old body');

    const response = await request(ctx.app.getHttpServer())
      .put(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', ada)
      .set('If-Match', String(note.version))
      .send({ title: 'New', body: 'new body' })
      .expect(200);

    expect(response.body).toMatchObject({
      id: note.id,
      title: 'New',
      body: 'new body',
      version: note.version + 1,
      updatedBy: ada,
    });
  });

  it('rejects an update without an If-Match header (400)', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    const note = await createNote(ctx, ada, teamId, 'T');

    await request(ctx.app.getHttpServer())
      .put(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', ada)
      .send({ title: 'New', body: '' })
      .expect(400);
  });

  it('rejects a stale update with 409 and leaves the note intact', async () => {
    const ada = await createUser(ctx, 'Ada');
    const bob = await createUser(ctx, 'Bob');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    await addMember(ctx, ada, teamId, bob);
    const note = await createNote(ctx, ada, teamId, 'Shared', 'v1');

    // Bob reads version 1, then Ada updates first.
    await request(ctx.app.getHttpServer())
      .put(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', ada)
      .set('If-Match', '1')
      .send({ title: 'Ada edit', body: 'v2' })
      .expect(200);

    // Bob's write is based on the now-stale version 1.
    await request(ctx.app.getHttpServer())
      .put(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', bob)
      .set('If-Match', '1')
      .send({ title: 'Bob edit', body: 'v2-stale' })
      .expect(409);

    const current = await request(ctx.app.getHttpServer())
      .get(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', ada)
      .expect(200);

    expect(current.body).toMatchObject({
      title: 'Ada edit',
      body: 'v2',
      version: 2,
    });
  });

  it('forbids a non-member from updating a note (403)', async () => {
    const ada = await createUser(ctx, 'Ada');
    const bob = await createUser(ctx, 'Bob');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    const note = await createNote(ctx, ada, teamId, 'T');

    await request(ctx.app.getHttpServer())
      .put(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', bob)
      .set('If-Match', '1')
      .send({ title: 'New', body: '' })
      .expect(403);
  });
});
