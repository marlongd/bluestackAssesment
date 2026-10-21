import request from 'supertest';
import type { TestApp } from './create-test-app';

export async function createUser(ctx: TestApp, name: string): Promise<string> {
  const response = await request(ctx.app.getHttpServer())
    .post('/users')
    .send({ name })
    .expect(201);
  return response.body.id;
}

export async function createTeam(
  ctx: TestApp,
  userId: string,
  name: string,
): Promise<string> {
  const response = await request(ctx.app.getHttpServer())
    .post('/teams')
    .set('X-User-Id', userId)
    .send({ name })
    .expect(201);
  return response.body.id;
}

export async function addMember(
  ctx: TestApp,
  ownerId: string,
  teamId: string,
  userId: string,
): Promise<void> {
  await request(ctx.app.getHttpServer())
    .post(`/teams/${teamId}/members`)
    .set('X-User-Id', ownerId)
    .send({ userId })
    .expect(201);
}

export async function createNote(
  ctx: TestApp,
  userId: string,
  teamId: string,
  title: string,
  body = '',
): Promise<{ id: string; version: number }> {
  const response = await request(ctx.app.getHttpServer())
    .post(`/teams/${teamId}/notes`)
    .set('X-User-Id', userId)
    .send({ title, body })
    .expect(201);
  return { id: response.body.id, version: response.body.version };
}
