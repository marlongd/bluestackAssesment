import request from 'supertest';
import { createTestApp, type TestApp } from './create-test-app';
import { addMember, createNote, createTeam, createUser } from './helpers';

describe('Note deletion (e2e)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('soft-deletes a note and returns 204', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    const note = await createNote(ctx, ada, teamId, 'Doomed');

    await request(ctx.app.getHttpServer())
      .delete(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', ada)
      .expect(204);
  });

  it('returns 404 for the note after deletion', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    const note = await createNote(ctx, ada, teamId, 'Doomed');

    await request(ctx.app.getHttpServer())
      .delete(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', ada)
      .expect(204);

    await request(ctx.app.getHttpServer())
      .get(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', ada)
      .expect(404);
  });

  it('excludes a deleted note from the list', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    const keep = await createNote(ctx, ada, teamId, 'Keep');
    const drop = await createNote(ctx, ada, teamId, 'Drop');

    await request(ctx.app.getHttpServer())
      .delete(`/teams/${teamId}/notes/${drop.id}`)
      .set('X-User-Id', ada)
      .expect(204);

    const list = await request(ctx.app.getHttpServer())
      .get(`/teams/${teamId}/notes`)
      .set('X-User-Id', ada)
      .expect(200);

    expect(list.body.total).toBe(1);
    expect(list.body.items.map((n: { id: string }) => n.id)).toEqual([keep.id]);
  });

  it('lets a second member delete, and the deletion sticks for everyone', async () => {
    const ada = await createUser(ctx, 'Ada');
    const bob = await createUser(ctx, 'Bob');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    await addMember(ctx, ada, teamId, bob);
    const note = await createNote(ctx, ada, teamId, 'Shared');

    await request(ctx.app.getHttpServer())
      .delete(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', bob)
      .expect(204);

    await request(ctx.app.getHttpServer())
      .get(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', ada)
      .expect(404);
  });

  it('forbids a non-member from deleting (403)', async () => {
    const ada = await createUser(ctx, 'Ada');
    const bob = await createUser(ctx, 'Bob');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    const note = await createNote(ctx, ada, teamId, 'Safe');

    await request(ctx.app.getHttpServer())
      .delete(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', bob)
      .expect(403);

    await request(ctx.app.getHttpServer())
      .get(`/teams/${teamId}/notes/${note.id}`)
      .set('X-User-Id', ada)
      .expect(200);
  });

  it('does not block re-creating a note with a previously deleted title', async () => {
    const ada = await createUser(ctx, 'Ada');
    const teamId = await createTeam(ctx, ada, 'Alpha');
    const first = await createNote(ctx, ada, teamId, 'Same Title');

    await request(ctx.app.getHttpServer())
      .delete(`/teams/${teamId}/notes/${first.id}`)
      .set('X-User-Id', ada)
      .expect(204);

    const second = await request(ctx.app.getHttpServer())
      .post(`/teams/${teamId}/notes`)
      .set('X-User-Id', ada)
      .send({ title: 'Same Title', body: 'again' })
      .expect(201);

    expect(second.body.id).not.toBe(first.id);
  });
});
